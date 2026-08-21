'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runBenchmarkBootstrap } = require('../src/commands/benchmark-bootstrap');
const { readMeasuredRunMarker, TRAVERSAL_CHAIN } = require('../src/lib/measured-run');

const silentLogger = { log() {}, error() {}, warn() {} };

// The exact workspace the Cockpit materializes for the AIOSON variant of a
// comparison mission: the frozen benchmark instruction, boundary files, and a
// minimal (invalid) project context. See materialize_aioson_workspace in the
// cockpit daemon.
function makeCockpitWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-bootstrap-'));
  fs.mkdirSync(path.join(dir, '.aioson', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.aioson', 'context'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.aioson', 'agents', 'benchmark.md'),
    '# Agent @benchmark\n\nFROZEN INSTRUCTION SNAPSHOT — bytes are the contract of record.\n'
  );
  fs.writeFileSync(
    path.join(dir, '.aioson', 'context', 'project.context.md'),
    '---\nproject_type: benchmark-delivery\ninteraction_language: pt-BR\n---\n\n# Isolated benchmark delivery\n\nThe run envelope is the complete product authority. Stay within the assigned run root.\n'
  );
  const boundary = '# Benchmark workspace\n\nExecute exclusively the managed `benchmark` agent.\n';
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), boundary);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), boundary);
  return dir;
}

test('benchmark:bootstrap --check names every missing piece without writing', async () => {
  const dir = makeCockpitWorkspace();
  try {
    const report = await runBenchmarkBootstrap({ args: [dir], options: { check: true }, logger: silentLogger });
    assert.equal(report.ok, false);
    assert.equal(report.mode, 'check');
    const byId = Object.fromEntries(report.checks.map((check) => [check.id, check]));
    assert.equal(byId.install.ok, false);
    assert.equal(byId.traversal_agents.ok, false);
    assert.match(byId.traversal_agents.detail, /refiner/);
    assert.equal(byId.context.ok, false);
    assert.equal(byId.marker.ok, false);
    assert.equal(report.actions.length, 0);
    assert.equal(fs.existsSync(path.join(dir, '.aioson', 'benchmark', 'measured-run.json')), false);
    assert.equal(fs.existsSync(path.join(dir, '.aioson', 'agents', 'dev.md')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('benchmark:bootstrap repairs the cockpit workspace into a ready measured round', async () => {
  const dir = makeCockpitWorkspace();
  try {
    const frozen = fs.readFileSync(path.join(dir, '.aioson', 'agents', 'benchmark.md'), 'utf8');
    const boundary = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');

    const report = await runBenchmarkBootstrap({ args: [dir], options: {}, logger: silentLogger });
    assert.equal(report.ok, true, JSON.stringify(report.checks));
    for (const check of report.checks) assert.equal(check.ok, true, `${check.id}: ${check.detail}`);

    // The frozen instruction and the cockpit boundary files are never replaced.
    assert.equal(fs.readFileSync(path.join(dir, '.aioson', 'agents', 'benchmark.md'), 'utf8'), frozen);
    assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), boundary);

    // The full traversal agent set is installed.
    for (const agent of TRAVERSAL_CHAIN) {
      assert.ok(fs.existsSync(path.join(dir, '.aioson', 'agents', `${agent}.md`)), `missing ${agent}.md`);
    }

    // The context is contract-valid, keeps the caller's language, forces autopilot.
    const context = fs.readFileSync(path.join(dir, '.aioson', 'context', 'project.context.md'), 'utf8');
    assert.match(context, /interaction_language: "pt-BR"/);
    assert.match(context, /project_type: "web_app"/);
    assert.match(context, /auto_handoff: true/);
    assert.match(context, /The run envelope is the complete product authority/);

    const marker = readMeasuredRunMarker(dir);
    assert.equal(marker.present, true);
    assert.deepEqual(marker.marker.chain, [...TRAVERSAL_CHAIN]);
    assert.equal(marker.marker.policy.decisions, 'recommended-or-fail');

    // Idempotent: a second run changes nothing structural and stays ready.
    const again = await runBenchmarkBootstrap({ args: [dir], options: {}, logger: silentLogger });
    assert.equal(again.ok, true);

    const check = await runBenchmarkBootstrap({ args: [dir], options: { check: true }, logger: silentLogger });
    assert.equal(check.ok, true, JSON.stringify(check.checks));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
