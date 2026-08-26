'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { runExecution: runCommand } = require('../src/commands/execution');
const { runStatePath } = require('../src/agent-execution/execution-run');
const { readExecutionPlan } = require('../src/agent-execution/execution-plan');
const { validateManifest } = require('../src/agent-execution/schema');
const { defaults } = require('../src/agent-execution/manifest');
const { signatureKey, writeSignatures } = require('../src/lib/host-signature');

const ROOT = path.resolve(__dirname, '..');
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
  '| CAP-orders-api | 1 | src/api/orders.ts | npm test -- orders.api |',
  '| CAP-orders-ui | 2 | src/ui/Orders.tsx | npm test -- orders.ui |',
  '| CAP-orders-wire | 3 | src/app.ts | npm test -- app |',
  '',
  '## Development execution lanes',
  '| Lane | Host | Model | Exact write paths | Integration owner |',
  '|---|---|---|---|---|',
  '| backend | codex | gpt-5.6 | src/api/** | dev |',
  '| frontend | kimi | kimi-k3 | src/ui/** | dev |',
  '',
  '## Execution Sequence',
  '| Phase | Wave | Files | Scope | Done when |',
  '|---|---|---|---|---|',
  '| 1 | 1 | src/api/orders.ts | CAP-orders-api | npm test -- orders.api passes |',
  '| 2 | 1 | src/ui/Orders.tsx | CAP-orders-ui | npm test -- orders.ui passes |',
  '| 3 | 2 | src/app.ts | CAP-orders-wire | npm test -- app passes |',
  ''
].join('\n');

const PRD = '# Orders\n\n## Acceptance Criteria\n| AC | CAP | Observable behavior | Evidence |\n|---|---|---|---|\n| AC-orders-01 | CAP-orders-api | POST /orders creates an order | api test |\n| AC-orders-02 | CAP-orders-ui | Orders screen lists orders | ui test |\n';

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

const catalogLoader = async () => ({ available: true, source: 'fixture', fetched_at: '2026-08-25', models: [{ slug: 'gpt-5.6', display_name: 'GPT-5.6', supported_efforts: ['medium', 'high'] }] });

/** Fake host adapter: `script[key]` may be a function of the call index — a reviewer that fails, then passes. */
function fakeAdapter(host, { script = {}, prompts = {}, calls = {} } = {}) {
  return {
    host,
    build: () => ({ ok: true }),
    async execute(input) {
      const marker = 'AIOSON EXECUTION CONTRACT';
      const contract = input.prompt_text.slice(input.prompt_text.indexOf(marker));
      const get = (name) => contract.match(new RegExp(`${name}=([^,\\n]+)`))?.[1].trim();
      const reportRel = contract.match(/report to: ([^\n]+)/)?.[1].trim();
      const role = get('agent');
      const unit = (input.prompt_text.match(/# Unit (?:contract|under review) — [a-z0-9-]+ \/ ([a-z0-9-]+)/) || [])[1];
      const key = `${role}:${unit}`;
      calls[key] = (calls[key] || 0) + 1;
      prompts[key] = [...(prompts[key] || []), input.prompt_text];
      const behaviour = typeof script[key] === 'function' ? script[key](calls[key]) : (script[key] || {});
      await new Promise((resolve) => setTimeout(resolve, 15));
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
        evidence: [`${key} #${calls[key]}`]
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
  return { ok: true, baseline: { captured_at: new Date().toISOString(), head: 'fake', dirty_paths: paths.sort(), dirty_hashes: hashes } };
}

async function setup(t, { reworkRounds = null } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-execution-rework-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }).catch(() => {}));
  for (const rel of ['.aioson/context', '.aioson/config', '.aioson/agents', 'src/api', 'src/ui']) await fs.mkdir(path.join(dir, ...rel.split('/')), { recursive: true });
  await fs.writeFile(path.join(dir, '.aioson', 'context', `implementation-plan-${SLUG}.md`), PLAN, 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'context', `prd-${SLUG}.md`), PRD, 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'config', 'execution-roles.json'), JSON.stringify(ROLES, null, 2), 'utf8');
  await fs.copyFile(path.join(ROOT, 'template', '.aioson', 'agents', 'dev.md'), path.join(dir, '.aioson', 'agents', 'dev.md'));
  await fs.copyFile(path.join(ROOT, 'template', '.aioson', 'agents', 'qa.md'), path.join(dir, '.aioson', 'agents', 'qa.md'));
  await fs.writeFile(path.join(dir, 'src', 'app.ts'), 'export const app = 1;\n', 'utf8');
  const binDir = path.join(dir, 'fake-bin');
  await fs.mkdir(binDir, { recursive: true });
  for (const bin of ['codex', 'kimi', 'claude']) await fs.writeFile(path.join(binDir, `${bin}.exe`), '', 'utf8');
  const env = { ...process.env, AIOSON_HOST_SIGNATURES: path.join(dir, 'signatures.json') };
  delete env.AIOSON_PLAY;
  delete env.AIOSON_EXECUTION_SPAWNER;
  await writeSignatures({ signatures: {
    [signatureKey('codex', 'gpt-5.6', 'high')]: signed('codex', 'gpt-5.6', 'high'),
    [signatureKey('kimi', 'kimi-k3', null)]: signed('kimi', 'kimi-k3', null),
    [signatureKey('claude', 'claude-sonnet-5', null)]: signed('claude', 'claude-sonnet-5', null)
  } }, { env });
  const resolverOptions = { env: { PATH: binDir, Path: binDir }, platform: 'win32' };
  const compile = () => runCommand({ args: [dir], options: { sub: 'compile', feature: SLUG, json: true }, logger, env });
  assert.equal((await compile()).ok, true);
  if (reworkRounds !== null) {
    // The operator's rework budget lives in the manifest lane; the compiled plan carries it — recompile to pick it up.
    const manifestFile = path.join(dir, '.aioson', 'context', `agent-execution-${SLUG}.json`);
    const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
    manifest.development_lanes.lanes.frontend.qa.max_rework_rounds = reworkRounds;
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
    const compiled = await compile();
    assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
  }
  return { dir, env, resolverOptions };
}

