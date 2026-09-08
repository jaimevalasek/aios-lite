'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const loader = require('../src/lib/playwright-loader');
const sessions = require('../src/lib/browser-session');

async function runCommand(t, mode, fixture = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-scanner-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'aios-qa.config.json'), JSON.stringify({ url: 'http://localhost:3000', personas: fixture.personas || ['hacker'], feature: fixture.feature }));
  if (fixture.prd) {
    const dir = path.join(root, '.aioson/context');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fixture.feature ? `prd-${fixture.feature}.md` : 'prd.md'), fixture.prd);
  }
  for (const report of fixture.reports || []) {
    const dir = path.join(root, '.aioson/context/features', report.folder, 'browser');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'walk.json'), JSON.stringify({ schema: 1, scope: 'delivery', feature: report.folder, finished_at: '2099-01-01T00:00:00Z', target: { url: 'http://localhost:3000' }, ...report }));
  }
  const page = new EventEmitter();
  let current = 'http://localhost:3000';
  let closed = false;
  Object.assign(page, {
    goto: async (url) => {
      current = url;
      if (fixture.navigationError || (fixture.failedRoute && url.includes(fixture.failedRoute))) throw new Error('Timeout with secret=do-not-export');
      if (fixture.sensitiveError && new URL(url).pathname === '/.env') throw new Error('Request failed: secret=do-not-export');
      return { status: () => fixture.httpStatus || (fixture.sensitiveBody !== undefined || new URL(url).pathname === '/' ? 200 : 404), text: async () => fixture.sensitiveBody || '' };
    },
    url: () => current,
    content: async () => {
      if (fixture.contentError) throw new Error('Read failed: secret=do-not-export');
      return fixture.html || '<html lang="en"><body></body></html>';
    },
    $$eval: async () => {
      if (fixture.discoveryError) throw new Error('Link enumeration failed');
      return fixture.links || [];
    },
    $$: async () => [],
    $: async () => null,
    screenshot: async () => {},
    keyboard: { press: async () => {} },
    waitForTimeout: async () => {},
    evaluate: async (fn, arg) => {
      if (fixture.evaluateError) throw new Error('Context destroyed: secret=do-not-export');
      return vm.runInNewContext(`(${fn.toString()})(arg)`, {
        arg,
        window: { innerWidth: 1280, ...(fixture.globals || {}) },
        performance: { getEntriesByType: (type) => type === 'navigation' ? [{ domContentLoadedEventEnd: 10, loadEventEnd: 20, responseStart: 5, requestStart: 0 }] : [] },
        document: { body: { scrollWidth: 1280 }, querySelectorAll: () => [], querySelector: () => ({}) }
      });
    }
  });
  t.mock.method(loader, 'loadPlaywright', () => ({}));
  t.mock.method(sessions, 'openBrowser', async () => ({ ok: true, browser: {}, newPage: async () => page, close: async () => { closed = true; } }));
  const file = require.resolve(`../src/commands/qa-${mode}`);
  delete require.cache[file];
  t.after(() => { delete require.cache[file]; });
  const command = require(file)[mode === 'scan' ? 'runQaScan' : 'runQaRun'];
  const result = await command({ args: [root], options: { json: true, html: true }, logger: { log() {}, warn() {}, error() {} }, t: (key) => key });
  assert.equal(closed, true);
  return { result, page, root, json: JSON.parse(await fs.readFile(result.jsonPath, 'utf8')), md: await fs.readFile(result.mdPath, 'utf8') };
}

