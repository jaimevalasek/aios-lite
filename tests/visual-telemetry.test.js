'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeVisualSources, maxCardNesting } = require('../src/lib/visual-telemetry');
const { runVerifyArtifact, availableKinds } = require('../src/commands/verify-artifact');
const { runPrototypeCheck } = require('../src/commands/prototype-check');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-visual-'));
}

async function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

// A surface carrying every marker the telemetry is built to catch: a decorative
// blob, motion with no reduced-motion branch, cards three deep, zero tokens,
// off-grid rhythm, three depth strategies, four font families, no states.
const SLOP = `<!doctype html><html><head><style>
.blob { position: absolute; border-radius: 50%; filter: blur(80px); background: linear-gradient(135deg,#7c3aed,#4f46e5); }
.hero { padding: 37px; margin: 13px; background: #0b1015; color: #f3f7fb; font-family: Inter, sans-serif; }
.card { padding: 17px; border: 1px solid #222; box-shadow: 0 2px 9px rgba(0,0,0,.4); border-radius: 11px; }
.inner { padding: 9px; border: 1px solid #333; box-shadow: 0 1px 3px #000; }
.deep { padding: 6px; border: 1px solid #444; box-shadow: 0 1px 2px #111; }
.glass { backdrop-filter: blur(12px); border: 1px solid #555; box-shadow: 0 8px 30px #000; }
.g2 { backdrop-filter: blur(6px); } .g3 { filter: blur(2px); }
.t1 { font-family: Georgia, serif; } .t2 { font-family: "Space Mono", monospace; } .t3 { font-family: Manrope; }
.fade { animation: fadeIn .3s ease; } @keyframes fadeIn { to { opacity: 1; } }
</style></head><body>
<div class="blob"></div>
<section class="hero"><h1>Transform your workflow</h1><button>Get started</button></section>
<div class="card"><div class="inner card"><div class="deep card">nested</div></div></div>
</body></html>`;

// The same surface built with a system: tokens, 4px rhythm, one depth strategy,
// one family, reduced-motion honored, every material state expressed.
const CLEAN = `<!doctype html><html><head><style>
:root { --space-2: 8px; --space-3: 12px; --radius: 8px; --fg: #101418; --border: rgba(0,0,0,.08); }
.shell { padding: var(--space-3); color: var(--fg); font-family: "IBM Plex Sans", system-ui; }
.row { gap: var(--space-2); padding: var(--space-2); border-bottom: 1px solid var(--border); }
.panel { padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius); }
.btn { padding: var(--space-2); border-radius: var(--radius); background: var(--fg); color: #fff; }
.btn:disabled { opacity: .5; } .btn:focus-visible { outline: 2px solid var(--fg); }
.is-loading { opacity: .6; } .empty-state { padding: var(--space-3); } .error-state { color: #b00020; }
.fade { animation: rise .2s ease; } @keyframes rise { to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .fade { animation: none; } }
</style></head><body>
<main class="shell"><div class="row"><button class="btn">Aprovar pedido</button></div>
<table><tr><td>PED-4471</td></tr></table></main>
</body></html>`;

test('the telemetry separates a systemless surface from a systematic one', () => {
  const slop = analyzeVisualSources({ html: SLOP });
  const clean = analyzeVisualSources({ html: CLEAN });

  assert.equal(slop.applicable, true);
  assert.equal(clean.applicable, true);

  // The whole value of the gate is this asymmetry. A clean surface must produce
  // nothing at all — a linter that also fires on good work gets switched off.
  assert.deepEqual(clean.issues, []);
  assert.deepEqual(clean.warnings, []);

  assert.equal(slop.issues.length, 3);
  assert.match(slop.issues.join('\n'), /decorative blob/);
  assert.match(slop.issues.join('\n'), /prefers-reduced-motion/);
  assert.match(slop.issues.join('\n'), /nested 3 deep/);
  assert.ok(slop.warnings.length >= 4);
});

test('token adherence and spacing rhythm are arithmetic, not opinion', () => {
  const slop = analyzeVisualSources({ html: SLOP }).metrics;
  const clean = analyzeVisualSources({ html: CLEAN }).metrics;

  assert.equal(slop.token_adherence_pct, 0);
  assert.equal(slop.tokenized_values, 0);
  assert.ok(slop.spacing_off_grid >= 5);
  assert.deepEqual(slop.depth_strategies, ['borders', 'shadows', 'blur']);
  assert.equal(slop.font_families.length, 4);
  assert.equal(slop.reduced_motion_handled, false);
  assert.deepEqual(slop.states_missing, ['loading', 'empty', 'error', 'disabled', 'focus']);

  assert.ok(clean.token_adherence_pct >= 80);
  assert.equal(clean.spacing_off_grid, 0);
  assert.deepEqual(clean.states_missing, []);
  assert.equal(clean.reduced_motion_handled, true);
});

