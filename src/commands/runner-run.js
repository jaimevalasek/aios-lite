'use strict';

const path = require('node:path');
const { launchCLI, detectCLI } = require('../runner/cli-launcher');
const { runWithCascade, parseCascadeChain } = require('../runner/cascade');
const { openRuntimeDb, startRun, updateRun, createRunKey } = require('../runtime-store');

/**
 * aioson runner:run — executa uma única task headless usando o CLI de AI ativo.
 *
 * Usage:
 *   aioson runner:run . --task="Fix the auth modal" --agent=dev
 *   aioson runner:run . --task="..." --agent=qa --timeout=300
 *   aioson runner:run . --task="..." --agent=dev --cascade=haiku,sonnet
 *   aioson runner:run . --task="..." --dry-run
 */
async function runRunnerRun({ args, options = {}, logger }) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const { task, agent = 'dev', dryRun, cascade: cascadeStr } = options;
  const timeout = options.timeout ? Number(options.timeout) * 1000 : 120000;

  if (!task) {
    logger.error('--task is required. Example: aioson runner:run . --task="Fix the login modal"');
    return { ok: false };
  }

  const agentFile = path.join(projectDir, '.aioson', 'agents', `${agent}.md`);
  const prompt = buildRunnerPrompt(task, agentFile);

  if (dryRun) {
    let cli;
    try { cli = await detectCLI(); } catch { cli = 'claude'; }
    logger.log(`[dry-run] Would run: ${cli} -p "${prompt.slice(0, 120)}..."`);
    logger.log(`[dry-run] Agent: @${agent} | Timeout: ${timeout / 1000}s`);
    if (cascadeStr) logger.log(`[dry-run] Cascade: ${cascadeStr}`);
    return { ok: true, dryRun: true };
  }

  logger.log(`[runner] Task: ${task}`);
  logger.log(`[runner] Agent: @${agent} | Timeout: ${timeout / 1000}s`);
  if (cascadeStr) logger.log(`[runner] Cascade: ${cascadeStr}`);

  const start = Date.now();

  // Abre DB para registrar evento (melhor esforço — não bloqueia se não existir)
  let db = null;
  let runKey = null;
  try {
    const handle = await openRuntimeDb(projectDir, {});
    if (handle) {
      db = handle.db;
      runKey = createRunKey(agent);
      startRun(db, {
        runKey,
        agentName: agent,
        agentKind: 'runner',
        source: 'runner',
        title: task.slice(0, 80),
        status: 'running',
        message: `Runner task started: ${task.slice(0, 80)}`
      });
    }
  } catch { /* dashboard logging is best-effort */ }

  let result;
  const cascadeChain = parseCascadeChain(cascadeStr);

  if (cascadeChain.length > 0) {
    const cascadeResult = await runWithCascade(projectDir, prompt, cascadeChain, {
      timeout,
      onProgress: ({ model, attempt, maxAttempts, status, reason }) => {
        if (status === 'running') {
          logger.log(`[cascade] ${model} attempt ${attempt}/${maxAttempts}...`);
        } else if (status === 'gate_failed') {
          logger.log(`[cascade] ${model} attempt ${attempt} — gate failed${reason ? ': ' + reason : ''}, escalating...`);
        } else if (status === 'cli_failed') {
          logger.log(`[cascade] ${model} attempt ${attempt} — CLI failed, retrying...`);
        }
      }
    });
    if (cascadeResult.ok) {
      result = cascadeResult.result;
      logger.log(`[runner] Completed via ${cascadeResult.modelUsed} (attempt ${cascadeResult.attempts})`);
    } else {
      result = { ok: false, output: '', completionMarker: false };
      logger.error(`[runner] ${cascadeResult.error}`);
    }
  } else {
    result = await launchCLI(projectDir, prompt, {
      timeout,
      onData: (chunk) => process.stdout.write(chunk)
    });
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  const status = result.ok ? 'completed' : 'failed';

  logger.log(`\n[runner] Task ${status} in ${elapsed}s`);
  if (result.completionMarker) logger.log('[runner] TASK_COMPLETE marker detected');

  // Atualiza run no dashboard
  if (db && runKey) {
    try {
      updateRun(db, {
        runKey,
        status,
        message: `Runner task ${status}: ${task.slice(0, 80)}`,
        payload: { task, agent, elapsed, ok: result.ok, completionMarker: result.completionMarker }
      });
    } catch { /* best-effort */ }
    try { db.close(); } catch { /* noop */ }
  }

  return { ok: result.ok, output: result.output, elapsed, completionMarker: result.completionMarker };
}

function buildRunnerPrompt(task, agentFile) {
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

module.exports = { runRunnerRun };
