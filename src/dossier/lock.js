'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const LOCK_FILENAME = '.dossier.lock';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 200;
const DEFAULT_STALE_TTL_MS = 60_000;

function defaultIsAlive(pid) {
  if (typeof pid !== 'number' || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err && err.code === 'EPERM';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStaleLock(payload, { staleTtlMs, now, isAlive }) {
  if (!payload || typeof payload !== 'object') return true;
  const acquiredMs = Date.parse(payload.acquired_at);
  if (!Number.isFinite(acquiredMs)) return true;
  if (now() - acquiredMs >= staleTtlMs) return true;
  if (typeof payload.pid !== 'number' || !isAlive(payload.pid)) return true;
  return false;
}

async function acquireLock(lockDir, section, opts = {}) {
  if (typeof lockDir !== 'string' || !lockDir) {
    throw new TypeError('acquireLock: lockDir must be a non-empty string');
  }
  if (typeof section !== 'string' || !section) {
    throw new TypeError('acquireLock: section must be a non-empty string');
  }

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    staleTtlMs = DEFAULT_STALE_TTL_MS,
    now = Date.now,
    pid = process.pid,
    isAlive = defaultIsAlive,
    onWarn = (msg) => process.emitWarning(msg, 'DossierLockStale'),
    sleepFn = sleep
  } = opts;

  const lockPath = path.join(lockDir, LOCK_FILENAME);
  const start = now();

  await fs.mkdir(lockDir, { recursive: true });

  while (true) {
    try {
      const payload = {
        pid,
        section,
        acquired_at: new Date(now()).toISOString()
      };
      const fh = await fs.open(lockPath, 'wx');
      try {
        await fh.writeFile(JSON.stringify(payload));
      } finally {
        await fh.close();
      }

      let released = false;
      return async function release() {
        if (released) return;
        released = true;
        try {
          await fs.unlink(lockPath);
        } catch (err) {
          if (err && err.code !== 'ENOENT') throw err;
        }
      };
    } catch (err) {
      if (!err || err.code !== 'EEXIST') throw err;

      let existing = null;
      try {
        const raw = await fs.readFile(lockPath, 'utf8');
        existing = JSON.parse(raw);
      } catch (_) {
        existing = null;
      }

      if (isStaleLock(existing, { staleTtlMs, now, isAlive })) {
        onWarn(
          `stale dossier lockfile at ${lockPath} (pid=${existing && existing.pid != null ? existing.pid : '?'}); overriding`
        );
        try {
          await fs.unlink(lockPath);
        } catch (unlinkErr) {
          if (unlinkErr && unlinkErr.code !== 'ENOENT') throw unlinkErr;
        }
        continue;
      }

      if (now() - start >= timeoutMs) {
        const timeoutErr = new Error(
          `timed out acquiring dossier lock at ${lockPath} after ${timeoutMs}ms`
        );
        timeoutErr.code = 'EDOSSIERLOCK';
        timeoutErr.lockPath = lockPath;
        timeoutErr.holder = existing;
        throw timeoutErr;
      }

      await sleepFn(pollIntervalMs);
    }
  }
}

module.exports = {
  LOCK_FILENAME,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_STALE_TTL_MS,
  acquireLock,
  isStaleLock,
  defaultIsAlive
};
