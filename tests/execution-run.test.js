'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const { runExecution: runCommand } = require('../src/commands/execution');
const { runStatePath, parseChoice, composeQaPrompt } = require('../src/agent-execution/execution-run');
const { signatureKey, writeSignatures } = require('../src/lib/host-signature');
const { acquireLease, releaseLease } = require('../src/agent-execution/dispatcher');
const { openRuntimeDb, getExecutionSnapshot, listExecutionEvents } = require('../src/runtime-store');
const { buildQaLaneProfile } = require('../src/agent-execution/qa-lane-profile');

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'aioson.js');
const logger = { log() {}, error() {}, warn() {} };
const SLUG = 'orders';

const PLAN = [
  '---',
  'feature: orders',
  'status: approved',
  '---',
  '# Implementation Plan — orders',
  '',
  '## Capability Delivery Plan',
  '| CAP | Phase | Files | Verification |',
  '|---|---|---|---|',
  '| CAP-orders-api | 1 | src/api/orders.ts, tests/api/orders.test.ts | npm test -- orders.api |',
  '| CAP-orders-ui | 2 | src/ui/Orders.tsx, tests/ui/Orders.test.tsx | npm test -- orders.ui |',
  '| CAP-orders-wire | 3 | src/app.ts | npm test -- app |',
  '',
  '## Development execution lanes',
  '| Lane | Host | Model | Exact write paths | Integration owner |',
  '|---|---|---|---|---|',
  '| backend | codex | gpt-5.6 | src/api/**, tests/api/** | dev |',
  '| frontend | kimi | kimi-k3 | src/ui/**, tests/ui/** | dev |',
  '',
  '## Execution Sequence',
  '| Phase | Wave | Files | Scope | Done when |',
  '|---|---|---|---|---|',
  '| 1 | 1 | src/api/orders.ts, tests/api/orders.test.ts | CAP-orders-api | npm test -- orders.api passes |',
  '| 2 | 1 | src/ui/Orders.tsx, tests/ui/Orders.test.tsx | CAP-orders-ui | npm test -- orders.ui passes |',
  '| 3 | 2 | src/app.ts | CAP-orders-wire | npm test -- app passes |',
  ''
].join('\n');

const PRD = [
  '# Orders',
  '',
  '## Acceptance Criteria',
  '| AC | CAP | Observable behavior | Evidence |',
  '|---|---|---|---|',
  '| AC-orders-01 | CAP-orders-api | POST /orders creates an order | api test |',
  '| AC-orders-02 | CAP-orders-ui | Orders screen lists orders | ui test |',
  '| AC-orders-03 | CAP-orders-wire | The screen shows API orders | e2e |',
  ''
].join('\n');

const ROLES = {
  version: 1,
  source: 'test-client',
  enabled: true,
  roles: {
    backend_dev: { host: 'codex', model: 'gpt-5.6', reasoning_effort: 'high' },
    frontend_dev: { host: 'kimi', model: 'kimi-k3', reasoning_effort: null },
    qa: { host: 'claude', model: 'claude-sonnet-5' }
  },
  parallel: { max_concurrent_lanes: 2 },
  on_unavailable: 'ask'
};

function signed(host, model, effort) {
  return { host, model, reasoning_effort: effort, status: 'valid', reason: null, checked_at: '2026-08-25T10:00:00.000Z', expires_at: '2999-01-01T00:00:00.000Z' };
}

const ALL_SIGNED = {
  [signatureKey('codex', 'gpt-5.6', 'high')]: signed('codex', 'gpt-5.6', 'high'),
  [signatureKey('kimi', 'kimi-k3', null)]: signed('kimi', 'kimi-k3', null),
  [signatureKey('claude', 'claude-sonnet-5', null)]: signed('claude', 'claude-sonnet-5', null)
};

const catalogLoader = async () => ({
  available: true,
  source: 'fixture',
  fetched_at: '2026-08-25',
  models: [{ slug: 'gpt-5.6', display_name: 'GPT-5.6', supported_efforts: ['medium', 'high'] }]
});

/**
 * A fake host adapter: parses the execution contract the engine appends,
 * optionally mutates project files (an implementation, a review fix), writes
 * the bound JSON report and returns. `script` keys are `role:unit`.
 */
