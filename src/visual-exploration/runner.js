'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { runDelegationRun } = require('../commands/delegation');
const { HOSTS } = require('../model-delegation');
const {
  EXACT_PROMPT_MARKER,
  INCREMENTAL_PROMPT_MARKER,
  ONE_SHOT_PROMPT_MARKER,
  RUN_REPORT_MARKER,
  USER_PROMPTS_MARKER,
  addRun,
  atomicWrite,
  readManifest,
  recordRun,
  reportCopy,
  writeRun
} = require('./store');
const { validateIntake } = require('./schema');

const MAX_PARALLEL = 8;
const MAX_RAW_OUTPUT = 256 * 1024;

function parseModelMatrix(value) {
  const entries = Array.isArray(value) ? value : String(value || '').split(',');
  const models = [];
  for (const raw of entries.map(item => String(item || '').trim()).filter(Boolean)) {
    const separator = raw.indexOf(':');
    if (separator <= 0 || separator === raw.length - 1) {
      return { ok: false, reason: 'invalid_model_entry', entry: raw, expected: 'host:model' };
    }
    const host = raw.slice(0, separator).trim().toLowerCase();
    const model = raw.slice(separator + 1).trim();
    if (!HOSTS.includes(host)) return { ok: false, reason: 'invalid_host', entry: raw, valid: HOSTS };
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(model)) return { ok: false, reason: 'invalid_model', entry: raw };
    models.push({ host, model });
  }
  if (!models.length) return { ok: false, reason: 'models_required' };
  return { ok: true, models };
}

async function readInputs(root, expectedSlug) {
  const [task, sourceMap, userPrompts, intakeRaw] = await Promise.all([
    fs.readFile(path.join(root, 'inputs', 'task.md'), 'utf8'),
    fs.readFile(path.join(root, 'inputs', 'source-map.md'), 'utf8'),
    fs.readFile(path.join(root, 'inputs', 'user-prompts.md'), 'utf8').catch(() => ''),
    fs.readFile(path.join(root, 'intake.json'), 'utf8')
  ]);
  const intake = JSON.parse(intakeRaw);
  const validation = validateIntake(intake, expectedSlug);
  if (!validation.ok) return { ok: false, reason: 'intake_invalid', errors: validation.errors };
  if (intake.decision === 'pending') return { ok: false, reason: 'intake_confirmation_required' };
  return { ok: true, task, sourceMap, userPrompts, intake };
}