for (const mode of ['scan', 'run']) {
  test(`${mode}: public Stripe keys do not become secret findings in HTML or globals`, async (t) => {
    const key = 'pk_live_' + 'A'.repeat(24);
    const other = 'pk_test_' + 'B'.repeat(24);
    const { result } = await runCommand(t, mode, { html: `<script>SECRET='${key}'; TOKEN='${other}'</script>`, globals: { ENV: { STRIPE_KEY: key, TEST_KEY: other } } });
    assert.deepEqual(result.findings.filter((f) => /key|secret|token/i.test(f.title)), []);
  });

  test(`${mode}: secret and restricted Stripe keys remain detectable without exposing values`, async (t) => {
    const keys = ['sk_live_', 'sk_test_', 'rk_live_', 'rk_test_'].map((prefix) => prefix + 'C'.repeat(24));
    const { result } = await runCommand(t, mode, { html: keys.join(' '), globals: { ENV: { keys } } });
    for (const label of ['Stripe live secret key', 'Stripe test secret key', 'Stripe live restricted key', 'Stripe test restricted key']) {
      assert.ok(result.findings.some((f) => f.title.includes(label) && /HTML/.test(f.title)), label);
      assert.ok(result.findings.some((f) => f.title.includes(label) && /window/.test(f.title)), label);
    }
    for (const key of keys) assert.ok(!JSON.stringify(result).includes(key));
    if (mode === 'scan') {
      assert.equal(result.execution_complete, true, 'finding severity is separate from execution completeness');
      assert.ok(result.probe_results.some((row) => row.status === 'failed' && row.finding_ids.length));
    }
  });

  test(`${mode}: public Stripe configuration alone is not a sensitive-file leak`, async (t) => {
    const publicKey = 'pk_live_' + 'D'.repeat(24);
    const { result } = await runCommand(t, mode, { sensitiveBody: `STRIPE_PUBLIC_KEY=${publicKey}` });
    assert.deepEqual(result.findings.filter((f) => /Sensitive file/.test(f.title)), []);
  });

  test(`${mode}: a public key never hides neighboring credentials or other provider patterns`, async (t) => {
    const publicKey = 'pk_test_' + 'P'.repeat(24);
    const privateKey = 'sk_live_' + 'S'.repeat(24);
    const config = `STRIPE_PUBLIC_KEY=${publicKey}; PASSWORD=${privateKey}`;
    const html = 'sk-' + 'O'.repeat(24) + ' ghp_' + 'G'.repeat(36);
    const { result } = await runCommand(t, mode, { html, sensitiveBody: config, globals: { ENV: { credential: 'secret=' + 'z'.repeat(24) } } });
    assert.ok(result.findings.some((f) => /Sensitive file/.test(f.title)));
    assert.ok(result.findings.some((f) => /OpenAI key/.test(f.title)));
    assert.ok(result.findings.some((f) => /GitHub token/.test(f.title)));
    assert.ok(result.findings.some((f) => /Generic secret exposed in window/.test(f.title)), 'case-insensitive flag survives browser serialization');
    assert.ok(!JSON.stringify(result).includes(privateKey));
  });

  test(`${mode}: a bare private Stripe key in a sensitive endpoint is still a leak`, async (t) => {
    const { result } = await runCommand(t, mode, { sensitiveBody: 'rk_live_' + 'R'.repeat(24) });
    assert.ok(result.findings.some((f) => /Sensitive file/.test(f.title)));
  });
}

