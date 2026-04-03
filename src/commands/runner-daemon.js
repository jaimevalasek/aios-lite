'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');
const {
  ensureRunnerQueue,
  listTasks,
  nextPending,
  updateTaskStatus
} = require('../runner/queue-store');
const { launchCLI } = require('../runner/cli-launcher');
const { runWithCascade, parseCascadeChain } = require('../runner/cascade');

const DAEMON_DDL = `
  CREATE TABLE IF NOT EXISTS runner_daemon (
    id            INTEGER PRIMARY KEY,
    status        TEXT    NOT NULL DEFAULT 'stopped',
    pid           INTEGER,
    agent         TEXT    NOT NULL DEFAULT 'dev',
    poll_ms       INTEGER NOT NULL DEFAULT 10000,
    current_task  INTEGER,
    heartbeat     TEXT,
    started_at    TEXT,
    stopped_at    TEXT
  );
`;

const DAEMON_ROW_ID = 1;

/**
 * aioson runner:daemon — daemon que processa a fila do runner em background.
 *
 * Subcomandos:
 *   start <path> [--agent=dev] [--poll=10]
 *   stop <path>
 *   status <path>
 */
async function runRunnerDaemon({ args, options = {}, logger }) {
  const sub = options.sub || args[1] || 'status';
  const projectDir = path.resolve(process.cwd(), args[0] || '.');

  switch (sub) {
    case 'start':  return await handleStart(projectDir, options, logger);
    case 'stop':   return await handleStop(projectDir, logger);
    case 'status': return await handleStatus(projectDir, logger);
    default:
      logger.error(`Unknown subcommand: ${sub}. Use start, stop, or status.`);
      return { ok: false };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDaemonTable(db) {
  db.exec(DAEMON_DDL);
  ensureRunnerQueue(db);
}

function getDaemonRow(db) {
  return db.prepare('SELECT * FROM runner_daemon WHERE id = ?').get(DAEMON_ROW_ID);
}

function upsertDaemonRow(db, fields) {
  const existing = getDaemonRow(db);
  if (existing) {
    const keys = Object.keys(fields);
    const sets = keys.map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE runner_daemon SET ${sets} WHERE id = ?`).run(...Object.values(fields), DAEMON_ROW_ID);
  } else {
    db.prepare(`
      INSERT INTO runner_daemon (id, ${Object.keys(fields).join(', ')})
      VALUES (${DAEMON_ROW_ID}, ${Object.keys(fields).map(() => '?').join(', ')})
    `).run(...Object.values(fields));
  }
}

// ── Subcommand handlers ───────────────────────────────────────────────────────

async function handleStatus(projectDir, logger) {
  let handle;
  try {
    handle = await openRuntimeDb(projectDir, { mustExist: true });
  } catch { /* noop */ }

  if (!handle) {
    logger.log('[runner:daemon] No runtime database found. Use `runner:daemon start` to begin.');
    return { ok: true, status: 'not_initialized' };
  }

  const { db } = handle;
  ensureDaemonTable(db);
  const row = getDaemonRow(db);

  const pending = listTasks(db, { status: 'pending' }).length;
  const running = listTasks(db, { status: 'running' }).length;
  const completed = listTasks(db, { status: 'completed' }).length;
  const failed = listTasks(db, { status: 'failed' }).length;

  try { db.close(); } catch { /* noop */ }

  if (!row || row.status === 'stopped') {
    logger.log('[runner:daemon] Daemon is stopped.');
  } else {
    const icon = row.status === 'running' ? '[*]' : '[ ]';
    logger.log(`${icon} runner-daemon ${row.status} (pid: ${row.pid || '-'})`);
    logger.log(`    Queue: ${pending} pending | ${running} running | ${completed} completed | ${failed} failed`);
    if (row.current_task) logger.log(`    Current task: #${row.current_task}`);
    if (row.heartbeat) logger.log(`    Last heartbeat: ${row.heartbeat}`);
  }

  return { ok: true, row, stats: { pending, running, completed, failed } };
}

async function handleStop(projectDir, logger) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error('[runner:daemon] No runtime database found.');
    return { ok: false };
  }
  const { db } = handle;
  ensureDaemonTable(db);
  const row = getDaemonRow(db);

  if (!row || row.status === 'stopped') {
    logger.log('[runner:daemon] Daemon is not running.');
    try { db.close(); } catch { /* noop */ }
    return { ok: true };
  }

  if (row.pid) {
    try {
      process.kill(row.pid, 'SIGTERM');
      logger.log(`[runner:daemon] Sent SIGTERM to pid ${row.pid}`);
    } catch {
      logger.log(`[runner:daemon] Process ${row.pid} already gone.`);
    }
  }

  upsertDaemonRow(db, { status: 'stopped', pid: null, stopped_at: new Date().toISOString() });
  try { db.close(); } catch { /* noop */ }

  logger.log('[runner:daemon] Daemon stopped.');
  return { ok: true };
}

