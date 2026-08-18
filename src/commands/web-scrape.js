'use strict';

const { scrapePage } = require('../web');
const { resolveTargetDir } = require('../lib/project-root');

const SUPPORTED_FORMATS = new Set(['markdown', 'text', 'html', 'links']);

async function runWebScrape({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const url = String(options.url || '').trim();
  const format = String(options.format || 'markdown').trim().toLowerCase();

  if (!url) {
    logger.error(t('web_scrape.url_missing'));
    process.exitCode = 1;
    return { ok: false, error: 'url_missing' };
  }
  if (!SUPPORTED_FORMATS.has(format)) {
    logger.error(t('web_scrape.invalid_format', { format }));
    process.exitCode = 1;
    return { ok: false, error: 'invalid_format' };
  }

  try {
    logger.log(t('web_scrape.fetching', { url }));
    const page = await scrapePage(url, { sameOriginOnly: false });
    const selected = format === 'markdown'
      ? page.markdown
      : format === 'text'
        ? page.text
        : format === 'html'
          ? page.html
          : page.links;

    const output = {
      ok: true,
      targetDir,
      url: page.url,
      statusCode: page.statusCode,
      contentType: page.contentType,
      title: page.title,
      description: page.description,
      canonical: page.canonical,
      format,
      content: selected,
      links: page.links,
      truncated: page.truncated
    };

    if (options.json) return output;

    logger.log(t('web_scrape.title_line', { title: page.title || '-' }));
    logger.log(t('web_scrape.status_line', { status: page.statusCode, type: page.contentType || '-' }));
    logger.log(t('web_scrape.done', { format }));
    if (Array.isArray(selected)) {
      for (const link of selected) logger.log(link);
    } else {
      logger.log(String(selected || ''));
    }
    return output;
  } catch (error) {
    logger.error(t('web_scrape.failed', { error: error.message }));
    process.exitCode = 1;
    return { ok: false, error: 'scrape_failed', detail: error.message };
  }
}

module.exports = {
  runWebScrape,
  SUPPORTED_FORMATS
};
