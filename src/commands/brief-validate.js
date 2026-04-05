'use strict';

/**
 * aioson brief:validate — Validate brief completeness before spawning
 *
 * Usage:
 *   aioson brief:validate . --brief=briefs/phase-1.md
 *   aioson brief:validate . --brief=briefs/phase-1.md --auto-fix
 *   aioson brief:validate . --brief=briefs/phase-1.md --json
 */

const path = require('node:path');
const { validateBrief, autoFixBrief } = require('../squad/brief-validator');

async function runBriefValidate({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const briefPath = String(options.brief || options.b || '').trim();

  if (!briefPath) {
    logger.error('Error: --brief=<path> is required');
    return { ok: false, error: 'missing_brief' };
  }

  const result = await validateBrief(briefPath, targetDir);

  // Auto-fix if requested and possible
  if (!result.ready && options['auto-fix'] && result.autoFixable) {
    const fixResult = await autoFixBrief(briefPath, targetDir);
    if (fixResult.fixed) {
      logger.log(`Auto-fixed: ${fixResult.fieldsFixed.join(', ')}`);
      // Re-validate after fix
      const recheck = await validateBrief(briefPath, targetDir);
      if (options.json) {
        return { ...recheck, autoFixed: fixResult.fieldsFixed };
      }
      printResult(recheck, logger, fixResult.fieldsFixed);
      return { ok: recheck.ready, ...recheck, autoFixed: fixResult.fieldsFixed };
    }
  }

  if (options.json) return result;

  printResult(result, logger);
  return { ok: result.ready, ...result };
}

function printResult(result, logger, autoFixed) {
  const status = result.ready ? 'READY' : `NOT READY (${result.issues.length} blocking issue${result.issues.length > 1 ? 's' : ''})`;
  logger.log(`Score: ${result.score}/${result.total} — ${status}`);

  if (result.issues.length > 0) {
    logger.log('');
    for (const issue of result.issues) {
      const fix = issue.autoFixable ? ' [auto-fixable]' : '';
      logger.log(`  ✗ ${issue.field}: ${issue.message}${fix}`);
    }
  }

  if (autoFixed && autoFixed.length > 0) {
    logger.log('');
    logger.log(`Auto-fixed fields: ${autoFixed.join(', ')}`);
  }
}

module.exports = { runBriefValidate };
