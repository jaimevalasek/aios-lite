'use strict';

/**
 * CRUD para a tabela runner_queue no SQLite existente.
 * A tabela é criada automaticamente via openRuntimeDb — este módulo
 * apenas lida com a DDL adicional e os queries da fila do runner.
 */

const RUNNER_QUEUE_DDL = `
  CREATE TABLE IF NOT EXISTS runner_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task        TEXT    NOT NULL,
    agent       TEXT    NOT NULL DEFAULT 'dev',
    status      TEXT    NOT NULL DEFAULT 'pending',
    cascade     TEXT,
    priority    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    started_at  TEXT,
    finished_at TEXT,
    result_ok   INTEGER,
    error_msg   TEXT,
    session_id  TEXT
  );
`;

/**
 * Garante que a tabela runner_queue existe no DB aberto.
 * @param {import('better-sqlite3').Database} db
 */
function ensureRunnerQueue(db) {
  db.exec(RUNNER_QUEUE_DDL);
}

/**
 * Adiciona uma task à fila.
 * @param {import('better-sqlite3').Database} db
 * @param {{ task: string, agent?: string, cascade?: string, priority?: number }} options
 * @returns {number} id da task inserida
 */
function addTask(db, options) {
  ensureRunnerQueue(db);
  const { task, agent = 'dev', cascade = null, priority = 0 } = options;
  const result = db.prepare(`
    INSERT INTO runner_queue (task, agent, cascade, priority)
    VALUES (?, ?, ?, ?)
  `).run(task, agent, cascade, priority);
  return result.lastInsertRowid;
}

/**
 * Lista todas as tasks da fila, ordenadas por prioridade DESC, criação ASC.
 * @param {import('better-sqlite3').Database} db
 * @param {{ status?: string }} options
 */
function listTasks(db, options = {}) {
  ensureRunnerQueue(db);
  if (options.status) {
    return db.prepare(`
      SELECT * FROM runner_queue WHERE status = ? ORDER BY priority DESC, id ASC
    `).all(options.status);
  }
  return db.prepare(`
    SELECT * FROM runner_queue ORDER BY priority DESC, id ASC
  `).all();
}

/**
 * Busca a próxima task com status pending.
 * @param {import('better-sqlite3').Database} db
 */
function nextPending(db) {
  ensureRunnerQueue(db);
  return db.prepare(`
    SELECT * FROM runner_queue WHERE status = 'pending' ORDER BY priority DESC, id ASC LIMIT 1
  `).get();
}

/**
 * Atualiza o status de uma task.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {{ status: string, resultOk?: boolean, errorMsg?: string, sessionId?: string }} options
 */
function updateTaskStatus(db, id, options) {
  ensureRunnerQueue(db);
  const now = new Date().toISOString();
  const status = options.status;
  const isFinished = status === 'completed' || status === 'failed' || status === 'skipped';
  const isStarted = status === 'running';

  db.prepare(`
    UPDATE runner_queue
    SET status      = ?,
        result_ok   = COALESCE(?, result_ok),
        error_msg   = COALESCE(?, error_msg),
        session_id  = COALESCE(?, session_id),
        started_at  = CASE WHEN ? = 1 THEN ? ELSE started_at END,
        finished_at = CASE WHEN ? = 1 THEN ? ELSE finished_at END
    WHERE id = ?
  `).run(
    status,
    options.resultOk != null ? (options.resultOk ? 1 : 0) : null,
    options.errorMsg ?? null,
    options.sessionId ?? null,
    isStarted ? 1 : 0, now,
    isFinished ? 1 : 0, now,
    id
  );
}

/**
 * Remove todas as tasks da fila (clear).
 * @param {import('better-sqlite3').Database} db
 */
function clearQueue(db) {
  ensureRunnerQueue(db);
  db.prepare('DELETE FROM runner_queue').run();
}

/**
 * Exporta todas as tasks como Markdown.
 * @param {import('better-sqlite3').Database} db
 */
function exportQueueMarkdown(db) {
  const tasks = listTasks(db);
  if (tasks.length === 0) return '# Runner Queue\n\n_Queue is empty._\n';

  const STATUS_ICON = {
    pending: '○',
    running: '▶',
    completed: '✓',
    failed: '✗',
    skipped: '—'
  };

  const lines = ['# Runner Queue', ''];
  for (const t of tasks) {
    const icon = STATUS_ICON[t.status] || '?';
    const cascade = t.cascade ? ` [cascade: ${t.cascade}]` : '';
    lines.push(`- ${icon} **${t.id}** \`@${t.agent}\`${cascade} — ${t.task}`);
    if (t.status !== 'pending') {
      lines.push(`  - Status: ${t.status} | Created: ${t.created_at}`);
      if (t.finished_at) lines.push(`  - Finished: ${t.finished_at}`);
      if (t.error_msg) lines.push(`  - Error: ${t.error_msg}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  ensureRunnerQueue,
  addTask,
  listTasks,
  nextPending,
  updateTaskStatus,
  clearQueue,
  exportQueueMarkdown
};