test('a blob needs all three properties — a rounded avatar is not a finding', () => {
  const rounded = `<style>
  .avatar { border-radius: 50%; width: 40px; height: 40px; background: #ccc; }
  .sticky { position: absolute; top: 8px; right: 8px; padding: 4px; color: #333; }
  .soft { filter: blur(2px); opacity: .8; margin: 8px; border: 1px solid #eee; }
  .x { padding: 8px; } .y { gap: 8px; } .z { color: #111; }
  </style><div class="avatar"></div>`;
  const result = analyzeVisualSources({ html: rounded });
  assert.equal(result.applicable, true);
  assert.equal(result.issues.filter((i) => /decorative blob/.test(i)).length, 0);
});

test('a modest radius is a soft glow, not a blob — the blocking tier stays precise', () => {
  // All three blob properties co-occur, but the radius is 9px: this is a glow
  // panel behind a card, and flagging it would be a false positive in the tier
  // that is supposed to be provable from the text alone.
  const glow = `<style>
  .glow { position: absolute; border-radius: 9px; filter: blur(40px); background: #7c3aed; inset: 0; }
  .a { padding: 8px; } .b { gap: 16px; } .c { color: #111; } .d { margin: 4px; }
  .e { font-size: 14px; } .f { border-radius: 8px; } .g { background: #fff; }
  </style><div class="glow"></div>`;
  const result = analyzeVisualSources({ html: glow });
  assert.equal(result.applicable, true);
  assert.equal(result.issues.filter((i) => /decorative blob/.test(i)).length, 0);

  // The pill idiom and an explicit circle still are blobs.
  for (const radius of ['999px', '9999px', '50%']) {
    const blob = glow.replace('border-radius: 9px', `border-radius: ${radius}`);
    const flagged = analyzeVisualSources({ html: blob });
    assert.equal(
      flagged.issues.filter((i) => /decorative blob/.test(i)).length,
      1,
      `border-radius: ${radius} should still read as a decorative blob`
    );
  }
});

test('state markers are recognized in the authoring language, not only in English', () => {
  const ptBr = `<style>
  .carregando { opacity: .5; padding: 8px; }
  .vazio { color: #666; margin: 16px; }
  .erro { color: #b00; padding: 4px; }
  button:disabled { opacity: .4; }
  button:focus { outline: 2px solid #333; }
  .a { gap: 8px; } .b { font-size: 14px; } .c { background: #fff; }
  </style><form><button class="carregando">Salvar</button></form>`;
  const result = analyzeVisualSources({ html: ptBr });
  assert.equal(result.applicable, true);
  assert.equal(result.metrics.interactive_surface, true);
  assert.deepEqual(
    result.metrics.states_missing,
    [],
    'pt-BR markup must not report states as absent purely because they were not named in English'
  );
});

test('utility-class markup reports not-applicable instead of inventing a verdict', () => {
  const tailwindish = '<div class="flex items-center gap-4 rounded-xl bg-slate-900 p-6 text-sm">ok</div>';
  const result = analyzeVisualSources({ html: tailwindish });
  assert.equal(result.applicable, false);
  assert.match(result.reason, /out of scope/i);
  assert.deepEqual(result.issues, []);
});

test('card nesting counts containers, not every wrapper div', () => {
  assert.equal(maxCardNesting('<div class="card"><div class="row"><div class="card">x</div></div></div>'), 2);
  assert.equal(maxCardNesting('<div class="card">a</div><div class="card">b</div>'), 1);
  assert.equal(maxCardNesting('<div class="wrapper"><section class="content">x</section></div>'), 0);
  // A self-closing or void element must never leave the stack unbalanced.
  assert.equal(maxCardNesting('<div class="card"><img src="a.png"><br/></div><div class="card">b</div>'), 1);
});

test('verify:artifact exposes kind=visual and measures a file locator', async () => {
  assert.ok(availableKinds().includes('visual'));

  const dir = await makeTmpDir();
  await writeFile(dir, 'ui/screen.html', SLOP);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', file: 'ui/screen.html', json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });

  assert.equal(report.kind, 'visual');
  assert.equal(report.ok, false);
  assert.equal(report.blocking, false, 'advisory must never block');
  assert.equal(report.issues.length, 3);
  assert.ok(report.metrics, 'the measurement must reach the caller');
  assert.equal(report.metrics.token_adherence_pct, 0);
  assert.deepEqual(report.metrics.files, ['ui/screen.html']);
});

