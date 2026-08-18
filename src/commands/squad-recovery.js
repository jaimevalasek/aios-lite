'use strict';

const path = require('node:path');
const { generateRecovery, readRecovery } = require('../squad/recovery-context');
const { resolveTargetDir } = require('../lib/project-root');

/**
 * aioson squad:recovery <project> --squad <squad> --agent <agent> [--show]
 *
 * Generates (or re-generates) the recovery-context.md for an agent.
 * --show: print the generated content to stdout instead of just confirming.
 */
async function runSquadRecovery({ args, options, logger }) {
  const projectDir = resolveTargetDir(args);
  const squadSlug = options.squad || args[1];
  const agentSlug = options.agent || args[2];

  if (!squadSlug || !agentSlug) {
    logger.error('Usage: aioson squad:recovery <project> --squad <squad> --agent <agent> [--show]');
    return { ok: false };
  }

  const result = await generateRecovery(projectDir, squadSlug, agentSlug);

  if (!result.ok) {
    logger.error(`Failed to generate recovery context: ${result.error}`);
    return result;
  }

  logger.log(`Recovery context generated: ${result.path} (~${result.tokens} tokens)`);

  if (options.show) {
    const content = await readRecovery(projectDir, squadSlug);
    if (content) {
      logger.log('');
      logger.log(content);
    }
  }

  return result;
}

module.exports = { runSquadRecovery };
