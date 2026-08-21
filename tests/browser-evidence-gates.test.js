'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { readBrowserEvidence, browserEvidenceFor, browserEvidenceBlock, formatBrowserEvidence } = require('../src/lib/browser-evidence');
const { auditAcceptanceCriteriaTests } = require('../src/lib/ac-test-audit');
const { analyzeFeatureCompleteness } = require('../src/lib/feature-completeness');
const { qaExecutionReport } = require('./helpers/feature-evidence');

async function tmp() { return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-browser-evidence-')); }
async function write(root, rel, body) {
  const file = path.join(root, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof body === 'string' ? body : `${JSON.stringify(body, null, 2)}\n`, 'utf8');
}

function walkthroughReport({ name = 'orders-create', ids = {}, ok = true, finishedAt = '2026-08-21T10:00:00.000Z', scope = 'delivery' } = {}) {
  return {
    schema: 1,
    name,
    feature: 'demo',
    scope,
    target: { url: 'http://127.0.0.1:3000/', kind: 'url' },
    browser: { mode: 'chrome', label: 'Google Chrome (installed, channel=chrome)', version: '140' },
    started_at: finishedAt,
    finished_at: finishedAt,
    ok,
    stopped_at: null,
    steps: [],
    ids,
    smoke: {},
    console: { errors: 0, warnings: 0, page_errors: 0, samples: [] },
    network: { requests: 0, failed: 0, rows: [] },
    warnings: []
  };
}

const PRD = `---
classification: SMALL
feature_completeness: required
prototype: null
prototype_status: none
prototype_feature: null
---
# Demo

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-demo-01 | User completes the core outcome | User submits | required | Approved scope |

## Current System Fit

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-demo-01 | No existing behavior after inspecting package.json | new | Add the approved outcome through the normal entry point |

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-demo-01 | CAP-demo-01 | Result appears in the real application | runtime smoke in the browser |
`;

const PLAN = `---
status: approved
---
# Plan

## Engineering Controls

| Concern | Evidence / trigger | Planned control | Verification | Recovery |
|---|---|---|---|---|
| compatibility | package.json establishes the current Node runtime | Preserve the existing module contract | node --test | Revert the additive change; no persistent data |

## Implementation Delta

| CAP | Action | Existing evidence | Exact paths | Required change |
|---|---|---|---|---|
| CAP-demo-01 | create | Inspected the nearest boundary from package.json | src/demo.js, tests/demo.test.js | Deliver the approved outcome through the existing project structure |

## Capability Delivery Plan

| CAP | Phase | Files | Verification |
|---|---|---|---|
| CAP-demo-01 | 1 | src/demo.js, tests/demo.test.js | node --test |
`;

async function seedFeature(root) {
  await write(root, '.aioson/context/project.context.md', '---\nclassification: SMALL\n---\n');
  await write(root, '.aioson/context/prd-demo.md', PRD);
  await write(root, '.aioson/context/implementation-plan-demo.md', PLAN);
  await write(root, 'src/demo.js', 'module.exports = true;\n');
  await write(root, 'tests/demo.test.js', 'module.exports = true;\n');
}

test('the evidence reader takes the latest measurement per id and ignores prototype reports', async () => {
  const root = await tmp();
  await write(root, '.aioson/context/features/demo/browser/first.json', walkthroughReport({ name: 'first', ids: { 'AC-demo-01': { status: 'fail', steps: [2], error: 'boom' }, 'AC-demo-02': { status: 'pass', steps: [3] } }, ok: false, finishedAt: '2026-08-21T09:00:00.000Z' }));
  await write(root, '.aioson/context/features/demo/browser/second.json', walkthroughReport({ name: 'second', ids: { 'ac-demo-01': { status: 'pass', steps: [1] } }, finishedAt: '2026-08-21T11:00:00.000Z' }));
  await write(root, '.aioson/context/features/demo/browser/proto.json', walkthroughReport({ name: 'proto', scope: 'prototype', ids: { 'AC-demo-03': { status: 'pass', steps: [0] } } }));
  await write(root, '.aioson/context/features/demo/browser/notes.md', '# not a report\n');

  const evidence = readBrowserEvidence(root, 'demo');
  assert.deepEqual(evidence.reports.map((r) => r.name), ['first', 'second']);
  assert.equal(evidence.ids.get('AC-DEMO-01').status, 'pass', 'the later walkthrough wins');
  assert.equal(evidence.ids.get('AC-DEMO-01').name, 'second');
  assert.equal(evidence.ids.get('AC-DEMO-02').status, 'pass');
  assert.equal(evidence.ids.has('AC-DEMO-03'), false, 'prototype scope never counts as delivery evidence');
  assert.equal(browserEvidenceFor('AC-demo-01', evidence)[0].kind, 'browser');
  assert.deepEqual(browserEvidenceFor('AC-demo-09', evidence), []);

  const block = browserEvidenceBlock(root, 'demo');
  assert.equal(block.measured, true);
  assert.equal(block.reports.length, 2);
  assert.match(formatBrowserEvidence(block), /2 walkthrough\(s\), 2 id\(s\) proven — latest "second" PASS on Google Chrome/);
  const empty = browserEvidenceBlock(root, 'other');
  assert.equal(empty.measured, false);
  assert.match(formatBrowserEvidence(empty), /never driven in a real browser/);
});

test('the archived dossier slot is read after feature:close moved the evidence', async () => {
  const root = await tmp();
  await write(root, '.aioson/context/done/demo/dossier/browser/run.json', walkthroughReport({ name: 'run', ids: { 'AC-demo-01': { status: 'pass', steps: [1] } } }));
  const evidence = readBrowserEvidence(root, 'demo');
  assert.equal(evidence.ids.get('AC-DEMO-01').status, 'pass');
  assert.equal(evidence.ids.get('AC-DEMO-01').report, '.aioson/context/done/demo/dossier/browser/run.json');
});

test('ac:test-audit counts a passed walkthrough step as automated coverage for the AC', async () => {
  const root = await tmp();
  await seedFeature(root);
  let audit = await auditAcceptanceCriteriaTests(root, 'demo', { requireCriteria: true });
  assert.equal(audit.ok, false);
  assert.deepEqual(audit.missing, ['AC-demo-01']);

  await write(root, '.aioson/context/features/demo/browser/orders-create.json', walkthroughReport({ ids: { 'AC-demo-01': { status: 'pass', steps: [2, 4] } } }));
  audit = await auditAcceptanceCriteriaTests(root, 'demo', { requireCriteria: true });
  assert.equal(audit.ok, true, JSON.stringify(audit.items));
  assert.equal(audit.summary.browser_covered, 1);
  const item = audit.items.find((row) => row.ac === 'AC-demo-01');
  assert.equal(item.status, 'covered');
  assert.equal(item.evidence[0].kind, 'browser');
  assert.match(item.evidence[0].evidence, /proved AC-DEMO-01 on the real application \(steps 2, 4\)/);

  await write(root, '.aioson/context/features/demo/browser/orders-create.json', walkthroughReport({ ids: { 'AC-demo-01': { status: 'fail', steps: [2], error: 'boundary not proven' } }, ok: false }));
  audit = await auditAcceptanceCriteriaTests(root, 'demo', { requireCriteria: true });
  assert.equal(audit.ok, false, 'a failed walkthrough is not coverage');
});

test('Gate D refuses a QA PASS that the latest walkthrough contradicts, and accepts it once replayed green', async () => {
  const root = await tmp();
  await seedFeature(root);
  await write(root, '.aioson/context/qa-report-demo.md', qaExecutionReport());

  let result = await analyzeFeatureCompleteness(root, 'demo', { includeExecution: true });
  assert.equal(result.ok, true, JSON.stringify(result.stage_findings));

  await write(root, '.aioson/context/features/demo/browser/orders-create.json', walkthroughReport({ ids: { 'AC-demo-01': { status: 'fail', steps: [3], error: 'expected text "Saved"; not on page' } }, ok: false, finishedAt: '2026-08-21T12:00:00.000Z' }));
  result = await analyzeFeatureCompleteness(root, 'demo', { includeExecution: true });
  assert.equal(result.ok, false);
  const contradiction = result.stage_findings.execution.find((item) => item.check === 'qa_pass_contradicts_browser_evidence');
  assert.ok(contradiction, JSON.stringify(result.stage_findings.execution));
  assert.match(contradiction.message, /AC-DEMO-01/);

  await write(root, '.aioson/context/features/demo/browser/replay.json', walkthroughReport({ name: 'replay', ids: { 'AC-demo-01': { status: 'pass', steps: [3] } }, finishedAt: '2026-08-21T13:00:00.000Z' }));
  result = await analyzeFeatureCompleteness(root, 'demo', { includeExecution: true });
  assert.equal(result.ok, true, JSON.stringify(result.stage_findings.execution));
});
