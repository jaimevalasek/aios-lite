'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runGateCheck } = require('../src/commands/gate-check');
const { runGateApprove } = require('../src/commands/gate-approve');
const { runPreflight } = require('../src/commands/preflight');
const { runArtifactValidate } = require('../src/commands/artifact-validate');
const {
  approveAndSealSheldonReview,
  qaExecutionReport
} = require('./helpers/feature-evidence');

async function tmp() { return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-gate-check-')); }
async function write(root, rel, body) {
  const file = path.join(root, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body, 'utf8');
}
const logger = { log() {}, error() {} };

function prd(readiness = 'approved') {
  return `---\nclassification: SMALL\nfeature_completeness: required\nproduct_scope: approved\nprd_ready: ${readiness}\nsheldon_review: pending\nprototype: null\nprototype_status: none\nprototype_feature: null\n---\n# Demo\n\n## Feature Capability Map\n\n| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |\n|---|---|---|---|---|\n| CAP-demo-01 | User sees saved result | User submits | required | Core promise |\n\n## Current System Fit\n\n| CAP | Existing behavior / evidence | Fit decision | Required product delta |\n|---|---|---|---|\n| CAP-demo-01 | No existing behavior after inspecting package.json | new | Add the saved result through the real app |\n\n## Acceptance Criteria\n\n| AC | CAP | Observable behavior | Evidence |\n|---|---|---|---|\n| AC-demo-01 | CAP-demo-01 | Saved result appears | automated integration test |\n`;
}
function plan(status = 'pending') {
  return `---\nstatus: ${status}\n---\n# Plan\n\n## Engineering Controls\n\n| Concern | Evidence / trigger | Planned control | Verification | Recovery |\n|---|---|---|---|---|\n| compatibility | package.json establishes the current Node runtime | Preserve the existing module contract | node --test | Revert the additive change; no persistent data |\n\n## Implementation Delta\n\n| CAP | Action | Existing evidence | Exact paths | Required change |\n|---|---|---|---|---|\n| CAP-demo-01 | create | Inspected the nearest boundary from package.json | src/demo.js, tests/demo.test.js | Add implementation and AC-linked coverage |\n\n## Capability Delivery Plan\n\n| CAP | Phase | Files | Verification |\n|---|---|---|---|\n| CAP-demo-01 | 1 | src/demo.js, tests/demo.test.js | node --test |\n`;
}
async function seed(root, { readiness = 'approved', status = 'pending' } = {}) {
  await write(root, '.aioson/context/project.context.md', '---\nclassification: SMALL\n---\n');
  await write(root, '.aioson/context/prd-demo.md', prd(readiness));
  await approveAndSealSheldonReview(root);
  await write(root, '.aioson/context/implementation-plan-demo.md', plan(status));
}

test('gate:check validates required CLI arguments', async () => {
  const root = await tmp();
  assert.equal((await runGateCheck({ args: [root], options: { json: true, gate: 'A' }, logger })).reason, 'missing_feature');
  assert.equal((await runGateCheck({ args: [root], options: { json: true, feature: 'demo' }, logger })).reason, 'missing_gate');
  assert.equal((await runGateCheck({ args: [root], options: { json: true, feature: 'demo', gate: 'Z' }, logger })).reason, 'invalid_gate');
});

test('Gate A validates product capability scope in the PRD', async () => {
  const root = await tmp();
  await seed(root);
  const result = await runGateCheck({ args: [root], options: { json: true, feature: 'demo', gate: 'A' }, logger });
  assert.equal(result.result, 'PASS');
  assert.match(result.recommendation, /@product/);
});

test('Gate B validates acceptance criteria and routes to Sheldon', async () => {
  const root = await tmp();
  await seed(root);
  const result = await runGateCheck({ args: [root], options: { json: true, feature: 'demo', gate: 'B' }, logger });
  assert.equal(result.result, 'PASS');
  assert.match(result.recommendation, /@sheldon/);
});

test('Gate C requires one complete implementation plan for SMALL and MEDIUM', async () => {
  const root = await tmp();
  await write(root, '.aioson/context/project.context.md', '---\nclassification: MEDIUM\n---\n');
  await write(root, '.aioson/context/prd-demo.md', prd('approved'));
  await approveAndSealSheldonReview(root);
  let result = await runGateCheck({ args: [root], options: { json: true, feature: 'demo', gate: 'C' }, logger });
  assert.equal(result.result, 'BLOCKED');
  assert.match(result.recommendation, /@planner/);
  await write(root, '.aioson/context/implementation-plan-demo.md', plan());
  result = await runGateCheck({ args: [root], options: { json: true, feature: 'demo', gate: 'C' }, logger });
  assert.equal(result.result, 'PASS');
  assert.match(result.recommendation, /@dev/);
});

// AC-lineage-014
test('Gate C routes review and lineage failures to their causal owners', async () => {
  const reviewRoot = await tmp();
  await seed(reviewRoot, { status: 'approved' });
  await fs.appendFile(path.join(reviewRoot, '.aioson/context/prd-demo.md'), '\n<!-- changed after review -->\n');
  const staleReview = await runGateCheck({
    args: [reviewRoot],
    options: { json: true, feature: 'demo', gate: 'C' },
    logger
  });
  assert.equal(staleReview.result, 'BLOCKED');
  assert.match(staleReview.recommendation, /@sheldon/);

  const lineageRoot = await tmp();
  await seed(lineageRoot, { status: 'approved' });
  const prdPath = path.join(lineageRoot, '.aioson/context/prd-demo.md');
  await fs.appendFile(prdPath, `

## Source Coverage
| Promise | Product decision | CAP / AC | Evidence / rationale |
|---|---|---|---|
| PROM-demo-01 | required | CAP-demo-01 / AC-demo-01 | Preserved |
`);
  await approveAndSealSheldonReview(lineageRoot);
  await write(lineageRoot, '.aioson/briefings/demo/briefings.md', `---
source_plans: ["plans/demo/missing.md"]
---

### Source Inventory
| Source | Path | Fingerprint | Purpose |
|---|---|---|---|
| SRC-demo-01 | plans/demo/missing.md | sha256:${'a'.repeat(64)} | Required source |

### Source Promise Map
| Promise | Source | Approved intent | State |
|---|---|---|---|
| PROM-demo-01 | SRC-demo-01 | Saved result | required |
`);
  const missingSource = await runGateCheck({
    args: [lineageRoot],
    options: { json: true, feature: 'demo', gate: 'C' },
    logger
  });
  assert.equal(missingSource.result, 'BLOCKED');
  assert.match(missingSource.recommendation, /briefing:migrate-lineage/);
});

// AC-lineage-018
test('Gate C recovers a missing legacy checkpoint from post-plan path evidence and rejects a newer plan', async () => {
  const root = await tmp();
  await seed(root, { status: 'approved' });

  await write(root, 'src/demo.js', 'module.exports = () => true;\n');
  const planPath = path.join(root, '.aioson/context/implementation-plan-demo.md');
  const sourcePath = path.join(root, 'src/demo.js');
  const oldTime = new Date('2026-07-27T10:00:00.000Z');
  const newTime = new Date('2026-07-27T10:01:00.000Z');
  await fs.utimes(planPath, oldTime, oldTime);
  await fs.utimes(sourcePath, newTime, newTime);
  let result = await runGateCheck({
    args: [root],
    options: { json: true, feature: 'demo', gate: 'C' },
    logger
  });
  assert.equal(result.result, 'PASS');
  assert.equal(
    result.evidence.find((item) => item.type === 'gate_c_baseline').mode,
    'recovered_execution'
  );
  const recoveredPreflight = await runPreflight({
    args: [root],
    options: { json: true, agent: 'dev', feature: 'demo' },
    logger
  });
  const recoveredArtifact = await runArtifactValidate({
    args: [root],
    options: { json: true, feature: 'demo' },
    logger
  });
  assert.equal(recoveredPreflight.gate_c_baseline.mode, 'recovered_execution');
  assert.equal(recoveredPreflight.readiness, 'READY');
  assert.equal(recoveredArtifact.gate_c_baseline.mode, 'recovered_execution');
  assert.equal(recoveredArtifact.integrity, 'VALID');

  const approved = await runGateApprove({
    args: [root],
    options: { json: true, feature: 'demo', gate: 'C', agent: 'planner' },
    logger
  });
  assert.equal(approved.ok, true);
  assert.equal(approved.checkpoint_written, true);

  await write(root, 'tests/demo.test.js', "const test=require('node:test'); test('AC-demo-01',()=>{});\n");
  result = await runGateCheck({
    args: [root],
    options: { json: true, feature: 'demo', gate: 'C' },
    logger
  });
  assert.equal(result.result, 'PASS');

  const preflight = await runPreflight({
    args: [root],
    options: { json: true, agent: 'dev', feature: 'demo' },
    logger
  });
  assert.equal(
    preflight.readiness_blockers.some((item) => item.includes('implementation_delta_create_path_exists')),
    false
  );

  await write(
    root,
    '.aioson/context/implementation-plan-demo.md',
    `${plan('approved')}\n<!-- revised after Gate C approval -->\n`
  );
  result = await runGateCheck({
    args: [root],
    options: { json: true, feature: 'demo', gate: 'C' },
    logger
  });
  assert.equal(result.result, 'BLOCKED');
  assert.ok(result.missing.some((item) => item.includes('gate_c_recovery_plan_newer_than_execution')));
  assert.match(result.recommendation, /revalidate implementation-plan-demo\.md/);
});

test('Gate D requires plan approval, QA PASS, real files, and AC-linked assertions', async () => {
  const root = await tmp();
  await seed(root, { readiness: 'approved', status: 'approved' });
  await write(root, 'src/demo.js', 'module.exports = () => true;\n');
  await write(root, 'tests/demo.test.js', "const test=require('node:test'); const assert=require('node:assert/strict'); test('AC-demo-01',()=>assert.equal(true,true));\n");
  await write(root, '.aioson/context/qa-report-demo.md', qaExecutionReport());
  const result = await runGateCheck({ args: [root], options: { json: true, feature: 'demo', gate: 'D' }, logger });
  assert.equal(result.result, 'PASS');
});

test('Gate D rejects a PASS label without AC test evidence', async () => {
  const root = await tmp();
  await seed(root, { readiness: 'approved', status: 'approved' });
  await write(root, 'src/demo.js', 'module.exports = () => true;\n');
  await write(root, 'tests/demo.test.js', "const test=require('node:test'); test('unrelated',()=>{});\n");
  await write(root, '.aioson/context/qa-report-demo.md', qaExecutionReport());
  const result = await runGateCheck({ args: [root], options: { json: true, feature: 'demo', gate: 'D' }, logger });
  assert.equal(result.result, 'BLOCKED');
  assert.ok(result.missing.some((item) => item.includes('AC test audit')));
});
