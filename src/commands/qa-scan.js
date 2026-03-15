'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { ensureDir } = require('../utils');

const SECRET_PATTERNS = [
  { name: 'OpenAI key',     regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe live key', regex: /pk_live_[a-zA-Z0-9]{20,}/ },
  { name: 'AWS access key',  regex: /AKIA[A-Z0-9]{16}/ },
  { name: 'Google API key',  regex: /AIzaSy[a-zA-Z0-9_-]{33}/ },
  { name: 'GitHub token',    regex: /gh[ps]_[a-zA-Z0-9]{36}/ },
  { name: 'Generic secret',  regex: /(SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[:=]\s*['"]?[a-zA-Z0-9_/+=-]{16,}/i }
];

const SENSITIVE_FILE_PATHS = [
  '/.env', '/.env.local', '/.env.production', '/.git/config',
  '/config.js', '/api/config', '/application.yml'
];

function requirePlaywright() {
  try { return require('playwright'); } catch { return null; }
}

async function loadConfig(targetDir) {
  try {
    const raw = await fs.readFile(path.join(targetDir, 'aios-qa.config.json'), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

let _counter = 0;
function makeFinding(severity, category, title, location, risk, fix) {
  _counter++;
  const id = `${severity[0].toUpperCase()}-${String(_counter).padStart(2, '0')}`;
  return { id, severity, category, title, location, risk, fix, screenshot: '', route: location };
}

async function takeScreenshot(page, screenshotsDir, id) {
  try {
    const file = path.join(screenshotsDir, `${id}.png`);
    await page.screenshot({ path: file, fullPage: false });
    return file;
  } catch { return ''; }
}

// --- Crawl all routes from base URL ---
async function crawlRoutes(page, baseUrl, maxDepth, maxPages) {
  const visited = new Set();
  const queue = [{ url: baseUrl, depth: 0 }];
  const normalizeUrl = (href) => {
    try {
      const u = new URL(href);
      u.hash = '';
      return u.toString().replace(/\/$/, '');
    } catch { return ''; }
  };

  while (queue.length > 0 && visited.size < maxPages) {
    const { url, depth } = queue.shift();
    const normalized = normalizeUrl(url);
    if (!normalized || visited.has(normalized)) continue;
    if (!normalized.startsWith(baseUrl)) continue;
    visited.add(normalized);

    if (depth >= maxDepth) continue;

    try {
      await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: 8000 });
      const links = await page.$$eval('a[href]', (els) => els.map((el) => el.href)).catch(() => []);
      for (const link of links) {
        const n = normalizeUrl(link);
        if (n && n.startsWith(baseUrl) && !visited.has(n)) {
          queue.push({ url: n, depth: depth + 1 });
        }
      }
    } catch { /* unreachable route — skip */ }
  }

  return Array.from(visited);
}

// --- Per-route security scan ---
async function scanRoute(page, route, baseUrl, findings, screenshotsDir) {
  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch { return; }

  // Check exposed secrets in HTML source
  const html = await page.content().catch(() => '');
  for (const { name, regex } of SECRET_PATTERNS) {
    if (regex.test(html)) {
      findings.push(makeFinding(
        'critical', 'security',
        `${name} found in HTML source`,
        route,
        `${name} is embedded in the HTML and visible to any browser user.`,
        'Remove from client-side rendering. Serve secrets only from server-side APIs.'
      ));
    }
  }

  // Check window globals
  const exposed = await page.evaluate((patterns) => {
    const sources = { '__NEXT_DATA__': window.__NEXT_DATA__, '__env__': window.__env__, 'ENV': window.ENV };
    const found = [];
    for (const [src, val] of Object.entries(sources)) {
      if (!val) continue;
      const str = JSON.stringify(val);
      for (const { name, regex } of patterns) {
        if (new RegExp(regex).test(str)) found.push({ source: src, keyType: name });
      }
    }
    return found;
  }, SECRET_PATTERNS.map((p) => ({ name: p.name, regex: p.regex.source }))).catch(() => []);

  for (const item of exposed) {
    const f = makeFinding(
      'critical', 'security',
      `${item.keyType} exposed in window.${item.source}`,
      route,
      `${item.keyType} visible to any user via the global object on this route.`,
      'Move to server-side only. Never expose via NEXT_PUBLIC_ or client-side globals.'
    );
    f.screenshot = await takeScreenshot(page, screenshotsDir, f.id);
    findings.push(f);
  }

  // Console error leakage
  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  await page.waitForTimeout(300).catch(() => {});
  const stackLeaks = consoleLogs.filter((l) => l.type === 'error' && /at\s+\w+\s+\(/.test(l.text));
  if (stackLeaks.length > 0) {
    findings.push(makeFinding(
      'medium', 'security',
      `Console exposes ${stackLeaks.length} stack trace(s)`,
      route,
      'Stack traces reveal application internals and library versions.',
      'Disable verbose error logging in production. Use a centralized error service.'
    ));
  }

  // Accessibility quick check
  const a11yIssues = await page.evaluate(() => {
    const r = [];
    const imgs = document.querySelectorAll('img:not([alt])');
    if (imgs.length) r.push(`${imgs.length} image(s) missing alt`);
    if (!document.querySelector('html[lang]')) r.push('html missing lang attribute');
    return r;
  }).catch(() => []);

  if (a11yIssues.length > 0) {
    findings.push(makeFinding(
      'medium', 'accessibility',
      `Accessibility issues: ${a11yIssues.join('; ')}`,
      route,
      'WCAG violations affect screen reader users.',
      'Add alt attributes to images and lang attribute to <html> element.'
    ));
  }

  // Mobile overflow check
  const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 5).catch(() => false);
  if (hasOverflow) {
    findings.push(makeFinding(
      'medium', 'ux',
      'Horizontal overflow detected',
      route,
      'Content overflows horizontally. Breaks mobile layout.',
      'Audit for fixed-width elements. Use responsive CSS (max-width: 100%, flexbox, grid).'
    ));
  }
}

// --- Check sensitive files (once per domain) ---
async function scanSensitiveFiles(page, baseUrl, findings) {
  for (const filePath of SENSITIVE_FILE_PATHS) {
    try {
      const response = await page.goto(`${baseUrl}${filePath}`, { waitUntil: 'commit', timeout: 5000 });
      if (response && response.status() === 200) {
        const body = await response.text().catch(() => '');
        if (/[A-Z_]{3,}=/.test(body) || /(SECRET|PASSWORD|TOKEN|KEY)/i.test(body)) {
          findings.push(makeFinding(
            'critical', 'security',
            `Sensitive file publicly accessible: ${filePath}`,
            `${baseUrl}${filePath}`,
            'Configuration file exposes credentials, connection strings, or infrastructure details.',
            `Block ${filePath} in your web server. Never deploy .env files to public directories.`
          ));
        }
      }
    } catch { /* not accessible — good */ }
  }
}

// --- Report ---
function buildScanReport(projectName, baseUrl, routes, findings) {
  const sorted = [...findings].sort((a, b) => {
    const o = { critical: 0, high: 1, medium: 2, low: 3 };
    return (o[a.severity] ?? 4) - (o[b.severity] ?? 4);
  });
  const bySev = (s) => sorted.filter((f) => f.severity === s);
  const date = new Date().toISOString().split('T')[0];

  let md = `## QA Scan Report — ${projectName} — ${date}\n\n`;
  md += `> Generated by: \`aioson qa:scan\`  \n`;
  md += `> Mode: autonomous crawl  \n`;
  md += `> Browser: Chromium | URL: ${baseUrl}  \n`;
  md += `> Routes scanned: ${routes.length}\n\n`;

  md += `### Routes discovered\n`;
  for (const r of routes.slice(0, 30)) md += `- ${r}\n`;
  if (routes.length > 30) md += `- ... and ${routes.length - 30} more\n`;
  md += '\n';

  md += `### Findings\n\n`;
  for (const [label, group] of [['Critical', bySev('critical')], ['High', bySev('high')], ['Medium', bySev('medium')], ['Low', bySev('low')]]) {
    if (group.length === 0) continue;
    md += `#### ${label}\n`;
    for (const f of group) {
      md += `**[${f.id}] ${f.title}**  \n`;
      md += `Location: \`${f.location}\`  \n`;
      md += `Risk: ${f.risk}  \n`;
      md += `Fix: ${f.fix}  \n`;
      if (f.screenshot) md += `Screenshot: ${f.screenshot}  \n`;
      md += '\n';
    }
  }

  md += `### Residual risks\n`;
  md += `- Scan does not test authenticated routes (no credentials provided).\n`;
  md += `- Dynamic routes with user-specific IDs were not enumerated.\n`;
  md += `- Full security audit requires manual penetration testing.\n\n`;

  const c = bySev('critical').length, h = bySev('high').length, m = bySev('medium').length, l = bySev('low').length;
  md += `### Summary\n- Routes: ${routes.length} | Critical: ${c} | High: ${h} | Medium: ${m} | Low: ${l}\n`;

  return md;
}

async function runQaScan({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');

  const pw = requirePlaywright();
  if (!pw) {
    logger.error(t('qa_scan.playwright_missing'));
    process.exitCode = 1;
    return { ok: false, error: 'playwright_not_installed' };
  }

  const config = await loadConfig(targetDir);
  if (!config) {
    logger.error(t('qa_scan.config_missing'));
    process.exitCode = 1;
    return { ok: false, error: 'config_not_found' };
  }

  const url = String(options.url || config.url || '');
  if (!url) {
    logger.error(t('qa_scan.url_missing'));
    process.exitCode = 1;
    return { ok: false, error: 'url_not_configured' };
  }

  const projectName = config.project_name || path.basename(targetDir) || 'Project';
  const maxDepth = parseInt(String(options.depth || '3'), 10) || 3;
  const maxPages = parseInt(String(options['max-pages'] || '50'), 10) || 50;
  const headed = Boolean(options.headed);
  const screenshotsDir = path.join(targetDir, 'aios-qa-screenshots');

  _counter = 0;
  const findings = [];

  logger.log(t('qa_scan.starting', { url }));
  logger.log(t('qa_scan.crawling', { depth: maxDepth, pages: maxPages }));
  await ensureDir(screenshotsDir);

  const browser = await pw.chromium.launch({ headless: !headed });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    // Phase 1: crawl all routes
    const routes = await crawlRoutes(page, url, maxDepth, maxPages);
    logger.log(t('qa_scan.routes_found', { count: routes.length }));

    // Phase 2: scan sensitive files (once)
    await scanSensitiveFiles(page, url, findings).catch(() => {});

    // Phase 3: scan each route
    for (const route of routes) {
      logger.log(t('qa_scan.scanning_route', { route }));
      await scanRoute(page, route, url, findings, screenshotsDir).catch(() => {});
    }

    // Write reports
    const mdContent = buildScanReport(projectName, url, routes, findings);
    const mdPath = path.join(targetDir, 'aios-qa-report.md');
    const jsonPath = path.join(targetDir, 'aios-qa-report.json');

    const bySev = (s) => findings.filter((f) => f.severity === s).length;
    const jsonReport = {
      generated_at: new Date().toISOString(),
      project: projectName, url, mode: 'scan',
      routes_scanned: routes.length,
      summary: { critical: bySev('critical'), high: bySev('high'), medium: bySev('medium'), low: bySev('low') },
      findings
    };

    await fs.writeFile(mdPath, mdContent, 'utf8');
    await fs.writeFile(jsonPath, `${JSON.stringify(jsonReport, null, 2)}\n`, 'utf8');

    logger.log(t('qa_scan.done'));
    logger.log(t('qa_scan.report_written', { path: mdPath }));

    const summary = jsonReport.summary;
    logger.log(t('qa_scan.findings_summary', summary));

    // HTML report (optional, additive — does not replace MD/JSON)
    let htmlPath;
    if (options.html) {
      const { writeHtmlReport } = require('../qa-html-report');
      const result = await writeHtmlReport(targetDir, projectName, url, findings, [], null, 'scan', screenshotsDir, { routes });
      htmlPath = result.htmlPath;
      logger.log(t('qa_scan.html_report_written', { path: htmlPath }));
    }

    const output = { ok: true, targetDir, url, routesScanned: routes.length, summary, mdPath, jsonPath, findings, ...(htmlPath ? { htmlPath } : {}) };
    if (options.json) return output;
    return output;
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { runQaScan };
