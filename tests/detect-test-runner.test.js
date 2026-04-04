'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runDetectTestRunner } = require('../src/commands/detect-test-runner');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-detect-runner-'));
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

test('detect:test-runner: detected=false when no config files', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runDetectTestRunner({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.detected, false);
  assert.equal(result.runner, null);
});

test('detect:test-runner: detects phpunit.xml', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, 'phpunit.xml', '<phpunit></phpunit>');
  const result = await runDetectTestRunner({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.detected, true);
  assert.ok(result.runner.includes('PHPUnit') || result.runner.includes('Pest'));
  assert.ok(result.command.includes('test'));
  assert.equal(result.config_file, 'phpunit.xml');
});

test('detect:test-runner: detects jest.config.js', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, 'jest.config.js', 'module.exports = {};');
  const result = await runDetectTestRunner({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.detected, true);
  assert.equal(result.runner, 'Jest');
});

test('detect:test-runner: detects vitest.config.ts', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, 'vitest.config.ts', 'export default {}');
  const result = await runDetectTestRunner({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.detected, true);
  assert.equal(result.runner, 'Vitest');
});

test('detect:test-runner: detects .rspec', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.rspec', '--color');
  const result = await runDetectTestRunner({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.detected, true);
  assert.equal(result.runner, 'RSpec');
});

test('detect:test-runner: detects foundry.toml', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, 'foundry.toml', '[profile.default]\nsrc = "src"');
  const result = await runDetectTestRunner({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.detected, true);
  assert.equal(result.runner, 'Forge');
});

test('detect:test-runner: human output shows detected runner', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, 'jest.config.mjs', 'export default {}');
  const logger = makeLogger();
  await runDetectTestRunner({ args: [tmpDir], options: {}, logger });
  assert.ok(logger.lines.some((l) => l.includes('Jest')));
});

test('detect:test-runner: human output shows no runner message', async () => {
  const tmpDir = await makeTmpDir();
  const logger = makeLogger();
  await runDetectTestRunner({ args: [tmpDir], options: {}, logger });
  assert.ok(logger.lines.some((l) => l.includes('No test runner') || l.includes('Detection')));
});
