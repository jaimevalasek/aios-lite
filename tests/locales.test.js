'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  resolveAgentLocale,
  getLocalizedAgentPath,
  applyAgentLocale
} = require('../src/locales');
const { installTemplate } = require('../src/installer');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-locales-'));
}

async function readRepoTemplate(relPath) {
  return fs.readFile(path.resolve(__dirname, '..', 'template', relPath), 'utf8');
}

test('resolveAgentLocale maps base language and fallback correctly', () => {
  assert.equal(resolveAgentLocale('pt'), 'pt-BR');
  assert.equal(resolveAgentLocale('pt-BR'), 'pt-BR');
  assert.equal(resolveAgentLocale('es-MX'), 'es');
  assert.equal(resolveAgentLocale('fr_CA'), 'fr');
  assert.equal(resolveAgentLocale('en-US'), 'en');
  assert.equal(resolveAgentLocale('unknown'), 'en');
});

test('getLocalizedAgentPath builds expected path', () => {
  assert.equal(
    getLocalizedAgentPath('setup', 'pt-BR'),
    '.aioson/locales/pt-BR/agents/setup.md'
  );
});

test('applyAgentLocale copies localized files into active agents directory', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const result = await applyAgentLocale(dir, 'pt-BR');
  assert.equal(result.locale, 'pt-BR');
  assert.equal(result.promptLocale, 'en');
  assert.equal(result.copied.length > 0, true);

  const setupPath = path.join(dir, '.aioson/agents/setup.md');
  const sourcePath = path.join(dir, '.aioson/locales/en/agents/setup.md');
  const [content, sourceContent] = await Promise.all([
    fs.readFile(setupPath, 'utf8'),
    fs.readFile(sourcePath, 'utf8')
  ]);
  assert.equal(content, sourceContent);
});

test('applyAgentLocale preserves requested interaction tags while restoring canonical prompts', async () => {
  const esDir = await makeTempDir();
  await installTemplate(esDir, { mode: 'install' });

  const esResult = await applyAgentLocale(esDir, 'es-MX');
  assert.equal(esResult.locale, 'es-MX');
  assert.equal(esResult.promptLocale, 'en');
  assert.equal(esResult.copied.length > 0, true);
  const esSetupPath = path.join(esDir, '.aioson/agents/setup.md');
  const esSourcePath = path.join(esDir, '.aioson/locales/en/agents/setup.md');
  const [esContent, esSourceContent] = await Promise.all([
    fs.readFile(esSetupPath, 'utf8'),
    fs.readFile(esSourcePath, 'utf8')
  ]);
  assert.equal(esContent, esSourceContent);

  const frDir = await makeTempDir();
  await installTemplate(frDir, { mode: 'install' });

  const frResult = await applyAgentLocale(frDir, 'fr-CA');
  assert.equal(frResult.locale, 'fr-CA');
  assert.equal(frResult.promptLocale, 'en');
  assert.equal(frResult.copied.length > 0, true);
  const frSetupPath = path.join(frDir, '.aioson/agents/setup.md');
  const frSourcePath = path.join(frDir, '.aioson/locales/en/agents/setup.md');
  const [frContent, frSourceContent] = await Promise.all([
    fs.readFile(frSetupPath, 'utf8'),
    fs.readFile(frSourcePath, 'utf8')
  ]);
  assert.equal(frContent, frSourceContent);
});

test('applyAgentLocale falls back to canonical base prompts when english locale file is only a wrapper', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  await applyAgentLocale(dir, 'en');

  const neoPath = path.join(dir, '.aioson/agents/neo.md');
  const orachePath = path.join(dir, '.aioson/agents/orache.md');
  const [neoContent, oracheContent, neoSource, oracheSource] = await Promise.all([
    fs.readFile(neoPath, 'utf8'),
    fs.readFile(orachePath, 'utf8'),
    readRepoTemplate('.aioson/agents/neo.md'),
    readRepoTemplate('.aioson/agents/orache.md')
  ]);

  assert.equal(neoContent, neoSource);
  assert.equal(oracheContent, oracheSource);
});
