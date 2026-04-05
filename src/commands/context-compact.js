'use strict';

/**
 * aioson context:compact — Standalone context compaction
 *
 * Usage:
 *   aioson context:compact . --agent=dev --input=devlog.md
 *   aioson context:compact . --agent=orache --input=notes.md --session=abc-123
 *   aioson context:compact . --agent=dev --json
 */

const path = require('node:path');
const { compactContext } = require('../squad/context-compactor');

async function runContextCompact({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const agent = String(options.agent || options.a || 'dev').trim();
  const input = options.input ? String(options.input).trim() : undefined;
  const session = options.session ? String(options.session).trim() : undefined;

  if (!input) {
    logger.error('Error: --input=<path> is required (path to devlog, notes, or output)');
    return { ok: false, error: 'missing_input' };
  }

  const result = await compactContext(targetDir, { agent, input, session });

  if (!result.ok) {
    logger.error(`Error: ${result.error}`);
    return result;
  }

  if (options.json) return result.summary;

  const s = result.summary.summary;
  logger.log(`Context compacted for @${agent}`);
  logger.log(`  Session:  ${result.summary.session_id}`);
  logger.log(`  Tools:    ${s.tools_used.length} detected`);
  logger.log(`  Requests: ${s.recent_requests.length} extracted`);
  logger.log(`  Pending:  ${s.pending_work.length} items`);
  logger.log(`  Files:    ${s.key_files.length} referenced`);
  logger.log(`  Timeline: ${s.timeline.length} events`);
  logger.log('');
  logger.log(`Output: ${path.relative(targetDir, result.path)}`);

  return { ok: true, ...result.summary };
}

module.exports = { runContextCompact };