test('scan: failed navigation is incomplete in command, JSON, Markdown and HTML', async (t) => {
  const { result, json, md, root } = await runCommand(t, 'scan', { navigationError: true });
  assert.equal(result.execution_complete, false);
  assert.equal(json.routes_scanned, 0);
  assert.equal(json.routes_discovered, 1);
  assert.ok(json.limitations.some((row) => row.probe === 'navigation'));
  assert.match(md, /INCOMPLETE/);
  assert.match(await fs.readFile(result.htmlPath, 'utf8'), /INCOMPLETE/);
  const index = await fs.readFile(path.join(root, 'reports/index.html'), 'utf8');
  assert.match(index, /INCOMPLETE/);
  assert.doesNotMatch(index, /&#x2713; Clean/);
  assert.doesNotMatch(JSON.stringify(json), /do-not-export/);
});

for (const [name, fixture] of [['http', { httpStatus: 503 }], ['content', { contentError: true }], ['evaluate', { evaluateError: true }]]) {
  test(`scan: ${name} failure cannot become a clean completed route`, async (t) => {
    const { result, json } = await runCommand(t, 'scan', fixture);
    assert.equal(result.execution_complete, false);
    assert.equal(json.routes_scanned, 0);
    assert.ok(json.probe_results.some((row) => row.status === 'unavailable'));
    assert.doesNotMatch(JSON.stringify(json), /do-not-export/);
  });
}

test('scan: successful execution records explicit non-applicability and cleans console listeners', async (t) => {
  const { result, json, page } = await runCommand(t, 'scan');
  assert.equal(result.execution_complete, true);
  assert.equal(json.routes_scanned, 1);
  assert.deepEqual(json.limitations, []);
  assert.ok(json.probe_results.some((row) => row.status === 'executed'));
  assert.ok(json.probe_results.some((row) => row.probe === 'global_secrets' && row.status === 'not_applicable'));
  assert.equal(page.listenerCount('console'), 0);
});

for (const [name, fixture] of [['discovery', { discoveryError: true }], ['sensitive_file', { sensitiveError: true }]]) {
  test(`scan: ${name} failure remains visible even if the root route was scanned`, async (t) => {
    const { result } = await runCommand(t, 'scan', fixture);
    assert.equal(result.routesScanned, 1);
    assert.equal(result.execution_complete, false);
    assert.ok(result.limitations.some((row) => row.probe === name));
  });
}

test('scan: mixed routes preserve completed work and unavailable targets separately', async (t) => {
  const { result, page } = await runCommand(t, 'scan', { links: ['http://localhost:3000/down'], failedRoute: '/down' });
  assert.equal(result.routesDiscovered, 2);
  assert.equal(result.routesScanned, 1);
  assert.equal(result.execution_complete, false);
  assert.equal(page.listenerCount('console'), 0);
});

for (const [name, fixture] of [['navigation', { navigationError: true }], ['http', { httpStatus: 503 }], ['content', { contentError: true }], ['evaluate', { evaluateError: true }], ['sensitive', { sensitiveError: true }], ['mobile', { personas: ['mobile'] }]]) {
  test(`run: ${name} failure is explicit in every report`, async (t) => {
    const { result, json, md } = await runCommand(t, 'run', fixture);
    assert.equal(result.execution_complete, false);
    assert.equal(json.execution_complete, false);
    assert.ok(json.limitations.length > 0);
    assert.match(md, /INCOMPLETE/);
    assert.match(await fs.readFile(result.htmlPath, 'utf8'), /INCOMPLETE/);
    assert.doesNotMatch(JSON.stringify(json), /do-not-export/);
    assert.ok(result.probe_results.some((row) => row.probe === 'performance'), 'later probes still run');
  });
}

test('run: completed probes remain complete even when findings exist', async (t) => {
  const { result } = await runCommand(t, 'run', { html: 'sk_live_' + 'Q'.repeat(24) });
  assert.equal(result.execution_complete, true);
  assert.ok(result.probe_results.some((row) => row.status === 'failed' && row.finding_ids.length));
});

test('report: regenerated HTML retains incomplete scan execution', async (t) => {
  const { root } = await runCommand(t, 'scan', { navigationError: true });
  const { runQaReport } = require('../src/commands/qa-report');
  const result = await runQaReport({ args: [root], options: { html: true }, logger: { log() {}, error() {} }, t: (key) => key });
  assert.equal(result.ok, true);
  assert.match(await fs.readFile(result.htmlPath, 'utf8'), /INCOMPLETE/);
  assert.match(await fs.readFile(path.join(root, 'reports/index.html'), 'utf8'), /INCOMPLETE/);
});

function criteriaPrd(count = 25) {
  return '# PRD\n\n## Acceptance Criteria\n| AC | CAP | Observable behavior | Evidence |\n|---|---|---|---|\n' + Array.from({ length: count }, (_, i) => `| AC-example-${i + 1} | CAP-example | User action ${i + 1} reaches persistence | node test-${i + 1}.js |`).join('\n');
}

test('run: semantic ACs beyond twenty use only the configured feature evidence', async (t) => {
  const { result } = await runCommand(t, 'run', { feature: 'current', prd: criteriaPrd(), personas: [], reports: [
    { folder: 'unrelated', ids: { 'AC-example-1': { status: 'pass', steps: [0] } } },
    { folder: 'current', ids: { 'AC-example-25': { status: 'pass', steps: [0] } } }
  ] });
  assert.equal(result.acCoverage.length, 25);
  assert.equal(result.acCoverage.find((row) => row.id === 'AC-example-1').status, 'Not exercised');
  assert.equal(result.acCoverage.find((row) => row.id === 'AC-example-25').status, 'Covered');
  assert.equal(result.feature, 'current');
});

for (const [name, report] of [['owner', { feature: 'wrong' }], ['target', { target: { url: 'http://localhost:9999' } }], ['stale', { finished_at: '2000-01-01T00:00:00Z' }]]) {
  test(`run: ${name} mismatch cannot prove an AC`, async (t) => {
    const { result } = await runCommand(t, 'run', { feature: 'current', prd: criteriaPrd(1), personas: [], reports: [
      { folder: 'current', ids: { 'AC-example-1': { status: 'pass', steps: [0] } }, ...report }
    ] });
    assert.equal(result.acCoverage[0].status, 'Not exercised');
  });
}

test('run: legacy PRD does not borrow a walkthrough from another feature', async (t) => {
  const { result } = await runCommand(t, 'run', { prd: '| AC-01 | Save a record |', personas: [], reports: [
    { folder: 'unrelated', ids: { 'AC-01': { status: 'pass', steps: [0] } } }
  ] });
  assert.equal(result.acCoverage[0].status, 'Not exercised');
});

test('run: a recovered probe error keeps neighboring findings and later probes', async (t) => {
  const { result } = await runCommand(t, 'run', { html: 'sk_live_' + 'V'.repeat(24), evaluateError: true });
  assert.equal(result.execution_complete, false);
  const secrets = result.probe_results.find((row) => row.probe === 'exposed_secrets');
  assert.equal(secrets.status, 'unavailable');
  assert.ok(secrets.finding_ids.length > 0);
  assert.ok(result.probe_results.some((row) => row.probe === 'debug_routes'));
});

test('report: real CLI regenerates incomplete HTML from persisted scanner JSON', async (t) => {
  const { root } = await runCommand(t, 'scan', { navigationError: true });
  const { execFileSync } = require('node:child_process');
  const output = execFileSync(process.execPath, [path.resolve(__dirname, '../bin/aioson.js'), 'qa:report', root, '--html'], { encoding: 'utf8', windowsHide: true });
  assert.match(output, /html/i);
  const reportsDir = path.join(root, 'reports');
  const folders = await fs.readdir(reportsDir, { withFileTypes: true });
  for (const folder of folders.filter((entry) => entry.isDirectory())) {
    assert.match(await fs.readFile(path.join(reportsDir, folder.name, 'index.html'), 'utf8'), /INCOMPLETE/);
  }
});
