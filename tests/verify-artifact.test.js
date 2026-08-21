'use strict';

// aioson verify:artifact — build-free "done = proven, not asserted" gate for the
// non-code artifacts the peripheral agents produce. Routes a kind to an existing
// validator (project-context, genome) or a declarative SG-* ruleset.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  runVerifyArtifact,
  evaluateRuleset,
  availableKinds,
  staticSiteChecks,
  scanSiteForLeaks,
  runSiteBuild,
  evaluateCommitMessage
} = require('../src/commands/verify-artifact');
const { parseArgv } = require('../src/parser');

async function tmp() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-va-'));
}
async function write(dir, rel, content) {
  const full = path.join(dir, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}
function makeLogger() {
  const lines = [];
  return {
    log: (m = '') => lines.push(String(m)),
    error: (m = '') => lines.push(String(m)),
    warn: (m = '') => lines.push(String(m)),
    lines
  };
}

// ───────────────────────── ruleset engine ─────────────────────────

test('evaluateRuleset: passes when every criterion is satisfied', async () => {
  const dir = await tmp();
  await write(dir, 'a.md', 'generated_by: x\nconfidence: high\nreal body');
  const out = evaluateRuleset(
    [{ id: 'C1', files: ['a.md'], must_match: ['generated_by'], must_not_match: ['\\bTODO\\b'] }],
    dir
  );
  assert.equal(out.ok, true, JSON.stringify(out.issues));
  assert.equal(out.issues.length, 0);
});

test('evaluateRuleset: fails and lists the criterion id on a placeholder / missing pattern', async () => {
  const dir = await tmp();
  await write(dir, 'a.md', 'confidence: low // TODO finish this');
  const out = evaluateRuleset(
    [{ id: 'C1', files: ['a.md'], must_match: ['generated_by'], must_not_match: ['\\bTODO\\b'] }],
    dir
  );
  assert.equal(out.ok, false);
  assert.equal(out.issues.length, 1);
  assert.match(out.issues[0], /C1/);
});

// ───────────────────────── kind=bootstrap end-to-end ─────────────────────────

async function scaffoldBootstrap(dir, { omit = [], placeholder = false } = {}) {
  const files = ['what-is.md', 'what-it-does.md', 'how-it-works.md', 'current-state.md'];
  for (const f of files) {
    if (omit.includes(f)) continue;
    const body = placeholder && f === 'current-state.md' ? 'TODO: fill this in' : 'real discovered content';
    await write(
      dir,
      `.aioson/context/bootstrap/${f}`,
      `---\ngenerated_by: discover\ngenerated_at: 2026-01-01\nconfidence: high\n---\n${body}\n`
    );
  }
}

test('kind=bootstrap: all 4 files present with frontmatter → ok; report persisted', async () => {
  const dir = await tmp();
  await scaffoldBootstrap(dir);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'bootstrap', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
  assert.equal(report.kind, 'bootstrap');
  const persisted = path.join(dir, '.aioson', 'context', 'verify-artifact-bootstrap.json');
  assert.ok(fssync.existsSync(persisted), 'report persisted to .aioson/context/verify-artifact-bootstrap.json');
  assert.equal(JSON.parse(fssync.readFileSync(persisted, 'utf8')).ok, true);
});

test('kind=bootstrap: a missing file fails the gate and names it', async () => {
  const dir = await tmp();
  await scaffoldBootstrap(dir, { omit: ['how-it-works.md'] });
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'bootstrap', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /how-it-works/.test(i)), JSON.stringify(report.issues));
});

test('kind=bootstrap: placeholder text fails the gate', async () => {
  const dir = await tmp();
  await scaffoldBootstrap(dir, { placeholder: true });
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'bootstrap', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
});

// ───────────────────────── advisory vs blocking + exit codes ─────────────────────────

test('--advisory: a failing kind reports not-ok but is non-blocking (exit stays 0)', async () => {
  const dir = await tmp();
  await scaffoldBootstrap(dir, { omit: ['what-is.md'] });
  const prev = process.exitCode;
  process.exitCode = 0;
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'bootstrap', advisory: true, json: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.equal(report.blocking, false);
  assert.equal(report.mode, 'advisory');
  assert.equal(process.exitCode, 0, 'advisory must never set exit 1');
  process.exitCode = prev;
});