function fakeAdapter(host, { script = {}, delayMs = 25, log = [] } = {}) {
  let active = 0;
  return {
    host,
    log,
    build: () => ({ ok: true }),
    async execute(input) {
      const marker = 'AIOSON EXECUTION CONTRACT';
      const contract = input.prompt_text.slice(input.prompt_text.indexOf(marker));
      const get = (name) => contract.match(new RegExp(`${name}=([^,\\n]+)`))?.[1].trim();
      const reportRel = contract.match(/report to: ([^\n]+)/)?.[1].trim();
      const role = get('agent');
      const unit = (input.prompt_text.match(/# Unit (?:contract|under review) — [a-z0-9-]+ \/ ([a-z0-9-]+)/) || [])[1];
      const key = `${role}:${unit}`;
      const behaviour = typeof script[key] === 'function' ? script[key](input) : (script[key] || {});
      active += 1;
      const entry = { key, host, model: input.model, effort: input.reasoning_effort ?? null, sandbox: input.sandbox_mode, start: Date.now(), active_at_start: active };
      log.push(entry);
      input.onStdout?.(`${key} working on ${host}\n`);
      await new Promise((resolve) => setTimeout(resolve, behaviour.delay_ms ?? delayMs));
      if (behaviour.silence_ms) await new Promise((resolve) => setTimeout(resolve, behaviour.silence_ms));
      for (const rel of behaviour.touch || []) {
        const file = path.join(input.cwd, ...rel.split('/'));
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.appendFile(file, `// ${key} ${crypto.randomUUID()}\n`, 'utf8');
      }
      entry.end = Date.now();
      active -= 1;
      if (behaviour.fail) return { ok: false, reason: behaviour.fail, error: `simulated ${behaviour.fail}` };
      if (behaviour.no_report) return { ok: true, code: 0 };
      const report = {
        version: 1,
        feature: get('feature'),
        run_id: get('run_id'),
        attempt_id: get('attempt_id'),
        agent: role,
        host: get('host'),
        model_requested: get('model_requested'),
        model_resolved: get('model_resolved'),
        model_resolution_strategy: get('model_resolution_strategy'),
        manifest_digest: get('manifest_digest'),
        writable_roots: JSON.parse(contract.match(/writable_roots=(\[[^\n]*\]), started_at/)?.[1] || '[]'),
        lane: get('lane'),
        write_paths: JSON.parse(contract.match(/write_paths=(\[[^\n]*?\])\./)?.[1] || '[]'),
        started_at: '2026-08-25T10:00:00.000Z',
        finished_at: '2026-08-25T10:01:00.000Z',
        verdict: behaviour.verdict || 'PASS',
        findings: behaviour.findings || [],
        evidence: behaviour.evidence || [`${key} verified`],
        ...(behaviour.corrections ? { corrections: behaviour.corrections } : {})
      };
      const effort = get('reasoning_effort');
      if (effort && effort !== 'null') report.reasoning_effort = effort;
      const reportFile = path.resolve(input.cwd, reportRel);
      await fs.mkdir(path.dirname(reportFile), { recursive: true });
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf8');
      return { ok: true, code: 0 };
    }
  };
}

/** Deterministic worktree snapshot without git: hashes of every file under src/ and tests/. */
async function fakeBaseline(dir) {
  const paths = [];
  const hashes = {};
  const walk = async (rel) => {
    let entries;
    try {
      entries = await fs.readdir(path.join(dir, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(childRel);
      else {
        paths.push(childRel);
        hashes[childRel] = crypto.createHash('sha256').update(await fs.readFile(path.join(dir, childRel))).digest('hex');
      }
    }
  };
  await walk('src');
  await walk('tests');
  return { ok: true, baseline: { captured_at: new Date().toISOString(), head: 'fake', dirty_paths: paths.sort(), dirty_hashes: hashes } };
}

async function setup(t, { roles = ROLES, signatures = ALL_SIGNED, bins = ['codex', 'kimi', 'claude', 'qwen'] } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-execution-run-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  for (const rel of ['.aioson/context', '.aioson/config', '.aioson/agents', 'src/api', 'src/ui', 'tests/api', 'tests/ui']) {
    await fs.mkdir(path.join(dir, ...rel.split('/')), { recursive: true });
  }
  await fs.writeFile(path.join(dir, '.aioson', 'context', `implementation-plan-${SLUG}.md`), PLAN, 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'context', `prd-${SLUG}.md`), PRD, 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'config', 'execution-roles.json'), JSON.stringify(roles, null, 2), 'utf8');
  await fs.copyFile(path.join(ROOT, 'template', '.aioson', 'agents', 'dev.md'), path.join(dir, '.aioson', 'agents', 'dev.md'));
  await fs.copyFile(path.join(ROOT, 'template', '.aioson', 'agents', 'qa.md'), path.join(dir, '.aioson', 'agents', 'qa.md'));
  await fs.writeFile(path.join(dir, 'src', 'app.ts'), 'export const app = 1;\n', 'utf8');
  const binDir = path.join(dir, 'fake-bin');
  await fs.mkdir(binDir, { recursive: true });
  for (const bin of bins) await fs.writeFile(path.join(binDir, `${bin}.exe`), '', 'utf8');
  const env = { ...process.env, AIOSON_HOST_SIGNATURES: path.join(dir, 'signatures.json') };
  delete env.AIOSON_PLAY;
  if (signatures) await writeSignatures({ signatures }, { env });
  const resolverOptions = { env: { PATH: binDir, Path: binDir }, platform: 'win32' };
  const compiled = await runCommand({ args: [dir], options: { sub: 'compile', feature: SLUG, json: true }, logger, env });
  assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
  return { dir, env, binDir, resolverOptions };
}

function adapters(script = {}, opts = {}) {
  const log = [];
  return {
    log,
    registry: {
      codex: fakeAdapter('codex', { script, log, ...opts }),
      kimi: fakeAdapter('kimi', { script, log, ...opts }),
      claude: fakeAdapter('claude', { script, log, ...opts }),
      qwen: fakeAdapter('qwen', { script, log, ...opts })
    }
  };
}

function run(ctx, { registry, events = [], extra = {}, engine = {} } = {}) {
  return runCommand({
    args: [ctx.dir],
    options: { sub: 'run', feature: SLUG, json: true, ...extra },
    logger,
    env: ctx.env,
    engineOptions: {
      adapterRegistry: registry,
      catalogLoader,
      resolverOptions: ctx.resolverOptions,
      gitBaseline: fakeBaseline,
      progress: (event) => events.push(event),
      stallMs: 60000,
      stallCheckMs: 30000,
      ...engine
    }
  });
}

function decide(ctx, unit, choice) {
  return runCommand({ args: [ctx.dir], options: { sub: 'decide', feature: SLUG, unit, choice, json: true }, logger, env: ctx.env });
}

function status(ctx) {
  return runCommand({ args: [ctx.dir], options: { sub: 'status', feature: SLUG, json: true }, logger, env: ctx.env });
}

async function readState(ctx) {
  return JSON.parse(await fs.readFile(runStatePath(ctx.dir, SLUG), 'utf8'));
}

// ───────────────────────── preflight ─────────────────────────

test('execution:run --preflight is deterministic: compiled plan fresh, manifest valid, every role host on PATH', async (t) => {
  const ctx = await setup(t);
  let result = await run(ctx, { registry: adapters().registry, extra: { preflight: true } });
  assert.equal(result.ok, true, JSON.stringify(result.preflight));
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.preflight.checks.map((c) => c.id), ['plan', 'manifest', 'host:claude', 'host:codex', 'host:kimi', 'units']);
  assert.equal(result.plan.processes, 4);

  await fs.rm(path.join(ctx.binDir, 'kimi.exe'));
  result = await run(ctx, { registry: adapters().registry, extra: { preflight: true } });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'preflight_failed');
  assert.match(result.preflight.issues.join('\n'), /host:kimi: executable_not_found/);
  assert.match(result.preflight.issues.join('\n'), /install: npm install -g @moonshot-ai\/kimi-code/);
  await fs.writeFile(path.join(ctx.binDir, 'kimi.exe'), '');

  await fs.appendFile(path.join(ctx.dir, '.aioson', 'context', `implementation-plan-${SLUG}.md`), '\nedited after compile\n');
  result = await run(ctx, { registry: adapters().registry });
  assert.equal(result.reason, 'preflight_failed');
  assert.match(result.preflight.issues.join('\n'), /plan: plan_digest_stale/);
  assert.equal(await fs.access(runStatePath(ctx.dir, SLUG)).then(() => true).catch(() => false), false, 'a refused preflight writes no run state');
});

