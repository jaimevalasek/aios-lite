'use strict';

const { backupAiosonDocs } = require('../backup-local');
const { resolveTargetDir } = require('../lib/project-root');

/**
 * aioson backup:local [.]
 *
 * Manually backs up all .md files from .aioson/context/ and .aioson/plans/
 * to ~/.aioson/backups/{project}/{timestamp}/
 */
async function runBackupLocal({ args, options, logger }) {
  const targetDir = resolveTargetDir(args);
  const result = await backupAiosonDocs(targetDir);

  if (result.count === 0) {
    logger.log('backup:local — nothing to back up (no .md files found in .aioson/context/ or .aioson/plans/)');
    return { ok: true, count: 0, backupPath: null };
  }

  logger.log(`backup:local — ${result.count} file(s) backed up → ${result.backupPath}`);
  return { ok: true, count: result.count, backupPath: result.backupPath };
}

module.exports = { runBackupLocal };
