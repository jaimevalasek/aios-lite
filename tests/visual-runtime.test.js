'use strict';

// Runtime visual telemetry — the measurements that only exist after layout.
// The verdict logic is pure so it can be proven without a browser; the browser
// glue is exercised through an injected launcher.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  contrastRatio,
  parseColor,
  isLargeText,
  summarizeRuntime,
  collectRuntimeMeasurements,
  pageProbe,
  DEFAULT_VIEWPORTS,
  RUNTIME_PROBE_VERSION
} = require('../src/lib/visual-runtime');
const { runVerifyArtifact, declaredRuntimeMatrix } = require('../src/commands/verify-artifact');
const { element, createPage, evaluateInPage, realmLauncher } = require('./helpers/fake-dom');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

test('color parsing covers the forms getComputedStyle actually returns', () => {
  assert.deepEqual(parseColor('rgb(16, 20, 24)'), { r: 16, g: 20, b: 24, a: 1 });
  assert.deepEqual(parseColor('rgba(255, 255, 255, 0.5)'), { r: 255, g: 255, b: 255, a: 0.5 });
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#101418'), { r: 16, g: 20, b: 24, a: 1 });
  // An unparseable color must never become a fabricated ratio.
  assert.equal(parseColor('currentColor'), null);
  assert.equal(contrastRatio('currentColor', '#fff'), null);
});

test('contrast follows WCAG, including translucent foregrounds', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);

  // Grey-on-white that designers reach for and that fails normal-size text.
  const grey = contrastRatio('#999999', '#ffffff');
  assert.ok(grey > 2.8 && grey < 3, `expected ~2.85, got ${grey}`);

  // A 50%-alpha black over white composites to grey, not to black.
  const translucent = contrastRatio('rgba(0, 0, 0, 0.5)', '#ffffff');
  assert.ok(translucent < 21 && translucent > 3, `expected a composited ratio, got ${translucent}`);
});

test('the large-text threshold matches the spec, not a round number', () => {
  assert.equal(isLargeText(24, 400), true);
  assert.equal(isLargeText(19, 700), true);
  assert.equal(isLargeText(19, 400), false);
  assert.equal(isLargeText(16, 700), false);
});

const VIEWPORT_MOBILE = { name: 'mobile', width: 360, height: 740 };

test('summarize turns raw layout facts into findings, and silence into silence', () => {
  const clean = summarizeRuntime([{
    viewport: VIEWPORT_MOBILE,
    raw: {
      scroll_width: 360,
      viewport_width: 360,
      clipped: [],
      offscreen: [],
      small_targets: [],
      text_samples: [{ el: 'p.body', color: '#101418', background: '#ffffff', font_size: 16, font_weight: '400', text: 'Pedido 4471' }]
    }
  }]);
  assert.deepEqual(clean.issues, []);
  assert.deepEqual(clean.warnings, []);
  assert.equal(clean.metrics.viewports[0].contrast_failures, 0);

  const broken = summarizeRuntime([{
    viewport: VIEWPORT_MOBILE,
    raw: {
      scroll_width: 412,
      viewport_width: 360,
      clipped: ['h1.title', 'h1.title'],
      offscreen: ['aside.rail'],
      small_targets: ['button.icon 28x28'],
      text_samples: [
        { el: 'p.muted', color: '#999999', background: '#ffffff', font_size: 14, font_weight: '400', text: 'Detalhes' },
        { el: 'h1.title', color: '#8a8a8a', background: '#ffffff', font_size: 32, font_weight: '700', text: 'Pedidos' }
      ]
    }
  }]);

  const joined = broken.issues.join('\n');
  assert.match(joined, /52px wider than the viewport/);
  assert.match(joined, /text clipped in `h1\.title`/);
  assert.match(joined, /contrast 2\.85:1 below 4\.5:1 in `p\.muted`/);
  // 3.45:1 fails normal text but clears the display-size floor — the threshold
  // is per-sample, not global.
  assert.doesNotMatch(joined, /`h1\.title` \("Pedidos"\)/);
  assert.equal(broken.metrics.viewports[0].contrast_failures, 1);

  // Duplicate clipped entries must collapse; a repeated selector is one defect.
  assert.equal(broken.metrics.viewports[0].clipped_elements, 1);
  assert.match(broken.warnings.join('\n'), /tap target\(s\) under 44px/);
  assert.match(broken.warnings.join('\n'), /extends outside the viewport/);
});

