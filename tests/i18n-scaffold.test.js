'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createLocaleScaffold } = require('../src/i18n/scaffold');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-i18n-'));
}

test('creates locale scaffold file for a valid locale', async () => {
  const dir = await makeTempDir();
  const result = await createLocaleScaffold('fr', { messagesDir: dir });

  assert.equal(result.locale, 'fr');
  assert.equal(result.overwritten, false);

  const filePath = path.join(dir, 'fr.js');
  const content = await fs.readFile(filePath, 'utf8');
  assert.equal(content.includes('TODO: Replace English strings with fr translations.'), true);
});

test('rejects invalid locale code', async () => {
  const dir = await makeTempDir();
  await assert.rejects(
    () => createLocaleScaffold('invalid_locale_format_xx_yy', { messagesDir: dir }),
    (error) => error && error.code === 'INVALID_LOCALE'
  );
});

test('rejects existing locale file when force is false', async () => {
  const dir = await makeTempDir();
  await createLocaleScaffold('de', { messagesDir: dir });

  await assert.rejects(
    () => createLocaleScaffold('de', { messagesDir: dir }),
    (error) => error && error.code === 'LOCALE_EXISTS'
  );
});

test('overwrites existing locale file when force is true', async () => {
  const dir = await makeTempDir();
  await createLocaleScaffold('it', { messagesDir: dir });
  const result = await createLocaleScaffold('it', { messagesDir: dir, force: true });

  assert.equal(result.overwritten, true);
});

