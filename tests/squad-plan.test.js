'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runSquadPlan, handleShow, handleStatus, handleCheckpoint, handleStale, handleRegister } = require('../src/commands/squad-plan');
const {
  openRuntimeDb,
  getSquadExecutionPlanBySquad,
  getSquadPlanRounds
} = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-plan-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

function identity(key) { return key; }

const SQUADS_DIR = path.join('.aioson', 'squads');

const PLAN_CONTENT = [
  '---',
  'status: draft',
  'created: 2026-01-01T00:00:00Z',
  'based_on_blueprint: youtube-bp-001',
  '---',
  '# Execution Plan: youtube',
  '',
  '### Round 1: Research',
  'Executor: @researcher',
  '',
  '### Round 2: Draft',
  'Executor: @writer',
  '',
  '### Round 3: Review',
  'Executor: @editor'
].join('\n');

async function setupSquadPlan(dir, slug) {
  const docsDir = path.join(dir, SQUADS_DIR, slug, 'docs');
  await fs.mkdir(docsDir, { recursive: true });
  await fs.writeFile(path.join(docsDir, 'execution-plan.md'), PLAN_CONTENT);
}

// --- handleShow tests ---

test('handleShow returns not found when plan file missing', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleShow(dir, 'nonexistent', { logger, t: identity });
  assert.equal(result.found, false);
});

test('handleShow requires slug', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleShow(dir, null, { logger, t: identity });
  assert.equal(result.found, false);
});

test('handleShow displays plan content and counts rounds', async () => {
  const dir = await makeTempDir();
  await setupSquadPlan(dir, 'youtube');

  const logger = createCollectLogger();
  const result = await handleShow(dir, 'youtube', { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.rounds, 3);
  assert.equal(result.meta.status, 'draft');
  assert.ok(logger.lines.some(l => l.includes('Rounds: 3')));
});

// --- handleRegister tests ---

test('handleRegister registers plan into SQLite', async () => {
  const dir = await makeTempDir();
  await setupSquadPlan(dir, 'youtube');

  const logger = createCollectLogger();
  const result = await handleRegister(dir, 'youtube', { logger, t: identity });
  assert.equal(result.registered, true);
  assert.ok(result.planSlug);

  // Verify in DB
  const { db } = await openRuntimeDb(dir, { mustExist: true });
  try {
    const plan = getSquadExecutionPlanBySquad(db, 'youtube');
    assert.ok(plan);
    assert.equal(plan.status, 'draft');
    assert.equal(plan.rounds_total, 3);
    assert.equal(plan.based_on_blueprint, 'youtube-bp-001');
  } finally {
    db.close();
  }
});

test('handleRegister returns false when plan file missing', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleRegister(dir, 'nonexistent', { logger, t: identity });
  assert.equal(result.registered, false);
});

// --- handleStatus tests ---

test('handleStatus returns not found when no runtime', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleStatus(dir, 'youtube', { logger, t: identity });
  assert.equal(result.found, false);
});

test('handleStatus shows plan progress after register', async () => {
  const dir = await makeTempDir();
  await setupSquadPlan(dir, 'youtube');

  const logger1 = createCollectLogger();
  await handleRegister(dir, 'youtube', { logger: logger1, t: identity });

  const logger = createCollectLogger();
  const result = await handleStatus(dir, 'youtube', { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.plan.status, 'draft');
});

// --- handleCheckpoint tests ---

test('handleCheckpoint rejects missing args', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleCheckpoint(dir, null, null, { logger, t: identity });
  assert.equal(result.updated, false);
});

test('handleCheckpoint rejects non-numeric round', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleCheckpoint(dir, 'youtube', 'abc', { logger, t: identity });
  assert.equal(result.updated, false);
});

// --- handleStale tests ---

test('handleStale returns fresh for plan with no manifest changes', async () => {
  const dir = await makeTempDir();
  await setupSquadPlan(dir, 'youtube');

  const logger = createCollectLogger();
  const result = await handleStale(dir, 'youtube', { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.stale, false);
});

test('handleStale detects stale plan when manifest changed', async () => {
  const dir = await makeTempDir();
  const squadDir = path.join(dir, SQUADS_DIR, 'youtube');
  const docsDir = path.join(squadDir, 'docs');
  await fs.mkdir(docsDir, { recursive: true });

  // Plan with old creation date
  const oldPlan = PLAN_CONTENT.replace('2026-01-01T00:00:00Z', '2020-01-01T00:00:00Z');
  await fs.writeFile(path.join(docsDir, 'execution-plan.md'), oldPlan);
  // Manifest modified now (after plan creation)
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), '{}');

  const logger = createCollectLogger();
  const result = await handleStale(dir, 'youtube', { logger, t: identity });
  assert.equal(result.found, true);
  assert.equal(result.stale, true);
});

test('handleStale returns not found for missing plan', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleStale(dir, 'nonexistent', { logger, t: identity });
  assert.equal(result.found, false);
});

// --- runSquadPlan CLI entry point ---

test('runSquadPlan routes show subcommand', async () => {
  const dir = await makeTempDir();
  await setupSquadPlan(dir, 'youtube');

  const logger = createCollectLogger();
  const result = await runSquadPlan({
    args: [dir],
    options: { sub: 'show', squad: 'youtube' },
    logger,
    t: identity
  });
  assert.equal(result.found, true);
  assert.equal(result.rounds, 3);
});

test('runSquadPlan returns error for unknown subcommand', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await runSquadPlan({
    args: [dir],
    options: { sub: 'invalid' },
    logger,
    t: identity
  });
  assert.equal(result.error, true);
});

// --- SQLite table creation ---

test('squad_execution_plans table is created by openRuntimeDb', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='squad_execution_plans'"
    ).all();
    assert.equal(tables.length, 1);

    const columns = db.prepare('PRAGMA table_info(squad_execution_plans)').all();
    const names = new Set(columns.map(c => c.name));
    assert.ok(names.has('plan_slug'));
    assert.ok(names.has('squad_slug'));
    assert.ok(names.has('status'));
    assert.ok(names.has('rounds_total'));
    assert.ok(names.has('rounds_completed'));
  } finally {
    db.close();
  }
});

test('squad_plan_rounds table is created by openRuntimeDb', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='squad_plan_rounds'"
    ).all();
    assert.equal(tables.length, 1);
  } finally {
    db.close();
  }
});
