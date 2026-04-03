'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  ensureRunnerQueue,
  addTask,
  listTasks,
  nextPending,
  updateTaskStatus,
  clearQueue,
  exportQueueMarkdown
} = require('../src/runner/queue-store');
const { openRuntimeDb } = require('../src/runtime-store');
const { runRunnerQueue } = require('../src/commands/runner-queue');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runner-queue-'));
}

async function openTestDb(tmpDir) {
  const handle = await openRuntimeDb(tmpDir, {});
  ensureRunnerQueue(handle.db);
  return handle.db;
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

// ── queue-store unit tests ─────────────────────────────────────────────────

test('addTask: inserts a task and returns id', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  const id = addTask(db, { task: 'Fix the login modal', agent: 'dev' });
  assert.ok(typeof id === 'number' || typeof id === 'bigint');
  assert.ok(Number(id) >= 1);
  db.close();
});

test('listTasks: returns inserted tasks ordered by id', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  addTask(db, { task: 'Task A', agent: 'dev' });
  addTask(db, { task: 'Task B', agent: 'qa' });
  const tasks = listTasks(db);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].task, 'Task A');
  assert.equal(tasks[1].task, 'Task B');
  db.close();
});

test('listTasks: filters by status', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  const id1 = addTask(db, { task: 'Task A', agent: 'dev' });
  const id2 = addTask(db, { task: 'Task B', agent: 'dev' });
  updateTaskStatus(db, Number(id2), { status: 'completed', resultOk: true });
  const pending = listTasks(db, { status: 'pending' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].task, 'Task A');
  db.close();
});

test('nextPending: returns first pending task', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  addTask(db, { task: 'Task A', agent: 'dev' });
  addTask(db, { task: 'Task B', agent: 'dev' });
  const t = nextPending(db);
  assert.equal(t.task, 'Task A');
  assert.equal(t.status, 'pending');
  db.close();
});

test('nextPending: returns null when queue is empty', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  const t = nextPending(db);
  assert.equal(t, undefined);
  db.close();
});

test('updateTaskStatus: sets status to completed', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  const id = Number(addTask(db, { task: 'Task A', agent: 'dev' }));
  updateTaskStatus(db, id, { status: 'running' });
  updateTaskStatus(db, id, { status: 'completed', resultOk: true });
  const tasks = listTasks(db);
  assert.equal(tasks[0].status, 'completed');
  assert.equal(tasks[0].result_ok, 1);
  db.close();
});

test('updateTaskStatus: sets error_msg on failed', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  const id = Number(addTask(db, { task: 'Task A', agent: 'dev' }));
  updateTaskStatus(db, id, { status: 'failed', resultOk: false, errorMsg: 'timeout' });
  const tasks = listTasks(db);
  assert.equal(tasks[0].status, 'failed');
  assert.equal(tasks[0].error_msg, 'timeout');
  db.close();
});

test('clearQueue: removes all tasks', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  addTask(db, { task: 'Task A', agent: 'dev' });
  addTask(db, { task: 'Task B', agent: 'dev' });
  clearQueue(db);
  const tasks = listTasks(db);
  assert.equal(tasks.length, 0);
  db.close();
});

test('exportQueueMarkdown: empty queue returns empty message', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  const md = exportQueueMarkdown(db);
  assert.ok(md.includes('empty'));
  db.close();
});

test('exportQueueMarkdown: includes task entries', async () => {
  const tmpDir = await makeTempDir();
  const db = await openTestDb(tmpDir);
  addTask(db, { task: 'Implement stock modal', agent: 'dev' });
  addTask(db, { task: 'Write unit tests', agent: 'qa' });
  const md = exportQueueMarkdown(db);
  assert.ok(md.includes('Implement stock modal'));
  assert.ok(md.includes('Write unit tests'));
  assert.ok(md.includes('@dev'));
  assert.ok(md.includes('@qa'));
  db.close();
});

// ── runner:queue command tests ─────────────────────────────────────────────

test('runner:queue add: adds task and logs confirmation', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  const result = await runRunnerQueue({
    args: [tmpDir, 'add'],
    options: { sub: 'add', task: 'Fix the cart', agent: 'dev' },
    logger
  });
  assert.equal(result.ok, true);
  assert.ok(logger.lines.some((l) => l.includes('Fix the cart')));
});

test('runner:queue add: requires task description', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  const result = await runRunnerQueue({
    args: [tmpDir, 'add'],
    options: { sub: 'add' },
    logger
  });
  assert.equal(result.ok, false);
  assert.ok(logger.errors.some((e) => e.includes('Task description required')));
});

test('runner:queue list: shows empty message when no tasks', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  await runRunnerQueue({ args: [tmpDir, 'list'], options: { sub: 'list' }, logger });
  assert.ok(logger.lines.some((l) => l.includes('empty')));
});

test('runner:queue list: shows added tasks', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeLogger();
  await runRunnerQueue({
    args: [tmpDir, 'add'],
    options: { sub: 'add', task: 'Task Alpha', agent: 'dev' },
    logger: makeLogger()
  });
  await runRunnerQueue({ args: [tmpDir, 'list'], options: { sub: 'list' }, logger });
  assert.ok(logger.lines.some((l) => l.includes('Task Alpha')));
});

test('runner:queue clear: clears all tasks', async () => {
  const tmpDir = await makeTempDir();
  await runRunnerQueue({
    args: [tmpDir, 'add'],
    options: { sub: 'add', task: 'Task X', agent: 'dev' },
    logger: makeLogger()
  });
  const logger = makeLogger();
  const result = await runRunnerQueue({ args: [tmpDir, 'clear'], options: { sub: 'clear' }, logger });
  assert.equal(result.ok, true);
  assert.ok(logger.lines.some((l) => l.includes('cleared')));
});
