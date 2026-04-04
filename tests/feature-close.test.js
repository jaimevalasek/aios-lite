'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runFeatureClose } = require('../src/commands/feature-close');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-feature-close-'));
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

test('feature:close: requires --feature', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runFeatureClose({
    args: [tmpDir],
    options: { json: true, verdict: 'PASS' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_feature');
});

test('feature:close: requires valid --verdict', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runFeatureClose({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', verdict: 'MAYBE' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_verdict');
});

test('feature:close: PASS adds QA sign-off to spec file', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/spec-checkout.md',
    '---\nversion: 3\ngate_plan: approved\n---\n# Spec\n\n## Implementation\n\nDone.\n');

  const result = await runFeatureClose({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', verdict: 'PASS' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.verdict, 'PASS');

  const specContent = await fs.readFile(
    path.join(tmpDir, '.aioson', 'context', 'spec-checkout.md'),
    'utf8'
  );
  assert.ok(specContent.includes('QA Sign-off'));
  assert.ok(specContent.includes('PASS'));
});

test('feature:close: FAIL records rejection in spec', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/spec-checkout.md',
    '---\nversion: 3\n---\n# Spec\n');

  const result = await runFeatureClose({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', verdict: 'FAIL', notes: 'Auth edge case missing' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.residual, 'Auth edge case missing');
});

test('feature:close: updates features.md when it exists', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/features.md',
    '| checkout | in_progress | 2026-01-01 | active |\n');

  await runFeatureClose({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', verdict: 'PASS' },
    logger: makeLogger()
  });

  const content = await fs.readFile(
    path.join(tmpDir, '.aioson', 'context', 'features.md'),
    'utf8'
  );
  assert.ok(content.includes('done') || content.includes('checkout'));
});

test('feature:close: updates project-pulse.md when it exists', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project-pulse.md',
    '---\nlast_agent: dev\nactive_feature: checkout\n---\n# Pulse\n');

  await runFeatureClose({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', verdict: 'PASS' },
    logger: makeLogger()
  });

  const content = await fs.readFile(
    path.join(tmpDir, '.aioson', 'context', 'project-pulse.md'),
    'utf8'
  );
  assert.ok(content.includes('qa') || content.includes('Gate D'));
});

test('feature:close: works when spec file missing (skips gracefully)', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runFeatureClose({
    args: [tmpDir],
    options: { json: true, feature: 'missing', verdict: 'PASS' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.ok(result.updates.some((u) => u.includes('skipped') || u.includes('not found')));
});

test('feature:close: human output shows closure summary', async () => {
  const tmpDir = await makeTmpDir();
  const logger = makeLogger();
  await runFeatureClose({
    args: [tmpDir],
    options: { feature: 'checkout', verdict: 'PASS' },
    logger
  });
  assert.ok(logger.lines.some((l) => l.includes('checkout') || l.includes('closure')));
});

test('feature:close: residual is included in spec sign-off', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/spec-feat.md', '---\nversion: 1\n---\n# Spec\n');

  await runFeatureClose({
    args: [tmpDir],
    options: { json: true, feature: 'feat', verdict: 'PASS', residual: 'Email not tested E2E' },
    logger: makeLogger()
  });

  const content = await fs.readFile(
    path.join(tmpDir, '.aioson', 'context', 'spec-feat.md'),
    'utf8'
  );
  assert.ok(content.includes('Email not tested E2E'));
});
