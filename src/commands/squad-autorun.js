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
 * Phase 1 additions:
 *   - Gap Closure Loop: failed tasks are retried up to 3x with failure context
 *   - Budget Gating: halts before a task if session token budget is exceeded
 *   - Heartbeat Protocol: posts bus heartbeat every 30s during long tasks
 *   - Anti-Analysis-Loop Guard: warns executor if N+ status without result
 *   - Squad STATE.md: cross-session memory updated at start/end
 *
 * Usage:
 *   aioson squad:autorun . --squad=content-team --goal="Create 3 podcast episodes"
 *   aioson squad:autorun . --squad=content-team --goal="..." --reflect --bus --mode=structured
 *   aioson squad:autorun . --squad=content-team --plan=SESSION_ID  (resume from saved plan)
 *   aioson squad:autorun . --squad=content-team --plan=SESSION_ID --dry-run
 *
 * Flags:
 *   --goal            High-level objective (required unless --plan is given)
 *   --reflect         Run reflection after each task (default: false)
 *   --bus             Enable intra-bus for inter-executor communication (default: true)
 *   --mode            Decomposition mode: heuristic (default) | structured
 *   --plan            Resume from existing session plan (session ID)
 *   --dry-run         Show plan without executing
 *   --sequential      Force sequential execution even for independent tasks (default: false)
 *   --timeout         Per-task timeout in seconds (default: 120)
 *   --max-retries     Gap closure max retry attempts (default: 3)
 *   --no-gap-closure  Disable automatic retry on task failure
 */

const fs = require('node:fs/promises');
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
const stateManager = require('../squad/state-manager');
const { getUnresolvedBlocks } = require('../squad/intra-bus');
const interSquadEvents = require('../squad/inter-squad-events');
const { runHook, HOOK_DENY } = require('../lib/hook-protocol');
const { extractLearnings, persistAgentMemory } = require('../squad/learning-extractor');
const { validateBrief, autoFixBrief } = require('../squad/brief-validator');
const { resolveEngine, translateToTeamConfig, writeTeamConfig } = require('../squad/agent-teams-adapter');

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

// ─── Budget helpers ───────────────────────────────────────────────────────────

/**
 * Load token budget from squad manifest (optional field).
 * Returns Infinity if not configured.
 */
async function loadBudget(projectDir, squadSlug) {
  const manifestPath = path.join(
    projectDir, '.aioson', 'squads', squadSlug, 'squad.manifest.json'
  );
  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const budget = manifest.budget || {};
    return {
      maxTokensPerSession: budget.max_tokens_per_session || Infinity,
      maxTokensPerTask: budget.max_tokens_per_task || Infinity,
      actionOnExceed: budget.action_on_exceed || 'pause'
    };
  } catch {
    return { maxTokensPerSession: Infinity, maxTokensPerTask: Infinity, actionOnExceed: 'pause' };
  }
}

/**
 * Estimate tokens a task will consume (heuristic: chars/4 + overhead).
 */
function estimateTaskTokens(task) {
  const descLen = (task.description || '').length;
  const criteriaLen = (task.acceptance_criteria || []).join(' ').length;
  return Math.ceil((descLen + criteriaLen) / 4) + 500; // 500 base overhead
}

// ─── Heartbeat wrapper ────────────────────────────────────────────────────────

/**
 * Run a task with heartbeat pulses on the bus every 30s.
 * Clears the interval on task completion/failure regardless.
 */
async function runTaskWithHeartbeat(projectDir, squadSlug, task, sessionId, options, runFn) {
  const { enableBus } = options;
  const startMs = Date.now();

  let hbInterval = null;
  if (enableBus) {
    hbInterval = setInterval(async () => {
      const elapsed = Math.round((Date.now() - startMs) / 1000);
      await bus.post(projectDir, squadSlug, sessionId, {
        from: 'coordinator',
        to: '*',
        type: 'heartbeat',
        content: `${task.title} — ${elapsed}s elapsed`,
        metadata: { task_id: task.id, elapsed_s: elapsed }
      }).catch(() => {});
    }, 30_000);
  }

  try {
    return await runFn();
  } finally {
    if (hbInterval) clearInterval(hbInterval);
  }
}

// ─── Anti-analysis-loop guard ─────────────────────────────────────────────────

/**
 * Check if an executor appears to be in an analysis loop.
 * Posts a coordinator feedback message if the threshold is exceeded.
 */
