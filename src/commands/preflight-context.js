'use strict';

/**
 * aioson preflight:context — Estimate context budget before a session
 *
 * Usage:
 *   aioson preflight:context . --agent=dev
 *   aioson preflight:context . --agent=orchestrator --squad=content-team
 *   aioson preflight:context . --agent=dev --verbose
 *   aioson preflight:context . --agent=dev --json
 */

const path = require('node:path');
const { estimateContext, formatReport } = require('../squad/preflight-context');

async function runPreflightContext({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const agent = String(options.agent || options.a || 'dev').trim();
  const squad = options.squad ? String(options.squad).trim() : undefined;
  const verbose = Boolean(options.verbose || options.v);

  const result = await estimateContext(targetDir, { agent, squad, verbose });

  if (options.json) return result;

  logger.log(formatReport(result));
  return { ok: result.exitCode === 0, ...result };
}

module.exports = { runPreflightContext };
