'use strict';

// End-to-end simulation of the governance layer against MOCK PROJECTS.
//
// `rules-check.test.js` unit-tests the checker. This file asks the question that
// unit tests structurally cannot: in a project shaped like a real one, does the
// governance actually reach the agent and actually catch the violation?
//
// The failure this guards against is not "the check is wrong". It is the far
// more dangerous one that produced the incident in the first place: THE CHECK
// REPORTS SUCCESS WITHOUT HAVING LOOKED. A gate that scans zero files and prints
// OK is worse than no gate, because it also removes the suspicion that would
// have made someone look.
//
// So every archetype below is probed for three separate properties:
//
//   reach      the rule is retrievable — it lands in the agent's brief.
//   sight      the check reads the files a project of this shape actually has,
//              and does NOT read the files it merely contains (build output,
//              vendored dependencies, generated code).
//   honesty    an all-clear is only ever emitted after something was scanned,
//              and accepted debt never silently becomes forgiveness.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { runRulesCheck } = require('../src/commands/rules-check');
const { runAgentEpilogue } = require('../src/commands/agent-epilogue');

const silent = { log() {}, error() {} };
const REPO_ROOT = path.resolve(__dirname, '..');

// ─── mock project factory ─────────────────────────────────────────────────────

const LANGUAGE_RULE = `---
name: source-code-language-convention
description: identifiers in technical English
enforcement: source-code-language
---

# Source Code Language Convention

## Required Behavior

- Use English for source code identifiers.
`;

/**
 * @param {Record<string,string>} files
 * @param {{ git?: boolean, commit?: boolean }} opts
 *   git    initialise a repository (so \`--changed\` has something to ask)
 *   commit commit everything, which is what makes the diff EMPTY — the state a
 *          gate meets whenever the work was committed before the handoff
 */
function mockProject(files, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-gov-sim-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  if (opts.git || opts.commit) {
    execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
    if (opts.commit) {
      execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' });
      execFileSync('git', ['-c', 'user.email=sim@aioson', '-c', 'user.name=sim', 'commit', '-qm', 'init'], {
        cwd: dir, stdio: 'ignore'
      });
    }
  }
  return dir;
}

const check = (dir, options = {}) =>
  runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true, ...options }, logger: silent });

const filesOf = (report) => (report.findings || []).map((finding) => finding.file);

// ─── archetypes ───────────────────────────────────────────────────────────────

// A Portuguese-named tree: the shape that started all of this.
const LEGACY_PTBR = {
  '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
  'servidor/rotas/blocos.ts': 'export function criarBloco() { return 1; }\n',
  'servidor/rotas/pautas.ts': 'export function salvarPauta() { return 2; }\n',
  'servidor/nucleo/estado.ts': 'export const estadoInicial = {};\n',
  'servidor/dominio/usuario.ts': 'export class Usuario {}\n'
};

const GREENFIELD_EN = {
  '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
  'src/server/routes/blocks.ts': 'export function createBlock() { return 1; }\n',
  'src/server/routes/agendas.ts': 'export function saveAgenda() { return 2; }\n',
  'src/core/state.ts': 'export const initialState = {};\n'
};

// ─── 1. sight: what a project of this shape actually contains ─────────────────

test('sim: a Tauri project is judged by its own source, never by target/', async () => {
  // The reason this matters is not noise. `divergence` compares offending files
  // against ALL scanned files, so a few thousand generated crates decide whether
  // the tool tells a human "your project was built against another convention".
  // Vendored code voting on that question makes the diagnosis meaningless.
  const files = {
    '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
    'src-tauri/src/main.rs': 'pub fn create_block() -> i32 { 1 }\n',
    'src-tauri/Cargo.toml': '[package]\nname = "app"\n',
    'src/app.ts': 'export function createBlock() { return 1; }\n'
  };
  for (let i = 0; i < 12; i += 1) {
    files[`src-tauri/target/debug/deps/crate_${i}.rs`] = 'pub fn criar_coisa() -> i32 { 1 }\npub struct EstadoInterno;\n';
  }
  const report = await check(mockProject(files));

  assert.deepEqual(filesOf(report), [], `generated crates must not be findings: ${JSON.stringify(filesOf(report))}`);
  assert.equal(report.divergence, null, 'a compiler output directory must never trigger the legacy diagnosis');
  assert.ok(report.scanned_files <= 3, `expected to scan the project, not its build: ${report.scanned_files} files`);
});

