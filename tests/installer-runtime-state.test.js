'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldSkipTemplatePath } = require('../src/installer');

test('template runtime state is never installed: a stray aios.sqlite under template/.aioson/runtime cannot clobber a project database', () => {
  assert.equal(shouldSkipTemplatePath('.aioson/runtime'), 'runtime-state');
  assert.equal(shouldSkipTemplatePath('.aioson/runtime/aios.sqlite'), 'runtime-state');
  assert.equal(shouldSkipTemplatePath('.aioson/runtime/live/session.json'), 'runtime-state');
  assert.equal(shouldSkipTemplatePath('.aioson/runtime/.sessions/abc.json'), 'runtime-state');
  // Profile filtering never reaches runtime paths: the skip is unconditional.
  assert.equal(shouldSkipTemplatePath('.aioson/runtime/aios.sqlite', 'developer'), 'runtime-state');
});

test('the runtime skip does not widen: neighbouring template paths keep their existing verdicts', () => {
  assert.equal(shouldSkipTemplatePath('.aioson/runtime-notes.md'), false);
  assert.equal(shouldSkipTemplatePath('.aioson/context/.gitkeep'), false);
  assert.equal(shouldSkipTemplatePath('.aioson/context/prd.md'), 'context-protected');
  assert.equal(shouldSkipTemplatePath('.gitignore'), 'merge-only');
  assert.equal(shouldSkipTemplatePath('.aioson/agents/dev.md'), false);
});