function run(ctx, { registry, events = [], extra = {} }) {
  return runCommand({
    args: [ctx.dir],
    options: { sub: 'run', feature: SLUG, json: true, ...extra },
    logger,
    env: ctx.env,
    engineOptions: { adapterRegistry: registry, catalogLoader, resolverOptions: ctx.resolverOptions, gitBaseline: fakeBaseline, progress: (event) => events.push(event), stallMs: 60000, stallCheckMs: 30000 }
  });
}

test('manifest schema: qa.max_rework_rounds is optional and bounded (0–3); the compiled plan carries the lane budget, default 0', async (t) => {
  const manifest = defaults('demo', 'codex');
  manifest.development_lanes.lanes.backend.qa = { host: 'claude', model: 'claude-sonnet-5', report: '.aioson/context/reports/demo/{run_id}/qa-backend.json', max_fix_files: 3, max_rework_rounds: 2 };
  assert.equal(validateManifest(manifest, 'demo').ok, true);
  manifest.development_lanes.lanes.backend.qa.max_rework_rounds = 4;
  assert.deepEqual(validateManifest(manifest, 'demo').errors.map((e) => e.path), ['$.development_lanes.lanes.backend.qa.max_rework_rounds']);
  manifest.development_lanes.lanes.backend.qa.max_rework_rounds = -1;
  assert.equal(validateManifest(manifest, 'demo').ok, false);

  const plain = await setup(t);
  const { plan } = await readExecutionPlan(plain.dir, SLUG);
  assert.equal(plan.lanes.frontend.qa.max_rework_rounds, 0);
  const budgeted = await setup(t, { reworkRounds: 2 });
  const compiled = (await readExecutionPlan(budgeted.dir, SLUG)).plan;
  assert.equal(compiled.lanes.frontend.qa.max_rework_rounds, 2);
  assert.equal(compiled.lanes.backend.qa.max_rework_rounds, 0);
});

