'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  openRuntimeDb,
  insertInvestigation,
  listInvestigations,
  getInvestigation,
  linkInvestigation
} = require('../runtime-store');

const SEARCHES_DIR = 'squad-searches';
const DIMENSION_HEADERS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Count how many of the 7 investigation dimensions are present in a report.
 * Looks for headers like "## D1:", "## D2:", ..., "## D7:" in the markdown.
 */
function countDimensions(content) {
  const text = String(content || '');
  let count = 0;
  for (const dim of DIMENSION_HEADERS) {
    const pattern = new RegExp(`^##\\s+${dim}[:\\s]`, 'm');
    if (pattern.test(text)) count++;
  }
  return count;
}

/**
 * Calculate an investigation completeness score (0-1).
 */
function scoreCompleteness(content) {
  const covered = countDimensions(content);
  const total = DIMENSION_HEADERS.length;
  return { covered, total, score: Math.round((covered / total) * 100) / 100 };
}

/**
 * Subcommand: list
 * Lists all investigations registered in the runtime SQLite.
 */
async function handleList(projectDir, { logger, t }) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_investigate.no_runtime'));
    return { investigations: [], count: 0 };
  }
  const { db } = handle;
  try {
    const rows = listInvestigations(db);
    if (rows.length === 0) {
      logger.log(t('squad_investigate.no_investigations'));
      return { investigations: [], count: 0 };
    }
    for (const row of rows) {
      const linked = row.linked_squad_slug ? ` → ${row.linked_squad_slug}` : '';
      const dims = `${row.dimensions_covered}/${row.total_dimensions}`;
      logger.log(`  ${row.investigation_slug}  [${row.mode}]  ${row.domain}  ${dims}  conf=${row.confidence}${linked}`);
    }
    return { investigations: rows, count: rows.length };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: show <slug>
 * Shows the investigation report content.
 */
async function handleShow(projectDir, slug, { logger, t }) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_investigate.no_runtime'));
    return { found: false };
  }
  const { db } = handle;
  try {
    const row = getInvestigation(db, slug);
    if (!row) {
      logger.error(t('squad_investigate.not_found', { slug }));
      return { found: false };
    }
    logger.log(`Investigation: ${row.investigation_slug}`);
    logger.log(`Domain: ${row.domain}`);
    logger.log(`Mode: ${row.mode}`);
    logger.log(`Dimensions: ${row.dimensions_covered}/${row.total_dimensions}`);
    logger.log(`Confidence: ${row.confidence}`);
    logger.log(`Report: ${row.report_path || '(none)'}`);
    logger.log(`Linked squad: ${row.linked_squad_slug || '(standalone)'}`);
    logger.log(`Created: ${row.created_at}`);

    if (row.report_path) {
      const reportFile = path.resolve(projectDir, row.report_path);
      if (await pathExists(reportFile)) {
        const content = await fs.readFile(reportFile, 'utf8');
        logger.log('');
        logger.log(content);
      }
    }
    return { found: true, investigation: row };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: score <slug>
 * Calculates the completeness score for an investigation report.
 */
async function handleScore(projectDir, slug, { logger, t }) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_investigate.no_runtime'));
    return { found: false, score: 0 };
  }
  const { db } = handle;
  try {
    const row = getInvestigation(db, slug);
    if (!row) {
      logger.error(t('squad_investigate.not_found', { slug }));
      return { found: false, score: 0 };
    }
    if (!row.report_path) {
      logger.error(t('squad_investigate.no_report', { slug }));
      return { found: true, score: 0 };
    }
    const reportFile = path.resolve(projectDir, row.report_path);
    if (!(await pathExists(reportFile))) {
      logger.error(t('squad_investigate.report_missing', { path: row.report_path }));
      return { found: true, score: 0 };
    }
    const content = await fs.readFile(reportFile, 'utf8');
    const result = scoreCompleteness(content);
    logger.log(`Completeness: ${result.covered}/${result.total} dimensions (${result.score})`);
    return { found: true, ...result };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: link <investigation-slug> <squad-slug>
 * Associates an investigation with a squad.
 */
async function handleLink(projectDir, invSlug, squadSlug, { logger, t }) {
  if (!invSlug || !squadSlug) {
    logger.error(t('squad_investigate.link_usage'));
    return { linked: false };
  }
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_investigate.no_runtime'));
    return { linked: false };
  }
  const { db } = handle;
  try {
    const success = linkInvestigation(db, invSlug, squadSlug);
    if (success) {
      logger.log(t('squad_investigate.linked', { investigation: invSlug, squad: squadSlug }));
    } else {
      logger.error(t('squad_investigate.not_found', { slug: invSlug }));
    }
    return { linked: success };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: register
 * Registers an existing investigation report file into the runtime SQLite.
 */
async function handleRegister(projectDir, reportPath, options, { logger, t }) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_investigate.no_runtime'));
    return { registered: false };
  }
  const { db } = handle;
  try {
    const absPath = path.resolve(projectDir, reportPath);
    if (!(await pathExists(absPath))) {
      logger.error(t('squad_investigate.report_missing', { path: reportPath }));
      return { registered: false };
    }
    const content = await fs.readFile(absPath, 'utf8');
    const { covered, total, score } = scoreCompleteness(content);
    const relPath = path.relative(projectDir, absPath);
    const slug = insertInvestigation(db, {
      investigationSlug: options.slug || undefined,
      domain: options.domain || path.basename(reportPath, '.md'),
      mode: options.mode || 'full',
      dimensionsCovered: covered,
      totalDimensions: total,
      confidence: options.confidence ? Number(options.confidence) : score,
      reportPath: relPath,
      linkedSquadSlug: options.squad || null
    });
    logger.log(t('squad_investigate.registered', { slug, path: relPath }));
    return { registered: true, slug };
  } finally {
    db.close();
  }
}

async function runSquadInvestigate({ args = [], options = {}, logger = console, t = (k) => k } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = options.sub || args[1] || 'list';

  if (sub === 'list') {
    return handleList(projectDir, { logger, t });
  }

  if (sub === 'show') {
    const slug = options.investigation || args[2];
    if (!slug) {
      logger.error(t('squad_investigate.show_usage'));
      return { found: false };
    }
    return handleShow(projectDir, slug, { logger, t });
  }

  if (sub === 'score') {
    const slug = options.investigation || args[2];
    if (!slug) {
      logger.error(t('squad_investigate.score_usage'));
      return { found: false, score: 0 };
    }
    return handleScore(projectDir, slug, { logger, t });
  }

  if (sub === 'link') {
    const invSlug = options.investigation || args[2];
    const squadSlug = options.squad || args[3];
    return handleLink(projectDir, invSlug, squadSlug, { logger, t });
  }

  if (sub === 'register') {
    const reportPath = options.report || args[2];
    if (!reportPath) {
      logger.error(t('squad_investigate.register_usage'));
      return { registered: false };
    }
    return handleRegister(projectDir, reportPath, options, { logger, t });
  }

  logger.error(t('squad_investigate.unknown_sub', { sub }));
  return { error: `Unknown subcommand: ${sub}` };
}

module.exports = { runSquadInvestigate, scoreCompleteness, countDimensions };
