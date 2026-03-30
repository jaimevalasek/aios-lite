'use strict';

const path = require('node:path');
const { generateSessionRecovery, readSessionRecovery } = require('../recovery-context-session');

async function runRecoveryGenerate({ args, options, logger }) {
  const cwd = path.resolve(process.cwd(), args[0] || '.');
  const sessionState = {
    goal: options.goal || undefined,
    agent: options.agent || undefined,
    tasks: [],
    notes: []
  };

  const result = await generateSessionRecovery(cwd, sessionState);

  if (!result.ok) {
    logger.error(`recovery:generate failed: ${result.error}`);
    return result;
  }

  logger.log(`Recovery context generated: ${result.path} (${result.tokens} tokens)`);
  return result;
}

async function runRecoveryShow({ args, options, logger }) {
  const cwd = path.resolve(process.cwd(), args[0] || '.');
  const content = await readSessionRecovery(cwd);

  if (!content) {
    logger.log('No recovery context found. Run: aioson recovery:generate');
    return { ok: false, error: 'not_found' };
  }

  if (options.json) {
    return { ok: true, content };
  }

  logger.log(content);
  return { ok: true, content };
}

module.exports = { runRecoveryGenerate, runRecoveryShow };
