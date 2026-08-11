'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzePrd } = require('../src/lib/prd-lint');
const { runVerifyArtifact, availableKinds } = require('../src/commands/verify-artifact');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-prd-lint-'));
}

async function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

// A compact PRD honoring every mechanically checkable bullet of the approval
// contract. The asymmetry mirrors the visual gate: clean must stay silent.
const GOOD_PRD = `---
feature: orders
prototype: null
prototype_status: none
prototype_feature: null
---

# PRD — Orders

## Source Coverage

| PROM | Decision |
|---|---|
| PROM-001 | covered by CAP-orders-create |
| PROM-002 | not_applicable — out of approved scope |

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-orders-create | User records an order and sees it listed | User submits the order form | required | Core promise |
| CAP-orders-cancel | User cancels an order with confirmation | User clicks cancel on a listed order | required | Approved lifecycle |

## Current System Fit

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-orders-create | \`src/app.js\` exposes the entry point; no order route registered | new | Add the order route and persistence |
| CAP-orders-cancel | \`src/app.js\` has no cancel path | new | Add cancel with design-system confirmation |

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-orders-01 | CAP-orders-create | From the production entry point, submitting a valid order shows it in the list with its total | focused automated test + production-path smoke |
| AC-orders-02 | CAP-orders-cancel | Cancelling asks for confirmation and the order leaves the active list with an undo toast | integration test with fixture orders |
`;

const BAD_PRD = `---
feature: orders
prototype: null
prototype_status: current
prototype_feature: orders
---

# PRD — Orders

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-orders-create | User records an order | User submits | required | Core |
| CAP-orders-cancel | User cancels | User clicks | required | Lifecycle |

## Current System Fit

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-orders-create | there is nothing relevant today | new | Add it |

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-orders-01 | CAP-orders-create | Order appears | funciona |
| AC-orders-01 | CAP-orders-ghost | It works fine | works |

TODO: finish this section
`;

test('a contract-honoring PRD produces no findings at all', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, 'src/app.js', 'module.exports = {};\n');

  const result = analyzePrd({ prd: GOOD_PRD, briefing: 'PROM-001 ... PROM-002', targetDir: dir });
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.metrics.caps_required, 2);
  assert.equal(result.metrics.proms_covered, 2);
});

test('every mechanically checkable contract violation is an issue', () => {
  const result = analyzePrd({ prd: BAD_PRD, briefing: 'PROM-001 and PROM-002 promised', targetDir: null });
  const joined = result.issues.join('\n');

  assert.match(joined, /PROM-002/); // uncovered briefing promise (PROM-001 appears via CAP text? no — both missing)
  assert.match(joined, /required CAP\(s\) with no Current System Fit row: CAP-orders-cancel/);
  assert.match(joined, /required CAP\(s\) with no acceptance criterion: CAP-orders-cancel/);
  assert.match(joined, /AC-orders-01 cites unknown capability CAP-orders-ghost/);
  assert.match(joined, /duplicate AC id\(s\): AC-orders-01/);
  assert.match(joined, /"funciona" — "works\/integrated\/done" style assertions are not evidence/);
  assert.match(joined, /"works" — "works\/integrated\/done" style assertions are not evidence/);
  assert.match(joined, /prototype_status is `current` but `prototype` names no file/);
  assert.match(joined, /placeholder marker/);
});

test('warnings measure judgment calls: pathless evidence and missing material states', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, '.aioson/briefings/orders/prototype.html', '<html></html>');

  const prd = GOOD_PRD
    .replace('prototype: null', 'prototype: .aioson/briefings/orders/prototype.html')
    .replace('prototype_status: none', 'prototype_status: current')
    .replace(/`src\/app\.js` exposes the entry point; no order route registered/, 'nothing exists yet')
    .replace(/`src\/app\.js` has no cancel path/, 'nothing exists yet');

  const result = analyzePrd({ prd, briefing: '', targetDir: dir });
  assert.deepEqual(result.issues, []);
  const joined = result.warnings.join('\n');
  assert.match(joined, /2 Current System Fit row\(s\) cite no repository path/);
  assert.match(joined, /material state\(s\): loading, empty/);
});

test('a cited repository path that does not exist is stale evidence (warning)', async () => {
  const dir = await makeTmpDir(); // src/app.js deliberately NOT created

  const result = analyzePrd({ prd: GOOD_PRD, briefing: '', targetDir: dir });
  assert.deepEqual(result.issues, []);
  assert.match(result.warnings.join('\n'), /cited path\(s\) not found in the repository \(src\/app\.js/);
});

test('verify:artifact exposes kind=prd, resolves --slug and reads the briefing for PROM coverage', async () => {
  assert.ok(availableKinds().includes('prd'));

  const dir = await makeTmpDir();
  await writeFile(dir, 'src/app.js', 'module.exports = {};\n');
  await writeFile(dir, '.aioson/context/prd-orders.md', GOOD_PRD);
  await writeFile(dir, '.aioson/briefings/orders/briefings.md', '## Promises\n- PROM-001 record orders\n- PROM-002 cancel orders\n- PROM-003 export orders\n');

  const report = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'prd', slug: 'orders', json: true, suppressExitCode: true },
    logger: makeLogger()
  });

  assert.equal(report.kind, 'prd');
  assert.equal(report.ok, false, 'PROM-003 has no coverage decision');
  assert.match(report.issues.join('\n'), /PROM-003/);
  assert.equal(report.metrics.briefing_read, true);
  assert.equal(report.metrics.proms_total, 3);
  assert.equal(report.metrics.proms_covered, 2);
});

test('kind=prd passes a coherent PRD and says so when the file is missing', async () => {
  const dir = await makeTmpDir();
  await writeFile(dir, 'src/app.js', 'module.exports = {};\n');
  await writeFile(dir, '.aioson/context/prd-orders.md', GOOD_PRD);

  const clean = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'prd', slug: 'orders', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(clean.ok, true);
  assert.deepEqual(clean.issues, []);

  const missing = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'prd', slug: 'nope', json: true, suppressExitCode: true },
    logger: makeLogger()
  });
  assert.equal(missing.ok, false);
  assert.match(missing.issues[0], /cannot read PRD file/);
});
