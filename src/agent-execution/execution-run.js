'use strict';

/**
 * execution:run — the orchestrator's engine for a compiled execution plan.
 *
 * One run = the lane units of `execution-plan-{slug}.json`, scheduled by
 * readiness: a unit starts when every passage rule into it is satisfied — its
 * explicit edges (the plan's `Depends on`, gates `after_dev` / `after_qa`) or,
 * for a unit that declares none, the wave barrier (every lane unit of every
 * earlier wave finished). Without explicit edges this is the wave-by-wave run.
 * Every lane unit is a pipeline `dev → qa`: the dev role's host process
 * implements the unit (ephemeral, bounded to the unit's files, bound JSON
 * report), then the lane's qa role reviews and tests it, may apply a measured,
 * capped set of corrections inside the unit's own files, and reports the rest
 * as findings for the integration owner (the session's @dev). Up to
 * `parallel.max_concurrent_lanes` pipelines run at once.
 *
 * Nothing here is a judgment call: the preflight is `verify:artifact
 * kind=execution-plan` plus executables on PATH; a unit that cannot run or
 * did not pass leaves a `decision_required` (recorded in the run state and in
 * the execution telemetry a supervising client already polls); the operator
 * answers with `execution:decide` and `execution:run --resume` continues
 * idempotently. The run holds the feature's dispatcher lease for its whole
 * life, so a direct `agent:execution:dispatch` cannot interleave with it.
 *
 * Integration units (files outside every lane) are never spawned here: the
 * run ends `completed` with them listed for the session DEV.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { readExecutionPlan, verifyExecutionPlan, executionPlanRelative, pathOwns } = require('./execution-plan');
const { loadManifest, resolveExecutionEntry, assertFeatureSlug } = require('./manifest');
const {
  acquireLease,
  renewLease,
  releaseLease,
  executeWithCapacityPolicy,
  buildExecutionPrompt,
  readBoundReport,
  resolveWritableRoots,
  fallbackReasonCategory
} = require('./dispatcher');
const { safeReportPath } = require('./reports');
const { createTelemetryBridge } = require('./telemetry-bridge');
const { buildQaLaneProfile } = require('./qa-lane-profile');
const { resolveExecutable } = require('./executable-resolver');
const { REASONING_EFFORTS } = require('./schema');
const { readSignatures, findSignature, signatureState } = require('../lib/host-signature');
const { getExecutionCapabilities } = require('../lib/tool-capabilities');
const { captureCorrectionBaseline } = require('../lib/specialist-correction');
const { openRuntimeDb, appendExecutionEvent } = require('../runtime-store');
const { readExecutionRoles, resolveSpawner, DEFAULT_SPAWNER_UNIT_TIMEOUT_MS } = require('../lib/execution-roles');
const { wrapRegistryWithSpawner } = require('./adapters/spawner');

const DEFAULT_ADAPTERS = {
  claude: require('./adapters/claude'),
  codex: require('./adapters/codex'),
  opencode: require('./adapters/opencode'),
  kimi: require('./adapters/kimi'),
  qwen: require('./adapters/qwen')
};
const RUN_STATE_VERSION = 1;
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];
const LEASE_MS = 30000;
const DEV_CHOICES = ['retry', 'fallback:<host>/<model>[/<effort>]', 'skip', 'abort'];
const QA_CHOICES = ['retry', 'fallback:<host>/<model>[/<effort>]', 'skip-qa', 'abort'];
const MAX_EXCERPT_ITEMS = 20;
const DEFAULT_UNIT_TIMEOUT_MS = 600000;

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function runStateRelative(feature) {
  return `.aioson/context/execution-state-${feature}.json`;
}

function runStatePath(projectDir, feature) {
  return path.join(projectDir, '.aioson', 'context', `execution-state-${assertFeatureSlug(feature)}.json`);
}

async function readJsonSafe(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  // Windows refuses a rename onto a file another handle still holds (EPERM/
  // EBUSY) — an indexer, an antivirus scan, a reader mid-poll. Under load
  // those holds last longer than a few milliseconds: retry with a growing
  // backoff (~1.4s in total) before giving up.
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 10) {
        await fs.rm(tmp, { force: true }).catch(() => {});
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}

function resumeCommand(feature) {
  return `aioson execution:run . --feature=${feature} --resume`;
}

function decideHint(feature, unitId) {
  return `aioson execution:decide . --feature=${feature} --unit=${unitId} --choice=<retry|fallback:<host>/<model>|skip|skip-qa|abort>`;
}

// ─── lease monitor (the dispatcher's feature lease, renewed for the whole run) ───

function createLeaseMonitor(lease, { intervalMs = Math.floor(LEASE_MS / 3) } = {}) {
  const controller = new AbortController();
  let lost = false;
  let running = false;
  let inFlight = Promise.resolve();
  const lose = () => {
    if (lost) return;
    lost = true;
    controller.abort(new Error('lease_lost'));
  };
  const tick = () => {
    if (lost || running) return;
    running = true;
    inFlight = Promise.resolve()
      .then(() => renewLease(lease))
      .then((ok) => { if (!ok) lose(); })
      .catch(lose)
      .finally(() => { running = false; });
  };
  const timer = setInterval(tick, Math.max(1, Number(intervalMs) || 1));
  timer.unref?.();
  return { signal: controller.signal, get lost() { return lost; }, async stop() { clearInterval(timer); await inFlight; } };
}

// ─── life measured, not reported: output OR files under the write paths ───

async function newestMtime(projectDir, writePaths, { cap = 4000 } = {}) {
  let newest = 0;
  let scanned = 0;
  const roots = [...new Set((writePaths || []).map((wp) => String(wp).split(/[*?{[]/)[0].replace(/\/+$/, '') || '.'))];
  const walk = async (dir) => {
    if (scanned > cap) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (scanned++ > cap) return;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        try {
          const stat = await fs.stat(full);
          if (stat.mtimeMs > newest) newest = stat.mtimeMs;
        } catch { /* vanished between readdir and stat */ }
      }
    }
  };
  for (const root of roots) {
    const abs = path.resolve(projectDir, root);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) await walk(abs);
      else if (stat.mtimeMs > newest) newest = stat.mtimeMs;
    } catch { /* not created yet — the unit may still be thinking */ }
  }
  return newest;
}

function createStallWatch({ projectDir, writePaths, stallMs, checkMs, now, onStalled }) {
  let lastOutputAt = now();
  let stalled = false;
  let stopped = false;
  let checking = false;
  const timer = setInterval(async () => {
    if (stopped || stalled || checking) return;
    checking = true;
    try {
      const silent = now() - lastOutputAt;
      if (silent < stallMs) return;
      const mtime = await newestMtime(projectDir, writePaths);
      if (now() - mtime < stallMs) return;
      stalled = true;
      onStalled({ silent_ms: silent });
    } finally {
      checking = false;
    }
  }, Math.max(1, Number(checkMs) || 1));
  timer.unref?.();
  return { touch() { lastOutputAt = now(); }, get stalled() { return stalled; }, stop() { stopped = true; clearInterval(timer); } };
}

// ─── worktree measurement (git; absent git → measured:false, never a block) ───

function diffBaselines(before, after) {
  if (!before?.ok || !after?.ok) return null;
  const b = before.baseline;
  const a = after.baseline;
  const changed = new Set();
  const bPaths = new Set(b.dirty_paths || []);
  const aPaths = new Set(a.dirty_paths || []);
  for (const p of new Set([...bPaths, ...aPaths])) {
    const wasDirty = bPaths.has(p);
    const isDirty = aPaths.has(p);
    if (wasDirty !== isDirty || (wasDirty && (b.dirty_hashes || {})[p] !== (a.dirty_hashes || {})[p])) changed.add(p);
  }
  return [...changed].filter((p) => !p.startsWith('.aioson/'));
}

function laneOwning(plan, filePath) {
  for (const [laneId, lane] of Object.entries(plan.lanes || {})) {
    if ((lane.write_paths || []).some((wp) => pathOwns(wp, filePath))) return laneId;
  }
  return null;
}

/**
 * Scope of one unit's window: every file that changed between the unit's
 * start and its end must belong to a unit that was active at some point of
 * that window (the unit itself or a concurrent one). Anything else is drift
 * inside a lane (`lane_scope_drift`) or an integration file touched by a lane
 * (`unowned_change`).
 */