test('kind=visual resolves the feature-owned prototype from --slug, and says so when it cannot', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, '.aioson/briefings/orders/prototype.html', CLEAN);

  const found = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(found.ok, true);
  assert.deepEqual(found.issues, []);
  assert.equal(found.metrics.files[0], '.aioson/briefings/orders/prototype.html');

  const missing = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'nope', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(missing.ok, false);
  assert.match(missing.issues[0], /--file=<path>, --dir=<front-end root>, or --slug=/);
});

test('kind=visual scans a front-end directory and skips vendored trees', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, 'site/index.html', CLEAN);
  await writeFile(dir, 'site/node_modules/pkg/evil.css', '.x { padding: 7px; margin: 3px; }');

  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', dir: 'site', json: true, suppressExitCode: true },
    logger: makeLogger()
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.metrics.files, ['site/index.html']);
});

// ─── prototype:check integration ─────────────────────────────────────────────

const SLUG = 'kanban';
const PRD = `---
feature: ${SLUG}
prototype: .aioson/briefings/${SLUG}/prototype.html
prototype_status: current
prototype_feature: ${SLUG}
---

# Kanban

## Prototype reference
- status: current
- feature: ${SLUG}
- prototype: .aioson/briefings/${SLUG}/prototype.html
- manifest: .aioson/briefings/${SLUG}/prototype-manifest.md

## Acceptance Criteria
AC-01: add card persists and re-renders.
`;
const MANIFEST = `---\nfeature: ${SLUG}\nstatus: approved\n---\n\n# Prototype manifest\n\n## Core interactions\n- \`add card\` — adds a card to a list\n`;

async function protoProject(prototypeHtml) {
  const dir = await makeTmpDir();
  await writeFile(dir, `.aioson/context/prd-${SLUG}.md`, PRD);
  await writeFile(dir, `.aioson/briefings/${SLUG}/prototype.html`, prototypeHtml);
  await writeFile(dir, `.aioson/briefings/${SLUG}/prototype-manifest.md`, MANIFEST);
  return dir;
}

test('prototype:check reports visual telemetry without touching its verdict', async () => {
  const slopDir = await protoProject(SLOP);
  const cleanDir = await protoProject(CLEAN);

  const slop = await runPrototypeCheck({ args: [slopDir], options: { json: true, feature: SLUG }, logger: makeLogger() });
  const clean = await runPrototypeCheck({ args: [cleanDir], options: { json: true, feature: SLUG }, logger: makeLogger() });

  // Same binding, same coverage, same verdict — the telemetry is advisory.
  assert.equal(slop.ok, true);
  assert.equal(slop.status, 'ok');
  assert.equal(clean.ok, true);
  assert.equal(clean.status, 'ok');

  assert.ok(slop.visual, 'telemetry must ride along with the resolved prototype');
  assert.equal(slop.visual.applicable, true);
  assert.equal(slop.visual.file, `.aioson/briefings/${SLUG}/prototype.html`);
  assert.equal(slop.visual.issues.length, 3);
  assert.deepEqual(clean.visual.issues, []);
});

test('prototype:check prints the telemetry line in human output', async () => {
  const dir = await protoProject(SLOP);
  const logger = makeLogger();
  await runPrototypeCheck({ args: [dir], options: { feature: SLUG }, logger });

  const out = logger.lines.join('\n');
  assert.match(out, /Visual telemetry \(advisory\)/);
  assert.match(out, /tokens 0%/);
  assert.match(out, /decorative blob/);
});

test('the telemetry is reachable from both ends of the visual lifecycle', async () => {
  const ROOT = path.resolve(__dirname, '..');
  // Routed docs, not agent kernels: both kernels are at their density budget, and
  // a non-visual feature must never pay context for a gate it will not run.
  const surfaces = [
    '.aioson/docs/briefing/prototype-and-delegation.md', // measurable the moment the prototype exists
    '.aioson/docs/dev/visual-implementation.md'          // and again over the implemented front-end
  ];

  for (const relativePath of surfaces) {
    const [template, workspace] = await Promise.all([
      fs.readFile(path.join(ROOT, 'template', relativePath), 'utf8'),
      fs.readFile(path.join(ROOT, relativePath), 'utf8')
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
    assert.match(template, /verify:artifact \. --kind=visual/, `${relativePath} never runs the measurement`);
    assert.match(template, /--advisory/, `${relativePath} must not turn telemetry into a hard gate`);
  }
});

test('a strict binding failure still runs without telemetry when no prototype resolves', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, `.aioson/context/prd-${SLUG}.md`, `---\nfeature: ${SLUG}\nprototype: null\nprototype_status: none\nprototype_feature: null\n---\n\n# Kanban\n`);
  const r = await runPrototypeCheck({ args: [dir], options: { json: true, feature: SLUG }, logger: makeLogger() });

  assert.equal(r.ok, true);
  assert.equal(r.status, 'not_applicable');
  assert.equal(r.visual, undefined);
});
