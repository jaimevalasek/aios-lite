'use strict';

const { mapWebsite } = require('../web');
const { resolveTargetDir } = require('../lib/project-root');

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function runWebMap({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const url = String(options.url || '').trim();
  if (!url) {
    logger.error(t('web_map.url_missing'));
    process.exitCode = 1;
    return { ok: false, error: 'url_missing' };
  }

  const maxDepth = Math.max(0, parseInteger(options.depth, 2));
  const maxPages = Math.max(1, parseInteger(options['max-pages'], 25));
  const sameOriginOnly = !normalizeBoolean(options['include-external'], false);

  try {
    logger.log(t('web_map.starting', { url }));
    const result = await mapWebsite(url, { maxDepth, maxPages, sameOriginOnly });
    const output = {
      ok: true,
      targetDir,
      url: result.startUrl,
      maxDepth,
      maxPages,
      sameOriginOnly,
      pageCount: result.pageCount,
      urls: result.urls,
      pages: result.pages
    };

    if (options.json) return output;

    logger.log(t('web_map.pages_found', { count: result.pageCount }));
    for (const page of result.pages) {
      logger.log(t('web_map.page_line', {
        url: page.url,
        depth: page.depth,
        status: page.statusCode,
        links: page.linkCount
      }));
    }
    logger.log(t('web_map.done'));
    return output;
  } catch (error) {
    logger.error(t('web_map.failed', { error: error.message }));
    process.exitCode = 1;
    return { ok: false, error: 'map_failed', detail: error.message };
  }
}

module.exports = {
  runWebMap
};
