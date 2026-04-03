'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runRunnerDaemon } = require('../src/commands/runner-daemon');
const { openRuntimeDb } = require('../src/runtime-store');
const { ensureRunnerQueue, addTask, listTasks } = require('../src/runner/queue-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runner-daemon-'));
}

function makeLogger() {
  const lines = [];
  const errors = [];
  return {
    log: (msg = '') => lines.push(String(msg)),
    error: (msg = '') => errors.push(String(msg)),
    lines,
    errors
  };
}

// ── status: no runtime db ─────────────────────────────────────────────────

test('runner:daemon status: handles missing DB gracefully', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  const result = await runRunnerDaemon({
    args: [tmpDir, 'status'],
    options: { sub: 'status' },
    logger
  });
  assert.equal(result.ok, true);
  assert.ok(logger.lines.some((l) => l.includes('No runtime') || l.includes('stopped') || l.includes('not_initialized')));
});

// ── status: with runtime db ────────────────────────────────────────────────

test('runner:daemon status: shows queue stats', async () => {
  const tmpDir = await makeTempDir();

  // Create DB and add tasks
  const handle = await openRuntimeDb(tmpDir, {});
  ensureRunnerQueue(handle.db);
  addTask(handle.db, { task: 'Task A', agent: 'dev' });
  addTask(handle.db, { task: 'Task B', agent: 'dev' });
  handle.db.close();

  const logger = makeLogger();
  const result = await runRunnerDaemon({
    args: [tmpDir, 'status'],
    options: { sub: 'status' },
    logger
  });
  assert.equal(result.ok, true);
  assert.ok(result.stats.pending === 2);
});

// ── stop: no daemon running ────────────────────────────────────────────────

test('runner:daemon stop: graceful when no daemon running', async () => {
  const tmpDir = await makeTempDir();

  // Create DB
  const handle = await openRuntimeDb(tmpDir, {});
  handle.db.close();

  const logger = makeLogger();
  const result = await runRunnerDaemon({
    args: [tmpDir, 'stop'],
    options: { sub: 'stop' },
    logger
  });
  assert.equal(result.ok, true);
  assert.ok(logger.lines.some((l) => l.includes('not running')));
});

// ── stop: no runtime db ────────────────────────────────────────────────────

test('runner:daemon stop: error when no DB', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  const result = await runRunnerDaemon({
    args: [tmpDir, 'stop'],
    options: { sub: 'stop' },
    logger
  });
  assert.equal(result.ok, false);
  assert.ok(logger.errors.some((e) => e.includes('No runtime') || e.includes('database')));
});

// ── unknown subcommand ─────────────────────────────────────────────────────

test('runner:daemon: unknown subcommand returns ok=false', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  const result = await runRunnerDaemon({
    args: [tmpDir, 'bogus'],
    options: { sub: 'bogus' },
    logger
  });
  assert.equal(result.ok, false);
  assert.ok(logger.errors.some((e) => e.includes('Unknown subcommand')));
});