// ───────────────────────── the happy path ─────────────────────────

test('execution:run — lane units of a wave run concurrently as dev→qa pipelines under the concurrency cap; integration units stay with the session DEV; reports, telemetry, ledger and live events all exist', async (t) => {
  const ctx = await setup(t);
  const fakes = adapters({}, { delayMs: 60 });
  const events = [];
  const result = await run(ctx, { registry: fakes.registry, events });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'completed');
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.summary.units, { total: 3, lane: 2, integration: 1, passed: 2, pending: 0, running: 0, skipped: 0, decision_required: 0, qa_passed: 2, qa_failed: 0, qa_skipped: 0 });
  assert.deepEqual(result.integration, { owner: 'dev', units: ['phase-3'], role: null, status: 'pending' });
  assert.deepEqual(result.reports.map((r) => r.unit), ['phase-1', 'phase-2']);

  // Concurrency: both dev units of wave 1 overlapped (cap 2), and no more than 2 pipelines ran at once.
  const devs = fakes.log.filter((e) => e.key.startsWith('dev:'));
  assert.equal(devs.length, 2);
  const [a, b] = devs;
  assert.ok(a.start < b.end && b.start < a.end, 'the two wave-1 dev units ran in parallel');
  assert.ok(fakes.log.every((e) => e.active_at_start <= 2), 'never more pipelines than max_concurrent_lanes');
  assert.ok(fakes.log.every((e) => e.sandbox === 'workspace-write'), 'lane workers run with write permission');
  const backendDev = fakes.log.find((e) => e.key === 'dev:phase-1');
  assert.equal(backendDev.host, 'codex');
  assert.equal(backendDev.model, 'gpt-5.6');
  assert.equal(backendDev.effort, 'high');
  const frontendDev = fakes.log.find((e) => e.key === 'dev:phase-2');
  assert.equal(frontendDev.host, 'kimi');
  assert.equal(frontendDev.model, 'kimi-k3');
  assert.equal(frontendDev.effort, null);
  const qaRuns = fakes.log.filter((e) => e.key.startsWith('qa:'));
  assert.equal(qaRuns.length, 2);
  assert.ok(qaRuns.every((e) => e.host === 'claude' && e.model === 'claude-sonnet-5'), 'the shared qa role reviews both lanes');
  const devEnd = fakes.log.find((e) => e.key === 'dev:phase-1').end;
  assert.ok(fakes.log.find((e) => e.key === 'qa:phase-1').start >= devEnd, 'qa of a unit starts after its dev');

  // Reports at the contract paths, run-scoped.
  const state = await readState(ctx);
  assert.equal(state.status, 'completed');
  assert.equal(state.run_id, result.run_id);
  for (const unit of ['phase-1', 'phase-2']) {
    const dev = JSON.parse(await fs.readFile(path.join(ctx.dir, '.aioson', 'context', 'reports', SLUG, state.run_id, `${unit}.json`), 'utf8'));
    assert.equal(dev.agent, 'dev');
    assert.equal(dev.verdict, 'PASS');
    const qa = JSON.parse(await fs.readFile(path.join(ctx.dir, '.aioson', 'context', 'reports', SLUG, state.run_id, `${unit}-qa.json`), 'utf8'));
    assert.equal(qa.agent, 'qa');
    assert.equal(state.units[unit].dev.report, `.aioson/context/reports/${SLUG}/${state.run_id}/${unit}.json`, 'the state records the resolved report path');
    assert.equal(state.units[unit].qa.status, 'passed');
    assert.equal(state.units[unit].qa.corrections_measured, true);
    assert.deepEqual(state.units[unit].qa.corrections_paths, []);
  }
  assert.equal(state.units['phase-3'].status, 'integration');
  assert.deepEqual(state.waves.map((w) => [w.wave, w.status]), [[1, 'completed'], [2, 'integration']]);
  assert.equal(state.scope.measured, true);

  // Telemetry: one execution run per role × unit, with progress events, in the database the client already polls.
  const { db } = await openRuntimeDb(ctx.dir);
  try {
    const runs = getExecutionSnapshot(db, { feature: SLUG, limit: 50 });
    assert.deepEqual(runs.map((r) => r.agent).sort(), ['dev:phase-1', 'dev:phase-2', 'qa:phase-1', 'qa:phase-2']);
    assert.ok(runs.every((r) => r.state === 'passed' && r.dispatcher_run_id === state.run_id));
    const devRun = runs.find((r) => r.agent === 'dev:phase-1');
    const types = listExecutionEvents(db, devRun.telemetry_run_id, { limit: 100 }).events.map((e) => e.event_type);
    assert.ok(types.includes('progress'));
    assert.ok(types.includes('report_attached'));
    assert.ok(types.includes('output'));
  } finally {
    db.close();
  }

  // Live events: the channel that does not depend on the host streaming.
  const kinds = events.map((e) => `${e.type}:${e.status || e.check || ''}`);
  assert.equal(kinds[0], 'run:started');
  assert.ok(kinds.includes('wave:started'));
  assert.ok(kinds.includes('unit:started'));
  assert.ok(kinds.includes('unit:passed'));
  assert.ok(kinds.includes('wave:completed'));
  assert.equal(kinds.at(-1), 'run:completed');
  assert.ok(events.filter((e) => e.type === 'unit' && e.role === 'qa' && e.status === 'passed').length === 2);

  // The ledger.
  const ledger = await status(ctx);
  assert.equal(ledger.run.status, 'completed');
  assert.equal(ledger.units.find((u) => u.id === 'phase-1').qa.status, 'passed');
  assert.equal(ledger.units.find((u) => u.id === 'phase-3').owner, 'integration');
  assert.equal(ledger.resume_command, null);

  // A terminal run cannot be resumed; a plain run starts a new one.
  const resumed = await run(ctx, { registry: fakes.registry, extra: { resume: true } });
  assert.equal(resumed.reason, 'run_terminal');
  const again = await run(ctx, { registry: adapters().registry });
  assert.equal(again.ok, true);
  assert.notEqual(again.run_id, result.run_id);
});

