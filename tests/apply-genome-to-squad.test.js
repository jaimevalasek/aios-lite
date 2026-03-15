'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { applyGenomeToExistingSquad } = require('../src/squads/apply-genome');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-apply-genome-'));
}

test('applyGenomeToExistingSquad persists bindings to blueprint, manifest and readiness', async () => {
  const projectRoot = await makeTempDir();
  const slug = 'content-lab';
  const squadDir = path.join(projectRoot, '.aioson', 'squads', slug);
  const designsDir = path.join(projectRoot, '.aioson', 'squads', '.designs');
  const manifestPath = path.join(squadDir, 'squad.manifest.json');
  const readinessPath = path.join(squadDir, 'docs', 'readiness.md');
  const blueprintPath = path.join(designsDir, `${slug}.blueprint.json`);

  await fs.mkdir(path.join(squadDir, 'docs'), { recursive: true });
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(designsDir, { recursive: true });

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        schemaVersion: '1.0.0',
        packageVersion: '1.0.0',
        slug,
        name: 'Content Lab',
        mode: 'content',
        mission: 'Generate strong content assets.',
        goal: 'Improve channel throughput.',
        executors: [
          {
            slug: 'writer',
            role: 'Writes content',
            file: `.aioson/squads/${slug}/agents/writer.md`,
            genomes: ['legacy-voice']
          },
          {
            slug: 'reviewer',
            role: 'Reviews content',
            file: `.aioson/squads/${slug}/agents/reviewer.md`
          }
        ]
      },
      null,
      2
    ),
    'utf8'
  );
  await fs.writeFile(
    blueprintPath,
    JSON.stringify(
      {
        id: 'bp-1',
        slug,
        name: 'Content Lab',
        problem: 'The team needs more consistent outputs.',
        goal: 'Improve channel throughput.',
        mode: 'content',
        executors: [
          { slug: 'writer', role: 'Writes content' },
          { slug: 'reviewer', role: 'Reviews content' }
        ],
        genomeBindings: {
          squad: ['existing-shared']
        }
      },
      null,
      2
    ),
    'utf8'
  );
  await fs.writeFile(readinessPath, '# Readiness\n\n- baseline\n', 'utf8');

  const result = await applyGenomeToExistingSquad({
    projectRoot,
    squadSlug: slug,
    squad: [{ slug: 'copywriting', priority: 115 }],
    executors: {
      writer: [{ slug: 'storytelling', priority: 130 }]
    }
  });

  assert.equal(result.squadSlug, slug);

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const blueprint = JSON.parse(await fs.readFile(blueprintPath, 'utf8'));
  const readiness = await fs.readFile(readinessPath, 'utf8');

  assert.deepEqual(manifest.genomes.squad.map((item) => item.slug), ['copywriting', 'existing-shared']);
  assert.deepEqual(manifest.genomes.executors.writer.map((item) => item.slug), ['storytelling', 'legacy-voice']);
  assert.deepEqual(
    manifest.executors.find((item) => item.slug === 'writer').genomes.map((item) => item.slug),
    ['storytelling', 'copywriting', 'existing-shared', 'legacy-voice']
  );
  assert.deepEqual(
    manifest.executors.find((item) => item.slug === 'reviewer').genomes.map((item) => item.slug),
    ['copywriting', 'existing-shared']
  );
  assert.deepEqual(blueprint.genomeBindings.executors.writer.map((item) => item.slug), ['storytelling', 'legacy-voice']);
  assert.match(readiness, /## Genome bindings/);
  assert.match(readiness, /### Squad-level/);
  assert.match(readiness, /- writer: storytelling, legacy-voice/);
});
