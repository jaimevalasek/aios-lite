'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeVisualSources, maxCardNesting, emDashProse } = require('../src/lib/visual-telemetry');
const { runVerifyArtifact, availableKinds } = require('../src/commands/verify-artifact');
const { runPrototypeCheck } = require('../src/commands/prototype-check');

// Full-surface fixtures below are craft-measured, the tier that records
// palette fingerprints. Nesting the registry path under a FILE makes both
// read and write fail silently (best-effort by design), so these tests never
// touch the operator's registry and never warn about each other's palettes.
process.env.AIOSON_DESIGN_REGISTRY = path.join(__filename, 'no-registry', 'design-fingerprints.json');

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

// Every interaction contract violated at once: native dialogs, a bare CPF/phone
// field, a delete button with no dialog machinery, a click-only kanban, and a
// management shell with no widget in sight. Word "modal" must not appear.
const INTERACTION_SLOP = `<!doctype html><html><head><style>
:root { --s: 8px; --fg: #111; } .shell { padding: var(--s); color: var(--fg); }
.board { gap: var(--s); } .column { padding: var(--s); } .item { padding: var(--s); }
.field { margin: var(--s); } .btn { padding: var(--s); } .top { gap: var(--s); }
.a { font-size: 14px; } .b { background: #fff; } .c { border-radius: 8px; }
</style></head><body class="dashboard shell">
<form><input type="text" name="cpf" placeholder="CPF"><input type="text" id="telefone"></form>
<div class="kanban board"><div class="column">A Fazer</div><div class="column">Feito</div></div>
<button class="btn" onclick="if(confirm('Excluir?')) alert('ok')">Excluir cliente</button>
</body></html>`;

// The same surfaces honoring the contracts: semantic inputs, a <dialog> confirm,
// draggable kanban items, KPI widgets. A custom \`ui.confirm()\` is not native.
const INTERACTION_CLEAN = `<!doctype html><html><head><style>
:root { --s: 8px; --fg: #111; } .shell { padding: var(--s); color: var(--fg); }
.board { gap: var(--s); } .column { padding: var(--s); } .widget { padding: var(--s); }
.kpi { margin: var(--s); } .btn { padding: var(--s); } .top { gap: var(--s); }
.a { font-size: 14px; } .b { background: #fff; } .c { border-radius: 8px; }
</style></head><body class="dashboard shell">
<section class="widget kpi">Pedidos hoje: 12 (+8%)</section>
<form><input type="text" name="cpf" inputmode="numeric" maxlength="14" placeholder="CPF">
<input type="tel" id="telefone"></form>
<div class="kanban board"><div class="column"><div class="item" draggable="true">PED-1</div></div></div>
<button class="btn" data-action="excluir">Excluir cliente</button>
<dialog id="confirm-excluir"><p>Excluir cliente?</p></dialog>
<script>function abrir(){ ui.confirm('Excluir cliente?'); } document.addEventListener('dragstart', abrir);</script>
</body></html>`;

test('interaction contracts: every violation is measured, native dialogs are the blocking tier', () => {
  const result = analyzeVisualSources({ html: INTERACTION_SLOP });
  assert.equal(result.applicable, true);

  assert.deepEqual(result.metrics.native_dialog_calls.sort(), ['alert', 'confirm']);
  assert.match(result.issues.join('\n'), /native browser dialog call/);

  assert.equal(result.metrics.structured_inputs_without_semantics.length, 2);
  assert.match(result.warnings.join('\n'), /structured field\(s\) with no input semantics/);
  assert.match(result.warnings.join('\n'), /destructive control\(s\) with no dialog machinery/);
  assert.match(result.warnings.join('\n'), /kanban\/pipeline surface with no drag-and-drop markers/);
  assert.match(result.warnings.join('\n'), /management surface with no widget\/KPI\/chart markers/);
});