async function checkAntiLoop(projectDir, squadSlug, sessionId, task, enableBus, threshold = 8) {
  if (!enableBus || !task.executor) return;

  const messages = await bus.read(projectDir, squadSlug, sessionId).catch(() => []);
  if (bus.isAnalysisLoop(messages, task.executor, threshold)) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: 'coordinator',
      to: task.executor,
      type: 'feedback',
      content: `Analysis loop detected for "${task.title}". You have posted ${threshold}+ status updates without a result. Stop analyzing — produce concrete output now, or post a "block" message explaining why you cannot proceed.`,
      metadata: { task_id: task.id, anti_loop: true }
    }).catch(() => {});
  }
}

// ─── Core task runner ─────────────────────────────────────────────────────────

/**
 * Run a single task (no retry logic here — handled by gap closure wrapper).
 */
async function runTask(projectDir, squadSlug, task, sessionId, options, logger) {
  const { enableBus, enableReflect, timeoutMs } = options;
  const taskCtx = {
    projectDir,
    squadSlug,
    executorSlug: task.executor || 'unknown',
    taskTitle: task.title,
    iteration: task._attempt || 1
  };

  // Post status to bus
  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: task.executor || 'coordinator',
      to: '*',
      type: 'status',
      content: `Starting: ${task.title}${task._attempt > 1 ? ` (retry ${task._attempt})` : ''}`,
      metadata: { task_id: task.id, attempt: task._attempt || 1 }
    }).catch(() => {});
  }

  await updateTaskStatus(projectDir, squadSlug, sessionId, task.id, 'in_progress');

  // Build worker input with fresh context pointers (2.2: paths, not inline content)
  const workerInput = {
    task_id: task.id,
    title: task.title,
    description: task.description,
    acceptance_criteria: task.acceptance_criteria,
    read_first_hints: task.read_first_hints || [],  // executor reads these, not coordinator
    must_haves: task.must_haves || null,
    session_id: sessionId,
    bus_enabled: enableBus,
    ...(task._failure_context ? { failure_context: task._failure_context, attempt: task._attempt } : {})
  };

  let workerResult = null;
  let taskOutput = null;
  let workerRan = false;

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
    taskOutput = `[no-worker-script] Task "${task.title}" assigned to executor "${task.executor}". Run manually or scaffold a worker with: aioson squad:worker --squad=${squadSlug} create --slug=${task.executor}`;
    workerResult = { ok: true, output: { message: taskOutput }, noScript: true };
  }

  // Anti-analysis-loop check after task runs
  await checkAntiLoop(projectDir, squadSlug, sessionId, task, enableBus);

  // Reflection pass — pass full task object so verify-gate can check must_haves
  let reflectionResult = null;
  if (enableReflect && taskOutput && workerResult.ok) {
    reflectionResult = await reflect(taskOutput, {
      ...taskCtx,
      iteration: task._attempt || 1,
      task                            // enables must_haves verification
    });

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

// ─── Bus coordinator intelligence ────────────────────────────────────────────

/**
 * After each wave, inspect the bus for unresolved block messages and
 * attempt automatic resolution or escalation.
 *
 * Resolution strategies (heuristic):
 *   - If block mentions "permission" or "api key" → escalate to human
 *   - If block is from an executor about another executor → re-assign hint
 *   - Otherwise → post coordinator guidance with context from the bus
 */
async function handleBusBlocks(projectDir, squadSlug, sessionId, logger) {
  const allMessages = await bus.read(projectDir, squadSlug, sessionId).catch(() => []);
  const unresolved = getUnresolvedBlocks(allMessages);

  if (unresolved.length === 0) return;

  for (const block of unresolved) {
    const content = String(block.content || '').toLowerCase();
    const requiresHuman =
      /api\s*key|permission|access\s*denied|credential|secret|token/i.test(content);

    if (requiresHuman) {
      logger.log(`  ⚠ Block requires human attention: "${block.content.slice(0, 80)}"`);
      await bus.post(projectDir, squadSlug, sessionId, {
        from: 'coordinator',
        to: block.from,
        type: 'resolution',
        content: `This block requires human intervention (permission/credentials). Escalating.`,
        metadata: { block_id: block.id, resolution: 'human_escalation' }
      }).catch(() => {});
      continue;
    }

    // Generic resolution attempt: provide coordinator context
    const recentResults = allMessages
      .filter((m) => m.type === 'result' && m.from !== block.from)
      .slice(-3)
      .map((m) => `${m.from}: ${m.content.slice(0, 100)}`);

    const contextHint = recentResults.length > 0
      ? `\nContext from other executors:\n${recentResults.join('\n')}`
      : '';

    await bus.post(projectDir, squadSlug, sessionId, {
      from: 'coordinator',
      to: block.from,
      type: 'resolution',
      content: `Coordinator attempting to resolve your block. Try proceeding with available information. If you need a specific output from another executor, check the recent results on the bus.${contextHint}`,
      metadata: { block_id: block.id, resolution: 'coordinator_hint' }
    }).catch(() => {});
  }
}

// ─── Gap Closure Loop ─────────────────────────────────────────────────────────

/**
 * Run a task with automatic retry on failure (gap closure).
 *
 * On failure:
 *   1. Capture the error as failure context
 *   2. Re-run the task with the failure context injected into workerInput
 *   3. Repeat up to maxRetries times
 *   4. If still failing after maxRetries: escalate
 *
 * ESCALATE results are NOT retried — they require coordinator/human attention.
 */
async function runTaskWithGapClosure(
  projectDir, squadSlug, task, sessionId, options, logger,
  maxRetries = 3
) {
  const { enableBus } = options;
  let currentTask = { ...task, _attempt: 1 };
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    currentTask = { ...currentTask, _attempt: attempt };

    // Announce gap closure retry on bus (only from attempt 2 onwards)
    if (attempt > 1 && enableBus) {
      await bus.post(projectDir, squadSlug, sessionId, {
        from: 'coordinator',
        to: task.executor || '*',
        type: 'gap_closure_attempt',
        content: `Retrying "${task.title}" (attempt ${attempt}/${maxRetries}). Previous failure: ${lastError}`,
        metadata: { task_id: task.id, attempt, prev_error: lastError }
      }).catch(() => {});
    }

    // Run with heartbeat
    const result = await runTaskWithHeartbeat(
      projectDir, squadSlug, task, sessionId, options,
      () => runTask(projectDir, squadSlug, currentTask, sessionId, options, logger)
    );

    if (result.finalStatus === 'completed') {
      if (attempt > 1) {
        logger.log(`    ↩ Gap closed after ${attempt} attempt(s)`);
      }
      return result;
    }

    // Don't retry escalated tasks — they need human/coordinator attention
    if (result.finalStatus === 'escalated') {
      return result;
    }

    // Capture failure context for next attempt
    lastError = result.workerResult?.error || `task failed on attempt ${attempt}`;
    currentTask = {
      ...currentTask,
      _failure_context: lastError
    };

    if (attempt < maxRetries) {
      logger.log(`    ↩ Gap closure attempt ${attempt}/${maxRetries} failed — retrying with context`);
    }
  }

  // Exhausted retries — escalate
  logger.log(`    ✗ Gap closure exhausted (${maxRetries} attempts) — escalating`);

  await updateTaskStatus(projectDir, squadSlug, sessionId, task.id, 'escalated', {
    gap_closure_exhausted: true,
    last_error: lastError,
    completed_at: nowIso()
  });

  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: 'coordinator',
      to: '*',
      type: 'block',
      content: `Task "${task.title}" escalated after ${maxRetries} gap closure attempts. Last error: ${lastError}`,
      metadata: { task_id: task.id, gap_closure_exhausted: true, attempts: maxRetries }
    }).catch(() => {});
  }

  return {
    task,
    finalStatus: 'escalated',
    workerResult: { ok: false, error: lastError, gap_closure_exhausted: true },
    reflectionResult: null
  };
}

