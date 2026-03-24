'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { handleList, handleStats, handleArchive, handlePromote, handleExport } = require('../src/commands/squad-learning');
const {
  openRuntimeDb,
  insertSquadLearning,
  listSquadLearnings,
  getSquadLearning,
  updateSquadLearningStatus,
  reinforceSquadLearning,
  promoteSquadLearning,
  archiveStaleSquadLearnings,
  getSquadLearningStats
} = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-learn-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

function identity(key) { return key; }

// --- CRUD tests ---

test('insertSquadLearning creates a learning and listSquadLearnings returns it', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const id = insertSquadLearning(db, {
      squadSlug: 'content-team',
      type: 'preference',
      title: 'User prefers long-form content',
      signal: 'explicit',
      confidence: 'high',
      evidence: 'User said: prefer detailed output'
    });
    assert.ok(id.startsWith('sl-'));

    const rows = listSquadLearnings(db, 'content-team');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'User prefers long-form content');
    assert.equal(rows[0].type, 'preference');
    assert.equal(rows[0].confidence, 'high');
    assert.equal(rows[0].status, 'active');
  } finally {
    db.close();
  }
});

test('listSquadLearnings filters by status', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    insertSquadLearning(db, { squadSlug: 'sq1', type: 'preference', title: 'A' });
    const id2 = insertSquadLearning(db, { squadSlug: 'sq1', type: 'domain', title: 'B' });
    updateSquadLearningStatus(db, id2, 'stale');

    const active = listSquadLearnings(db, 'sq1', 'active');
    assert.equal(active.length, 1);
    assert.equal(active[0].title, 'A');

    const stale = listSquadLearnings(db, 'sq1', 'stale');
    assert.equal(stale.length, 1);
    assert.equal(stale[0].title, 'B');
  } finally {
    db.close();
  }
});

test('getSquadLearning returns null for missing id', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    assert.equal(getSquadLearning(db, 'nonexistent'), null);
  } finally {
    db.close();
  }
});

test('reinforceSquadLearning increments frequency', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const id = insertSquadLearning(db, { squadSlug: 'sq1', type: 'quality', title: 'Tone check' });
    assert.equal(getSquadLearning(db, id).frequency, 1);

    reinforceSquadLearning(db, id);
    assert.equal(getSquadLearning(db, id).frequency, 2);

    reinforceSquadLearning(db, id);
    assert.equal(getSquadLearning(db, id).frequency, 3);
  } finally {
    db.close();
  }
});

test('promoteSquadLearning sets status and promoted_to', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const id = insertSquadLearning(db, { squadSlug: 'sq1', type: 'quality', title: 'Formal tone' });
    promoteSquadLearning(db, id, '.aioson/rules/squad/tone-formal.md');

    const row = getSquadLearning(db, id);
    assert.equal(row.status, 'promoted');
    assert.equal(row.promoted_to, '.aioson/rules/squad/tone-formal.md');
  } finally {
    db.close();
  }
});

test('archiveStaleSquadLearnings marks old learnings as stale', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    // Insert with old last_reinforced
    const oldDate = new Date(Date.now() - 100 * 86400000).toISOString();
    insertSquadLearning(db, {
      learningId: 'sl-old-1',
      squadSlug: 'sq1', type: 'domain', title: 'Old insight',
      lastReinforced: oldDate
    });
    insertSquadLearning(db, {
      learningId: 'sl-recent-1',
      squadSlug: 'sq1', type: 'preference', title: 'Recent pref'
      // lastReinforced defaults to now
    });

    const count = archiveStaleSquadLearnings(db, 'sq1', 90);
    assert.equal(count, 1);

    const active = listSquadLearnings(db, 'sq1', 'active');
    assert.equal(active.length, 1);
    assert.equal(active[0].title, 'Recent pref');
  } finally {
    db.close();
  }
});

