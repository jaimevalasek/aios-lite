'use strict';

/**
 * The scope-drift gate in the CANONICAL route (PRD → plan → dev → qa).
 *
 * It used to be guarded behind spec-/design-doc-/readiness-{slug}.md — legacy
 * artifacts every canonical kernel forbids — so in the route every feature
 * actually takes, no gate ever compared the delivered code with the plan.
 * Now `spec:analyze --stage=dev|qa` measures two things post-implementation:
 * the planned paths exist (execution-stage completeness, blocking) and the
 * delivered diff matches the plan (`plan_path_untouched`,
 * `delivery_outside_plan` — advisory with samples). Pre-implementation runs
 * keep today's semantics: a planned `create` path that does not exist yet is
 * not a finding.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { runSpecAnalyze, analyzePlanDeliveryDrift, SUPPORT_PATH } = require('../src/commands/spec-analyze');
const { finalizeCurrentStage, readWorkflowConfig } = require('../src/commands/workflow-next');

const logger = { log() {}, error() {} };

async function write(root, rel, body) {
  const file = path.join(root, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body, 'utf8');
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function prd(slug) {
  return `---\nclassification: SMALL\nproduct_scope: approved\nprd_ready: approved\n---\n# PRD\n\n## Feature Capability Map\n\n| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |\n|---|---|---|---|---|\n| CAP-${slug}-01 | User sees a saved result | User submits | required | Core promise |\n\n## Acceptance Criteria\n\n| AC | CAP | Observable behavior | Evidence |\n|---|---|---|---|\n| AC-${slug}-01 | CAP-${slug}-01 | Saved result appears | focused test |\n`;
}

function plan(slug, { files = `src/${slug}.js, tests/${slug}.test.js`, delta = [['create', `src/${slug}.js, tests/${slug}.test.js`]] } = {}) {
  // The plan contract classifies EVERY delivery path in the Implementation
  // Delta (one action per row), so the fixture takes its delta as rows.
  const deltaRows = delta
    .map(([action, paths]) => `| CAP-${slug}-01 | ${action} | Inspected the nearest boundary from package.json | ${paths} | ${action === 'reuse' ? 'None, reused as is' : 'Add implementation and AC-linked coverage'} |`)
    .join('\n');
  return `---\nstatus: approved\n---\n# Plan\n\n## Engineering Controls\n\n| Concern | Evidence / trigger | Planned control | Verification | Recovery |\n|---|---|---|---|---|\n| compatibility | package.json establishes the current Node runtime | Preserve the existing module contract | node --test | Revert the additive change; no persistent data |\n\n## Implementation Delta\n\n| CAP | Action | Existing evidence | Exact paths | Required change |\n|---|---|---|---|---|\n${deltaRows}\n\n## Capability Delivery Plan\n\n| CAP | Phase | Files | Verification |\n|---|---|---|---|\n| CAP-${slug}-01 | 1 | ${files} | node --test |\n`;
}

/** A git repo with a baseline commit, then the feature artifacts committed — the feature start is resolvable. */
async function featureRepo(slug, { planOptions } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-scope-drift-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'a@b.c']);
  git(dir, ['config', 'user.name', 'a']);
  await write(dir, 'README.md', '# app\n');
  await write(dir, 'src/lib/existing.js', 'module.exports = 1;\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'baseline']);
  await write(dir, '.aioson/context/project.context.md', '---\nclassification: "SMALL"\n---\n# C\n');
  await write(dir, `.aioson/context/prd-${slug}.md`, prd(slug));
  await write(dir, `.aioson/context/implementation-plan-${slug}.md`, plan(slug, planOptions));
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', `feat(${slug}): artifacts`]);
  return dir;
}

function findingsBy(report, check) {
  return report.findings.filter((f) => f.check === check);
}

test('support paths are never drift: tests, lockfiles, fixtures, build output', () => {
  for (const p of ['tests/x.test.js', 'src/__tests__/a.tsx', 'src/a.spec.ts', 'package-lock.json', 'pnpm-lock.yaml', 'Cargo.lock', 'dist/bundle.js', 'coverage/lcov.info', 'spec/models/user_spec.rb', 'pkg/handler_test.go', 'types/api.d.ts', 'CHANGELOG.md']) {
    assert.equal(SUPPORT_PATH.test(p), true, `${p} must read as support`);
  }
  for (const p of ['src/feature.js', 'app/page.tsx', 'lib/billing/invoice.rb', 'package.json', 'src/testing-utils.ts', 'src/contest/rules.js']) {
    assert.equal(SUPPORT_PATH.test(p), false, `${p} must read as scope`);
  }
});

