'use strict';

const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');
const {
  ensureRunnerQueue,
  addTask,
  listTasks,
  nextPending,
  updateTaskStatus,
  clearQueue,
  exportQueueMarkdown
} = require('../runner/queue-store');
const { launchCLI } = require('../runner/cli-launcher');
const { runWithCascade, parseCascadeChain } = require('../runner/cascade');

const STATUS_ICON = {
  pending: '○',
  running: '▶',
  completed: '✓',
  failed: '✗',
  skipped: '—'
};

/**
 * aioson runner:queue — gerencia e executa a fila de tasks do runner.
 *
 * Subcomandos:
 *   add <path> "task description" [--agent=dev] [--cascade=haiku,sonnet]
 *   list <path>
 *   run <path> [--agent=dev] [--timeout=120]
 *   export <path>
 *   clear <path>
 */
async function runRunnerQueue({ args, options = {}, logger }) {
  const sub = options.sub || args[1] || 'list';
  const projectDir = path.resolve(process.cwd(), args[0] || '.');

  const handle = await openRuntimeDb(projectDir, {});
  if (!handle) {
    logger.error('Could not open runtime database.');
    return { ok: false };
  }
  const { db } = handle;
  ensureRunnerQueue(db);

  try {
    switch (sub) {
      case 'add':    return await handleAdd(db, args, options, logger);
      case 'list':   return handleList(db, logger);
      case 'run':    return await handleRun(db, projectDir, options, logger);
      case 'export': return handleExport(db, logger);
      case 'clear':  return handleClear(db, logger);
      default:
        logger.error(`Unknown subcommand: ${sub}. Use add, list, run, export, or clear.`);
        return { ok: false };
    }
  } finally {
    try { db.close(); } catch { /* noop */ }
  }
}

function handleAdd(db, args, options, logger) {
  // Task pode vir de args[2] ou --task
  const task = options.task || args[2];
  if (!task) {
    logger.error('Task description required. Usage: aioson runner:queue add . "task description"');
    return { ok: false };
  }
  const agent = options.agent || 'dev';
  const cascade = options.cascade || null;
  const priority = options.priority ? Number(options.priority) : 0;

  const id = addTask(db, { task, agent, cascade, priority });
  logger.log(`[runner:queue] Added task #${id}: ${task}`);
  logger.log(`  Agent: @${agent}${cascade ? ' | Cascade: ' + cascade : ''}`);
  return { ok: true, id };
}

function handleList(db, logger) {
  const tasks = listTasks(db);
  if (tasks.length === 0) {
    logger.log('[runner:queue] Queue is empty. Use `runner:queue add` to add tasks.');
    return { ok: true, tasks: [] };
  }

  logger.log(`[runner:queue] ${tasks.length} task(s):`);
  for (const t of tasks) {
    const icon = STATUS_ICON[t.status] || '?';
    const cascade = t.cascade ? ` [cascade: ${t.cascade}]` : '';
    logger.log(`  ${icon} ${t.id}  @${t.agent}${cascade}  ${t.task}`);
  }
  return { ok: true, tasks };
}

async function handleRun(db, projectDir, options, logger) {
  const defaultAgent = options.agent || 'dev';
  const timeout = options.timeout ? Number(options.timeout) * 1000 : 120000;

  let processed = 0;
  let failed = 0;

  logger.log('[runner:queue] Starting queue execution...');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const task = nextPending(db);
    if (!task) {
      logger.log(`[runner:queue] Queue exhausted. ${processed} completed, ${failed} failed.`);
      break;
    }

    const agent = task.agent || defaultAgent;
    const agentFile = path.join(projectDir, '.aioson', 'agents', `${agent}.md`);
    const prompt = buildQueuePrompt(task.task, agentFile);

    logger.log(`\n[runner:queue] Running task #${task.id}: ${task.task}`);
    logger.log(`  Agent: @${agent}`);

    updateTaskStatus(db, task.id, { status: 'running' });

    let result;
    const cascadeChain = parseCascadeChain(task.cascade);

    try {
      if (cascadeChain.length > 0) {
        const cascadeResult = await runWithCascade(projectDir, prompt, cascadeChain, {
          timeout,
          onProgress: ({ model, attempt, maxAttempts, status, reason }) => {
            if (status === 'running') {
              logger.log(`  [cascade] ${model} attempt ${attempt}/${maxAttempts}...`);
            } else if (status === 'gate_failed') {
              logger.log(`  [cascade] ${model} attempt ${attempt} — gate failed${reason ? ': ' + reason : ''}, escalating...`);
            }
          }
        });
        result = cascadeResult.ok
          ? cascadeResult.result
          : { ok: false, output: '', error: cascadeResult.error };
      } else {
        result = await launchCLI(projectDir, prompt, {
          timeout,
          onData: (chunk) => process.stdout.write(chunk)
        });
      }
    } catch (err) {
      result = { ok: false, output: '', error: err.message };
    }

    if (result.ok) {
      updateTaskStatus(db, task.id, { status: 'completed', resultOk: true });
      logger.log(`  [runner:queue] Task #${task.id} completed`);
      processed++;
    } else {
      const errorMsg = result.error || result.stderr || 'unknown error';
      updateTaskStatus(db, task.id, { status: 'failed', resultOk: false, errorMsg });
      logger.error(`  [runner:queue] Task #${task.id} failed: ${errorMsg}`);
      failed++;
    }
  }

  return { ok: true, processed, failed };
}

function handleExport(db, logger) {
  const markdown = exportQueueMarkdown(db);
  process.stdout.write(markdown);
  return { ok: true };
}

function handleClear(db, logger) {
  clearQueue(db);
  logger.log('[runner:queue] Queue cleared.');
  return { ok: true };
}

function buildQueuePrompt(task, agentFile) {
  return [
    'You are operating in autonomous headless mode. Complete the following task independently.',
    `Agent role: read ${agentFile} for your operating instructions.`,
    '',
    `Task: ${task}`,
    '',
    'When the task is complete, write TASK_COMPLETE on a new line as the final output.',
    'If you cannot complete the task, write TASK_FAILED: [reason].'
  ].join('\n');
}

module.exports = { runRunnerQueue };