test('sim: generated output from every ecosystem stays out of the verdict', async () => {
  const report = await check(mockProject({
    '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
    'App/Program.cs': 'class Program { }\n',
    'App/obj/Debug/geracao.cs': 'class Gerador { }\n',
    'mobile/.dart_tool/build/rotas.dart': 'class Rotas { }\n',
    'mobile/lib/model.freezed.dart': 'class Usuario { }\n',
    'api/_build/dev/lib/consulta.ex': 'defmodule Consulta do\nend\n',
    'ios/Pods/Lib/servidor.swift': 'class Servidor { }\n',
    'public/vendor/lib.min.js': 'var configuracao=1;\n'
  }));

  assert.deepEqual(filesOf(report), [], `only hand-written source is the project's naming: ${JSON.stringify(filesOf(report))}`);
});

test('sim: a Laravel tree is read while its vendor directory is not', async () => {
  const report = await check(mockProject({
    '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
    'app/Services/ServicoPagamento.php': '<?php\nclass ServicoPagamento {}\n',
    'vendor/laravel/framework/src/Servidor.php': '<?php\nclass Servidor {}\n'
  }));

  assert.ok(filesOf(report).includes('app/Services/ServicoPagamento.php'));
  assert.ok(!filesOf(report).some((file) => file.startsWith('vendor/')), 'vendored dependencies are not this project');
});

test('sim: a domain noun is the project\'s to own, even wearing a framework suffix', async () => {
  // The boundary that keeps this check trustworthy, stated as a test so nobody
  // "fixes" it later. The rule's prose names `PedidoController` as undesirable,
  // but `pedido` is a domain word a product legitimately owns, and no scanner
  // can tell an owned noun from a translated one. Guessing would put false
  // positives in front of every team using a non-English domain vocabulary —
  // the one failure mode that gets a gate switched off for good. Scaffolding is
  // measured; vocabulary is left to the humans and to review.
  const report = await check(mockProject({
    '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
    'src/domain/PedidoController.php': '<?php\nclass PedidoController {}\n'
  }));

  assert.equal(report.total, 0, 'domain vocabulary is not measurable and must not be guessed at');
});

// ─── 2. honesty: an all-clear must mean something was looked at ───────────────

test('sim: an empty diff never produces a clean bill of health', async () => {
  // THE false green. Both auto-fire seams run with `--changed`, and a diff is
  // empty in two entirely ordinary situations: the project has no git yet, or
  // the agent committed before handing off. If "nothing changed" reads as
  // "nothing wrong", the whole enforcement layer is off precisely when someone
  // is relying on it.
  const noGit = await check(mockProject(LEGACY_PTBR), { changed: true });
  assert.equal(noGit.ok, false, 'a violating tree in a non-git project must not report OK');

  const committed = await check(mockProject(LEGACY_PTBR, { commit: true }), { changed: true });
  assert.equal(committed.ok, false, 'work committed before the handoff must still be judged');
  assert.ok(committed.scanned_files > 0, 'an all-clear is only meaningful after files were read');
});

test('sim: a scope that resolves to nothing says so in the report', async () => {
  const report = await check(mockProject(GREENFIELD_EN, { commit: true }), { changed: true });

  assert.equal(report.ok, true);
  assert.equal(report.scope_fallback, 'changed->full',
    'a caller must be able to tell a verified pass from an unscanned one');
});

test('sim: --paths pointed at a directory scans that directory', async () => {
  // `--paths=src/server` is the natural thing to type, and it used to scan zero
  // files and pass.
  const report = await check(mockProject(LEGACY_PTBR), { paths: 'servidor' });

  assert.ok(report.scanned_files > 0, 'a directory argument must expand to its source files');
  assert.equal(report.ok, false);
});

test('sim: a rule that names a checker nobody implements is reported, not ignored', async () => {
  // A typo in `enforcement:` silently disarms the rule. The rule author gets no
  // feedback, the report looks green, and the rule is quietly decorative.
  const report = await check(mockProject({
    ...LEGACY_PTBR,
    '.aioson/rules/source-code-language-convention.md':
      LANGUAGE_RULE.replace('enforcement: source-code-language', 'enforcement: source-code-langauge')
  }));

  assert.equal(report.ok, true, 'the checker really is disarmed — which is exactly why it must be announced');

  assert.ok(Array.isArray(report.misdeclared), 'the report must carry the misdeclarations');
  assert.equal(report.misdeclared.length, 1);
  assert.equal(report.misdeclared[0].declared, 'source-code-langauge');
  assert.match(report.misdeclared[0].name, /source-code-language-convention/);
});

// ─── 3. legacy projects: the debt must behave like debt ───────────────────────

