'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeVisualSources, maxCardNesting, emDashProse } = require('../src/lib/visual-telemetry');
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
