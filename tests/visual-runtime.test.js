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
  DEFAULT_VIEWPORTS
} = require('../src/lib/visual-runtime');
const { runVerifyArtifact, declaredRuntimeMatrix } = require('../src/commands/verify-artifact');

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
          evaluate: async () => rawByWidth[viewport.width]
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
