'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runSizing } = require('../src/commands/sizing');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-sizing-'));
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

test('sizing: returns ok=false when no prd or feature provided', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runSizing({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_prd');
});

test('sizing: returns ok=false when file not found', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runSizing({
    args: [tmpDir],
    options: { json: true, feature: 'missing' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'file_not_found');
});

test('sizing: inplace decision for simple PRD', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/prd-simple.md',
    '# Simple Feature\nAs a user, I want to view my profile.\nAC-1: Profile displays name.\n');
  const result = await runSizing({
    args: [tmpDir],
    options: { json: true, feature: 'simple' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.decision, 'inplace');
});

test('sizing: phased_external for complex PRD with many phases and integrations', async () => {
  const tmpDir = await makeTmpDir();
  const content = [
    '# Complex Platform',
    '## Phase 1: User management',
    '## Phase 2: Payment processing',
    '## Phase 3: Notification system',
    'Models: UserModel, OrderModel, ProductModel, CartModel, PaymentModel',
    'Integrates with Stripe for payments.',
    'Integrates with SendGrid for emails.',
    ...Array(12).fill('- [ ] AC: some criterion'),
  ].join('\n');
  await writeFile(tmpDir, '.aioson/context/prd-complex.md', content);
  const result = await runSizing({
    args: [tmpDir],
    options: { json: true, feature: 'complex' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.ok(['phased_inplace', 'phased_external'].includes(result.decision));
});

test('sizing: reads prd via --prd flag', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, 'docs/my-prd.md',
    '# My PRD\nAs a user, see my data.\n- [ ] AC-1: Show data\n');
  const result = await runSizing({
    args: [tmpDir],
    options: { json: true, prd: 'docs/my-prd.md' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
});

test('sizing: json includes metrics fields', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/prd-feat.md', '# Feature\nSimple description.\n');
  const result = await runSizing({
    args: [tmpDir],
    options: { json: true, feature: 'feat' },
    logger: makeLogger()
  });
  assert.ok('metrics' in result);
  assert.ok('scores' in result);
  assert.ok(typeof result.scores.total === 'number');
  assert.ok('decision' in result);
  assert.ok('instruction' in result);
});

test('sizing: human output contains Score line', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/prd-h.md', '# Human\nSimple.\n');
  const logger = makeLogger();
  await runSizing({ args: [tmpDir], options: { feature: 'h' }, logger });
  assert.ok(logger.lines.some((l) => l.includes('Score')));
});
