'use strict';

const path = require('node:path');
const { readTextIfExists, exists } = require('../utils');
const { validateProjectContextFile } = require('../context');
const { resolveTargetDir } = require('../lib/project-root');

function makeCheck(id, ok, severity, message, hint = '') {
  return { id, ok: Boolean(ok), severity, message: String(message || ''), hint: String(hint || '') };
}

function summarizeChecks(checks) {
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok && c.severity === 'error').length;
  const warnings = checks.filter((c) => !c.ok && c.severity === 'warn').length;
  return { total: checks.length, passed, failed, warnings };
}

function formatPrefix(check, t) {
  if (check.ok) return t('qa_doctor.prefix_ok');
  if (check.severity === 'warn') return t('qa_doctor.prefix_warn');
  return t('qa_doctor.prefix_fail');
}

// Resolved from the project under test first, then from the CLI's own tree —
// the same order `aioson doctor` uses, so the two never disagree.
const { loadPlaywright } = require('../lib/playwright-loader');
const { probeBrowsers, modeLabel } = require('../lib/browser-session');

async function checkTargetUrl(url) {
  if (!url) return { reachable: false, error: 'no_url' };
  try {
    const http = url.startsWith('https') ? require('node:https') : require('node:http');
    await new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: 5000 }, (res) => {
        res.destroy();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
    return { reachable: true, error: '' };
  } catch (err) {
    return { reachable: false, error: err.message };
  }
}

function countAcItems(prdContent) {
  if (!prdContent) return 0;
  const tableMatches = prdContent.matchAll(/\|\s*(AC-\d+)\s*\|/g);
  return [...tableMatches].length;
}

