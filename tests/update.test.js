'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { installTemplate } = require('../src/installer');
const { createTranslator } = require('../src/i18n');
const { runUpdate } = require('../src/commands/update');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-update-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

test('update reapplies active agent locale from project context', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  const contextContent = `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
conversation_language: "es"
aioson_version: "0.1.8"
---

# Project Context
`;
  await fs.writeFile(contextPath, contextContent, 'utf8');

  const { t } = createTranslator('en');
  const logger = createQuietLogger();
  const result = await runUpdate({
    args: [dir],
    options: {},
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(Boolean(result.localeSync), true);
  assert.equal(result.localeSync.locale, 'es');

  const setupPath = path.join(dir, '.aioson/agents/setup.md');
  const setupContent = await fs.readFile(setupPath, 'utf8');
  assert.equal(setupContent.includes('(es)'), true);
});

test('update honors explicit --lang override for locale synchronization', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  const contextContent = `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
conversation_language: "es"
aioson_version: "0.1.9"
---

# Project Context
`;
  await fs.writeFile(contextPath, contextContent, 'utf8');

  const { t } = createTranslator('en');
  const logger = createQuietLogger();
  const result = await runUpdate({
    args: [dir],
    options: { lang: 'fr' },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(Boolean(result.localeSync), true);
  assert.equal(result.localeSync.locale, 'fr');

  const setupPath = path.join(dir, '.aioson/agents/setup.md');
  const setupContent = await fs.readFile(setupPath, 'utf8');
  assert.equal(setupContent.includes('(fr)'), true);
});

test('update --dry-run with --lang plans locale sync without mutating files', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  const contextContent = `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
conversation_language: "en"
aioson_version: "0.1.9"
---

# Project Context
`;
  await fs.writeFile(contextPath, contextContent, 'utf8');

  const setupPath = path.join(dir, '.aioson/agents/setup.md');
  const before = await fs.readFile(setupPath, 'utf8');

  const { t } = createTranslator('en');
  const logger = createQuietLogger();
  const result = await runUpdate({
    args: [dir],
    options: { 'dry-run': true, lang: 'pt-BR' },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(Boolean(result.localeSync), true);
  assert.equal(result.localeSync.locale, 'pt-BR');
  assert.equal(result.localeSync.dryRun, true);

  const after = await fs.readFile(setupPath, 'utf8');
  assert.equal(after, before);
});
