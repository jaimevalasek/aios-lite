'use strict';

/**
 * aioson runner:queue:from-plan — import phases from an implementation plan into the runner queue.
 *
 * Reads an implementation-plan-{slug}.md, extracts phases, and creates runner queue
 * tasks with dependency ordering. No LLM calls.
 *
 * Usage:
 *   aioson runner:queue:from-plan . --plan=.aioson/context/implementation-plan-checkout.md
 *   aioson runner:queue:from-plan . --feature=checkout
 *   aioson runner:queue:from-plan . --feature=checkout --agent=dev --dry-run
 */

const path = require('node:path');
const { readFileSafe, contextDir } = require('../preflight-engine');
const { openRuntimeDb } = require('../runtime-store');
const { ensureRunnerQueue, addTask } = require('../runner/queue-store');

// Phase extraction patterns
const PHASE_PATTERNS = [
  // "## Phase 1: Create migration" or "## Phase 1 — Create migration"
  /^#{2,3}\s+[Pp]hase\s+(\d+)[:\s—-]+(.+)$/m,
  // "### 1. Create migration"
  /^#{2,3}\s+(\d+)\.\s+(.+)$/m,
  // "**Phase 1:** Create migration"
  /^\*\*[Pp]hase\s+(\d+)[:\s—-]+\*\*\s*(.+)$/m
];

function extractPhases(content) {
  const phases = [];
  const lines = content.split(/\r?\n/);
  let currentPhase = null;
  let currentDescription = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try all phase header patterns
    let matched = false;
    for (const pattern of PHASE_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        // Save previous phase
        if (currentPhase) {
          currentPhase.detail = currentDescription.join(' ').trim().slice(0, 200);
          phases.push(currentPhase);
        }

        const num = parseInt(m[1]);
        const title = m[2].trim().replace(/\*+/g, '');
        currentPhase = { num, title, detail: '', lines: [line] };
        currentDescription = [];
        matched = true;
        break;
      }
    }

    if (!matched && currentPhase) {
      // Collect phase description from bullet points or short lines
      const bullet = line.match(/^[-*]\s+(.+)$/);
      if (bullet) currentDescription.push(bullet[1]);
    }
  }

  // Save last phase
  if (currentPhase) {
    currentPhase.detail = currentDescription.join(' ').trim().slice(0, 200);
    phases.push(currentPhase);
  }

  // Fallback: try H3 headings as phases if nothing found
  if (phases.length === 0) {
    const h3Re = /^###\s+(.+)$/gm;
    let m, num = 1;
    while ((m = h3Re.exec(content)) !== null) {
      phases.push({ num: num++, title: m[1].trim(), detail: '' });
    }
  }

  return phases;
}

async function runRunnerQueueFromPlan({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.feature ? String(options.feature) : null;
  const agent = options.agent ? String(options.agent) : 'dev';
  const dryRun = Boolean(options['dry-run'] || options.dry);

  // Resolve plan file
  let planPath = options.plan ? path.resolve(targetDir, options.plan) : null;
  if (!planPath && slug) {
    planPath = path.join(contextDir(targetDir), `implementation-plan-${slug}.md`);
  }

  if (!planPath) {
    if (options.json) return { ok: false, reason: 'no_plan', message: 'Provide --plan=<path> or --feature=<slug>' };
    logger.log('Provide --plan=<path> or --feature=<slug>.');
    return { ok: false };
  }

  const content = await readFileSafe(planPath);
  if (!content) {
    if (options.json) return { ok: false, reason: 'file_not_found', path: planPath };
    logger.log(`Plan file not found: ${path.relative(targetDir, planPath)}`);
    return { ok: false };
  }

  const phases = extractPhases(content);

  if (phases.length === 0) {
    if (options.json) return { ok: false, reason: 'no_phases', message: 'No phases found in plan file' };
    logger.log('No phases found in plan file. Expected "## Phase N: title" headings.');
    return { ok: false };
  }

  logger.log(`Importing ${phases.length} phases from ${path.relative(targetDir, planPath)}:`);

  if (dryRun) {
    for (const phase of phases) {
      const dep = phase.num > 1 ? ` (depends: Phase ${phase.num - 1})` : '';
      logger.log(`  Phase ${phase.num}: "${phase.title}"${dep} → would queue (priority: ${phase.num})`);
    }
    logger.log(`\n[dry-run] ${phases.length} tasks would be queued for @${agent}`);
    return { ok: true, dry_run: true, phases, agent };
  }

  // Open runtime DB and queue tasks
  const handle = await openRuntimeDb(targetDir, {});
  if (!handle) {
    if (options.json) return { ok: false, reason: 'no_runtime' };
    logger.log('Could not open runtime database.');
    return { ok: false };
  }

  const { db } = handle;
  ensureRunnerQueue(db);

  const queued = [];
  try {
    for (const phase of phases) {
      const taskDesc = phase.detail
        ? `Phase ${phase.num}: ${phase.title} — ${phase.detail}`
        : `Phase ${phase.num}: ${phase.title}`;

      const id = addTask(db, {
        task: taskDesc,
        agent,
        cascade: options.cascade || null,
        priority: phase.num
      });

      queued.push({ id, phase: phase.num, title: phase.title });
      const dep = phase.num > 1 ? ` (depends: Phase ${phase.num - 1})` : '';
      logger.log(`  Phase ${phase.num}: "${phase.title}"${dep} → queued (id: ${id}, priority: ${phase.num})`);
    }
  } finally {
    try { db.close(); } catch { /* noop */ }
  }

  logger.log(`\n${queued.length} tasks queued. Run: aioson runner:queue list`);

  return { ok: true, plan_path: path.relative(targetDir, planPath), agent, queued };
}

module.exports = { runRunnerQueueFromPlan };
