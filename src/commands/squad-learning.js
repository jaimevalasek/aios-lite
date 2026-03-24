'use strict';

const path = require('node:path');
const {
  openRuntimeDb,
  listSquadLearnings,
  getSquadLearning,
  updateSquadLearningStatus,
  promoteSquadLearning,
  archiveStaleSquadLearnings,
  getSquadLearningStats
} = require('../runtime-store');

const SQUADS_DIR = path.join('.aioson', 'squads');

/**
 * Subcommand: list <slug> [--status=active|stale|archived|promoted]
 * Lists learnings for a squad.
 */
async function handleList(projectDir, squadSlug, statusFilter, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_learning.slug_required'));
    return { found: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_learning.no_runtime'));
    return { found: false };
  }
  const { db } = handle;
  try {
    const rows = listSquadLearnings(db, squadSlug, statusFilter || null);
    if (rows.length === 0) {
      logger.log(t('squad_learning.no_learnings', { slug: squadSlug }));
      return { found: true, learnings: [] };
    }

    logger.log(`Learnings for squad: ${squadSlug} (${rows.length})`);
    logger.log('');
    for (const row of rows) {
      const icon = row.status === 'active' ? '●' : row.status === 'promoted' ? '★' : row.status === 'stale' ? '○' : '▪';
      logger.log(`  ${icon} [${row.type}] ${row.title} (freq: ${row.frequency}, ${row.confidence}) [${row.status}]`);
      logger.log(`    id: ${row.learning_id}`);
    }
    return { found: true, learnings: rows };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: stats <slug>
 * Shows statistics for a squad's learnings.
 */
async function handleStats(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_learning.slug_required'));
    return { found: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_learning.no_runtime'));
    return { found: false };
  }
  const { db } = handle;
  try {
    const stats = getSquadLearningStats(db, squadSlug);
    if (stats.length === 0) {
      logger.log(t('squad_learning.no_learnings', { slug: squadSlug }));
      return { found: true, stats: [] };
    }

    logger.log(`Learning stats for squad: ${squadSlug}`);
    logger.log('');
    let total = 0;
    for (const row of stats) {
      logger.log(`  ${row.type} / ${row.status}: ${row.count}`);
      total += row.count;
    }
    logger.log('');
    logger.log(`  Total: ${total}`);
    return { found: true, stats, total };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: archive <slug> [--days=90]
 * Moves stale learnings to archived status.
 */
async function handleArchive(projectDir, squadSlug, days, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_learning.slug_required'));
    return { archived: 0 };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_learning.no_runtime'));
    return { archived: 0 };
  }
  const { db } = handle;
  try {
    const count = archiveStaleSquadLearnings(db, squadSlug, days);
    logger.log(t('squad_learning.archived_count', { count, slug: squadSlug }));
    return { archived: count };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: promote <slug> <learning-id> --to=<rule-path>
 * Promotes a learning to a rule.
 */
async function handlePromote(projectDir, squadSlug, learningId, promotedTo, { logger, t }) {
  if (!squadSlug || !learningId) {
    logger.error(t('squad_learning.promote_usage'));
    return { promoted: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_learning.no_runtime'));
    return { promoted: false };
  }
  const { db } = handle;
  try {
    const learning = getSquadLearning(db, learningId);
    if (!learning || learning.squad_slug !== squadSlug) {
      logger.error(t('squad_learning.not_found', { id: learningId }));
      return { promoted: false };
    }

    const rulePath = promotedTo || path.join(SQUADS_DIR, squadSlug, 'rules', `${learning.type}-${Date.now()}.md`);
    const updated = promoteSquadLearning(db, learningId, rulePath);
    if (updated) {
      logger.log(t('squad_learning.promoted', { id: learningId, path: rulePath }));
    }
    return { promoted: updated, rulePath };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: export <slug>
 * Exports learnings as JSON.
 */
async function handleExport(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_learning.slug_required'));
    return { exported: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_learning.no_runtime'));
    return { exported: false };
  }
  const { db } = handle;
  try {
    const rows = listSquadLearnings(db, squadSlug);
    const output = {
      squad: squadSlug,
      exported_at: new Date().toISOString(),
      learnings: rows
    };
    logger.log(JSON.stringify(output, null, 2));
    return { exported: true, count: rows.length };
  } finally {
    db.close();
  }
}

/**
 * Entry point for CLI integration.
 */
async function runSquadLearning({ args = [], options = {}, logger = console, t = (k) => k } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = options.sub || args[1] || 'list';
  const slug = options.squad || args[2] || null;
  const context = { logger, t };

  if (sub === 'list') {
    return handleList(projectDir, slug, options.status || null, context);
  }
  if (sub === 'stats') {
    return handleStats(projectDir, slug, context);
  }
  if (sub === 'archive') {
    return handleArchive(projectDir, slug, options.days || 90, context);
  }
  if (sub === 'promote') {
    const learningId = args[3] || options.id;
    return handlePromote(projectDir, slug, learningId, options.to || null, context);
  }
  if (sub === 'export') {
    return handleExport(projectDir, slug, context);
  }

  logger.error(`Unknown subcommand: ${sub}. Available: list, stats, archive, promote, export`);
  return { error: true };
}

module.exports = { runSquadLearning, handleList, handleStats, handleArchive, handlePromote, handleExport };
