'use strict';

const path = require('node:path');
const { SquadDaemon } = require('../squad-daemon');
const { openRuntimeDb } = require('../runtime-store');

async function handleStart(projectDir, squadSlug, options, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_daemon.squad_required'));
    return { ok: false };
  }

  const daemon = new SquadDaemon(projectDir, squadSlug, {
    port: options.port ? Number(options.port) : 0,
    poll: options.poll ? Number(options.poll) : 10000
  });

  try {
    const info = await daemon.start();
    logger.log(t('squad_daemon.started', {
      squad: squadSlug,
      port: info.port,
      workers: info.workers,
      cron: info.cronJobs
    }));
    logger.log(t('squad_daemon.webhook_hint', { port: info.port }));
    logger.log(t('squad_daemon.stop_hint'));

    // Keep alive until signal
    await new Promise((resolve) => {
      process.on('SIGINT', resolve);
      process.on('SIGTERM', resolve);
    });

    logger.log(t('squad_daemon.stopping'));
    await daemon.stop();
    return { ok: true, ...info };
  } catch (err) {
    logger.error(t('squad_daemon.start_failed', { error: err.message }));
    return { ok: false, error: err.message };
  }
}

async function handleStatus(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    // List all daemons
    const handle = await openRuntimeDb(projectDir, { mustExist: true });
    if (!handle) {
      logger.error(t('squad_daemon.no_runtime'));
      return { ok: false };
    }
    const { db } = handle;
    try {
      const daemons = db.prepare('SELECT * FROM squad_daemons ORDER BY squad_slug').all();
      if (daemons.length === 0) {
        logger.log(t('squad_daemon.no_daemons'));
        return { ok: true, daemons: [] };
      }
      logger.log(`Daemons (${daemons.length}):`);
      for (const d of daemons) {
        const icon = d.status === 'running' ? '[*]' : '[ ]';
        logger.log(`  ${icon} ${d.squad_slug} (${d.status}) port:${d.port || '-'} pid:${d.pid || '-'} heartbeat:${d.last_heartbeat || '-'}`);
      }
      return { ok: true, daemons };
    } finally {
      db.close();
    }
  }

  // Specific squad daemon status
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_daemon.no_runtime'));
    return { ok: false };
  }
  const { db } = handle;
  try {
    const record = db.prepare('SELECT * FROM squad_daemons WHERE squad_slug = ?').get(squadSlug);
    if (!record) {
      logger.log(t('squad_daemon.not_found', { squad: squadSlug }));
      return { ok: true, daemon: null };
    }
    logger.log(`Daemon: ${record.squad_slug}`);
    logger.log(`  Status: ${record.status}`);
    logger.log(`  PID: ${record.pid || '-'}`);
    logger.log(`  Port: ${record.port || '-'}`);
    logger.log(`  Started: ${record.started_at || '-'}`);
    logger.log(`  Heartbeat: ${record.last_heartbeat || '-'}`);
    if (record.error_message) logger.log(`  Error: ${record.error_message}`);
    if (record.config_json) {
      try {
        const config = JSON.parse(record.config_json);
        if (config.cronJobs && config.cronJobs.length > 0) {
          logger.log(`  Cron Jobs:`);
          for (const job of config.cronJobs) {
            logger.log(`    - ${job.worker} (${job.cron})`);
          }
        }
      } catch { /* ignore */ }
    }
    return { ok: true, daemon: record };
  } finally {
    db.close();
  }
}

async function handleStop(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_daemon.squad_required'));
    return { ok: false };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_daemon.no_runtime'));
    return { ok: false };
  }
  const { db } = handle;
  try {
    const record = db.prepare('SELECT * FROM squad_daemons WHERE squad_slug = ?').get(squadSlug);
    if (!record || record.status !== 'running') {
      logger.log(t('squad_daemon.not_running', { squad: squadSlug }));
      return { ok: true };
    }

    // Try to kill the process
    if (record.pid) {
      try {
        process.kill(record.pid, 'SIGTERM');
        logger.log(t('squad_daemon.signal_sent', { squad: squadSlug, pid: record.pid }));
      } catch {
        logger.log(t('squad_daemon.process_gone', { squad: squadSlug }));
      }
    }

    // Update record
    db.prepare(
      "UPDATE squad_daemons SET status = 'stopped' WHERE squad_slug = ?"
    ).run(squadSlug);

    return { ok: true };
  } finally {
    db.close();
  }
}

async function handleLogs(projectDir, squadSlug, { logger, t }) {
  if (!squadSlug) {
    logger.error(t('squad_daemon.squad_required'));
    return { ok: false };
  }

  // Show recent worker runs as daemon logs
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error(t('squad_daemon.no_runtime'));
    return { ok: false };
  }
  const { db } = handle;
  try {
    const runs = db.prepare(
      'SELECT * FROM worker_runs WHERE squad_slug = ? ORDER BY created_at DESC LIMIT 30'
    ).all(squadSlug);
    if (runs.length === 0) {
      logger.log(t('squad_daemon.no_logs'));
      return { ok: true, runs: [] };
    }
    logger.log(`Recent daemon activity for "${squadSlug}" (${runs.length}):`);
    for (const r of runs) {
      const icon = r.status === 'completed' ? '[ok]' : r.status === 'failed' ? '[!!]' : '[..]';
      const ms = r.duration_ms ? `${r.duration_ms}ms` : '-';
      logger.log(`  ${icon} ${r.created_at} ${r.worker_slug} (${r.trigger_type}) ${ms}`);
      if (r.error_message) logger.log(`       ${r.error_message}`);
    }
    return { ok: true, runs };
  } finally {
    db.close();
  }
}

async function runSquadDaemon({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = options.sub || 'status';
  const squadSlug = options.squad;

  switch (sub) {
    case 'start':
      return handleStart(targetDir, squadSlug, options, { logger, t });
    case 'status':
      return handleStatus(targetDir, squadSlug, { logger, t });
    case 'stop':
      return handleStop(targetDir, squadSlug, { logger, t });
    case 'logs':
      return handleLogs(targetDir, squadSlug, { logger, t });
    default:
      logger.error(t('squad_daemon.unknown_sub', { sub }));
      return { ok: false };
  }
}

module.exports = { runSquadDaemon };
