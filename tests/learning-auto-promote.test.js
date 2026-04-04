'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runLearningAutoPromote } = require('../src/commands/learning-auto-promote');
const { openRuntimeDb } = require('../src/runtime-store');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-auto-promote-'));
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

async function seedLearning(db, { title, type, frequency, confidence = 'medium' }) {
  const id = `pl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  db.prepare(`
    INSERT INTO project_learnings (learning_id, title, type, frequency, confidence, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
  `).run(id, title, type, frequency, confidence);
  return id;
}

async function initDb(tmpDir) {
  const handle = await openRuntimeDb(tmpDir, {});
  // Ensure project_learnings table exists
  handle.db.prepare(`
    CREATE TABLE IF NOT EXISTS project_learnings (
      learning_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'process',
      frequency INTEGER NOT NULL DEFAULT 1,
      confidence TEXT NOT NULL DEFAULT 'medium',
      evidence TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `).run();
  return handle;
}

test('learning:auto-promote: returns error when no runtime DB', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_runtime');
});

test('learning:auto-promote: invalid threshold returns error', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 'abc' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_threshold');
});

test('learning:auto-promote: returns 0 promoted when no eligible learnings', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  handle.db.close();

  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3 },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.promoted, 0);
  assert.equal(result.eligible, 0);
});

test('learning:auto-promote: promotes process learnings above threshold', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  await seedLearning(handle.db, { title: 'Commit after each atomic step', type: 'process', frequency: 5 });
  handle.db.close();

  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3 },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.promoted, 1);
  assert.equal(result.promoted_items[0].title, 'Commit after each atomic step');
  assert.ok(result.promoted_items[0].file.includes('.aioson/rules'));
});

test('learning:auto-promote: creates rule file on disk', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  await seedLearning(handle.db, { title: 'Run tests before commit', type: 'process', frequency: 4 });
  handle.db.close();

  await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3 },
    logger: makeLogger()
  });

  const rulesDir = path.join(tmpDir, '.aioson', 'rules');
  const entries = await fs.readdir(rulesDir);
  assert.equal(entries.length, 1);
  const ruleContent = await fs.readFile(path.join(rulesDir, entries[0]), 'utf8');
  assert.ok(ruleContent.includes('Run tests before commit'));
});

test('learning:auto-promote: does NOT promote domain learnings', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  await seedLearning(handle.db, { title: 'Cart uniqueness constraint', type: 'domain', frequency: 5 });
  handle.db.close();

  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3 },
    logger: makeLogger()
  });
  assert.equal(result.promoted, 0);
  assert.equal(result.noted, 1);
  assert.equal(result.noted_items[0].type, 'domain');
});

test('learning:auto-promote: dry-run does not write files', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  await seedLearning(handle.db, { title: 'Use atomic commits', type: 'process', frequency: 4 });
  handle.db.close();

  await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3, 'dry-run': true },
    logger: makeLogger()
  });

  const rulesDir = path.join(tmpDir, '.aioson', 'rules');
  let exists = false;
  try { await fs.access(rulesDir); exists = true; } catch { /* ok */ }
  assert.equal(exists, false);
});

test('learning:auto-promote: dry-run reports what would be promoted', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  await seedLearning(handle.db, { title: 'Review before merge', type: 'quality', frequency: 4 });
  handle.db.close();

  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3, 'dry-run': true },
    logger: makeLogger()
  });
  assert.equal(result.dry_run, true);
  assert.equal(result.promoted, 1);
  assert.equal(result.promoted_items[0].title, 'Review before merge');
});

test('learning:auto-promote: skips already existing rule files', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  await seedLearning(handle.db, { title: 'Commit after each atomic step', type: 'process', frequency: 5 });
  handle.db.close();

  // Pre-create the rule file
  const rulesDir = path.join(tmpDir, '.aioson', 'rules');
  await fs.mkdir(rulesDir, { recursive: true });
  await fs.writeFile(path.join(rulesDir, 'process-commit-after-each-atomic-step.md'), '# existing', 'utf8');

  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3 },
    logger: makeLogger()
  });
  assert.equal(result.promoted, 0);
  assert.equal(result.skipped, 1);
});

test('learning:auto-promote: threshold filters by frequency', async () => {
  const tmpDir = await makeTmpDir();
  const handle = await initDb(tmpDir);
  await seedLearning(handle.db, { title: 'High freq', type: 'process', frequency: 5 });
  await seedLearning(handle.db, { title: 'Low freq', type: 'process', frequency: 1 });
  handle.db.close();

  const result = await runLearningAutoPromote({
    args: [tmpDir],
    options: { json: true, threshold: 3 },
    logger: makeLogger()
  });
  assert.equal(result.eligible, 1);
  assert.equal(result.promoted, 1);
  assert.equal(result.promoted_items[0].title, 'High freq');
});
