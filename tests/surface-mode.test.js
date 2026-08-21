'use strict';

/**
 * vq-026 measured: what the visitor came to do flips the premium bar. An
 * operate surface (dashboard, admin, editor) earns familiarity — the
 * telemetry used to push against the node, telling an admin table its
 * workhorse face was a saturated default and its hero type too small. And the
 * 10–149 declaration band: a utility-class app is an UNMEASURED surface, said
 * out loud — while fragments and fixtures stay silent as before.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeVisualSources } = require('../src/lib/visual-telemetry');
const { runVerifyArtifact } = require('../src/commands/verify-artifact');

process.env.AIOSON_DESIGN_REGISTRY = path.join(__filename, 'no-registry', 'design-fingerprints.json');

function rows(n) {
  return Array.from({ length: n }, (_, i) => `.row-${i} { padding: var(--s2) var(--s4); gap: var(--s2); margin-bottom: var(--s3); border-bottom: 1px solid var(--line); color: var(--fg); background: var(--bg); transition: background .15s ease; }`).join('\n');
}

// A dense admin shell: sidebar + main, a data table, a toolbar, six inputs,
// one delivered workhorse face (Inter), themed chrome, tokened finish.
function adminHtml({ themedChrome = true } = {}) {
  return `<!doctype html><html><head><title>Orders admin</title><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
:root { --bg: #0f1115; --fg: #e6e8ee; --line: rgba(230,232,238,.12); --accent: #3b82f6; --s2: 8px; --s3: 12px; --s4: 16px; --r1: 8px;
  --shadow-1: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35); --wash: linear-gradient(180deg, rgba(59,130,246,.10), transparent 60%); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
html, body { background: var(--bg); color: var(--fg); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; }
h1 { font-family: 'Inter', system-ui, sans-serif; font-size: 1.25rem; }
.sidebar { padding: var(--s4); border-right: 1px solid var(--line); } .toolbar { gap: var(--s2); padding: var(--s2) var(--s4); background: var(--wash); }
.card { padding: var(--s4); border: 1px solid var(--line); border-radius: var(--r1); box-shadow: var(--shadow-1); background: color-mix(in oklch, var(--bg), white 4%); }
.btn { padding: var(--s2) var(--s4); background: var(--accent); color: #fff; border-radius: var(--r1); transition: transform .15s ease, box-shadow .15s ease; }
.btn:hover { box-shadow: var(--shadow-1); } .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; } .btn:disabled { opacity: .5; }
.is-loading { opacity: .6; } .empty-state { padding: var(--s4); } .error-state { color: #ffb4a8; }
${themedChrome ? '::selection { background: var(--accent); color: #fff; } td.num { font-variant-numeric: tabular-nums; } .row:focus-visible { outline: 2px solid var(--accent); }' : ''}
${rows(48)}
</style></head><body class="admin"><aside class="sidebar"><nav>Orders</nav></aside><main>
<div class="toolbar" role="toolbar"><button class="btn">New order</button><input name="q" type="search"><select name="status"><option>open</option></select></div>
<h1>Orders</h1>
<form><input name="a"><input name="b"><input name="c"><input name="d"><textarea name="e"></textarea></form>
<table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody><tr><td>1</td><td>Ana</td><td class="num">10</td><td>open</td></tr></tbody></table>
</main></body></html>`;
}

// A marketing surface: hero, display type, sections, pricing + testimonials,
// Inter in the display role (a tell there).
function landingHtml() {
  return `<!doctype html><html><head><title>Acme — landing</title><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
:root { --bg: #0f0d0a; --fg: #f3ede4; --line: rgba(243,237,228,.12); --accent: #8b5cf6; --s2: 8px; --s3: 12px; --s4: 16px; --s8: 32px; --r1: 8px; --shadow-1: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35); --wash: linear-gradient(180deg, rgba(139,92,246,.12), transparent 60%); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
html, body { background: var(--bg); color: var(--fg); font-family: 'Inter', system-ui, sans-serif; }
h1 { font-family: 'Inter', system-ui, sans-serif; font-size: clamp(2.5rem, 6vw, 4.5rem); }
.hero { padding: var(--s8); background: var(--wash); box-shadow: var(--shadow-1); } .btn { padding: var(--s2) var(--s4); background: var(--accent); color: #fff; border-radius: var(--r1); transition: transform .2s ease; }
.btn:focus-visible { outline: 2px solid var(--accent); } .btn:disabled { opacity: .5; } .is-loading { opacity: .6; } .empty-state { padding: var(--s4); } .error-state { color: #ffb4a8; }
${rows(48)}
</style></head><body><section class="hero"><h1>Acme</h1><img src="/shot.png" alt=""><button class="btn">Start</button></section><section class="features">f</section><section class="pricing">p</section><section class="testimonials">t</section></body></html>`;
}

test('an operate surface is detected from structure: workhorse face sanctioned, floor spent on precision and chrome', () => {
  const result = analyzeVisualSources({ html: adminHtml() });
  assert.equal(result.applicable, true);
  assert.ok(result.metrics.craft.measured, 'fixture must be craft-measured');
  assert.equal(result.metrics.surface_mode.mode, 'operate');
  assert.equal(result.metrics.surface_mode.source, 'detected');
  assert.ok(result.metrics.surface_mode.operate_signals.includes('data table'));
  assert.ok(result.metrics.surface_mode.operate_signals.includes('sidebar shell'));
  assert.equal(result.metrics.craft.mode, 'operate');
  assert.equal(result.metrics.craft.lever_count, 4);
  assert.deepEqual(Object.keys(result.metrics.craft.levers), ['typeface', 'material', 'motion', 'chrome']);
  assert.equal(result.metrics.craft.levers.chrome, true);
  assert.equal(result.metrics.tells.present.includes('saturated display face'), false, 'Inter on an admin surface is the reason, not the default');
  assert.deepEqual(result.metrics.tells.sanctioned_faces, ['inter']);
  assert.equal(result.warnings.some((w) => /saturated display face/.test(w)), false, result.warnings.join('\n'));
  assert.equal(result.warnings.some((w) => /craft floor/.test(w)), false, result.warnings.join('\n'));

  // Strip the themed chrome: the operate floor names chrome, never display type.
  const bare = analyzeVisualSources({ html: adminHtml({ themedChrome: false }) });
  assert.equal(bare.metrics.craft.levers.chrome, false);
  const floor = bare.warnings.find((w) => /craft floor/.test(w));
  if (floor) {
    assert.match(floor, /\(operate surface\)/);
    assert.match(floor, /themed browser chrome/);
    assert.doesNotMatch(floor, /display-scale type/);
  }
});

test('a dashboard with one hero panel and a few sections is operate, not a tie — mixed needs both bars genuinely in play', () => {
  const html = adminHtml().replace('<main>', '<main><section class="hero">Today</section><section>a</section><section>b</section><section>c</section>');
  const result = analyzeVisualSources({ html });
  assert.ok(result.metrics.surface_mode.operate_score >= 6, JSON.stringify(result.metrics.surface_mode));
  assert.ok(result.metrics.surface_mode.brand_score >= 3);
  assert.equal(result.metrics.surface_mode.mode, 'operate');
});

test('a brand surface keeps the expressive bar: five levers, and a workhorse face in the display role is the tell', () => {
  const result = analyzeVisualSources({ html: landingHtml() });
  assert.equal(result.metrics.surface_mode.mode, 'brand');
  assert.ok(result.metrics.surface_mode.brand_signals.includes('hero section'));
  assert.equal(result.metrics.craft.lever_count, 5);
  assert.ok(result.metrics.tells.present.includes('saturated display face'));
  assert.deepEqual(result.metrics.tells.sanctioned_faces, []);
});

test('a declared mode outranks detection — in the call and in the prototype manifest', async () => {
  const declared = analyzeVisualSources({ html: adminHtml(), surfaceMode: 'persuade' });
  assert.equal(declared.metrics.surface_mode.mode, 'brand');
  assert.equal(declared.metrics.surface_mode.source, 'declared');
  assert.equal(declared.metrics.surface_mode.detected, 'operate');
  assert.equal(declared.metrics.craft.lever_count, 5);

  const unknownDeclared = analyzeVisualSources({ html: adminHtml(), surfaceMode: 'something-else' });
  assert.equal(unknownDeclared.metrics.surface_mode.mode, 'operate', 'an unrecognized declaration falls back to detection');

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-surface-mode-'));
  const slug = 'orders';
  await fs.mkdir(path.join(dir, '.aioson', 'briefings', slug), { recursive: true });
  await fs.writeFile(path.join(dir, '.aioson', 'briefings', slug, 'prototype.html'), landingHtml(), 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'briefings', slug, 'prototype-manifest.md'), `---\nfeature: ${slug}\nstatus: approved\nsurface_mode: operate\n---\n\n## Visual direction\n- register: utility\n`, 'utf8');
  const report = await runVerifyArtifact({ args: [dir], options: { kind: 'visual', slug, advisory: true, json: true, suppressExitCode: true, 'no-persist': true }, logger: { log() {}, error() {} } });
  assert.equal(report.metrics.surface_mode.mode, 'operate');
  assert.equal(report.metrics.surface_mode.source, 'declared');
  assert.equal(report.metrics.craft.lever_count, 4);

  const flag = await runVerifyArtifact({ args: [dir], options: { kind: 'visual', slug, advisory: true, json: true, suppressExitCode: true, 'no-persist': true, 'surface-mode': 'brand' }, logger: { log() {}, error() {} } });
  assert.equal(flag.metrics.surface_mode.mode, 'brand', '--surface-mode on the command wins over the manifest');
});

test('a utility-class app in the 10–149 band is an unmeasured surface, said out loud; a fragment stays silent', () => {
  const utilityMarkup = Array.from({ length: 20 }, (_, i) => `<div class="flex items-center justify-between gap-4 p-6 rounded-xl bg-slate-900 shadow-lg text-sm font-medium hover:bg-slate-800 transition-colors"><span class="text-slate-200">Row ${i}</span><button class="px-3 py-1 rounded-md bg-blue-600 text-white">Go</button></div>`).join('\n');
  const css = ':root { --bg: #0f172a; --fg: #e2e8f0; } body { background: var(--bg); color: var(--fg); } .brand { font-weight: 700; } .btn { padding: 8px 16px; gap: 8px; margin: 8px; border-radius: 8px; border: 1px solid #333; font-size: 14px; line-height: 1.5; }';
  const app = analyzeVisualSources({ html: `<style>${css}</style>${utilityMarkup}` });
  assert.equal(app.applicable, true);
  assert.equal(app.metrics.craft.measured, false);
  assert.ok(app.metrics.utility_classes.utility >= 40, JSON.stringify(app.metrics.utility_classes));
  assert.ok(app.metrics.utility_classes.share >= 0.5);
  assert.match(app.metrics.craft.reason, /utility-class styling/);
  assert.ok(app.warnings.some((w) => /craft not measured statically: utility-class styling/.test(w) && /--url=<served app>/.test(w)), app.warnings.join('\n'));

  const fragment = analyzeVisualSources({ html: `<style>${css}</style><div class="card"><h2>Title</h2><p>Body</p></div>` });
  assert.equal(fragment.metrics.craft.measured, false);
  assert.match(fragment.metrics.craft.reason, /fewer than 150 authored declarations/);
  assert.equal(fragment.warnings.some((w) => /craft not measured/.test(w)), false, 'fragments and fixtures stay silent');
});