test('sim: partially cleaning a legacy file is never punished as new drift', async () => {
  // A file with more violations than the per-file report cap. The baseline
  // accepts what it was shown; fixing some of them exposes the ones it was not
  // shown, and the slice that improved the file gets blocked for it. That is the
  // fastest possible way to teach a team to switch the gate off.
  const many = (prefix, n) => Array.from({ length: n },
    (_, i) => `export function ${prefix}${i}() { return ${i}; }`).join('\n');
  const dir = mockProject({
    '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
    'src/legacy.ts': `${many('criarItem', 12)}\n`
  });

  await check(dir, { baseline: true });
  assert.equal((await check(dir)).total, 0, 'the accepted tree is quiet');

  const improved = Array.from({ length: 12 }, (_, i) =>
    (i < 3 ? `export function createItem${i}() { return ${i}; }` : `export function criarItem${i}() { return ${i}; }`)
  ).join('\n');
  await fsp.writeFile(path.join(dir, 'src/legacy.ts'), `${improved}\n`, 'utf8');

  const after = await check(dir);
  assert.equal(after.ok, true, `fixing three violations must not block: got ${JSON.stringify(after.findings)}`);
});

test('sim: --baseline records the whole project, not the current diff', async () => {
  // Following the tool's own advice ("run rules:check --baseline") from inside a
  // session where a scope flag is already set must not write an empty baseline
  // and announce success.
  const dir = mockProject(LEGACY_PTBR, { commit: true });

  const written = await check(dir, { changed: true, baseline: true });
  assert.ok(written.baseline.accepted > 0, 'a baseline that accepted nothing is not a baseline');

  const after = await check(dir);
  assert.equal(after.ok, true, 'the accepted project passes');
  assert.ok(after.accepted_debt > 0, 'and the debt stays counted');
});

test('sim: --strict on a legacy tree still explains itself', async () => {
  // Blocking without the three options is the behaviour that makes a human
  // delete the rule instead of deciding about it.
  const report = await check(mockProject({
    '.aioson/rules/source-code-language-convention.md': LANGUAGE_RULE,
    'src/migracao.ts': 'export const configuracao = 1;\n',
    'src/identidade.ts': 'export const capacidade = 2;\n',
    'src/duracao.ts': 'export const velocidade = 3;\n',
    'src/contagem.ts': 'export const quantidade = 4;\n'
  }), { strict: true });

  assert.equal(report.ok, false);
  assert.ok(report.divergence, 'whatever severity is blocking is the severity the diagnosis must measure');
});

// ─── 4. reach: the seams that fire without anyone remembering ─────────────────

const epilogue = (dir) => runAgentEpilogue({
  args: [dir],
  options: { agent: 'dev', summary: 'implemented the slice', json: true },
  logger: silent
});

test('sim: @dev completing on a violating tree is told by the epilogue', async () => {
  // The seam that makes this layer work without anyone remembering to run it.
  // The tree is committed, so the diff is empty — the exact state in which the
  // check used to report nothing at all.
  const dir = mockProject({
    ...LEGACY_PTBR,
    '.aioson/context/project.context.md': '# Project\n'
  }, { commit: true });

  const result = await epilogue(dir);
  const step = (result.steps || []).find((entry) => entry.name === 'rules:check');

  assert.ok(step, 'the rule check must appear in the epilogue steps, even when the diff is empty');
  assert.equal(step.ok, false);
  assert.match(step.reason, /source-code-language-convention/);
});

test('sim: a clean project gets a quiet epilogue, not a silent one', async () => {
  const dir = mockProject({
    ...GREENFIELD_EN,
    '.aioson/context/project.context.md': '# Project\n'
  }, { commit: true });

  const result = await epilogue(dir);
  const step = (result.steps || []).find((entry) => entry.name === 'rules:check');

  assert.ok(step, 'passing is a result too — the step is how a human knows it ran');
  assert.equal(step.ok, true);
});

// ─── 5. the CLI contract, through the real binary ─────────────────────────────

test('sim: the shipped binary fails on a violation and passes once accepted', () => {
  // Exit codes are what a CI job, a hook, or a non-Claude harness actually reads.
  const dir = mockProject(LEGACY_PTBR);
  const cli = (...args) => {
    const { spawnSync } = require('node:child_process');
    return spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'aioson.js'), 'rules:check', dir, ...args], {
      encoding: 'utf8'
    });
  };

  const violating = cli();
  assert.equal(violating.status, 1, `expected exit 1, got ${violating.status}: ${violating.stdout}`);
  assert.match(violating.stdout, /RULES=FAIL/);

  assert.equal(cli('--baseline').status, 0);
  const accepted = cli();
  assert.equal(accepted.status, 0, `after --baseline the project passes: ${accepted.stdout}`);
  assert.match(accepted.stdout, /Accepted debt/);
});

// ─── 6. reach: the rule has to survive the trip to the agent ─────────────────

const RULE_FRONTMATTER = (name) =>
  `---\nname: ${name}\ndescription: ${name}\npriority: 8\nload_tier: always\npaths: ['**']\n---\n\n# ${name}\n\n## Required Behavior\n\n`;

