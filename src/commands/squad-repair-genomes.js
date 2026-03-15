'use strict';

const path = require('node:path');
const { repairSquadManifestGenomeBindings } = require('../lib/squads/genome-repair');

async function runSquadRepairGenomes({ args, options = {}, logger }) {
  const target = args[0];
  if (!target) {
    throw new Error('Usage: aioson squad:repair-genomes <manifest.json> [--write] [--no-backup]');
  }

  const manifestPath = path.resolve(process.cwd(), target);
  const write = Boolean(options.write);
  const backup = !Boolean(options['no-backup']);
  const payload = await repairSquadManifestGenomeBindings(manifestPath, {
    dryRun: !write,
    write,
    backup
  });
  const result = {
    ok: true,
    write,
    dryRun: !write,
    backup,
    ...payload
  };

  if (options.json) return result;

  logger.log(`Squad genome repair target: ${manifestPath}`);
  logger.log(`Mode: ${result.dryRun ? 'dry-run' : 'write'}`);
  logger.log(`Changed: ${result.changed ? 'yes' : 'no'}`);
  if (result.backupPath) logger.log(`Backup: ${result.backupPath}`);
  return result;
}

module.exports = {
  runSquadRepairGenomes
};
