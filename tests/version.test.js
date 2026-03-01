'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getCliVersion, getCliVersionSync, parseVersionFromPackageJson } = require('../src/version');

test('parseVersionFromPackageJson returns fallback for invalid payloads', () => {
  assert.equal(parseVersionFromPackageJson(''), '0.0.0');
  assert.equal(parseVersionFromPackageJson('{'), '0.0.0');
  assert.equal(parseVersionFromPackageJson('{}'), '0.0.0');
});

test('version readers return a non-empty version string', async () => {
  const syncVersion = getCliVersionSync();
  const asyncVersion = await getCliVersion();

  assert.equal(typeof syncVersion, 'string');
  assert.equal(syncVersion.length > 0, true);
  assert.equal(asyncVersion, syncVersion);
});
