'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runGenome20SmokeTest } = require('../../scripts/smoke/genome-2.0-smoke');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-genome-2-smoke-test-'));
}

test('genome 2.0 smoke script validates legacy read, v2 write and squad binding', async () => {
  const workspaceRoot = await makeTempDir();
  const result = await runGenome20SmokeTest({ workspaceRoot });

  assert.equal(result.ok, true);
  assert.deepEqual(result.steps, [
    'read:legacy-genome',
    'read:genome-2.0',
    'write:genome-2.0',
    'bind:squad-without-genome'
  ]);

  await fs.rm(workspaceRoot, { recursive: true, force: true });
});
