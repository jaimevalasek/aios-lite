'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runSquadValidate } = require('../src/commands/squad-validate');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-validate-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

async function createValidSquad(dir, slug) {
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
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
      { slug: 'orquestrador', role: 'Coordinates', file: `.aioson/squads/${slug}/agents/orquestrador.md` },
      { slug: 'writer', role: 'Writes content', file: `.aioson/squads/${slug}/agents/writer.md`, skills: ['copywriting'] }
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
  const squadDir = path.join(dir, '.aioson', 'squads', 'bad');
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
  const squadDir = path.join(dir, '.aioson', 'squads', 'missing-exec');
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', 'missing-exec'), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0', slug: 'missing-exec', name: 'Test',
    mode: 'content', mission: 'Test', goal: 'Test',
    executors: [
      { slug: 'orquestrador', role: 'Coord', file: `.aioson/squads/missing-exec/agents/orquestrador.md` },
      { slug: 'ghost', role: 'Missing', file: `.aioson/squads/missing-exec/agents/ghost.md` }
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

// --- Fase 2: Semantic deep tests ---

test('semantic deep - slug mismatch', async () => {
  const dir = await makeTempDir();
  const slug = 'correct-slug';
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', slug), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0', slug: 'wrong-slug', name: 'Test',
    mode: 'content', mission: 'Test', goal: 'Test', executors: [
      { slug: 'orquestrador', role: 'Coord', file: `.aioson/squads/${slug}/agents/orquestrador.md`, skills: ['s1'] }
    ]
  };
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: slug }, logger });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('Slug mismatch')));
});

test('semantic deep - executor references undeclared skill', async () => {
  const dir = await makeTempDir();
  const slug = 'skill-ref-squad';
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', slug), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0', slug, name: 'Test',
    mode: 'content', mission: 'Test', goal: 'Test',
    skills: [{ slug: 'declared-skill' }],
    executors: [
      { slug: 'orquestrador', role: 'Coord', file: `.aioson/squads/${slug}/agents/orquestrador.md`, skills: ['undeclared-skill'] }
    ]
  };
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: slug }, logger });
  assert.ok(result.warnings.some(w => w.includes('undeclared-skill')));
});

test('semantic deep - content blueprint with no sections warns', async () => {
  const dir = await makeTempDir();
  const slug = 'no-sections-squad';
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', slug), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0', slug, name: 'Test',
    mode: 'content', mission: 'Test', goal: 'Test',
    executors: [
      { slug: 'orquestrador', role: 'Coord', file: `.aioson/squads/${slug}/agents/orquestrador.md`, skills: ['s1'] }
    ],
    contentBlueprints: [{ slug: 'empty-bp', contentType: 'article', layoutType: 'document', sections: [] }]
  };
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: slug }, logger });
  assert.ok(result.warnings.some(w => w.includes('no sections')));
});

test('semantic deep - readiness contradiction warns', async () => {
  const dir = await makeTempDir();
  const slug = 'readiness-squad';
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', slug), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0', slug, name: 'Test',
    mode: 'content', mission: 'Test', goal: 'Test',
    executors: [
      { slug: 'orquestrador', role: 'Coord', file: `.aioson/squads/${slug}/agents/orquestrador.md`, skills: ['s1'] }
    ],
    readiness: { contextReady: { status: 'ready', blocker: 'missing docs' } }
  };
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: slug }, logger });
  assert.ok(result.warnings.some(w => w.includes('blocker')));
});

// --- Fase 4: Legacy squad handling ---

test('validate handles squad without manifest gracefully', async () => {
  const dir = await makeTempDir();
  const slug = 'legacy-squad';
  // Create squad directory structure without manifest
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'writer.md'), '# Writer\n');
  // NO squad.manifest.json
  const logger = createCollectLogger();
  const result = await runSquadValidate({ args: [dir], options: { squad: slug }, logger });
  // Should fail gracefully — not throw
  assert.ok(!result.valid);
  assert.ok(result.errors.length > 0);
  // Error should mention manifest not found
  assert.ok(result.errors.some(e => e.includes('Manifest') || e.includes('manifest') || e.includes('invalid')));
});