test('kind=copy flags headline formulas but leaves specific copy alone', async () => {
  const specific = await tmp();
  await write(specific, '.aioson/context/copy-orders.md', '# Copy\n\nAprove pedidos travados em 2 cliques, sem abrir o ERP.\n');
  const clean = await runVerifyArtifact({
    args: [specific],
    options: { kind: 'copy', slug: 'orders', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(clean.ok, true, `specific copy must pass: ${clean.issues.join('; ')}`);

  // The twin of visual slop: a headline that still sells after the product is
  // swapped out. Both language surfaces the framework ships in are covered.
  const formulaic = await tmp();
  await write(formulaic, '.aioson/context/copy-orders.md', '# Copy\n\nTransforme seu negócio hoje.\nTake your sales to the next level.\n');
  const flagged = await runVerifyArtifact({
    args: [formulaic],
    options: { kind: 'copy', slug: 'orders', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(flagged.ok, false);
  // The engine reports the pattern that hit, not the matched text.
  assert.match(flagged.issues.join('\n'), /to the next level/);
  assert.match(flagged.issues.join('\n'), /ransforme \(o seu/);
});

test('--advisory survives the CLI wrapper, not just the command', async () => {
  // The wrapper fails the process for any result carrying `ok: false`. Asserting
  // only in-process hid that override for every kind: `--advisory` printed
  // ADVISORY and still exited 1 at the shell. The report carries `exitCode` so
  // this verdict, not `ok`, is what the wrapper honors.
  const dir = await tmp();
  await scaffoldBootstrap(dir, { omit: ['what-is.md'] });
  const bin = path.join(__dirname, '..', 'bin', 'aioson.js');

  const advisory = spawnSync(process.execPath, [bin, 'verify:artifact', dir, '--kind=bootstrap', '--advisory'], { encoding: 'utf8' });
  assert.equal(advisory.status, 0, `advisory exited ${advisory.status}: ${advisory.stdout}`);
  assert.match(advisory.stdout, /ADVISORY/);

  const blocking = spawnSync(process.execPath, [bin, 'verify:artifact', dir, '--kind=bootstrap'], { encoding: 'utf8' });
  assert.equal(blocking.status, 1, 'a blocking failure must still fail the process');
});

test('blocking mode sets exit 1 on failure; suppressExitCode honored', async () => {
  const dir = await tmp();
  await scaffoldBootstrap(dir, { omit: ['what-is.md'] });
  const prev = process.exitCode;

  process.exitCode = 0;
  await runVerifyArtifact({ args: [dir], options: { kind: 'bootstrap', json: true }, logger: makeLogger() });
  assert.equal(process.exitCode, 1, 'a blocking failure sets exit 1');

  process.exitCode = 0;
  await runVerifyArtifact({ args: [dir], options: { kind: 'bootstrap', json: true, suppressExitCode: true }, logger: makeLogger() });
  assert.equal(process.exitCode, 0, 'suppressExitCode must not mutate process.exitCode');

  process.exitCode = prev;
});

// ───────────────────────── project-context adapter (deterministic) ─────────────────────────

test('kind=project-context: missing file fails with a /setup hint', async () => {
  const dir = await tmp();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'project-context', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /not found|setup/i.test(i)), JSON.stringify(report.issues));
});

const VALID_CONTEXT = [
  '---',
  'project_name: demo',
  'project_type: web_app',
  'profile: developer',
  'framework: Next.js',
  'framework_installed: true',
  'classification: SMALL',
  'conversation_language: en',
  'aioson_version: 1.35.0',
  '---',
  '# Demo project',
  ''
].join('\n');

test('kind=project-context: a complete, valid context passes', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/context/project.context.md', VALID_CONTEXT);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'project-context', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=project-context: an invalid enum value (classification) fails the gate', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/context/project.context.md', VALID_CONTEXT.replace('classification: SMALL', 'classification: HUGE'));
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'project-context', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.length > 0);
});

// ───────────────────────── genome adapter guards ─────────────────────────

test('kind=genome: missing --slug is a clear, actionable failure', async () => {
  const dir = await tmp();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'genome', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /--slug/.test(i)));
});

test('kind=genome: a slug with no genome on disk fails (not found)', async () => {
  const dir = await tmp();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'genome', slug: 'nobody-nowhere', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /not found/i.test(i)));
});

// ───────────────────────── unknown / missing kind ─────────────────────────

