'use strict';

async function runLocaleDiff({ args, options, logger }) {
  const jsonMode = Boolean(options.json);
  const log = jsonMode ? () => {} : logger.log.bind(logger);
  const requestedAgent = args[0] || null;
  const requestedLanguage = options.lang || options.language || null;

  if (!jsonMode) {
    log('Agent locale packs are no longer shipped.');
    log('Canonical agent prompts now live only in `.aioson/agents/` and user-facing language is controlled by `interaction_language`.');
  }

  return {
    ok: true,
    deprecated: true,
    mode: 'canonical-english-only',
    agent: requestedAgent,
    language: requestedLanguage,
    totalMissing: 0,
    drifts: []
  };
}

module.exports = { runLocaleDiff };