test('a failed lane review sends the unit back to its implementer with the findings, up to the budget; reports per round; the ledger counts the rounds; the budget spent leaves rework_exhausted', async (t) => {
  const ctx = await setup(t, { reworkRounds: 2 });
  const prompts = {};
  const calls = {};
  const script = {
    'qa:phase-2': (n) => (n === 1 ? { verdict: 'FAIL', findings: [{ severity: 'high', summary: 'screen never calls the API', path: 'src/ui/Orders.tsx' }] } : {})
  };
  const registry = { codex: fakeAdapter('codex', { script, prompts, calls }), kimi: fakeAdapter('kimi', { script, prompts, calls }), claude: fakeAdapter('claude', { script, prompts, calls }) };
  const events = [];
  const result = await run(ctx, { registry, events });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'completed');
  assert.equal(calls['dev:phase-2'], 2, 'the implementer ran again');
  assert.equal(calls['qa:phase-2'], 2, 'the reviewer ran again');
  assert.equal(calls['dev:phase-1'], 1);
  assert.equal(calls['qa:phase-1'], 1);
  assert.doesNotMatch(prompts['dev:phase-2'][0], /Reviewer findings/);
  assert.match(prompts['dev:phase-2'][1], /## Reviewer findings — rework round 1 of 2 \(fix these inside your unit files, re-run the verification, report again\)\n\n- \{"severity":"high","summary":"screen never calls the API","path":"src\/ui\/Orders\.tsx"\}/);
  assert.ok(prompts['dev:phase-2'][1].indexOf('## Reviewer findings') < prompts['dev:phase-2'][1].indexOf('AIOSON EXECUTION CONTRACT'));

  const state = JSON.parse(await fs.readFile(runStatePath(ctx.dir, SLUG), 'utf8'));
  const unit = state.units['phase-2'];
  assert.equal(unit.status, 'passed');
  assert.equal(unit.qa.status, 'passed');
  assert.deepEqual({ rounds: unit.rework.rounds, max: unit.rework.max }, { rounds: 1, max: 2 });
  assert.equal(unit.rework.history.length, 1);
  assert.equal(unit.rework.history[0].findings[0].summary, 'screen never calls the API');
  assert.equal(unit.rework.history[0].dev.report, `.aioson/context/reports/${SLUG}/${state.run_id}/phase-2.json`);
  assert.equal(unit.rework.history[0].qa.report, `.aioson/context/reports/${SLUG}/${state.run_id}/phase-2-qa.json`);
  assert.equal(unit.dev.report, `.aioson/context/reports/${SLUG}/${state.run_id}/phase-2.r1.json`);
  assert.equal(unit.qa.report, `.aioson/context/reports/${SLUG}/${state.run_id}/phase-2-qa.r1.json`);
  for (const rel of [unit.rework.history[0].dev.report, unit.rework.history[0].qa.report, unit.dev.report, unit.qa.report]) await fs.access(path.join(ctx.dir, rel));
  assert.equal(state.units['phase-1'].rework, undefined);
  assert.deepEqual(state.findings, [], 'a review that passes after rework leaves nothing for integration');
  assert.deepEqual(result.summary.rework, { units: 1, rounds: 1 });
  assert.ok(events.some((e) => e.type === 'unit' && e.role === 'qa' && e.status === 'rework' && e.unit === 'phase-2' && e.round === 1 && e.max === 2));

  const status = await runCommand({ args: [ctx.dir], options: { sub: 'status', feature: SLUG, json: true }, logger, env: ctx.env });
  assert.deepEqual(status.units.find((u) => u.id === 'phase-2').rework, { rounds: 1, max: 2 });
  assert.equal(status.units.find((u) => u.id === 'phase-1').rework, null);

  // Budget spent: the reviewer keeps failing → the unit still completes, the failure is a finding, plus rework_exhausted.
  const stubborn = await setup(t, { reworkRounds: 1 });
  const alwaysFail = { 'qa:phase-2': () => ({ verdict: 'FAIL', findings: [{ severity: 'high', summary: 'still wrong' }] }) };
  const calls2 = {};
  const registry2 = { codex: fakeAdapter('codex', { script: alwaysFail, calls: calls2 }), kimi: fakeAdapter('kimi', { script: alwaysFail, calls: calls2 }), claude: fakeAdapter('claude', { script: alwaysFail, calls: calls2 }) };
  const exhausted = await run(stubborn, { registry: registry2 });
  assert.equal(exhausted.status, 'completed', 'a failed review never blocks the run');
  assert.equal(calls2['dev:phase-2'], 2);
  assert.equal(calls2['qa:phase-2'], 2);
  const state2 = JSON.parse(await fs.readFile(runStatePath(stubborn.dir, SLUG), 'utf8'));
  assert.equal(state2.units['phase-2'].qa.status, 'failed');
  assert.equal(state2.units['phase-2'].rework.rounds, 1);
  assert.deepEqual(state2.findings.map((f) => f.check), ['rework_exhausted']);
  assert.match(state2.findings[0].message, /still fails after 1 rework round\(s\)/);
  assert.equal(exhausted.summary.units.qa_failed, 1);

  // Default budget (0): one round, the failure is a finding, nothing re-runs — as before.
  const plain = await setup(t);
  const calls3 = {};
  const registry3 = { codex: fakeAdapter('codex', { script: alwaysFail, calls: calls3 }), kimi: fakeAdapter('kimi', { script: alwaysFail, calls: calls3 }), claude: fakeAdapter('claude', { script: alwaysFail, calls: calls3 }) };
  const once = await run(plain, { registry: registry3 });
  assert.equal(once.status, 'completed');
  assert.equal(calls3['dev:phase-2'], 1);
  assert.equal(calls3['qa:phase-2'], 1);
  assert.deepEqual(once.summary.rework, { units: 0, rounds: 0 });
  const state3 = JSON.parse(await fs.readFile(runStatePath(plain.dir, SLUG), 'utf8'));
  assert.equal(state3.units['phase-2'].rework, undefined);
  assert.deepEqual(state3.findings, []);
});
