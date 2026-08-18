'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const Database = require('better-sqlite3');
const { resolveSkillCatalog, normalizeId } = require('../skills/registry');
const { resolveTargetDir } = require('../lib/project-root');

const CHARS_PER_TOKEN = 4;
const ROUTER_TARGET_CHARS = 4000;
const ROUTER_HARD_CHARS = 8000;
const REFERENCE_TARGET_CHARS = 12000;
const REFERENCE_HARD_CHARS = 24000;

const RUNTIME_ROOTS = [
  { rel: '.aioson/skills', category: 'builtin_skill' },
  { rel: '.aioson/installed-skills', category: 'installed_skill' }
];
const TEMPLATE_ROOT = { rel: 'template/.aioson/skills', category: 'template_skill' };
const REACHABILITY_ROOTS = ['.aioson/agents', '.aioson/tasks', '.aioson/docs', 'src'];
const REACHABILITY_EXTENSIONS = new Set(['.md', '.js', '.json', '.yaml', '.yml']);
const INVENTORY_SOURCES = new Set([
  'src/constants.js',
  'src/commands/skill-audit.js',
  'src/skills/registry.js'
]);

function estimateTokens(chars) {
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

function formatTokens(tokens) {
  return `~${tokens.toLocaleString()} tok`;
}

function normalizeRel(projectDir, filePath) {
  return path.relative(projectDir, filePath).split(path.sep).join('/');
}

function classifySkillFile(relativePath) {
  const base = path.basename(relativePath);
  const normalized = relativePath.split('\\').join('/');
  if (base === 'SKILL.md') {
    return { kind: 'router', targetChars: ROUTER_TARGET_CHARS, hardChars: ROUTER_HARD_CHARS };
  }
  if (normalized.includes('/references/')) {
    return { kind: 'reference', targetChars: REFERENCE_TARGET_CHARS, hardChars: REFERENCE_HARD_CHARS };
  }
  return { kind: 'support', targetChars: REFERENCE_TARGET_CHARS, hardChars: REFERENCE_HARD_CHARS };
}

async function collectFiles(dirPath, predicate = () => true) {
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const filePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(filePath, predicate));
    else if (entry.isFile() && predicate(filePath)) files.push(filePath);
  }
  return files;
}

async function scanSkillFile(filePath, projectDir, category) {
  const content = await fs.readFile(filePath, 'utf8').catch(() => null);
  if (content === null) return null;
  const relativePath = normalizeRel(projectDir, filePath);
  const classification = classifySkillFile(relativePath);
  const chars = content.length;
  const status = chars > classification.hardChars
    ? 'over_hard'
    : chars > classification.targetChars ? 'over_target' : 'ok';
  return {
    file: relativePath,
    category,
    kind: classification.kind,
    chars,
    tokens: estimateTokens(chars),
    target_chars: classification.targetChars,
    hard_chars: classification.hardChars,
    status
  };
}

function summarizeFiles(files) {
  const totals = {
    files: files.length,
    chars: files.reduce((sum, file) => sum + file.chars, 0),
    tokens: files.reduce((sum, file) => sum + file.tokens, 0),
    over_target: files.filter((file) => file.status === 'over_target').length,
    over_hard: files.filter((file) => file.status === 'over_hard').length,
    routers: files.filter((file) => file.kind === 'router').length,
    references: files.filter((file) => file.kind === 'reference').length,
    support: files.filter((file) => file.kind === 'support').length,
    by_category: {},
    by_kind: {}
  };
  for (const file of files) {
    totals.by_category[file.category] = (totals.by_category[file.category] || 0) + file.tokens;
    totals.by_kind[file.kind] = (totals.by_kind[file.kind] || 0) + file.tokens;
  }
  return totals;
}