test('runtime assurance binds craft to loaded fonts, media and visible state evidence', () => {
  const summary = summarizeRuntime([{
    viewport: VIEWPORT_MOBILE,
    route: { name: 'error', route: '#/orders?state=error', state: 'error' },
    raw: {
      scroll_width: 360,
      viewport_width: 360,
      viewport_height: 740,
      clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: [],
      assurance: {
        probe_version: 2,
        max_font_size_px: 64,
        fonts: { custom_used: ['atlas display'], undelivered_families: ['atlas display'] },
        media: { loaded: 0, broken: [{ el: 'img.workflow' }] },
        material: { techniques: ['gradients', 'blur'] },
        motion: { active: 1, ambient: 1 },
        states: { present: ['error'], visible: [] }
      }
    }
  }]);

  assert.equal(summary.metrics.assurance.craft_verified, true);
  assert.deepEqual(summary.metrics.assurance.routes_verified, ['error']);
  assert.equal(summary.metrics.assurance.craft_axes.display_scale, true);
  assert.equal(summary.metrics.assurance.craft_axes.material, true);
  assert.equal(summary.metrics.assurance.craft_axes.motion, true);
  assert.match(summary.issues.join('\n'), /runtime font delivery failed for "atlas display"/);
  assert.match(summary.issues.join('\n'), /runtime media failed to load in `img\.workflow`/);
  assert.match(summary.issues.join('\n'), /declared runtime state "error" has no visible structural state marker/);
});

test('the fold check: a visible primary below the viewport is an issue, an invisible one a routing hint', () => {
  const base = {
    scroll_width: 360, viewport_width: 360, viewport_height: 740,
    clipped: [], offscreen: [], small_targets: [], text_samples: []
  };

  // The exact shipped-invisible defect class: the #1 differentiator starts
  // below the first viewport and every static gate stays green.
  const below = summarizeRuntime([{
    viewport: VIEWPORT_MOBILE,
    raw: { ...base, primary: [{ el: 'section.energy', hidden: false, top: 812, height: 200 }] }
  }]);
  assert.equal(below.issues.length, 1);
  assert.match(below.issues[0], /primary feature `section\.energy` starts 72px below the fold/);
  assert.equal(below.metrics.viewports[0].primary_below_fold, 1);

  // Above the fold: silence.
  const above = summarizeRuntime([{
    viewport: VIEWPORT_MOBILE,
    raw: { ...base, primary: [{ el: 'section.energy', hidden: false, top: 320, height: 200 }] }
  }]);
  assert.deepEqual(above.issues, []);
  assert.equal(above.metrics.viewports[0].primary_visible, 1);

  // Marker present but hidden on the loaded route (hash router on another
  // screen): a hint to re-run with --route, never a fabricated fold verdict.
  const hidden = summarizeRuntime([{
    viewport: VIEWPORT_MOBILE,
    raw: { ...base, primary: [{ el: 'section.energy', hidden: true, top: 0, height: 0 }] }
  }]);
  assert.deepEqual(hidden.issues, []);
  assert.match(hidden.warnings.join('\n'), /no \[data-aioson-primary\] element is visible on the loaded route/);

  // No marker at all: the static half already warns; runtime stays silent.
  const none = summarizeRuntime([{ viewport: VIEWPORT_MOBILE, raw: { ...base } }]);
  assert.deepEqual(none.issues, []);
  assert.deepEqual(none.warnings, []);
});

test('--route appends the hash so an inner screen can be measured', async () => {
  const urls = [];
  const launcher = async () => ({
    newContext: async () => ({
      newPage: async () => ({
        goto: async (url) => { urls.push(url); },
        waitForTimeout: async () => {},
        evaluate: async () => ({ scroll_width: 360, viewport_width: 360, viewport_height: 740, clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: [] })
      }),
      close: async () => {}
    }),
    close: async () => {}
  });

  await collectRuntimeMeasurements({ fileUrl: 'file:///proto.html', route: '#/bancada/1', launcher });
  assert.equal(urls[0], 'file:///proto.html#/bancada/1');

  await collectRuntimeMeasurements({ fileUrl: 'file:///proto.html', route: '/palco/2', launcher });
  assert.equal(urls[urls.length - 1], 'file:///proto.html#/palco/2', 'a bare route gains its # prefix');
});

