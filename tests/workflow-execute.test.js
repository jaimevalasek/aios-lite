'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runWorkflowExecute } = require('../src/commands/workflow-execute');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-workflow-exec-'));
}

async function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

function makeLogger() {
  const lines = [];
  const errors = [];
  return {
    log: (msg = '') => lines.push(String(msg)),
    error: (msg = '') => errors.push(String(msg)),
    lines,
    errors
  };
}

test('workflow:execute: requires --feature', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, 'dry-run': true },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_feature');
});

test('workflow:execute: dry-run returns plan without executing', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.ok(Array.isArray(result.steps));
  assert.ok(result.steps.length > 0);
  assert.equal(result.feature, 'checkout');
});

test('workflow:execute: dry-run SMALL has product, analyst, dev, qa steps', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger: makeLogger()
  });
  const agents = result.steps.map((s) => s.agent);
  assert.ok(agents.includes('product'));
  assert.ok(agents.includes('analyst'));
  assert.ok(agents.includes('dev'));
  assert.ok(agents.includes('qa'));
});

test('workflow:execute: dry-run MICRO only has dev step', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'small-fix', 'dry-run': true, classification: 'MICRO' },
    logger: makeLogger()
  });
  const agents = result.steps.map((s) => s.agent);
  assert.ok(agents.includes('dev'));
  assert.ok(!agents.includes('product'));
});

test('workflow:execute: dry-run skips product when prd already exists', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger: makeLogger()
  });
  const productStep = result.steps.find((s) => s.agent === 'product');
  assert.ok(productStep);
  assert.equal(productStep.skip, true);
});

test('workflow:execute: reads classification from project.context.md', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project.context.md', '---\nclassification: MEDIUM\n---');
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'feat', 'dry-run': true },
    logger: makeLogger()
  });
  assert.equal(result.classification, 'MEDIUM');
});

test('workflow:execute: dry-run human output mentions plan', async () => {
  const tmpDir = await makeTmpDir();
  const logger = makeLogger();
  await runWorkflowExecute({
    args: [tmpDir],
    options: { feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger
  });
  assert.ok(logger.lines.some((l) => l.includes('Plan') || l.includes('Step') || l.includes('@')));
});

test('workflow:execute: start-from skips earlier steps', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: {
      json: true, feature: 'checkout', 'dry-run': true,
      classification: 'SMALL', 'start-from': 'dev'
    },
    logger: makeLogger()
  });
  const agents = result.steps.map((s) => s.agent);
  assert.ok(!agents.includes('product'));
  assert.ok(!agents.includes('analyst'));
  assert.ok(agents.includes('dev'));
});