test('interaction contracts: a conforming surface and a custom confirm() method stay silent', () => {
  const result = analyzeVisualSources({ html: INTERACTION_CLEAN });
  assert.equal(result.applicable, true);

  // ui.confirm() is a design-system method, not window.confirm — the blocking
  // tier must not fire on it, and none of the four contract warnings apply.
  assert.deepEqual(result.metrics.native_dialog_calls, []);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.warnings.filter((w) => /input semantics|dialog machinery|drag-and-drop markers|widget\/KPI/.test(w)),
    []
  );
});

test('HTML comments never count as measurement — a rationale header is not the surface', () => {
  // Real case: a prototype's design-rationale header said "not admin density"
  // and that lone word read as a management surface. Commented-out markup is
  // not the artifact — every lexical scan runs on comment-free markup.
  const commented = `<!--
    Design rationale: public-facing form, not admin density, no dashboard chrome.
    <button onclick="if(confirm('Excluir?')) alert('ok')">Excluir cliente</button>
    <input type="text" name="cpf" placeholder="CPF">
    kanban board with a column per stage
  -->
  <style>
  :root { --s: 8px; --fg: #111; } .shell { padding: var(--s); color: var(--fg); }
  .field { margin: var(--s); } .btn { padding: var(--s); } .top { gap: var(--s); }
  .a { font-size: 14px; } .b { background: #fff; } .c { border-radius: 8px; }
  .d { padding: var(--s); } .e { gap: var(--s); } .f { color: var(--fg); }
  </style>
  <form><input type="tel" id="telefone" maxlength="15"></form>`;
  const result = analyzeVisualSources({ html: commented });
  assert.equal(result.applicable, true);

  assert.equal(result.metrics.management_surface, false);
  assert.equal(result.metrics.kanban_surface, false);
  assert.equal(result.metrics.destructive_controls, 0);
  assert.deepEqual(result.metrics.native_dialog_calls, []);
  assert.deepEqual(result.metrics.structured_inputs_without_semantics, []);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.warnings.filter((w) => /management surface|kanban|dialog machinery|input semantics|native/.test(w)),
    []
  );
});

test('commented-out JS never fires the native-dialog blocking tier', () => {
  // The blocking tier promises near-zero false positives: a commented-out
  // confirm()/alert() is not a call. Line comments, block comments, and the
  // URL edge (`https://` is not a comment) are all covered.
  const commentedJs = `<style>
  :root { --s: 8px; --fg: #111; } .shell { padding: var(--s); color: var(--fg); }
  .a { font-size: 14px; } .b { background: #fff; } .c { border-radius: 8px; }
  .d { margin: var(--s); } .e { gap: var(--s); } .f { color: var(--fg); }
  .g { padding: var(--s); } .h { gap: var(--s); }
  </style>
  <button id="go">Enviar</button>
  <script>
  // if (confirm('Excluir?')) alert('ok')
  /* prompt('nome?') */
  const docs = 'https://example.com/confirm(guide)';
  document.getElementById('go').addEventListener('click', () => ui.confirm('Enviar?'));
  </script>`;
  const result = analyzeVisualSources({ html: commentedJs });
  assert.equal(result.applicable, true);
  assert.deepEqual(result.metrics.native_dialog_calls, []);
  assert.deepEqual(result.issues, []);

  // A real call on a line that also carries a comment still fires.
  const realCall = commentedJs.replace(
    "// if (confirm('Excluir?')) alert('ok')",
    "window.confirm('Excluir?'); // pending design-system modal"
  );
  const flagged = analyzeVisualSources({ html: realCall });
  assert.deepEqual(flagged.metrics.native_dialog_calls, ['confirm']);
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

const DIRECTION_MANIFEST = `---\nfeature: orders\nstatus: draft\n---\n\n## Visual direction\n\n- Register: Technical — the data is the composition.\n- Anti-goals: uniform card grid, pill topbar.\n`;

test('kind=visual resolves the feature-owned prototype from --slug, and says so when it cannot', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, '.aioson/briefings/orders/prototype.html', CLEAN);
  await writeFile(dir, '.aioson/briefings/orders/prototype-manifest.md', DIRECTION_MANIFEST);

  const found = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(found.ok, true);
  assert.deepEqual(found.issues, []);
  assert.equal(found.metrics.files[0], '.aioson/briefings/orders/prototype.html');
  assert.equal(found.metrics.manifest_visual_direction, true);

  const missing = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'nope', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(missing.ok, false);
  assert.match(missing.issues[0], /--file=<path>, --dir=<front-end root>, or --slug=/);
});

