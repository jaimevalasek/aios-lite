'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runSquadValidate } = require('../src/commands/squad-validate');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-squad-validate-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

async function createValidSquad(dir, slug) {
  const squadDir = path.join(dir, '.aios-lite', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', slug), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0',
    packageVersion: '1.0.0',
    slug,
    name: 'Test Squad',
    mode: 'content',
    mission: 'Test mission',
    goal: 'Test goal',
    executors: [
      { slug: 'orquestrador', role: 'Coordinates', file: `.aios-lite/squads/${slug}/agents/orquestrador.md` },
      { slug: 'writer', role: 'Writes content', file: `.aios-lite/squads/${slug}/agents/writer.md`, skills: ['copywriting'] }
    ]
  };

  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad Test\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Agent @orquestrador\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'writer.md'), '# Agent @writer\n');
  return manifest;
}

test('validates a correct squad', async () => {
  const dir = await makeTempDir();
  await createValidSquad(dir, 'test-squad');
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: 'test-squad' }, logger });
  assert.ok(result.valid);
  assert.equal(result.errors.length, 0);
});

test('fails on missing manifest', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: 'nonexistent' }, logger });
  assert.ok(!result.valid);
});

test('fails on missing required fields', async () => {
  const dir = await makeTempDir();
  const squadDir = path.join(dir, '.aios-lite', 'squads', 'bad');
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify({ slug: 'bad' }));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: 'bad' }, logger });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('Missing required field')));
});

test('warns on executor without skills', async () => {
  const dir = await makeTempDir();
  await createValidSquad(dir, 'warn-squad');
  // orquestrador has no skills — should warn
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: 'warn-squad' }, logger });
  assert.ok(result.valid); // still valid
  assert.ok(result.warnings.length > 0);
});

test('fails on missing executor file', async () => {
  const dir = await makeTempDir();
  const squadDir = path.join(dir, '.aios-lite', 'squads', 'missing-exec');
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', 'missing-exec'), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0', slug: 'missing-exec', name: 'Test',
    mode: 'content', mission: 'Test', goal: 'Test',
    executors: [
      { slug: 'orquestrador', role: 'Coord', file: `.aios-lite/squads/missing-exec/agents/orquestrador.md` },
      { slug: 'ghost', role: 'Missing', file: `.aios-lite/squads/missing-exec/agents/ghost.md` }
    ]
  };

  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  // ghost.md NOT created
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: 'missing-exec' }, logger });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('ghost')));
});
