'use strict';

const path = require('node:path');
const { readTextIfExists, exists } = require('../utils');
const { validateProjectContextFile } = require('../context');

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

function requirePlaywright() {
  try {
    return require('playwright');
  } catch {
    return null;
  }
}

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
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const configPath = path.join(targetDir, 'aios-qa.config.json');
  const prdPath = path.join(targetDir, '.aioson/context/prd.md');
  const checks = [];

  // Check 1 — Playwright installed
  const pw = requirePlaywright();
  checks.push(makeCheck(
    'playwright.installed',
    Boolean(pw),
    'error',
    pw ? t('qa_doctor.playwright_ok') : t('qa_doctor.playwright_missing'),
    pw ? '' : t('qa_doctor.playwright_missing_hint')
  ));

  // Check 2 — Chromium binary
  if (pw) {
    let chromiumOk = false;
    try {
      const execPath = pw.chromium.executablePath();
      chromiumOk = Boolean(execPath) && await exists(execPath);
    } catch {
      chromiumOk = false;
    }
    checks.push(makeCheck(
      'chromium.binary',
      chromiumOk,
      'error',
      chromiumOk ? t('qa_doctor.chromium_ok') : t('qa_doctor.chromium_missing'),
      chromiumOk ? '' : t('qa_doctor.chromium_missing_hint')
    ));
  }

  // Check 3 — Config file
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
