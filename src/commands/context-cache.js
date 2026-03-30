'use strict';

const path = require('node:path');
const { saveContextShadow, listSessions, restoreContext, cleanup } = require('../context-cache');

async function runContextCacheList({ args, options, logger }) {
  const cacheDir = options.cacheDir || undefined;
  const sessions = await listSessions({ cacheDir });

  if (options.json) {
    return { ok: true, sessions };
  }

  if (sessions.length === 0) {
    logger.log('No cached sessions found.');
    return { ok: true, sessions: [] };
  }

  logger.log('\n  Cached Context Sessions\n');
  for (const s of sessions) {
    const kb = Math.round(s.size / 1024);
    const goal = s.metadata.goal ? ` — ${s.metadata.goal.slice(0, 50)}` : '';
    logger.log(`  ${s.sessionId}  ${s.createdAt.slice(0, 16)}  ${kb}KB${goal}`);
  }
  logger.log('');

  return { ok: true, sessions };
}

async function runContextCacheSave({ args, options, logger }) {
  const cwd = path.resolve(process.cwd(), args[0] || '.');
  const content = options.content || '';

  if (!content) {
    logger.error('--content is required. Example: aioson context:cache:save . --content="..." --goal="..."');
    return { ok: false, error: 'missing_content' };
  }

  const result = await saveContextShadow(content, {
    goal: options.goal || '',
    agent: options.agent || '',
    projectDir: cwd
  });

  if (options.json) return result;

  logger.log(`Context saved. Session ID: ${result.sessionId}`);
  logger.log(`Path: ${result.path}`);
  return result;
}

async function runContextCacheRestore({ args, options, logger }) {
  const sessionId = options.session || args[0] || '';
  const cacheDir = options.cacheDir || undefined;

  if (!sessionId) {
    logger.error('--session=<id> is required.');
    return { ok: false, error: 'missing_session' };
  }

  const result = await restoreContext(sessionId, {
    cacheDir,
    query: options.query || undefined
  });

  if (!result.ok) {
    logger.error(`Restore failed: ${result.error}`);
    return result;
  }

  if (options.json) return result;

  logger.log(result.content);
  return result;
}

async function runContextCacheCleanup({ args, options, logger }) {
  const cacheDir = options.cacheDir || undefined;
  const maxAgeHours = Number(options['max-age']) || 24;
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  const result = await cleanup({ cacheDir, maxAge });

  if (options.json) return { ok: true, ...result };

  logger.log(`Removed ${result.removed} expired session(s).`);
  return { ok: true, ...result };
}

module.exports = { runContextCacheList, runContextCacheSave, runContextCacheRestore, runContextCacheCleanup };