test('the drift analysis is pure: planned vs delivered, reuse never untouched, contract allowlist sanctions', () => {
  const changeSet = {
    baseSource: 'parent of first feature commit (abcd1234)',
    changedFiles: [{ status: 'A', path: 'src/feature.js' }, { status: 'M', path: 'src/rogue.js' }, { status: 'M', path: 'src/themes/dark.css' }, { status: 'M', path: 'package-lock.json' }],
    untracked: ['tests/feature.test.js', 'src/untracked-rogue.js']
  };
  const drift = analyzePlanDeliveryDrift({
    plannedPaths: ['src/feature.js', 'src/never-touched.js'],
    reusePaths: ['src/lib/existing.js'],
    changeSet,
    allowedGlobs: ['src/themes/**']
  });
  assert.deepEqual(drift.untouched, ['src/never-touched.js']);
  assert.deepEqual(drift.outside, ['M src/rogue.js', 'A src/untracked-rogue.js']);
  assert.deepEqual(drift.findings.map((f) => [f.check, f.severity]), [['plan_path_untouched', 'warning'], ['delivery_outside_plan', 'warning']]);
  assert.match(drift.findings[1].message, /src\/rogue\.js/);

  // Base fell back to HEAD: the diff holds uncommitted work only, so
  // "untouched" is not measured and says why.
  const fallback = analyzePlanDeliveryDrift({ plannedPaths: ['src/feature.js'], changeSet: { ...changeSet, baseSource: 'fallback (uncommitted changes only)' } });
  assert.deepEqual(fallback.untouched, []);
  assert.ok(fallback.findings.some((f) => f.check === 'delivery_drift_base_fallback' && f.severity === 'info'));
});

test('pre-implementation spec:analyze keeps its semantics: a planned create path that does not exist is not a finding', async () => {
  const slug = 'pre';
  const dir = await featureRepo(slug);
  const report = await runSpecAnalyze({ args: [dir], options: { feature: slug }, logger });
  assert.equal(report.ok, true, JSON.stringify(report.findings));
  assert.equal(report.stage, null);
  assert.equal(report.delivery_drift, undefined);
  assert.equal(findingsBy(report, 'capability_delivery_files_missing').length, 0);
});

