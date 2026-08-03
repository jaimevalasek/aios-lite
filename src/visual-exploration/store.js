'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const vm = require('node:vm');
const { validateFeatureSlug, toPosixPath } = require('../verification/path-policy');
const {
  CONTEXT_POLICIES,
  DISPLAY_MODES,
  SCAN_SCOPES,
  STRATEGIES,
  TARGET_KINDS,
  VERSION,
  validateIntake,
  validateManifest
} = require('./schema');
const { renderSourceMap, scanFrontend, sha256 } = require('./scanner');

const MAX_PROTOTYPE_BYTES = 2_000_000;
const MAX_REFERENCE_BYTES = 25 * 1024 * 1024;
const MAX_REFERENCES = 32;
const RUN_REPORT_MARKER = '<!-- aioson:reusable-prompts -->';
const TRANSIENT_RENAME_ERRORS = new Set(['EACCES', 'EBUSY', 'ENOTEMPTY', 'EPERM']);
const manifestMutationQueues = new Map();

function now() {
  return new Date().toISOString();
}

function assertChoice(value, choices, field) {
  if (!choices.includes(value)) throw new Error(`${field} must be one of ${choices.join(', ')}`);
  return value;
}

function assertSlug(value, field = 'slug') {
  const result = validateFeatureSlug(value);
  if (!result.ok) throw new Error(`${field} must be kebab-case`);
  return result.feature_slug;
}

function explorationRoot(projectDir, slug) {
  return path.join(path.resolve(projectDir), '.aioson', 'explorations', assertSlug(slug));
}

function manifestPath(projectDir, slug) {
  return path.join(explorationRoot(projectDir, slug), 'exploration-manifest.json');
}

