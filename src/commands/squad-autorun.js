'use strict';

/**
 * aioson squad:autorun — Autonomous squad execution
 *
 * Given a high-level goal, this command:
 *   1. Decomposes the goal into a task plan (heuristic or structured)
 *   2. Activates the intra-squad bus for real-time communication
 *   3. Runs each task through the worker-runner with optional reflection
 *   4. Coordinator monitors the bus for blocks or feedback
 *   5. Reports the final session summary
 *
 * Usage:
 *   aioson squad:autorun . --squad=content-team --goal="Create 3 podcast episodes"
 *   aioson squad:autorun . --squad=content-team --goal="..." --reflect --bus --mode=structured
 *   aioson squad:autorun . --squad=content-team --plan=SESSION_ID  (resume from saved plan)
 *   aioson squad:autorun . --squad=content-team --plan=SESSION_ID --dry-run
 *
 * Flags:
 *   --goal        High-level objective (required unless --plan is given)
 *   --reflect     Run reflection after each task (default: false)
 *   --bus         Enable intra-bus for inter-executor communication (default: true)
 *   --mode        Decomposition mode: heuristic (default) | structured
 *   --plan        Resume from existing session plan (session ID)
 *   --dry-run     Show plan without executing
 *   --sequential  Force sequential execution even for independent tasks (default: false)
 *   --timeout     Per-task timeout in seconds (default: 120)
 */

const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  decompose,
  getReadyTasks,
  isPlanComplete,
  updateTaskStatus,
  loadPlan,
  formatPlan
} = require('../squad/task-decomposer');
const bus = require('../squad/intra-bus');
const { reflect, formatReport } = require('../squad/reflection');
const { runWorker, listWorkers } = require('../worker-runner');

const STATUS_ICON = {
  pending: '○',
  in_progress: '●',
  completed: '✓',
  failed: '✗',
  escalated: '⚠',
  skipped: '–'
};

function icon(status) {
  return STATUS_ICON[status] || '?';
}

function nowIso() { return new Date().toISOString(); }

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Run a single task.
 * Falls back to a "no worker script" result when no run.js/run.py is found,
 * so the plan still progresses and the bus records what happened.
 */
async function runTask(projectDir, squadSlug, task, sessionId, options, logger) {
  const { enableBus, enableReflect, timeoutMs } = options;
  const taskCtx = {
    projectDir,
    squadSlug,
    executorSlug: task.executor || 'unknown',
    taskTitle: task.title,
    iteration: 1
  };

  // Post status to bus
  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: task.executor || 'coordinator',
      to: '*',
      type: 'status',
      content: `Starting: ${task.title}`,
      metadata: { task_id: task.id }
    }).catch(() => {});
  }

  await updateTaskStatus(projectDir, squadSlug, sessionId, task.id, 'in_progress');

  // Build worker input
  const workerInput = {
    task_id: task.id,
    title: task.title,
    description: task.description,
    acceptance_criteria: task.acceptance_criteria,
    session_id: sessionId,
    bus_enabled: enableBus
  };

  let workerResult = null;
  let taskOutput = null;
  let workerRan = false;

  // Try to run a worker script if one exists
  const workers = await listWorkers(projectDir, squadSlug);
  const workerConfig = workers.find(
    (w) => w.slug === task.executor || w.slug === task.id
  );

  if (workerConfig) {
    workerRan = true;
    workerResult = await runWorker(projectDir, squadSlug, workerConfig.slug, workerInput, {
      timeoutMs,
      triggerType: 'autorun'
    });
    taskOutput = workerResult.ok
      ? JSON.stringify(workerResult.output || '')
      : `Worker failed: ${workerResult.error}`;
  } else {
    // No worker script — record as "pending agent execution"
    // The plan + bus give the coordinator everything needed to run the agent manually
    taskOutput = `[no-worker-script] Task "${task.title}" assigned to executor "${task.executor}". Run manually or scaffold a worker with: aioson squad:worker --squad=${squadSlug} create --slug=${task.executor}`;
    workerResult = { ok: true, output: { message: taskOutput }, noScript: true };
  }

  // Reflection pass
  let reflectionResult = null;
  if (enableReflect && taskOutput && workerResult.ok) {
    reflectionResult = await reflect(taskOutput, { ...taskCtx, iteration: 1 });

    if (enableBus) {
      await bus.post(projectDir, squadSlug, sessionId, {
        from: task.executor || 'coordinator',
        to: '*',
        type: 'feedback',
        content: formatReport(reflectionResult, task.executor),
        metadata: { task_id: task.id, verdict: reflectionResult.verdict }
      }).catch(() => {});
    }
  }

  // Determine final status
  let finalStatus;
  if (!workerResult.ok) {
    finalStatus = 'failed';
  } else if (reflectionResult && reflectionResult.verdict === 'ESCALATE') {
    finalStatus = 'escalated';
  } else {
    finalStatus = 'completed';
  }

  await updateTaskStatus(projectDir, squadSlug, sessionId, task.id, finalStatus, {
    worker_ran: workerRan,
    output_summary: String(taskOutput || '').slice(0, 500),
    reflection: reflectionResult
      ? { verdict: reflectionResult.verdict, score: reflectionResult.score }
      : null,
    completed_at: nowIso()
  });

  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: task.executor || 'coordinator',
      to: '*',
      type: 'result',
      content: `${icon(finalStatus)} ${task.title} → ${finalStatus.toUpperCase()}${reflectionResult ? ` (reflection: ${reflectionResult.verdict})` : ''}`,
      metadata: { task_id: task.id, status: finalStatus }
    }).catch(() => {});
  }

  return { task, finalStatus, workerResult, reflectionResult };
}

