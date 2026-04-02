'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');

async function runSpecStatus({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const { db, dbPath } = await openRuntimeDb(targetDir, { mustExist: true });

  if (!db) {
    if (!options.json) logger.log('No runtime database found. Run aioson agent:done first.');
    return { ok: false, reason: 'no_db' };
  }

  try {
    const plans = db.prepare(`
      SELECT plan_id, feature_slug, status, phases_total, phases_completed, created_at, updated_at
      FROM implementation_plans
      WHERE status != 'archived'
      ORDER BY updated_at DESC
    `).all();

    const rows = [];
    for (const plan of plans) {
      const lastRun = db.prepare(`
        SELECT r.agent_name, r.summary, r.updated_at
        FROM agent_runs r
        JOIN tasks t ON r.task_key = t.task_key
        WHERE r.status IN ('running', 'completed')
          AND (t.session_key LIKE ? OR r.agent_name IS NOT NULL)
        ORDER BY r.updated_at DESC
        LIMIT 1
      `).get(`%${plan.feature_slug || ''}%`);

      rows.push({
        feature: plan.feature_slug || '(project)',
        phase: `${plan.phases_completed}/${plan.phases_total}`,
        status: plan.status,
        lastAgent: lastRun?.agent_name || '—',
        checkpoint: lastRun?.summary ? lastRun.summary.slice(0, 60) : '—'
      });
    }

    const totalLearnings = db.prepare(
      "SELECT COUNT(*) as cnt FROM project_learnings WHERE status = 'active'"
    ).get()?.cnt || 0;

    const promotable = db.prepare(
      "SELECT COUNT(*) as cnt FROM project_learnings WHERE status = 'active' AND frequency >= 3"
    ).get()?.cnt || 0;

    if (options.json) {
      return { ok: true, features: rows, totalLearnings, promotable, dbPath };
    }

    logger.log(`Project Status — ${targetDir}`);
    logger.log('─'.repeat(80));
    logger.log('Feature'.padEnd(20) + 'Phase'.padEnd(10) + 'Status'.padEnd(16) + 'Last Agent'.padEnd(16) + 'Checkpoint');
    logger.log('─'.repeat(80));
    for (const r of rows) {
      logger.log(
        r.feature.padEnd(20) +
        r.phase.padEnd(10) +
        r.status.padEnd(16) +
        r.lastAgent.padEnd(16) +
        r.checkpoint
      );
    }
    logger.log('─'.repeat(80));
    logger.log(`Active learnings: ${totalLearnings}  |  Promotable (freq≥3): ${promotable}`);

    return { ok: true, features: rows, totalLearnings, promotable, dbPath };
  } finally {
    db.close();
  }
}

module.exports = { runSpecStatus };