test('a runtime matrix visits every declared route/state at every viewport', async () => {
  const urls = [];
  const launcher = async () => ({
    newContext: async ({ viewport }) => ({
      newPage: async () => ({
        goto: async (url) => { urls.push(`${viewport.width}:${url}`); },
        waitForTimeout: async () => {},
        evaluate: async () => ({
          scroll_width: viewport.width, viewport_width: viewport.width, viewport_height: viewport.height,
          clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: [],
          assurance: {
            probe_version: 2, max_font_size_px: 16,
            fonts: { custom_used: [], undelivered_families: [] },
            media: { loaded: 0, broken: [] }, material: { techniques: [] }, motion: { active: 0 },
            states: { present: ['loading'], visible: ['loading'] }
          }
        })
      }),
      close: async () => {}
    }),
    close: async () => {}
  });

  const collected = await collectRuntimeMeasurements({
    fileUrl: 'file:///proto.html',
    viewports: [{ name: 'phone', width: 390, height: 844 }],
    routes: [
      { name: 'home', route: '#/home' },
      { name: 'loading', route: '#/orders?state=loading', state: 'loading' }
    ],
    launcher
  });
  assert.deepEqual(urls, ['390:file:///proto.html#/home', '390:file:///proto.html#/orders?state=loading']);
  assert.equal(collected.runs.length, 2);
  assert.equal(collected.runs[1].route.state, 'loading');
  const summary = summarizeRuntime(collected.runs);
  assert.equal(summary.metrics.assurance.craft_verified, true);
  assert.deepEqual(summary.metrics.assurance.routes_verified, ['home', 'loading']);
  assert.deepEqual(summary.metrics.assurance.states_verified, ['loading']);
});

test('the prototype manifest declares route/state rows without executable prose', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-matrix-'));
  const owned = path.join(dir, '.aioson', 'briefings', 'orders');
  await fs.mkdir(owned, { recursive: true });
  await fs.writeFile(path.join(owned, 'prototype-manifest.md'), `---
feature: orders
status: draft
---
## Runtime matrix
- entry: #/home
- loading: #/orders?state=loading
- validation: #/orders?state=invalid | state=error
`, 'utf8');
  assert.deepEqual(declaredRuntimeMatrix({ targetDir: dir, slug: 'orders' }), [
    { name: 'entry', route: '#/home', state: null },
    { name: 'loading', route: '#/orders?state=loading', state: 'loading' },
    { name: 'validation', route: '#/orders?state=invalid', state: 'error' }
  ]);
});

test('URL-only runtime becomes verified when the rendered craft probe completes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-assured-'));
  const raw = (width) => ({
    scroll_width: width, viewport_width: width, viewport_height: 740,
    clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: [],
    assurance: {
      probe_version: 2, max_font_size_px: 64,
      fonts: { custom_used: ['atlas'], undelivered_families: [] },
      media: { loaded: 1, broken: [] },
      material: { techniques: ['gradients', 'shadows'] },
      motion: { active: 1 }, states: { present: [], visible: [] }
    }
  });
  const stub = stubBrowser({ 1280: raw(1280), 360: raw(360) });
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', url: 'http://localhost:4173', runtime: true, browserLauncher: stub.launcher, json: true, suppressExitCode: true, 'no-persist': true },
    logger: makeLogger()
  });
  assert.equal(report.verdict, 'pass');
  assert.equal(report.ok, true);
  assert.equal(report.metrics.runtime.assurance.craft_verified, true);
});

test('a missing browser is reported, never treated as a pass', async () => {
  const collected = await collectRuntimeMeasurements({
    fileUrl: 'file:///nowhere.html',
    launcher: async () => { throw new Error('no browser here'); }
  });
  assert.equal(collected.available, false);
  assert.match(collected.reason, /could not run: no browser here/);
  assert.deepEqual(collected.runs, []);
});

// A browser stub: enough surface to drive the real code path without Chromium.
function stubBrowser(rawByWidth) {
  const closed = { contexts: 0, browser: false };
  return {
    closed,
    launcher: async () => ({
      newContext: async ({ viewport }) => ({
        newPage: async () => ({
          goto: async () => {},
          evaluate: async (fn, probeVersion) => {
            // The real browser receives the probe's SOURCE and nothing else from
            // the module; the version it stamps must travel as the argument.
            assert.equal(typeof fn, 'function');
            assert.equal(probeVersion, RUNTIME_PROBE_VERSION, 'page.evaluate must pass RUNTIME_PROBE_VERSION to the probe');
            return rawByWidth[viewport.width];
          }
        }),
        close: async () => { closed.contexts += 1; }
      }),
      close: async () => { closed.browser = true; }
    })
  };
}

test('the runtime pass visits every viewport and always tears the browser down', async () => {
  const raw = (width) => ({
    scroll_width: width === 360 ? 420 : width,
    viewport_width: width,
    clipped: [],
    offscreen: [],
    small_targets: [],
    text_samples: []
  });
  const stub = stubBrowser({ 1280: raw(1280), 360: raw(360) });

  const collected = await collectRuntimeMeasurements({ fileUrl: 'file:///x.html', launcher: stub.launcher });
  assert.equal(collected.available, true);
  assert.equal(collected.runs.length, DEFAULT_VIEWPORTS.length);
  assert.equal(stub.closed.contexts, DEFAULT_VIEWPORTS.length, 'every context must be closed');
  assert.equal(stub.closed.browser, true, 'the browser must be closed even on the happy path');

  const summary = summarizeRuntime(collected.runs);
  assert.equal(summary.issues.length, 1);
  assert.match(summary.issues[0], /^mobile \(360px\): the page is 60px wider/);
});

