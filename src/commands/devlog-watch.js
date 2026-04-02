'use strict';

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');
const { processDevlogFile } = require('./devlog-process');

const POLL_INTERVAL_MS = 5000;
const WSL_VERSION_PATH = '/proc/version';

async function isWsl2() {
  try {
    const version = await fs.readFile(WSL_VERSION_PATH, 'utf8');
    return version.toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

async function processNewDevlog(targetDir, filePath, logger) {
  const { db, dbPath } = await openRuntimeDb(targetDir).catch(() => ({ db: null }));
  if (!db) {
    logger.log(`[DEVLOG WATCHER] No database available — skipping ${path.basename(filePath)}`);
    return;
  }
  try {
    const result = await processDevlogFile(db, filePath);
    if (result.status === 'ok') {
      const parts = [];
      if (result.learningsCount > 0) parts.push(`${result.learningsCount} learnings`);
      if (result.artifactsCount > 0) parts.push(`${result.artifactsCount} artifacts`);
      if (result.verdict) parts.push(`VERDICT: ${result.verdict}`);
      const detail = parts.length > 0 ? ` → ${parts.join(', ')} → SQLite ✓` : ' → SQLite ✓';
      logger.log(`[${new Date().toISOString().slice(11, 19)}] Processed: ${result.file}${detail}`);
    } else if (result.status === 'skipped') {
      // silently skip already-processed files
    } else {
      logger.log(`[${new Date().toISOString().slice(11, 19)}] ⚠ ${result.file}: ${result.reason}`);
    }
  } finally {
    db.close();
  }
}

async function watchWithFsWatch(logsDir, targetDir, logger) {
  logger.log(`[DEVLOG WATCHER] Using fs.watch on ${logsDir}`);

  return new Promise((resolve) => {
    const watcher = fsSync.watch(logsDir, { persistent: true }, async (eventType, filename) => {
      if (!filename || !filename.startsWith('devlog-') || !filename.endsWith('.md')) return;
      if (eventType !== 'rename' && eventType !== 'change') return;

      const filePath = path.join(logsDir, filename);
      // Small delay to ensure file is fully written
      setTimeout(async () => {
        try {
          await fs.access(filePath);
          logger.log(`[${new Date().toISOString().slice(11, 19)}] New: ${filename} → processing...`);
          await processNewDevlog(targetDir, filePath, logger);
        } catch { /* file may have been removed */ }
      }, 200);
    });

    process.on('SIGINT', () => { watcher.close(); resolve(); });
    process.on('SIGTERM', () => { watcher.close(); resolve(); });
  });
}

async function watchWithPolling(logsDir, targetDir, logger) {
  logger.log(`[DEVLOG WATCHER] WSL2 detected — using polling (${POLL_INTERVAL_MS / 1000}s interval)`);

  const seen = new Set();

  // Seed with already-existing files so we don't reprocess them
  try {
    const entries = await fs.readdir(logsDir);
    for (const f of entries) {
      if (f.startsWith('devlog-') && f.endsWith('.md')) seen.add(f);
    }
  } catch { /* logsDir not yet created */ }

  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      try {
        const entries = await fs.readdir(logsDir);
        const devlogs = entries.filter((f) => f.startsWith('devlog-') && f.endsWith('.md'));
        for (const filename of devlogs) {
          if (!seen.has(filename)) {
            seen.add(filename);
            const filePath = path.join(logsDir, filename);
            logger.log(`[${new Date().toISOString().slice(11, 19)}] New: ${filename} → processing...`);
            await processNewDevlog(targetDir, filePath, logger);
          }
        }
      } catch { /* directory may not exist yet */ }
    }, POLL_INTERVAL_MS);

    process.on('SIGINT', () => { clearInterval(timer); resolve(); });
    process.on('SIGTERM', () => { clearInterval(timer); resolve(); });
  });
}

async function runDevlogWatch({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const logsDir = path.join(targetDir, 'aioson-logs');
  const usePolling = options.poll || await isWsl2();

  // Ensure the directory exists
  await fs.mkdir(logsDir, { recursive: true });

  logger.log(`[DEVLOG WATCHER] Watching ${logsDir} for new devlogs...`);
  logger.log('[DEVLOG WATCHER] Press Ctrl+C to stop.');

  if (usePolling) {
    await watchWithPolling(logsDir, targetDir, logger);
  } else {
    try {
      await watchWithFsWatch(logsDir, targetDir, logger);
    } catch (err) {
      // Fall back to polling if fs.watch fails (can happen in some environments)
      logger.log(`[DEVLOG WATCHER] fs.watch failed (${err.message}) — falling back to polling`);
      await watchWithPolling(logsDir, targetDir, logger);
    }
  }

  logger.log('[DEVLOG WATCHER] Stopped.');
  return { ok: true };
}

module.exports = { runDevlogWatch };
