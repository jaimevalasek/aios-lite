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
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-locales-'));
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
    '.aios-lite/locales/pt-BR/agents/setup.md'
  );
});

test('applyAgentLocale copies localized files into active agents directory', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const result = await applyAgentLocale(dir, 'pt-BR');
  assert.equal(result.locale, 'pt-BR');
  assert.equal(result.copied.length > 0, true);

  const setupPath = path.join(dir, '.aios-lite/agents/setup.md');
  const content = await fs.readFile(setupPath, 'utf8');
  assert.equal(content.includes('(pt-BR)'), true);
});

test('applyAgentLocale copies spanish and french localized files', async () => {
  const esDir = await makeTempDir();
  await installTemplate(esDir, { mode: 'install' });

  const esResult = await applyAgentLocale(esDir, 'es-MX');
  assert.equal(esResult.locale, 'es');
  assert.equal(esResult.copied.length > 0, true);
  const esSetupPath = path.join(esDir, '.aios-lite/agents/setup.md');
  const esContent = await fs.readFile(esSetupPath, 'utf8');
  assert.equal(esContent.includes('(es)'), true);

  const frDir = await makeTempDir();
  await installTemplate(frDir, { mode: 'install' });

  const frResult = await applyAgentLocale(frDir, 'fr-CA');
  assert.equal(frResult.locale, 'fr');
  assert.equal(frResult.copied.length > 0, true);
  const frSetupPath = path.join(frDir, '.aios-lite/agents/setup.md');
  const frContent = await fs.readFile(frSetupPath, 'utf8');
  assert.equal(frContent.includes('(fr)'), true);
});