async function atomicWrite(file, content, options = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp, content, 'utf8');
  const rename = options.rename || fs.rename;
  const sleep = options.sleep || delay;
  const maxRenameAttempts = Number.isInteger(options.maxRenameAttempts) && options.maxRenameAttempts > 0
    ? Math.min(options.maxRenameAttempts, 20)
    : 8;
  const retryBaseMs = Number.isFinite(options.retryBaseMs) && options.retryBaseMs >= 0
    ? Math.min(options.retryBaseMs, 250)
    : 10;
  try {
    for (let attempt = 1; attempt <= maxRenameAttempts; attempt += 1) {
      try {
        await rename(temp, file);
        return;
      } catch (error) {
        const retryable = TRANSIENT_RENAME_ERRORS.has(error?.code);
        if (!retryable || attempt === maxRenameAttempts) throw error;
        await sleep(Math.min(retryBaseMs * attempt, 250));
      }
    }
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

async function atomicJson(file, value) {
  await atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function withManifestMutation(projectDir, slug, mutation) {
  const key = `${path.resolve(projectDir)}::${slug}`;
  const previous = manifestMutationQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(mutation);
  manifestMutationQueues.set(key, current);
  try {
    return await current;
  } finally {
    if (manifestMutationQueues.get(key) === current) manifestMutationQueues.delete(key);
  }
}

function renderManifestMarkdown(manifest) {
  const selected = manifest.selected_run || 'none';
  const lines = [
    `# Visual exploration — ${manifest.title}`,
    '',
    '<!-- aioson:visual-exploration-manifest -->',
    '',
    `- Slug: \`${manifest.slug}\``,
    `- Status: \`${manifest.status}\``,
    `- Strategy: \`${manifest.strategy}\``,
    `- Context policy: \`${manifest.context_policy}\``,
    `- Display mode: \`${manifest.display_mode}\``,
    `- Target: \`${manifest.target_kind}\``,
    `- Front-end scan: \`${manifest.scan_scope}\``,
    `- Selected run: \`${selected}\``,
    '',
    '## Runs',
    '',
    '| Variant | Status | Host | Requested model | Resolved model |',
    '|---|---|---|---|---|'
  ];
  if (!manifest.runs.length) lines.push('| _none yet_ | — | — | — | — |');
  for (const run of manifest.runs) {
    lines.push(`| ${run.label} (\`${run.id}\`) | ${run.status} | ${run.host} | ${run.model_requested} | ${run.model_resolved || 'pending'} |`);
  }
  lines.push('', '## Authority', '', 'This exploration is non-canonical. Product, Planner, and Dev must ignore it until a selected run is promoted into a Briefing source pack and later consolidated as the feature-owned prototype.', '');
  if (manifest.promotion?.briefing_slug) {
    lines.push('## Promotion', '', `Prepared for briefing slug \`${manifest.promotion.briefing_slug}\` at \`${manifest.promotion.source_pack || 'unknown'}\`.`, '');
  }
  return `${lines.join('\n')}\n`;
}

async function writeManifest(projectDir, manifest) {
  const validation = validateManifest(manifest, manifest.slug);
  if (!validation.ok) throw new Error(`invalid exploration manifest: ${validation.errors.join('; ')}`);
  const root = explorationRoot(projectDir, manifest.slug);
  await atomicJson(path.join(root, 'exploration-manifest.json'), manifest);
  await atomicWrite(path.join(root, 'exploration-manifest.md'), renderManifestMarkdown(manifest));
}

async function readManifest(projectDir, slug) {
  const validatedSlug = assertSlug(slug);
  let value;
  try {
    value = JSON.parse(await fs.readFile(manifestPath(projectDir, validatedSlug), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { ok: false, reason: 'exploration_not_found', slug: validatedSlug };
    return { ok: false, reason: 'exploration_manifest_invalid_json', slug: validatedSlug, error: error.message };
  }
  const validation = validateManifest(value, validatedSlug);
  return validation.ok
    ? { ok: true, manifest: value, root: explorationRoot(projectDir, validatedSlug) }
    : { ok: false, reason: 'exploration_manifest_invalid', slug: validatedSlug, errors: validation.errors };
}

function initialIntake({ slug, goal, targetKind, scanScope }) {
  return {
    version: VERSION,
    exploration: slug,
    understanding: {
      goal: goal ? [goal] : [],
      preserve: [],
      change: []
    },
    coverage: {
      shell: 'unknown',
      primary_surface: 'unknown',
      critical_detail: 'unknown',
      important_states: 'unknown',
      responsive: 'not-requested'
    },
    unknowns: [],
    assumptions: [],
    references: [],
    target_kind: targetKind,
    scan_scope: scanScope,
    decision: 'pending',
    updated_at: now()
  };
}

async function createExploration(projectDir, {
  slug,
  title,
  goal = '',
  strategy = 'single',
  contextPolicy = 'isolated',
  displayMode = 'blind',
  targetKind = 'current-system-redesign',
  scanScope = 'targeted',
  language = 'en'
}) {
  const validatedSlug = assertSlug(slug);
  assertChoice(strategy, STRATEGIES, 'strategy');
  assertChoice(contextPolicy, CONTEXT_POLICIES, 'context_policy');
  assertChoice(displayMode, DISPLAY_MODES, 'display_mode');
  assertChoice(targetKind, TARGET_KINDS, 'target_kind');
  assertChoice(scanScope, SCAN_SCOPES, 'scan_scope');
  const root = explorationRoot(projectDir, validatedSlug);
  try {
    await fs.access(root);
    return { ok: false, reason: 'exploration_exists', slug: validatedSlug, root };
  } catch {}

  const createdAt = now();
  const manifest = {
    version: VERSION,
    slug: validatedSlug,
    title: String(title || validatedSlug).trim(),
    status: 'open',
    strategy,
    context_policy: contextPolicy,
    display_mode: displayMode,
    target_kind: targetKind,
    scan_scope: scanScope,
    language: String(language || 'en'),
    created_at: createdAt,
    updated_at: createdAt,
    selected_run: null,
    runs: [],
    promotion: { briefing_slug: null, source_pack: null, prepared_at: null }
  };
  const intake = initialIntake({ slug: validatedSlug, goal, targetKind, scanScope });
  await fs.mkdir(path.join(root, 'inputs', 'references'), { recursive: true });
  await fs.mkdir(path.join(root, 'runs'), { recursive: true });
  await atomicWrite(
    path.join(root, 'inputs', 'task.md'),
    `# Visual exploration task\n\n<!-- aioson:visual-exploration-task -->\n\n## Goal\n\n${goal || 'TBD — confirm with the user.'}\n\n## Preserve\n\nTBD — confirm from repository evidence and user intent.\n\n## Change\n\nTBD — confirm with the user.\n\n## Required surfaces, actions, and states\n\nTBD — derive before generation.\n`
  );
  await atomicWrite(
    path.join(root, 'inputs', 'source-map.md'),
    '# Current front-end source map\n\n<!-- aioson:visual-exploration-source-map -->\n\nNo scan has been recorded yet.\n'
  );
  await atomicJson(path.join(root, 'intake.json'), intake);
  await writeManifest(projectDir, manifest);
  return { ok: true, created: true, slug: validatedSlug, root, manifest, intake };
}

function alphaLabel(index) {
  let n = index;
  let result = '';
  do {
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

async function inputHash(root) {
  const files = ['inputs/task.md', 'inputs/source-map.md', 'intake.json'];
  const hash = crypto.createHash('sha256');
  for (const relative of files) {
    try {
      hash.update(relative);
      hash.update(await fs.readFile(path.join(root, relative)));
    } catch {}
  }
  const references = path.join(root, 'inputs', 'references');
  try {
    const names = (await fs.readdir(references)).sort();
    for (const name of names) {
      hash.update(name);
      hash.update(await fs.readFile(path.join(references, name)));
    }
  } catch {}
  return hash.digest('hex');
}

function reportTemplate(run, task) {
  return `# Exploration run report — ${run.label}\n\n<!-- aioson:visual-exploration-report -->\n\n## Execution provenance\n\n- Host: ${run.host}\n- Model requested: ${run.model_requested}\n- Model resolved: pending\n- Status: planned\n\n## Input summary\n\n${task.trim()}\n\n## Design direction and decisions\n\nTBD — generated during the run.\n\n## Iteration timeline\n\nTBD — append user feedback, changes, bugs, and corrections without erasing prior rounds.\n\n## Validation and limitations\n\nTBD — record only checks actually executed.\n\n## Reusable prompts\n\n${RUN_REPORT_MARKER}\n\n### Exact generation prompt\n\n\`\`\`text\n${task.trim()}\n\`\`\`\n\n### One-shot prompt\n\n\`\`\`text\n${task.trim()}\n\`\`\`\n\n### Incremental prompt sequence\n\nTBD — derive from the successful session, including corrective prompts.\n`;
}

async function addRun(projectDir, slug, {
  host,
  model,
  label,
  parentRun = null,
  contextPolicy = null
}) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const manifest = loaded.manifest;
  if (manifest.status !== 'open') return { ok: false, reason: 'exploration_not_open', status: manifest.status };
  if (manifest.strategy === 'single' && manifest.runs.length > 0) return { ok: false, reason: 'single_run_limit' };
  if (!String(host || '').trim()) return { ok: false, reason: 'host_required' };
  if (!String(model || '').trim()) return { ok: false, reason: 'model_required' };
  if (parentRun && !manifest.runs.some(run => run.id === parentRun)) return { ok: false, reason: 'parent_run_not_found' };
  const effectivePolicy = contextPolicy || manifest.context_policy;
  assertChoice(effectivePolicy, CONTEXT_POLICIES, 'context_policy');
  const suffix = alphaLabel(manifest.runs.length);
  const id = `variant-${suffix}`;
  const run = {
    id,
    label: String(label || `Variant ${suffix.toUpperCase()}`).trim(),
    host: String(host).trim().toLowerCase(),
    model_requested: String(model).trim(),
    model_resolved: null,
    model_resolution_strategy: null,
    status: 'planned',
    context_policy: effectivePolicy,
    parent_run: parentRun || null,
    input_hash: await inputHash(loaded.root),
    artifact_hash: null,
    report_hash: null,
    warnings: [],
    created_at: now(),
    started_at: null,
    finished_at: null
  };
  const runRoot = path.join(loaded.root, 'runs', id);
  await fs.mkdir(runRoot, { recursive: false });
  const task = await fs.readFile(path.join(loaded.root, 'inputs', 'task.md'), 'utf8');
  await atomicJson(path.join(runRoot, 'run-manifest.json'), run);
  await atomicWrite(path.join(runRoot, 'report.md'), reportTemplate(run, task));
  manifest.runs.push(run);
  manifest.updated_at = now();
  await writeManifest(projectDir, manifest);
  return { ok: true, created: true, slug: manifest.slug, run, run_root: runRoot };
}

async function writeRun(projectDir, slug, run) {
  return withManifestMutation(projectDir, slug, async () => {
    const loaded = await readManifest(projectDir, slug);
    if (!loaded.ok) return loaded;
    const index = loaded.manifest.runs.findIndex(candidate => candidate.id === run.id);
    if (index === -1) return { ok: false, reason: 'run_not_found', run: run.id };
    loaded.manifest.runs[index] = run;
    loaded.manifest.updated_at = now();
    await atomicJson(path.join(loaded.root, 'runs', run.id, 'run-manifest.json'), run);
    await writeManifest(projectDir, loaded.manifest);
    return { ok: true, manifest: loaded.manifest, run };
  });
}

function validateInlineScripts(html) {
  const issues = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html))) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/\btype\s*=\s*["'](?:application\/json|application\/ld\+json)["']/i.test(attrs)) continue;
    try {
      new vm.Script(match[2]);
    } catch (error) {
      issues.push(`inline JavaScript syntax error: ${error.message}`);
      break;
    }
  }
  return issues;
}

async function validateRunArtifacts(projectDir, slug, runId) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const run = loaded.manifest.runs.find(item => item.id === runId);
  if (!run) return { ok: false, reason: 'run_not_found', run: runId };
  const runRoot = path.join(loaded.root, 'runs', runId);
  const prototypePath = path.join(runRoot, 'prototype.html');
  const reportPath = path.join(runRoot, 'report.md');
  const issues = [];
  const warnings = [];
  let html = '';
  let report = '';
  try {
    html = await fs.readFile(prototypePath, 'utf8');
  } catch {
    issues.push('prototype.html is missing');
  }
  try {
    report = await fs.readFile(reportPath, 'utf8');
  } catch {
    issues.push('report.md is missing');
  }
  const bytes = Buffer.byteLength(html, 'utf8');
  if (html && !/<html\b/i.test(html)) issues.push('prototype.html must contain an html document');
  if (bytes > MAX_PROTOTYPE_BYTES) issues.push(`prototype.html exceeds ${MAX_PROTOTYPE_BYTES} bytes`);
  if (/<(?:script|link|iframe|img|source|video|audio|object|embed|form)\b[^>]+(?:src|srcset|href|action|data)\s*=\s*["']https?:/i.test(html)
    || /@import\s+(?:url\()?\s*["']?https?:|url\(\s*["']?https?:/i.test(html)) {
    issues.push('prototype.html contains external resources');
  }
  if (/\bfetch\s*\(\s*["']https?:|\bXMLHttpRequest\b|\bWebSocket\s*\(|\bEventSource\s*\(|\bsendBeacon\s*\(/i.test(html)) {
    issues.push('prototype.html contains a network runtime dependency');
  }
  if (/<iframe\b/i.test(html)) issues.push('prototype.html must not contain iframes');
  if (html) issues.push(...validateInlineScripts(html));
  if (report && !report.includes('<!-- aioson:visual-exploration-report -->')) issues.push('report.md lacks the exploration report marker');
  if (report && !report.includes(RUN_REPORT_MARKER)) issues.push('report.md lacks the reusable-prompts marker');
  for (const heading of ['### Exact generation prompt', '### One-shot prompt', '### Incremental prompt sequence']) {
    if (report && !report.includes(heading)) issues.push(`report.md lacks ${heading}`);
  }
  return {
    ok: issues.length === 0,
    slug: loaded.manifest.slug,
    run: runId,
    prototype_path: toPosixPath(path.relative(projectDir, prototypePath)),
    report_path: toPosixPath(path.relative(projectDir, reportPath)),
    prototype_bytes: bytes,
    artifact_hash: html ? sha256(Buffer.from(html)) : null,
    report_hash: report ? sha256(Buffer.from(report)) : null,
    issues,
    warnings
  };
}

async function recordRun(projectDir, slug, runId, {
  status = 'completed',
  modelResolved = null,
  resolutionStrategy = null,
  warnings = []
} = {}) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const run = loaded.manifest.runs.find(item => item.id === runId);
  if (!run) return { ok: false, reason: 'run_not_found', run: runId };
  if (status === 'failed') {
    run.status = 'failed';
    run.finished_at = now();
    run.warnings = [...new Set([...(run.warnings || []), ...warnings])];
    if (modelResolved) run.model_resolved = modelResolved;
    if (resolutionStrategy) run.model_resolution_strategy = resolutionStrategy;
    return writeRun(projectDir, slug, run);
  }
  const validation = await validateRunArtifacts(projectDir, slug, runId);
  if (!validation.ok) return { ...validation, reason: 'run_artifacts_invalid' };
  run.status = validation.warnings.length || warnings.length ? 'completed-with-warnings' : 'completed';
  run.model_resolved = modelResolved || run.model_resolved || run.model_requested;
  run.model_resolution_strategy = resolutionStrategy || run.model_resolution_strategy || 'exact';
  run.artifact_hash = validation.artifact_hash;
  run.report_hash = validation.report_hash;
  run.warnings = [...new Set([...(run.warnings || []), ...validation.warnings, ...warnings])];
  run.finished_at = now();
  return writeRun(projectDir, slug, run);
}

async function selectRun(projectDir, slug, runId) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const selected = loaded.manifest.runs.find(run => run.id === runId);
  if (!selected) return { ok: false, reason: 'run_not_found', run: runId };
  if (!['completed', 'completed-with-warnings', 'selected'].includes(selected.status)) {
    return { ok: false, reason: 'run_not_selectable', status: selected.status };
  }
  const validation = await validateRunArtifacts(projectDir, slug, runId);
  if (!validation.ok) return { ...validation, reason: 'run_artifacts_invalid' };
  if ((selected.artifact_hash && selected.artifact_hash !== validation.artifact_hash)
    || (selected.report_hash && selected.report_hash !== validation.report_hash)) {
    return { ok: false, reason: 'run_artifacts_changed', run: runId };
  }
  const changed = [];
  for (const run of loaded.manifest.runs) {
    if (run.id === runId && run.status !== 'selected') {
      run.status = 'selected';
      changed.push(run);
    } else if (run.id !== runId && run.status === 'selected') {
      run.status = run.warnings?.length ? 'completed-with-warnings' : 'completed';
      changed.push(run);
    }
  }
  loaded.manifest.selected_run = runId;
  loaded.manifest.status = 'selected';
  loaded.manifest.updated_at = now();
  await Promise.all(changed.map(run => atomicJson(path.join(loaded.root, 'runs', run.id, 'run-manifest.json'), run)));
  await writeManifest(projectDir, loaded.manifest);
  return { ok: true, slug: loaded.manifest.slug, selected_run: runId };
}

async function updateIntake(projectDir, slug, intake) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const validation = validateIntake(intake, loaded.manifest.slug);
  if (!validation.ok) return { ok: false, reason: 'intake_invalid', errors: validation.errors };
  intake.updated_at = now();
  await atomicJson(path.join(loaded.root, 'intake.json'), intake);
  return { ok: true, intake };
}

async function addReferences(projectDir, slug, referencePaths) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const inputs = Array.isArray(referencePaths) ? referencePaths : String(referencePaths || '').split(',');
  const selected = inputs.map(value => String(value || '').trim()).filter(Boolean);
  if (!selected.length) return { ok: false, reason: 'references_required' };
  if (selected.length > MAX_REFERENCES) return { ok: false, reason: 'too_many_references', max: MAX_REFERENCES };
  const intakePath = path.join(loaded.root, 'intake.json');
  const intake = JSON.parse(await fs.readFile(intakePath, 'utf8'));
  const added = [];
  const startIndex = intake.references.length;
  for (let index = 0; index < selected.length; index += 1) {
    const source = path.resolve(projectDir, selected[index]);
    let real;
    try {
      real = await fs.realpath(source);
    } catch {
      return { ok: false, reason: 'reference_missing', path: selected[index] };
    }
    const stat = await fs.stat(real);
    if (!stat.isFile()) return { ok: false, reason: 'reference_not_file', path: selected[index] };
    if (stat.size > MAX_REFERENCE_BYTES) return { ok: false, reason: 'reference_too_large', path: selected[index] };
    const data = await fs.readFile(real);
    const ext = path.extname(real).toLowerCase();
    const base = path.basename(real, ext).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'reference';
    const fileName = `${String(startIndex + index + 1).padStart(2, '0')}-${base}${ext}`;
    const target = path.join(loaded.root, 'inputs', 'references', fileName);
    await fs.writeFile(target, data);
    const record = {
      source_path: toPosixPath(path.relative(projectDir, real)),
      copied_path: toPosixPath(path.relative(projectDir, target)),
      bytes: data.length,
      sha256: sha256(data),
      role: 'unclassified',
      coverage: []
    };
    intake.references.push(record);
    added.push(record);
  }
  intake.updated_at = now();
  await atomicJson(intakePath, intake);
  return { ok: true, added };
}

async function scanExploration(projectDir, slug, { scope, paths } = {}) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const effectiveScope = scope || loaded.manifest.scan_scope;
  assertChoice(effectiveScope, SCAN_SCOPES, 'scan_scope');
  if (effectiveScope === 'none') return { ok: true, skipped: true, scope: effectiveScope };
  const scan = await scanFrontend(projectDir, { scope: effectiveScope, paths });
  await atomicWrite(path.join(loaded.root, 'inputs', 'source-map.md'), renderSourceMap(scan));
  loaded.manifest.scan_scope = effectiveScope;
  loaded.manifest.updated_at = now();
  await writeManifest(projectDir, loaded.manifest);
  return { ok: true, slug: loaded.manifest.slug, ...scan };
}

async function configureExploration(projectDir, slug, {
  strategy,
  contextPolicy,
  displayMode,
  targetKind,
  scanScope
} = {}) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const manifest = loaded.manifest;
  if (manifest.status !== 'open') return { ok: false, reason: 'exploration_not_open', status: manifest.status };
  if (strategy) {
    assertChoice(strategy, STRATEGIES, 'strategy');
    if (strategy === 'single' && manifest.runs.length > 1) return { ok: false, reason: 'single_strategy_conflicts_with_runs' };
    manifest.strategy = strategy;
  }
  if (contextPolicy) manifest.context_policy = assertChoice(contextPolicy, CONTEXT_POLICIES, 'context_policy');
  if (displayMode) manifest.display_mode = assertChoice(displayMode, DISPLAY_MODES, 'display_mode');
  if (targetKind) {
    if (manifest.runs.length) return { ok: false, reason: 'target_locked_after_first_run' };
    manifest.target_kind = assertChoice(targetKind, TARGET_KINDS, 'target_kind');
  }
  if (scanScope) manifest.scan_scope = assertChoice(scanScope, SCAN_SCOPES, 'scan_scope');
  manifest.updated_at = now();
  await writeManifest(projectDir, manifest);
  return { ok: true, slug: manifest.slug, manifest };
}

