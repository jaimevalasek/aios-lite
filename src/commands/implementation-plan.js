'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  openRuntimeDb,
  upsertImplementationPlan,
  getImplementationPlan,
  listImplementationPlans,
  updateImplementationPlanStatus,
  upsertPlanPhase,
  updatePlanPhaseStatus,
  getPlanPhases
} = require('../runtime-store');

const CONTEXT_DIR = path.join('.aioson', 'context');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute a simple hash of an array of files for staleness detection.
 */
async function computeSourceHash(projectDir, filePaths) {
  const hash = crypto.createHash('sha256');
  for (const fp of filePaths) {
    const abs = path.resolve(projectDir, fp);
    try {
      const stat = await fs.stat(abs);
      hash.update(`${fp}:${stat.mtimeMs}`);
    } catch {
      hash.update(`${fp}:missing`);
    }
  }
  return hash.digest('hex').slice(0, 16);
}

/**
 * Detect plan files in the context directory.
 */
async function detectPlanFiles(projectDir) {
  const contextDir = path.resolve(projectDir, CONTEXT_DIR);
  const plans = [];
  try {
    const files = await fs.readdir(contextDir);
    for (const f of files) {
      if (f.startsWith('implementation-plan') && f.endsWith('.md')) {
        const slug = f === 'implementation-plan.md'
          ? null
          : f.replace('implementation-plan-', '').replace('.md', '');
        plans.push({ file: f, featureSlug: slug, path: path.join(CONTEXT_DIR, f) });
      }
    }
  } catch {
    // context dir may not exist
  }
  return plans;
}

/**
 * Parse plan frontmatter to extract status and metadata.
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
 * Count phases in an implementation plan markdown.
 */
function countPhases(content) {
  const text = String(content || '');
  const matches = text.match(/^### Fase \d+/gm);
  return matches ? matches.length : 0;
}

/**
 * Subcommand: show [slug]
 * Shows the current implementation plan.
 */
async function handleShow(projectDir, featureSlug, { logger, t }) {
  const fileName = featureSlug
    ? `implementation-plan-${featureSlug}.md`
    : 'implementation-plan.md';
  const planPath = path.resolve(projectDir, CONTEXT_DIR, fileName);

  if (!(await pathExists(planPath))) {
    logger.error(t('implementation_plan.not_found', { file: fileName }));
    return { found: false };
  }

  const content = await fs.readFile(planPath, 'utf8');
  const meta = parsePlanFrontmatter(content);
  const phases = countPhases(content);

  logger.log(`Plan: ${fileName}`);
  logger.log(`Status: ${meta.status || 'unknown'}`);
  logger.log(`Classification: ${meta.classification || 'unknown'}`);
  logger.log(`Phases: ${phases}`);
  logger.log('');
  logger.log(content);

  return { found: true, meta, phases };
}

/**
 * Subcommand: status [slug]
 * Shows progress of the implementation plan from SQLite.
 */
async function handleStatus(projectDir, featureSlug, { logger, t }) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('implementation_plan.no_runtime'));
    return { found: false };
  }
  const { db } = handle;
  try {
    const rows = listImplementationPlans(db);
    const match = featureSlug
      ? rows.find(r => r.feature_slug === featureSlug)
      : rows.find(r => r.scope === 'project') || rows[0];

    if (!match) {
      logger.error(t('implementation_plan.no_plans'));
      return { found: false };
    }

    const phases = getPlanPhases(db, match.plan_id);
    logger.log(`Plan: ${match.plan_id}`);
    logger.log(`Status: ${match.status}`);
    logger.log(`Progress: ${match.phases_completed}/${match.phases_total}`);
    logger.log('');
    for (const ph of phases) {
      const icon = ph.status === 'completed' ? '✓' : ph.status === 'in_progress' ? '▸' : '○';
      logger.log(`  ${icon} Phase ${ph.phase_number}: ${ph.title} [${ph.status}]`);
    }
    return { found: true, plan: match, phases };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: checkpoint [slug] <phase-number>
 * Marks a phase as completed.
 */
async function handleCheckpoint(projectDir, featureSlug, phaseNumber, { logger, t }) {
  if (!phaseNumber || isNaN(Number(phaseNumber))) {
    logger.error(t('implementation_plan.checkpoint_usage'));
    return { updated: false };
  }
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('implementation_plan.no_runtime'));
    return { updated: false };
  }
  const { db } = handle;
  try {
    const rows = listImplementationPlans(db);
    const match = featureSlug
      ? rows.find(r => r.feature_slug === featureSlug)
      : rows.find(r => r.scope === 'project') || rows[0];

    if (!match) {
      logger.error(t('implementation_plan.no_plans'));
      return { updated: false };
    }

    const updated = updatePlanPhaseStatus(db, match.plan_id, Number(phaseNumber), 'completed');
    if (updated) {
      logger.log(t('implementation_plan.phase_completed', { phase: phaseNumber }));
    } else {
      logger.error(t('implementation_plan.phase_not_found', { phase: phaseNumber }));
    }
    return { updated };
  } finally {
    db.close();
  }
}