// ─── Sampling-and-Voting (Plan 81 §Sprint 4) ────────────────────────────────

/**
 * Synthesize votes from multiple worker instances.
 * Returns { consensus, winningOutput, allVotes }.
 *
 * Consensus is the fraction of instances that agree on the same status.
 * For completed tasks, compares output similarity via a simple hash.
 */
function synthesizeVotes(votes) {
  const statusCounts = {};
  for (const v of votes) {
    const s = v.finalStatus || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  let bestStatus = 'unknown';
  let bestCount = 0;
  for (const [s, count] of Object.entries(statusCounts)) {
    if (count > bestCount) { bestStatus = s; bestCount = count; }
  }

  const consensus = bestCount / votes.length;
  const winningVotes = votes.filter((v) => v.finalStatus === bestStatus);

  return {
    consensus,
    bestStatus,
    winningOutput: winningVotes[0],
    allVotes: votes.map((v) => ({
      finalStatus: v.finalStatus,
      outputSummary: String(v.workerResult?.output || '').slice(0, 200)
    }))
  };
}

/**
 * Run a task with sampling-and-voting for critical decisions.
 *
 * Spawns N instances of the same task in parallel, then synthesizes votes.
 * If consensus < threshold, escalates to human-gate.
 *
 * @param {object} task — task with voting config: { instances, threshold }
 * @param {number} instances — number of parallel instances (default: 3)
 * @param {number} threshold — minimum consensus fraction (default: 0.66)
 */
async function runTaskWithVoting(
  projectDir, squadSlug, task, sessionId, options, logger,
  instances = 3, threshold = 0.66
) {
  const { enableBus } = options;

  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: 'coordinator',
      to: '*',
      type: 'status',
      content: `Sampling-and-Voting: running ${instances} instances of "${task.title}"`,
      metadata: { task_id: task.id, voting: true, instances }
    }).catch(() => {});
  }

  // Spawn N instances in parallel
  const instancePromises = [];
  for (let i = 1; i <= instances; i++) {
    const instanceTask = { ...task, _attempt: 1, _voting_instance: i };
    instancePromises.push(
      runTaskWithHeartbeat(
        projectDir, squadSlug, instanceTask, sessionId, options,
        () => runTask(projectDir, squadSlug, instanceTask, sessionId, options, logger)
      ).catch((err) => ({
        task: instanceTask,
        finalStatus: 'failed',
        workerResult: { ok: false, error: err.message },
        reflectionResult: null
      }))
    );
  }

  const votes = await Promise.all(instancePromises);
  const result = synthesizeVotes(votes);

  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: 'coordinator',
      to: '*',
      type: 'feedback',
      content: `Voting result for "${task.title}": consensus=${(result.consensus * 100).toFixed(0)}% status=${result.bestStatus} (${instances} instances)`,
      metadata: { task_id: task.id, consensus: result.consensus, bestStatus: result.bestStatus }
    }).catch(() => {});
  }

  // If consensus below threshold, escalate
  if (result.consensus < threshold) {
    logger.log(`    ⚠ Voting: consensus ${(result.consensus * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}% threshold — escalating`);

    await updateTaskStatus(projectDir, squadSlug, sessionId, task.id, 'escalated', {
      voting: { consensus: result.consensus, threshold, allVotes: result.allVotes },
      completed_at: nowIso()
    });

    if (enableBus) {
      await bus.post(projectDir, squadSlug, sessionId, {
        from: 'coordinator',
        to: '*',
        type: 'block',
        content: `Task "${task.title}" — voting consensus too low (${(result.consensus * 100).toFixed(0)}%). Requires human review.`,
        metadata: { task_id: task.id, voting_escalated: true }
      }).catch(() => {});
    }

    return {
      task,
      finalStatus: 'escalated',
      workerResult: { ok: false, error: 'voting_consensus_below_threshold', voting: result },
      reflectionResult: null
    };
  }

  // Use the winning vote as the result
  return result.winningOutput;
}