test('unknown kind → ok:false + the available-kinds list', async () => {
  const dir = await tmp();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'nonsense', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.equal(report.error, 'unknown_kind');
  assert.ok(Array.isArray(report.available) && report.available.includes('bootstrap'));
});

test('missing kind → ok:false missing_kind', async () => {
  const dir = await tmp();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.equal(report.error, 'missing_kind');
});

// ───────────────────────── parser + registry ─────────────────────────

test('parser: --kind/--slug carry values; --advisory is boolean and keeps the path positional', () => {
  const r = parseArgv(['node', 'aioson', 'verify:artifact', '--kind=genome', '--slug=foo-bar', '--advisory', '.']);
  assert.equal(r.command, 'verify:artifact');
  assert.equal(r.options.kind, 'genome');
  assert.equal(r.options.slug, 'foo-bar');
  assert.equal(r.options.advisory, true);
  assert.deepEqual(r.args, ['.'], 'the "." path must remain a positional, not be swallowed by --advisory');
});

test('availableKinds lists adapters and rulesets', () => {
  const ks = availableKinds();
  assert.ok(ks.includes('project-context'));
  assert.ok(ks.includes('genome'));
  assert.ok(ks.includes('bootstrap'));
  assert.ok(ks.includes('research-report'));
  assert.ok(ks.includes('enriched-profile'));
  assert.ok(ks.includes('copy'));
  assert.ok(ks.includes('commit-message'));
  assert.ok(ks.includes('identity'));
});

// ───────────────────────── copy (advisory placeholder scan) ─────────────────────────

const COPY_OK = '---\nslug: launch\n---\n# Headline that earns attention\n\n## Act 1\nReal persuasive copy that says something specific.\n';

test('kind=copy: clean copy passes; placeholder/Lorem copy fails', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/context/copy-launch.md', COPY_OK);
  const ok = await runKind(dir, 'copy', 'launch');
  assert.equal(ok.ok, true, JSON.stringify(ok.issues));

  await write(dir, '.aioson/context/copy-launch.md', `${COPY_OK}\nTODO: write the offer\nLorem ipsum dolor sit amet\n`);
  const bad = await runKind(dir, 'copy', 'launch');
  assert.equal(bad.ok, false);
});

test('kind=copy --advisory: reports issues without blocking (exit stays 0)', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/context/copy-launch.md', '# H\nLorem ipsum dolor\n');
  const prev = process.exitCode;
  process.exitCode = 0;
  const r = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'copy', slug: 'launch', advisory: true, json: true },
    logger: makeLogger()
  });
  assert.equal(r.ok, false);
  assert.equal(r.blocking, false);
  assert.equal(process.exitCode, 0);
  process.exitCode = prev;
});

test('kind=copy scans every canonical mode output that exists — a VSL-only session is measured, not failed', async () => {
  // Mode 5 writes only vsl-script-{slug}.md; the scan must cover it instead of
  // failing on the absent copy-{slug}.md.
  const vslOnly = await tmp();
  await write(vslOnly, '.aioson/context/vsl-script-launch.md', COPY_OK);
  const ok = await runKind(vslOnly, 'copy', 'launch');
  assert.equal(ok.ok, true, JSON.stringify(ok.issues));

  await write(vslOnly, '.aioson/context/vsl-script-launch.md', `${COPY_OK}\nLorem ipsum dolor\n`);
  const bad = await runKind(vslOnly, 'copy', 'launch');
  assert.equal(bad.ok, false);
  assert.match(bad.issues.join('\n'), /vsl-script-launch\.md/);

  // Mode 6 writes campaign + body: a placeholder in EITHER file fails.
  const campaign = await tmp();
  await write(campaign, '.aioson/context/copy-launch.md', COPY_OK);
  await write(campaign, '.aioson/context/campaign-launch.md', `${COPY_OK}\nTODO: subjects\n`);
  const mixed = await runKind(campaign, 'copy', 'launch');
  assert.equal(mixed.ok, false);
  assert.match(mixed.issues.join('\n'), /campaign-launch\.md/);

  // Mode 3 (review/rewrite) is scanned too.
  const review = await tmp();
  await write(review, '.aioson/context/copy-review-launch.md', COPY_OK);
  assert.equal((await runKind(review, 'copy', 'launch')).ok, true);
});