test('kind=visual --runtime merges layout findings into the same report', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-'));
  await fs.writeFile(path.join(dir, 'page.html'), `<!doctype html><html><head><style>
  :root { --space-2: 8px; --fg: #101418; --border: rgba(0,0,0,.08); }
  .shell { padding: var(--space-2); color: var(--fg); font-family: system-ui; }
  .row { gap: var(--space-2); padding: var(--space-2); border-bottom: 1px solid var(--border); }
  .btn { padding: var(--space-2); background: var(--fg); color: #fff; }
  .btn:disabled { opacity: .5; } .btn:focus-visible { outline: 2px solid var(--fg); }
  .is-loading { opacity: .6; } .empty-state { padding: var(--space-2); } .error-state { color: #b00020; }
  </style></head><body><main class="shell"><div class="row"><button class="btn">Aprovar</button></div></main></body></html>`, 'utf8');

  const stub = stubBrowser({
    1280: { scroll_width: 1280, viewport_width: 1280, clipped: [], offscreen: [], small_targets: [], text_samples: [] },
    360: {
      scroll_width: 500,
      viewport_width: 360,
      clipped: [],
      offscreen: [],
      small_targets: [],
      text_samples: [{ el: 'button.btn', color: '#aaaaaa', background: '#ffffff', font_size: 14, font_weight: '400', text: 'Aprovar' }]
    }
  });

  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', file: 'page.html', runtime: true, browserLauncher: stub.launcher, json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });

  // The static half stays clean; everything reported here came from layout.
  assert.deepEqual(report.issues.filter((i) => !/^(desktop|mobile)/.test(i)), [], 'the static half must stay clean');
  assert.equal(report.metrics.runtime.available, true);
  assert.equal(report.metrics.runtime.entry, 'page.html');
  assert.equal(report.metrics.runtime.viewports.length, 2);
  assert.match(report.issues.join('\n'), /140px wider than the viewport/);
  assert.match(report.issues.join('\n'), /contrast .* below 4\.5:1/);
});

test('without --runtime the static pass is untouched and no browser is launched', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-'));
  await fs.writeFile(path.join(dir, 'page.html'), '<style>.a{padding:8px;margin:8px;color:#111;gap:8px;border-radius:8px;font-size:14px;background:#fff;border:1px solid #eee;box-shadow:none;fill:#111}</style><div class="a">x</div>', 'utf8');

  let launched = false;
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', file: 'page.html', json: true, suppressExitCode: true, browserLauncher: async () => { launched = true; } },
    logger: makeLogger()
  });

  assert.equal(launched, false, 'runtime telemetry must be opt-in');
  assert.equal(report.metrics.runtime, undefined);
});

// ---------------------------------------------------------------------------
// The page realm. `page.evaluate` serializes the probe into the browser, where
// no binding of this module exists. Every test above that hands the browser
// canned data is blind to that by construction; these replay the probe the way
// Playwright runs it.
// ---------------------------------------------------------------------------