function measureWindowScope({ before, after, plan, wave, unit, units }) {
  const changed = diffBaselines(before, after);
  if (!changed) return { measured: false, changed: [], findings: [] };
  const unitFiles = new Set(units.flatMap((item) => item.files.map((f) => f.toLowerCase())));
  const findings = [];
  for (const p of changed) {
    if (unitFiles.has(p.toLowerCase())) continue;
    const lane = laneOwning(plan, p);
    if (lane) {
      findings.push({ check: 'lane_scope_drift', wave, unit, lane, path: p, message: `wave ${wave} (${unit}): ${p} changed inside lane "${lane}" write paths but belongs to no unit active in this window` });
    } else {
      findings.push({ check: 'unowned_change', wave, unit, path: p, message: `wave ${wave} (${unit}): ${p} changed outside every lane — integration files belong to the session DEV` });
    }
  }
  return { measured: true, changed, findings };
}

// ─── prompts ───

async function readPromptInside(projectDir, relative) {
  const root = path.resolve(projectDir);
  const file = path.resolve(root, ...String(relative).split('/'));
  if (file !== root && !file.startsWith(root + path.sep)) throw new Error('prompt path escapes project workspace');
  return fs.readFile(file, 'utf8');
}

function compactList(items, limit = MAX_EXCERPT_ITEMS) {
  const list = Array.isArray(items) ? items : [];
  const shown = list.slice(0, limit).map((item) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  if (list.length > limit) shown.push(`- … ${list.length - limit} more`);
  return shown.length ? shown : ['- (none)'];
}

// ─── mailbox: the lateral edges, as a contract in the report ───

const MESSAGE_KINDS = ['contract_change', 'note', 'question'];
const MESSAGE_TARGET = /^(?:lane:[a-z0-9][a-z0-9_-]*|unit:[a-z0-9][a-z0-9-]*|integration|orchestrator)$/;
const MAX_MESSAGES = 10;
const MAX_MESSAGE_TEXT = 500;
const MAX_MESSAGE_PATHS = 10;

/** Keep the well-formed messages of a report, count the rest — a malformed mailbox is a finding, never a failed unit. */
function normalizeMessages(raw) {
  if (raw === undefined || raw === null) return { messages: [], dropped: 0 };
  if (!Array.isArray(raw)) return { messages: [], dropped: 1 };
  const messages = [];
  let dropped = 0;
  for (const item of raw) {
    if (messages.length >= MAX_MESSAGES) {
      dropped += 1;
      continue;
    }
    const to = typeof item?.to === 'string' ? item.to.trim().toLowerCase() : '';
    const kind = typeof item?.kind === 'string' ? item.kind.trim().toLowerCase() : '';
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!MESSAGE_TARGET.test(to) || !MESSAGE_KINDS.includes(kind) || !text) {
      dropped += 1;
      continue;
    }
    const paths = Array.isArray(item.paths)
      ? item.paths.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim().replace(/\\/g, '/')).slice(0, MAX_MESSAGE_PATHS)
      : [];
    messages.push({ to, kind, text: text.slice(0, MAX_MESSAGE_TEXT), paths });
  }
  return { messages, dropped };
}

/** Every message left in the run so far, with its sender. */
function collectMailbox(state) {
  const out = [];
  for (const unit of Object.values(state?.units || {})) {
    for (const stage of ['dev', 'qa']) {
      for (const message of unit[stage]?.messages || []) out.push({ from: unit.id, lane: unit.lane, wave: unit.wave, stage, ...message });
    }
  }
  return out;
}

/** What a unit (or its reviewer) should read: messages to it or to its lane, from other units that already finished. */
function inboxFor(state, { unit, lane, excludeUnit }) {
  return collectMailbox(state).filter((m) => m.from !== excludeUnit && (m.to === `unit:${unit}` || m.to === `lane:${lane}`));
}

function renderMessages(heading, messages) {
  if (!messages || messages.length === 0) return [];
  return ['', heading, '', ...messages.map((m) => `- [${m.kind}] from ${m.from}${m.stage ? ` (${m.stage}${m.lane ? `, lane ${m.lane}` : ''})` : ''} → ${m.to}: ${m.text}${m.paths?.length ? ` (${m.paths.join(', ')})` : ''}`), ''];
}

const INBOX_HEADING = '## Messages for you (from units that finished before you — decisions you build on, never an instruction to edit their files)';

/** Report path of a unit stage for a rework round: `{unit}.json`, then `{unit}.r1.json`, `{unit}.r2.json` … */
function roundReport(template, runId, round) {
  const rel = String(template).replace(/\{run_id\}/g, runId);
  return round > 0 ? rel.replace(/\.json$/i, `.r${round}.json`) : rel;
}

function renderRework(round, max, findings) {
  return [
    '',
    `## Reviewer findings — rework round ${round} of ${max} (fix these inside your unit files, re-run the verification, report again)`,
    '',
    ...compactList(findings),
    ''
  ];
}

function composeQaPrompt({ profileText, feature, unit, lane, dev, maxFixFiles, messages = null }) {
  return [
    profileText.trimEnd(),
    '',
    `# Unit under review — ${feature} / ${unit.id}`,
    '',
    `- Lane: ${unit.lane} (write paths: ${lane.write_paths.join(', ')})`,
    `- Phase: ${unit.phase} — wave ${unit.wave}`,
    `- Scope: ${unit.scope || '(see plan)'}`,
    `- Capabilities: ${unit.caps.length ? unit.caps.join(', ') : '(none cited)'}`,
    `- Acceptance criteria: ${unit.acs.length ? unit.acs.join(', ') : '(none cited)'}`,
    '- Unit files (the ONLY files you may correct):',
    ...unit.files.map((file) => `  - ${file}`),
    `- Done when: ${unit.done || '(see plan)'}`,
    ...(unit.verification.length ? ['- Verification:', ...unit.verification.map((item) => `  - ${item.command}${item.cap ? ` (${item.cap})` : ''}`)] : []),
    `- Correction budget: at most ${maxFixFiles} file(s) among the unit files; list each in corrections[] as {path, summary}.`,
    '',
    '## Implementer report',
    '',
    `- Verdict: ${dev.verdict || 'unknown'} (${dev.host}/${dev.model}${dev.reasoning_effort ? `/${dev.reasoning_effort}` : ''})`,
    '- Findings:',
    ...compactList(dev.findings),
    '- Evidence:',
    ...compactList(dev.evidence),
    ...renderMessages('## Implementer messages (what the implementer told other lanes or the integration owner — verify them; disagreement is a finding, not a reply)', (messages?.implementer || []).map((m) => ({ ...m, from: unit.id, stage: 'dev', lane: unit.lane }))),
    ...renderMessages('## Messages for this unit (from units that finished before it)', messages?.inbox || []),
    ''
  ].join('\n');
}

// ─── one role execution (dev or qa) of one unit ───

function classifyFailure(reason) {
  if (reason === 'capacity' || reason === 'auth' || reason === 'fallback_exhausted' || reason === 'capacity_limit' || reason === 'no_authorized_fallback') return 'unavailable';
  if (fallbackReasonCategory(reason) === 'unavailable') return 'unavailable';
  if (reason === 'timeout') return 'timeout';
  if (reason === 'lease_lost' || reason === 'aborted') return 'aborted';
  return 'crashed';
}

