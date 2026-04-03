'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { importFromPlan } = require('../src/runner/plan-importer');
const { runRunnerPlan } = require('../src/commands/runner-plan');
const { openRuntimeDb } = require('../src/runtime-store');
const { ensureRunnerQueue, listTasks } = require('../src/runner/queue-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runner-plan-'));
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

async function writePlan(tmpDir, slug, content) {
  const contextDir = path.join(tmpDir, '.aioson', 'context');
  await fs.mkdir(contextDir, { recursive: true });
  await fs.writeFile(path.join(contextDir, `implementation-plan-${slug}.md`), content, 'utf8');
}

const SAMPLE_PLAN = `
# Implementation Plan — checkout

## Phase 1 — Create migration for orders table

Add a new migration file.

## Phase 2 — Implement OrderService

Create service with CRUD methods.

## Phase 3 - Add unit tests for OrderService

Write tests using node:test.

## Phase 4: Update API routes

Wire up /orders endpoints.
`;

// ── importFromPlan unit tests ──────────────────────────────────────────────

test('importFromPlan: extracts phases with — separator', async () => {
  const tmpDir = await makeTempDir();
  await writePlan(tmpDir, 'checkout', SAMPLE_PLAN);
  const { tasks } = await importFromPlan(tmpDir, 'checkout');
  assert.ok(tasks.length >= 2);
  assert.ok(tasks.some((t) => t.task.includes('Create migration')));
  assert.ok(tasks.some((t) => t.task.includes('Implement OrderService')));
});

test('importFromPlan: extracts phases with - separator', async () => {
  const tmpDir = await makeTempDir();
  await writePlan(tmpDir, 'checkout', SAMPLE_PLAN);
  const { tasks } = await importFromPlan(tmpDir, 'checkout');
  assert.ok(tasks.some((t) => t.task.includes('Add unit tests')));
});

test('importFromPlan: extracts phases with : separator', async () => {
  const tmpDir = await makeTempDir();
  await writePlan(tmpDir, 'checkout', SAMPLE_PLAN);
  const { tasks } = await importFromPlan(tmpDir, 'checkout');
  assert.ok(tasks.some((t) => t.task.includes('Update API routes')));
});

test('importFromPlan: uses provided agent', async () => {
  const tmpDir = await makeTempDir();
  await writePlan(tmpDir, 'checkout', SAMPLE_PLAN);
  const { tasks } = await importFromPlan(tmpDir, 'checkout', { agent: 'qa' });
  assert.ok(tasks.every((t) => t.agent === 'qa'));
});

test('importFromPlan: throws if plan not found', async () => {
  const tmpDir = await makeTempDir();
  await assert.rejects(
    () => importFromPlan(tmpDir, 'nonexistent'),
    (err) => err.message.includes('not found')
  );
});

test('importFromPlan: all tasks have pending status', async () => {
  const tmpDir = await makeTempDir();
  await writePlan(tmpDir, 'checkout', SAMPLE_PLAN);
  const { tasks } = await importFromPlan(tmpDir, 'checkout');
  assert.ok(tasks.every((t) => t.status === 'pending'));
});

// ── runner:plan command tests ──────────────────────────────────────────────

test('runner:plan: requires --slug', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  const result = await runRunnerPlan({ args: [tmpDir], options: {}, logger });
  assert.equal(result.ok, false);
  assert.ok(logger.errors.some((e) => e.includes('--slug')));
});

test('runner:plan: error when plan not found', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  const result = await runRunnerPlan({ args: [tmpDir], options: { slug: 'missing' }, logger });
  assert.equal(result.ok, false);
  assert.ok(logger.errors.length > 0);
});

test('runner:plan: imports phases into queue', async () => {
  const tmpDir = await makeTempDir();
  await writePlan(tmpDir, 'checkout', SAMPLE_PLAN);
  const logger = makeLogger();
  const result = await runRunnerPlan({ args: [tmpDir], options: { slug: 'checkout', agent: 'dev' }, logger });
  assert.equal(result.ok, true);
  assert.ok(result.tasks.length >= 2);
  assert.ok(logger.lines.some((l) => l.includes('Imported')));

  // Verifica que tasks foram salvas no SQLite
  const handle = await openRuntimeDb(tmpDir, { mustExist: true });
  ensureRunnerQueue(handle.db);
  const tasks = listTasks(handle.db);
  handle.db.close();
  assert.ok(tasks.length >= 2);
  assert.ok(tasks.some((t) => t.task.includes('Create migration')));
});

test('runner:plan: logs "Run with" hint', async () => {
  const tmpDir = await makeTempDir();
  await writePlan(tmpDir, 'checkout', SAMPLE_PLAN);
  const logger = makeLogger();
  await runRunnerPlan({ args: [tmpDir], options: { slug: 'checkout' }, logger });
  assert.ok(logger.lines.some((l) => l.includes('runner:queue run')));
});