test('slug mode demands the manifest and its filled ## Visual direction — file/dir modes do not', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, '.aioson/briefings/orders/prototype.html', CLEAN);

  // No manifest at all: the pair is the artifact.
  const noManifest = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(noManifest.ok, false);
  assert.match(noManifest.issues.join('\n'), /prototype-manifest\.md not found/);

  // A manifest whose Visual direction is missing or empty: the composition was
  // never decided in writing — the identity re-skin gap.
  await writeFile(dir, '.aioson/briefings/orders/prototype-manifest.md', '---\nfeature: orders\n---\n\n## Visual direction\n\n## Quality evidence\n- ok\n');
  const emptyDirection = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(emptyDirection.ok, false);
  assert.match(emptyDirection.issues.join('\n'), /no filled `## Visual direction`/);

  // File mode points anywhere — no manifest expectation.
  const fileMode = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', file: '.aioson/briefings/orders/prototype.html', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.deepEqual(fileMode.issues, []);
});

test('emoji-as-icon, uniform card walls, and prototype affordance markers are measured', () => {
  // Emoji standing in for icons — the classic tell no check used to see.
  const emojiUi = CLEAN.replace('Aprovar pedido', '📎 Anexar 👁 Ver');
  const emoji = analyzeVisualSources({ html: emojiUi });
  assert.deepEqual(emoji.metrics.emoji_glyphs.sort(), ['👁', '📎']);
  assert.match(emoji.warnings.join('\n'), /emoji glyph\(s\) in the UI corpus/);
  // Deliberate typography dingbats stay silent.
  const check = analyzeVisualSources({ html: CLEAN.replace('Aprovar pedido', '✓ Aprovado ★') });
  assert.deepEqual(check.metrics.emoji_glyphs, []);

  // Eight identical sibling cards are a wall; seven stay a metric.
  const cards = (n) => `<main>${Array.from({ length: n }, () => '<div class="card">x</div>').join('')}</main>`;
  const wall = analyzeVisualSources({ html: CLEAN.replace('<main class="shell">', `${cards(8)}<main class="shell">`) });
  assert.equal(wall.metrics.max_card_sibling_run, 8);
  assert.match(wall.warnings.join('\n'), /uniform card wall/);
  const short = analyzeVisualSources({ html: CLEAN.replace('<main class="shell">', `${cards(7)}<main class="shell">`) });
  assert.equal(short.metrics.max_card_sibling_run, 7);
  assert.doesNotMatch(short.warnings.join('\n'), /uniform card wall/);

  // Affordance markers are only expected of an AIOSON prototype (data-aioson-id).
  const bare = analyzeVisualSources({ html: CLEAN });
  assert.equal(bare.metrics.prototype_anchors, false);
  assert.doesNotMatch(bare.warnings.join('\n'), /data-aioson-primary|data-aioson-tour/);

  const prototype = analyzeVisualSources({ html: CLEAN.replace('<main class="shell">', '<main class="shell" data-aioson-id="shell">') });
  assert.equal(prototype.metrics.prototype_anchors, true);
  assert.match(prototype.warnings.join('\n'), /no `data-aioson-primary` marker/);
  assert.match(prototype.warnings.join('\n'), /no first-open explainer \(`data-aioson-tour`\)/);

  const complete = analyzeVisualSources({
    html: CLEAN.replace(
      '<main class="shell">',
      '<main class="shell" data-aioson-id="shell" data-aioson-primary><div data-aioson-tour="1">Passo 1</div>'
    )
  });
  assert.doesNotMatch(complete.warnings.join('\n'), /data-aioson-primary|data-aioson-tour/);
});

