'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const {
  openRuntimeDb,
  startTask,
  updateTask,
  writeAgentSession,
  readAgentSession,
  clearAgentSession
} = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runtime-store-'));
}

test('openRuntimeDb migrates legacy tasks schema with live session fields and indexes', async () => {
  const dir = await makeTempDir();
  const runtimeDir = path.join(dir, '.aioson', 'runtime');
  await fs.mkdir(runtimeDir, { recursive: true });

  const legacyDbPath = path.join(runtimeDir, 'aios.sqlite');
  const legacyDb = new Database(legacyDbPath);
  legacyDb.exec(`
    CREATE TABLE tasks (
      task_key TEXT PRIMARY KEY,
      squad_slug TEXT,
      session_key TEXT,
      title TEXT NOT NULL,
      goal TEXT,
      status TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finished_at TEXT
    );
  `);
  legacyDb.close();

  const { db } = await openRuntimeDb(dir);
  try {
    const columns = db.prepare('PRAGMA table_info(tasks)').all();
    const columnNames = new Set(columns.map((column) => column.name));
    assert.equal(columnNames.has('task_kind'), true);
    assert.equal(columnNames.has('parent_task_key'), true);
    assert.equal(columnNames.has('meta_json'), true);

    const indexes = db.prepare('PRAGMA index_list(tasks)').all();
    const indexNames = new Set(indexes.map((index) => index.name));
    assert.equal(indexNames.has('idx_tasks_session'), true);
    assert.equal(indexNames.has('idx_tasks_parent'), true);
    assert.equal(indexNames.has('idx_tasks_kind'), true);
  } finally {
    db.close();
  }
});

test('startTask and updateTask persist live task fields', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);

  try {
    const taskKey = startTask(db, {
      title: 'Sessao viva do deyvin',
      sessionKey: 'direct-session:123:@deyvin',
      taskKind: 'live_session',
      parentTaskKey: 'task-parent-001',
      goal: 'Manter sessao rastreada',
      createdBy: '@deyvin',
      metaJson: {
        tool: 'codex',
        activeAgent: '@deyvin'
      }
    });

    const created = db.prepare(`
      SELECT task_kind, parent_task_key, meta_json, goal, status
      FROM tasks
      WHERE task_key = ?
    `).get(taskKey);

    assert.equal(created.task_kind, 'live_session');
    assert.equal(created.parent_task_key, 'task-parent-001');
    assert.deepEqual(JSON.parse(created.meta_json), {
      tool: 'codex',
      activeAgent: '@deyvin'
    });
    assert.equal(created.goal, 'Manter sessao rastreada');
    assert.equal(created.status, 'running');

    const status = updateTask(db, {
      taskKey,
      status: 'completed',
      taskKind: 'live_task',
      parentTaskKey: 'task-parent-002',
      goal: 'Sessao encerrada com sucesso',
      metaJson: {
        tool: 'codex',
        activeAgent: '@product',
        handoff: true
      }
    });

    assert.equal(status, 'completed');

    const updated = db.prepare(`
      SELECT task_kind, parent_task_key, meta_json, goal, status, finished_at
      FROM tasks
      WHERE task_key = ?
    `).get(taskKey);

    assert.equal(updated.task_kind, 'live_task');
    assert.equal(updated.parent_task_key, 'task-parent-002');
    assert.deepEqual(JSON.parse(updated.meta_json), {
      tool: 'codex',
      activeAgent: '@product',
      handoff: true
    });
    assert.equal(updated.goal, 'Sessao encerrada com sucesso');
    assert.equal(updated.status, 'completed');
    assert.equal(typeof updated.finished_at, 'string');
  } finally {
    db.close();
  }
});

test('writeAgentSession is exported and round-trips session data', async () => {
  const dir = await makeTempDir();
  const { db, runtimeDir } = await openRuntimeDb(dir);
  db.close();

  const session = {
    runKey: 'run-deyvin-001',
    taskKey: 'task-deyvin-001',
    sessionKey: 'direct-session:456:deyvin',
    startedAt: '2026-03-22T12:00:00.000Z',
    finished: false
  };

  await writeAgentSession(runtimeDir, '@deyvin', session);
  const loaded = await readAgentSession(runtimeDir, '@deyvin');
  assert.deepEqual(loaded, session);

  await clearAgentSession(runtimeDir, '@deyvin');
  const cleared = await readAgentSession(runtimeDir, '@deyvin');
  assert.equal(cleared, null);
});
