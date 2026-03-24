'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { handleList, handleStats, handlePromote } = require('../src/commands/learning');
const {
  openRuntimeDb,
  insertProjectLearning,
  listProjectLearnings,
  getProjectLearning,
  updateProjectLearningStatus,
  reinforceProjectLearning,
  promoteProjectLearning,
  getProjectLearningStats
} = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-proj-learn-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

function identity(key) { return key; }

// --- CRUD tests ---

test('insertProjectLearning creates a learning and listProjectLearnings returns it', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const id = insertProjectLearning(db, {
      projectName: 'my-app',
      type: 'process',
      title: 'Always run migrations with --seed',
      confidence: 'high',
      evidence: 'Discovered during session 1'
    });
    assert.ok(id.startsWith('pl-'));

    const rows = listProjectLearnings(db);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'Always run migrations with --seed');
    assert.equal(rows[0].type, 'process');
  } finally {
    db.close();
  }
});

test('listProjectLearnings filters by status', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    insertProjectLearning(db, { learningId: 'pl-filt-1', projectName: 'app', type: 'preference', title: 'A' });
    const id2 = insertProjectLearning(db, { learningId: 'pl-filt-2', projectName: 'app', type: 'domain', title: 'B' });
    updateProjectLearningStatus(db, id2, 'archived');

    const active = listProjectLearnings(db, 'active');
    assert.equal(active.length, 1);
    assert.equal(active[0].title, 'A');

    const archived = listProjectLearnings(db, 'archived');
    assert.equal(archived.length, 1);
    assert.equal(archived[0].title, 'B');
  } finally {
    db.close();
  }
});

test('getProjectLearning returns null for missing id', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    assert.equal(getProjectLearning(db, 'nonexistent'), null);
  } finally {
    db.close();
  }
});

test('reinforceProjectLearning increments frequency', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const id = insertProjectLearning(db, { projectName: 'app', type: 'quality', title: 'Check imports' });
    assert.equal(getProjectLearning(db, id).frequency, 1);

    reinforceProjectLearning(db, id);
    assert.equal(getProjectLearning(db, id).frequency, 2);
  } finally {
    db.close();
  }
});

test('promoteProjectLearning sets status and promoted_to', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const id = insertProjectLearning(db, { projectName: 'app', type: 'quality', title: 'Lint before commit' });
    promoteProjectLearning(db, id, '.aioson/rules/lint-rule.md');

    const row = getProjectLearning(db, id);
    assert.equal(row.status, 'promoted');
    assert.equal(row.promoted_to, '.aioson/rules/lint-rule.md');
  } finally {
    db.close();
  }
});

test('getProjectLearningStats groups by type and status', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    insertProjectLearning(db, { learningId: 'pl-stat-1', projectName: 'app', type: 'preference', title: 'A' });
    insertProjectLearning(db, { learningId: 'pl-stat-2', projectName: 'app', type: 'preference', title: 'B' });
    insertProjectLearning(db, { learningId: 'pl-stat-3', projectName: 'app', type: 'domain', title: 'C' });

    const stats = getProjectLearningStats(db);
    assert.ok(stats.length >= 2);
    const prefStat = stats.find(s => s.type === 'preference' && s.status === 'active');
    assert.equal(prefStat.count, 2);
  } finally {
    db.close();
  }
});

test('insertProjectLearning with feature_slug', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const id = insertProjectLearning(db, {
      projectName: 'app',
      featureSlug: 'shopping-cart',
      type: 'domain',
      title: 'Tax calculation requires external API'
    });

    const row = getProjectLearning(db, id);
    assert.equal(row.feature_slug, 'shopping-cart');
  } finally {
    db.close();
  }
});

// --- CLI handler tests ---

test('handleList returns empty when no learnings', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  db.close();

  const logger = createCollectLogger();
  const result = await handleList(dir, null, { logger, t: identity });
  assert.deepEqual(result.learnings, []);
});

test('handleList returns learnings when they exist', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  insertProjectLearning(db, { learningId: 'pl-hl-1', projectName: 'app', type: 'preference', title: 'Test pref' });
  insertProjectLearning(db, { learningId: 'pl-hl-2', projectName: 'app', type: 'domain', title: 'Test domain' });
  db.close();

  const logger = createCollectLogger();
  const result = await handleList(dir, null, { logger, t: identity });
  assert.equal(result.learnings.length, 2);
  assert.ok(result.found);
});

test('handleStats shows statistics', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  insertProjectLearning(db, { learningId: 'pl-hs-1', projectName: 'app', type: 'preference', title: 'A' });
  insertProjectLearning(db, { learningId: 'pl-hs-2', projectName: 'app', type: 'quality', title: 'B' });
  db.close();

  const logger = createCollectLogger();
  const result = await handleStats(dir, { logger, t: identity });
  assert.ok(result.found);
  assert.equal(result.total, 2);
});

test('handlePromote promotes a learning', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  const id = insertProjectLearning(db, { projectName: 'app', type: 'quality', title: 'Lint check' });
  db.close();

  const logger = createCollectLogger();
  const result = await handlePromote(dir, id, '.aioson/rules/lint.md', { logger, t: identity });
  assert.ok(result.promoted);
  assert.equal(result.rulePath, '.aioson/rules/lint.md');
});

test('handlePromote returns false for missing learning', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  db.close();

  const logger = createCollectLogger();
  const result = await handlePromote(dir, 'nonexistent', null, { logger, t: identity });
  assert.equal(result.promoted, false);
});

test('handlePromote requires learning id', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handlePromote(dir, null, null, { logger, t: identity });
  assert.equal(result.promoted, false);
});