// ─── Evaluator-Optimizer Loop (Plan 82 §ITEM 4) ──────────────────────────────

/**
 * Run a task through an evaluator-optimizer loop (dev→qa→dev...):
 *   1. Generator phase: run the task as the implementer
 *   2. Evaluator phase: run a review task against criteria (fresh context)
 *   3. If PASS → done. If FAIL → inject structured feedback → repeat
 *   4. Max iterations before escalating to human
 *
 * The key: the evaluator receives only the artifact, not the generator's reasoning.
 * This prevents confirmation bias (same principle as verify-gate).
 */
async function runWithEvalOptimize(
  projectDir, squadSlug, task, sessionId, options, logger,
  maxIterations = 3
) {
  const { enableBus } = options;
  let lastFeedback = null;
  let lastResult = null;

  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: 'coordinator',
      to: '*',
      type: 'status',
      content: `Evaluator-Optimizer: starting loop for "${task.title}" (max ${maxIterations} iterations)`,
      metadata: { task_id: task.id, eval_optimize: true, max_iterations: maxIterations }
    }).catch(() => {});
  }

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // ── Generator phase ──────────────────────────────────────────────────────
    const generatorTask = {
      ...task,
      _attempt: iteration,
      ...(lastFeedback ? { _eval_feedback: lastFeedback, _eval_iteration: iteration } : {})
    };

    lastResult = await runTaskWithHeartbeat(
      projectDir, squadSlug, generatorTask, sessionId, options,
      () => runTask(projectDir, squadSlug, generatorTask, sessionId, options, logger)
    );

    if (lastResult.finalStatus !== 'completed') {
      logger.log(`    ↳ Eval-Optimize iteration ${iteration}: generator failed — escalating`);
      return lastResult;
    }

    // ── Evaluator phase ──────────────────────────────────────────────────────
    const reviewTask = {
      id: `${task.id}-review-${iteration}`,
      title: `Review: ${task.title} (iteration ${iteration})`,
      description: [
        `Evaluate the output of task "${task.title}".`,
        ``,
        `Criteria to check (ALL must pass):`,
        ...(task.review_criteria || []).map((c) => `- ${c}`),
        ``,
        `Output PASS if all criteria are met.`,
        `Output FAIL with structured feedback: specific file:line references, exact criterion violated, minimum change to pass.`,
        ``,
        `Do NOT consider how the implementer reasoned — evaluate only the artifact.`
      ].join('\n'),
      executor: task.reviewer || 'qa',
      acceptance_criteria: ['Output either PASS or FAIL with structured feedback'],
      _eval_artifact: lastResult.workerResult?.output || null
    };

    const evalResult = await runTaskWithHeartbeat(
      projectDir, squadSlug, reviewTask, sessionId, options,
      () => runTask(projectDir, squadSlug, reviewTask, sessionId, options, logger)
    );

    const evalOutput = String(evalResult.workerResult?.output || '');
    const passed = /\bPASS\b/i.test(evalOutput) && !/\bFAIL\b/i.test(evalOutput);

    if (enableBus) {
      await bus.post(projectDir, squadSlug, sessionId, {
        from: 'coordinator',
        to: '*',
        type: 'feedback',
        content: `Eval-Optimize iteration ${iteration}/${maxIterations}: ${passed ? 'PASS' : 'FAIL'} — ${evalOutput.slice(0, 120)}`,
        metadata: { task_id: task.id, iteration, verdict: passed ? 'PASS' : 'FAIL' }
      }).catch(() => {});
    }

    if (passed) {
      logger.log(`    ↳ Eval-Optimize PASS at iteration ${iteration}`);
      await updateTaskStatus(projectDir, squadSlug, sessionId, task.id, 'completed', {
        eval_optimize: { iterations: iteration, verdict: 'PASS' },
        completed_at: nowIso()
      });
      return lastResult;
    }

    lastFeedback = evalOutput.slice(0, 1000);
    logger.log(`    ↳ Eval-Optimize FAIL at iteration ${iteration} — applying feedback`);
  }

  // Max iterations reached — escalate
  logger.log(`    ✗ Eval-Optimize: ${maxIterations} iterations exhausted — escalating`);

  await updateTaskStatus(projectDir, squadSlug, sessionId, task.id, 'escalated', {
    eval_optimize: { iterations: maxIterations, verdict: 'FAIL', last_feedback: lastFeedback },
    completed_at: nowIso()
  });

  if (enableBus) {
    await bus.post(projectDir, squadSlug, sessionId, {
      from: 'coordinator',
      to: '*',
      type: 'block',
      content: `Task "${task.title}" — eval-optimize loop exhausted (${maxIterations} iterations). Requires human review.`,
      metadata: { task_id: task.id, eval_optimize_exhausted: true }
    }).catch(() => {});
  }

  return {
    task,
    finalStatus: 'escalated',
    workerResult: { ok: false, error: 'eval_optimize_exhausted', last_feedback: lastFeedback },
    reflectionResult: null
  };
}