async function promoteExploration(projectDir, slug, briefingSlug, { force = false } = {}) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const targetSlug = assertSlug(briefingSlug, 'briefing_slug');
  if (!loaded.manifest.selected_run) return { ok: false, reason: 'selected_run_required' };
  const selected = loaded.manifest.runs.find(run => run.id === loaded.manifest.selected_run);
  if (!selected || selected.status !== 'selected') return { ok: false, reason: 'selected_run_invalid' };
  const validation = await validateRunArtifacts(projectDir, slug, selected.id);
  if (!validation.ok) return { ...validation, reason: 'run_artifacts_invalid' };
  if (selected.artifact_hash !== validation.artifact_hash || selected.report_hash !== validation.report_hash) {
    return { ok: false, reason: 'run_artifacts_changed', run: selected.id };
  }
  const sourceDir = path.join(projectDir, 'plans', targetSlug);
  const sourceFile = path.join(sourceDir, 'visual-exploration.md');
  try {
    await fs.access(sourceFile);
    if (!force) return { ok: false, reason: 'promotion_source_exists', path: toPosixPath(path.relative(projectDir, sourceFile)) };
  } catch {}
  const runRoot = path.join(loaded.root, 'runs', selected.id);
  const prototype = await fs.readFile(path.join(runRoot, 'prototype.html'));
  const report = await fs.readFile(path.join(runRoot, 'report.md'));
  const task = await fs.readFile(path.join(loaded.root, 'inputs', 'task.md'));
  const relativeRoot = toPosixPath(path.relative(projectDir, loaded.root));
  const content = `# Promoted visual exploration source\n\n<!-- aioson:promoted-visual-exploration -->\n\n- Exploration: \`${loaded.manifest.slug}\`\n- Selected run: \`${selected.id}\`\n- Host/model: \`${selected.host}/${selected.model_resolved || selected.model_requested}\`\n- Frozen input bundle SHA-256: \`${selected.input_hash}\`\n- Intake: \`${relativeRoot}/intake.json\`\n- Source map: \`${relativeRoot}/inputs/source-map.md\`\n- Imported references: ${JSON.parse(await fs.readFile(path.join(loaded.root, 'intake.json'), 'utf8')).references.length}\n- Prototype: \`${relativeRoot}/runs/${selected.id}/prototype.html\`\n- Prototype SHA-256: \`${sha256(prototype)}\`\n- Report: \`${relativeRoot}/runs/${selected.id}/report.md\`\n- Report SHA-256: \`${sha256(report)}\`\n- Task SHA-256: \`${sha256(task)}\`\n\n## Authority\n\nThis file is a read-only source pack for @briefing. The exploration remains non-canonical until Briefing creates \`.aioson/briefings/${targetSlug}/briefings.md\` and Briefing Refiner consolidates the feature-owned prototype.\n\n## Required preservation\n\n- Preserve the selected visual direction as evidence, not as automatically approved product scope.\n- Separate visual-only changes from interaction or product-scope changes.\n- Reconcile every preserved promise into the briefing Source Promise Map.\n- Keep the complete reusable prompt section in the exploration report available to the user.\n`;
  await fs.mkdir(sourceDir, { recursive: true });
  await atomicWrite(sourceFile, content);
  loaded.manifest.status = 'promotion-prepared';
  loaded.manifest.promotion = {
    briefing_slug: targetSlug,
    source_pack: toPosixPath(path.relative(projectDir, sourceFile)),
    prepared_at: now()
  };
  loaded.manifest.updated_at = now();
  await writeManifest(projectDir, loaded.manifest);
  return { ok: true, slug: loaded.manifest.slug, selected_run: selected.id, briefing_slug: targetSlug, source_pack: loaded.manifest.promotion.source_pack };
}

module.exports = {
  MAX_PROTOTYPE_BYTES,
  RUN_REPORT_MARKER,
  addReferences,
  addRun,
  atomicJson,
  atomicWrite,
  configureExploration,
  createExploration,
  explorationRoot,
  inputHash,
  manifestPath,
  promoteExploration,
  readManifest,
  recordRun,
  renderManifestMarkdown,
  scanExploration,
  selectRun,
  updateIntake,
  validateRunArtifacts,
  writeManifest,
  writeRun
};
