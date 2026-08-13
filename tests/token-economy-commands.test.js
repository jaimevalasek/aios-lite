'use strict';

// Tests for the Onda 2 token-economy wrappers: commands that expose engines the
// codebase already had (analyzeFeatureCompleteness, resolveAutopilotSignal,
// analyzeCoverage, detectFramework, buildReviewPayload) so agent prompts stop
// re-deriving their outputs by hand.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runFeatureTrace } = require('../src/commands/feature-trace');
const { runWorkflowMode } = require('../src/commands/workflow-mode');
const { runSetupDetect } = require('../src/commands/setup-detect');
const { runFeatureDiff } = require('../src/commands/feature-diff');
const { runGenomeApply } = require('../src/commands/genome-apply');
const { runPentesterCoverage } = require('../src/commands/pentester-report');
const { runFeatureCurrent } = require('../src/commands/feature-current');
const { createTranslator } = require('../src/i18n');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: (m = '') => lines.push(String(m)), lines };
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-token-economy-'));
}

async function write(dir, rel, content) {
  const full = path.join(dir, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

const SLUG = 'trace-demo';

const PRD = `---
feature: ${SLUG}
---
# Trace Demo

## Goal
Prove the chain end to end.

## Feature Capability Map
| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-1 | order is saved | user clicks save | required | core promise |

## Acceptance Criteria
| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-1 | CAP-1 | saving persists the order | run the save test |
`;

const PLAN = `---
feature: ${SLUG}
status: approved
---
# Implementation Plan

## Capability Delivery Plan
| CAP | Phase | Files | Verification |
|---|---|---|---|
| CAP-1 | 1 | src/orders/save.js | node --test tests/orders/save.test.js |
`;

test('feature:trace projects the PROM→CAP→AC→phase→files chain from the engine', async () => {
  const dir = await makeTmpDir();
  await write(dir, `.aioson/context/prd-${SLUG}.md`, PRD);
  await write(dir, `.aioson/context/implementation-plan-${SLUG}.md`, PLAN);

  const result = await runFeatureTrace({ args: [dir], options: { feature: SLUG, json: true }, logger: makeLogger() });
  assert.equal(result.ok, true);
  assert.equal(result.caps.length, 1);
  const cap = result.caps[0];
  assert.equal(cap.cap, 'CAP-1');
  assert.equal(cap.required, true);
  assert.deepEqual(cap.acs, ['AC-1']);
  assert.equal(cap.delivery.length, 1);
  assert.equal(cap.delivery[0].phase, '1');
  assert.match(cap.delivery[0].verification, /save\.test\.js/);
  assert.equal(result.acs.length, 1);
});

test('feature:trace requires --feature and degrades cleanly on an empty project', async () => {
  const missing = await runFeatureTrace({ args: [await makeTmpDir()], options: { json: true }, logger: makeLogger() });
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'missing_feature');

  const empty = await runFeatureTrace({ args: [await makeTmpDir()], options: { feature: 'nothing-here', json: true }, logger: makeLogger() });
  assert.equal(empty.ok, true);
  assert.deepEqual(empty.caps, []);
  assert.deepEqual(empty.promises, []);
});

test('workflow:mode applies the activation-flag precedence (--step beats --auto)', async () => {
  const dir = await makeTmpDir();
  const step = await runWorkflowMode({ args: [dir], options: { step: true, auto: true, json: true }, logger: makeLogger() });
  assert.equal(step.enabled, false);
  assert.equal(step.source, 'activation_step');

  const auto = await runWorkflowMode({ args: [dir], options: { auto: true, json: true }, logger: makeLogger() });
  assert.equal(auto.enabled, true);
  assert.equal(auto.source, 'activation_auto');

  const none = await runWorkflowMode({ args: [dir], options: { json: true }, logger: makeLogger() });
  assert.equal(none.enabled, false);
});

test('setup:detect reads the detector engine (Next.js via package.json) and reports null cleanly', async () => {
  const dir = await makeTmpDir();
  await write(dir, 'package.json', JSON.stringify({ dependencies: { next: '^15.0.0' } }));
  await write(dir, 'next.config.js', 'module.exports = {};');
  const detected = await runSetupDetect({ args: [dir], options: { json: true }, logger: makeLogger() });
  assert.equal(detected.ok, true);
  assert.equal(detected.framework, 'Next.js');
  assert.equal(detected.installed, true);
  assert.ok(detected.matches.length >= 1);

  const empty = await runSetupDetect({ args: [await makeTmpDir()], options: { json: true }, logger: makeLogger() });
  assert.equal(empty.ok, true);
  assert.equal(empty.framework, null);
  assert.equal(empty.monorepo, false);
});

test('feature:diff returns the base resolution shape without side effects (git-less dir degrades)', async () => {
  const dir = await makeTmpDir();
  const result = await runFeatureDiff({ args: [dir], options: { feature: 'any', json: true }, logger: makeLogger() });
  // no git repo -> honest failure with the shape intact, never a fabricated diff
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'git_unavailable');
  assert.ok('base' in result && 'base_source' in result);
  assert.ok(Array.isArray(result.changed_files));
  assert.ok(Array.isArray(result.untracked));
  // nothing written into the temp dir
  const entries = await fs.readdir(dir);
  assert.deepEqual(entries, []);

  const missing = await runFeatureDiff({ args: [dir], options: { json: true }, logger: makeLogger() });
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'missing_feature');
});