// ─── Main command ─────────────────────────────────────────────────────────────

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
  const enableGapClosure = options['no-gap-closure'] !== true && options['no-gap-closure'] !== 'true';
  const maxRetries = Math.min(Math.max(Number(options['max-retries'] || 3), 1), 5);
  const requestedEngine = String(options.engine || 'legacy').trim();

  // ── Resolve execution engine (Plan 81 §1.1) ──────────────────────────────
  const engineResult = resolveEngine(requestedEngine);
  if (engineResult.fallback) {
    logger.log(`⚠ ${engineResult.reason} — falling back to legacy engine`);
  }

  // ── Load token budget ──────────────────────────────────────────────────────
  const budget = await loadBudget(targetDir, squadSlug);
  let sessionTokensUsed = 0;
  let budgetExceeded = false;

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

  // ── Handle structured mode ─────────────────────────────────────────────────
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
    await fs.writeFile(promptPath, promptContent, 'utf8');

    logger.log(`[structured] Decomposition prompt saved to: ${path.relative(targetDir, promptPath)}`);
    logger.log('Activate your agent to fill in the plan, then resume with:');
    logger.log(`  aioson squad:autorun . --squad=${squadSlug} --plan=${sessionId}`);
    return { ok: true, mode: 'structured', sessionId, promptPath: path.relative(targetDir, promptPath), plan };
  }

  // ── Load squad manifest (for inter-squad config and hooks) ─────────────────
  let squadManifest = {};
  try {
    const manifestPath = path.join(targetDir, '.aioson', 'squads', squadSlug, 'squad.manifest.json');
    squadManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch { /* manifest is optional */ }

  // ── 3.3 Hook Exit Code Protocol — pre_run hook ─────────────────────────────
  const preRunHook = squadManifest.hooks?.pre_run;
  if (preRunHook) {
    logger.log(`Running pre_run hook: ${preRunHook.slice(0, 60)}${preRunHook.length > 60 ? '...' : ''}`);
    const hookResult = runHook(preRunHook, {
      squad: squadSlug,
      session_id: sessionId,
      goal: plan.goal,
      project_dir: targetDir
    });
    if (hookResult.denied) {
      logger.error(`✗ Pre-run hook denied execution${hookResult.stderr ? ': ' + hookResult.stderr : ''}`);
      return { ok: false, error: 'hook_denied', hook: preRunHook, reason: hookResult.stderr };
    }
    if (hookResult.warn) {
      logger.log(`  ⚠ Pre-run hook exited ${hookResult.exitCode} (non-fatal)${hookResult.stderr ? ': ' + hookResult.stderr : ''}`);
    } else {
      logger.log('  ✓ Pre-run hook passed');
    }
  }

  // ── 3.1 Inter-Squad Event Streaming — consume pending events ───────────────
  const subscriptions = [
    ...(squadManifest.subscriptions || []),
    ...(squadManifest.depends_on || []).map((d) => d.event).filter(Boolean)
  ];
  let incomingEvents = [];
  if (subscriptions.length > 0) {
    incomingEvents = await interSquadEvents
      .consume(targetDir, { toSquad: squadSlug, subscriptions })
      .catch(() => []);
    if (incomingEvents.length > 0) {
      logger.log(`Inter-squad events received: ${incomingEvents.length}`);
      for (const ev of incomingEvents) {
        logger.log(`  ← [${ev.fromSquad}] ${ev.event}${ev.payload ? ' · ' + JSON.stringify(ev.payload).slice(0, 80) : ''}`);
      }
      logger.log('');
    }
  }

  // Inject incoming events into the plan goal context so executors are aware
  if (incomingEvents.length > 0 && plan.tasks.length > 0) {
    const firstTask = plan.tasks[0];
    const eventSummary = incomingEvents
      .map((e) => `[${e.fromSquad}] ${e.event}: ${JSON.stringify(e.payload || {})}`)
      .join('\n');
    firstTask._inter_squad_events = eventSummary;
  }

  // ── Record session start in STATE.md ───────────────────────────────────────
  await stateManager.recordSessionStart(targetDir, squadSlug, sessionId, plan.goal).catch(() => {});

  // ── Agent Teams engine path (Plan 81 §1.1) ────────────────────────────────
  if (engineResult.engine === 'agent-teams') {
    logger.log(`Engine: agent-teams (Claude Code ${engineResult.version})`);
    const teamConfig = translateToTeamConfig(targetDir, squadManifest, plan, {
      budget, enableBus
    });
    const configPath = await writeTeamConfig(targetDir, squadSlug, teamConfig);
    logger.log(`Team config: ${path.relative(targetDir, configPath)}`);
    logger.log(`Teammates: ${teamConfig.teammates.map((t) => t.name).join(', ')}`);
    logger.log(`Tasks: ${teamConfig.tasks.length}`);
    logger.log('');
    logger.log('Agent Teams execution is configured. Use:');
    logger.log(`  claude --team ${path.relative(targetDir, configPath)}`);
    logger.log('');

    await stateManager.recordSessionEnd(targetDir, squadSlug, sessionId, []).catch(() => {});

    return {
      ok: true,
      engine: 'agent-teams',
      session_id: sessionId,
      squad: squadSlug,
      configPath: path.relative(targetDir, configPath),
      teamConfig
    };
  }

  // ── Execute tasks (legacy engine) ─────────────────────────────────────────
  logger.log(`Starting execution — session [${sessionId}]`);
  if (enableBus) logger.log('Intra-squad bus: enabled');
  if (enableReflect) logger.log('Reflection: enabled');
  if (enableGapClosure) logger.log(`Gap closure: enabled (max ${maxRetries} retries)`);
  if (budget.maxTokensPerSession !== Infinity) {
    logger.log(`Budget: ${budget.maxTokensPerSession.toLocaleString()} tokens/session`);
  }
  logger.log('');

  const results = [];
  let completedCount = 0;
  let failedCount = 0;
  let escalatedCount = 0;
  const startedAt = Date.now();

  const runOptions = { enableBus, enableReflect, timeoutMs };

  // Run in parallel group waves (or sequentially if --sequential)
  const groups = Object.keys(plan.parallel_groups).map(Number).sort((a, b) => a - b);

  for (const group of groups) {
    if (budgetExceeded) {
      logger.log(`⚠ Session budget exceeded (${sessionTokensUsed.toLocaleString()} tokens used). Stopping.`);
      break;
    }

    const groupTaskIds = plan.parallel_groups[group];
    const groupTasks = groupTaskIds
      .map((id) => plan.tasks.find((t) => t.id === id))
      .filter((t) => t && t.status === 'pending');

    if (groupTasks.length === 0) continue;

    logger.log(`── Group ${group} (${groupTasks.length} task${groupTasks.length > 1 ? 's' : ''})${groupTasks.length > 1 && !sequential ? ' — running in parallel' : ''}`);

    // ── Budget gate: check before running this group ────────────────────────
    const groupEstimatedTokens = groupTasks.reduce((sum, t) => sum + estimateTaskTokens(t), 0);
    if (sessionTokensUsed + groupEstimatedTokens > budget.maxTokensPerSession) {
      logger.log(`  ⚠ Budget gate: estimated ${(sessionTokensUsed + groupEstimatedTokens).toLocaleString()} tokens would exceed session limit of ${budget.maxTokensPerSession.toLocaleString()}.`);
      if (budget.actionOnExceed === 'abort') {
        logger.log('  Budget action: abort — stopping execution.');
        budgetExceeded = true;
        break;
      }
      // Default: 'pause' — warn and continue (user can see in summary)
      logger.log('  Budget action: pause — marking remaining tasks as skipped.');
      for (const task of groupTasks) {
        await updateTaskStatus(targetDir, squadSlug, sessionId, task.id, 'skipped', {
          skip_reason: 'budget_exceeded',
          estimated_tokens: estimateTaskTokens(task)
        });
      }
      budgetExceeded = true;
      break;
    }

    // ── Run tasks in this group ────────────────────────────────────────────
    const runTask_ = async (task) => {
      // Brief validation guard (Plan 80 §1): validate brief before spawn
      if (task.brief_path) {
        const briefResult = await validateBrief(task.brief_path, targetDir);
        if (!briefResult.ready) {
          // Auto-fix simple fields (out_of_scope only)
          if (briefResult.issues.length === 1 && briefResult.issues[0].field === 'out_of_scope') {
            await autoFixBrief(task.brief_path, targetDir);
            logger.log(`  ↩ Auto-fixed brief for ${task.id} (out_of_scope)`);
          } else {
            if (enableBus) {
              await bus.post(targetDir, squadSlug, sessionId, {
                from: 'coordinator', to: '*', type: 'block',
                content: `Brief NOT READY for ${task.id}: ${briefResult.issues.map((i) => i.message).join(', ')}`,
                metadata: { task_id: task.id, brief_validation: briefResult }
              }).catch(() => {});
            }
            logger.log(`  ⚠ ${task.id}: brief NOT READY (${briefResult.issues.length} issues) — skipping`);
            await updateTaskStatus(targetDir, squadSlug, sessionId, task.id, 'skipped', {
              skip_reason: 'brief_not_ready', issues: briefResult.issues
            });
            return { task, finalStatus: 'skipped', workerResult: null, reflectionResult: null };
          }
        }
      }

      logger.log(`  ${icon('in_progress')} ${task.id}: ${task.title}`);

      // Sampling-and-Voting path (Plan 81 §Sprint 4)
      if (task.voting) {
        const votingInstances = task.voting.instances || 3;
        const votingThreshold = task.voting.threshold || 0.66;
        logger.log(`    ↳ Voting: ${votingInstances} instances, threshold ${(votingThreshold * 100).toFixed(0)}%`);
        const runner = runTaskWithVoting(
          targetDir, squadSlug, task, sessionId, runOptions, logger,
          votingInstances, votingThreshold
        );
        return runner.then((r) => {
          logger.log(`  ${icon(r.finalStatus)} ${task.id}: ${r.finalStatus.toUpperCase()}`);
          return r;
        });
      }

      // Evaluator-Optimizer path (Plan 82 §ITEM 4)
      if (task.review_loop) {
        const maxReviewIter = task.max_review_iterations || 3;
        logger.log(`    ↳ Eval-Optimize: max ${maxReviewIter} iterations, reviewer=${task.reviewer || 'qa'}`);
        return runWithEvalOptimize(
          targetDir, squadSlug, task, sessionId, runOptions, logger, maxReviewIter
        ).then((r) => {
          logger.log(`  ${icon(r.finalStatus)} ${task.id}: ${r.finalStatus.toUpperCase()}`);
          return r;
        });
      }

      const runner = enableGapClosure
        ? runTaskWithGapClosure(targetDir, squadSlug, task, sessionId, runOptions, logger, maxRetries)
        : runTaskWithHeartbeat(targetDir, squadSlug, task, sessionId, runOptions,
            () => runTask(targetDir, squadSlug, task, sessionId, runOptions, logger));
      return runner.then((r) => {
        logger.log(`  ${icon(r.finalStatus)} ${task.id}: ${r.finalStatus.toUpperCase()}`);
        return r;
      });
    };

    let groupResults;
    if (sequential || groupTasks.length === 1) {
      groupResults = [];
      for (const task of groupTasks) {
        groupResults.push(await runTask_(task));
      }
    } else {
      groupResults = await Promise.all(groupTasks.map(runTask_));
    }

    results.push(...groupResults);

    // Accumulate token usage estimate for budget tracking
    for (const r of groupResults) {
      sessionTokensUsed += estimateTaskTokens(r.task);
      if (r.finalStatus === 'completed') completedCount++;
      else if (r.finalStatus === 'failed') failedCount++;
      else if (r.finalStatus === 'escalated') escalatedCount++;
    }

    // Bus coordinator: resolve any unresolved blocks after this wave
    if (enableBus) {
      await handleBusBlocks(targetDir, squadSlug, sessionId, logger).catch(() => {});
    }

    // Short pause between waves to allow bus writes to flush
    if (groups.length > 1) await sleep(100);
  }

  // ── Record session end in STATE.md ─────────────────────────────────────────
  await stateManager.recordSessionEnd(targetDir, squadSlug, sessionId, results).catch(() => {});

  // ── 5.1 Automatic Learning Extraction ─────────────────────────────────────
  if (completedCount > 0 || escalatedCount > 0) {
    const allBusMessages = enableBus
      ? await bus.read(targetDir, squadSlug, sessionId).catch(() => [])
      : [];
    const allReflections = results
      .filter((r) => r.reflectionResult)
      .map((r) => r.reflectionResult);

    const learnings = await extractLearnings(targetDir, squadSlug, sessionId, {
      busMessages: allBusMessages,
      taskResults: results,
      reflectionReports: allReflections
    }).catch(() => []);

    if (learnings.length > 0) {
      // Persist learnings to per-agent memory files (Plan 81 §Sprint 4)
      await persistAgentMemory(targetDir, squadSlug, learnings, results).catch(() => {});
      // Will be shown in the summary section below
      results._extractedLearnings = learnings.length;
    }
  }

  // ── Session summary ────────────────────────────────────────────────────────
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const busSummary = enableBus
    ? await bus.summary(targetDir, squadSlug, sessionId).catch(() => null)
    : null;

  const summary = {
    ok: failedCount === 0 && escalatedCount === 0,
    session_id: sessionId,
    squad: squadSlug,
    goal: plan.goal,
    elapsed_s: elapsed,
    budget_used: sessionTokensUsed,
    budget_limit: budget.maxTokensPerSession,
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
  if (budget.maxTokensPerSession !== Infinity) {
    logger.log(`Tokens:    ~${sessionTokensUsed.toLocaleString()} used / ${budget.maxTokensPerSession.toLocaleString()} budget`);
  }
  if (busSummary && busSummary.total > 0) {
    logger.log(`Bus:       ${busSummary.total} messages${busSummary.blocks.length > 0 ? ` | ⚠ ${busSummary.blocks.length} block(s)` : ''}`);
  }
  if (escalatedCount > 0) {
    logger.log('');
    logger.log('⚠ Escalated tasks require coordinator attention:');
    for (const r of results.filter((r) => r.finalStatus === 'escalated')) {
      const exhausted = r.workerResult?.gap_closure_exhausted ? ' (gap closure exhausted)' : '';
      logger.log(`  ${r.task.id}: ${r.task.title}${exhausted}`);
    }
  }
  logger.log('');
  logger.log(`Plan:      .aioson/squads/${squadSlug}/sessions/${sessionId}/plan.json`);
  logger.log(`State:     .aioson/squads/${squadSlug}/STATE.md`);
  if (enableBus) logger.log(`Bus:       .aioson/squads/${squadSlug}/sessions/${sessionId}/bus.jsonl`);

  return summary;
}

module.exports = { runSquadAutorun };
