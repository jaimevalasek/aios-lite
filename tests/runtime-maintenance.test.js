'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { openRuntimeDb } = require('../src/runtime-store');
const { ensureRunnerQueue } = require('../src/runner/queue-store');
const {
  getRuntimeStorageReport,
  previewRuntimePrune,
  pruneRuntimeData,
  compactRuntimeDb
} = require('../src/runtime-maintenance');

const NOW = Date.parse('2026-08-03T12:00:00.000Z');
const OLD = '2026-05-01T12:00:00.000Z';
const RECENT = '2026-08-01T12:00:00.000Z';

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runtime-maintenance-'));
  const handle = await openRuntimeDb(dir);
  ensureRunnerQueue(handle.db);
  return { dir, ...handle };
}

function insertTask(db, key, status, options = {}) {
  db.prepare(`
    INSERT INTO tasks(task_key, parent_task_key, title, status, created_at, updated_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(key, options.parent || null, key, status, OLD, options.updatedAt || OLD,
    ['completed', 'failed'].includes(status) ? (options.finishedAt || OLD) : null);
}

function insertRun(db, key, taskKey, status, options = {}) {
  db.prepare(`
    INSERT INTO agent_runs(run_key, task_key, parent_run_key, agent_name, title, status, started_at, updated_at, finished_at)
    VALUES (?, ?, ?, '@dev', ?, ?, ?, ?, ?)
  `).run(key, taskKey, options.parent || null, key, status, OLD, options.updatedAt || OLD,
    ['completed', 'failed'].includes(status) ? (options.finishedAt || OLD) : null);
}

function insertTelemetryRun(db, id, state, updatedAt) {
  db.prepare(`
    INSERT INTO agent_execution_runs(
      telemetry_run_id, dispatcher_run_id, attempt_id, feature, agent, host, model,
      state, created_at, updated_at, finished_at
    ) VALUES (?, ?, 'attempt-1', 'storage', 'dev', 'codex', 'model', ?, ?, ?, ?)
  `).run(id, `dispatch-${id}`, state, OLD, updatedAt, ['passed', 'failed', 'cancelled'].includes(state) ? updatedAt : null);
}

function insertContentIndex(db, key, options = {}) {
  db.prepare(`
    INSERT INTO content_items(
      content_key, task_key, run_key, squad_slug, title, content_type,
      payload_json, source_path, created_at, updated_at
    ) VALUES (?, ?, ?, 'editorial', ?, 'article', ?, ?, ?, ?)
  `).run(
    key,
    options.taskKey || null,
    options.runKey || null,
    key,
    JSON.stringify({ contentKey: key, body: 'local projection' }),
    options.sourcePath || null,
    options.createdAt || OLD,
    options.updatedAt || OLD
  );
}

test('existing runtime databases gain source_path additively during update', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runtime-content-migration-'));
  const runtimeDir = path.join(dir, '.aioson', 'runtime');
  await fs.mkdir(runtimeDir, { recursive: true });
  const dbPath = path.join(runtimeDir, 'aios.sqlite');
  const legacy = new Database(dbPath);
  legacy.exec(`
    CREATE TABLE content_items (
      content_key TEXT PRIMARY KEY,
      task_key TEXT,
      run_key TEXT,
      squad_slug TEXT NOT NULL,
      session_key TEXT,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL,
      layout_type TEXT NOT NULL DEFAULT 'document',
      status TEXT NOT NULL DEFAULT 'completed',
      summary TEXT,
      blueprint_slug TEXT,
      used_skills_json TEXT,
      payload_json TEXT,
      json_path TEXT,
      html_path TEXT,
      created_by_agent TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  legacy.close();

  const migrated = await openRuntimeDb(dir);
  try {
    const columns = migrated.db.prepare('PRAGMA table_info(content_items)').all().map((column) => column.name);
    assert.ok(columns.includes('source_path'));
  } finally {
    migrated.db.close();
  }
});

test('pruning removes expired local history while preserving active coordination and durable knowledge', async () => {
  const { db } = await fixture();
  try {
    insertTask(db, 'task-old', 'completed');
    insertTask(db, 'task-active', 'running');
    insertTask(db, 'task-parent', 'completed');
    insertTask(db, 'task-child', 'running', { parent: 'task-parent' });
    insertTask(db, 'task-chain', 'completed');

    insertRun(db, 'run-old', 'task-old', 'completed');
    insertRun(db, 'run-active', 'task-active', 'running');
    insertRun(db, 'run-parent', 'task-parent', 'completed');
    insertRun(db, 'run-child', 'task-child', 'running', { parent: 'run-parent' });
    insertRun(db, 'run-chain', 'task-chain', 'completed');

    db.prepare("INSERT INTO agent_events(run_key,event_type,message,created_at) VALUES ('run-old','log','old',?)").run(OLD);
    db.prepare("INSERT INTO agent_events(run_key,event_type,message,created_at) VALUES ('run-active','log','active history',?)").run(OLD);
    db.prepare("INSERT INTO execution_events(run_key,task_key,event_type,message,created_at) VALUES ('run-old','task-old','log','old',?)").run(OLD);
    db.prepare("INSERT INTO execution_events(run_key,task_key,event_type,message,created_at) VALUES ('run-active','task-active','log','active history',?)").run(OLD);

    db.prepare(`
      INSERT INTO chain_work_items(
        dedupe_key, feature_slug, origin_run_key, source_path, source_fingerprint,
        target_path, kind, owner_agent, status, confidence, edge_type, hit_count,
        reason, evidence_json, created_at, updated_at, last_seen_at
      ) VALUES ('chain-1','storage','run-chain','src/a.js','fp','src/b.js','inspect','dev','open',0.8,'agent_event',1,'inspect','{}',?,?,?)
    `).run(OLD, OLD, OLD);

    db.prepare("INSERT INTO artifacts(task_key,run_key,kind,title,file_path,created_at) VALUES ('task-old','run-old','report','History','docs/history.md',?)").run(OLD);
    insertTelemetryRun(db, 'telemetry-old', 'passed', OLD);
    insertTelemetryRun(db, 'telemetry-paused-recent', 'paused', RECENT);
    db.prepare("INSERT INTO agent_execution_events(telemetry_run_id,sequence_no,event_type,stream,safe_summary,bytes,created_at) VALUES ('telemetry-old',1,'output','stdout','old output',10,?)").run(OLD);
    db.prepare("INSERT INTO agent_execution_events(telemetry_run_id,sequence_no,event_type,stream,safe_summary,bytes,created_at) VALUES ('telemetry-paused-recent',1,'output','stdout','resume me',9,?)").run(RECENT);

    db.prepare("INSERT INTO runner_queue(task,status,finished_at,created_at) VALUES ('old queue','completed',?,?)").run(OLD, OLD);
    db.prepare("INSERT INTO runner_queue(task,status,created_at) VALUES ('pending queue','pending',?)").run(OLD);
    db.prepare("INSERT INTO worker_runs(squad_slug,worker_slug,status,created_at,completed_at) VALUES ('sq','worker','completed',?,?)").run(OLD, OLD);
    insertContentIndex(db, 'file-backed-old', { sourcePath: 'output/editorial/file-backed-old/content.json' });
    insertContentIndex(db, 'legacy-db-only');
    insertContentIndex(db, 'file-backed-active', {
      taskKey: 'task-active',
      runKey: 'run-active',
      sourcePath: 'output/editorial/file-backed-active/content.json'
    });

    const preview = previewRuntimePrune(db, { historyDays: 30, outputDays: 14, now: NOW });
    assert.ok(preview.directRows > 0);

    const result = pruneRuntimeData(db, { historyDays: 30, outputDays: 14, now: NOW });
    assert.ok(result.deleted.total >= 7);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM tasks WHERE task_key='task-old'").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM agent_runs WHERE run_key='run-old'").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM agent_execution_runs WHERE telemetry_run_id='telemetry-old'").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM runner_queue WHERE task='old queue'").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM worker_runs").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM content_items WHERE content_key='file-backed-old'").get().count, 0);

    assert.equal(db.prepare("SELECT COUNT(*) count FROM tasks WHERE task_key IN ('task-active','task-parent','task-child','task-chain')").get().count, 4);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM agent_runs WHERE run_key IN ('run-active','run-parent','run-child','run-chain')").get().count, 4);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM agent_events WHERE run_key='run-active'").get().count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM execution_events WHERE run_key='run-active'").get().count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM chain_work_items WHERE status='open'").get().count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM runner_queue WHERE status='pending'").get().count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM agent_execution_runs WHERE telemetry_run_id='telemetry-paused-recent'").get().count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM artifacts WHERE file_path='docs/history.md'").get().count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM content_items WHERE content_key='legacy-db-only'").get().count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM content_items WHERE content_key='file-backed-active'").get().count, 1);
  } finally {
    db.close();
  }
});