// ───────────────────────── unavailable → decision → resume ─────────────────────────

test('a host that cannot run leaves a decision_required (state + telemetry), the run pauses after the wave, decide applies a signed fallback and --resume continues idempotently', async (t) => {
  const ctx = await setup(t);
  let frontendCalls = 0;
  const script = { 'dev:phase-2': () => (frontendCalls++ === 0 ? { fail: 'capacity' } : {}) };
  const fakes = adapters(script);
  const events = [];
  let result = await run(ctx, { registry: fakes.registry, events });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'decision_required');
  assert.equal(result.reason, 'decision_pending');
  assert.equal(result.exitCode, 1);
  assert.equal(result.decisions_pending.length, 1);
  const pending = result.decisions_pending[0];
  assert.equal(pending.unit, 'phase-2');
  assert.equal(pending.stage, 'dev');
  assert.equal(pending.reason, 'capacity');
  assert.equal(pending.host, 'kimi');
  assert.deepEqual(pending.choices, ['retry', 'fallback:<host>/<model>[/<effort>]', 'skip', 'abort']);
  assert.match(pending.hint, /aioson execution:decide \. --feature=orders --unit=phase-2 --choice=/);
  assert.equal(result.summary.units.passed, 1, 'the other unit of the wave still completed');
  assert.ok(events.some((e) => e.type === 'decision_required' && e.unit === 'phase-2'));
  let state = await readState(ctx);
  assert.equal(state.units['phase-1'].qa.status, 'passed');
  assert.equal(state.units['phase-2'].status, 'decision_required');
  assert.equal(state.waves[0].status, 'decision_required');

  const { db } = await openRuntimeDb(ctx.dir);
  try {
    const failed = getExecutionSnapshot(db, { feature: SLUG, agent: 'dev:phase-2' })[0];
    assert.equal(failed.state, 'paused');
    const types = listExecutionEvents(db, failed.telemetry_run_id, { limit: 100 }).events;
    const decision = types.find((e) => e.event_type === 'decision_required');
    assert.ok(decision, 'the decision reaches the telemetry the client polls');
    assert.equal(JSON.parse(decision.payload_json).unit, 'phase-2');
  } finally {
    db.close();
  }

  // Without a decision nothing moves.
  assert.equal((await run(ctx, { registry: fakes.registry })).reason, 'run_exists');
  assert.equal((await run(ctx, { registry: fakes.registry, extra: { resume: true } })).reason, 'decision_pending');
  assert.equal((await decide(ctx, 'phase-2', 'nope')).reason, 'invalid_choice');
  assert.equal((await decide(ctx, 'phase-9', 'retry')).reason, 'unit_unknown');
  assert.equal((await decide(ctx, 'phase-1', 'retry')).reason, 'no_decision_pending');
  assert.equal((await decide(ctx, 'phase-2', 'skip-qa')).reason, 'invalid_choice');
  const unsigned = await decide(ctx, 'phase-2', 'fallback:qwen/qwen-3.8-max');
  assert.equal(unsigned.reason, 'fallback_signature_missing');
  assert.equal(unsigned.hint, 'aioson host:signature . --host=qwen --model=qwen-3.8-max');
  assert.equal((await decide(ctx, 'phase-2', 'fallback:grok/grok-5')).reason, 'unknown_host');
  assert.equal((await decide(ctx, 'phase-2', 'fallback:kimi/kimi-k3/high')).reason, 'effort_unsupported_by_host');

  await writeSignatures({ signatures: { ...ALL_SIGNED, [signatureKey('qwen', 'qwen-3.8-max', null)]: signed('qwen', 'qwen-3.8-max', null) } }, { env: ctx.env });
  const decided = await decide(ctx, 'phase-2', 'fallback:qwen/qwen-3.8-max');
  assert.equal(decided.ok, true, JSON.stringify(decided));
  assert.equal(decided.stage, 'dev');
  assert.equal(decided.status, 'paused');
  assert.deepEqual(decided.override, { host: 'qwen', model: 'qwen-3.8-max', reasoning_effort: null });
  assert.equal(decided.resume_command, 'aioson execution:run . --feature=orders --resume');
  state = await readState(ctx);
  assert.equal(state.units['phase-2'].status, 'pending');
  assert.equal(state.decisions.length, 1);
  assert.equal(state.decisions[0].reason_before, 'capacity');

  result = await run(ctx, { registry: fakes.registry, events, extra: { resume: true } });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'completed');
  const devCalls = fakes.log.filter((e) => e.key === 'dev:phase-2');
  assert.deepEqual(devCalls.map((e) => e.host), ['kimi', 'qwen'], 'the fallback host ran the unit on resume');
  assert.equal(fakes.log.filter((e) => e.key === 'dev:phase-1').length, 1, 'the passed unit was not re-run');
  assert.equal(fakes.log.filter((e) => e.key === 'qa:phase-1').length, 1);
  state = await readState(ctx);
  assert.equal(state.units['phase-2'].dev.host, 'qwen');
  assert.equal(state.units['phase-2'].qa.status, 'passed');
  assert.ok(events.some((e) => e.type === 'run' && e.status === 'started' && e.resumed === true));
});

