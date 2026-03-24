'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runImplementationPlan, handleShow, handleStatus, handleCheckpoint, handleStale, handleRegister } = require('../src/commands/implementation-plan');
const {
  openRuntimeDb,
  listImplementationPlans,
  getPlanPhases
} = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-impl-plan-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

function identity(key) { return key; }

const PLAN_CONTENT = [
  '---',
  'status: draft',
  'classification: MEDIUM',
  'created: 2026-01-01T00:00:00Z',
  '---',
  '# Implementation Plan',
  '',
  '### Fase 1: Setup',
  'Do setup things.',
  '',
  '### Fase 2: Core',
  'Implement core logic.',
  '',
  '### Fase 3: Polish',
  'Final touches.'
].join('\n');

// --- handleShow tests ---

test('handleShow returns not found when plan file missing', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleShow(dir, null, { logger, t: identity });
  assert.equal(result.found, false);
});

test('handleShow displays plan content and counts phases', async () => {
  const dir = await makeTempDir();
  const planDir = path.join(dir, '.aioson', 'context');
  await fs.mkdir(planDir, { recursive: true });
  await fs.writeFile(path.join(planDir, 'implementation-plan.md'), PLAN_CONTENT);

  const logger = createCollectLogger();
  const result = await handleShow(dir, null, { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.phases, 3);
  assert.equal(result.meta.status, 'draft');
  assert.equal(result.meta.classification, 'MEDIUM');
  assert.ok(logger.lines.some(l => l.includes('Phases: 3')));
});

test('handleShow works with feature slug', async () => {
  const dir = await makeTempDir();
  const planDir = path.join(dir, '.aioson', 'context');
  await fs.mkdir(planDir, { recursive: true });
  await fs.writeFile(path.join(planDir, 'implementation-plan-auth.md'), PLAN_CONTENT);

  const logger = createCollectLogger();
  const result = await handleShow(dir, 'auth', { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.phases, 3);
});

// --- handleRegister tests ---

test('handleRegister registers plan into SQLite', async () => {
  const dir = await makeTempDir();
  const planDir = path.join(dir, '.aioson', 'context');
  await fs.mkdir(planDir, { recursive: true });
  await fs.writeFile(path.join(planDir, 'implementation-plan.md'), PLAN_CONTENT);

  const logger = createCollectLogger();
  const result = await handleRegister(dir, null, { logger, t: identity });
  assert.equal(result.registered, true);
  assert.ok(result.planId);

  // Verify in DB
  const { db } = await openRuntimeDb(dir, { mustExist: true });
  try {
    const rows = listImplementationPlans(db);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'draft');
    assert.equal(rows[0].phases_total, 3);
  } finally {
    db.close();
  }
});

test('handleRegister returns false when plan file missing', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleRegister(dir, null, { logger, t: identity });
  assert.equal(result.registered, false);
});

// --- handleStatus tests ---

test('handleStatus returns not found when no runtime', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleStatus(dir, null, { logger, t: identity });
  assert.equal(result.found, false);
});

test('handleStatus shows plan progress', async () => {
  const dir = await makeTempDir();
  const planDir = path.join(dir, '.aioson', 'context');
  await fs.mkdir(planDir, { recursive: true });
  await fs.writeFile(path.join(planDir, 'implementation-plan.md'), PLAN_CONTENT);

  // Register first
  const logger1 = createCollectLogger();
  await handleRegister(dir, null, { logger: logger1, t: identity });

  const logger = createCollectLogger();
  const result = await handleStatus(dir, null, { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.plan.status, 'draft');
});

// --- handleCheckpoint tests ---

test('handleCheckpoint rejects missing phase number', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleCheckpoint(dir, null, null, { logger, t: identity });
  assert.equal(result.updated, false);
});

// --- handleStale tests ---

test('handleStale returns fresh for plan with no source changes', async () => {
  const dir = await makeTempDir();
  const planDir = path.join(dir, '.aioson', 'context');
  await fs.mkdir(planDir, { recursive: true });
  await fs.writeFile(path.join(planDir, 'implementation-plan.md'), PLAN_CONTENT);

  const logger = createCollectLogger();
  const result = await handleStale(dir, null, { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.stale, false);
});

test('handleStale detects stale plan when source changed after creation', async () => {
  const dir = await makeTempDir();
  const planDir = path.join(dir, '.aioson', 'context');
  await fs.mkdir(planDir, { recursive: true });

  // Plan created date is in the past
  const oldPlan = PLAN_CONTENT.replace('2026-01-01T00:00:00Z', '2020-01-01T00:00:00Z');
  await fs.writeFile(path.join(planDir, 'implementation-plan.md'), oldPlan);
  // Source file modified now (after plan creation date)
  await fs.writeFile(path.join(planDir, 'project.context.md'), '# Project');

  const logger = createCollectLogger();
  const result = await handleStale(dir, null, { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.stale, true);
});

test('handleStale returns not found for missing plan', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleStale(dir, null, { logger, t: identity });
  assert.equal(result.found, false);
});

// --- runImplementationPlan CLI entry point ---

test('runImplementationPlan routes show subcommand', async () => {
  const dir = await makeTempDir();
  const planDir = path.join(dir, '.aioson', 'context');
  await fs.mkdir(planDir, { recursive: true });
  await fs.writeFile(path.join(planDir, 'implementation-plan.md'), PLAN_CONTENT);

  const logger = createCollectLogger();
  const result = await runImplementationPlan({
    args: [dir],
    options: { sub: 'show' },
    logger,
    t: identity
  });
  assert.equal(result.found, true);
  assert.equal(result.phases, 3);
});

test('runImplementationPlan returns error for unknown subcommand', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await runImplementationPlan({
    args: [dir],
    options: { sub: 'invalid' },
    logger,
    t: identity
  });
  assert.equal(result.error, true);
});

// --- SQLite table creation ---

test('implementation_plans table is created by openRuntimeDb', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='implementation_plans'"
    ).all();
    assert.equal(tables.length, 1);

    const columns = db.prepare('PRAGMA table_info(implementation_plans)').all();
    const names = new Set(columns.map(c => c.name));
    assert.ok(names.has('plan_id'));
    assert.ok(names.has('status'));
    assert.ok(names.has('phases_total'));
    assert.ok(names.has('phases_completed'));
    assert.ok(names.has('source_hash'));
  } finally {
    db.close();
  }
});

test('plan_phases table is created by openRuntimeDb', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='plan_phases'"
    ).all();
    assert.equal(tables.length, 1);
  } finally {
    db.close();
  }
});