function buildArtifactTask({ manifest, run, inputs, parentReport, boundary }) {
  const cumulative = run.context_policy === 'cumulative' && parentReport
    ? `\nPRIOR RUN LEARNINGS (use as improvement evidence, do not clone blindly)\n${parentReport}\n`
    : '';
  return `Create one high-quality, clickable visual exploration prototype for ${manifest.title}.

The work is pre-briefing and non-canonical. Preserve the observed product semantics, but do not invent backend integration. Use realistic in-memory mock data and expose important empty/error/permission states when applicable.

SHARED TASK
${inputs.task}

CURRENT FRONT-END EVIDENCE
${inputs.sourceMap}

INTAKE
${JSON.stringify(inputs.intake, null, 2)}

USER PROMPTS RECEIVED
${inputs.userPrompts || 'No separate verbatim user-prompt ledger was available.'}
${cumulative}
REFERENCE EVIDENCE
Inspect every imported file named by intake.references[].copied_path that the host can render. Treat screenshots as observed visual evidence, source-map/code as current-system evidence, assumptions as assumptions, and proposed changes as proposals. If image inspection is unavailable, disclose that limitation instead of claiming visual facts.

QUALITY CONTRACT
- Return one complete self-contained HTML document with inline CSS and JavaScript.
- Do not use CDNs, network requests, iframes, external fonts, or external runtime dependencies.
- Keep the artifact below 2,000,000 bytes.
- Implement the required interactions with mock state; no dead controls or native alert/prompt/confirm dialogs.
- Use an intentional visual thesis, explicit anti-goals, and one product-specific signature move.
- Honor keyboard access, visible focus, contrast, reduced motion, mobile and desktop layout.
- Validate inline JavaScript syntax before returning.
- Write every user-facing report heading and explanation in ${manifest.language || 'en'}. Keep literal user quotes, code identifiers, paths, markers, and model IDs unchanged.
- In the report, preserve the user-prompt ledger verbatim under the marker ${USER_PROMPTS_MARKER}; preserve the exact generation prompt under ${EXACT_PROMPT_MARKER}; include a reusable one-shot prompt under ${ONE_SHOT_PROMPT_MARKER}; and include the incremental sequence under ${INCREMENTAL_PROMPT_MARKER}.
- Explain the direction, list iteration lessons and limitations, and never require the user to ask separately for prompt preservation.

OUTPUT CONTRACT
Return exactly two delimited blocks and no code fences. Do not write project files.

AIOSON_PROTOTYPE_BEGIN_${boundary}
<!doctype html>...complete artifact...
AIOSON_PROTOTYPE_END_${boundary}
AIOSON_REPORT_BEGIN_${boundary}
# Report in ${manifest.language || 'en'}
...Markdown report containing ${RUN_REPORT_MARKER}, ${USER_PROMPTS_MARKER}, ${EXACT_PROMPT_MARKER}, ${ONE_SHOT_PROMPT_MARKER}, and ${INCREMENTAL_PROMPT_MARKER}...
AIOSON_REPORT_END_${boundary}`;
}

function extractBlock(output, name, boundary) {
  const begin = `AIOSON_${name}_BEGIN_${boundary}`;
  const end = `AIOSON_${name}_END_${boundary}`;
  const start = output.indexOf(begin);
  const finish = output.lastIndexOf(end);
  if (start === -1 || finish === -1 || finish <= start) return null;
  return output.slice(start + begin.length, finish).trim();
}

function ensureMarker(value, marker, headings, fallback) {
  if (value.includes(marker)) return value;
  for (const heading of headings) {
    const expression = new RegExp(`^(###\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*)$`, 'mi');
    if (expression.test(value)) return value.replace(expression, `$1\n\n${marker}`);
  }
  return `${value}\n\n${fallback}`;
}