test('--stage=dev: planned paths must exist (blocking) and the delivered diff is compared with the plan (advisory)', async () => {
  const slug = 'post';
  const dir = await featureRepo(slug, { planOptions: { files: `src/${slug}.js, reuse: src/lib/existing.js, tests/${slug}.test.js`, delta: [['create', `src/${slug}.js, tests/${slug}.test.js`], ['reuse', 'src/lib/existing.js']] } });

  // Nothing delivered yet: the planned create path is missing — an error the
  // dev completion owns.
  const missing = await runSpecAnalyze({ args: [dir], options: { feature: slug, stage: 'dev' }, logger });
  assert.equal(missing.ok, false);
  const missingFinding = findingsBy(missing, 'capability_delivery_files_missing');
  assert.equal(missingFinding.length, 1);
  assert.equal(missingFinding[0].stage, 'execution');
  assert.match(missingFinding[0].message, new RegExp(`src/${slug}\\.js`));

  // Delivered: the planned file, its test, a lockfile, and a file no plan row
  // declares. Only the rogue file is drift; the reused path is neither
  // untouched nor outside.
  await write(dir, `src/${slug}.js`, 'module.exports = () => "saved";\n');
  await write(dir, `tests/${slug}.test.js`, `require('node:test')('AC-${slug}-01', () => {});\n`);
  await write(dir, 'package-lock.json', '{}\n');
  await write(dir, 'src/rogue.js', 'module.exports = 2;\n');
  const delivered = await runSpecAnalyze({ args: [dir], options: { feature: slug, stage: 'dev' }, logger });
  assert.equal(delivered.ok, true, JSON.stringify(delivered.findings));
  assert.equal(delivered.stage, 'dev');
  assert.match(delivered.delivery_drift.base_source, /parent of first feature commit/);
  assert.deepEqual(delivered.delivery_drift.reused, ['src/lib/existing.js']);
  assert.equal(findingsBy(delivered, 'plan_path_untouched').length, 0);
  const outside = findingsBy(delivered, 'delivery_outside_plan');
  assert.equal(outside.length, 1);
  assert.equal(outside[0].severity, 'warning');
  assert.match(outside[0].message, /A src\/rogue\.js/);
  assert.doesNotMatch(outside[0].message, /package-lock|tests\//);

  // A planned path that exists but never changed since the feature began.
  const slug2 = 'untouched';
  const dir2 = await featureRepo(slug2, { planOptions: { files: 'src/lib/existing.js', delta: [['modify', 'src/lib/existing.js']] } });
  const untouched = await runSpecAnalyze({ args: [dir2], options: { feature: slug2, stage: 'dev' }, logger });
  assert.equal(untouched.ok, true, JSON.stringify(untouched.findings));
  const stale = findingsBy(untouched, 'plan_path_untouched');
  assert.equal(stale.length, 1);
  assert.match(stale[0].message, /src\/lib\/existing\.js/);
});

function devState(slug) {
  return {
    version: 1, mode: 'feature', featureSlug: slug, classification: 'SMALL',
    sequence: ['product', 'planner', 'dev', 'qa'], completed: ['product', 'planner'], skipped: [],
    current: 'dev', next: 'qa', detour: null
  };
}

async function workflowScaffold(dir, slug) {
  await write(dir, '.aioson/context/project-pulse.md', '# Pulse\n');
  await write(dir, '.aioson/context/dev-state.md', `---\nactive_feature: ${slug}\nstatus: in_progress\n---\n# Dev State\n`);
  await write(dir, `.aioson/plans/${slug}/harness-contract.json`, JSON.stringify({
    feature: slug,
    governor: {},
    criteria: [{ id: 'RG-1', description: 'runtime gate', assertion: 'app boots', binary: true, verification: 'node -e "process.exit(0)"' }]
  }, null, 2));
  await write(dir, `.aioson/plans/${slug}/progress.json`, JSON.stringify({
    feature: slug, phase: 1, status: 'in_progress', ready_for_done_gate: true, completed_steps: [], circuit_state: 'CLOSED'
  }, null, 2));
}

test('the tracked @dev completion surfaces code-vs-plan drift as advisory in the canonical route (a missing planned path is blocked upstream)', async () => {
  const slug = 'gate';
  const dir = await featureRepo(slug);
  await workflowScaffold(dir, slug);
  await write(dir, `tests/${slug}.test.js`, `require('node:test')('AC-${slug}-01', () => {});\n`);
  const { config } = await readWorkflowConfig(dir);

  // The planned src file was never created: blocked, and the message names
  // it. The handoff contract runs first and owns that block (it folds the
  // execution-stage completeness in); the scope-drift gate would name the same
  // finding if it ever got there.
  await assert.rejects(
    () => finalizeCurrentStage(dir, config, devState(slug), 'dev'),
    (err) => /BLOCKED/.test(err.message) && /capability_delivery_files_missing/.test(err.message) && new RegExp(`src/${slug}\\.js`).test(err.message)
  );

  // Delivered, plus a file outside the plan: completes, and the drift rides the result.
  await write(dir, `src/${slug}.js`, 'module.exports = () => "saved";\n');
  await write(dir, 'src/rogue.js', 'module.exports = 2;\n');
  const result = await finalizeCurrentStage(dir, config, devState(slug), 'dev');
  assert.equal(result.completedStage, 'dev');
  assert.ok(result.scopeDrift, 'expected a scopeDrift summary on the finalize result');
  assert.deepEqual(result.scopeDrift.blocking, []);
  assert.ok(result.scopeDrift.advisories.some((line) => /delivery_outside_plan/.test(line) && /src\/rogue\.js/.test(line)), result.scopeDrift.advisories.join('\n'));
  assert.equal(result.scopeDrift.report, `.aioson/context/spec-analyze-${slug}.json`);
});