test('kind=copy with no artifact at all names every canonical location', async () => {
  const dir = await tmp();
  const r = await runKind(dir, 'copy', 'launch');
  assert.equal(r.ok, false);
  const joined = r.issues.join('\n');
  for (const rel of ['copy-launch.md', 'copy-review-launch.md', 'vsl-script-launch.md', 'campaign-launch.md']) {
    assert.ok(joined.includes(rel), `missing-artifact issue must name ${rel}`);
  }
});

// ───────────────────────── commit-message (advisory subject heuristics) ─────────────────────────

test('evaluateCommitMessage: a clean Conventional Commits subject has no issues', () => {
  assert.deepEqual(evaluateCommitMessage('feat(api): add a token refresh endpoint\n\nbody here'), []);
  assert.deepEqual(evaluateCommitMessage('fix(auth): handle a null session token'), []);
  assert.deepEqual(evaluateCommitMessage('fix the flaky pagination test'), []);
});

test('evaluateCommitMessage: empty / vague / trailing-period / too-long subjects are flagged', () => {
  assert.ok(evaluateCommitMessage('').some((i) => /empty/.test(i)));
  assert.ok(evaluateCommitMessage('update').some((i) => /vague/.test(i)));
  assert.ok(evaluateCommitMessage('fix bug').some((i) => /vague/.test(i)));
  assert.ok(evaluateCommitMessage('Add the feature.').some((i) => /period/.test(i)));
  assert.ok(evaluateCommitMessage('x'.repeat(80)).some((i) => /72|chars/.test(i)));
});

test('kind=commit-message: reads a draft via --file (clean passes, vague fails)', async () => {
  const dir = await tmp();
  await write(dir, 'good.txt', 'feat(x): add a real, specific subject line\n');
  const ok = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'commit-message', file: 'good.txt', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(ok.ok, true, JSON.stringify(ok.issues));

  await write(dir, 'bad.txt', 'stuff\n');
  const bad = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'commit-message', file: 'bad.txt', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(bad.ok, false);
});

// ───────────────────────── genome adapter (positive / structural) ─────────────────────────

async function runKind(dir, kind, slug) {
  const options = { kind, json: true, suppressExitCode: true };
  if (slug) options.slug = slug;
  return runVerifyArtifact({ args: [dir], options, logger: makeLogger() });
}

test('kind=genome: a minimal valid folder genome (SKILL.md + manifest) passes', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/genomes/jane-coach/SKILL.md', '# Jane (coach) genome\n');
  await write(dir, '.aioson/genomes/jane-coach/manifest.json', JSON.stringify({ track: '3.0', references: [] }));
  const report = await runKind(dir, 'genome', 'jane-coach');
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=genome: a folder missing manifest.json fails the gate', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/genomes/jane-coach/SKILL.md', '# Jane (coach) genome\n');
  const report = await runKind(dir, 'genome', 'jane-coach');
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /manifest/i.test(i)), JSON.stringify(report.issues));
});

// ───────────────────────── research-report ruleset ─────────────────────────

const RESEARCH_OK = [
  '---',
  'person: Jane Doe',
  'sources_found: 12',
  'hexaco_h_signals: high',
  '---',
  '# Research Report: Jane Doe',
  '',
  '## Summary',
  'A real summary of the findings.',
  '',
  '## Source Inventory',
  '### High-Value Sources',
  '- a real, cited source',
  '',
  '## Extracted Material by Category',
  '### FRAMEWORKS',
  '- a real extracted framework',
  '',
  '## Gaps and Next Research Moves',
  '- a real, specific gap',
  ''
].join('\n');

test('kind=research-report: a complete report passes', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/profiler-reports/jane/research-report.md', RESEARCH_OK);
  const report = await runKind(dir, 'research-report', 'jane');
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=research-report: an unfilled [Full Name] template token fails', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/profiler-reports/jane/research-report.md', RESEARCH_OK.replace('# Research Report: Jane Doe', '# Research Report: [Full Name]'));
  const report = await runKind(dir, 'research-report', 'jane');
  assert.equal(report.ok, false);
});

test('kind=research-report: a missing required section fails', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/profiler-reports/jane/research-report.md', RESEARCH_OK.replace('## Gaps and Next Research Moves', '## Something Else'));
  const report = await runKind(dir, 'research-report', 'jane');
  assert.equal(report.ok, false);
});

