'use strict';

// Playwright is located from the project under inspection first, then from the
// CLI's own tree. A global or `npm link`ed CLI shares no node_modules with the
// project, so a loader that only looks beside itself reports "not installed"
// against a project that did install it — and every browser gate silently
// never runs while `aioson doctor` keeps promising it can.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadPlaywright, resolvePlaywright } = require('../src/lib/playwright-loader');
const { collectRuntimeMeasurements, RUNTIME_PROBE_VERSION } = require('../src/lib/visual-runtime');

// A project that installed its own Playwright: a package whose chromium records
// what the framework hands to `page.evaluate`.
function projectWithPlaywright() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-pw-'));
  const pkg = path.join(dir, 'node_modules', 'playwright');
  fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: 'playwright', version: '0.0.0-fake', main: 'index.js' }));
  fs.writeFileSync(path.join(pkg, 'index.js'), [
    "'use strict';",
    'const calls = [];',
    'module.exports = {',
    "  __source: 'project',",
    '  __calls: calls,',
    '  chromium: {',
    '    launch: async () => ({',
    '      newContext: async ({ viewport }) => ({',
    '        newPage: async () => ({',
    '          goto: async () => {},',
    '          evaluate: async (fn, arg) => {',
    '            calls.push({ fn: typeof fn, arg, viewport });',
    '            return { scroll_width: viewport.width, viewport_width: viewport.width, viewport_height: viewport.height, clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: [] };',
    '          }',
    '        }),',
    '        close: async () => {}',
    '      }),',
    '      close: async () => {}',
    '    })',
    '  }',
    '};',
    ''
  ].join('\n'));
  return dir;
}

test('the project under inspection wins over the CLI tree', () => {
  const project = projectWithPlaywright();
  const resolved = resolvePlaywright([project]);
  assert.ok(resolved, 'a project-local Playwright must be found');
  assert.ok(resolved.startsWith(path.join(project, 'node_modules', 'playwright')), resolved);
  assert.equal(loadPlaywright([project]).__source, 'project');
});

test('blank and missing directories are skipped, never thrown on', () => {
  const project = projectWithPlaywright();
  const nowhere = path.join(os.tmpdir(), 'aioson-pw-does-not-exist-' + process.pid);
  assert.equal(loadPlaywright([null, undefined, '', nowhere, project]).__source, 'project');
  assert.equal(loadPlaywright(project).__source, 'project', 'a single directory is accepted too');
});

test('a project without Playwright falls through to whatever the CLI tree answers', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-pw-empty-'));
  // The CLI tree may or may not carry Playwright on this machine; the contract
  // is that the empty project does not change that answer — and never throws.
  assert.equal(resolvePlaywright([empty]), resolvePlaywright([]));
  assert.equal(resolvePlaywright(), resolvePlaywright([]));
});

test('runtime telemetry drives the PROJECT\'s Playwright and hands the probe its version', async () => {
  const project = projectWithPlaywright();
  const collected = await collectRuntimeMeasurements({ fileUrl: 'file:///proto.html', projectDir: project });

  assert.equal(collected.available, true, collected.reason);
  const fake = loadPlaywright([project]);
  assert.equal(fake.__calls.length, collected.runs.length);
  for (const call of fake.__calls) {
    assert.equal(call.fn, 'function', 'the probe travels as source');
    assert.equal(call.arg, RUNTIME_PROBE_VERSION, 'the probe version travels as the argument — the page cannot see the module');
  }
});

test('no command looks for Playwright beside the CLI only', () => {
  // One resolver, one answer: a bare require('playwright') in a command is the
  // global/link blind spot coming back under another name.
  const root = path.join(__dirname, '..', 'src');
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.js') || full.includes(`${path.sep}i18n${path.sep}`)) continue;
      if (path.relative(root, full) === path.join('lib', 'playwright-loader.js')) continue;
      const source = fs.readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
      if (/require(?:\.resolve)?\(\s*['"]playwright['"]/.test(source)) offenders.push(path.relative(root, full));
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], `resolve Playwright through src/lib/playwright-loader.js (project first) in: ${offenders.join(', ')}`);
});