// ───────────────────────── lane QA: measured corrections, findings, scope ─────────────────────────

test('lane QA corrections are measured against the unit files and capped; scope drift and unowned changes become run findings; a failed review never blocks the run', async (t) => {
  const ctx = await setup(t);
  const manifestFile = path.join(ctx.dir, '.aioson', 'context', `agent-execution-${SLUG}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  manifest.development_lanes.lanes.frontend.qa.max_fix_files = 0;
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  // The compiled plan is the run's authority and it carries the operator's fix cap from the manifest — recompile to pick it up.
  assert.equal((await runCommand({ args: [ctx.dir], options: { sub: 'compile', feature: SLUG, json: true }, logger, env: ctx.env })).ok, true);

  const script = {
    'dev:phase-1': { touch: ['src/api/orders.ts', 'tests/api/orders.test.ts', 'src/api/helper.ts', 'src/app.ts'] },
    'qa:phase-1': { touch: ['src/api/orders.ts'], corrections: [{ path: 'src/api/orders.ts', summary: 'null check' }], findings: [{ severity: 'medium', summary: 'naming' }] },
    'dev:phase-2': { touch: ['src/ui/Orders.tsx'] },
    'qa:phase-2': { touch: ['src/ui/Orders.tsx'], verdict: 'FAIL', findings: [{ severity: 'high', summary: 'screen never calls the API' }] }
  };
  const fakes = adapters(script);
  const result = await run(ctx, { registry: fakes.registry });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'completed');
  const state = await readState(ctx);

  const backendQa = state.units['phase-1'].qa;
  assert.equal(backendQa.status, 'passed');
  assert.deepEqual(backendQa.corrections_paths, ['src/api/orders.ts']);
  assert.equal(backendQa.corrections_cap_exceeded, false);
  assert.equal(backendQa.max_fix_files, 3);
  assert.deepEqual(backendQa.findings.map((f) => f.summary), ['naming']);

  const frontendQa = state.units['phase-2'].qa;
  assert.equal(frontendQa.status, 'failed', 'a FAIL verdict is a finding for integration, not a block');
  assert.equal(frontendQa.max_fix_files, 0);
  assert.equal(frontendQa.corrections_cap_exceeded, true);
  assert.deepEqual(frontendQa.corrections_paths, ['src/ui/Orders.tsx']);
  assert.deepEqual(frontendQa.findings.map((f) => f.check || f.summary).sort(), ['corrections_cap_exceeded', 'screen never calls the API', 'undeclared_correction']);
  assert.equal(state.units['phase-2'].status, 'passed');

  const runFindings = state.findings.map((f) => `${f.check}:${f.path}`).sort();
  assert.deepEqual(runFindings, ['lane_scope_drift:src/api/helper.ts', 'unowned_change:src/app.ts']);
  assert.equal(result.summary.units.qa_failed, 1);

  const ledger = await status(ctx);
  const sources = ledger.findings.map((f) => `${f.source}:${f.check || f.summary}`).sort();
  assert.deepEqual(sources, ['qa:corrections_cap_exceeded', 'qa:naming', 'qa:screen never calls the API', 'qa:undeclared_correction', 'run:lane_scope_drift', 'run:unowned_change']);
  assert.equal(ledger.units.find((u) => u.id === 'phase-2').qa.corrections_cap_exceeded, true);
});

// ───────────────────────── verdict FAIL, skip, qa decisions, abort ─────────────────────────

test('a FAIL/BLOCKED implementer verdict or a missing report needs a decision; skip records a finding for the integration owner and the run completes', async (t) => {
  const ctx = await setup(t);
  const script = { 'dev:phase-1': { verdict: 'FAIL', findings: [{ severity: 'high', summary: 'tests red' }] }, 'dev:phase-2': { no_report: true } };
  const fakes = adapters(script);
  let result = await run(ctx, { registry: fakes.registry });
  assert.equal(result.status, 'decision_required');
  const reasons = Object.fromEntries(result.decisions_pending.map((d) => [d.unit, d.reason]));
  assert.deepEqual(reasons, { 'phase-1': 'verdict_fail', 'phase-2': 'report_missing' });
  assert.equal((await readState(ctx)).units['phase-1'].dev.findings[0].summary, 'tests red');

  assert.equal((await decide(ctx, 'phase-1', 'skip')).ok, true);
  assert.equal((await decide(ctx, 'phase-2', 'retry')).ok, true);
  delete script['dev:phase-2'];
  result = await run(ctx, { registry: fakes.registry, extra: { resume: true } });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'completed');
  const state = await readState(ctx);
  assert.equal(state.units['phase-1'].status, 'skipped');
  assert.equal(state.units['phase-1'].qa.status, 'skipped');
  assert.equal(state.units['phase-2'].status, 'passed');
  assert.equal(state.units['phase-2'].qa.status, 'passed');
  assert.deepEqual(state.findings.map((f) => f.check), ['unit_skipped']);
  assert.equal(result.summary.units.skipped, 1);
  assert.equal(fakes.log.filter((e) => e.key === 'dev:phase-1').length, 1, 'a skipped unit is never re-run');
});

test('a reviewer that cannot run asks for a qa-stage decision; skip-qa keeps the implementation and records the gap; abort cancels the run', async (t) => {
  const ctx = await setup(t);
  const script = { 'qa:phase-2': { fail: 'auth' } };
  const fakes = adapters(script);
  let result = await run(ctx, { registry: fakes.registry });
  assert.equal(result.status, 'decision_required');
  const pending = result.decisions_pending[0];
  assert.equal(pending.unit, 'phase-2');
  assert.equal(pending.stage, 'qa');
  assert.equal(pending.reason, 'auth');
  assert.deepEqual(pending.choices, ['retry', 'fallback:<host>/<model>[/<effort>]', 'skip-qa', 'abort']);
  assert.equal((await decide(ctx, 'phase-2', 'skip')).reason, 'invalid_choice');
  const decided = await decide(ctx, 'phase-2', 'skip-qa');
  assert.equal(decided.ok, true);
  assert.equal(decided.qa_status, 'skipped');
  result = await run(ctx, { registry: fakes.registry, extra: { resume: true } });
  assert.equal(result.status, 'completed');
  let state = await readState(ctx);
  assert.equal(state.units['phase-2'].status, 'passed');
  assert.equal(state.units['phase-2'].qa.status, 'skipped');
  assert.deepEqual(state.findings.map((f) => f.check), ['qa_skipped']);

  // Abort on a fresh run.
  const failing = adapters({ 'dev:phase-1': { fail: 'crash' } });
  result = await run(ctx, { registry: failing.registry, extra: { fresh: true } });
  assert.equal(result.status, 'decision_required');
  const aborted = await decide(ctx, 'phase-1', 'abort');
  assert.equal(aborted.ok, true);
  assert.equal(aborted.status, 'cancelled');
  assert.equal(aborted.resume_command, null);
  state = await readState(ctx);
  assert.equal(state.status, 'cancelled');
  assert.equal((await run(ctx, { registry: failing.registry, extra: { resume: true } })).reason, 'run_terminal');
  assert.equal((await decide(ctx, 'phase-1', 'retry')).reason, 'run_terminal');
});

// ───────────────────────── leases, waves, stall ─────────────────────────

test('the run holds the feature dispatcher lease (no interleaved direct dispatch), --wave stops after a wave, and silence is measured as stalled', async (t) => {
  const ctx = await setup(t);
  const lease = await acquireLease(ctx.dir, SLUG);
  let result = await run(ctx, { registry: adapters().registry });
  assert.equal(result.reason, 'run_lease_held');
  await releaseLease(lease);

  const events = [];
  const fakes = adapters({ 'dev:phase-1': { silence_ms: 120 } });
  result = await run(ctx, { registry: fakes.registry, events, extra: { wave: '1' }, engine: { stallMs: 40, stallCheckMs: 10 } });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'paused');
  assert.equal(result.reason, 'stop_after_wave');
  let state = await readState(ctx);
  assert.deepEqual(state.waves.map((w) => w.status), ['completed', 'pending']);
  assert.equal(state.units['phase-1'].dev.stalled, true, 'no output and no file change for longer than stallMs is a measured stall');
  assert.ok(events.some((e) => e.type === 'stalled' && e.unit === 'phase-1' && e.role === 'dev'));
  const { db } = await openRuntimeDb(ctx.dir);
  try {
    const devRun = getExecutionSnapshot(db, { feature: SLUG, agent: 'dev:phase-1' })[0];
    assert.ok(listExecutionEvents(db, devRun.telemetry_run_id, { limit: 100 }).events.some((e) => e.event_type === 'stalled'));
  } finally {
    db.close();
  }

  // A decision cannot be applied while a run is active.
  const held = await acquireLease(ctx.dir, SLUG);
  assert.equal((await decide(ctx, 'phase-1', 'retry')).reason, 'run_active');
  await releaseLease(held);

  result = await run(ctx, { registry: fakes.registry, extra: { resume: true } });
  assert.equal(result.status, 'completed');
  state = await readState(ctx);
  assert.deepEqual(state.waves.map((w) => w.status), ['completed', 'integration']);
  assert.equal(fakes.log.filter((e) => e.key === 'dev:phase-1').length, 1, 'resume never re-runs a passed unit');
});

// ───────────────────────── profiles / helpers ─────────────────────────

test('the qa-lane profile derives the risk checklist from the installed qa.md and the review prompt carries the implementer report, the correction budget and only the unit files', async (t) => {
  const ctx = await setup(t);
  const profile = await buildQaLaneProfile(ctx.dir, { maxFixFiles: 2 });
  assert.equal(profile.ok, true);
  assert.deepEqual(profile.sections, ['risk-first-checklist']);
  assert.match(profile.text, /^# AIOSON qa-lane profile/);
  assert.match(profile.text, /## Risk-first checklist/);
  assert.match(profile.text, /Required CAP\/AC missing or only mocked/);
  assert.match(profile.text, /at most 2 file\(s\)/);
  const missing = await buildQaLaneProfile(path.join(ctx.dir, 'nowhere'));
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'qa_kernel_missing');
  assert.match(missing.text, /## Lane review rules/, 'the rules render even without the kernel');

  const prompt = composeQaPrompt({
    profileText: profile.text,
    feature: SLUG,
    unit: { id: 'phase-1', lane: 'backend', phase: '1', wave: 1, scope: 'CAP-orders-api', caps: ['CAP-orders-api'], acs: ['AC-orders-01'], files: ['src/api/orders.ts'], done: 'tests pass', verification: [{ cap: 'CAP-orders-api', command: 'npm test' }] },
    lane: { write_paths: ['src/api/**'] },
    dev: { verdict: 'PASS', host: 'codex', model: 'gpt-5.6', reasoning_effort: 'high', findings: [{ summary: 'todo left' }], evidence: ['npm test green'] },
    maxFixFiles: 2
  });
  assert.match(prompt, /# Unit under review — orders \/ phase-1/);
  assert.match(prompt, /- Verdict: PASS \(codex\/gpt-5.6\/high\)/);
  assert.match(prompt, /- \{"summary":"todo left"\}/);
  assert.match(prompt, /Correction budget: at most 2 file\(s\)/);
  assert.match(prompt, /  - src\/api\/orders\.ts/);
  assert.deepEqual(parseChoice('fallback:codex/gpt-5.6/high'), { ok: true, choice: 'fallback', host: 'codex', model: 'gpt-5.6', reasoning_effort: 'high' });
});

// ───────────────────────── CLI ─────────────────────────

test('CLI: execution:run/decide/status exit codes and arguments; --preflight/--resume/--fresh never swallow the path', async (t) => {
  const ctx = await setup(t);
  const spawn = (args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', env: ctx.env });

  const idle = spawn(['execution:status', ctx.dir, `--feature=${SLUG}`, '--json']);
  assert.equal(idle.status, 0, idle.stderr);
  assert.equal(JSON.parse(idle.stdout).message, 'compiled, not started');

  const noUnit = spawn(['execution:decide', ctx.dir, `--feature=${SLUG}`, '--json']);
  assert.equal(noUnit.status, 1);
  assert.equal(JSON.parse(noUnit.stdout).reason, 'unit_required');

  const noChoice = spawn(['execution-decide', ctx.dir, `--feature=${SLUG}`, '--unit=phase-1', '--json']);
  assert.equal(JSON.parse(noChoice.stdout).reason, 'choice_required');

  // The machine running the suite may or may not have the host CLIs installed,
  // so the deterministic refusal is a stale plan: the preflight refuses through
  // the binary with exit 1 — and `--preflight .` parsed as a pure boolean.
  await fs.appendFile(path.join(ctx.dir, '.aioson', 'context', `implementation-plan-${SLUG}.md`), '\nedited after compile\n');
  const preflight = spawn(['execution:run', '--preflight', ctx.dir, `--feature=${SLUG}`, '--json']);
  assert.equal(preflight.status, 1, preflight.stderr);
  const payload = JSON.parse(preflight.stdout);
  assert.equal(payload.reason, 'preflight_failed');
  assert.equal(payload.feature, SLUG);
  assert.ok(payload.preflight.checks.some((c) => c.id === 'plan' && c.ok === false && /plan_digest_stale/.test(c.detail)));

  const help = spawn(['--help']);
  assert.match(help.stdout, /aioson execution:run \[path\] --feature=<slug> \[--preflight\] \[--resume\] \[--fresh\] \[--wave=<n>\]/);
  assert.match(help.stdout, /aioson execution:decide \[path\] --feature=<slug> --unit=<unit-id> --choice=/);
  assert.match(help.stdout, /aioson execution:status \[path\] --feature=<slug>/);
});

// ───────────────────────── graph engineering: readiness scheduling over explicit edges ─────────────────────────

const PLAN_DEPS = PLAN.replace(
  [
    '| Phase | Wave | Files | Scope | Done when |',
    '|---|---|---|---|---|',
    '| 1 | 1 | src/api/orders.ts, tests/api/orders.test.ts | CAP-orders-api | npm test -- orders.api passes |',
    '| 2 | 1 | src/ui/Orders.tsx, tests/ui/Orders.test.tsx | CAP-orders-ui | npm test -- orders.ui passes |',
    '| 3 | 2 | src/app.ts | CAP-orders-wire | npm test -- app passes |'
  ].join('\n'),
  [
    '| Phase | Wave | Files | Scope | Done when | Depends on |',
    '|---|---|---|---|---|---|',
    '| 1 | 1 | src/api/orders.ts, tests/api/orders.test.ts | CAP-orders-api | npm test -- orders.api passes | |',
    '| 2 | 1 | src/ui/Orders.tsx, tests/ui/Orders.test.tsx | CAP-orders-ui | npm test -- orders.ui passes | |',
    '| 3 | 2 | src/ui/OrdersList.tsx | CAP-orders-ui | npm test -- orders.ui passes | 2 (dev) |',
    '| 4 | 2 | src/api/orders-report.ts | CAP-orders-api | npm test -- orders.api passes | 1, 2 |',
    '| 5 | 3 | src/app.ts | CAP-orders-wire | npm test -- app passes | |'
  ].join('\n')
);

test('explicit edges schedule by readiness: a dependent starts as soon as its own dependencies allow (after_dev while the review still runs; after_qa once both reviews ended) instead of waiting for the slowest unit of the previous wave', async (t) => {
  // Three slots so the pool never masks the gates: phase-3 needs a free slot the moment phase-2's implementer passes.
  const ctx = await setup(t, { roles: { ...ROLES, parallel: { max_concurrent_lanes: 3 } } });
  await fs.writeFile(path.join(ctx.dir, '.aioson', 'context', `implementation-plan-${SLUG}.md`), PLAN_DEPS, 'utf8');
  const compiled = await runCommand({ args: [ctx.dir], options: { sub: 'compile', feature: SLUG, json: true }, logger, env: ctx.env });
  assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
  assert.equal(compiled.summary.edges, 3);

  // backend phase-1 is slow; frontend phase-2 is fast but its review is slow.
  const script = { 'dev:phase-1': { delay_ms: 320 }, 'dev:phase-2': { delay_ms: 20 }, 'qa:phase-2': { delay_ms: 220 } };
  const fakes = adapters(script, { delayMs: 20 });
  const events = [];
  const result = await run(ctx, { registry: fakes.registry, events });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'completed');
  assert.equal(result.summary.units.passed, 4);
  assert.deepEqual(result.integration.units, ['phase-5']);

  const at = (key) => fakes.log.find((e) => e.key === key);
  assert.ok(at('dev:phase-3').start < at('dev:phase-1').end, 'phase-3 (wave 2, depends on phase-2 dev) started while phase-1 (wave 1) was still implementing — no wave barrier');
  assert.ok(at('dev:phase-3').start >= at('dev:phase-2').end, 'after_dev: phase-3 waited for phase-2\'s implementer');
  assert.ok(at('dev:phase-3').start < at('qa:phase-2').end, 'after_dev: phase-3 did not wait for phase-2\'s review');
  assert.ok(at('dev:phase-4').start >= at('qa:phase-1').end && at('dev:phase-4').start >= at('qa:phase-2').end, 'after_qa: phase-4 waited for both reviews');
  assert.ok(fakes.log.every((e) => e.active_at_start <= 3), 'the pool cap still holds');

  const kinds = events.map((e) => `${e.type}:${e.status || ''}:${e.wave || ''}`);
  assert.ok(kinds.indexOf('wave:started:2') < kinds.indexOf('wave:completed:1'), 'wave 2 opened before wave 1 closed');
  assert.equal(kinds.at(-1), 'run:completed:');
  const state = await readState(ctx);
  assert.deepEqual(state.waves.map((w) => [w.wave, w.status]), [[1, 'completed'], [2, 'completed'], [3, 'integration']]);
  assert.deepEqual(state.findings, [], 'concurrent windows attribute every changed file to an active unit');

  const ledger = await status(ctx);
  assert.equal(ledger.run.status, 'completed');
});

test('a dependency that needs a decision holds only its dependents: independent units keep going, the run pauses once nothing else can start, and --resume continues from the graph', async (t) => {
  const ctx = await setup(t);
  await fs.writeFile(path.join(ctx.dir, '.aioson', 'context', `implementation-plan-${SLUG}.md`), PLAN_DEPS, 'utf8');
  assert.equal((await runCommand({ args: [ctx.dir], options: { sub: 'compile', feature: SLUG, json: true }, logger, env: ctx.env })).ok, true);
  let frontendCalls = 0;
  const script = { 'dev:phase-2': () => (frontendCalls++ === 0 ? { fail: 'capacity' } : {}), 'dev:phase-1': { delay_ms: 60 } };
  const fakes = adapters(script);
  let result = await run(ctx, { registry: fakes.registry });
  assert.equal(result.status, 'decision_required');
  assert.deepEqual(result.decisions_pending.map((d) => d.unit), ['phase-2']);
  let state = await readState(ctx);
  assert.equal(state.units['phase-1'].qa.status, 'passed', 'the independent wave-1 unit finished');
  assert.equal(state.units['phase-3'].status, 'pending', 'phase-3 depends on phase-2 (dev) — held');
  assert.equal(state.units['phase-4'].status, 'pending', 'phase-4 depends on phase-2 (qa) — held');
  assert.equal(state.waves[0].status, 'decision_required');

  assert.equal((await decide(ctx, 'phase-2', 'retry')).ok, true);
  result = await run(ctx, { registry: fakes.registry, extra: { resume: true } });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'completed');
  assert.equal(fakes.log.filter((e) => e.key === 'dev:phase-1').length, 1, 'resume never re-runs a passed unit');
  state = await readState(ctx);
  assert.equal(state.units['phase-3'].qa.status, 'passed');
  assert.equal(state.units['phase-4'].qa.status, 'passed');
});
