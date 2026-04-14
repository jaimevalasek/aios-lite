'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runInit } = require('../src/commands/init');
const { runInstall } = require('../src/commands/install');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-guidance-'));
}

function createCollectLogger() {
  const lines = [];
  return {
    lines,
    log(line) {
      lines.push(String(line));
    },
    error(line) {
      lines.push(String(line));
    }
  };
}

test('init prints agent onboarding hints and defaults tool to codex', async () => {
  const tempDir = await makeTempDir();
  const originalCwd = process.cwd();
  process.chdir(tempDir);

  try {
    const { t } = createTranslator('en');
    const logger = createCollectLogger();
    await runInit({
      args: ['demo-app'],
      options: { 'dry-run': true },
      logger,
      t
    });

    assert.equal(logger.lines.some((line) => line.includes('aioson agents')), true);
    assert.equal(
      logger.lines.some((line) =>
        line.includes('aioson agent:prompt setup --tool=codex')
      ),
      true
    );
  } finally {
    process.chdir(originalCwd);
  }
});

test('install prints agent onboarding hints and honors explicit --tool', async () => {
  const tempDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = createCollectLogger();

  await runInstall({
    args: [tempDir],
    options: { 'dry-run': true, tool: 'claude' },
    logger,
    t
  });

  assert.equal(
    logger.lines.some((line) => line.includes('aioson setup:context --defaults')),
    true
  );
  assert.equal(logger.lines.some((line) => line.includes('aioson agents')), true);
  assert.equal(
    logger.lines.some((line) =>
      line.includes('aioson agent:prompt setup --tool=claude')
    ),
    true
  );
});

test('init applies localized agent pack when --lang is provided', async () => {
  const tempDir = await makeTempDir();
  const originalCwd = process.cwd();
  process.chdir(tempDir);

  try {
    const { t } = createTranslator('en');
    const logger = createCollectLogger();
    const result = await runInit({
      args: ['demo-lang'],
      options: { lang: 'es' },
      logger,
      t
    });

    assert.equal(Boolean(result.localeApply), true);
    assert.equal(result.localeApply.locale, 'es');
    assert.equal(
      logger.lines.some((line) => line.includes('Interaction language synchronized: es')),
      true
    );

    const setupPath = path.join(tempDir, 'demo-lang/.aioson/agents/setup.md');
    const sourcePath = path.join(tempDir, 'demo-lang/.aioson/locales/en/agents/setup.md');
    const [setupContent, sourceContent] = await Promise.all([
      fs.readFile(setupPath, 'utf8'),
      fs.readFile(sourcePath, 'utf8')
    ]);
    assert.equal(setupContent, sourceContent);
  } finally {
    process.chdir(originalCwd);
  }
});

test('install applies localized agent pack when --lang is provided', async () => {
  const tempDir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = createCollectLogger();
  const result = await runInstall({
    args: [tempDir],
    options: { lang: 'pt-BR' },
    logger,
    t
  });

  assert.equal(Boolean(result.localeApply), true);
  assert.equal(result.localeApply.locale, 'pt-BR');
  assert.equal(
    logger.lines.some((line) => line.includes('Interaction language synchronized: pt-BR')),
    true
  );

  const setupPath = path.join(tempDir, '.aioson/agents/setup.md');
  const sourcePath = path.join(tempDir, '.aioson/locales/en/agents/setup.md');
  const [setupContent, sourceContent] = await Promise.all([
    fs.readFile(setupPath, 'utf8'),
    fs.readFile(sourcePath, 'utf8')
  ]);
  assert.equal(setupContent, sourceContent);
});
