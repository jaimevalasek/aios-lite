'use strict';

/**
 * Browser walkthrough — a declarative, replayable drive of a real browser.
 *
 * A walkthrough is a JSON script: a list of steps (`goto`, `click`, `fill`,
 * `expect`, `snapshot`, …). Each step may carry the ids it proves (`ac`:
 * `AC-*` for a delivered feature, `PROM-*` for a prototype) and a `boundary`
 * — the real request the action must produce. The runner executes the steps
 * against the page, captures console/network evidence, and writes a report
 * whose per-id roll-up is what the gates read. The script is the evidence's
 * reproduction: anyone can replay it.
 *
 * Methodology it encodes (kept deliberately small):
 *   - locate by the accessibility tree first (`role=…[name=…]`, `label=…`,
 *     `text=…`), CSS only as the last resort — the page is read as text, not
 *     as pixels;
 *   - act, then verify: every action is followed by an `expect` and, when the
 *     action must reach the server, a `boundary`;
 *   - on failure, snapshot what the page actually showed (aria tree + PNG) so
 *     the next attempt is directed, not guessed;
 *   - stop at login walls — attach to the operator's signed-in browser
 *     (`--cdp`) rather than scripting credentials.
 *
 * Everything browser-facing goes through the Playwright `Page` surface, so a
 * fake page drives the whole runner in tests.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const { openBrowser } = require('../browser-session');
const scriptContract = require('./script');
const targets = require('./targets');
const steps = require('./steps');
const reports = require('./report');

const {
  SCHEMA, ACTIONS, DEFAULT_TIMEOUT_MS, DEFAULT_BOUNDARY_WAIT_MS, DEFAULT_SNAPSHOT_LINES,
  MAX_CONSOLE_SAMPLES, MAX_NETWORK_ROWS, LOGIN_WALL_RE,
  idsOf, normalizeScript, clampLines, loadScript, sanitizeUrl, maskedValue, clip, sha256, sleep, until
} = scriptContract;
const { parseTarget, locatorFor, parseBoundary, boundaryHit, urlMatches } = targets;
const { runExpect, ariaSnapshot, previewSnapshot, executeStep, pad } = steps;
const { rollupIds, rollupUnreached, deriveSmoke, buildMarkdown, reportDir, toRel } = reports;

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * @param {object} options
 * @param {string} options.targetDir project root
 * @param {object} options.script normalized script (from normalizeScript)
 * @param {string} [options.scriptPath] where the script came from (for the report)
 * @param {string} [options.scriptRaw] raw text (hashed into the report)
 * @param {string} [options.url] base URL override
 * @param {string} [options.file] local HTML file override (served as file://)
 * @param {string} [options.slug] feature/briefing slug owning the evidence
 * @param {boolean} [options.prototype] persist beside the briefing (PROM-* scope)
 * @param {boolean} [options.persist=true]
 * @param {Function} [options.open] browser opener (openBrowser-compatible), injectable
 * @param {object} [options.clock] { now, wait } injectable
 */