function craftPage(viewport) {
  return createPage({
    width: viewport.width,
    height: viewport.height,
    fonts: [{ family: 'Fraunces', status: 'loaded' }],
    animations: [{ state: 'running', iterations: Infinity }],
    elements: [
      element({ tag: 'h1', className: 'display', text: 'Bancada', style: { fontFamily: '"Fraunces", serif', fontSize: '64px', fontWeight: '600', backgroundImage: 'linear-gradient(180deg, #fff, #eee)' }, rect: { top: 24, width: 320, height: 80 } }),
      element({ tag: 'section', id: 'bench', matches: ['[data-aioson-primary]'], style: { boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)' }, rect: { top: 120, width: 320, height: 300 } }),
      element({ tag: 'p', className: 'lead', text: 'Pedido 4471 em separação', style: { overflowX: 'hidden' }, rect: { top: 440, width: 200, height: 24 }, scrollWidth: 260 }),
      element({ tag: 'aside', className: 'rail', rect: { left: viewport.width - 20, top: 0, width: 100, height: 400 } }),
      element({ tag: 'button', className: 'icon', text: '+', rect: { top: 480, width: 30, height: 30 } }),
      element({ tag: 'img', className: 'proof', matches: ['img'], props: { alt: 'Tela do app', src: 'proof.png', complete: true, naturalWidth: 800 } }),
      element({ tag: 'img', className: 'chart', matches: ['img'], props: { alt: 'Gráfico de vendas', src: 'missing.png', complete: true, naturalWidth: 0 } }),
      element({ tag: 'div', className: 'skeleton', matches: ['.skeleton'], style: { display: 'none' } }),
      element({ tag: 'div', className: 'toast', matches: ['[role="alert"]'], text: 'Falha ao salvar', rect: { top: 600, width: 300, height: 48 } })
    ]
  });
}

test('the page realm has teeth: a function reading its module scope fails there as it does in a browser', () => {
  const LEAKED = RUNTIME_PROBE_VERSION; // a binding that exists here and nowhere in the page
  const leaky = function probe() { return LEAKED; };
  assert.throws(() => evaluateInPage(createPage(), leaky), /ReferenceError: LEAKED is not defined/);
  const honest = function probe(version) { return version; };
  assert.equal(evaluateInPage(createPage(), honest, 7), 7);
});

test('the probe survives serialization: replayed in the page realm it measures everything it promises', () => {
  const raw = evaluateInPage(craftPage(VIEWPORT_MOBILE), pageProbe, RUNTIME_PROBE_VERSION);

  assert.equal(raw.assurance.probe_version, RUNTIME_PROBE_VERSION);
  assert.equal(raw.assurance.elements_measured, 9);
  assert.equal(raw.assurance.max_font_size_px, 64);
  assert.deepEqual(raw.assurance.fonts.custom_used, ['fraunces']);
  assert.deepEqual(raw.assurance.fonts.undelivered_families, []);
  assert.deepEqual(raw.assurance.material.techniques, ['gradients', 'shadows']);
  assert.equal(raw.assurance.media.candidates, 2);
  assert.equal(raw.assurance.media.loaded, 1);
  assert.equal(raw.assurance.media.broken[0].el, 'img.chart');
  assert.deepEqual(raw.assurance.motion, { active: 1, ambient: 1 });
  assert.deepEqual(raw.assurance.states, { present: ['loading', 'error'], visible: ['error'] });
  assert.deepEqual(raw.clipped, ['p.lead']);
  assert.deepEqual(raw.offscreen, ['aside.rail']);
  assert.deepEqual(raw.small_targets, ['button.icon 30x30']);
  assert.deepEqual(raw.primary, [{ el: 'section#bench', hidden: false, top: 120, height: 300 }]);
  assert.equal(raw.text_samples.length, 4);

  const summary = summarizeRuntime([{ viewport: VIEWPORT_MOBILE, raw }]);
  assert.equal(summary.metrics.assurance.craft_verified, true);
  assert.deepEqual(summary.metrics.assurance.craft_axes, { typeface: true, display_scale: true, material: true, motion: true, evidence: true });
  assert.match(summary.issues.join('\n'), /text clipped in `p\.lead`/);
  assert.match(summary.issues.join('\n'), /runtime media failed to load in `img\.chart`/);
  assert.match(summary.warnings.join('\n'), /1 tap target\(s\) under 44px \(button\.icon 30x30\)/);
});

test('the browser glue hands the probe its version: a full run through the page realm is verified', async () => {
  const browser = realmLauncher(craftPage);
  const collected = await collectRuntimeMeasurements({ fileUrl: 'file:///proto.html', launcher: browser.launcher });

  assert.equal(collected.available, true, collected.reason);
  assert.equal(browser.calls.length, DEFAULT_VIEWPORTS.length);
  for (const call of browser.calls) {
    assert.equal(call.fn, pageProbe);
    assert.equal(call.arg, RUNTIME_PROBE_VERSION);
  }
  const summary = summarizeRuntime(collected.runs);
  assert.equal(summary.metrics.assurance.probe_runs, DEFAULT_VIEWPORTS.length);
  assert.equal(summary.metrics.assurance.craft_verified, true);
  assert.equal(browser.closed.browser, true);
});

test('the probe body names nothing from module scope', () => {
  const source = require('node:fs').readFileSync(path.join(__dirname, '..', 'src', 'lib', 'visual-runtime.js'), 'utf8');
  const topLevel = [...source.matchAll(/^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm)]
    .map((m) => m[1])
    .filter((name) => name !== 'pageProbe');
  assert.ok(topLevel.includes('RUNTIME_PROBE_VERSION'), 'the lint must see the names it guards against');

  const moduleScopeLeaks = (fn) => {
    const body = fn.toString()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    return topLevel.filter((name) => new RegExp('(?<![\\w$.])' + name + '(?![\\w$])').test(body));
  };

  // The lint itself must catch the shape that shipped broken.
  const regression = function probe() { return { probe_version: RUNTIME_PROBE_VERSION }; };
  assert.deepEqual(moduleScopeLeaks(regression), ['RUNTIME_PROBE_VERSION']);

  const leaked = moduleScopeLeaks(pageProbe);
  assert.deepEqual(leaked, [], 'pageProbe runs inside the page and cannot see: ' + leaked.join(', ') + ' — pass them through page.evaluate arguments');
});

test('a probe answering below the version contract is reported, never silently ignored', () => {
  const base = { scroll_width: 360, viewport_width: 360, viewport_height: 740, clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: [] };
  const stale = summarizeRuntime([{ viewport: VIEWPORT_MOBILE, raw: { ...base, assurance: { probe_version: 0 } } }]);
  assert.equal(stale.metrics.assurance.craft_verified, false);
  assert.equal(stale.metrics.assurance.probe_runs, 0);
  assert.match(stale.warnings.join('\n'), new RegExp(`runtime probe returned assurance version 0, below the v${RUNTIME_PROBE_VERSION} contract`));

  const unversioned = summarizeRuntime([{ viewport: VIEWPORT_MOBILE, raw: { ...base, assurance: {} } }]);
  assert.match(unversioned.warnings.join('\n'), new RegExp(`assurance version none, below the v${RUNTIME_PROBE_VERSION} contract`));
});

const CARRY_PAGE = (label) => `<!doctype html><html><head><style>
  :root { --space-2: 8px; --fg: #101418; --border: rgba(0,0,0,.08); }
  .shell { padding: var(--space-2); color: var(--fg); font-family: system-ui; }
  .row { gap: var(--space-2); padding: var(--space-2); border-bottom: 1px solid var(--border); }
  .btn { padding: var(--space-2); background: var(--fg); color: #fff; }
  .btn:disabled { opacity: .5; } .btn:focus-visible { outline: 2px solid var(--fg); }
  .is-loading { opacity: .6; } .empty-state { padding: var(--space-2); } .error-state { color: #b00020; }
  </style></head><body><main class="shell"><div class="row"><button class="btn">${label}</button></div></main></body></html>`;

test('runtime captures are viewport-sized by default, full-page on request, and recorded with their weight', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-shots-'));
  const shots = [];
  const launcher = async () => ({
    newContext: async ({ viewport }) => ({
      newPage: async () => ({
        goto: async () => {},
        waitForTimeout: async () => {},
        evaluate: async () => ({
          scroll_width: viewport.width, viewport_width: viewport.width, viewport_height: viewport.height,
          clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: []
        }),
        screenshot: async ({ path: file, fullPage }) => {
          if (!file) return undefined; // the fold-density probe asks for a buffer; best effort
          shots.push({ file, fullPage });
          await fs.writeFile(file, 'png-bytes');
        }
      }),
      close: async () => {}
    }),
    close: async () => {}
  });
  const shotDir = path.join(dir, 'shots');
  const routes = [{ name: 'home', route: '#/' }];

  const collected = await collectRuntimeMeasurements({ fileUrl: 'file:///proto.html', routes, launcher, screenshotDir: shotDir, projectDir: dir });
  assert.deepEqual(shots.map((s) => s.fullPage), [false, false], 'the first fold at each width is the default capture');
  const summary = summarizeRuntime(collected.runs, { projectDir: dir });
  assert.deepEqual(summary.metrics.screenshots, ['shots/home-desktop.png', 'shots/home-mobile.png'], 'paths are project-relative');
  assert.deepEqual(summary.metrics.screenshot_capture, { dir: 'shots', mode: 'viewport', count: 2, bytes: 18 });

  shots.length = 0;
  const fullRuns = await collectRuntimeMeasurements({ fileUrl: 'file:///proto.html', routes, launcher, screenshotDir: shotDir, screenshotMode: 'full', projectDir: dir });
  assert.deepEqual(shots.map((s) => s.fullPage), [true, true], 'full pages only on request');
  assert.equal(summarizeRuntime(fullRuns.runs, { projectDir: dir }).metrics.screenshot_capture.mode, 'full');

  const none = summarizeRuntime((await collectRuntimeMeasurements({ fileUrl: 'file:///proto.html', routes, launcher })).runs);
  assert.deepEqual(none.metrics.screenshots, []);
  assert.equal(none.metrics.screenshot_capture.count, 0);
});

test('kind=visual --screenshots owns and replaces its default folder, and the evidence records the captures', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-owned-'));
  const owned = path.join(dir, '.aioson', 'briefings', 'orders');
  await fs.mkdir(owned, { recursive: true });
  await fs.writeFile(path.join(owned, 'prototype.html'), CARRY_PAGE('Aprovar'), 'utf8');
  const shotDir = path.join(dir, '.aioson', 'context', 'features', 'orders', 'visual-screenshots');
  await fs.mkdir(shotDir, { recursive: true });
  await fs.writeFile(path.join(shotDir, 'renamed-route-desktop.png'), 'stale capture of a route that no longer exists');

  const raw = (width) => ({ scroll_width: width, viewport_width: width, viewport_height: 800, clipped: [], offscreen: [], small_targets: [], text_samples: [], primary: [] });
  const launcher = async () => ({
    newContext: async ({ viewport }) => ({
      newPage: async () => ({
        goto: async () => {},
        waitForTimeout: async () => {},
        evaluate: async () => raw(viewport.width),
        screenshot: async ({ path: file }) => { if (file) await fs.writeFile(file, 'png'); }
      }),
      close: async () => {}
    }),
    close: async () => {}
  });
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', runtime: true, screenshots: true, browserLauncher: launcher, json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.metrics.runtime.available, true);
  assert.deepEqual(report.metrics.screenshots_cleared, { files: 1, bytes: 46 }, 'the stale capture is counted and gone');
  const files = (await fs.readdir(shotDir)).sort();
  assert.ok(!files.includes('renamed-route-desktop.png'));
  assert.ok(files.length >= 2, `captures written: ${files.join(', ')}`);
  const capture = report.metrics.runtime.screenshot_capture;
  assert.equal(capture.mode, 'viewport');
  assert.equal(capture.count, files.length);
  assert.equal(capture.dir, '.aioson/context/features/orders/visual-screenshots');
  const evidence = JSON.parse(await fs.readFile(path.join(dir, '.aioson', 'context', 'features', 'orders', 'visual-evidence.json'), 'utf8'));
  assert.equal(evidence.metrics.runtime.screenshot_capture.count, files.length, 'the persisted evidence names what the folder holds');
  assert.ok(evidence.metrics.runtime.screenshots.every((shot) => shot.startsWith('.aioson/context/features/orders/visual-screenshots/')));

  // A diagnostic run writes nothing, so it removes nothing: the captures of
  // the last persisted run survive a `--no-persist --screenshots` re-check.
  const diagnostic = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', runtime: true, screenshots: true, browserLauncher: launcher, json: true, advisory: true, suppressExitCode: true, 'no-persist': true },
    logger: makeLogger()
  });
  assert.equal(diagnostic.metrics.screenshots_cleared, undefined, 'a --no-persist run clears nothing');
  assert.deepEqual((await fs.readdir(shotDir)).sort(), files, 'the persisted captures are still there');

  // A caller-named folder is never cleared.
  const custom = path.join(dir, 'my-shots');
  await fs.mkdir(custom, { recursive: true });
  await fs.writeFile(path.join(custom, 'keep.png'), 'mine');
  await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', runtime: true, 'screenshot-dir': 'my-shots', browserLauncher: launcher, json: true, advisory: true, suppressExitCode: true, 'no-persist': true },
    logger: makeLogger()
  });
  assert.ok((await fs.readdir(custom)).includes('keep.png'));
});

