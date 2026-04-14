'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runSmokeTest } = require('../src/commands/smoke');
const { validateProjectContextFile } = require('../src/context');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-smoke-test-'));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readRepoTemplate(relPath) {
  return fs.readFile(path.resolve(__dirname, '..', 'template', relPath), 'utf8');
}

test('test:smoke runs end-to-end and keeps workspace when requested', async () => {
  const baseDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = { log() {}, error() {} };

  const result = await runSmokeTest({
    args: [baseDir],
    options: { lang: 'pt-BR', keep: true },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.steps.length >= 8, true);
  assert.equal(await fileExists(path.join(result.projectDir, '.aioson/context/project.context.md')), true);

  await fs.rm(result.workspaceRoot, { recursive: true, force: true });
});

test('test:smoke supports web3 profiles for ethereum, solana, and cardano', async () => {
  const baseDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = { log() {}, error() {} };

  for (const target of ['ethereum', 'solana', 'cardano']) {
    const result = await runSmokeTest({
      args: [baseDir],
      options: { web3: target, keep: true },
      logger,
      t
    });

    assert.equal(result.ok, true);
    assert.equal(result.web3Target, target);

    const context = await validateProjectContextFile(result.projectDir);
    assert.equal(context.valid, true);
    assert.equal(context.data.project_type, 'dapp');
    assert.equal(context.data.web3_enabled, true);
    assert.equal(String(context.data.web3_networks).includes(target), true);

    await fs.rm(result.workspaceRoot, { recursive: true, force: true });
  }
});

test('test:smoke supports mixed Web2+Web3 monorepo profile', async () => {
  const baseDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = { log() {}, error() {} };

  const result = await runSmokeTest({
    args: [baseDir],
    options: { profile: 'mixed', keep: true },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.profile, 'mixed');
  assert.equal(result.steps.includes('seed:mixed'), true);
  assert.equal(result.steps.includes('verify:mixed-context'), true);

  const context = await validateProjectContextFile(result.projectDir);
  assert.equal(context.valid, true);
  assert.equal(context.data.project_type, 'dapp');
  assert.equal(context.data.web3_enabled, true);

  await fs.rm(result.workspaceRoot, { recursive: true, force: true });
});

test('test:smoke supports parallel orchestration profile', async () => {
  const baseDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = { log() {}, error() {} };

  const result = await runSmokeTest({
    args: [baseDir],
    options: { profile: 'parallel', keep: true },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.profile, 'parallel');
  assert.equal(result.steps.includes('parallel:init'), true);
  assert.equal(result.steps.includes('parallel:assign'), true);
  assert.equal(result.steps.includes('parallel:status'), true);
  assert.equal(result.steps.includes('parallel:doctor'), true);

  await fs.rm(result.workspaceRoot, { recursive: true, force: true });
});

test('test:smoke keeps canonical prompts while preserving requested interaction language', async () => {
  const baseDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = { log() {}, error() {} };

  const checks = ['es', 'fr'];

  for (const check of checks) {
    const result = await runSmokeTest({
      args: [baseDir],
      options: { lang: check, keep: true },
      logger,
      t
    });

    assert.equal(result.ok, true);
    assert.equal(result.language, check);
    assert.equal(
      await fs.readFile(path.join(result.projectDir, '.aioson/agents/setup.md'), 'utf8'),
      await readRepoTemplate('.aioson/agents/setup.md')
    );

    const context = await validateProjectContextFile(result.projectDir);
    assert.equal(context.valid, true);
    assert.equal(context.data.interaction_language, check);
    assert.equal(context.data.conversation_language, check);

    await fs.rm(result.workspaceRoot, { recursive: true, force: true });
  }
});

test('test:smoke rejects invalid web3 target', async () => {
  const baseDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = { log() {}, error() {} };

  await assert.rejects(
    runSmokeTest({
      args: [baseDir],
      options: { web3: 'bitcoin' },
      logger,
      t
    }),
    /Invalid --web3 target/
  );
});

test('test:smoke rejects invalid profile', async () => {
  const baseDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = { log() {}, error() {} };

  await assert.rejects(
    runSmokeTest({
      args: [baseDir],
      options: { profile: 'hybrid-plus' },
      logger,
      t
    }),
    /Invalid --profile value/
  );
});