async function executeRole({
  projectDir, feature, runId, role, unit, lane, config, promptText, reportRel, manifest,
  adapterRegistry, catalogLoader, timeout, signal, resolverOptions, stallMs, stallCheckMs, now, emit
}) {
  const resolved = await resolveExecutionEntry(config, { catalogLoader });
  if (!resolved.ok) return { kind: 'unavailable', reason: resolved.reason, candidates: resolved.candidates || [], host: config.host, model: config.model, reasoning_effort: config.reasoning_effort || null };
  let writableRoots;
  try {
    writableRoots = await resolveWritableRoots(projectDir, config.writable_roots || []);
  } catch (error) {
    return { kind: 'unavailable', reason: 'invalid_writable_root', error: error.message, host: resolved.host, model: resolved.model };
  }
  let reportFile;
  try {
    reportFile = safeReportPath(projectDir, reportRel);
  } catch (error) {
    return { kind: 'crashed', reason: 'invalid_report_path', error: error.message, host: resolved.host, model: resolved.model };
  }
  const attemptId = crypto.randomUUID();
  const expected = {
    feature,
    run_id: runId,
    attempt_id: attemptId,
    agent: role,
    lane: unit.lane,
    host: resolved.host,
    model_requested: resolved.model_requested || config.model,
    model_resolved: resolved.model_resolved || resolved.model || config.model,
    model_resolution_strategy: resolved.model_resolution_strategy || 'unresolved',
    reasoning_effort: resolved.reasoning_effort || config.reasoning_effort || null,
    manifest_digest: manifest.digest,
    writable_roots: writableRoots,
    write_paths: lane.write_paths,
    status: 'running'
  };
  const correlation = {
    feature,
    agent: `${role}:${unit.id}`,
    lane: unit.lane,
    dispatcher_run_id: runId,
    attempt_id: attemptId,
    host: resolved.host,
    model: expected.model_resolved,
    model_requested: expected.model_requested,
    model_resolved: expected.model_resolved,
    reasoning_effort: expected.reasoning_effort,
    model_resolution_strategy: expected.model_resolution_strategy,
    catalog_source: resolved.catalog_source
  };
  const telemetry = await createTelemetryBridge(projectDir, correlation);
  const stall = createStallWatch({
    projectDir,
    writePaths: lane.write_paths,
    stallMs,
    checkMs: stallCheckMs,
    now,
    onStalled: ({ silent_ms }) => {
      try { telemetry.event('stalled', `${role}:${unit.id} silent for ${Math.round(silent_ms / 1000)}s — no output, no file change under the lane write paths`, { unit: unit.id, role, silent_ms }); } catch { /* telemetry is best-effort */ }
      emit({ type: 'stalled', unit: unit.id, lane: unit.lane, wave: unit.wave, role, silent_ms });
    }
  });
  let spawnCount = 0;
  const input = {
    mode: 'external',
    model: expected.model_resolved,
    reasoning_effort: expected.reasoning_effort,
    writable_roots: writableRoots,
    cwd: projectDir,
    prompt_text: buildExecutionPrompt(promptText, expected, path.relative(projectDir, reportFile).split(path.sep).join('/')),
    timeout,
    signal,
    abortReason: 'lease_lost',
    sandbox_mode: 'workspace-write',
    resolverOptions,
    // Who/what/where for a spawner (a client that owns the process); ignored by the host adapters.
    spawn_context: { feature, run_id: runId, attempt_id: attemptId, unit: unit.id, lane: unit.lane, wave: unit.wave, role, report_path: reportRel, write_paths: lane.write_paths },
    onSpawn: (pid, at) => telemetry.onSpawn(pid, at, { replace: spawnCount++ > 0 }),
    onStdout: (data) => { stall.touch(); telemetry.output('stdout', data); },
    onStderr: (data) => { stall.touch(); telemetry.output('stderr', data); }
  };
  try { telemetry.event('progress', `${role} started for ${unit.id}`, { unit: unit.id, lane: unit.lane, wave: unit.wave, role }); } catch { /* best-effort */ }
  const startedAt = nowIso();
  const execution = await executeWithCapacityPolicy({ manifest: manifest.manifest, resolved, input, adapterRegistry, catalogLoader });
  stall.stop();
  const base = {
    attempt_id: attemptId,
    telemetry_run_id: telemetry.run.telemetry_run_id,
    host: execution.host || resolved.host,
    model: execution.model || expected.model_resolved,
    reasoning_effort: execution.reasoning_effort ?? expected.reasoning_effort ?? null,
    report: reportRel,
    history: execution.history || [],
    session_id: execution.session_id || null,
    stalled: stall.stalled,
    started_at: startedAt,
    finished_at: nowIso()
  };
  if (!execution.ok) {
    const reason = execution.reason || 'crash';
    try { telemetry.transition('paused', reason); } catch { /* state graph tolerance */ }
    telemetry.close();
    return { ...base, kind: classifyFailure(reason), reason, error: execution.error || null, candidates: execution.candidates || [] };
  }
  try { telemetry.transition('waiting_report'); } catch { /* tolerance */ }
  const bound = {
    ...expected,
    host: base.host,
    model_requested: execution.model_requested || expected.model_requested,
    model_resolved: base.model,
    model_resolution_strategy: execution.model_resolution_strategy || expected.model_resolution_strategy,
    reasoning_effort: base.reasoning_effort,
    status: 'running'
  };
  const report = await readBoundReport(projectDir, reportRel, bound);
  if (!report.ok) {
    try { telemetry.transition('paused', report.reason); } catch { /* tolerance */ }
    telemetry.close();
    return { ...base, kind: 'crashed', reason: report.reason, errors: report.errors || [] };
  }
  try { telemetry.report(report.report, reportRel, sha256(JSON.stringify(report.report))); } catch { /* tolerance */ }
  const verdict = report.report.verdict;
  try { telemetry.transition(verdict === 'PASS' ? 'passed' : 'failed', verdict === 'PASS' ? null : `verdict_${String(verdict).toLowerCase()}`); } catch { /* tolerance */ }
  telemetry.close();
  const mailbox = normalizeMessages(report.report.messages);
  return {
    ...base,
    kind: verdict === 'PASS' ? 'passed' : (verdict === 'FAIL' ? 'failed' : 'blocked'),
    verdict,
    findings: Array.isArray(report.report.findings) ? report.report.findings : [],
    evidence: Array.isArray(report.report.evidence) ? report.report.evidence : [],
    corrections: Array.isArray(report.report.corrections) ? report.report.corrections : [],
    messages: mailbox.messages,
    messages_dropped: mailbox.dropped
  };
}

// ─── run state ───

function newRunState({ feature, plan, planDigest, manifestDigest }) {
  return {
    version: RUN_STATE_VERSION,
    feature,
    run_id: crypto.randomUUID(),
    plan_path: executionPlanRelative(feature),
    plan_digest: planDigest,
    manifest_digest: manifestDigest,
    status: 'running',
    reason: null,
    started_at: nowIso(),
    updated_at: nowIso(),
    finished_at: null,
    current_wave: null,
    parallel: { max_concurrent_lanes: plan.parallel?.max_concurrent_lanes || 1 },
    on_unavailable: plan.on_unavailable || 'ask',
    waves: (plan.waves || []).map((wave) => ({ wave: wave.wave, status: 'pending', units: wave.units })),
    units: Object.fromEntries((plan.units || []).map((unit) => [unit.id, {
      id: unit.id,
      lane: unit.lane,
      wave: unit.wave,
      owner: unit.owner,
      status: unit.owner === 'lane' ? 'pending' : 'integration',
      override: {},
      pending_decision: null,
      dev: { status: 'pending' },
      qa: { status: unit.owner === 'lane' ? 'pending' : 'not_applicable' }
    }])),
    decisions: [],
    findings: [],
    scope: { measured: null, waves: {} },
    integration: {
      owner: 'dev',
      units: plan.integration?.units || [],
      role: plan.integration?.role || null,
      status: 'pending'
    }
  };
}

function pendingDecisions(state, feature) {
  return Object.values(state.units)
    .filter((unit) => unit.pending_decision)
    .map((unit) => ({ unit: unit.id, lane: unit.lane, wave: unit.wave, ...unit.pending_decision, hint: decideHint(feature, unit.id) }));
}

function summarizeState(state, feature) {
  const units = Object.values(state.units);
  const count = (predicate) => units.filter(predicate).length;
  return {
    run_id: state.run_id,
    status: state.status,
    reason: state.reason,
    current_wave: state.current_wave,
    started_at: state.started_at,
    updated_at: state.updated_at,
    finished_at: state.finished_at,
    waves: state.waves.map((wave) => ({ wave: wave.wave, status: wave.status, units: wave.units })),
    units: {
      total: units.length,
      lane: count((u) => u.owner === 'lane'),
      integration: count((u) => u.owner === 'integration'),
      passed: count((u) => u.status === 'passed'),
      pending: count((u) => u.status === 'pending'),
      running: count((u) => u.status === 'running'),
      skipped: count((u) => u.status === 'skipped'),
      decision_required: count((u) => u.status === 'decision_required'),
      qa_passed: count((u) => u.qa?.status === 'passed'),
      qa_failed: count((u) => u.qa?.status === 'failed'),
      qa_skipped: count((u) => u.qa?.status === 'skipped')
    },
    decisions_pending: pendingDecisions(state, feature),
    findings: state.findings.length,
    mailbox: { messages: collectMailbox(state).length, questions: collectMailbox(state).filter((m) => m.kind === 'question').length },
    rework: { units: units.filter((u) => u.rework?.rounds > 0).length, rounds: units.reduce((sum, u) => sum + (u.rework?.rounds || 0), 0) },
    integration: state.integration
  };
}

