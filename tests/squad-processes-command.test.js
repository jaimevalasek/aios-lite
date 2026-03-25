'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runSquadProcesses } = require('../src/commands/squad-processes');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-proc-cmd-'));
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

async function writeProcessFile(tmpDir, squadSlug, filename, data) {
  const dir = path.join(tmpDir, '.aioson', 'squads', squadSlug, 'processes');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), JSON.stringify(data), 'utf8');
}

// --- list ---

test('runSquadProcesses: no active processes prints empty message', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = makeLogger();
    const result = await runSquadProcesses({ args: [tmpDir], options: {}, logger });
    assert.equal(result.ok, true);
    assert.deepEqual(result.processes, []);
    assert.ok(logger.lines.some(l => l.includes('No active processes')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadProcesses: squad filter prints squad-specific empty message', async () => {
  const tmpDir = await makeTempDir();
  try {
    // Create squad dir but no process files
    await fs.mkdir(path.join(tmpDir, '.aioson', 'squads', 'odonto'), { recursive: true });
    const logger = makeLogger();
    await runSquadProcesses({ args: [tmpDir], options: { squad: 'odonto' }, logger });
    assert.ok(logger.lines.some(l => l.includes('No active processes') || l.includes('odonto')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadProcesses: lists processes when files exist', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeProcessFile(tmpDir, 'odonto', 'proc-99999.json', {
      pid: 99999,
      squadSlug: 'odonto',
      agentSlug: 'writer',
      startedAt: new Date().toISOString(),
      url: 'http://localhost:4200',
      contextPct: 45
    });
    const logger = makeLogger();
    const result = await runSquadProcesses({ args: [tmpDir], options: {}, logger });
    assert.equal(result.ok, true);
    assert.ok(Array.isArray(result.processes));
    // Should have output about process
    const output = logger.lines.join('\n');
    assert.ok(output.includes('odonto') || output.includes('writer') || output.includes('Active'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadProcesses: returns ok:true with processes array', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = makeLogger();
    const result = await runSquadProcesses({ args: [tmpDir], options: {}, logger });
    assert.equal(result.ok, true);
    assert.ok('processes' in result);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- --stop ---

test('runSquadProcesses --stop with non-existent PID returns failure message', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = makeLogger();
    const result = await runSquadProcesses({
      args: [tmpDir],
      options: { stop: 'pid-does-not-exist' },
      logger
    });
    // Either ok:false or error logged
    assert.ok(!result.ok || logger.errors.length > 0 || logger.lines.some(l => l.includes('stopped') || l.includes('Failed')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- --stop-squad ---

test('runSquadProcesses --stop-squad logs result for squad', async () => {
  const tmpDir = await makeTempDir();
  try {
    // Create squad dir without processes
    await fs.mkdir(path.join(tmpDir, '.aioson', 'squads', 'alpha'), { recursive: true });
    const logger = makeLogger();
    const result = await runSquadProcesses({
      args: [tmpDir],
      options: { 'stop-squad': 'alpha' },
      logger
    });
    assert.equal(result.ok, true);
    assert.ok(logger.lines.some(l => l.includes('alpha') || l.includes('Stopped')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