test('genome:apply validates arguments and fails cleanly without a squad manifest', async () => {
  const dir = await makeTmpDir();
  const missingArgs = await runGenomeApply({ args: [dir], options: { json: true }, logger: makeLogger() });
  assert.equal(missingArgs.ok, false);
  assert.equal(missingArgs.reason, 'missing_arguments');

  const noSquad = await runGenomeApply({ args: [dir], options: { genome: 'g', squad: 'nope', json: true }, logger: makeLogger() });
  assert.equal(noSquad.ok, false);
  assert.equal(noSquad.reason, 'apply_failed');
  assert.match(noSquad.error, /manifest/i);
});

test('pentester:coverage computes the deterministic verdict from the persisted artifact (no HTML)', async () => {
  const dir = await makeTmpDir();
  const { t } = createTranslator('en');
  const artifact = {
    feature_slug: 'sec-demo',
    generated_at: '2026-08-13T00:00:00.000Z',
    review_contract: { run_id: 'run-1', report_mode: 'none', coverage_required: ['A01'] },
    coverage: [
      { control_id: 'A01', status: 'passed', evidence: ['checked authz on /orders'] },
      { control_id: 'A02', status: 'not_tested' }
    ],
    findings: []
  };
  await write(dir, '.aioson/context/security-findings-sec-demo.json', JSON.stringify(artifact));

  const result = await runPentesterCoverage({ args: [dir], options: { feature: 'sec-demo', json: true }, logger: makeLogger(), t });
  assert.equal(result.ok, true);
  assert.equal(typeof result.complete, 'boolean');
  assert.ok(Array.isArray(result.missing_required));
  assert.ok(Array.isArray(result.not_tested));
  assert.ok(result.rows_total >= 2);
  // A02 not_tested without reason must be surfaced, so the run cannot claim complete
  assert.equal(result.complete, false);

  const missing = await runPentesterCoverage({ args: [dir], options: { feature: 'absent-run', json: true }, logger: makeLogger(), t });
  assert.equal(missing.ok, false);
  // the CLI failure path sets process.exitCode for the binary; clear it so the
  // in-process test run is not marked failed by a deliberately exercised error
  process.exitCode = 0;
});

test('feature:current --with-summary extracts title/goal/artifact paths for the relevance gate', async () => {
  const dir = await makeTmpDir();
  await write(dir, '.aioson/context/project-pulse.md', '---\nactive_feature: trace-demo\n---\n');
  await write(dir, `.aioson/context/prd-${SLUG}.md`, PRD);
  await write(dir, `.aioson/context/implementation-plan-${SLUG}.md`, PLAN);

  const result = await runFeatureCurrent({ args: [dir], options: { json: true, 'with-summary': true }, logger: makeLogger() });
  assert.equal(result.slug, SLUG);
  assert.equal(result.summary.title, 'Trace Demo');
  assert.match(result.summary.goal, /Prove the chain/);
  assert.equal(result.summary.artifact_paths.prd, `.aioson/context/prd-${SLUG}.md`);
  assert.equal(result.summary.artifact_paths.implementation_plan, `.aioson/context/implementation-plan-${SLUG}.md`);
  assert.equal(result.summary.artifact_paths.qa_report, null);

  // without the flag the payload keeps its old shape
  const plain = await runFeatureCurrent({ args: [dir], options: { json: true }, logger: makeLogger() });
  assert.equal('summary' in plain, false);
});