test('kind=research-report: missing --slug is a clean usage failure', async () => {
  const dir = await tmp();
  const report = await runKind(dir, 'research-report', null);
  assert.equal(report.ok, false);
  assert.equal(report.error, 'missing_slug');
  assert.ok(report.issues.some((i) => /--slug/.test(i)));
});

// ───────────────────────── enriched-profile ruleset ─────────────────────────

const ENRICHED_OK = [
  '---',
  'confidence: high',
  '---',
  '# Enriched Profile: Jane Doe',
  '',
  '## Executive Summary',
  'real',
  '',
  '## Evidence Base',
  'real',
  '',
  '## Psychometric Profile',
  '### DISC',
  'real',
  '',
  '## Operational Method',
  '### Procedure',
  '1. a real, executable step',
  '',
  '## Trait Interactions (MPD)',
  'real',
  ''
].join('\n');

test('kind=enriched-profile: a complete profile passes', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/profiler-reports/jane/enriched-profile.md', ENRICHED_OK);
  const report = await runKind(dir, 'enriched-profile', 'jane');
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=enriched-profile: a missing Operational Method section fails', async () => {
  const dir = await tmp();
  await write(dir, '.aioson/profiler-reports/jane/enriched-profile.md', ENRICHED_OK.replace('## Operational Method', '## Something'));
  const report = await runKind(dir, 'enriched-profile', 'jane');
  assert.equal(report.ok, false);
});

// ───────────────────────── orache-report ruleset (--file) ─────────────────────────

const ORACHE_OK = [
  '# Investigation: Demo domain',
  '',
  '## D1: Domain Frameworks',
  '- a real framework',
  '- **Source:** a real, cited place',
  '',
  '## D2: Anti-patterns',
  '- ap',
  '## D3: Quality Benchmarks',
  '- qb',
  '## D4: Reference Voices',
  '- rv',
  '## D5: Domain Vocabulary',
  '- dv',
  '## D6: Competitive Landscape',
  '- cl',
  '## D7: Structural Patterns',
  '- sp',
  '',
  '## Impact Analysis',
  '- a real executor impact',
  ''
].join('\n');

const ORACHE_FILE = 'squad-searches/demo/investigation-20260101.md';

test('kind=orache-report: a complete 7-dimension report passes (via --file)', async () => {
  const dir = await tmp();
  await write(dir, ORACHE_FILE, ORACHE_OK);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'orache-report', file: ORACHE_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=orache-report: missing --file is a clean usage failure', async () => {
  const dir = await tmp();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'orache-report', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.equal(report.error, 'missing_file');
  assert.ok(report.issues.some((i) => /--file/.test(i)));
});

test('kind=orache-report: a missing dimension fails', async () => {
  const dir = await tmp();
  await write(dir, ORACHE_FILE, ORACHE_OK.replace('## D7: Structural Patterns', '## Something Else'));
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'orache-report', file: ORACHE_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
});

test('kind=orache-report: every intermediate dimension is enforced', async () => {
  const dir = await tmp();
  await write(dir, ORACHE_FILE, ORACHE_OK.replace('## D3: Quality Benchmarks', '## Something Else'));
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'orache-report', file: ORACHE_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes('## D3')));
});

// ───────────────────────── identity ruleset (--file) ─────────────────────────

const IDENTITY_OK = [
  '---',
  'kind: identity',
  'scope: briefing',
  'slug: kanban-board',
  'source: references',
  'generated_by: reference-identity-extract',
  'generated_at: 2026-06-30',
  'confidence: high',
  'theme: light-dark',
  'base_unit: 4px',
  '---',
  '',
  '## Design pillars',
  '- Sharp operational density — borders over shadows',
  '- Calm authority — one disciplined accent',
  '',
  '## Palette',
  '- foreground/primary: #0F172A',
  '- background/base: #FFFFFF',
  '- border/default: rgba(15,23,42,0.10)',
  '- brand/primary: #1E4C41',
  '',
  '## Typography',
  '- display: "Public Sans", system-ui, sans-serif',
  '- body: "Public Sans", system-ui, sans-serif',
  '',
  '## Spacing & layout',
  '- base: 4px — scale: 4, 8, 12, 16, 24, 32',
  '- breakpoints: mobile 390 / tablet 768 / desktop 1440',
  '',
  '## Radius & depth',
  '- radius ladder: sharp 6 / medium 10 / large 14',
  '- depth strategy: borders-only',
  '',
  '## Motion',
  '- posture: 140ms ease-out; entrances fade and rise 8px',
  '- reduced-motion: honored',
  '',
  '## Signature moves',
  '- Column WIP-limit ring fills as cards approach the limit',
  '',
  '## Anti-goals',
  '- Replace the default blue button with the brand accent',
  '',
  '## Component structure notes',
  '',
  '### Board',
  '- regions: column header, scrollable card list, footer add-row',
  '- states: empty, loading, error, populated, permission-denied',
  '',
  '## Provenance',
  '- identity references: 3 images; structure references: 1 board screenshot',
  ''
].join('\n');

