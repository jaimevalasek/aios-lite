'use strict';

function countContentItems(db, squadSlug) {
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM content_items WHERE squad_slug = ?').get(squadSlug);
  return row ? row.cnt : 0;
}

function countSessions(db, squadSlug) {
  const row = db.prepare(
    "SELECT COUNT(*) AS cnt FROM tasks WHERE meta_json LIKE ? AND task_kind = 'live_session'"
  ).get(`%${squadSlug}%`);
  return row ? row.cnt : 0;
}

function countLearnings(db, squadSlug) {
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM squad_learnings WHERE squad_slug = ?').get(squadSlug);
  return row ? row.cnt : 0;
}

function calcDeliveryRate(db, squadSlug) {
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM delivery_log WHERE squad_slug = ?').get(squadSlug);
  if (!total || total.cnt === 0) return null;
  const success = db.prepare(
    'SELECT COUNT(*) AS cnt FROM delivery_log WHERE squad_slug = ? AND status_code >= 200 AND status_code < 300'
  ).get(squadSlug);
  return Math.round(((success ? success.cnt : 0) / total.cnt) * 100);
}

function getRecentDeliveries(db, squadSlug, limit = 20) {
  return db.prepare(
    'SELECT * FROM delivery_log WHERE squad_slug = ? ORDER BY created_at DESC LIMIT ?'
  ).all(squadSlug, limit);
}

function getRecentContent(db, squadSlug, limit = 20) {
  return db.prepare(
    'SELECT content_key, title, content_type, layout_type, status, created_at, updated_at FROM content_items WHERE squad_slug = ? ORDER BY updated_at DESC LIMIT ?'
  ).all(squadSlug, limit);
}

function getLearnings(db, squadSlug, statusFilter = null) {
  if (statusFilter) {
    return db.prepare(
      'SELECT * FROM squad_learnings WHERE squad_slug = ? AND status = ? ORDER BY updated_at DESC'
    ).all(squadSlug, statusFilter);
  }
  return db.prepare(
    'SELECT * FROM squad_learnings WHERE squad_slug = ? ORDER BY updated_at DESC'
  ).all(squadSlug);
}

function getLearningStats(db, squadSlug) {
  const rows = db.prepare(
    'SELECT status, COUNT(*) AS cnt FROM squad_learnings WHERE squad_slug = ? GROUP BY status'
  ).all(squadSlug);
  const stats = { active: 0, stale: 0, archived: 0, promoted: 0 };
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(stats, row.status)) {
      stats[row.status] = row.cnt;
    }
  }
  return stats;
}

function getExecutionPlan(db, squadSlug) {
  const plan = db.prepare(
    'SELECT * FROM squad_execution_plans WHERE squad_slug = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(squadSlug);
  if (!plan) return null;
  const rounds = db.prepare(
    'SELECT * FROM squad_plan_rounds WHERE plan_slug = ? ORDER BY round_number ASC'
  ).all(plan.plan_slug);
  return { ...plan, rounds };
}

function getPipelineInfo(db, squadSlug) {
  const node = db.prepare(
    'SELECT * FROM pipeline_nodes WHERE squad_slug = ?'
  ).get(squadSlug);
  if (!node) return null;
  const pipeline = db.prepare(
    'SELECT * FROM squad_pipelines WHERE pipeline_slug = ?'
  ).get(node.pipeline_slug);
  const handoffs = db.prepare(
    'SELECT * FROM squad_handoffs WHERE (from_squad = ? OR to_squad = ?) ORDER BY created_at DESC LIMIT 20'
  ).all(squadSlug, squadSlug);
  return { pipeline, node, handoffs };
}

function getSquadMetrics(db, squadSlug) {
  try {
    return db.prepare(
      'SELECT * FROM squad_metrics WHERE squad_slug = ? ORDER BY period DESC, metric_key ASC'
    ).all(squadSlug);
  } catch {
    return [];
  }
}

function getRecentEvents(db, squadSlug, limit = 30) {
  return db.prepare(
    "SELECT * FROM execution_events WHERE run_key LIKE ? ORDER BY created_at DESC LIMIT ?"
  ).all(`%${squadSlug}%`, limit);
}

function getSquadOverview(db, squadSlug) {
  return {
    contentItems: countContentItems(db, squadSlug),
    sessions: countSessions(db, squadSlug),
    learnings: countLearnings(db, squadSlug),
    deliveryRate: calcDeliveryRate(db, squadSlug),
    learningStats: getLearningStats(db, squadSlug),
    executionPlan: getExecutionPlan(db, squadSlug),
    pipelineInfo: getPipelineInfo(db, squadSlug),
    customMetrics: getSquadMetrics(db, squadSlug)
  };
}

module.exports = {
  countContentItems,
  countSessions,
  countLearnings,
  calcDeliveryRate,
  getRecentDeliveries,
  getRecentContent,
  getLearnings,
  getLearningStats,
  getExecutionPlan,
  getPipelineInfo,
  getSquadMetrics,
  getRecentEvents,
  getSquadOverview
};