async function runWalkthrough(options) {
  const {
    targetDir,
    script,
    scriptPath = '',
    scriptRaw = '',
    url = '',
    file = '',
    slug = '',
    prototype = false,
    persist = true,
    out = '',
    continueOnFailure = false,
    headed = false,
    cdp = '',
    channel = '',
    config = null,
    open = openBrowser,
    clock = { now: Date.now, wait: sleep },
    writeFile = async (target, content) => { await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, content); }
  } = options;

  const ownerSlug = slug || script.feature || '';
  const fileTarget = file || script.file;
  // A page under .aioson/briefings/ is a prototype whatever the flags say: its
  // report must never land in the delivery slot the AC gates read.
  const underBriefings = Boolean(fileTarget) && /(^|[\\/])\.aioson[\\/]briefings[\\/]/.test(path.resolve(targetDir, fileTarget));
  const scope = prototype || script.scope === 'prototype' || underBriefings ? 'prototype' : 'delivery';
  let baseUrl = url || script.url || '';
  let targetKind = 'url';
  if (fileTarget && !baseUrl) {
    const absolute = path.resolve(targetDir, fileTarget);
    baseUrl = `file:///${absolute.split(path.sep).join('/').replace(/^\/+/, '')}`;
    targetKind = 'file';
  } else if (/^file:/i.test(baseUrl)) {
    targetKind = 'file';
  }
  if (!baseUrl && !script.steps.some((s) => s.do === 'goto' && /^[a-z][a-z0-9+.-]*:/i.test(String(s.url)))) {
    return { ok: false, error: 'target_missing', hint: 'pass --url=<app url> or --file=<html>, or put `url`/`file` in the script' };
  }

  const dir = persist ? reportDir(targetDir, { slug: ownerSlug, scope, out }) : null;
  const artifactDir = dir ? path.join(dir, script.name) : null;
  const startedAt = new Date(clock.now()).toISOString();

  const session = await open({ projectDir: targetDir, cdp, channel, config, headless: !headed, viewport: script.viewport });
  if (!session.ok) {
    return { ok: false, error: session.error, detail: session.detail || '', hint: session.hint || '' };
  }

  const consoleLog = { errors: 0, warnings: 0, page_errors: 0, samples: [] };
  const network = { rows: [], failed: 0 };
  const warnings = [];
  const executed = [];
  let stoppedAt = null;
  let page = null;

  try {
    page = await session.newPage();
    if (typeof page.on === 'function') {
      page.on('console', (msg) => {
        const type = typeof msg.type === 'function' ? msg.type() : String(msg.type || '');
        if (type === 'error') consoleLog.errors += 1;
        else if (type === 'warning') consoleLog.warnings += 1;
        else return;
        if (consoleLog.samples.length < MAX_CONSOLE_SAMPLES) consoleLog.samples.push({ type, text: clip(typeof msg.text === 'function' ? msg.text() : msg.text, 300) });
      });
      page.on('pageerror', (error) => {
        consoleLog.page_errors += 1;
        if (consoleLog.samples.length < MAX_CONSOLE_SAMPLES) consoleLog.samples.push({ type: 'pageerror', text: clip(String(error && error.message || error), 300) });
      });
      page.on('request', (request) => {
        if (network.rows.length >= MAX_NETWORK_ROWS) return;
        const row = { method: String(request.method()).toUpperCase(), url: String(request.url()), status: null, failed: false, _request: request };
        network.rows.push(row);
      });
      page.on('response', (response) => {
        const request = response.request();
        const row = network.rows.find((r) => r._request === request);
        if (row) row.status = response.status();
      });
      page.on('requestfailed', (request) => {
        const row = network.rows.find((r) => r._request === request);
        if (row) { row.failed = true; row.status = row.status === null ? 0 : row.status; }
        network.failed += 1;
      });
    }

    for (const step of script.steps) {
      const record = await executeStep({ page, step, script, baseUrl, artifactDir, artifactPrefix: script.name, network, clock, writeFile });
      executed.push(record);
      if (record.warning === 'login_wall') warnings.push(`step ${record.index}: landed on a login wall (${record.url}); attach to the operator's signed-in browser with --cdp instead of scripting credentials`);
      if (!record.ok) {
        // What the page actually showed — the directed-retry input.
        try {
          const text = await ariaSnapshot(page, null);
          record.failure_snapshot = previewSnapshot(text, script.snapshot_lines);
          if (artifactDir) {
            const ariaFile = path.join(artifactDir, `${script.name}-step-${pad(step.index)}-failed.aria.txt`);
            await writeFile(ariaFile, `${text}\n`);
            record.artifacts.push(ariaFile);
          }
        } catch { /* diagnosis is best effort */ }
        if (artifactDir) {
          try {
            const pngFile = path.join(artifactDir, `${script.name}-step-${pad(step.index)}-failed.png`);
            await fs.mkdir(artifactDir, { recursive: true });
            await page.screenshot({ path: pngFile, fullPage: false });
            record.artifacts.push(pngFile);
          } catch { /* best effort */ }
        }
        if (!(continueOnFailure || script.continue)) { stoppedAt = step.index; break; }
      }
    }
  } finally {
    await session.close().catch(() => {});
  }

  const ids = rollupUnreached(script, executed, rollupIds(executed, stoppedAt));
  const ok = executed.length === script.steps.length && executed.every((s) => s.ok);
  const replayParts = ['aioson browser:run .', `--script=${scriptPath ? toRel(targetDir, path.resolve(targetDir, scriptPath)) : '<script>'}`];
  if (url) replayParts.push(`--url=${url}`);
  if (file) replayParts.push(`--file=${file}`);
  if (ownerSlug) replayParts.push(`--slug=${ownerSlug}`);
  if (scope === 'prototype') replayParts.push('--prototype');
  if (cdp) replayParts.push(`--cdp=${cdp}`);
  if (channel) replayParts.push(`--browser=${channel}`);

  const report = {
    schema: SCHEMA,
    name: script.name,
    feature: ownerSlug,
    scope,
    target: { url: sanitizeUrl(baseUrl || (executed[0] && executed[0].url) || ''), kind: targetKind },
    browser: { mode: session.mode, label: session.label, version: session.version || '' },
    started_at: startedAt,
    finished_at: new Date(clock.now()).toISOString(),
    ok,
    stopped_at: stoppedAt,
    steps: executed.map((s) => ({ ...s, artifacts: s.artifacts.map((a) => toRel(targetDir, a)) })),
    ids,
    smoke: deriveSmoke(executed),
    console: consoleLog,
    network: {
      requests: network.rows.length,
      failed: network.failed,
      rows: network.rows.slice(0, MAX_NETWORK_ROWS).map((r) => ({ method: r.method, url: sanitizeUrl(r.url), status: r.status, failed: r.failed }))
    },
    warnings,
    script: { path: scriptPath ? toRel(targetDir, path.resolve(targetDir, scriptPath)) : '', sha256: sha256(scriptRaw || JSON.stringify(script)) },
    replay: replayParts.join(' '),
    persisted: false,
    report_path: '',
    markdown_path: ''
  };

  if (dir) {
    const jsonPath = path.join(dir, `${script.name}.json`);
    const mdPath = path.join(dir, `${script.name}.md`);
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(mdPath, buildMarkdown(report));
    report.persisted = true;
    report.report_path = toRel(targetDir, jsonPath);
    report.markdown_path = toRel(targetDir, mdPath);
  }
  return report;
}

