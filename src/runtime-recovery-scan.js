'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const Database = require('better-sqlite3');
const { resolveRuntimePaths } = require('./runtime-store');
const { exists } = require('./utils');

function parseDurationMs(value, defaultHours = 24) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return defaultHours * 60 * 60 * 1000;
  const match = text.match(/^(\d+(?:\.\d+)?)\s*([hmd]?)$/);
  if (!match) return defaultHours * 60 * 60 * 1000;
  const amount = parseFloat(match[1]);
  const unit = match[2] || 'h';
  if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
  if (unit === 'm') return amount * 60 * 1000;
  return amount * 60 * 60 * 1000;
}

function hasTable(db, table) {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
  );
}

async function scanSessionFiles(runtimeDir, cutoffMs) {
  const sessionsDir = path.join(runtimeDir, '.sessions');
  const entries = await fs.readdir(sessionsDir, { withFileTypes: true }).catch(() => []);
  const recovered = [];
  const skipped = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(sessionsDir, entry.name);
    let session;
    try {
      // eslint-disable-next-line no-await-in-loop
      session = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
      continue;
    }
    if (session.finished) continue;

    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : 0;
    if (startedAt > cutoffMs) {
      skipped.push({
        source: 'session_file',
        file: entry.name,
        reason: 'within_threshold',
        startedAt: session.startedAt
      });
      continue;
    }

    recovered.push({
      source: 'session_file',
      agent: entry.name.replace(/\.json$/, ''),
      runKey: session.runKey || null,
      taskKey: session.taskKey || null,
      startedAt: session.startedAt,
      sessionFile: filePath
    });
  }
  return { recovered, skipped };
}

function scanDatabase(db, cutoffIso, recovered) {
  if (hasTable(db, 'agent_runs')) {
    const orphanedRuns = db.prepare(`
      SELECT run_key, task_key, agent_name, source, started_at
      FROM agent_runs
      WHERE status IN ('running', 'queued')
        AND COALESCE(started_at, updated_at, '') < ?
    `).all(cutoffIso);

    for (const run of orphanedRuns) {
      if (recovered.some((item) => item.runKey === run.run_key)) continue;
      recovered.push({
        source: run.source === 'workflow' ? 'workflow_run' : 'orphaned_run',
        agent: run.agent_name,
        runKey: run.run_key,
        taskKey: run.task_key,
        startedAt: run.started_at,
        sessionFile: null
      });
    }
  }

  if (hasTable(db, 'tasks')) {
    const staleWorkflowTasks = db.prepare(`
      SELECT task_key, created_by, created_at, updated_at
      FROM tasks
      WHERE status IN ('running', 'queued')
        AND (created_by = '@workflow' OR session_key LIKE 'workflow:%')
        AND COALESCE(updated_at, created_at, '') < ?
    `).all(cutoffIso);

    for (const task of staleWorkflowTasks) {
      if (recovered.some((item) => item.taskKey === task.task_key)) continue;
      recovered.push({
        source: 'workflow_task',
        agent: task.created_by || '@workflow',
        runKey: null,
        taskKey: task.task_key,
        startedAt: task.updated_at || task.created_at,
        sessionFile: null
      });
    }
  }
}

async function scanRuntimeRecoveryCandidates(targetDir, options = {}) {
  const olderThanMs = parseDurationMs(options.olderThan || options['older-than'], 24);
  const cutoffMs = (options.nowMs || Date.now()) - olderThanMs;
  const cutoff = new Date(cutoffMs).toISOString();
  const { runtimeDir, dbPath } = resolveRuntimePaths(targetDir);
  const files = await scanSessionFiles(runtimeDir, cutoffMs);

  if (!(await exists(dbPath))) {
    return { dbPath, cutoff, recovered: files.recovered, skipped: files.skipped };
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    scanDatabase(db, cutoff, files.recovered);
  } finally {
    db.close();
  }

  return { dbPath, cutoff, recovered: files.recovered, skipped: files.skipped };
}

module.exports = {
  parseDurationMs,
  scanRuntimeRecoveryCandidates
};