/**
 * Subcommand: stale [slug]
 * Checks if source artifacts changed after the plan was created.
 */
async function handleStale(projectDir, featureSlug, { logger, t }) {
  const fileName = featureSlug
    ? `implementation-plan-${featureSlug}.md`
    : 'implementation-plan.md';
  const planPath = path.resolve(projectDir, CONTEXT_DIR, fileName);

  if (!(await pathExists(planPath))) {
    logger.error(t('implementation_plan.not_found', { file: fileName }));
    return { found: false, stale: false };
  }

  const content = await fs.readFile(planPath, 'utf8');
  const meta = parsePlanFrontmatter(content);
  if (!meta.created) {
    logger.log(t('implementation_plan.no_created_date'));
    return { found: true, stale: false };
  }

  const planDate = new Date(meta.created);
  const contextDir = path.resolve(projectDir, CONTEXT_DIR);
  const sourceFiles = ['project.context.md', 'architecture.md', 'prd.md', 'discovery.md', 'ui-spec.md'];
  let stale = false;

  for (const sf of sourceFiles) {
    const sfPath = path.join(contextDir, sf);
    try {
      const stat = await fs.stat(sfPath);
      if (stat.mtime > planDate) {
        logger.log(`  ⚠ ${sf} modified after plan was created`);
        stale = true;
      }
    } catch {
      // file doesn't exist, skip
    }
  }

  if (stale) {
    logger.log(t('implementation_plan.is_stale'));
  } else {
    logger.log(t('implementation_plan.is_fresh'));
  }

  return { found: true, stale };
}

/**
 * Subcommand: register
 * Registers an existing plan file into the runtime SQLite.
 */
async function handleRegister(projectDir, featureSlug, { logger, t }) {
  const fileName = featureSlug
    ? `implementation-plan-${featureSlug}.md`
    : 'implementation-plan.md';
  const planPath = path.resolve(projectDir, CONTEXT_DIR, fileName);

  if (!(await pathExists(planPath))) {
    logger.error(t('implementation_plan.not_found', { file: fileName }));
    return { registered: false };
  }

  const content = await fs.readFile(planPath, 'utf8');
  const meta = parsePlanFrontmatter(content);
  const phases = countPhases(content);

  const contextDir = path.resolve(projectDir, CONTEXT_DIR);
  const sourceFiles = ['project.context.md', 'architecture.md', 'prd.md'];
  const existingSources = [];
  for (const sf of sourceFiles) {
    if (await pathExists(path.join(contextDir, sf))) existingSources.push(sf);
  }
  const hash = await computeSourceHash(projectDir, existingSources.map(s => path.join(CONTEXT_DIR, s)));

  const handle = await openRuntimeDb(projectDir);
  const { db } = handle;
  try {
    const planId = upsertImplementationPlan(db, {
      projectName: meta.project || path.basename(projectDir),
      scope: meta.scope || 'project',
      featureSlug: meta.feature_slug || featureSlug || null,
      status: meta.status || 'draft',
      classification: meta.classification || null,
      phasesTotal: phases,
      phasesCompleted: 0,
      sourceArtifacts: existingSources,
      sourceHash: hash
    });
    logger.log(t('implementation_plan.registered', { planId, phases }));
    return { registered: true, planId };
  } finally {
    db.close();
  }
}

/**
 * Main router for implementation-plan subcommands.
 */
async function run(projectDir, args, context) {
  const sub = args[0] || 'show';
  const rest = args.slice(1);

  switch (sub) {
    case 'show':
      return handleShow(projectDir, rest[0] || null, context);
    case 'status':
      return handleStatus(projectDir, rest[0] || null, context);
    case 'checkpoint':
      return handleCheckpoint(projectDir, rest[0] || null, rest[1], context);
    case 'stale':
      return handleStale(projectDir, rest[0] || null, context);
    case 'register':
      return handleRegister(projectDir, rest[0] || null, context);
    default:
      context.logger.error(`Unknown subcommand: ${sub}. Available: show, status, checkpoint, stale, register`);
      return { error: true };
  }
}

/**
 * Entry point for CLI integration (same signature as other commands).
 */
async function runImplementationPlan({ args = [], options = {}, logger = console, t = (k) => k } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = options.sub || args[1] || 'show';
  const slug = options.feature || options.slug || args[2] || null;
  const context = { logger, t };

  if (sub === 'show') return handleShow(projectDir, slug, context);
  if (sub === 'status') return handleStatus(projectDir, slug, context);
  if (sub === 'checkpoint') {
    const phase = args[3] || options.phase;
    return handleCheckpoint(projectDir, slug, phase, context);
  }
  if (sub === 'stale') return handleStale(projectDir, slug, context);
  if (sub === 'register') return handleRegister(projectDir, slug, context);

  logger.error(`Unknown subcommand: ${sub}. Available: show, status, checkpoint, stale, register`);
  return { error: true };
}

module.exports = { run, runImplementationPlan, handleShow, handleStatus, handleCheckpoint, handleStale, handleRegister };
