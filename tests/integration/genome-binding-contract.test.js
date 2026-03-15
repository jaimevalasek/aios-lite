'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ensureFixtureWorkspace } = require('../../scripts/smoke/genome-2.0-smoke');
const { applyGenomeToExistingSquad } = require('../../src/squads/apply-genome');
const { readGenome } = require('../../src/genome-files');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-genome-contract-'));
}

test('genome binding contract stays readable across legacy and v2 persisted formats', async () => {
  const workspaceRoot = await makeTempDir();
  const projectRoot = await ensureFixtureWorkspace(workspaceRoot);

  const legacy = await readGenome(projectRoot, 'legacy-genome');
  const modern = await readGenome(projectRoot, 'genome-2.0');
  assert.equal(legacy.meta.compat.synthesizedFromLegacy, true);
  assert.equal(modern.meta.compat.synthesizedFromLegacy, false);

  await applyGenomeToExistingSquad({
    projectRoot,
    squadSlug: 'squad-without-genome',
    squad: [{ slug: 'genome-2.0', priority: 115 }],
    executors: {
      writer: [{ slug: 'legacy-genome', priority: 125 }]
    }
  });

  const manifestPath = path.join(projectRoot, '.aioson', 'squads', 'squad-without-genome', 'squad.manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const writer = manifest.executors.find((item) => item.slug === 'writer');

  assert.equal(Array.isArray(manifest.genomes.squad), true);
  assert.equal(Array.isArray(manifest.genomeBindings.squad), true);
  assert.equal(manifest.genomeBindings.squad[0].slug, 'genome-2-0');
  assert.equal(Array.isArray(manifest.genomeBindings.executors.writer), true);
  assert.equal(manifest.genomeBindings.executors.writer[0].slug, 'legacy-genome');
  assert.deepEqual(
    writer.genomes.map((item) => item.slug),
    ['legacy-genome', 'genome-2-0']
  );

  await fs.rm(workspaceRoot, { recursive: true, force: true });
});
