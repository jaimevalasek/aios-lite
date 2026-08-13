'use strict';

const fsp = require('node:fs/promises');
const path = require('node:path');
const { extractSite, searchSavedSite } = require('../web-extract');
const { ensureCapturedVia } = require('./web-save');

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function runWebExtract({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = String(options.slug || '').trim();
  const dirOption = String(options.dir || '').trim();
  if (!slug && !dirOption) {
    logger.error(t('web_extract.target_missing'));
    process.exitCode = 1;
    return { ok: false, error: 'target_missing' };
  }

  const siteDir = dirOption
    ? path.resolve(targetDir, dirOption)
    : path.join(targetDir, 'researchs', slug, 'site');
  try {
    const stats = await fsp.stat(siteDir);
    if (!stats.isDirectory()) throw new Error('not a directory');
  } catch {
    logger.error(t('web_extract.dir_missing', { dir: siteDir }));
    process.exitCode = 1;
    return { ok: false, error: 'dir_missing', dir: siteDir };
  }

  try {
    const query = String(options.query || '').trim();
    if (query) {
      const result = await searchSavedSite({
        dir: siteDir,
        query,
        contextLines: parseInteger(options.context, 2),
        maxMatches: parseInteger(options['max-matches'], 20)
      });
      const output = { ok: true, mode: 'search', dir: siteDir, query, matchCount: result.matches.length, capped: result.capped, matches: result.matches };
      if (options.json) return output;
      logger.log(t('web_extract.matches', { count: result.matches.length, query }));
      for (const match of result.matches) {
        for (const line of match.before) logger.log(`  ${match.file}: ${line}`);
        logger.log(`> ${match.file}:${match.line}: ${match.text}`);
        for (const line of match.after) logger.log(`  ${match.file}: ${line}`);
      }
      return output;
    }

    logger.log(t('web_extract.extracting', { dir: siteDir }));
    const { markdown, data } = await extractSite({ dir: siteDir });
    const outFile = options.out
      ? path.resolve(targetDir, String(options.out))
      : dirOption
        ? path.join(siteDir, 'extract.md')
        : path.join(targetDir, 'researchs', slug, 'extract.md');
    await fsp.mkdir(path.dirname(outFile), { recursive: true });
    await fsp.writeFile(outFile, markdown);

    // Self-heal the route stamp for pre-existing or externally mirrored captures:
    // manifest.json is web:save's signature; a conforming dir without one came
    // from an external mirror tool.
    let capturedVia = null;
    if (!dirOption) {
      const hasManifest = await fsp.access(path.join(siteDir, 'manifest.json')).then(() => true, () => false);
      capturedVia = hasManifest ? 'aioson' : 'external-mirror';
      await ensureCapturedVia(path.join(targetDir, 'researchs', slug, 'summary.md'), capturedVia);
    }

    const output = { ok: true, mode: 'extract', dir: siteDir, file: outFile, capturedVia, ...data };
    if (options.json) return output;
    logger.log(t('web_extract.written', { file: path.relative(process.cwd(), outFile) || outFile }));
    logger.log(t('web_extract.done'));
    return output;
  } catch (error) {
    logger.error(t('web_extract.failed', { error: error.message }));
    process.exitCode = 1;
    return { ok: false, error: 'extract_failed', detail: error.message };
  }
}

module.exports = {
  runWebExtract
};