async function handleStart(projectDir, options, logger) {
  const agent = options.agent || 'dev';
  const pollMs = options.poll ? Number(options.poll) * 1000 : 10000;
  const timeout = options.timeout ? Number(options.timeout) * 1000 : 120000;

  const handle = await openRuntimeDb(projectDir, {});
  if (!handle) {
    logger.error('Could not open runtime database.');
    return { ok: false };
  }
  const { db } = handle;
  ensureDaemonTable(db);

  // Marca daemon como running
  upsertDaemonRow(db, {
    status: 'running',
    pid: process.pid,
    agent,
    poll_ms: pollMs,
    started_at: new Date().toISOString(),
    heartbeat: new Date().toISOString()
  });

  logger.log(`[runner:daemon] Started (pid: ${process.pid}, agent: @${agent}, poll: ${pollMs / 1000}s)`);
  logger.log('[runner:daemon] Press Ctrl+C to stop gracefully.');

  let stopping = false;
  let currentTaskId = null;

  const onSignal = () => {
    if (stopping) return;
    stopping = true;
    logger.log('\n[runner:daemon] Stopping after current task completes...');
    upsertDaemonRow(db, { status: 'stopping' });
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  // Heartbeat a cada 30s
  const heartbeatInterval = setInterval(() => {
    try {
      upsertDaemonRow(db, { heartbeat: new Date().toISOString() });
    } catch { /* noop */ }
  }, 30000);

  // Loop principal
  while (!stopping) {
    const task = nextPending(db);

    if (!task) {
      await sleep(pollMs);
      continue;
    }

    currentTaskId = task.id;
    upsertDaemonRow(db, { current_task: task.id });
    updateTaskStatus(db, task.id, { status: 'running' });

    const taskAgent = task.agent || agent;
    const agentFile = path.join(projectDir, '.aioson', 'agents', `${taskAgent}.md`);
    const prompt = buildDaemonPrompt(task.task, agentFile);

    logger.log(`\n[runner:daemon] Running task #${task.id}: ${task.task}`);
    logger.log(`  Agent: @${taskAgent}`);

    let result;
    const cascadeChain = parseCascadeChain(task.cascade);

    try {
      if (cascadeChain.length > 0) {
        const cr = await runWithCascade(projectDir, prompt, cascadeChain, {
          timeout,
          onProgress: ({ model, attempt, maxAttempts, status: s, reason }) => {
            if (s === 'running') logger.log(`  [cascade] ${model} attempt ${attempt}/${maxAttempts}...`);
            else if (s === 'gate_failed') logger.log(`  [cascade] ${model} attempt ${attempt} — gate failed${reason ? ': ' + reason : ''}`);
          }
        });
        result = cr.ok ? cr.result : { ok: false, error: cr.error };
      } else {
        result = await launchCLI(projectDir, prompt, { timeout });
      }
    } catch (err) {
      result = { ok: false, error: err.message };
    }

    if (result.ok) {
      updateTaskStatus(db, task.id, { status: 'completed', resultOk: true });
      logger.log(`  [runner:daemon] Task #${task.id} completed`);
    } else {
      const errorMsg = result.error || result.stderr || 'unknown error';
      updateTaskStatus(db, task.id, { status: 'failed', resultOk: false, errorMsg });
      logger.error(`  [runner:daemon] Task #${task.id} failed: ${errorMsg}`);
    }

    currentTaskId = null;
    upsertDaemonRow(db, { current_task: null, heartbeat: new Date().toISOString() });
  }

  clearInterval(heartbeatInterval);
  upsertDaemonRow(db, {
    status: 'stopped',
    pid: null,
    current_task: null,
    stopped_at: new Date().toISOString()
  });

  try { db.close(); } catch { /* noop */ }
  logger.log('[runner:daemon] Stopped gracefully.');
  return { ok: true };
}

function buildDaemonPrompt(task, agentFile) {
  return [
    'You are operating in autonomous headless mode. Complete the following task independently.',
    `Agent role: read ${agentFile} for your operating instructions.`,
    '',
    `Task: ${task}`,
    '',
    'When the task is complete, write TASK_COMPLETE on a new line as the final output.',
    'If you cannot complete the task, write TASK_FAILED: [reason].'
  ].join('\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { runRunnerDaemon };