// ─── preflight ───

async function preflightExecution(projectDir, featureInput, { env = process.env, now = () => Date.now(), resolverOptions, adapterRegistry = DEFAULT_ADAPTERS } = {}) {
  const feature = assertFeatureSlug(featureInput);
  const checks = [];
  const check = (id, ok, detail) => checks.push({ id, ok, detail: detail || null });
  const verified = await verifyExecutionPlan(projectDir, feature, { env, now: now() });
  check('plan', verified.ok, verified.issues.join('; '));
  const read = await readExecutionPlan(projectDir, feature);
  const plan = read.plan;
  const loaded = await loadManifest(projectDir, feature);
  check('manifest', Boolean(loaded.exists && loaded.ok), loaded.exists ? (loaded.ok ? null : 'invalid') : 'missing');
  const hosts = new Set();
  for (const lane of Object.values(plan?.lanes || {})) {
    if (lane.dev?.host) hosts.add(lane.dev.host);
    if (lane.qa?.host) hosts.add(lane.qa.host);
  }
  for (const host of [...hosts].sort()) {
    const caps = getExecutionCapabilities(host);
    if (!caps || !adapterRegistry[host]) {
      check(`host:${host}`, false, 'no execution adapter for this host');
      continue;
    }
    try {
      await resolveExecutable(caps.binary, resolverOptions);
      check(`host:${host}`, true, null);
    } catch (error) {
      check(`host:${host}`, false, `executable_not_found: ${error.message}${caps.install_command ? ` — install: ${caps.install_command}` : ''}`);
    }
  }
  const laneUnits = (plan?.units || []).filter((unit) => unit.owner === 'lane');
  check('units', laneUnits.length > 0, laneUnits.length > 0 ? null : 'the plan has no lane units to run');
  // The client seam: a spawner in force must be resolvable before anything is handed to it.
  const rolesRead = await readExecutionRoles(projectDir);
  const spawner = resolveSpawner({ roles: rolesRead.ok ? rolesRead.roles : null, env });
  if (spawner) {
    try {
      await resolveExecutable(spawner.command, resolverOptions);
      check('spawner', true, `${spawner.command} (${spawner.source})`);
    } catch (error) {
      check('spawner', false, `spawner_not_found: ${error.message} (${spawner.source})`);
    }
  }
  const ok = checks.every((item) => item.ok);
  return {
    ok,
    feature,
    checks,
    issues: checks.filter((item) => !item.ok).map((item) => `${item.id}: ${item.detail}`),
    plan,
    planDigest: read.exists ? sha256(JSON.stringify(plan)) : null,
    manifest: loaded.exists && loaded.ok ? loaded : null,
    verification: verified,
    spawner,
    unitTimeoutMs: rolesRead.ok ? (rolesRead.roles.execution?.unit_timeout_ms || null) : null
  };
}

// ─── the run ───

