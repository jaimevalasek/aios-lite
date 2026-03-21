'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { parseGenomeMarkdown } = require('../../src/genome-format');
const { readGenome, writeGenome } = require('../../src/genome-files');
const { applyGenomeToExistingSquad } = require('../../src/squads/apply-genome');

const FIXTURES_ROOT = path.join(__dirname, '..', '..', 'tests', 'fixtures');

async function ensureFixtureWorkspace(workspaceRoot) {
  const projectRoot = path.join(workspaceRoot, 'project');
  const genomeDir = path.join(projectRoot, '.aioson', 'genomes');
  const squadsDir = path.join(projectRoot, '.aioson', 'squads');

  await fs.mkdir(genomeDir, { recursive: true });
  await fs.mkdir(squadsDir, { recursive: true });

  const genomeFiles = ['legacy-genome.md', 'genome-2.0.md', 'genome-2.0.meta.json'];
  for (const fileName of genomeFiles) {
    await fs.copyFile(
      path.join(FIXTURES_ROOT, 'genomes', fileName),
      path.join(genomeDir, fileName)
    );
  }

  for (const squadName of ['squad-without-genome', 'squad-with-genome']) {
    await fs.cp(
      path.join(FIXTURES_ROOT, 'squads', squadName),
      path.join(squadsDir, squadName),
      { recursive: true }
    );
  }

  return projectRoot;
}

async function runGenome20SmokeTest(options = {}) {
  const workspaceRoot = options.workspaceRoot
    ? path.resolve(options.workspaceRoot)
    : await fs.mkdtemp(path.join(os.tmpdir(), 'aios-forge-genome-2-smoke-'));
  const projectRoot = await ensureFixtureWorkspace(workspaceRoot);
  const steps = [];

  const legacy = await readGenome(projectRoot, 'legacy-genome');
  assert.equal(legacy.genome.legacyFormat, true);
  assert.equal(legacy.meta.compat.synthesizedFromLegacy, true);
  steps.push('read:legacy-genome');

  const v2 = await readGenome(projectRoot, 'genome-2.0');
  assert.equal(v2.genome.format, 'genome-v2');
  assert.equal(v2.meta.schemaVersion, 2);
  steps.push('read:genome-2.0');

  const generatedInput = parseGenomeMarkdown(
    await fs.readFile(path.join(FIXTURES_ROOT, 'genomes', 'genome-2.0.md'), 'utf8')
  );
  const generated = await writeGenome(projectRoot, {
    ...generatedInput,
    genome: undefined,
    slug: 'genome-2-0-copy',
    domain: 'Revenue Operations Copy',
    generated: '2026-03-11'
  });
  const generatedMarkdown = await fs.readFile(generated.paths.markdownPath, 'utf8');
  assert.match(generatedMarkdown, /format: genome-v2/);
  assert.match(generatedMarkdown, /evidence_mode: hybrid/);
  steps.push('write:genome-2.0');

  const applied = await applyGenomeToExistingSquad({
    projectRoot,
    squadSlug: 'squad-without-genome',
    squad: [{ slug: 'genome-2.0', priority: 120 }],
    executors: {
      writer: [{ slug: 'legacy-genome', priority: 130 }]
    }
  });
  const manifestPath = path.join(projectRoot, '.aioson', 'squads', 'squad-without-genome', 'squad.manifest.json');
  const readinessPath = path.join(projectRoot, '.aioson', 'squads', 'squad-without-genome', 'docs', 'readiness.md');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const readiness = await fs.readFile(readinessPath, 'utf8');
  assert.deepEqual(applied.genomeBindings.squad.map((item) => item.slug), ['genome-2-0']);
  assert.equal(manifest.genomeBindings.squad[0].slug, 'genome-2-0');
  assert.deepEqual(
    manifest.executors.find((item) => item.slug === 'writer').genomes.map((item) => item.slug),
    ['legacy-genome', 'genome-2-0']
  );
  assert.match(readiness, /## Genome bindings/);
  steps.push('bind:squad-without-genome');

  return {
    ok: true,
    workspaceRoot,
    projectRoot,
    steps,
    legacySlug: legacy.genome.slug,
    v2Slug: v2.genome.slug,
    generatedSlug: generated.genome.slug
  };
}

if (require.main === module) {
  runGenome20SmokeTest({ workspaceRoot: process.argv[2] })
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  ensureFixtureWorkspace,
  runGenome20SmokeTest
};
