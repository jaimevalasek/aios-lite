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
const { resolveTargetDir } = require('../lib/project-root');

const SEARCHES_DIR = 'squad-searches';
const DIMENSION_HEADERS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
const CONFIDENCE_LABELS = {
  high: 0.9,
  medium: 0.7,
  low: 0.4
};

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function syncInvestigationLinkToSquad(projectDir, squadSlug, row) {
  const manifestPath = path.join(projectDir, '.aioson', 'squads', squadSlug, 'squad.manifest.json');
  const blueprintPath = path.join(projectDir, '.aioson', 'squads', '.designs', `${squadSlug}.blueprint.json`);
  const investigationRef = {
    slug: row.investigation_slug,
    path: row.report_path || null,
    confidence: Number(row.confidence) || 0,
    dimensionsCovered: Number(row.dimensions_covered) || 0,
    date: row.created_at ? String(row.created_at).slice(0, 10) : null
  };

  const manifest = await readJsonIfExists(manifestPath);
  if (!manifest || typeof manifest !== 'object') {
    throw new Error(`Squad manifest not found: ${manifestPath}`);
  }

  manifest.investigation = investigationRef;
  await writeJson(manifestPath, manifest);

  const blueprint = await readJsonIfExists(blueprintPath);
  if (blueprint && typeof blueprint === 'object') {
    blueprint.investigation = investigationRef;
    await writeJson(blueprintPath, blueprint);
  }
}

/**
 * New reports declare which dimensions were actually investigated so Quick
 * and Targeted reports can keep the full D1-D7 skeleton without pretending
 * they researched every section. Legacy reports fall back to heading counts.
 */
function extractDeclaredDimensions(content) {
  const text = String(content || '');
  const match = text.match(/^>\s*Dimensions investigated:\s*(.*)$/im);
  if (!match) return null;

  const dimensions = [];
  const seen = new Set();
  for (const token of match[1].toUpperCase().matchAll(/\bD[1-7]\b/g)) {
    if (!seen.has(token[0])) {
      seen.add(token[0]);
      dimensions.push(token[0]);
    }
  }
  return dimensions;
}

/**
 * Parse the evidence confidence declared by a report. Numeric confidence is
 * retained for legacy reports; new reports use honest high/medium/low labels.
 */
function parseReportedConfidence(content) {
  const text = String(content || '');
  const match = text.match(/^>\s*Confidence:\s*([^\r\n]+)$/im);
  if (!match) return null;

  const normalized = match[1].trim().toLowerCase();
  for (const [label, value] of Object.entries(CONFIDENCE_LABELS)) {
    if (new RegExp(`^${label}\\b`).test(normalized)) return value;
  }

  const numeric = normalized.match(/^(?:0(?:\.\d+)?|1(?:\.0+)?)\b/);
  if (!numeric) return null;
  const value = Number(numeric[0]);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

/**
 * Count how many of the 7 investigation dimensions were actually researched.
 */
function countDimensions(content) {
  const text = String(content || '');
  const declared = extractDeclaredDimensions(text);
  if (declared) return declared.length;

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
    const investigation = getInvestigation(db, invSlug);
    if (!investigation) {
      logger.error(t('squad_investigate.not_found', { slug: invSlug }));
      return { linked: false };
    }

    const success = linkInvestigation(db, invSlug, squadSlug);
    if (success) {
      await syncInvestigationLinkToSquad(projectDir, squadSlug, investigation);
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
    const explicitConfidence = options.confidence === undefined || options.confidence === null || String(options.confidence).trim() === ''
      ? null
      : Number(options.confidence);
    const reportConfidence = parseReportedConfidence(content);
    const confidence = Number.isFinite(explicitConfidence) && explicitConfidence >= 0 && explicitConfidence <= 1
      ? explicitConfidence
      : reportConfidence ?? score;
    const relPath = path.relative(projectDir, absPath);
    const slug = insertInvestigation(db, {
      investigationSlug: options.slug || undefined,
      domain: options.domain || path.basename(reportPath, '.md'),
      mode: options.mode || 'full',
      dimensionsCovered: covered,
      totalDimensions: total,
      confidence,
      reportPath: relPath,
      linkedSquadSlug: options.squad || null
    });
    if (options.squad) {
      const row = getInvestigation(db, slug);
      if (row) {
        await syncInvestigationLinkToSquad(projectDir, options.squad, row);
      }
    }
    logger.log(t('squad_investigate.registered', { slug, path: relPath }));
    return {
      registered: true,
      slug,
      reportPath: relPath,
      dimensionsCovered: covered,
      totalDimensions: total,
      confidence
    };
  } finally {
    db.close();
  }
}

async function runSquadInvestigate({ args = [], options = {}, logger = console, t = (k) => k } = {}) {
  const projectDir = resolveTargetDir(args);
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

module.exports = {
  runSquadInvestigate,
  scoreCompleteness,
  countDimensions,
  extractDeclaredDimensions,
  parseReportedConfidence
};