async function runExecution({
  projectDir,
  feature: featureInput,
  resume = false,
  fresh = false,
  preflightOnly = false,
  stopAfterWave = null,
  adapterRegistry = DEFAULT_ADAPTERS,
  catalogLoader,
  env = process.env,
  now = () => Date.now(),
  timeout = null,
  progress = () => {},
  resolverOptions,
  leaseIntervalMs = Math.floor(LEASE_MS / 3),
  stallMs = 300000,
  stallCheckMs = 30000,
  qaKernelPath,
  gitBaseline = captureCorrectionBaseline,
  spawnerOptions = {}
}) {
  const feature = assertFeatureSlug(featureInput);
  const emit = (event) => {
    try { progress({ at: nowIso(), feature, ...event }); } catch { /* progress is best-effort */ }
  };
  const preflight = await preflightExecution(projectDir, feature, { env, now, resolverOptions, adapterRegistry });
  const preflightReport = { ok: preflight.ok, checks: preflight.checks, issues: preflight.issues, spawner: preflight.spawner ? { command: preflight.spawner.command, source: preflight.spawner.source } : null };
  if (!preflight.ok) {
    return { ok: false, status: 'refused', reason: 'preflight_failed', feature, preflight: preflightReport, exitCode: 1 };
  }
  if (preflightOnly) {
    return { ok: true, status: 'ready', reason: null, feature, preflight: preflightReport, plan: preflight.plan.summary, exitCode: 0 };
  }
  const { plan, manifest, planDigest } = preflight;
  const stateFile = runStatePath(projectDir, feature);
  // A spawner in force turns every host adapter into a hand-off to the client;
  // with humans watching terminals the unit budget defaults to 30 minutes.
  const spawner = preflight.spawner || null;
  const registry = spawner ? wrapRegistryWithSpawner(adapterRegistry, spawner, spawnerOptions) : adapterRegistry;
  // An explicit engine timeout (the caller's) wins; then the roles file; then the default for the mode.
  const unitTimeout = timeout !== null ? timeout : (preflight.unitTimeoutMs || (spawner ? DEFAULT_SPAWNER_UNIT_TIMEOUT_MS : DEFAULT_UNIT_TIMEOUT_MS));

  const lease = await acquireLease(projectDir, feature);
  if (!lease) {
    return { ok: false, status: 'refused', reason: 'run_lease_held', feature, message: 'another execution run or a direct agent:execution:dispatch holds this feature', exitCode: 1 };
  }
  const monitor = createLeaseMonitor(lease, { intervalMs: leaseIntervalMs });
  try {
    let state = await readJsonSafe(stateFile);
    if (state && !fresh) {
      if (resume) {
        if (TERMINAL_STATUSES.includes(state.status)) {
          return { ok: false, status: state.status, reason: 'run_terminal', feature, path: runStateRelative(feature), message: 'the previous run already ended; start a new one without --resume', exitCode: 1 };
        }
        if (state.plan_digest !== planDigest || state.manifest_digest !== manifest.digest) {
          return { ok: false, status: state.status, reason: 'run_state_stale', feature, path: runStateRelative(feature), message: 'the plan or the manifest changed since this run started; start a new run with --fresh', exitCode: 1 };
        }
      } else if (!TERMINAL_STATUSES.includes(state.status)) {
        return { ok: false, status: state.status, reason: 'run_exists', feature, path: runStateRelative(feature), decisions_pending: pendingDecisions(state, feature), resume_command: resumeCommand(feature), message: 'a run is in progress or paused — resume it, or discard it with --fresh', exitCode: 1 };
      } else {
        state = null;
      }
    } else if (fresh) {
      state = null;
    }
    if (!state) state = newRunState({ feature, plan, planDigest, manifestDigest: manifest.digest });

    const pending = pendingDecisions(state, feature);
    if (pending.length > 0) {
      state.status = 'decision_required';
      state.updated_at = nowIso();
      await atomicWrite(stateFile, state);
      return { ok: false, status: 'decision_required', reason: 'decision_pending', feature, run_id: state.run_id, path: runStateRelative(feature), decisions_pending: pending, summary: summarizeState(state, feature), exitCode: 1 };
    }

    // Pipelines persist concurrently; the state file is one document, so the
    // writes are serialized (a rename racing another rename onto the same
    // target is exactly what Windows refuses).
    let persistChain = Promise.resolve();
    const persist = () => {
      const write = persistChain.then(async () => {
        state.updated_at = nowIso();
        await atomicWrite(stateFile, state);
      });
      persistChain = write.catch(() => {});
      return write;
    };
    state.status = 'running';
    state.reason = null;
    state.spawner = spawner ? { command: spawner.command, args: spawner.args, source: spawner.source, unit_timeout_ms: unitTimeout } : null;
    await persist();
    emit({ type: 'run', status: 'started', run_id: state.run_id, waves: state.waves.length, resumed: Boolean(resume), spawner: spawner ? spawner.command : null });

    const planUnits = Object.fromEntries((plan.units || []).map((unit) => [unit.id, unit]));
    const qaProfiles = new Map();
    const qaProfileFor = async (maxFixFiles) => {
      if (!qaProfiles.has(maxFixFiles)) qaProfiles.set(maxFixFiles, await buildQaLaneProfile(projectDir, { kernelPath: qaKernelPath, maxFixFiles }));
      return qaProfiles.get(maxFixFiles);
    };

    const roleConfig = (unitState, laneId, role) => {
      const laneEntry = manifest.manifest.development_lanes.lanes[laneId];
      const planLane = plan.lanes[laneId];
      const override = unitState.override?.[role] || null;
      if (role === 'dev') {
        return {
          ...laneEntry,
          host: override?.host || laneEntry.host,
          model: override?.model || laneEntry.model,
          reasoning_effort: override ? (override.reasoning_effort || undefined) : laneEntry.reasoning_effort,
          mode: 'external',
          writable_roots: laneEntry.writable_roots || [],
          fallbacks: override ? [] : (laneEntry.fallbacks || [])
        };
      }
      const qa = laneEntry.qa || planLane.qa;
      return {
        enabled: true,
        host: override?.host || qa.host,
        model: override?.model || qa.model,
        reasoning_effort: override ? (override.reasoning_effort || undefined) : (qa.reasoning_effort || undefined),
        mode: 'external',
        writable_roots: [],
        fallbacks: override ? [] : (qa.fallbacks || []),
        write_paths: laneEntry.write_paths,
        report: qa.report
      };
    };

    const requireDecision = async (unitState, stage, outcome) => {
      unitState.pending_decision = {
        stage,
        kind: outcome.kind,
        reason: outcome.reason || (outcome.verdict ? `verdict_${String(outcome.verdict).toLowerCase()}` : 'unknown'),
        host: outcome.host || null,
        model: outcome.model || null,
        reasoning_effort: outcome.reasoning_effort || null,
        candidates: outcome.candidates || [],
        asked_at: nowIso(),
        choices: stage === 'dev' ? DEV_CHOICES : QA_CHOICES,
        on_unavailable: state.on_unavailable
      };
      unitState.status = 'decision_required';
      if (outcome.telemetry_run_id) {
        try {
          const { db } = await openRuntimeDb(projectDir);
          try {
            appendExecutionEvent(db, outcome.telemetry_run_id, {
              type: 'decision_required',
              safe_summary: `${stage}:${unitState.id} needs a decision (${unitState.pending_decision.reason})`,
              payload: { feature, run_id: state.run_id, unit: unitState.id, lane: unitState.lane, wave: unitState.wave, stage, reason: unitState.pending_decision.reason, choices: unitState.pending_decision.choices, hint: decideHint(feature, unitState.id) }
            });
          } finally {
            db.close();
          }
        } catch { /* the state file carries the decision either way */ }
      }
      emit({ type: 'decision_required', unit: unitState.id, lane: unitState.lane, wave: unitState.wave, stage, reason: unitState.pending_decision.reason, hint: decideHint(feature, unitState.id) });
      await persist();
    };

    // The scheduler sleeps until a pipeline ends or a dependency's implementer
    // passes — an `after_dev` edge releases its dependent mid-pipeline.
    let wake = null;
    let pendingWake = false;
    const wakeUp = () => {
      if (wake) {
        const resume = wake;
        wake = null;
        resume();
      } else {
        pendingWake = true;
      }
    };
    const sleep = async () => {
      if (!pendingWake) await new Promise((resolve) => { wake = resolve; });
      pendingWake = false;
    };

    // Messages are a live line each and, when malformed, one run finding per stage.
    const recordMailbox = (unitState, stage, outcome) => {
      for (const message of outcome.messages || []) {
        emit({ type: 'message', unit: unitState.id, lane: unitState.lane, wave: unitState.wave, role: stage, to: message.to, kind: message.kind, text: message.text.slice(0, 160) });
      }
      if ((outcome.messages_dropped || 0) > 0 && !state.findings.some((f) => f.check === 'mailbox_invalid' && f.unit === unitState.id && f.stage === stage)) {
        state.findings.push({ check: 'mailbox_invalid', severity: 'low', unit: unitState.id, lane: unitState.lane, wave: unitState.wave, stage, count: outcome.messages_dropped, message: `${unitState.id} (${stage}) left ${outcome.messages_dropped} malformed message(s) in messages[] — dropped; the contract is {to: lane:<id>|unit:<id>|integration|orchestrator, kind: contract_change|note|question, text}` });
      }
    };

    const runUnitPipeline = async (unitId) => {
      const unit = planUnits[unitId];
      const lane = plan.lanes[unit.lane];
      const unitState = state.units[unitId];
      const commonArgs = { projectDir, feature, runId: state.run_id, unit, lane, manifest, adapterRegistry: registry, catalogLoader, timeout: unitTimeout, signal: monitor.signal, resolverOptions, stallMs, stallCheckMs, now, emit };

      if (unitState.status === 'pending') {
        const config = roleConfig(unitState, unit.lane, 'dev');
        unitState.status = 'running';
        unitState.dev = { status: 'running', host: config.host, model: config.model, reasoning_effort: config.reasoning_effort || null, started_at: nowIso() };
        await persist();
        emit({ type: 'unit', role: 'dev', status: 'started', unit: unitId, lane: unit.lane, wave: unit.wave, host: config.host, model: config.model });
        let outcome;
        try {
          // The compiled prompt never changes (its digest is verified); what
          // earlier units left for this one enters the runtime prompt only.
          let promptText = await readPromptInside(projectDir, unit.prompt);
          const inbox = inboxFor(state, { unit: unitId, lane: unit.lane, excludeUnit: unitId });
          if (inbox.length > 0) promptText = `${promptText.trimEnd()}\n${renderMessages(INBOX_HEADING, inbox).join('\n')}\n`;
          const round = unitState.rework?.rounds || 0;
          if (round > 0) {
            const last = unitState.rework.history[unitState.rework.history.length - 1];
            promptText = `${promptText.trimEnd()}\n${renderRework(round, unitState.rework.max, last?.findings || []).join('\n')}\n`;
          }
          outcome = await executeRole({ ...commonArgs, role: 'dev', config, promptText, reportRel: roundReport(unit.report, state.run_id, round) });
        } catch (error) {
          outcome = { kind: 'crashed', reason: 'engine_error', error: error.message, host: config.host, model: config.model };
        }
        unitState.dev = { ...unitState.dev, ...outcome, status: outcome.kind, findings: outcome.findings || [], evidence: (outcome.evidence || []).slice(0, MAX_EXCERPT_ITEMS), messages: outcome.messages || [], messages_dropped: outcome.messages_dropped || 0 };
        delete unitState.dev.kind;
        recordMailbox(unitState, 'dev', outcome);
        emit({ type: 'unit', role: 'dev', status: outcome.kind, unit: unitId, lane: unit.lane, wave: unit.wave, host: outcome.host, model: outcome.model, reason: outcome.reason || null, verdict: outcome.verdict || null, findings: (outcome.findings || []).length, messages: (outcome.messages || []).length });
        if (outcome.kind === 'passed') {
          unitState.status = 'passed';
          if (unitState.qa.status !== 'skipped') unitState.qa = { status: 'pending' };
          await persist();
          wakeUp();
        } else if (outcome.kind === 'aborted') {
          unitState.status = 'pending';
          unitState.dev = { status: 'pending', aborted_reason: outcome.reason };
          await persist();
          return;
        } else {
          await requireDecision(unitState, 'dev', outcome);
          return;
        }
      }

      if (unitState.status === 'passed' && unitState.qa.status === 'pending') {
        const maxFixFiles = Number.isInteger(lane.qa?.max_fix_files) ? lane.qa.max_fix_files : 3;
        const config = roleConfig(unitState, unit.lane, 'qa');
        unitState.qa = { status: 'running', host: config.host, model: config.model, reasoning_effort: config.reasoning_effort || null, started_at: nowIso(), max_fix_files: maxFixFiles };
        await persist();
        emit({ type: 'unit', role: 'qa', status: 'started', unit: unitId, lane: unit.lane, wave: unit.wave, host: config.host, model: config.model });
        const profile = await qaProfileFor(maxFixFiles);
        const before = await gitBaseline(projectDir).catch(() => null);
        let outcome;
        try {
          const messages = { implementer: unitState.dev.messages || [], inbox: inboxFor(state, { unit: unitId, lane: unit.lane, excludeUnit: unitId }) };
          const promptText = composeQaPrompt({ profileText: profile.text, feature, unit, lane, dev: unitState.dev, maxFixFiles, messages });
          outcome = await executeRole({ ...commonArgs, role: 'qa', config, promptText, reportRel: roundReport(unit.qa_report, state.run_id, unitState.rework?.rounds || 0) });
        } catch (error) {
          outcome = { kind: 'crashed', reason: 'engine_error', error: error.message, host: config.host, model: config.model };
        }
        const after = await gitBaseline(projectDir).catch(() => null);
        const changed = diffBaselines(before, after);
        const unitFiles = new Set(unit.files.map((f) => f.toLowerCase()));
        const measuredCorrections = changed ? changed.filter((p) => unitFiles.has(p.toLowerCase())) : [];
        const declared = new Set((outcome.corrections || []).map((item) => String(item?.path || item || '').replace(/\\/g, '/').toLowerCase()));
        const undeclared = measuredCorrections.filter((p) => !declared.has(p.toLowerCase()));
        const capExceeded = measuredCorrections.length > maxFixFiles;
        const qaFindings = [...(outcome.findings || [])];
        if (capExceeded) qaFindings.push({ severity: 'high', check: 'corrections_cap_exceeded', summary: `lane review changed ${measuredCorrections.length} unit file(s); the cap is ${maxFixFiles} — review the diff before integrating`, paths: measuredCorrections });
        if (undeclared.length > 0) qaFindings.push({ severity: 'medium', check: 'undeclared_correction', summary: 'lane review changed unit files it did not list in corrections[]', paths: undeclared });
        unitState.qa = {
          ...unitState.qa,
          ...outcome,
          status: outcome.kind === 'passed' ? 'passed' : (outcome.kind === 'failed' || outcome.kind === 'blocked' ? 'failed' : outcome.kind),
          findings: qaFindings,
          evidence: (outcome.evidence || []).slice(0, MAX_EXCERPT_ITEMS),
          corrections: outcome.corrections || [],
          corrections_measured: changed !== null,
          corrections_paths: measuredCorrections,
          corrections_cap_exceeded: capExceeded,
          messages: outcome.messages || [],
          messages_dropped: outcome.messages_dropped || 0,
          profile: { source: profile.source, ok: profile.ok, digest: profile.digest }
        };
        delete unitState.qa.kind;
        recordMailbox(unitState, 'qa', outcome);
        emit({ type: 'unit', role: 'qa', status: unitState.qa.status, unit: unitId, lane: unit.lane, wave: unit.wave, host: outcome.host, model: outcome.model, reason: outcome.reason || null, verdict: outcome.verdict || null, findings: qaFindings.length, corrections: measuredCorrections.length, messages: (outcome.messages || []).length });
        if (outcome.kind === 'aborted') {
          unitState.qa = { status: 'pending', aborted_reason: outcome.reason };
          await persist();
          return;
        }
        if (['unavailable', 'timeout', 'crashed'].includes(outcome.kind)) {
          await requireDecision(unitState, 'qa', outcome);
          return;
        }
        // Bounded rework: a failed review sends the unit back to its implementer
        // with the findings, up to the lane's `qa.max_rework_rounds` (default 0).
        const maxRework = Number.isInteger(lane.qa?.max_rework_rounds) ? lane.qa.max_rework_rounds : 0;
        if (unitState.qa.status === 'failed' && maxRework > 0) {
          const round = (unitState.rework?.rounds || 0) + 1;
          if (round <= maxRework) {
            const history = [...(unitState.rework?.history || []), { round, findings: qaFindings, dev: { host: unitState.dev.host || null, model: unitState.dev.model || null, report: unitState.dev.report || null }, qa: { host: outcome.host || null, model: outcome.model || null, verdict: outcome.verdict || null, report: unitState.qa.report || null }, at: nowIso() }];
            unitState.rework = { rounds: round, max: maxRework, history };
            unitState.status = 'pending';
            unitState.dev = { status: 'pending' };
            unitState.qa = { status: 'pending' };
            emit({ type: 'unit', role: 'qa', status: 'rework', unit: unitId, lane: unit.lane, wave: unit.wave, round, max: maxRework, findings: qaFindings.length });
            await persist();
            wakeUp();
            return;
          }
          if (!state.findings.some((f) => f.check === 'rework_exhausted' && f.unit === unitId)) {
            state.findings.push({ check: 'rework_exhausted', severity: 'high', unit: unitId, lane: unit.lane, wave: unit.wave, rounds: maxRework, message: `${unitId}: the lane review still fails after ${maxRework} rework round(s) — the integration owner resolves the remaining findings` });
          }
        }
        await persist();
      }
    };

    // ─── readiness scheduler ───
    // The graph's passage rules decide who starts: a unit with explicit edges
    // waits for exactly those (after_dev: the dependency's implementer passed;
    // after_qa: its lane review finished — or the unit was skipped by
    // decision); a unit without edges waits for the wave barrier. The pool
    // is bounded by max_concurrent_lanes; `--wave=N` never launches beyond N.
    const waveLimit = stopAfterWave === null ? null : Number(stopAfterWave);
    const laneIds = (plan.units || [])
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit }) => unit.owner === 'lane')
      .sort((a, b) => (a.unit.wave - b.unit.wave) || (a.index - b.index))
      .map(({ unit }) => unit.id);
    const devDone = (u) => u.status === 'skipped' || u.status === 'passed';
    const pipelineDone = (u) => u.status === 'skipped' || (u.status === 'passed' && ['passed', 'failed', 'skipped'].includes(u.qa?.status));
    const runnable = (id) => {
      const u = state.units[id];
      return u.status === 'pending' || (u.status === 'passed' && u.qa?.status === 'pending');
    };
    const laneUnitsBefore = (wave) => laneIds.filter((id) => state.units[id].wave < wave);
    const gateSatisfied = (dep) => {
      const target = state.units[dep.unit];
      if (!target || target.owner !== 'lane') return true;
      return dep.gate === 'after_dev' ? devDone(target) : pipelineDone(target);
    };
    const isReady = (id) => {
      if (!runnable(id)) return false;
      const u = state.units[id];
      if (waveLimit !== null && u.wave > waveLimit) return false;
      const deps = planUnits[id].depends_on || [];
      if (deps.length > 0) return deps.every(gateSatisfied);
      return laneUnitsBefore(u.wave).every((other) => pipelineDone(state.units[other]));
    };
    const refreshWaves = () => {
      for (const wave of state.waves) {
        const members = wave.units.filter((id) => state.units[id]?.owner === 'lane').map((id) => state.units[id]);
        if (members.length === 0) {
          const reached = laneUnitsBefore(wave.wave).every((id) => pipelineDone(state.units[id])) && (waveLimit === null || wave.wave <= waveLimit);
          if (reached) wave.status = 'integration';
          else if (wave.status !== 'integration') wave.status = 'pending';
          continue;
        }
        if (members.some((u) => u.status === 'decision_required')) wave.status = 'decision_required';
        else if (members.every(pipelineDone)) wave.status = 'completed';
        else if (members.some((u) => u.status === 'running' || u.qa?.status === 'running' || devDone(u))) wave.status = 'running';
        else wave.status = 'pending';
      }
      const open = laneIds.filter((id) => !pipelineDone(state.units[id]));
      state.current_wave = open.length > 0 ? Math.min(...open.map((id) => state.units[id].wave)) : (laneIds.length > 0 ? Math.max(...laneIds.map((id) => state.units[id].wave)) : null);
    };

    // Scope is measured per unit window (start → end of its pipeline): a
    // changed file must belong to a unit active somewhere in that window.
    let seq = 0;
    const windows = new Map();
    const intervals = [];
    const SCOPE_CHECKS = ['lane_scope_drift', 'unowned_change'];
    const settleWindow = async (unitId) => {
      const win = windows.get(unitId);
      windows.delete(unitId);
      if (!win) return;
      win.end = ++seq;
      intervals.push({ unit: unitId, start: win.start, end: win.end });
      const after = await gitBaseline(projectDir).catch(() => null);
      const overlapping = new Set([unitId]);
      for (const other of intervals) if (other.start < win.end && other.end > win.start) overlapping.add(other.unit);
      for (const [other, live] of windows) if (live.start < win.end) overlapping.add(other);
      const unit = planUnits[unitId];
      const scope = measureWindowScope({ before: win.before, after, plan, wave: unit.wave, unit: unitId, units: [...overlapping].map((id) => planUnits[id]) });
      state.scope.measured = state.scope.measured === false ? false : scope.measured;
      const waveScope = state.scope.waves[unit.wave] || { measured: scope.measured, changed: [], findings: [] };
      waveScope.measured = waveScope.measured && scope.measured;
      waveScope.changed = [...new Set([...waveScope.changed, ...scope.changed])];
      state.scope.waves[unit.wave] = waveScope;
      for (const finding of scope.findings) {
        if (state.findings.some((f) => SCOPE_CHECKS.includes(f.check) && f.check === finding.check && f.path === finding.path)) continue;
        state.findings.push(finding);
        waveScope.findings.push(finding.check);
        emit({ type: 'scope', wave: unit.wave, unit: unitId, check: finding.check, path: finding.path, lane: finding.lane || null });
      }
    };

    const running = new Map();
    const startedWaves = new Set();
    const completedWaves = new Set();
    const launch = async (unitId) => {
      const unit = planUnits[unitId];
      const wave = state.waves.find((w) => w.wave === unit.wave);
      if (!startedWaves.has(unit.wave)) {
        startedWaves.add(unit.wave);
        if (wave) wave.status = 'running';
        state.current_wave = unit.wave;
        await persist();
        emit({ type: 'wave', status: 'started', wave: unit.wave, units: wave ? wave.units.filter((id) => state.units[id]?.owner === 'lane' && runnable(id)) : [unitId] });
      }
      const before = await gitBaseline(projectDir).catch(() => null);
      windows.set(unitId, { start: ++seq, end: null, before });
      running.set(unitId, runUnitPipeline(unitId).catch(() => {}).then(() => {
        finished.push(unitId);
        wakeUp();
      }));
    };
    const finished = [];

    while (true) {
      if (!monitor.lost) {
        while (running.size < state.parallel.max_concurrent_lanes) {
          const next = laneIds.find((id) => !running.has(id) && isReady(id));
          if (!next) break;
          await launch(next);
        }
      }
      if (running.size === 0) break;
      await sleep();
      while (finished.length > 0) {
        const id = finished.shift();
        running.delete(id);
        await settleWindow(id);
      }
      refreshWaves();
      for (const wave of state.waves) {
        if (wave.status === 'completed' && !completedWaves.has(wave.wave)) {
          completedWaves.add(wave.wave);
          await persist();
          emit({ type: 'wave', status: 'completed', wave: wave.wave });
        }
      }
      await persist();
    }
    refreshWaves();

    if (monitor.lost) {
      for (const wave of state.waves) if (wave.status === 'running') wave.status = 'paused';
      state.status = 'paused';
      state.reason = 'lease_lost';
      await persist();
      return { ok: false, status: 'paused', reason: 'lease_lost', feature, run_id: state.run_id, path: runStateRelative(feature), resume_command: resumeCommand(feature), summary: summarizeState(state, feature), exitCode: 1 };
    }
    const decisions = pendingDecisions(state, feature);
    if (decisions.length > 0) {
      state.status = 'decision_required';
      state.reason = 'decision_pending';
      await persist();
      for (const wave of state.waves) {
        if (wave.status === 'decision_required') emit({ type: 'wave', status: 'decision_required', wave: wave.wave, decisions: decisions.filter((d) => d.wave === wave.wave).map((d) => d.unit) });
      }
      return { ok: false, status: 'decision_required', reason: 'decision_pending', feature, run_id: state.run_id, path: runStateRelative(feature), decisions_pending: decisions, resume_command: resumeCommand(feature), summary: summarizeState(state, feature), findings: state.findings, exitCode: 1 };
    }
    if (waveLimit !== null && state.waves.some((wave) => wave.wave > waveLimit)) {
      // `--wave=N` stops after wave N even when what follows is integration-only.
      state.status = 'paused';
      state.reason = 'stop_after_wave';
      await persist();
      return { ok: true, status: 'paused', reason: 'stop_after_wave', feature, run_id: state.run_id, path: runStateRelative(feature), resume_command: resumeCommand(feature), summary: summarizeState(state, feature), findings: state.findings, exitCode: 0 };
    }
    const remaining = laneIds.filter(runnable);
    if (remaining.length > 0) {
      // Acyclic edges over lane units always drain; this only fires on a plan the compile did not see.
      state.status = 'paused';
      state.reason = 'units_blocked';
      await persist();
      return { ok: false, status: 'paused', reason: 'units_blocked', feature, run_id: state.run_id, path: runStateRelative(feature), blocked_units: remaining, resume_command: resumeCommand(feature), summary: summarizeState(state, feature), findings: state.findings, exitCode: 1 };
    }

    // A question nobody could answer mid-run is the integration owner's, as a finding — never a block.
    for (const message of collectMailbox(state)) {
      if (message.kind !== 'question') continue;
      if (state.findings.some((f) => f.check === 'unanswered_question' && f.unit === message.from && f.stage === message.stage && f.text === message.text)) continue;
      state.findings.push({ check: 'unanswered_question', severity: 'medium', unit: message.from, lane: message.lane, wave: message.wave, stage: message.stage, to: message.to, text: message.text, paths: message.paths, message: `${message.from} (${message.stage}) asked ${message.to}: ${message.text} — the process that asked is gone; the integration owner answers` });
    }
    state.status = 'completed';
    state.reason = null;
    state.finished_at = nowIso();
    state.integration.status = state.integration.units.length > 0 ? 'pending' : 'none';
    await persist();
    emit({ type: 'run', status: 'completed', run_id: state.run_id, integration_units: state.integration.units });
    return {
      ok: true,
      status: 'completed',
      reason: null,
      feature,
      run_id: state.run_id,
      path: runStateRelative(feature),
      summary: summarizeState(state, feature),
      findings: state.findings,
      integration: state.integration,
      reports: Object.values(state.units).filter((u) => u.owner === 'lane').map((u) => ({ unit: u.id, dev: u.dev?.report || null, qa: u.qa?.report || null })),
      exitCode: 0
    };
  } finally {
    await monitor.stop();
    await releaseLease(lease);
  }
}