function localizeKnownHeadings(value, copy) {
  const headings = [
    ['Exploration run report', copy.runTitle],
    ['Execution provenance', copy.execution],
    ['Input summary', copy.inputSummary],
    ['Design direction and decisions', copy.direction],
    ['Iteration timeline', copy.timeline],
    ['Validation and limitations', copy.validation],
    ['Reusable prompts', copy.reusablePrompts],
    ['User prompts received', copy.userPrompts],
    ['Exact generation prompt', copy.exactPrompt],
    ['One-shot prompt', copy.oneShot],
    ['Incremental prompt sequence', copy.incremental],
    ['Bound execution provenance', copy.execution]
  ];
  let localized = value;
  for (const [source, target] of headings) {
    localized = localized.replace(new RegExp(`^(#{1,3})\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'gmi'), `$1 ${target}`);
  }
  return localized;
}

function promptHistoryBody(markdown, fallback) {
  const body = String(markdown || '').split(/\r?\n/)
    .filter(line => !/^#\s+/.test(line) && !line.includes(USER_PROMPTS_MARKER))
    .join('\n').trim();
  return body || fallback;
}

function normalizeReport(report, task, execution, { language = 'en', userPrompts = '' } = {}) {
  const copy = reportCopy(language);
  let value = String(report || '').trim();
  if (!/^#\s+/m.test(value)) value = `# ${copy.runTitle}\n\n${value}`;
  value = localizeKnownHeadings(value, copy);
  if (!value.includes('<!-- aioson:visual-exploration-report -->')) {
    value = value.replace(/^(#.*\r?\n)/, '$1\n<!-- aioson:visual-exploration-report -->\n');
  }
  if (!value.includes(RUN_REPORT_MARKER)) {
    value += `\n\n## ${copy.reusablePrompts}\n\n${RUN_REPORT_MARKER}\n`;
  }
  value = ensureMarker(value, USER_PROMPTS_MARKER, [copy.userPrompts, 'User prompts received'], `### ${copy.userPrompts}\n\n${USER_PROMPTS_MARKER}\n\n${promptHistoryBody(userPrompts, copy.noUserPrompts)}`);
  value = ensureMarker(value, EXACT_PROMPT_MARKER, [copy.exactPrompt, 'Exact generation prompt'], `### ${copy.exactPrompt}\n\n${EXACT_PROMPT_MARKER}\n\n\`\`\`text\n${task}\n\`\`\``);
  value = ensureMarker(value, ONE_SHOT_PROMPT_MARKER, [copy.oneShot, 'One-shot prompt'], `### ${copy.oneShot}\n\n${ONE_SHOT_PROMPT_MARKER}\n\n\`\`\`text\n${task}\n\`\`\``);
  value = ensureMarker(value, INCREMENTAL_PROMPT_MARKER, [copy.incremental, 'Incremental prompt sequence'], `### ${copy.incremental}\n\n${INCREMENTAL_PROMPT_MARKER}\n\n${copy.tbdIncremental}`);
  const extra = String(language).toLowerCase().startsWith('pt')
    ? { resolution: 'Resolução', mode: 'Modo' }
    : String(language).toLowerCase().startsWith('es')
      ? { resolution: 'Resolución', mode: 'Modo' }
      : String(language).toLowerCase().startsWith('fr')
        ? { resolution: 'Résolution', mode: 'Mode' }
        : { resolution: 'Resolution', mode: 'Mode' };
  value += `\n\n## ${copy.execution}\n\n- ${copy.host}: ${execution.provider}\n- ${copy.modelRequested}: ${execution.model_requested}\n- ${copy.modelResolved}: ${execution.model_resolved}\n- ${extra.resolution}: ${execution.model_resolution_strategy}\n- ${extra.mode}: ${execution.mode}\n`;
  return `${value.trim()}\n`;
}

async function runOne({ projectDir, slug, spec, created, currentHost, inputs, parentRun, logger, catalogLoader, adapterRegistry, timeout }) {
  const run = created.run;
  run.status = 'running';
  run.started_at = new Date().toISOString();
  await writeRun(projectDir, slug, run);

  let parentReport = '';
  if (parentRun && run.context_policy === 'cumulative') {
    parentReport = await fs.readFile(path.join(path.dirname(created.run_root), parentRun, 'report.md'), 'utf8').catch(() => '');
  }
  const boundary = crypto.randomUUID().replace(/-/g, '');
  const artifactTask = buildArtifactTask({
    manifest: (await readManifest(projectDir, slug)).manifest,
    run,
    inputs,
    parentReport,
    boundary
  });
  const execution = await runDelegationRun({
    args: [projectDir],
    options: {
      host: currentHost,
      provider: spec.host,
      model: spec.model,
      kind: 'visual-prototype',
      task: artifactTask,
      'explicit-model-request': true,
      'max-output': 4 * 1024 * 1024,
      timeout,
      json: true
    },
    logger,
    catalogLoader,
    adapterRegistry
  });
  if (!execution.ok) {
    await recordRun(projectDir, slug, run.id, {
      status: 'failed',
      modelResolved: execution.model_resolved,
      resolutionStrategy: execution.model_resolution_strategy,
      warnings: [execution.reason || execution.error || 'execution_failed']
    });
    return { ok: false, run: run.id, reason: execution.reason || 'execution_failed', execution };
  }

  const prototype = extractBlock(execution.result, 'PROTOTYPE', boundary);
  const report = extractBlock(execution.result, 'REPORT', boundary);
  if (!prototype || !report) {
    await atomicWrite(path.join(created.run_root, 'raw-output.txt'), execution.result.slice(0, MAX_RAW_OUTPUT));
    await recordRun(projectDir, slug, run.id, {
      status: 'failed',
      modelResolved: execution.model_resolved,
      resolutionStrategy: execution.model_resolution_strategy,
      warnings: ['artifact_envelope_invalid']
    });
    return { ok: false, run: run.id, reason: 'artifact_envelope_invalid' };
  }
  await atomicWrite(path.join(created.run_root, 'prototype.html'), `${prototype}\n`);
  const manifest = (await readManifest(projectDir, slug)).manifest;
  const userPrompts = await fs.readFile(path.join(created.run_root, 'user-prompts.md'), 'utf8').catch(() => inputs.userPrompts || '');
  await atomicWrite(path.join(created.run_root, 'report.md'), normalizeReport(report, artifactTask, execution, {
    language: manifest.language,
    userPrompts
  }));
  const recorded = await recordRun(projectDir, slug, run.id, {
    modelResolved: execution.model_resolved,
    resolutionStrategy: execution.model_resolution_strategy
  });
  return recorded.ok
    ? {
        ok: true,
        run: run.id,
        model_requested: execution.model_requested,
        model_resolved: execution.model_resolved,
        prototype_path: created.prototype_path,
        report_path: created.report_path,
        summary_report_path: created.summary_report_path,
        warnings: recorded.run.warnings
      }
    : recorded;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}

async function runModelArena({
  projectDir,
  slug,
  models,
  currentHost,
  parallel = 1,
  parentRun = null,
  logger = { log() {}, error() {} },
  catalogLoader,
  adapterRegistry,
  timeout = 600000,
  explicitModelRequest = false
}) {
  if (!explicitModelRequest) return { ok: false, reason: 'explicit_model_request_required' };
  const parsed = parseModelMatrix(models);
  if (!parsed.ok) return parsed;
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  if (loaded.manifest.strategy === 'single' && (parsed.models.length > 1 || loaded.manifest.runs.length > 0)) {
    return { ok: false, reason: 'single_run_limit' };
  }
  if (loaded.manifest.strategy === 'sequential' && parsed.models.length > 1) {
    return { ok: false, reason: 'sequential_accepts_one_model_per_run' };
  }
  if (parentRun && !loaded.manifest.runs.some(run => run.id === parentRun)) return { ok: false, reason: 'parent_run_not_found' };
  const inputs = await readInputs(loaded.root, loaded.manifest.slug);
  if (!inputs.ok) return inputs;
  const bound = Math.max(1, Math.min(MAX_PARALLEL, Number(parallel) || 1));
  // Allocate immutable run ownership serially before parallel model execution.
  // Without this boundary, concurrent addRun calls can race on the same
  // variant id and one model may overwrite or fail another model's slot.
  const allocations = [];
  for (const spec of parsed.models) {
    const created = await addRun(projectDir, slug, {
      host: spec.host,
      model: spec.model,
      parentRun,
      contextPolicy: parentRun ? 'cumulative' : null
    });
    allocations.push(created.ok ? { spec, created } : { spec, error: created });
  }
  const results = await mapLimit(allocations, bound, allocation => allocation.error || runOne({
    projectDir,
    slug,
    spec: allocation.spec,
    created: allocation.created,
    currentHost,
    inputs,
    parentRun,
    logger,
    catalogLoader,
    adapterRegistry,
    timeout
  }));
  return {
    ok: results.some(result => result.ok),
    complete: results.every(result => result.ok),
    slug,
    strategy: loaded.manifest.strategy,
    summary_report_path: loaded.report_path,
    results
  };
}

module.exports = {
  MAX_PARALLEL,
  buildArtifactTask,
  extractBlock,
  normalizeReport,
  parseModelMatrix,
  runModelArena
};