test('sim: a fourth rule still reaches the agent — rules do not starve each other', async () => {
  // Constraints are capped, and the documents used to be concatenated before
  // the cap was applied. A verbose first rule therefore spent the entire budget
  // and the remaining rules contributed NOTHING — invisibly, because the
  // package still came back full.
  const { buildContextBrief } = require('../src/context-brief');
  const files = {
    '.aioson/context/project.context.md': '---\nframework: Laravel\nproject_type: web-app\n---\n# Project\n',
    '.aioson/context/project-pulse.md': '---\nactive_feature: checkout\n---\n# Pulse\n'
  };
  for (const name of ['alpha-rule', 'beta-rule', 'gamma-rule', 'delta-rule']) {
    files[`.aioson/rules/${name}.md`] = RULE_FRONTMATTER(name)
      + Array.from({ length: 8 }, (_, i) => `- ${name} demands step ${i} of its own procedure.`).join('\n')
      + '\n';
  }
  const dir = mockProject(files);

  const brief = await buildContextBrief(dir, {
    agent: 'dev', mode: 'executing', task: 'implement the checkout slice', paths: 'src/checkout.ts'
  });

  for (const name of ['alpha-rule', 'beta-rule', 'gamma-rule', 'delta-rule']) {
    assert.ok(brief.constraints.some((item) => item.includes(name)),
      `${name} contributed nothing: ${JSON.stringify(brief.constraints)}`);
  }
});

test('sim: guidance addressed to another framework never becomes a binding constraint', async () => {
  const { buildContextBrief } = require('../src/context-brief');
  const rule = `${RULE_FRONTMATTER('data-access')}`
    + '- Keep persistence out of controllers.\n'
    + '- For Laravel, prefer FormRequest for validation and Eloquent scopes for filters.\n'
    + '- For non-Laravel stacks, translate the same boundary to the framework idioms.\n';
  const build = (framework) => buildContextBrief(mockProject({
    '.aioson/context/project.context.md': `---\nframework: ${framework}\nproject_type: web-app\n---\n# Project\n`,
    '.aioson/context/project-pulse.md': '---\nactive_feature: checkout\n---\n# Pulse\n',
    '.aioson/rules/data-access.md': rule
  }), { agent: 'dev', mode: 'executing', task: 'implement the checkout data layer', paths: 'src/checkout.ts' });

  const laravel = await build('Laravel');
  assert.ok(laravel.constraints.some((item) => /FormRequest/.test(item)), 'the stack it addresses gets it');
  assert.ok(!laravel.constraints.some((item) => /non-Laravel/i.test(item)), 'and not the clause excluding it');

  const react = await build('React');
  assert.ok(!react.constraints.some((item) => /FormRequest/.test(item)),
    'a React project must not be handed Laravel instructions as a binding constraint');
  assert.ok(react.constraints.some((item) => /translate the same boundary/.test(item)),
    'the clause written for it survives');
});

// ─── 7. the real rule files, not the fixtures ─────────────────────────────────

test('sim: every enforcement declared in the shipped template resolves', async () => {
  // A fixture proves the mechanism. This proves the mechanism is actually wired
  // to the rules we ship — a typo here disarms a rule in every project.
  const { discoverGovernance, ENFORCERS } = require('../src/commands/rules-check');
  const documents = await discoverGovernance(path.join(REPO_ROOT, 'template'));
  const declared = documents.filter((doc) => doc.declared_enforcement);

  assert.ok(declared.length >= 3, 'the template must ship enforced governance');
  for (const doc of declared) {
    assert.ok(ENFORCERS[doc.declared_enforcement],
      `${doc.path} declares unknown checker "${doc.declared_enforcement}"`);
  }
});

test('sim: the shipped naming rule is scoped to every source path a project can have', async () => {
  // `paths:` is a hard filter for guard injection: a rule that declares them
  // never injects for a file outside them. A whitelist can only ever enumerate
  // the stacks somebody thought of — and this rule is about EVERY identifier, so
  // the enumeration itself is the bug. `src-tauri/`, `components/`, `internal/`,
  // and `cmd/` were all outside it.
  const { parseFrontmatter } = require('../src/preflight-engine');
  const { parseListValue, pathMatchesPattern } = require('../src/context-selector');
  const rulePath = path.join(REPO_ROOT, 'template', '.aioson', 'rules', 'source-code-language-convention.md');
  const frontmatter = parseFrontmatter(await fsp.readFile(rulePath, 'utf8'));
  const patterns = parseListValue(frontmatter.paths);

  for (const candidate of [
    'src-tauri/src/main.rs', 'components/Button.tsx', 'internal/store/db.go',
    'cmd/server/main.go', 'app/Http/Controllers/OrderController.php', 'src/index.ts'
  ]) {
    assert.ok(patterns.some((pattern) => pathMatchesPattern(candidate, pattern)),
      `a universal naming rule must reach ${candidate}`);
  }
});
