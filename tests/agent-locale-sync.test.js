'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readText(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('workspace @dev prompt stays in sync with the canonical template prompt', () => {
  const workspace = readText('.aioson/agents/dev.md');
  const template = readText('template/.aioson/agents/dev.md');

  assert.equal(workspace, template);
});

test('workspace @setup prompt stays in sync with the canonical template prompt', () => {
  const workspace = readText('.aioson/agents/setup.md');
  const template = readText('template/.aioson/agents/setup.md');

  assert.equal(workspace, template);
});
