'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('package exposes both aios and aioson CLI bins', () => {
  assert.equal(pkg.bin.aios, 'bin/aioson.js');
  assert.equal(pkg.bin['aioson'], 'bin/aioson.js');
});
