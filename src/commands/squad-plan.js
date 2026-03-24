'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  openRuntimeDb,
  upsertSquadExecutionPlan,
  getSquadExecutionPlan,
  getSquadExecutionPlanBySquad,
  listSquadExecutionPlans,
  updateSquadExecutionPlanStatus,
  upsertSquadPlanRound,
  updateSquadPlanRoundStatus,
  getSquadPlanRounds
} = require('../runtime-store');

const SQUADS_DIR = path.join('.aioson', 'squads');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute hash of squad manifest for staleness detection.
 */
async function computeManifestHash(projectDir, squadSlug) {
  const manifestPath = path.resolve(projectDir, SQUADS_DIR, squadSlug, 'squad.manifest.json');
  const hash = crypto.createHash('sha256');
  try {
    const stat = await fs.stat(manifestPath);
    hash.update(`manifest:${stat.mtimeMs}`);
  } catch {
    hash.update('manifest:missing');
  }
  return hash.digest('hex').slice(0, 16);
}

/**
 * Parse execution plan frontmatter.
 */
function parsePlanFrontmatter(content) {
  const text = String(content || '');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      meta[key.trim()] = rest.join(':').trim().replace(/^"(.*)"$/, '$1');
    }
  }
  return meta;
}

/**
 * Count rounds in an execution plan markdown.
 */
function countRounds(content) {
  const text = String(content || '');
  const matches = text.match(/^### Round \d+/gm);
  return matches ? matches.length : 0;
}

/**
 * Resolve the execution plan path for a squad.
 */
function planPath(projectDir, squadSlug) {
  return path.resolve(projectDir, SQUADS_DIR, squadSlug, 'docs', 'execution-plan.md');
}

/**
 * Subcommand: show <slug>
 * Shows the execution plan for a squad.
 */
async function handleShow(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_plan.slug_required'));
    return { found: false };
  }

  const pp = planPath(projectDir, squadSlug);
  if (!(await pathExists(pp))) {
    logger.error(t('squad_plan.not_found', { slug: squadSlug }));
    return { found: false };
  }

  const content = await fs.readFile(pp, 'utf8');
  const meta = parsePlanFrontmatter(content);
  const rounds = countRounds(content);

  logger.log(`Execution Plan: ${squadSlug}`);
  logger.log(`Status: ${meta.status || 'unknown'}`);
  logger.log(`Rounds: ${rounds}`);
  logger.log('');
  logger.log(content);

  return { found: true, meta, rounds };
}

/**
 * Subcommand: status <slug>
 * Shows progress of the execution plan from SQLite.
 */
