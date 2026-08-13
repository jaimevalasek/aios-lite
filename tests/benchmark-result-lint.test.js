'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeBenchmarkResult } = require('../src/lib/benchmark-result-lint');
const { runVerifyArtifact, availableKinds } = require('../src/commands/verify-artifact');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

async function makeRun(overrides = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-bench-'));
  await fs.mkdir(path.join(dir, 'workspace'), { recursive: true });
  await fs.writeFile(path.join(dir, 'workspace', 'index.html'), '<!doctype html>', 'utf8');
  await fs.writeFile(path.join(dir, 'report.md'), '# Report', 'utf8');
  const data = {
    schema_version: 1,
    status: 'completed',
    summary: 'Runnable demo delivered.',
    entrypoints: ['workspace/index.html'],
    run_instructions: ['Open workspace/index.html'],
    assumptions: [],
    research: [{ title: 'ref', url: 'https://example.com', applied_to: 'layout' }],
    features: ['save order'],
    validation: [{ command: 'node --test', status: 'passed', evidence: 'exit 0' }],
    known_limitations: [],
    artifacts: { report: 'report.md', screenshots: [] },
    ...overrides
  };
  await fs.writeFile(path.join(dir, 'benchmark-result.json'), JSON.stringify(data, null, 2), 'utf8');
  return dir;
}

test('a well-formed benchmark result measures clean', async () => {
  const dir = await makeRun();
  const result = analyzeBenchmarkResult({ file: path.join(dir, 'benchmark-result.json') });
  assert.deepEqual(result.issues, []);
  assert.equal(result.metrics.status, 'completed');
  assert.equal(result.metrics.features, 1);
});

test('completed without validation coverage, bad enums, forbidden fields and missing paths are issues', async () => {
  const dir = await makeRun({
    status: 'done',
    validation: [],
    features: ['a feature'],
    model: 'gpt-x',
    entrypoints: ['workspace/missing.html', '/abs/path.html', '../outside.html']
  });
  const result = analyzeBenchmarkResult({ file: path.join(dir, 'benchmark-result.json') });
  assert.ok(result.issues.some((i) => i.includes('status "done"')));
  assert.ok(result.issues.some((i) => i.includes('forbidden top-level field "model"')));
  assert.ok(result.issues.some((i) => i.includes('does not exist: workspace/missing.html')));
  assert.ok(result.issues.some((i) => i.includes('"/abs/path.html"')));
  assert.ok(result.issues.some((i) => i.includes('"../outside.html"')));
});

test('completed with features but zero validation rows is blocked deterministically', async () => {
  const dir = await makeRun({ validation: [], features: ['x'] });
  const result = analyzeBenchmarkResult({ file: path.join(dir, 'benchmark-result.json') });
  assert.ok(result.issues.some((i) => i.includes('zero validation rows')));
});

test('kind=benchmark-result is registered and resolves via --file through runVerifyArtifact', async () => {
  assert.ok(availableKinds().includes('benchmark-result'));
  const dir = await makeRun();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'benchmark-result', file: 'benchmark-result.json', advisory: true, suppressExitCode: true, json: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, true);
  assert.equal(report.kind, 'benchmark-result');
});