function parseUsedSkills(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeId).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function readUsage(projectDir) {
  const dbPath = path.join(projectDir, '.aioson', 'runtime', 'aios.sqlite');
  try {
    await fs.access(dbPath);
  } catch {
    return { available: false, db_path: normalizeRel(projectDir, dbPath), total_observations: 0, skills: {} };
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
    const observations = [];
    if (tables.has('agent_runs')) {
      observations.push(...db.prepare(`
        SELECT used_skills_json, updated_at AS observed_at, agent_name AS actor, 'agent_run' AS source
        FROM agent_runs
        WHERE used_skills_json IS NOT NULL
      `).all());
    }
    if (tables.has('content_items')) {
      observations.push(...db.prepare(`
        SELECT used_skills_json, updated_at AS observed_at, created_by_agent AS actor, 'content_item' AS source
        FROM content_items
        WHERE used_skills_json IS NOT NULL
      `).all());
    }
    const skills = {};
    for (const observation of observations) {
      for (const id of parseUsedSkills(observation.used_skills_json)) {
        const current = skills[id] || { count: 0, last_observed_at: null, actors: [], sources: [] };
        current.count += 1;
        if (!current.last_observed_at || observation.observed_at > current.last_observed_at) {
          current.last_observed_at = observation.observed_at;
        }
        if (observation.actor && !current.actors.includes(observation.actor)) current.actors.push(observation.actor);
        if (!current.sources.includes(observation.source)) current.sources.push(observation.source);
        skills[id] = current;
      }
    }
    return {
      available: true,
      db_path: normalizeRel(projectDir, dbPath),
      total_observations: Object.values(skills).reduce((sum, entry) => sum + entry.count, 0),
      skills
    };
  } finally {
    db.close();
  }
}

async function collectReachabilitySources(projectDir) {
  const files = [];
  for (const relativeRoot of REACHABILITY_ROOTS) {
    files.push(...await collectFiles(
      path.join(projectDir, ...relativeRoot.split('/')),
      (filePath) => REACHABILITY_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    ));
  }
  for (const rootFile of ['AGENTS.md', 'CLAUDE.md', 'OPENCODE.md']) {
    const absolute = path.join(projectDir, rootFile);
    try {
      await fs.access(absolute);
      files.push(absolute);
    } catch {
      // Optional client instruction file.
    }
  }
  return [...new Set(files)];
}

function hasSkillReference(content, skill) {
  const escapedId = skill.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.includes(skill.path)
    || content.includes(`$${skill.id}`)
    || new RegExp(`\\b(?:load|use|using|activate|invoke|skill)\\b[^\\n]{0,80}(?:\\\`${escapedId}\\\`|${escapedId})`, 'i').test(content);
}

function classifyReachabilitySource(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  if (['AGENTS.md', 'CLAUDE.md', 'OPENCODE.md'].includes(normalized)) return 'runtime_route';
  if (normalized.startsWith('.aioson/agents/') || normalized.startsWith('.aioson/tasks/')) {
    return 'runtime_route';
  }
  if (normalized.startsWith('.aioson/docs/gateway/')) {
    return /(?:^|\/)legacy-[^/]+$/i.test(normalized) ? 'legacy_reference' : 'runtime_route';
  }
  if (INVENTORY_SOURCES.has(normalized)) return 'inventory_reference';
  if (normalized.startsWith('src/')) return 'runtime_route';
  if (normalized.startsWith('.aioson/docs/')) {
    return /(?:^|\/)legacy-[^/]+$/i.test(normalized)
      || normalized.includes('/legacy-')
      ? 'legacy_reference'
      : 'contextual_reference';
  }
  return 'contextual_reference';
}

