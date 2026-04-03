'use strict';

const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');
const { ensureRunnerQueue, addTask, listTasks } = require('../runner/queue-store');
const { importFromPlan } = require('../runner/plan-importer');

/**
 * aioson runner:plan — importa phases de um implementation-plan.md para a queue do runner.
 *
 * Usage:
 *   aioson runner:plan . --slug=checkout --agent=dev
 *   aioson runner:plan . --slug=checkout  (usa agent=dev por padrão)
 */
async function runRunnerPlan({ args, options = {}, logger }) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const { slug, agent = 'dev' } = options;

  if (!slug) {
    logger.error('--slug is required. Example: aioson runner:plan . --slug=checkout');
    return { ok: false };
  }

  let importResult;
  try {
    importResult = await importFromPlan(projectDir, slug, { agent });
  } catch (err) {
    logger.error(`[runner:plan] ${err.message}`);
    return { ok: false, error: err.message };
  }

  const { tasks, planPath } = importResult;

  if (tasks.length === 0) {
    logger.error(
      `[runner:plan] No phases found in implementation-plan-${slug}.md.\n` +
      '  Expected sections like: ## Phase 1 — Create migration\n' +
      '  Add phase headings to the plan and try again.'
    );
    return { ok: false, error: 'no_phases_found' };
  }

  const handle = await openRuntimeDb(projectDir, {});
  if (!handle) {
    logger.error('Could not open runtime database.');
    return { ok: false };
  }
  const { db } = handle;
  ensureRunnerQueue(db);

  try {
    for (const t of tasks) {
      addTask(db, { task: t.task, agent: t.agent });
    }
  } finally {
    try { db.close(); } catch { /* noop */ }
  }

  const relPath = path.relative(projectDir, planPath);
  logger.log(`[runner:plan] Imported ${tasks.length} task(s) from ${relPath}:`);
  for (const t of tasks) {
    logger.log(`  ○ @${t.agent}  ${t.task}`);
  }
  logger.log('');
  logger.log('Run with: aioson runner:queue run .');

  return { ok: true, tasks, planPath };
}

module.exports = { runRunnerPlan };