const IDENTITY_FILE = '.aioson/briefings/kanban-board/identity.md';

test('kind=identity: a complete identity record passes (via --file)', async () => {
  const dir = await tmp();
  await write(dir, IDENTITY_FILE, IDENTITY_OK);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=identity: missing --file is a clean usage failure', async () => {
  const dir = await tmp();
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.equal(report.error, 'missing_file');
  assert.ok(report.issues.some((i) => /--file/.test(i)));
});

test('kind=identity: a missing anti-sameness anchor (signature moves) fails', async () => {
  const dir = await tmp();
  await write(dir, IDENTITY_FILE, IDENTITY_OK.replace('## Signature moves', '## Something Else'));
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
});

test('kind=identity: provenance source is explicit and schema-bound', async () => {
  const dir = await tmp();
  await write(dir, IDENTITY_FILE, IDENTITY_OK.replace('source: references\n', ''));
  const missing = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some((issue) => /source/.test(issue)));

  await write(dir, IDENTITY_FILE, IDENTITY_OK.replace('source: references', 'source: fabricated'));
  const invalid = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => /source/.test(issue)));

  await write(dir, IDENTITY_FILE, IDENTITY_OK.replace('generated_by: reference-identity-extract', 'generated_by: interface-design'));
  const fabricatedExtraction = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(fabricatedExtraction.ok, false);
  assert.ok(fabricatedExtraction.issues.some((issue) => /identity:provenance/.test(issue)));

  await write(
    dir,
    IDENTITY_FILE,
    IDENTITY_OK
      .replace('source: references', 'source: intent')
      .replace('generated_by: reference-identity-extract', 'generated_by: interface-design')
  );
  const originated = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(originated.ok, true, JSON.stringify(originated.issues));
});

test('kind=identity: a placeholder (TODO) fails', async () => {
  const dir = await tmp();
  await write(dir, IDENTITY_FILE, IDENTITY_OK.replace('- depth strategy: borders-only', '- depth strategy: TODO'));
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
});

test('kind=identity: an unfilled hex token (#RRGGBB) fails', async () => {
  const dir = await tmp();
  await write(dir, IDENTITY_FILE, IDENTITY_OK.replace('#0F172A', '#RRGGBB'));
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'identity', file: IDENTITY_FILE, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
});

// ───────────────────────── hybrid-skill ruleset ─────────────────────────

async function scaffoldHybrid(dir, slug, { badJson = false, omitPreview = false } = {}) {
  const base = `.aioson/installed-skills/${slug}`;
  await write(dir, `${base}/.skill-meta.json`, badJson ? '{ not json ' : JSON.stringify({ sources: [{ type: 'local' }], author: 'x' }));
  await write(dir, `${base}/SKILL.md`, '# Hybrid skill\nreal art direction and tokens\n');
  await write(dir, `${base}/previews/${slug}.html`, '<html><body>preview</body></html>');
  if (!omitPreview) await write(dir, `${base}/previews/${slug}-website.html`, '<html><body>website</body></html>');
}

test('kind=hybrid-skill: a complete package passes', async () => {
  const dir = await tmp();
  await scaffoldHybrid(dir, 'neo-brutalist');
  const report = await runKind(dir, 'hybrid-skill', 'neo-brutalist');
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=hybrid-skill: an invalid .skill-meta.json fails (parse-check)', async () => {
  const dir = await tmp();
  await scaffoldHybrid(dir, 'neo-brutalist', { badJson: true });
  const report = await runKind(dir, 'hybrid-skill', 'neo-brutalist');
  assert.equal(report.ok, false);
});

