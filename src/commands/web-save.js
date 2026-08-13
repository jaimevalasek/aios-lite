'use strict';

const fsp = require('node:fs/promises');
const path = require('node:path');
const { saveSite, DEFAULT_MAX_FILES, DEFAULT_MAX_TOTAL_BYTES } = require('../web-save');

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function deriveSlug(url) {
  try {
    const { hostname } = new URL(String(url).trim());
    const slug = hostname
      .replace(/^www\./i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'site';
  } catch {
    return 'site';
  }
}

// Deterministic route stamp: the capture route comparison (aioson vs harness)
// must not depend on the model remembering to write the field.
async function ensureCapturedVia(summaryPath, value) {
  let content;
  try {
    content = await fsp.readFile(summaryPath, 'utf8');
  } catch {
    return false;
  }
  if (/^captured_via:/m.test(content)) return false;
  const patched = content.replace(/^(---\r?\n[\s\S]*?)(\r?\n---)/, `$1\ncaptured_via: ${value}$2`);
  if (patched === content) return false;
  await fsp.writeFile(summaryPath, patched);
  return true;
}

async function seedSummary(researchDir, slug, url, result) {
  const summaryPath = path.join(researchDir, 'summary.md');
  try {
    await fsp.access(summaryPath);
    await ensureCapturedVia(summaryPath, 'aioson');
    return summaryPath;
  } catch {
    // absent — seed it below
  }
  const kb = Math.max(1, Math.round(result.totalBytes / 1024));
  const lines = [
    '---',
    `searched_at: ${new Date().toISOString()}`,
    'agent: web-save',
    'prd: null',
    `query: "${String(url).replace(/"/g, '')}"`,
    'verdict: confirmed',
    'captured_via: aioson',
    '---',
    '',
    `# Research: site capture — ${slug}`,
    '',
    '## Verdict',
    'Full-fidelity local capture saved by `aioson web:save`. Local reference only — never redistribute original assets.',
    '',
    '## Findings',
    `- Saved ${result.fileCount} files (${kb} KB) under \`site/\` — HTML, CSS, JS, fonts, images (see \`site/manifest.json\`).`,
    '',
    '## Sources consulted',
    `- ${url} — full site capture in \`site/\``,
    ''
  ];
  await fsp.mkdir(researchDir, { recursive: true });
  await fsp.writeFile(summaryPath, lines.join('\n'));
  return summaryPath;
}

async function runWebSave({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const url = String(options.url || '').trim();
  if (!url) {
    logger.error(t('web_save.url_missing'));
    process.exitCode = 1;
    return { ok: false, error: 'url_missing' };
  }

  const slug = String(options.slug || '').trim() || deriveSlug(url);
  const researchDir = path.join(targetDir, 'researchs', slug);
  const outDir = options.dir
    ? path.resolve(targetDir, String(options.dir))
    : path.join(researchDir, 'site');
  const maxFiles = Math.max(1, parseInteger(options['max-files'], DEFAULT_MAX_FILES));
  const maxTotalBytes = Math.max(1, parseInteger(options['max-bytes'], DEFAULT_MAX_TOTAL_BYTES));

  try {
    logger.log(t('web_save.fetching', { url }));
    const result = await saveSite(url, { outDir, maxFiles, maxTotalBytes });
    if (!result.ok) {
      logger.error(t('web_save.failed', { error: `${result.error} (HTTP ${result.statusCode})` }));
      process.exitCode = 1;
      return { ok: false, error: result.error, statusCode: result.statusCode, url: result.url, slug };
    }

    let summaryPath = null;
    if (!options.dir) {
      summaryPath = await seedSummary(researchDir, slug, url, result);
    }

    const output = {
      ok: true,
      targetDir,
      url: result.url,
      slug,
      dir: result.outDir,
      manifestPath: result.manifestPath,
      summaryPath,
      fileCount: result.fileCount,
      totalBytes: result.totalBytes,
      counts: result.counts,
      failures: result.failures,
      htmlTruncated: result.htmlTruncated
    };
    if (options.json) return output;

    logger.log(t('web_save.saved', {
      count: result.fileCount,
      kb: Math.max(1, Math.round(result.totalBytes / 1024)),
      dir: path.relative(process.cwd(), result.outDir) || '.'
    }));
    if (result.failures.length > 0) {
      logger.log(t('web_save.failures', { count: result.failures.length }));
    }
    logger.log(t('web_save.done'));
    return output;
  } catch (error) {
    logger.error(t('web_save.failed', { error: error.message }));
    process.exitCode = 1;
    return { ok: false, error: 'save_failed', detail: error.message };
  }
}

module.exports = {
  runWebSave,
  deriveSlug,
  ensureCapturedVia
};