test('em-dash cadence: copy and seed strings are counted; CSS, comments, and code punctuation are not', () => {
  const html = `<!doctype html><html><head><style>
  /* Tokens — brand section */ .a { color: #fff; }
  </style></head><body>
  <!-- layout — rationale note -->
  <p>Deck vazio — sem resgates</p>
  <input placeholder="Ex.: Live #44 — Perguntas">
  <script>
  // comment — not copy
  const url = 'https://x.test/a—b';
  const seed = [{ t: 'Abertura — o que é' }, { n: 'Falar devagar — é o coração' }];
  </script></body></html>`;
  const { count, samples } = emDashProse(html);
  assert.equal(count, 4, 'two markup instances plus two seed strings; CSS/HTML/JS comments and the unspaced URL stay out');
  assert.equal(samples.length, 3);
  assert.match(samples[0], /Deck vazio — sem resgates/);
});

test('em-dash cadence: the corpus threshold warns on saturation and stays silent on deliberate use', () => {
  const withCopy = (copy) => CLEAN.replace('Aprovar pedido', copy);

  // Three spaced em dashes: legitimate typographic territory — no warning.
  const deliberate = analyzeVisualSources({ html: withCopy('a — b</button><p>c — d</p><p>e — f</p><button>ok') });
  assert.equal(deliberate.metrics.em_dash_prose, 3);
  assert.doesNotMatch(deliberate.warnings.join('\n'), /em dash/);

  // Four and up: the scattered-microcopy saturation the sentence-level rule
  // can never see, reported with samples so the rewrite is directed.
  const saturated = analyzeVisualSources({ html: withCopy('a — b</button><p>c — d</p><p>e — f</p><p>g — h</p><button>ok') });
  assert.equal(saturated.metrics.em_dash_prose, 4);
  assert.match(saturated.warnings.join('\n'), /4 spaced em dash\(es\) across UI copy and mock content/);
  assert.match(saturated.warnings.join('\n'), /model-writing tell/);
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

// ─── craft floor (measured ambition) ─────────────────────────────────────────

const { fontSizePx, resolveCustomProps, customProperties } = require('../src/lib/visual-telemetry');

// A full surface (>= 150 declarations) with PERFECT hygiene and ZERO ambition:
// tokenized values, on-grid rhythm, every state marked — and OS-default
// typography, small type, no material, no motion, no imagery. This is the
// measured shape of the "default document" that used to pass with (no issues).
function flatHygienicSurface({ fontTokens = '', headStyles = '', extraHead = '', body = '' } = {}) {
  const filler = Array.from({ length: 40 }, (_, i) =>
    `.f${i} { padding: var(--s2); margin: var(--s3); color: var(--fg); background: var(--bg); }`
  ).join('\n');
  return `<!doctype html><html><head>${extraHead}<style>
  :root { --s2: 8px; --s3: 12px; --fg: #1a1a1a; --bg: #ffffff; --border: rgba(0,0,0,.1); ${fontTokens} }
  body { font-family: Georgia, serif; font-size: 16px; color: var(--fg); background: var(--bg); }
  h1 { font-size: 32px; }
  .btn { padding: var(--s2); transition: opacity .2s; }
  .btn:disabled { opacity: .5; } .btn:focus-visible { outline: 2px solid var(--fg); }
  .carregando { opacity: .6; } .vazio { color: var(--fg); } .erro { color: #b00020; }
  ${headStyles}
  ${filler}
  </style></head><body>
  <main><h1>Consultório</h1><button class="btn">Agendar conversa</button>${body}</main>
  </body></html>`;
}

test('a full hygienic surface with zero ambition fires the craft floor and the typography ceiling', () => {
  const result = analyzeVisualSources({ html: flatHygienicSurface() });
  assert.equal(result.applicable, true);
  assert.deepEqual(result.issues, []);

  const m = result.metrics;
  assert.ok(m.declarations >= 150, `fixture must be a full surface (got ${m.declarations})`);
  assert.equal(m.craft.measured, true);
  assert.equal(m.font_delivery.delivered, false);
  assert.deepEqual(m.font_families, ['georgia']);
  assert.equal(m.max_font_size_px, 32);
  assert.equal(m.craft.active_levers, 0);

  const text = result.warnings.join('\n');
  assert.match(text, /typography never leaves the OS default stacks \(georgia\)/);
  assert.match(text, /craft floor: 0\/5 premium levers active/);
  assert.match(text, /display-scale type \(largest font-size 32px, floor 56px\)/);
  assert.match(text, /evidence imagery \(0 media elements, 0 CSS image layers\)/);

  // The dated-dialect tell: flexbox/grid/custom-properties only, none of the
  // current platform vocabulary anywhere in a full surface.
  assert.deepEqual(m.craft.modern_css, []);
  assert.match(text, /authored in pre-2020 CSS only/);
});

test('a family named without any delivery mechanism is its own finding, resolved through var()', () => {
  const result = analyzeVisualSources({
    html: flatHygienicSurface({
      fontTokens: '--font-display: "Marlow Display", Georgia, serif;',
      headStyles: 'h1 { font-family: var(--font-display); }'
    })
  });
  // var() resolution is what makes the metric see the token system at all —
  // this exact shape used to report font_families: [].
  assert.ok(result.metrics.font_families.includes('marlow display'));
  assert.deepEqual(result.metrics.font_delivery.undelivered_families, ['marlow display']);
  const text = result.warnings.join('\n');
  assert.match(text, /font families named but never delivered \(marlow display\)/);
  assert.doesNotMatch(text, /never leaves the OS default stacks/);
});

test('an ambitious surface activates the levers and stays silent — the gate must not cry wolf', () => {
  const html = flatHygienicSurface({
    extraHead: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fictional+Display:wght@400;700&display=swap">',
    fontTokens: '--font-display: "Fictional Display", Georgia, serif;',
    headStyles: `
      h1 { font-family: var(--font-display); font-size: clamp(2.5rem, 8vw, 6rem); }
      .hero { background: radial-gradient(circle at 20% 0%, rgba(20,40,80,.4), transparent), linear-gradient(180deg, #0b0d12, #141821); }
      .hero::after { content: ''; background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence baseFrequency='0.8'/></filter></svg>"); opacity: .05; }
    `,
    body: `<img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" alt="Vitrine do produto" width="800" height="500">
      <script>const io = new IntersectionObserver(() => {}); io.observe(document.body);</script>`
  });
  const result = analyzeVisualSources({ html });
  assert.deepEqual(result.issues, []);

  const m = result.metrics;
  assert.equal(m.font_delivery.delivered, true);
  assert.equal(m.font_delivery.webfont_linked, true);
  assert.equal(m.max_font_size_px, 96, 'clamp() is judged at its max arm (6rem)');
  assert.equal(m.craft.active_levers, 5);
  assert.deepEqual(m.craft.levers, { typeface: true, display_scale: true, material: true, motion: true, evidence: true });

  const text = result.warnings.join('\n');
  assert.doesNotMatch(text, /craft floor|never delivered|OS default stacks/);

  // clamp() and the scroll-reveal idiom put it in the current dialect — the
  // dated-vocabulary warning must stay out.
  assert.ok(m.craft.modern_css.includes('fluid clamp() type'));
  assert.ok(m.craft.modern_css.includes('scroll-driven reveals'));
  assert.doesNotMatch(text, /pre-2020 CSS/);
});

test('the page ground is what body paints in the base theme — not the most-frequent component background, not a theme override', () => {
  // A green logo/chip family outnumbers the body rule by declaration count,
  // and a [data-theme] block later in the sheet redefines the ground tokens.
  // Both used to poison the fingerprint: frequency picked the chip color,
  // last-write-wins resolution picked the toggle theme.
  const chips = Array.from({ length: 12 }, (_, i) => `.chip-${i} { background: #297d1a; color: #ffffff; }`).join('\n');
  const html = `<!doctype html><html><head><style>
  :root { --bg: oklch(18.5% 0.028 315); --fg: #eeeaf2; }
  [data-theme="light"] { --bg: oklch(96.5% 0.008 315); --fg: #1d1626; }
  .logo { background: #297d1a; }
  ${chips}
  body { background: var(--bg); color: var(--fg); }
  </style></head><body><main><h1>Painel</h1></main></body></html>`;
  const m = analyzeVisualSources({ html }).metrics;
  assert.equal(m.palette.ground.pole, 'dark');
  assert.equal(m.palette.ground.h, 315);
  assert.ok(Math.abs(m.palette.accent_hue - 141) <= 3, `accent stays the chip green family (got ${m.palette.accent_hue})`);
});

test('a full surface whose material rests on gradients and blur alone draws the shallow-material warning; a layered system stays silent', () => {
  const shallow = analyzeVisualSources({ html: flatHygienicSurface({
    headStyles: `
      .hero { background: linear-gradient(180deg, #0b0d12, #141821), radial-gradient(circle at 20% 0%, #1a1e2a, transparent); }
      .top { backdrop-filter: blur(12px); }
    `
  }) });
  assert.equal(shallow.metrics.craft.levers.material, true);
  assert.equal(shallow.metrics.craft.material_depth, 2);
  assert.match(shallow.warnings.join('\n'), /shallow material system: .*finish depth 2\/7/);

  const deep = analyzeVisualSources({ html: flatHygienicSurface({
    headStyles: `
      .hero { background: linear-gradient(180deg, #0b0d12, #141821), radial-gradient(circle at 20% 0%, #1a1e2a, transparent); }
      .card { box-shadow: 0 1px 0 rgba(255,255,255,.7) inset, 0 8px 24px -14px rgba(0,0,0,.3); }
      .pop { box-shadow: 0 4px 10px -2px rgba(0,0,0,.12), 0 22px 48px -24px rgba(0,0,0,.45); }
      .veil::after { content: ''; background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence baseFrequency='0.8'/></filter></svg>"); }
    `
  }) });
  assert.ok(deep.metrics.craft.material_depth >= 4, `deep fixture depth (got ${deep.metrics.craft.material_depth})`);
  assert.doesNotMatch(deep.warnings.join('\n'), /shallow material system/);
});

test('effect tokens and keyframes that no rule applies are named — decorating the stylesheet is not craft', () => {
  const result = analyzeVisualSources({ html: flatHygienicSurface({
    headStyles: `
      :root { --glow-wash: radial-gradient(circle, #223344, transparent); --shadow-lift: 0 4px 10px rgba(0,0,0,.2), 0 22px 48px rgba(0,0,0,.4); }
      @keyframes float-up { from { transform: translateY(8px); } to { transform: none; } }
    `
  }) });
  assert.deepEqual(result.metrics.craft.unapplied_effects, ['--glow-wash', '--shadow-lift', '@keyframes float-up']);
  assert.match(result.warnings.join('\n'), /declared finish never applied: --glow-wash, --shadow-lift, @keyframes float-up/);

  const wired = analyzeVisualSources({ html: flatHygienicSurface({
    headStyles: `
      :root { --glow-wash: radial-gradient(circle, #223344, transparent); }
      .hero { background: var(--glow-wash); animation: float-up 6s ease infinite; }
      @keyframes float-up { from { transform: translateY(8px); } to { transform: none; } }
    `
  }) });
  assert.deepEqual(wired.metrics.craft.unapplied_effects, []);
  assert.doesNotMatch(wired.warnings.join('\n'), /declared finish never applied/);
});

test('the craft axis only measures full surfaces — fixtures and fragments stay silent', () => {
  const clean = analyzeVisualSources({ html: CLEAN });
  assert.equal(clean.metrics.craft.measured, false);
  // CLEAN names "IBM Plex Sans" with no delivery; on a fragment that is not a
  // finding, which is exactly why the floor is gated on corpus size.
  assert.deepEqual(clean.warnings, []);
});

test('the palette fingerprint reads the shipped hue family through var()', () => {
  // Dark teal ground painted by the last bare body rule (the cascade: a later
  // unscoped body wins over the fixture's white base), one coral accent family.
  const dark = analyzeVisualSources({
    html: flatHygienicSurface({
      headStyles: `
        body { background: #0e2a2e; color: #eef4f2; }
        .cta { background: #ff6b4a; color: #ffffff; }
        .cta:hover { background: #e85f41; }
        .link { color: #ff6b4a; }
        .badge { border-color: #ff6b4a; color: #ff6b4a; }
      `
    })
  });
  const palette = dark.metrics.palette;
  assert.equal(palette.ground.pole, 'dark', `ground ${JSON.stringify(palette.ground)}`);
  assert.equal(palette.ground.hex, '#0e2a2e');
  assert.ok(palette.accent_hue >= 20 && palette.accent_hue <= 50, `coral accent family, got ${palette.accent_hue}°`);
  assert.ok(palette.color_literals > 80, 'var()-resolved uses are counted, not just literal sites');
  assert.ok(palette.hue_clusters >= 1);

  // The default fixture ships a white ground — pole flips with the surface.
  const light = analyzeVisualSources({ html: flatHygienicSurface() });
  assert.equal(light.metrics.palette.ground.pole, 'light');
});

test('font-size and custom-property resolution helpers are arithmetic', () => {
  assert.equal(fontSizePx('clamp(1rem, 2vw + 1rem, 4.5rem)'), 72);
  assert.equal(fontSizePx('2.25rem'), 36);
  assert.equal(fontSizePx('18px'), 18);
  assert.equal(fontSizePx('inherit'), null);
  const props = customProperties(':root { --a: var(--b); --b: 24px; }');
  assert.equal(resolveCustomProps('var(--a)', props), '24px');
  assert.equal(resolveCustomProps('var(--missing, 8px)', props), '8px');
});

test('kind=visual warns when the manifest Quality evidence is a placeholder', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, '.aioson/briefings/orders/prototype.html', CLEAN);
  const manifest = (evidence) => `---\nfeature: orders\nstatus: draft\n---\n\n## Visual direction\n\n- Register: Technical — the data is the composition.\n\n## Quality evidence\n\n${evidence}\n`;

  await writeFile(dir, '.aioson/briefings/orders/prototype-manifest.md', manifest('_(preenchido após a medição)_'));
  const placeholder = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(placeholder.ok, true, 'placeholder evidence is a warning, not a blocker');
  assert.match(placeholder.warnings.join('\n'), /`## Quality evidence` is empty or a placeholder/);

  await writeFile(dir, '.aioson/briefings/orders/prototype-manifest.md', manifest(
    '- kind=visual: tokens 92% | type max 72px | font delivered | craft 4/5\n- fold check: approved on desktop and mobile\n- walkthrough: approved, matched the briefing promises'
  ));
  const filled = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.doesNotMatch(filled.warnings.join('\n'), /Quality evidence/);
  assert.equal(filled.metrics.manifest_quality_evidence, true);
});

