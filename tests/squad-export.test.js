'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { runSquadExport } = require('../src/commands/squad-export');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-squad-export-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

async function createMinimalSquad(dir, slug) {
  const squadDir = path.join(dir, '.aios-lite', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify({ slug, name: 'Test', mode: 'content', mission: 'Test', goal: 'Test', schemaVersion: '1.0.0' }));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
}

function tarAvailable() {
  try { execSync('tar --version', { stdio: 'pipe' }); return true; } catch { return false; }
}

test('exports valid squad to tar.gz', { skip: !tarAvailable() }, async () => {
  const dir = await makeTempDir();
  await createMinimalSquad(dir, 'my-squad');
  const logger = createCollectLogger();
  const result = await runSquadExport({ args: [dir], options: { squad: 'my-squad' }, logger });
  assert.ok(result.ok);
  const outputFile = path.join(dir, '.aios-lite', 'squads', 'exports', 'my-squad.aios-squad.tar.gz');
  const stat = await fs.stat(outputFile);
  assert.ok(stat.size > 0, 'Export file should have content');
});

test('fails on nonexistent squad', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await runSquadExport({ args: [dir], options: { squad: 'ghost' }, logger });
  assert.ok(!result.ok);
  assert.ok(result.error.includes('not found'));
});

test('fails when no slug provided', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await runSquadExport({ args: [dir], options: {}, logger });
  assert.ok(!result.ok);
  assert.ok(result.error.includes('No slug'));
});