test('getSquadLearningStats groups by type and status', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    insertSquadLearning(db, { learningId: 'sl-stat-1', squadSlug: 'sq1', type: 'preference', title: 'A' });
    insertSquadLearning(db, { learningId: 'sl-stat-2', squadSlug: 'sq1', type: 'preference', title: 'B' });
    insertSquadLearning(db, { learningId: 'sl-stat-3', squadSlug: 'sq1', type: 'domain', title: 'C' });

    const stats = getSquadLearningStats(db, 'sq1');
    assert.ok(stats.length >= 2);
    const prefStat = stats.find(s => s.type === 'preference' && s.status === 'active');
    assert.equal(prefStat.count, 2);
  } finally {
    db.close();
  }
});

// --- CLI handler tests ---

test('handleList returns empty when no learnings', async () => {
  const dir = await makeTempDir();
  // Initialize db
  const { db } = await openRuntimeDb(dir);
  db.close();

  const logger = createCollectLogger();
  const result = await handleList(dir, 'my-squad', null, { logger, t: identity });
  assert.deepEqual(result.learnings, []);
});

test('handleList returns learnings when they exist', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  insertSquadLearning(db, { learningId: 'sl-hl-1', squadSlug: 'my-squad', type: 'preference', title: 'Test pref' });
  insertSquadLearning(db, { learningId: 'sl-hl-2', squadSlug: 'my-squad', type: 'domain', title: 'Test domain' });
  db.close();

  const logger = createCollectLogger();
  const result = await handleList(dir, 'my-squad', null, { logger, t: identity });
  assert.equal(result.learnings.length, 2);
  assert.ok(result.found);
});

test('handleList requires slug', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await handleList(dir, null, null, { logger, t: identity });
  assert.equal(result.found, false);
});

test('handleStats shows statistics', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  insertSquadLearning(db, { learningId: 'sl-hstat-1', squadSlug: 'sq1', type: 'preference', title: 'A' });
  insertSquadLearning(db, { learningId: 'sl-hstat-2', squadSlug: 'sq1', type: 'quality', title: 'B' });
  db.close();

  const logger = createCollectLogger();
  const result = await handleStats(dir, 'sq1', { logger, t: identity });
  assert.ok(result.found);
  assert.equal(result.total, 2);
});

test('handleArchive marks old learnings as stale', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  const oldDate = new Date(Date.now() - 100 * 86400000).toISOString();
  insertSquadLearning(db, { squadSlug: 'sq1', type: 'domain', title: 'Old', lastReinforced: oldDate });
  db.close();

  const logger = createCollectLogger();
  const result = await handleArchive(dir, 'sq1', 90, { logger, t: identity });
  assert.equal(result.archived, 1);
});

test('handlePromote promotes a learning', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  const id = insertSquadLearning(db, { squadSlug: 'sq1', type: 'quality', title: 'Tone check' });
  db.close();

  const logger = createCollectLogger();
  const result = await handlePromote(dir, 'sq1', id, '.aioson/rules/squad/tone.md', { logger, t: identity });
  assert.ok(result.promoted);
  assert.equal(result.rulePath, '.aioson/rules/squad/tone.md');
});

test('handlePromote returns false for wrong squad', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  const id = insertSquadLearning(db, { squadSlug: 'sq1', type: 'quality', title: 'Tone check' });
  db.close();

  const logger = createCollectLogger();
  const result = await handlePromote(dir, 'wrong-squad', id, null, { logger, t: identity });
  assert.equal(result.promoted, false);
});

test('handleExport returns JSON with learnings', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  insertSquadLearning(db, { squadSlug: 'sq1', type: 'preference', title: 'Export test' });
  db.close();

  const logger = createCollectLogger();
  const result = await handleExport(dir, 'sq1', { logger, t: identity });
  assert.ok(result.exported);
  assert.equal(result.count, 1);
  // Verify JSON output
  const parsed = JSON.parse(logger.lines[0]);
  assert.equal(parsed.squad, 'sq1');
  assert.equal(parsed.learnings.length, 1);
});