/**
 * One-shot page read: navigate and return the aria snapshot + title + console
 * state. The cheapest way for an agent to see what a page offers before it
 * writes steps.
 */
async function snapshotPage({ targetDir, url = '', file = '', target = '', maxLines = DEFAULT_SNAPSHOT_LINES, cdp = '', channel = '', config = null, headed = false, timeout = DEFAULT_TIMEOUT_MS, open = openBrowser } = {}) {
  let baseUrl = url;
  if (!baseUrl && file) {
    const absolute = path.resolve(targetDir, file);
    baseUrl = `file:///${absolute.split(path.sep).join('/').replace(/^\/+/, '')}`;
  }
  if (!baseUrl) return { ok: false, error: 'target_missing', hint: 'pass --url=<page url> or --file=<html>' };
  const session = await open({ projectDir: targetDir, cdp, channel, config, headless: !headed, viewport: { width: 1280, height: 720 } });
  if (!session.ok) return { ok: false, error: session.error, detail: session.detail || '', hint: session.hint || '' };
  const consoleLog = { errors: 0, warnings: 0, page_errors: 0, samples: [] };
  try {
    const page = await session.newPage();
    if (typeof page.on === 'function') {
      page.on('console', (msg) => {
        const type = typeof msg.type === 'function' ? msg.type() : String(msg.type || '');
        if (type === 'error') consoleLog.errors += 1;
        else if (type === 'warning') consoleLog.warnings += 1;
        else return;
        if (consoleLog.samples.length < MAX_CONSOLE_SAMPLES) consoleLog.samples.push({ type, text: clip(typeof msg.text === 'function' ? msg.text() : msg.text, 300) });
      });
      page.on('pageerror', (error) => {
        consoleLog.page_errors += 1;
        if (consoleLog.samples.length < MAX_CONSOLE_SAMPLES) consoleLog.samples.push({ type: 'pageerror', text: clip(String(error && error.message || error), 300) });
      });
    }
    await page.goto(baseUrl, { waitUntil: 'load', timeout });
    const text = await ariaSnapshot(page, target || null);
    const preview = previewSnapshot(text, clampLines(maxLines));
    const title = await page.title().catch(() => '');
    const finalUrl = sanitizeUrl(page.url());
    return {
      ok: true,
      url: finalUrl,
      title,
      browser: { mode: session.mode, label: session.label },
      login_wall: LOGIN_WALL_RE.test(finalUrl) && !LOGIN_WALL_RE.test(baseUrl),
      snapshot: preview,
      console: consoleLog
    };
  } catch (error) {
    return { ok: false, error: 'navigation_failed', detail: clip(String(error && error.message || error), 400) };
  } finally {
    await session.close().catch(() => {});
  }
}

module.exports = {
  SCHEMA,
  ACTIONS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_BOUNDARY_WAIT_MS,
  DEFAULT_SNAPSHOT_LINES,
  idsOf,
  normalizeScript,
  loadScript,
  parseTarget,
  locatorFor,
  parseBoundary,
  boundaryHit,
  urlMatches,
  sanitizeUrl,
  maskedValue,
  until,
  runExpect,
  executeStep,
  rollupIds,
  deriveSmoke,
  buildMarkdown,
  reportDir,
  runWalkthrough,
  snapshotPage
};
