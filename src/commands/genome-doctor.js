'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { loadCompatibleGenome } = require('../lib/genomes/compat');

async function runGenomeDoctor({ args, options = {}, logger }) {
  const target = args[0];
  if (!target) {
    throw new Error('Usage: aioson genome:doctor <file>');
  }

  const filePath = path.resolve(process.cwd(), target);
  const raw = await fs.readFile(filePath, 'utf8');
  const loaded = loadCompatibleGenome(raw, { filePath });
  const result = {
    ok: true,
    file: filePath,
    detectedFormat: loaded.format,
    migrated: loaded.migrated,
    slug: loaded.document.slug,
    type: loaded.document.type,
    depth: loaded.document.depth,
    evidenceMode: loaded.document.evidenceMode
  };

  if (options.json) return result;

  logger.log(`Genome file: ${filePath}`);
  logger.log(`Format: ${result.detectedFormat}`);
  logger.log(`Migrated internally: ${result.migrated ? 'yes' : 'no'}`);
  logger.log(`Slug: ${result.slug}`);
  logger.log(`Type: ${result.type}`);
  logger.log(`Depth: ${result.depth}`);
  logger.log(`Evidence mode: ${result.evidenceMode}`);
  return result;
}

module.exports = {
  runGenomeDoctor
};