test('a static re-measure of unchanged inputs carries the runtime evidence forward; changed inputs drop it with a warning', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-carry-'));
  const owned = path.join(dir, '.aioson', 'briefings', 'orders');
  await fs.mkdir(owned, { recursive: true });
  await fs.writeFile(path.join(owned, 'prototype.html'), CARRY_PAGE('Aprovar'), 'utf8');
  const stub = stubBrowser({
    1280: { scroll_width: 1280, viewport_width: 1280, clipped: [], offscreen: [], small_targets: [], text_samples: [] },
    360: { scroll_width: 500, viewport_width: 360, clipped: [], offscreen: [], small_targets: [], text_samples: [] }
  });
  const evidenceFile = path.join(dir, '.aioson', 'context', 'features', 'orders', 'visual-evidence.json');
  const staticOptions = { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true };

  const runtimeRun = await runVerifyArtifact({
    args: [dir],
    options: { ...staticOptions, runtime: true, browserLauncher: stub.launcher },
    logger: makeLogger()
  });
  assert.equal(runtimeRun.metrics.runtime.available, true);
  assert.match(runtimeRun.issues.join('\n'), /wider than the viewport/);
  const first = JSON.parse(await fs.readFile(evidenceFile, 'utf8'));
  assert.equal(first.metrics.runtime.available, true);
  assert.ok(first.metrics.runtime.findings.issues.some((issue) => /wider than the viewport/.test(issue)), 'the runtime findings travel inside the section');

  // The session-end auto-fire shape: static, slug mode, persisted.
  const staticRun = await runVerifyArtifact({ args: [dir], options: staticOptions, logger: makeLogger() });
  assert.equal(staticRun.metrics.runtime.available, true, 'the runtime section is carried, not erased');
  assert.equal(staticRun.metrics.runtime.carried_from, first.measured_at);
  assert.match(staticRun.issues.join('\n'), /wider than the viewport/, 'the runtime findings ride along on the same bytes');
  assert.equal(staticRun.metrics.assurance.runtime_craft_verified, Boolean(first.metrics.runtime.assurance.craft_verified));
  // The verdict is re-derived from the carried evidence, not left over from
  // the runtime-less static pass that ran a moment before the carry.
  assert.equal(staticRun.metrics.assurance.verdict, first.metrics.assurance.verdict, 'the carried assurance reaches the same verdict the runtime run did');
  assert.equal(staticRun.verdict, staticRun.issues.length > 0 ? 'fail' : staticRun.metrics.assurance.verdict);
  if (staticRun.metrics.assurance.runtime_craft_verified) {
    assert.deepEqual((staticRun.unverified_reasons || []).filter((r) => /runtime supplied no verified/.test(r)), [], 'a carried runtime cannot be reported as absent');
  }
  const second = JSON.parse(await fs.readFile(evidenceFile, 'utf8'));
  assert.equal(second.metrics.runtime.available, true, 'the persisted slot keeps the runtime section');
  assert.equal(second.metrics.runtime.carried_from, first.measured_at);

  // A third static run keeps the original date, never the carried copy's.
  const third = await runVerifyArtifact({ args: [dir], options: staticOptions, logger: makeLogger() });
  assert.equal(third.metrics.runtime.carried_from, first.measured_at);

  // The prototype changes: the old runtime measurement is not evidence of the new bytes.
  await fs.writeFile(path.join(owned, 'prototype.html'), CARRY_PAGE('Confirmar'), 'utf8');
  const changed = await runVerifyArtifact({ args: [dir], options: staticOptions, logger: makeLogger() });
  assert.equal(changed.metrics.runtime, undefined, 'nothing is carried across changed inputs');
  assert.match(changed.warnings.join('\n'), /runtime evidence dropped: the prototype inputs changed since the last --runtime run/);
  assert.doesNotMatch(changed.issues.join('\n'), /wider than the viewport/);
  const fourth = JSON.parse(await fs.readFile(evidenceFile, 'utf8'));
  assert.equal(fourth.metrics.runtime, undefined);
});

