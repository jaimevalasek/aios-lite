'use strict';

const path = require('node:path');
const { withIndex } = require('../context-search');

async function runContextSearch({ args, options, logger }) {
  const query = args[0] || options.query || '';
  const cwd = path.resolve(process.cwd(), options.cwd || '.');
  const limit = Number(options.limit) || 10;

  if (!query) {
    logger.log('Usage: aioson context:search <query> [--limit=10] [--cwd=.]');
    return { ok: false, error: 'missing_query' };
  }

  const results = await withIndex(async (idx) => {
    return idx.search(query, { limit, projectDir: cwd });
  });

  if (options.json) {
    return { ok: true, results };
  }

  if (results.length === 0) {
    logger.log(`No results for: ${query}`);
    return { ok: true, results: [] };
  }

  logger.log(`\n  Search results for: "${query}"\n`);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    logger.log(`  ${i + 1}. ${r.title}`);
    logger.log(`     ${r.relPath}`);
    if (r.snippet) {
      logger.log(`     ${r.snippet.replace(/\n/g, ' ')}`);
    }
    logger.log('');
  }

  return { ok: true, results };
}

async function runContextSearchIndex({ args, options, logger }) {
  const cwd = path.resolve(process.cwd(), args[0] || '.');
  const force = Boolean(options.force);

  logger.log(`Indexing: ${cwd} ...`);

  const result = await withIndex(async (idx) => {
    const r = await idx.indexDirectory(cwd, { force });
    const stats = idx.stats();
    return { ...r, stats };
  });

  if (options.json) {
    return { ok: true, ...result };
  }

  logger.log(`  Indexed: ${result.indexed} files`);
  logger.log(`  Skipped: ${result.skipped} files (already indexed)`);
  logger.log(`  Total in index: ${result.stats.totalDocs} docs`);

  return { ok: true, ...result };
}

module.exports = { runContextSearch, runContextSearchIndex };
