'use strict';

const path = require('node:path');
const {
  loadWorkerConfig,
  listWorkers,
  runWorker,
  scaffoldWorker
} = require('../worker-runner');
const {
  openRuntimeDb,
  insertWorkerRun,
  listWorkerRuns
} = require('../runtime-store');

async function handleList(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_worker.squad_required'));
    return { ok: false };
  }
  const workers = await listWorkers(projectDir, squadSlug);
  if (workers.length === 0) {
    logger.log(t('squad_worker.no_workers'));
    return { ok: true, workers: [] };
  }
  logger.log(`Workers for squad "${squadSlug}" (${workers.length}):`);
  for (const w of workers) {
    logger.log(`  ${w.slug} [${w.type || 'manual'}] - ${w.name || w.slug}`);
  }
  return { ok: true, workers };
}

async function handleRun(projectDir, squadSlug, workerSlug, inputStr, { logger, t }) {
  if (!squadSlug || !workerSlug) {
    logger.error(t('squad_worker.run_usage'));
    return { ok: false };
  }

  let inputPayload = {};
  if (inputStr) {
    try {
      inputPayload = JSON.parse(inputStr);
    } catch {
      logger.error(t('squad_worker.invalid_input'));
      return { ok: false, error: 'Invalid JSON input' };
    }
  }

  logger.log(`Running worker "${workerSlug}" on squad "${squadSlug}"...`);
  const result = await runWorker(projectDir, squadSlug, workerSlug, inputPayload, { triggerType: 'manual' });

  // Log to runtime store
  const handle = await openRuntimeDb(projectDir, { mustExist: false });
  if (handle) {
    const { db } = handle;
    try {
      insertWorkerRun(db, {
        squadSlug,
        workerSlug,
        triggerType: 'manual',
        inputJson: JSON.stringify(inputPayload),
        outputJson: result.ok ? JSON.stringify(result.output) : null,
        status: result.ok ? 'completed' : 'failed',
        errorMessage: result.ok ? null : result.error,
        durationMs: result.durationMs || 0,
        attempt: result.attempt || 1
      });
    } finally {
      db.close();
    }
  }

  if (result.ok) {
    logger.log(t('squad_worker.run_success', { worker: workerSlug }));
    logger.log(JSON.stringify(result.output, null, 2));
  } else {
    logger.error(t('squad_worker.run_failed', { worker: workerSlug, error: result.error }));
  }
  return result;
}

async function handleTest(projectDir, squadSlug, workerSlug, { logger, t }) {
  if (!squadSlug || !workerSlug) {
    logger.error(t('squad_worker.test_usage'));
    return { ok: false };
  }

  const config = await loadWorkerConfig(projectDir, squadSlug, workerSlug);
  if (!config) {
    logger.error(t('squad_worker.not_found', { worker: workerSlug }));
    return { ok: false };
  }

  // Build mock input from schema
  const mockInput = {};
  for (const [key, spec] of Object.entries(config.inputs || {})) {
    if (spec.type === 'string') mockInput[key] = `test-${key}`;
    else if (spec.type === 'number') mockInput[key] = 0;
    else mockInput[key] = `test-${key}`;
  }

  logger.log(`Testing worker "${workerSlug}" with mock input:`);
  logger.log(JSON.stringify(mockInput, null, 2));

  const result = await runWorker(projectDir, squadSlug, workerSlug, mockInput, {
    triggerType: 'manual',
    noRetry: true
  });

  if (result.ok) {
    logger.log(t('squad_worker.test_passed', { worker: workerSlug }));
    logger.log(JSON.stringify(result.output, null, 2));
  } else {
    logger.error(t('squad_worker.test_failed', { worker: workerSlug, error: result.error }));
  }
  return result;
}

async function handleLogs(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_worker.squad_required'));
    return { ok: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_worker.no_runtime'));
    return { ok: false };
  }
  const { db } = handle;
  try {
    const runs = listWorkerRuns(db, squadSlug);
    if (runs.length === 0) {
      logger.log(t('squad_worker.no_logs'));
      return { ok: true, runs: [] };
    }
    logger.log(`Worker runs for squad "${squadSlug}" (${runs.length}):`);
    for (const run of runs) {
      const icon = run.status === 'completed' ? '[ok]' : run.status === 'failed' ? '[!!]' : '[..]';
      const duration = run.duration_ms ? `${run.duration_ms}ms` : '-';
      logger.log(`  ${icon} ${run.worker_slug} (${run.trigger_type}) ${duration} - ${run.created_at}`);
      if (run.error_message) logger.log(`       Error: ${run.error_message}`);
    }
    return { ok: true, runs };
  } finally {
    db.close();
  }
}

async function handleScaffold(projectDir, squadSlug, workerSlug, options, { logger, t }) {
  if (!squadSlug || !workerSlug) {
    logger.error(t('squad_worker.scaffold_usage'));
    return { ok: false };
  }

  const result = await scaffoldWorker(projectDir, squadSlug, workerSlug, {
    name: options.name || workerSlug,
    triggerType: options.trigger || 'manual',
    inputs: options.inputs ? options.inputs.split(',') : [],
    outputs: options.outputs ? options.outputs.split(',') : [],
    env: options.env ? options.env.split(',') : []
  });

  logger.log(t('squad_worker.scaffold_created', { worker: workerSlug, path: result.workerDir }));
  return { ok: true, ...result };
}

async function runSquadWorker({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = options.sub || 'list';
  const squadSlug = options.squad;
  const workerSlug = options.worker;

  switch (sub) {
    case 'list':
      return handleList(targetDir, squadSlug, { logger, t });
    case 'run':
      return handleRun(targetDir, squadSlug, workerSlug, options.input, { logger, t });
    case 'test':
      return handleTest(targetDir, squadSlug, workerSlug, { logger, t });
    case 'logs':
      return handleLogs(targetDir, squadSlug, { logger, t });
    case 'scaffold':
      return handleScaffold(targetDir, squadSlug, workerSlug, options, { logger, t });
    default:
      logger.error(t('squad_worker.unknown_sub', { sub }));
      return { ok: false };
  }
}

module.exports = { runSquadWorker };