// ─── decide ───

function parseChoice(choice) {
  const value = String(choice || '').trim();
  if (['retry', 'skip', 'skip-qa', 'abort'].includes(value)) return { ok: true, choice: value };
  const match = value.match(/^fallback:([a-z0-9-]+)\/(.+?)(?:\/(low|medium|high|xhigh|max|ultra))?$/i);
  if (match) return { ok: true, choice: 'fallback', host: match[1].toLowerCase(), model: match[2], reasoning_effort: match[3] ? match[3].toLowerCase() : null };
  return { ok: false, reason: 'invalid_choice', valid: ['retry', 'fallback:<host>/<model>[/<effort>]', 'skip', 'skip-qa', 'abort'] };
}

async function decideExecution({ projectDir, feature: featureInput, unit: unitId, choice, env = process.env, now = () => Date.now() }) {
  const feature = assertFeatureSlug(featureInput);
  const stateFile = runStatePath(projectDir, feature);
  const state = await readJsonSafe(stateFile);
  if (!state) return { ok: false, reason: 'run_state_missing', feature, message: `${runStateRelative(feature)} not found — nothing to decide` };
  if (TERMINAL_STATUSES.includes(state.status)) return { ok: false, reason: 'run_terminal', feature, status: state.status };
  const unitState = state.units?.[String(unitId || '').trim()];
  if (!unitState) return { ok: false, reason: 'unit_unknown', feature, unit: unitId, units: Object.keys(state.units || {}) };

  // Decisions apply between runs only: the feature lease is the run's.
  const lease = await acquireLease(projectDir, feature);
  if (!lease) return { ok: false, reason: 'run_active', feature, unit: unitState.id, message: 'a run is active on this feature; decisions apply between runs' };
  try {
    if (!unitState.pending_decision) return { ok: false, reason: 'no_decision_pending', feature, unit: unitState.id, status: unitState.status };
    const parsed = parseChoice(choice);
    if (!parsed.ok) return { ok: false, reason: parsed.reason, feature, unit: unitState.id, valid: parsed.valid };
    const stage = unitState.pending_decision.stage;
    if (parsed.choice === 'skip-qa' && stage !== 'qa') return { ok: false, reason: 'invalid_choice', feature, unit: unitState.id, message: 'skip-qa applies to a qa decision only', valid: DEV_CHOICES };
    if (parsed.choice === 'skip' && stage !== 'dev') return { ok: false, reason: 'invalid_choice', feature, unit: unitState.id, message: 'skip applies to a dev decision; use skip-qa for the review', valid: QA_CHOICES };

    if (parsed.choice === 'fallback') {
      const caps = getExecutionCapabilities(parsed.host);
      if (!caps) return { ok: false, reason: 'unknown_host', feature, unit: unitState.id, host: parsed.host };
      if (parsed.reasoning_effort && !caps.reasoning_effort) return { ok: false, reason: 'effort_unsupported_by_host', feature, unit: unitState.id, host: parsed.host };
      if (parsed.reasoning_effort && !REASONING_EFFORTS.includes(parsed.reasoning_effort)) return { ok: false, reason: 'invalid_reasoning_effort', feature, unit: unitState.id };
      const store = await readSignatures({ env });
      const sig = signatureState(findSignature(store, { host: parsed.host, model: parsed.model, reasoning_effort: parsed.reasoning_effort }), now());
      if (sig !== 'valid') {
        return { ok: false, reason: `fallback_signature_${sig}`, feature, unit: unitState.id, host: parsed.host, model: parsed.model, hint: `aioson host:signature . --host=${parsed.host} --model=${parsed.model}${parsed.reasoning_effort ? ` --effort=${parsed.reasoning_effort}` : ''}` };
      }
      unitState.override = { ...(unitState.override || {}), [stage]: { host: parsed.host, model: parsed.model, reasoning_effort: parsed.reasoning_effort } };
    }
    const previous = unitState.pending_decision;
    const decision = { unit: unitState.id, stage, choice: String(choice).trim(), reason_before: previous.reason, at: nowIso() };
    state.decisions.push(decision);
    unitState.pending_decision = null;
    if (parsed.choice === 'abort') {
      state.status = 'cancelled';
      state.reason = `aborted_at_${unitState.id}`;
      state.finished_at = nowIso();
      unitState.status = stage === 'dev' ? 'cancelled' : unitState.status;
    } else if (stage === 'dev') {
      if (parsed.choice === 'skip') {
        unitState.status = 'skipped';
        unitState.qa = { status: 'skipped' };
        state.findings.push({ check: 'unit_skipped', wave: unitState.wave, lane: unitState.lane, unit: unitState.id, message: `unit ${unitState.id} was skipped by decision after ${previous.reason} — the integration owner (dev) implements it` });
      } else {
        unitState.status = 'pending';
        unitState.dev = { status: 'pending', previous: { reason: previous.reason, host: previous.host, model: previous.model } };
        unitState.qa = { status: 'pending' };
      }
      state.status = 'paused';
      state.reason = 'decision_applied';
    } else {
      if (parsed.choice === 'skip-qa') {
        unitState.qa = { ...unitState.qa, status: 'skipped', skipped_reason: previous.reason };
        state.findings.push({ check: 'qa_skipped', wave: unitState.wave, lane: unitState.lane, unit: unitState.id, message: `lane review of ${unitState.id} was skipped by decision after ${previous.reason} — the session QA covers it` });
      } else {
        unitState.qa = { status: 'pending', previous: { reason: previous.reason, host: previous.host, model: previous.model } };
      }
      unitState.status = 'passed';
      state.status = 'paused';
      state.reason = 'decision_applied';
    }
    state.updated_at = nowIso();
    await atomicWrite(stateFile, state);
    const telemetryRunId = stage === 'dev' ? unitState.dev?.telemetry_run_id : unitState.qa?.telemetry_run_id;
    const eventRunId = telemetryRunId || previous.telemetry_run_id || null;
    if (eventRunId) {
      try {
        const { db } = await openRuntimeDb(projectDir);
        try {
          appendExecutionEvent(db, eventRunId, { type: 'decision_applied', safe_summary: `${stage}:${unitState.id} ← ${decision.choice}`, payload: { feature, run_id: state.run_id, unit: unitState.id, stage, choice: decision.choice } });
        } finally {
          db.close();
        }
      } catch { /* best-effort */ }
    }
    return {
      ok: true,
      feature,
      unit: unitState.id,
      stage,
      choice: decision.choice,
      status: state.status,
      unit_status: unitState.status,
      qa_status: unitState.qa?.status || null,
      override: unitState.override?.[stage] || null,
      decisions_pending: pendingDecisions(state, feature),
      resume_command: state.status === 'cancelled' ? null : resumeCommand(feature),
      exitCode: 0
    };
  } finally {
    await releaseLease(lease);
  }
}