async function runSquadAutorun({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const squadSlug = String(options.squad || options.s || '').trim();

  if (!squadSlug) {
    logger.error('Error: --squad is required');
    return { ok: false, error: 'missing_squad' };
  }

  const dryRun = Boolean(options['dry-run'] || options.dryRun);
  const enableBus = options.bus !== false && options.bus !== 'false';
  const enableReflect = Boolean(options.reflect);
  const sequential = Boolean(options.sequential);
  const mode = String(options.mode || 'heuristic').trim();
  const timeoutMs = (options.timeout ? Number(options.timeout) : 120) * 1000;
  const existingPlanId = String(options.plan || '').trim();

  // ── Load or create plan ────────────────────────────────────────────────────
  let plan;
  let sessionId;

  if (existingPlanId) {
    plan = await loadPlan(targetDir, squadSlug, existingPlanId);
    if (!plan) {
      logger.error(`Plan not found: session "${existingPlanId}" for squad "${squadSlug}"`);
      return { ok: false, error: 'plan_not_found' };
    }
    sessionId = existingPlanId;
    logger.log(`Resuming plan [${sessionId}] — ${plan.tasks.length} tasks`);
  } else {
    const goal = String(options.goal || '').trim();
    if (!goal) {
      logger.error('Error: --goal is required (or --plan to resume an existing plan)');
      return { ok: false, error: 'missing_goal' };
    }

    sessionId = randomUUID();
    logger.log(`Decomposing goal for squad "${squadSlug}" [${mode}]...`);
    plan = await decompose(targetDir, squadSlug, goal, { sessionId, mode, save: !dryRun });
    logger.log(`Plan ready: ${plan.tasks.length} tasks across ${Object.keys(plan.parallel_groups).length} parallel group(s)`);
  }

  // ── Show plan ──────────────────────────────────────────────────────────────
  if (options.json) {
    if (dryRun) return { ok: true, dryRun: true, plan };
  } else {
    logger.log('');
    logger.log(formatPlan(plan));
    logger.log('');
  }

  if (dryRun) {
    logger.log('[dry-run] Plan shown above. No tasks executed.');
    return { ok: true, dryRun: true, plan };
  }

  // ── Handle structured mode ────────────────────────────────────────────────
  if (mode === 'structured' && plan.structured_prompt) {
    const promptPath = path.join(
      targetDir, '.aioson', 'squads', squadSlug, 'sessions', sessionId, 'decompose-prompt.md'
    );
    const promptContent = [
      '---',
      `session_id: ${sessionId}`,
      `squad: ${squadSlug}`,
      `created_at: ${plan.created_at}`,
      '---',
      '',
      plan.structured_prompt,
      '',
      '> After the agent fills in the JSON above, run:',
      `> aioson squad:autorun . --squad=${squadSlug} --plan=${sessionId}`
    ].join('\n');

    const { ensureDir } = require('../utils');
    await ensureDir(path.dirname(promptPath));
    const fs = require('node:fs/promises');
    await fs.writeFile(promptPath, promptContent, 'utf8');

    logger.log(`[structured] Decomposition prompt saved to: ${path.relative(targetDir, promptPath)}`);
    logger.log('Activate your agent to fill in the plan, then resume with:');
    logger.log(`  aioson squad:autorun . --squad=${squadSlug} --plan=${sessionId}`);
    return { ok: true, mode: 'structured', sessionId, promptPath: path.relative(targetDir, promptPath), plan };
  }

  // ── Execute tasks ──────────────────────────────────────────────────────────
  logger.log(`Starting execution — session [${sessionId}]`);
  if (enableBus) logger.log('Intra-squad bus: enabled');
  if (enableReflect) logger.log('Reflection: enabled');
  logger.log('');

  const results = [];
  let completedCount = 0;
  let failedCount = 0;
  let escalatedCount = 0;
  const startedAt = Date.now();

  // Run in parallel group waves (or sequentially if --sequential)
  const groups = Object.keys(plan.parallel_groups).map(Number).sort((a, b) => a - b);

  for (const group of groups) {
    const groupTaskIds = plan.parallel_groups[group];
    const groupTasks = groupTaskIds
      .map((id) => plan.tasks.find((t) => t.id === id))
      .filter((t) => t && t.status === 'pending');

    if (groupTasks.length === 0) continue;

    logger.log(`── Group ${group} (${groupTasks.length} task${groupTasks.length > 1 ? 's' : ''})${groupTasks.length > 1 && !sequential ? ' — running in parallel' : ''}`);

    const runOptions = { enableBus, enableReflect, timeoutMs };

    let groupResults;
    if (sequential || groupTasks.length === 1) {
      groupResults = [];
      for (const task of groupTasks) {
        logger.log(`  ${icon('in_progress')} ${task.id}: ${task.title}`);
        const r = await runTask(targetDir, squadSlug, task, sessionId, runOptions, logger);
        logger.log(`  ${icon(r.finalStatus)} ${task.id}: ${r.finalStatus.toUpperCase()}`);
        groupResults.push(r);
      }
    } else {
      groupResults = await Promise.all(
        groupTasks.map(async (task) => {
          logger.log(`  ${icon('in_progress')} ${task.id}: ${task.title}`);
          const r = await runTask(targetDir, squadSlug, task, sessionId, runOptions, logger);
          logger.log(`  ${icon(r.finalStatus)} ${task.id}: ${r.finalStatus.toUpperCase()}`);
          return r;
        })
      );
    }

    results.push(...groupResults);

    for (const r of groupResults) {
      if (r.finalStatus === 'completed') completedCount++;
      else if (r.finalStatus === 'failed') failedCount++;
      else if (r.finalStatus === 'escalated') escalatedCount++;
    }

    // Short pause between groups to allow bus writes to flush
    if (groups.length > 1) await sleep(100);
  }

  // ── Session summary ────────────────────────────────────────────────────────
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const busSummary = enableBus
    ? await bus.summary(targetDir, squadSlug, sessionId).catch(() => null)
    : null;

  const summary = {
    ok: failedCount === 0,
    session_id: sessionId,
    squad: squadSlug,
    goal: plan.goal,
    elapsed_s: elapsed,
    tasks: {
      total: plan.tasks.length,
      completed: completedCount,
      failed: failedCount,
      escalated: escalatedCount
    },
    bus: busSummary
      ? { total_messages: busSummary.total, blocks: busSummary.blocks.length }
      : null
  };

  if (options.json) return summary;

  logger.log('');
  logger.log('── Autorun complete ─────────────────────────────────────────');
  logger.log(`Session:   ${sessionId}`);
  logger.log(`Elapsed:   ${elapsed}s`);
  logger.log(`Tasks:     ${completedCount}/${plan.tasks.length} completed  ${failedCount > 0 ? `| ${failedCount} failed` : ''}  ${escalatedCount > 0 ? `| ${escalatedCount} escalated` : ''}`);
  if (busSummary && busSummary.total > 0) {
    logger.log(`Bus:       ${busSummary.total} messages${busSummary.blocks.length > 0 ? ` | ⚠ ${busSummary.blocks.length} block(s)` : ''}`);
  }
  if (escalatedCount > 0) {
    logger.log('');
    logger.log('⚠ Escalated tasks require coordinator attention:');
    for (const r of results.filter((r) => r.finalStatus === 'escalated')) {
      logger.log(`  ${r.task.id}: ${r.task.title}`);
    }
  }
  logger.log('');
  logger.log(`Plan saved: .aioson/squads/${squadSlug}/sessions/${sessionId}/plan.json`);
  if (enableBus) logger.log(`Bus file:   .aioson/squads/${squadSlug}/sessions/${sessionId}/bus.jsonl`);

  return summary;
}

module.exports = { runSquadAutorun };