function referencedRuntimeDocuments(content) {
  const documents = [];
  for (const line of String(content || '').split(/\r?\n/)) {
    if (/\b(?:never|do not|don't|must not|non-executable|history only|not use|avoid)\b/i.test(line)) {
      continue;
    }
    for (const match of line.matchAll(/\.aioson\/docs\/[A-Za-z0-9._/-]+\.md/g)) {
      documents.push(match[0]);
    }
  }
  return documents;
}

function resolveRoutedSources(sources) {
  const byPath = new Map(sources.map((source) => [source.path, source]));
  const routedBy = new Map();
  const queue = [];

  for (const source of sources) {
    if (source.kind !== 'runtime_route') continue;
    routedBy.set(source.path, null);
    queue.push(source.path);
  }

  while (queue.length > 0) {
    const sourcePath = queue.shift();
    const source = byPath.get(sourcePath);
    if (!source) continue;

    for (const targetPath of referencedRuntimeDocuments(source.content)) {
      const target = byPath.get(targetPath);
      if (!target || target.kind === 'legacy_reference' || routedBy.has(targetPath)) continue;
      routedBy.set(targetPath, sourcePath);
      queue.push(targetPath);
    }
  }

  return sources.map((source) => ({
    ...source,
    runtime_reachable: routedBy.has(source.path),
    routed_via: routedBy.get(source.path) || null
  }));
}

async function analyzeReachability(projectDir, usage) {
  const resolved = await resolveSkillCatalog(projectDir);
  const sourceFiles = await collectReachabilitySources(projectDir);
  const scannedSources = await Promise.all(sourceFiles.map(async (filePath) => ({
    path: normalizeRel(projectDir, filePath),
    content: await fs.readFile(filePath, 'utf8').catch(() => ''),
    kind: classifyReachabilitySource(normalizeRel(projectDir, filePath))
  })));
  const sources = resolveRoutedSources(scannedSources);

  const skills = resolved.catalog.map((skill) => {
    const matchedReferences = sources
      .filter((source) => hasSkillReference(source.content, skill));
    const references = matchedReferences.map((source) => source.path);
    const directReferences = matchedReferences
      .filter((source) => source.runtime_reachable)
      .map((source) => source.path);
    const contextualReferences = matchedReferences
      .filter((source) => !source.runtime_reachable)
      .map((source) => ({ path: source.path, kind: source.kind }));
    const directRoutes = matchedReferences
      .filter((source) => source.runtime_reachable)
      .map((source) => ({
        path: source.path,
        routed_via: source.routed_via
      }));
    const observed = usage.skills[skill.id] || { count: 0, last_observed_at: null, actors: [], sources: [] };
    let reachability;
    if (skill.status === 'deprecated') reachability = 'deprecated';
    else if (observed.count > 0) reachability = 'runtime_observed';
    else if (directReferences.length > 0) reachability = 'direct_reference';
    else if (skill.owner_agents.length > 0) reachability = 'declared_owner_only';
    else if (contextualReferences.length > 0) reachability = 'contextual_reference';
    else if (['static', 'dynamic', 'design', 'design-system', 'premium-visual-design', 'squad', 'installed'].includes(skill.category)) {
      reachability = 'catalog_match_only';
    } else reachability = 'orphan';
    return {
      ...skill,
      references,
      direct_references: directReferences,
      direct_routes: directRoutes,
      contextual_references: contextualReferences,
      runtime_usage: observed,
      reachability,
      tested: skill.tests.length > 0
    };
  });

  const registeredPaths = new Set(
    resolved.registry.registry.skills.map((entry) => String(entry.path || '').replace(/\\/g, '/'))
  );
  const unregistered = skills
    .filter((skill) => skill.category === 'process' && !registeredPaths.has(skill.path))
    .map((skill) => ({ id: skill.id, path: skill.path }));
  return {
    registry: {
      path: resolved.registry.path,
      exists: resolved.registry.exists,
      issues: resolved.registry.issues
    },
    source_files_scanned: sources.length,
    totals: {
      skills: skills.length,
      runtime_observed: skills.filter((skill) => skill.reachability === 'runtime_observed').length,
      directly_referenced: skills.filter((skill) => skill.reachability === 'direct_reference').length,
      declared_only: skills.filter((skill) => skill.reachability === 'declared_owner_only').length,
      contextual_only: skills.filter((skill) => (
        skill.reachability === 'contextual_reference'
        || skill.reachability === 'catalog_match_only'
      )).length,
      deprecated: skills.filter((skill) => skill.reachability === 'deprecated').length,
      orphans: skills.filter((skill) => skill.reachability === 'orphan').length,
      unregistered: unregistered.length
    },
    unregistered,
    weak_process_skills: skills
      .filter((skill) => (
        skill.category === 'process'
        && skill.status !== 'deprecated'
        && !['runtime_observed', 'direct_reference'].includes(skill.reachability)
      ))
      .map((skill) => ({
        id: skill.id,
        reachability: skill.reachability,
        owner_agents: skill.owner_agents,
        references: skill.contextual_references
      })),
    skills
  };
}

function resolveRoots(scope) {
  if (scope === 'template') return [TEMPLATE_ROOT];
  if (scope === 'all') return [...RUNTIME_ROOTS, TEMPLATE_ROOT];
  return RUNTIME_ROOTS;
}

async function runSkillAudit({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const scope = String(options.scope || 'runtime').trim().toLowerCase();
  const selectedRoots = resolveRoots(scope);
  const roots = selectedRoots.map((root) => root.rel);
  const files = [];

  for (const root of selectedRoots) {
    const rootPath = path.join(targetDir, ...root.rel.split('/'));
    const markdownFiles = await collectFiles(rootPath, (filePath) => filePath.toLowerCase().endsWith('.md'));
    for (const filePath of markdownFiles) {
      const result = await scanSkillFile(filePath, targetDir, root.category);
      if (result) files.push(result);
    }
  }
  files.sort((left, right) => right.chars - left.chars);

  if (files.length === 0) {
    if (!options.json) logger.log('No skill markdown files found.');
    return { ok: false, reason: 'no_files', scope, roots };
  }

  const totals = summarizeFiles(files);
  const wantsReachability = Boolean(options.reachability || options.usage);
  const usage = wantsReachability ? await readUsage(targetDir) : null;
  const reachability = options.reachability ? await analyzeReachability(targetDir, usage) : null;
  const result = { ok: true, scope, roots, totals, files };
  if (usage) result.usage = usage;
  if (reachability) result.reachability = reachability;
  if (options.json) return result;

  logger.log('Skill Audit');
  logger.log('─'.repeat(72));
  logger.log(`Scope          : ${scope}`);
  logger.log(`Roots          : ${roots.join(', ')}`);
  logger.log(`Files scanned  : ${totals.files}`);
  logger.log(`Total tokens   : ${formatTokens(totals.tokens)}`);
  logger.log(`Routers        : ${totals.routers}   References: ${totals.references}   Support: ${totals.support}`);
  logger.log(`Over hard limit: ${totals.over_hard}   Over target: ${totals.over_target}`);
  logger.log('');

  const COL = { file: 48, kind: 12, category: 18, tokens: 12 };
  logger.log('File'.padEnd(COL.file) + 'Kind'.padEnd(COL.kind) + 'Category'.padEnd(COL.category) + 'Tokens'.padEnd(COL.tokens) + 'Status');
  logger.log('─'.repeat(72));
  for (const file of files) {
    const statusLabel = { ok: 'ok', over_target: 'target', over_hard: 'hard' }[file.status];
    logger.log(
      file.file.slice(0, COL.file - 1).padEnd(COL.file)
      + file.kind.padEnd(COL.kind)
      + file.category.padEnd(COL.category)
      + formatTokens(file.tokens).padEnd(COL.tokens)
      + statusLabel
    );
  }

  if (reachability) {
    logger.log('');
    logger.log('Reachability');
    logger.log('─'.repeat(72));
    logger.log(
      `Observed: ${reachability.totals.runtime_observed}   Direct: ${reachability.totals.directly_referenced}`
      + `   Declared only: ${reachability.totals.declared_only}   Contextual only: ${reachability.totals.contextual_only}`
    );
    logger.log(
      `Deprecated: ${reachability.totals.deprecated}   Orphans: ${reachability.totals.orphans}`
      + `   Unregistered process skills: ${reachability.totals.unregistered}`
    );
    for (const skill of reachability.skills.filter((entry) =>
      ['declared_owner_only', 'contextual_reference', 'deprecated', 'orphan'].includes(entry.reachability))) {
      const suffix = skill.replacement ? ` -> ${skill.replacement}` : '';
      logger.log(`  ${skill.id}: ${skill.reachability}${suffix}`);
    }
  }
  if (usage) {
    logger.log('');
    logger.log(`Runtime skill observations: ${usage.total_observations} (${usage.available ? usage.db_path : 'database unavailable'})`);
  }
  return result;
}

module.exports = {
  parseUsedSkills,
  readUsage,
  classifyReachabilitySource,
  referencedRuntimeDocuments,
  resolveRoutedSources,
  analyzeReachability,
  runSkillAudit
};