async function runQaDoctor({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const configPath = path.join(targetDir, 'aios-qa.config.json');
  const prdPath = path.join(targetDir, '.aioson/context/prd.md');
  const checks = [];

  // Check 1 — Playwright installed
  const pw = loadPlaywright([targetDir]);
  checks.push(makeCheck(
    'playwright.installed',
    Boolean(pw),
    'error',
    pw ? t('qa_doctor.playwright_ok') : t('qa_doctor.playwright_missing'),
    pw ? '' : t('qa_doctor.playwright_missing_hint')
  ));

  // Config is read before the browser probe: `browser.cdp` / `browser.channel`
  // in aios-qa.config.json are part of how a browser is resolved.
  const configExists = await exists(configPath);
  let config = null;
  let configParsed = false;
  let configError = '';

  if (configExists) {
    try {
      const raw = await require('node:fs/promises').readFile(configPath, 'utf8');
      config = JSON.parse(raw);
      configParsed = true;
    } catch (err) {
      configError = err.message;
    }
  }

  // Check 2 — a browser. Three ways to have one: the bundled Chromium, an
  // installed Chrome/Edge (channel), or a CDP endpoint the operator already
  // runs. Only "none of them" is an error; a missing bundle with Chrome on
  // the box is a note, not a blocker.
  let browsers = null;
  if (pw) {
    browsers = await probeBrowsers({ projectDir: targetDir, playwright: pw, config, cdp: String(options.cdp || ''), channel: String(options.browser || '') });
    const bundledOk = browsers.modes.bundled.available;
    const fallbackLabel = browsers.preferred && browsers.preferred !== 'bundled' ? modeLabel(browsers.preferred, browsers.modes[browsers.preferred]) : '';
    checks.push(makeCheck(
      'chromium.binary',
      bundledOk,
      browsers.preferred ? 'warn' : 'error',
      bundledOk
        ? t('qa_doctor.chromium_ok')
        : (fallbackLabel ? t('qa_doctor.chromium_missing_fallback', { label: fallbackLabel }) : t('qa_doctor.chromium_missing')),
      bundledOk ? '' : t('qa_doctor.chromium_missing_hint')
    ));
    checks.push(makeCheck(
      'browser.chrome',
      browsers.modes.chrome.available,
      'info',
      browsers.modes.chrome.available ? t('qa_doctor.browser_chrome_ok', { binary: browsers.modes.chrome.binary }) : t('qa_doctor.browser_chrome_missing')
    ));
    checks.push(makeCheck(
      'browser.msedge',
      browsers.modes.msedge.available,
      'info',
      browsers.modes.msedge.available ? t('qa_doctor.browser_edge_ok', { binary: browsers.modes.msedge.binary }) : t('qa_doctor.browser_edge_missing')
    ));
    if (browsers.request.cdp) {
      checks.push(makeCheck(
        'browser.cdp',
        browsers.modes.cdp.available,
        'warn',
        browsers.modes.cdp.available
          ? t('qa_doctor.browser_cdp_ok', { endpoint: browsers.modes.cdp.endpoint, browser: browsers.modes.cdp.browser })
          : t('qa_doctor.browser_cdp_unreachable', { endpoint: browsers.modes.cdp.endpoint }),
        browsers.modes.cdp.available ? '' : t('qa_doctor.browser_cdp_hint')
      ));
    }
    checks.push(makeCheck(
      'browser.available',
      Boolean(browsers.preferred),
      'error',
      browsers.preferred ? t('qa_doctor.browser_preferred', { label: modeLabel(browsers.preferred, browsers.modes[browsers.preferred]) }) : t('qa_doctor.browser_none'),
      browsers.preferred ? '' : t('qa_doctor.browser_none_hint')
    ));
  }

  // Check 3 — Config file

  if (!configExists) {
    checks.push(makeCheck('config.exists', false, 'error', t('qa_doctor.config_missing'), t('qa_doctor.config_missing_hint')));
  } else if (!configParsed) {
    checks.push(makeCheck('config.parsed', false, 'error', t('qa_doctor.config_invalid', { error: configError }), t('qa_doctor.config_missing_hint')));
  } else {
    checks.push(makeCheck('config.exists', true, 'info', t('qa_doctor.config_ok')));
  }

  // Check 4 — Target URL reachable
  const configUrl = config && config.url ? config.url : '';
  if (!configUrl) {
    checks.push(makeCheck('url.reachable', false, 'warn', t('qa_doctor.url_missing'), t('qa_doctor.url_missing_hint')));
  } else {
    const { reachable, error } = await checkTargetUrl(configUrl);
    checks.push(makeCheck(
      'url.reachable',
      reachable,
      'warn',
      reachable
        ? t('qa_doctor.url_ok', { url: configUrl })
        : t('qa_doctor.url_unreachable', { url: configUrl, error }),
      reachable ? '' : t('qa_doctor.url_unreachable_hint')
    ));
  }

  // Check 5 — project.context.md
  const contextResult = await validateProjectContextFile(targetDir);
  checks.push(makeCheck(
    'context.exists',
    contextResult.exists,
    'warn',
    contextResult.exists ? t('qa_doctor.context_ok') : t('qa_doctor.context_missing')
  ));

  // Check 6 — prd.md (optional enrichment)
  const prdContent = await readTextIfExists(prdPath);
  const acCount = countAcItems(prdContent || '');
  checks.push(makeCheck(
    'prd.exists',
    Boolean(prdContent),
    'warn',
    prdContent
      ? t('qa_doctor.prd_ok', { count: acCount })
      : t('qa_doctor.prd_missing')
  ));

  const summary = summarizeChecks(checks);
  const output = {
    ok: summary.failed === 0,
    targetDir,
    configPath,
    configExists,
    configParsed,
    url: configUrl,
    browser: browsers ? { preferred: browsers.preferred, modes: browsers.modes, request: browsers.request } : null,
    checks,
    summary
  };

  if (options.json) return output;

  logger.log(t('qa_doctor.report_title', { path: targetDir }));
  for (const check of checks) {
    logger.log(t('qa_doctor.check_line', {
      prefix: formatPrefix(check, t),
      id: check.id,
      message: check.message
    }));
    if (check.hint) logger.log(t('qa_doctor.hint_line', { hint: check.hint }));
  }
  logger.log(t('qa_doctor.summary', {
    passed: summary.passed,
    failed: summary.failed,
    warnings: summary.warnings
  }));

  if (!output.ok) process.exitCode = 1;
  return output;
}

module.exports = { runQaDoctor };
