'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('package exposes both aios and aioson CLI bins', () => {
  assert.equal(pkg.bin.aios, 'bin/aioson.js');
  assert.equal(pkg.bin['aioson'], 'bin/aioson.js');
});

test('package bounds Node test concurrency for subprocess-heavy Windows runs', () => {
  assert.equal(
    pkg.scripts.test,
    'node --require ./tests/setup/windows-fs-retries.js --test --test-concurrency=8'
  );
});