// ─── status ───

async function statusExecution({ projectDir, feature: featureInput }) {
  const feature = assertFeatureSlug(featureInput);
  const state = await readJsonSafe(runStatePath(projectDir, feature));
  const read = await readExecutionPlan(projectDir, feature);
  if (!state) {
    return { ok: true, feature, run: null, compiled: read.exists, path: runStateRelative(feature), message: read.exists ? 'compiled, not started' : 'no execution plan compiled', exitCode: 0 };
  }
  const unitRows = Object.values(state.units).map((unit) => ({
    id: unit.id,
    lane: unit.lane,
    wave: unit.wave,
    owner: unit.owner,
    status: unit.status,
    dev: unit.dev ? { status: unit.dev.status, host: unit.dev.host || null, model: unit.dev.model || null, verdict: unit.dev.verdict || null, reason: unit.dev.reason || null, report: unit.dev.report || null, findings: (unit.dev.findings || []).length, stalled: Boolean(unit.dev.stalled), session_id: unit.dev.session_id || null } : null,
    qa: unit.qa ? { status: unit.qa.status, host: unit.qa.host || null, model: unit.qa.model || null, verdict: unit.qa.verdict || null, reason: unit.qa.reason || null, report: unit.qa.report || null, findings: (unit.qa.findings || []).length, corrections: (unit.qa.corrections_paths || []).length, corrections_cap_exceeded: Boolean(unit.qa.corrections_cap_exceeded), session_id: unit.qa.session_id || null } : null,
    pending_decision: unit.pending_decision ? { stage: unit.pending_decision.stage, reason: unit.pending_decision.reason, choices: unit.pending_decision.choices } : null,
    rework: unit.rework ? { rounds: unit.rework.rounds, max: unit.rework.max } : null
  }));
  const findings = [
    ...state.findings.map((f) => ({ source: 'run', ...f })),
    ...Object.values(state.units).flatMap((unit) => [
      ...((unit.dev?.findings) || []).map((f) => ({ source: 'dev', unit: unit.id, lane: unit.lane, ...(typeof f === 'object' && f ? f : { summary: String(f) }) })),
      ...((unit.qa?.findings) || []).map((f) => ({ source: 'qa', unit: unit.id, lane: unit.lane, ...(typeof f === 'object' && f ? f : { summary: String(f) }) }))
    ])
  ];
  return {
    ok: true,
    feature,
    path: runStateRelative(feature),
    compiled: read.exists,
    run: summarizeState(state, feature),
    spawner: state.spawner || null,
    waves: state.waves.map((wave) => ({ ...wave, units: wave.units.map((id) => unitRows.find((row) => row.id === id) || { id }) })),
    units: unitRows,
    decisions: state.decisions,
    decisions_pending: pendingDecisions(state, feature),
    findings,
    mailbox: collectMailbox(state),
    scope: state.scope,
    integration: state.integration,
    resume_command: TERMINAL_STATUSES.includes(state.status) ? null : resumeCommand(feature),
    exitCode: 0
  };
}

module.exports = {
  DEFAULT_ADAPTERS,
  DEV_CHOICES,
  QA_CHOICES,
  RUN_STATE_VERSION,
  TERMINAL_STATUSES,
  collectMailbox,
  composeQaPrompt,
  decideExecution,
  diffBaselines,
  executeRole,
  measureWindowScope,
  newestMtime,
  normalizeMessages,
  parseChoice,
  preflightExecution,
  runExecution,
  runStatePath,
  runStateRelative,
  statusExecution,
  summarizeState
};
