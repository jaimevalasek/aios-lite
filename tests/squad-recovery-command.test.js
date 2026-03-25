'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runSquadRecovery } = require('../src/commands/squad-recovery');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-rec-cmd-'));
}

function makeLogger() {
  const lines = [];
  const errors = [];
  return {
    log: (msg) => lines.push(msg),
    error: (msg) => errors.push(msg),
    lines,
    errors
  };
}

async function writeManifest(tmpDir, squadSlug, data) {
  const dir = path.join(tmpDir, '.aioson', 'squads', squadSlug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'squad.manifest.json'), JSON.stringify(data), 'utf8');
}

// --- basic generation ---

test('runSquadRecovery generates recovery context and logs path', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'odonto', { goal: 'test', executors: [] });
    const logger = makeLogger();
    const result = await runSquadRecovery({
      args: [tmpDir],
      options: { squad: 'odonto', agent: 'writer' },
      logger
    });
    assert.equal(result.ok, true);
    assert.ok(logger.lines.some(l => l.includes('recovery-context') || l.includes('Recovery')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadRecovery logs token count in output', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'odonto', { goal: 'test', executors: [] });
    const logger = makeLogger();
    await runSquadRecovery({
      args: [tmpDir],
      options: { squad: 'odonto', agent: 'writer' },
      logger
    });
    assert.ok(logger.lines.some(l => l.includes('token') || l.includes('~')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- --show flag ---

test('runSquadRecovery --show prints content to logger', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'alpha', {
      goal: 'Launch product',
      executors: [{ slug: 'writer', title: 'Writer', role: 'Writes docs' }]
    });
    const logger = makeLogger();
    await runSquadRecovery({
      args: [tmpDir],
      options: { squad: 'alpha', agent: 'writer', show: true },
      logger
    });
    const output = logger.lines.join('\n');
    assert.ok(output.includes('alpha') || output.includes('writer') || output.includes('Recovery'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- missing args ---

test('runSquadRecovery returns ok:false when squad is missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = makeLogger();
    const result = await runSquadRecovery({
      args: [tmpDir],
      options: { agent: 'writer' },
      logger
    });
    assert.equal(result.ok, false);
    assert.ok(logger.errors.length > 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadRecovery returns ok:false when agent is missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = makeLogger();
    const result = await runSquadRecovery({
      args: [tmpDir],
      options: { squad: 'odonto' },
      logger
    });
    assert.equal(result.ok, false);
    assert.ok(logger.errors.length > 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadRecovery works without manifest file (best-effort)', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = makeLogger();
    const result = await runSquadRecovery({
      args: [tmpDir],
      options: { squad: 'no-manifest-squad', agent: 'writer' },
      logger
    });
    // generateRecovery is best-effort and does not throw when manifest is absent
    assert.equal(result.ok, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
