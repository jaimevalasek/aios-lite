'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { migrateGenomeFile } = require('../src/lib/genomes/migrate');
const { repairSquadManifestGenomeBindings } = require('../src/lib/squads/genome-repair');

const LEGACY_FIXTURE = `---
genome: legacy-style
type: domain
---

# Genome: Legacy Style

## O que saber

- Teste
`;

test('migrateGenomeFile in dry-run does not change the file', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-genome-migrate-'));
  const target = path.join(tempDir, 'legacy.md');
  await fs.writeFile(target, LEGACY_FIXTURE, 'utf8');

  const result = await migrateGenomeFile(target, { dryRun: true, write: false });
  const after = await fs.readFile(target, 'utf8');

  assert.equal(result.changed, true);
  assert.equal(result.migrated, true);
  assert.equal(after, LEGACY_FIXTURE);
});

test('repairSquadManifestGenomeBindings in dry-run does not rewrite manifest', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-repair-'));
  const manifestPath = path.join(tempDir, 'squad.manifest.json');
  const raw = JSON.stringify(
    {
      slug: 'legacy-squad',
      genomes: ['growth-marketing'],
      executors: [
        {
          slug: 'writer',
          genomes: ['copywriter-direct-response']
        }
      ]
    },
    null,
    2
  );
  await fs.writeFile(manifestPath, raw, 'utf8');

  const result = await repairSquadManifestGenomeBindings(manifestPath, { dryRun: true, write: false });
  const after = await fs.readFile(manifestPath, 'utf8');

  assert.equal(result.changed, true);
  assert.equal(typeof result.after.genomeBindings, 'object');
  assert.equal(after, raw);
});
