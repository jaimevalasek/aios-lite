'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const {
  runPackageTest,
  parsePackResult,
  resolveTarballFromDir
} = require('../src/commands/package-e2e');

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

test('parsePackResult returns last non-empty line', () => {
  const output = '\nfoo\nbar\naios-lite-0.1.8.tgz\n\n';
  assert.equal(parsePackResult(output), 'aios-lite-0.1.8.tgz');
});

test('resolveTarballFromDir detects latest tgz in directory', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-pack-dir-'));
  await fs.writeFile(path.join(dir, 'old.tgz'), 'x', 'utf8');
  await new Promise((resolve) => setTimeout(resolve, 20));
  await fs.writeFile(path.join(dir, 'new.tgz'), 'x', 'utf8');
  const result = await resolveTarballFromDir(dir);
  assert.equal(result, 'new.tgz');
});

test('test:package supports dry-run planning mode', async () => {
  const { t } = createTranslator('en');
  const result = await runPackageTest({
    args: ['.'],
    options: { 'dry-run': true, json: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(Array.isArray(result.steps), true);
  assert.equal(result.steps.includes('dry-run:plan-only'), true);
});