async function handleStatus(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_plan.slug_required'));
    return { found: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_plan.no_runtime'));
    return { found: false };
  }
  const { db } = handle;
  try {
    const plan = getSquadExecutionPlanBySquad(db, squadSlug);
    if (!plan) {
      logger.error(t('squad_plan.no_plan', { slug: squadSlug }));
      return { found: false };
    }

    const rounds = getSquadPlanRounds(db, plan.plan_slug);
    logger.log(`Plan: ${plan.plan_slug}`);
    logger.log(`Squad: ${plan.squad_slug}`);
    logger.log(`Status: ${plan.status}`);
    logger.log(`Progress: ${plan.rounds_completed}/${plan.rounds_total}`);
    logger.log('');
    for (const rd of rounds) {
      const icon = rd.status === 'completed' ? '✓' : rd.status === 'in_progress' ? '▸' : '○';
      logger.log(`  ${icon} Round ${rd.round_number}: ${rd.title} (@${rd.executor_slug}) [${rd.status}]`);
    }
    return { found: true, plan, rounds };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: checkpoint <slug> <round-number>
 * Marks a round as completed.
 */
async function handleCheckpoint(projectDir, squadSlug, roundNumber, { logger, t }) {
  if (!squadSlug || !roundNumber || isNaN(Number(roundNumber))) {
    logger.error(t('squad_plan.checkpoint_usage'));
    return { updated: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_plan.no_runtime'));
    return { updated: false };
  }
  const { db } = handle;
  try {
    const plan = getSquadExecutionPlanBySquad(db, squadSlug);
    if (!plan) {
      logger.error(t('squad_plan.no_plan', { slug: squadSlug }));
      return { updated: false };
    }

    const updated = updateSquadPlanRoundStatus(db, plan.plan_slug, Number(roundNumber), 'completed');
    if (updated) {
      logger.log(t('squad_plan.round_completed', { round: roundNumber }));
    } else {
      logger.error(t('squad_plan.round_not_found', { round: roundNumber }));
    }
    return { updated };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: stale <slug>
 * Checks if the squad manifest changed after the plan was created.
 */
async function handleStale(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_plan.slug_required'));
    return { found: false, stale: false };
  }

  const pp = planPath(projectDir, squadSlug);
  if (!(await pathExists(pp))) {
    logger.error(t('squad_plan.not_found', { slug: squadSlug }));
    return { found: false, stale: false };
  }

  const content = await fs.readFile(pp, 'utf8');
  const meta = parsePlanFrontmatter(content);
  if (!meta.created) {
    logger.log(t('squad_plan.no_created_date'));
    return { found: true, stale: false };
  }

  const planDate = new Date(meta.created);
  const manifestFile = path.resolve(projectDir, SQUADS_DIR, squadSlug, 'squad.manifest.json');
  let stale = false;

  try {
    const stat = await fs.stat(manifestFile);
    if (stat.mtime > planDate) {
      logger.log('  ⚠ squad.manifest.json modified after plan was created');
      stale = true;
    }
  } catch {
    // manifest missing — not stale, just broken
  }

  // Also check blueprint
  const designsDir = path.resolve(projectDir, SQUADS_DIR, '.designs');
  try {
    const files = await fs.readdir(designsDir);
    const bpFile = files.find(f => f.startsWith(squadSlug) && f.endsWith('.blueprint.json'));
    if (bpFile) {
      const bpPath = path.join(designsDir, bpFile);
      const stat = await fs.stat(bpPath);
      if (stat.mtime > planDate) {
        logger.log('  ⚠ blueprint modified after plan was created');
        stale = true;
      }
    }
  } catch {
    // designs dir may not exist
  }

  if (stale) {
    logger.log(t('squad_plan.is_stale'));
  } else {
    logger.log(t('squad_plan.is_fresh'));
  }

  return { found: true, stale };
}

/**
 * Subcommand: register <slug>
 * Registers an existing execution plan file into the runtime SQLite.
 */
async function handleRegister(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_plan.slug_required'));
    return { registered: false };
  }

  const pp = planPath(projectDir, squadSlug);
  if (!(await pathExists(pp))) {
    logger.error(t('squad_plan.not_found', { slug: squadSlug }));
    return { registered: false };
  }

  const content = await fs.readFile(pp, 'utf8');
  const meta = parsePlanFrontmatter(content);
  const rounds = countRounds(content);
  const hash = await computeManifestHash(projectDir, squadSlug);

  const handle = await openRuntimeDb(projectDir);
  const { db } = handle;
  try {
    const planSlug = upsertSquadExecutionPlan(db, {
      squadSlug,
      status: meta.status || 'draft',
      roundsTotal: rounds,
      roundsCompleted: 0,
      basedOnBlueprint: meta.based_on_blueprint || null,
      basedOnInvestigation: meta.based_on_investigation || null,
      sourceHash: hash
    });
    logger.log(t('squad_plan.registered', { planSlug, rounds }));
    return { registered: true, planSlug };
  } finally {
    db.close();
  }
}

/**
 * Main router for squad-plan subcommands.
 */
async function run(projectDir, args, context) {
  const sub = args[0] || 'show';
  const rest = args.slice(1);

  switch (sub) {
    case 'show':
      return handleShow(projectDir, rest[0], context);
    case 'status':
      return handleStatus(projectDir, rest[0], context);
    case 'checkpoint':
      return handleCheckpoint(projectDir, rest[0], rest[1], context);
    case 'stale':
      return handleStale(projectDir, rest[0], context);
    case 'register':
      return handleRegister(projectDir, rest[0], context);
    default:
      context.logger.error(`Unknown subcommand: ${sub}. Available: show, status, checkpoint, stale, register`);
      return { error: true };
  }
}

/**
 * Entry point for CLI integration (same signature as other commands).
 */
async function runSquadPlan({ args = [], options = {}, logger = console, t = (k) => k } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = options.sub || args[1] || 'show';
  const slug = options.squad || args[2] || null;
  const context = { logger, t };

  if (sub === 'show') return handleShow(projectDir, slug, context);
  if (sub === 'status') return handleStatus(projectDir, slug, context);
  if (sub === 'checkpoint') {
    const round = args[3] || options.round;
    return handleCheckpoint(projectDir, slug, round, context);
  }
  if (sub === 'stale') return handleStale(projectDir, slug, context);
  if (sub === 'register') return handleRegister(projectDir, slug, context);

  logger.error(`Unknown subcommand: ${sub}. Available: show, status, checkpoint, stale, register`);
  return { error: true };
}

module.exports = { run, runSquadPlan, handleShow, handleStatus, handleCheckpoint, handleStale, handleRegister };
