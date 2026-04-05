'use strict';

/**
 * aioson squad:scaffold — Deterministic squad directory generator
 *
 * Usage:
 *   aioson squad:scaffold . --slug=content-team --name="Content Team" --mode=content
 *   aioson squad:scaffold . --slug=dev-core --name="Dev Core" --mode=code
 *   aioson squad:scaffold . --slug=research --name="Research Hub" --mode=hybrid
 *   aioson squad:scaffold . --slug=test --json
 */

const path = require('node:path');
const { scaffoldSquad } = require('../squad/squad-scaffold');

async function runSquadScaffold({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = String(options.slug || '').trim();
  const name = String(options.name || slug || '').trim();
  const mode = String(options.mode || 'hybrid').trim();

  if (!slug) {
    logger.error('Error: --slug is required');
    return { ok: false, error: 'missing_slug' };
  }

  const result = await scaffoldSquad(targetDir, { slug, name, mode });

  if (!result.ok) {
    logger.error(`Error: ${result.error}`);
    return result;
  }

  if (options.json) return result;

  logger.log(`Squad "${result.name}" scaffolded (mode: ${result.mode})`);
  logger.log('');
  logger.log('Files created:');
  for (const f of result.files) {
    logger.log(`  ✓ ${f}`);
  }
  if (result.directories.length > 0) {
    logger.log('');
    logger.log('Directories created:');
    for (const d of result.directories) {
      logger.log(`  ✓ ${d}/`);
    }
  }
  logger.log('');
  logger.log(`Total: ${result.total} items`);

  return result;
}

module.exports = { runSquadScaffold };