test('an intent-first build that misses the craft floor is pointed at the identity route', async () => {
  const dir = await makeTmpDir();
  const manifest = (identity) => `---\nfeature: orders\nstatus: draft\nidentity: ${identity}\n---\n\n## Visual direction\n\n- Register: Editorial — plates and figure numbers carry the argument.\n\n## Quality evidence\n\n- kind=visual measured, findings recorded below with their numbers and dispositions\n`;

  // Full flat surface (craft floor fires) + identity: none → the gate names
  // the reference-identity-extract route instead of letting the next round
  // re-roll intent-first origination or a preset menu.
  await writeFile(dir, '.aioson/briefings/orders/prototype.html', flatHygienicSurface());
  await writeFile(dir, '.aioson/briefings/orders/prototype-manifest.md', manifest('none'));
  const intentFirst = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.match(intentFirst.warnings.join('\n'), /reference-identity-extract/);
  assert.equal(intentFirst.metrics.manifest_identity, 'none');

  // Same miss but an identity record was consumed → the route pointer stays
  // out; the craft warnings themselves still stand on their own.
  await writeFile(dir, '.aioson/briefings/orders/prototype-manifest.md', manifest('.aioson/briefings/orders/identity.md'));
  const withIdentity = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'visual', slug: 'orders', json: true, advisory: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.doesNotMatch(withIdentity.warnings.join('\n'), /reference-identity-extract/);
  assert.match(withIdentity.warnings.join('\n'), /craft floor/);
});
