'use strict';

/**
 * aioson pattern:detect — Detect automation candidates from squad learnings
 *
 * Usage:
 *   aioson pattern:detect . --squad=content-team
 *   aioson pattern:detect . --squad=content-team --min-occurrences=2
 *   aioson pattern:detect . --squad=content-team --json
 */

const path = require('node:path');
const { detectPatterns, formatPatternReport } = require('../squad/pattern-detector');

async function runPatternDetect({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const squadSlug = String(options.squad || options.s || '').trim();

  if (!squadSlug) {
    logger.error('Error: --squad is required');
    return { ok: false, error: 'missing_squad' };
  }

  const minOccurrences = Number(options['min-occurrences'] || options.min || 3);
  const result = await detectPatterns(targetDir, squadSlug, { minOccurrences });

  if (options.json) return result;

  logger.log(formatPatternReport(result));
  return { ok: true, ...result };
}

module.exports = { runPatternDetect };
