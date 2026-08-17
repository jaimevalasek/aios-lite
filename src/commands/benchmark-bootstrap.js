'use strict';

/**
 * benchmark:bootstrap — deterministic preparation of a measured benchmark
 * workspace for the @benchmark traversal orchestrator.
 *
 * The Cockpit materializes only `.aioson/agents/benchmark.md`, a minimal
 * `project.context.md`, and the AGENTS/CLAUDE boundary files. The traversal
 * needs a full agent set, a valid context with `auto_handoff: true`, and the
 * measured-run marker that keys every measured gate relaxation. Doing that by
 * hand inside an agent prompt is exactly the kind of frontmatter assembly this
 * CLI exists to own.
 *
 *   aioson benchmark:bootstrap .            # repair + verify (writes)
 *   aioson benchmark:bootstrap . --check    # M5 dry verification (no writes)
 *
 * `--check` answers "can a measured round cross without human intervention?"
 * and names every missing piece instead of guessing. A round should only start
 * after this passes.
 */

const fs = require('node:fs/promises');
const fss = require('node:fs');
const path = require('node:path');

const { detectExistingInstall, installTemplate } = require('../installer');
const { getCliVersion } = require('../version');
const { validateProjectContextFile } = require('../context');
const { resolveAutopilotSignal } = require('../autopilot-signal');
const {
  MEASURED_RUN_MARKER_PATH,
  MEASURED_RUN_MODE,
  readMeasuredRunMarker,
  TRAVERSAL_CHAIN
} = require('../lib/measured-run');
const {
  CONTEXT_ALLOWED_CLASSIFICATIONS,
  CONTEXT_ALLOWED_PROJECT_TYPES,
  CONTEXT_ALLOWED_PROFILES
} = require('../constants');

const CONTEXT_PATH = '.aioson/context/project.context.md';
const TRAVERSAL_DOC_PATH = '.aioson/docs/benchmark/traversal.md';
const BENCHMARK_AGENT_PATH = '.aioson/agents/benchmark.md';

const DEFAULT_CONTEXT_BODY = [
  '# Isolated benchmark delivery',
  '',
  'The run envelope is the complete product authority. Stay within the assigned run root.'
].join('\n');

function splitFrontmatter(raw) {
  const match = String(raw || '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fields: new Map(), body: String(raw || '').trim() };
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    if (!key) continue;
    fields.set(key, line.slice(index + 1).trim());
  }
  return { fields, body: match[2].trim() };
}

