'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  ensureRunnerQueue,
  addTask,
  listTasks,
  nextPending,
  updateTaskStatus,
  clearQueue,
  exportQueueMarkdown
} = require('../src/runner/queue-store');

describe('runner/queue-store.js', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('ensureRunnerQueue creates the table', () => {
    ensureRunnerQueue(db);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='runner_queue'").get();
    assert.ok(tables);
  });

  it('addTask returns an id and inserts a row', () => {
    const id = addTask(db, { task: 'do something' });
    assert.equal(typeof id, 'number');
    assert.ok(id > 0);

    const row = db.prepare('SELECT * FROM runner_queue WHERE id = ?').get(id);
    assert.equal(row.task, 'do something');
    assert.equal(row.agent, 'dev');
    assert.equal(row.status, 'pending');
    assert.equal(row.priority, 0);
  });

  it('addTask accepts custom agent, cascade and priority', () => {
    const id = addTask(db, { task: 'custom', agent: 'qa', cascade: 'test', priority: 5 });
    const row = db.prepare('SELECT * FROM runner_queue WHERE id = ?').get(id);
    assert.equal(row.agent, 'qa');
    assert.equal(row.cascade, 'test');
    assert.equal(row.priority, 5);
  });

  it('listTasks returns all tasks ordered by priority DESC, id ASC', () => {
    addTask(db, { task: 'low', priority: 1 });
    addTask(db, { task: 'high', priority: 10 });
    addTask(db, { task: 'medium', priority: 5 });

    const tasks = listTasks(db);
    assert.equal(tasks.length, 3);
    assert.equal(tasks[0].task, 'high');
    assert.equal(tasks[1].task, 'medium');
    assert.equal(tasks[2].task, 'low');
  });

  it('listTasks filters by status', () => {
    const id1 = addTask(db, { task: 'a' });
    const id2 = addTask(db, { task: 'b' });
    updateTaskStatus(db, id1, { status: 'running' });

    const pending = listTasks(db, { status: 'pending' });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, id2);

    const running = listTasks(db, { status: 'running' });
    assert.equal(running.length, 1);
    assert.equal(running[0].id, id1);
  });

  it('nextPending returns the highest priority pending task', () => {
    addTask(db, { task: 'later', priority: 1 });
    const id = addTask(db, { task: 'sooner', priority: 5 });

    const next = nextPending(db);
    assert.equal(next.task, 'sooner');
    assert.equal(next.id, id);
  });

  it('nextPending returns undefined when queue is empty', () => {
    const next = nextPending(db);
    assert.equal(next, undefined);
  });

  it('updateTaskStatus updates status and timestamps', () => {
    const id = addTask(db, { task: 'x' });
    updateTaskStatus(db, id, { status: 'running' });

    let row = db.prepare('SELECT * FROM runner_queue WHERE id = ?').get(id);
    assert.equal(row.status, 'running');
    assert.ok(row.started_at);
    assert.equal(row.finished_at, null);

    updateTaskStatus(db, id, { status: 'completed', resultOk: true, sessionId: 'sess-1' });
    row = db.prepare('SELECT * FROM runner_queue WHERE id = ?').get(id);
    assert.equal(row.status, 'completed');
    assert.equal(row.result_ok, 1);
    assert.equal(row.session_id, 'sess-1');
    assert.ok(row.finished_at);
  });

  it('updateTaskStatus stores error message on failed', () => {
    const id = addTask(db, { task: 'x' });
    updateTaskStatus(db, id, { status: 'failed', errorMsg: 'boom' });

    const row = db.prepare('SELECT * FROM runner_queue WHERE id = ?').get(id);
    assert.equal(row.status, 'failed');
    assert.equal(row.error_msg, 'boom');
    assert.ok(row.finished_at);
  });

  it('clearQueue removes all tasks', () => {
    addTask(db, { task: 'a' });
    addTask(db, { task: 'b' });
    clearQueue(db);

    const count = db.prepare('SELECT COUNT(*) as c FROM runner_queue').get();
    assert.equal(count.c, 0);
  });

  it('exportQueueMarkdown renders empty queue', () => {
    const md = exportQueueMarkdown(db);
    assert.ok(md.includes('Queue is empty'));
  });

  it('exportQueueMarkdown renders tasks with icons', () => {
    addTask(db, { task: 'pending-task', agent: 'dev' });
    const id = addTask(db, { task: 'done-task', agent: 'qa', cascade: 'test' });
    updateTaskStatus(db, id, { status: 'completed' });

    const md = exportQueueMarkdown(db);
    assert.ok(md.includes('pending-task'));
    assert.ok(md.includes('done-task'));
    assert.ok(md.includes('@qa'));
    assert.ok(md.includes('[cascade: test]'));
    assert.ok(md.includes('Status: completed'));
  });
});