test('a --runtime run whose browser never opens carries the last measurement forward instead of erasing it', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-vrt-nobrowser-'));
  const owned = path.join(dir, '.aioson', 'briefings', 'orders');
  await fs.mkdir(owned, { recursive: true });
  await fs.writeFile(path.join(owned, 'prototype.html'), CARRY_PAGE('Aprovar'), 'utf8');
  const stub = stubBrowser({
    1280: { scroll_width: 1280, viewport_width: 1280, clipped: [], offscreen: [], small_targets: [], text_samples: [] },
    360: { scroll_width: 500, viewport_width: 360, clipped: [], offscreen: [], small_targets: [], text_samples: [] }
  });
  const evidenceFile = path.join(dir, '.aioson', 'context', 'features', 'orders', 'visual-evidence.json');
  const base = { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true };
  // A machine with no Chromium: the launcher throws exactly like the real one.
  const broken = async () => { throw new Error('Executable doesn\'t exist at /ms-playwright/chromium/headless_shell'); };

  await runVerifyArtifact({ args: [dir], options: { ...base, runtime: true, browserLauncher: stub.launcher }, logger: makeLogger() });
  const first = JSON.parse(await fs.readFile(evidenceFile, 'utf8'));
  assert.equal(first.metrics.runtime.available, true);

  // Same bytes, same fingerprint — this run simply could not open a browser.
  const failed = await runVerifyArtifact({ args: [dir], options: { ...base, runtime: true, browserLauncher: broken }, logger: makeLogger() });
  assert.equal(failed.metrics.runtime.available, true, 'a browser that never opened must not erase the measurement it could not repeat');
  assert.equal(failed.metrics.runtime.carried_from, first.measured_at);
  assert.match(failed.warnings.join('\n'), /runtime telemetry could not run/, 'this run still says it measured nothing itself');
  assert.match(failed.issues.join('\n'), /wider than the viewport/, 'the carried findings travel with the carried section');
  assert.equal(failed.metrics.assurance.verdict, first.metrics.assurance.verdict, 'the carried assurance reaches the same verdict');
  const persisted = JSON.parse(await fs.readFile(evidenceFile, 'utf8'));
  assert.equal(persisted.metrics.runtime.available, true, 'the persisted slot keeps the carried section');
  assert.equal(persisted.metrics.runtime.carried_from, first.measured_at);

  // Changed bytes: nothing is carried, and the drop names the browser failure
  // rather than telling the caller to rerun with a flag they already passed.
  await fs.writeFile(path.join(owned, 'prototype.html'), CARRY_PAGE('Confirmar'), 'utf8');
  const changed = await runVerifyArtifact({ args: [dir], options: { ...base, runtime: true, browserLauncher: broken }, logger: makeLogger() });
  assert.equal(changed.metrics.runtime.available, false, 'changed inputs never inherit an old measurement');
  assert.match(changed.warnings.join('\n'), /runtime evidence dropped/);
  assert.doesNotMatch(changed.warnings.join('\n'), /this run measured statically/, 'the drop must not claim a static run when --runtime was asked for');
});