test('kind=hybrid-skill: a missing required preview fails', async () => {
  const dir = await tmp();
  await scaffoldHybrid(dir, 'neo-brutalist', { omitPreview: true });
  const report = await runKind(dir, 'hybrid-skill', 'neo-brutalist');
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /website\.html/.test(i)), JSON.stringify(report.issues));
});

// ───────────────────────── kind=site (static floor + runtime build) ─────────────────────────

async function scaffoldSite(dir, { build = 'node -e "process.exit(0)"', entry = true, leak = false } = {}) {
  await write(dir, 'package.json', JSON.stringify({ name: 'site-test', version: '1.0.0', private: true, scripts: { build } }));
  if (entry) await write(dir, 'app/page.tsx', 'export default function Page() { return <main>Hi</main>; }\n');
  await write(dir, 'components/Widget.tsx', leak ? 'export function ask() { alert("hi"); }\n' : 'export function ask() { return null; }\n');
}

test('staticSiteChecks: a clean site (build script + entry route, no leaks) has no issues', async () => {
  const dir = await tmp();
  await scaffoldSite(dir);
  const { issues } = staticSiteChecks(dir);
  assert.deepEqual(issues, [], JSON.stringify(issues));
});

test('staticSiteChecks: a missing build script and missing entry route are both flagged', async () => {
  const dir = await tmp();
  await write(dir, 'package.json', JSON.stringify({ name: 'x', version: '1.0.0' }));
  const { issues } = staticSiteChecks(dir);
  assert.ok(issues.some((i) => /build.*script/i.test(i)));
  assert.ok(issues.some((i) => /entry route/i.test(i)));
});

test('scanSiteForLeaks: flags a native alert() but not a commented one', async () => {
  const dir = await tmp();
  await write(dir, 'app/page.tsx', 'export default function P() { alert("x"); return null; }\n');
  await write(dir, 'app/ok.tsx', '// alert("just a comment")\nexport const ok = 1;\n');
  const hits = scanSiteForLeaks(dir);
  assert.ok(hits.some((h) => /page\.tsx.*alert/i.test(h)), JSON.stringify(hits));
  assert.ok(!hits.some((h) => /ok\.tsx/.test(h)), 'a commented alert must not be flagged');
});

test('kind=site --no-build: a clean static site passes (build skipped, warned)', async () => {
  const dir = await tmp();
  await scaffoldSite(dir);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'site', 'no-build': true, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
  assert.ok(report.warnings.some((w) => /skipped/i.test(w)));
});

test('kind=site --no-build: a native-dialog leak fails even with the build skipped', async () => {
  const dir = await tmp();
  await scaffoldSite(dir, { leak: true });
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'site', 'no-build': true, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /alert/i.test(i)));
});

// The build step is exercised with a fast native command (node) rather than a
// real `npm run build`, so the suite stays quick and never starves concurrent
// time-sensitive tests — the spawn/exit-code logic is identical either way.

test('runSiteBuild: a passing build command returns ok', async () => {
  const dir = await tmp();
  const r = runSiteBuild(dir, 30000, ['node', '--version']);
  assert.equal(r.ok, true, r.detail || '');
});

test('runSiteBuild: a failing build command returns not-ok with the exit detail', async () => {
  const dir = await tmp();
  const r = runSiteBuild(dir, 30000, ['node', '--bad-flag-zzz']);
  assert.equal(r.ok, false);
  assert.match(r.detail, /build failed|exit|start/i);
});

test('kind=site (full): a passing build step passes the gate on a buildable site', async () => {
  const dir = await tmp();
  await scaffoldSite(dir);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'site', buildCommand: ['node', '--version'], json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
});

test('kind=site (full): a failing build step fails the gate', async () => {
  const dir = await tmp();
  await scaffoldSite(dir);
  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'site', buildCommand: ['node', '--bad-flag-zzz'], json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => /build/i.test(i)), JSON.stringify(report.issues));
});

test('parser: verify:artifact --kind=site --dir + --no-build keeps the path positional', () => {
  const r = parseArgv(['node', 'aioson', 'verify:artifact', '--kind=site', '--dir=web', '--no-build', '.']);
  assert.equal(r.options.kind, 'site');
  assert.equal(r.options.dir, 'web');
  assert.equal(r.options['no-build'], true);
  assert.deepEqual(r.args, ['.'], 'the "." path must remain a positional, not be swallowed by --no-build');
});
