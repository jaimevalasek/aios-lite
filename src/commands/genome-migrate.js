'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { migrateGenomeDirectory, migrateGenomeFile } = require('../lib/genomes/migrate');

async function runGenomeMigrate({ args, options = {}, logger }) {
  const target = args[0];
  if (!target) {
    throw new Error('Usage: aioson genome:migrate <file-or-dir> [--write] [--no-backup]');
  }

  const resolvedTarget = path.resolve(process.cwd(), target);
  const write = Boolean(options.write);
  const backup = !Boolean(options['no-backup']);
  const stat = await fs.stat(resolvedTarget);
  const payload = stat.isDirectory()
    ? await migrateGenomeDirectory(resolvedTarget, { dryRun: !write, write, backup })
    : await migrateGenomeFile(resolvedTarget, { dryRun: !write, write, backup });
  const result = {
    ok: true,
    target: resolvedTarget,
    write,
    dryRun: !write,
    backup,
    ...(stat.isDirectory()
      ? { kind: 'directory', ...payload }
      : { kind: 'file', ...payload })
  };

  if (options.json) return result;

  logger.log(`Genome migrate target: ${resolvedTarget}`);
  logger.log(`Mode: ${result.dryRun ? 'dry-run' : 'write'}`);
  if (result.kind === 'directory') {
    logger.log(`Files scanned: ${result.total}`);
    logger.log(`Files changed: ${result.changed}`);
  } else {
    logger.log(`Detected format: ${result.detectedFormat}`);
    logger.log(`Changed: ${result.changed ? 'yes' : 'no'}`);
    if (result.backupPath) logger.log(`Backup: ${result.backupPath}`);
  }

  return result;
}

module.exports = {
  runGenomeMigrate
};