function unquote(value) {
  return String(value ?? '').trim().replace(/^["']|["']$/g, '');
}

function quoted(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

/**
 * Merge the cockpit's minimal context into a contract-valid one. Existing
 * valid values always win; only missing/invalid required fields are repaired,
 * and `auto_handoff: true` is forced — the traversal depends on it.
 */
function repairContextFrontmatter(fields, cliVersion) {
  const merged = new Map(fields);
  const pick = (key, fallback, allowed = null) => {
    const current = unquote(merged.get(key));
    if (current && (!allowed || allowed.includes(current))) return current;
    return fallback;
  };

  const interaction = pick('interaction_language', 'en');
  const repaired = new Map();
  repaired.set('project_name', quoted(pick('project_name', 'benchmark-delivery')));
  repaired.set('project_type', quoted(pick('project_type', 'web_app', CONTEXT_ALLOWED_PROJECT_TYPES)));
  repaired.set('profile', quoted(pick('profile', 'developer', CONTEXT_ALLOWED_PROFILES)));
  repaired.set('framework', quoted(pick('framework', 'None')));
  repaired.set('framework_installed', ['true', 'false'].includes(unquote(merged.get('framework_installed')))
    ? unquote(merged.get('framework_installed'))
    : 'false');
  repaired.set('classification', quoted(pick('classification', 'SMALL', CONTEXT_ALLOWED_CLASSIFICATIONS)));
  repaired.set('interaction_language', quoted(interaction));
  repaired.set('conversation_language', quoted(pick('conversation_language', interaction)));
  repaired.set('auto_handoff', 'true');
  repaired.set('aioson_version', quoted(cliVersion));
  repaired.set('generated_at', quoted(new Date().toISOString()));

  // Preserve every other key the caller already declared, verbatim.
  for (const [key, value] of merged) {
    if (!repaired.has(key)) repaired.set(key, value);
  }
  return repaired;
}

function renderContext(fields, body) {
  const lines = ['---'];
  for (const [key, value] of fields) lines.push(`${key}: ${value}`);
  lines.push('---', '', body || DEFAULT_CONTEXT_BODY, '');
  return lines.join('\n');
}

async function readFileOrNull(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function collectChecks(targetDir) {
  const checks = [];
  const push = (id, ok, detail) => checks.push({ id, ok, detail });

  push('install', await detectExistingInstall(targetDir), 'managed AIOSON files present');

  const missingAgents = [];
  for (const agent of [...TRAVERSAL_CHAIN, 'benchmark']) {
    if (!fss.existsSync(path.join(targetDir, `.aioson/agents/${agent}.md`))) missingAgents.push(agent);
  }
  push(
    'traversal_agents',
    missingAgents.length === 0,
    missingAgents.length === 0
      ? `all ${TRAVERSAL_CHAIN.length + 1} agent files present`
      : `missing agent files: ${missingAgents.join(', ')}`
  );

  const context = await validateProjectContextFile(targetDir);
  push(
    'context',
    Boolean(context.valid),
    context.valid ? 'project.context.md satisfies the contract' : (context.issues || []).map((issue) => issue.id).join(', ') || context.reason || 'invalid'
  );

  const marker = readMeasuredRunMarker(targetDir);
  push(
    'marker',
    marker.present,
    marker.present
      ? MEASURED_RUN_MARKER_PATH
      : marker.invalid
        ? `${MEASURED_RUN_MARKER_PATH} exists but does not prove mode: ${MEASURED_RUN_MODE}`
        : `${MEASURED_RUN_MARKER_PATH} missing`
  );

  let autopilot = { enabled: false, source: 'unresolvable' };
  try {
    autopilot = await resolveAutopilotSignal(targetDir, {});
  } catch {
    // keep the strict default — an unresolvable signal is a failed check
  }
  push('autopilot', autopilot.enabled === true, `signal source: ${autopilot.source || 'none'}`);

  push(
    'traversal_doc',
    fss.existsSync(path.join(targetDir, TRAVERSAL_DOC_PATH)),
    TRAVERSAL_DOC_PATH
  );

  return checks;
}

async function runBenchmarkBootstrap({ args = [], options = {}, logger = console }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const checkOnly = options.check === true;
  const actions = [];

  let stat;
  try {
    stat = await fs.stat(targetDir);
  } catch {
    stat = null;
  }
  if (!stat || !stat.isDirectory()) {
    const report = { ok: false, mode: checkOnly ? 'check' : 'bootstrap', targetDir, error: 'target_not_a_directory', checks: [], actions };
    logger.error(`benchmark:bootstrap — target is not a directory: ${targetDir}`);
    if (options.json) logger.log(JSON.stringify(report, null, 2));
    return report;
  }

  if (!checkOnly) {
    // Caller-owned files the template copy must never alter: the frozen
    // benchmark instruction is the contract of record for the round, and the
    // orchestrator's boundary files are deliberately minimal — grafting the
    // AIOSON routing/memory kernel into them would re-introduce interactive
    // routing and operator-memory loading inside a measured round.
    const preservePaths = ['AGENTS.md', 'CLAUDE.md', 'OPENCODE.md', BENCHMARK_AGENT_PATH]
      .map((rel) => path.join(targetDir, rel));
    const preserved = new Map();
    for (const filePath of preservePaths) {
      const content = await readFileOrNull(filePath);
      if (content !== null) preserved.set(filePath, content);
    }

    if (!(await detectExistingInstall(targetDir))) {
      await installTemplate(targetDir, { overwrite: false, mode: 'install', backupOnOverwrite: false });
      actions.push('installed managed AIOSON template files (existing files preserved)');
    } else {
      const missing = [...TRAVERSAL_CHAIN, 'benchmark'].filter(
        (agent) => !fss.existsSync(path.join(targetDir, `.aioson/agents/${agent}.md`))
      );
      if (missing.length > 0) {
        await installTemplate(targetDir, { overwrite: false, mode: 'install', backupOnOverwrite: false });
        actions.push(`completed managed files (agents were missing: ${missing.join(', ')})`);
      }
    }

    for (const [filePath, content] of preserved) {
      if (await readFileOrNull(filePath) !== content) {
        await fs.writeFile(filePath, content, 'utf8');
        actions.push(`restored caller-owned ${path.relative(targetDir, filePath).replace(/\\/g, '/')} untouched`);
      }
    }

    const contextPath = path.join(targetDir, CONTEXT_PATH);
    const rawContext = await readFileOrNull(contextPath);
    const { fields, body } = splitFrontmatter(rawContext || '');
    const repaired = repairContextFrontmatter(fields, await getCliVersion());
    await fs.mkdir(path.dirname(contextPath), { recursive: true });
    await fs.writeFile(contextPath, renderContext(repaired, body), 'utf8');
    actions.push(`repaired ${CONTEXT_PATH} (required fields + auto_handoff: true)`);

    const marker = readMeasuredRunMarker(targetDir);
    if (!marker.present) {
      const markerPath = path.join(targetDir, MEASURED_RUN_MARKER_PATH);
      await fs.mkdir(path.dirname(markerPath), { recursive: true });
      await fs.writeFile(markerPath, `${JSON.stringify({
        schema_version: 1,
        mode: MEASURED_RUN_MODE,
        created_by: 'benchmark:bootstrap',
        created_at: new Date().toISOString(),
        policy: { unattended: true, decisions: 'recommended-or-fail' },
        chain: TRAVERSAL_CHAIN,
        run_root: String(options['run-root'] || '..'),
        delivery_root: String(options['delivery-root'] || '.')
      }, null, 2)}\n`, 'utf8');
      actions.push(`wrote ${MEASURED_RUN_MARKER_PATH}`);
    }
  }

  const checks = await collectChecks(targetDir);
  const ok = checks.every((check) => check.ok);
  const report = { ok, mode: checkOnly ? 'check' : 'bootstrap', targetDir, checks, actions };

  if (options.json) {
    logger.log(JSON.stringify(report, null, 2));
  } else {
    logger.log(`benchmark:bootstrap ${report.mode} — ${ok ? 'ready' : 'NOT ready'}`);
    for (const check of checks) {
      logger.log(`  ${check.ok ? 'ok' : '!!'} ${check.id} — ${check.detail}`);
    }
    for (const action of actions) logger.log(`  -> ${action}`);
    if (!ok && checkOnly) logger.log('  Run `aioson benchmark:bootstrap .` to repair what a bootstrap owns.');
  }
  return report;
}

module.exports = { runBenchmarkBootstrap };
