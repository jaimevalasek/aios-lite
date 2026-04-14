'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readText(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('workspace @dev prompt stays in sync with pt-BR locale pack', () => {
  const base = readText('.aioson/agents/dev.md');
  const localized = readText('.aioson/locales/pt-BR/agents/dev.md');

  assert.equal(localized, base);
});

test('template @dev prompt stays in sync with pt-BR locale pack', () => {
  const base = readText('template/.aioson/agents/dev.md');
  const localized = readText('template/.aioson/locales/pt-BR/agents/dev.md');

  assert.equal(localized, base);
});