test('storage report classifies verbose telemetry and keeps diagnostics read-only', async () => {
  const { db, dbPath } = await fixture();
  try {
    insertTelemetryRun(db, 'telemetry-report', 'passed', OLD);
    db.prepare("INSERT INTO agent_execution_events(telemetry_run_id,sequence_no,event_type,stream,safe_summary,bytes,created_at) VALUES ('telemetry-report',1,'output','stdout','old output',10,?)").run(OLD);
    const before = db.prepare('SELECT COUNT(*) count FROM agent_execution_events').get().count;
    const report = getRuntimeStorageReport(db, dbPath, { historyDays: 30, outputDays: 14, now: NOW });
    const after = db.prepare('SELECT COUNT(*) count FROM agent_execution_events').get().count;
    assert.equal(after, before);
    assert.equal(report.tables.find((item) => item.table === 'agent_execution_events').category, 'verbose_telemetry');
    assert.equal(report.tables.find((item) => item.table === 'content_items').category, 'rebuildable_index');
    assert.ok(report.preview.directRows >= 1);
  } finally {
    db.close();
  }
});

test('explicit compaction reclaims free pages after pruning', async () => {
  const { db, dbPath } = await fixture();
  try {
    insertRun(db, 'run-volume', null, 'completed');
    const insert = db.prepare("INSERT INTO agent_events(run_key,event_type,message,created_at) VALUES ('run-volume','output',?,?)");
    const seed = db.transaction(() => {
      for (let index = 0; index < 1200; index += 1) insert.run('x'.repeat(2048), OLD);
    });
    seed();
    db.pragma('wal_checkpoint(TRUNCATE)');
    pruneRuntimeData(db, { historyDays: 30, outputDays: 14, now: NOW });
    db.pragma('wal_checkpoint(TRUNCATE)');
    const result = compactRuntimeDb(db, dbPath);
    assert.ok(result.reclaimedBytes > 0);
    assert.ok(result.afterBytes < result.beforeBytes);
  } finally {
    db.close();
  }
});
