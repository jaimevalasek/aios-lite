'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeTestReport, MANDATORY_SECTIONS, HYPOTHESIS_CLASSES } = require('../src/lib/test-report-lint');
const { runVerifyArtifact, availableKinds } = require('../src/commands/verify-artifact');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

const SLUG = 'demo-feature';

function goodReport({ matrix, commands, residual } = {}) {
  return `---
feature: ${SLUG}
---

# Test report — Demo Feature

## Scope

QA recorded a coverage trigger on the cancellation flow; tested paths: src/orders/cancel.js, src/orders/refund.js.

## Hypothesis matrix

${matrix ?? `| Path | Class | Test | Result |
|---|---|---|---|
| src/orders/cancel.js | boundary | rejects cancel on already-cancelled order | PASS |
| src/orders/cancel.js | failure | refund API timeout leaves order state untouched | PASS |
| src/orders/refund.js | invariant | refund total never exceeds captured total | PASS |`}

## Tests added or changed

- tests/orders/cancel-boundary.test.js (new, 3 tests)

## Commands and results

${commands ?? '- `npm test -- tests/orders/cancel-boundary.test.js`: PASS (exit code 0)'}

## Residual risk

${residual ?? '- Concurrent cancel+refund race not covered — needs a harness the project does not have; returned to QA as residual.'}
`;
}

test('a well-formed test report measures clean', () => {
  const result = analyzeTestReport({ report: goodReport(), slug: SLUG });
  assert.deepEqual(result.issues, []);
  assert.equal(result.metrics.sections_present, MANDATORY_SECTIONS.length);
  assert.equal(result.metrics.hypotheses_total, 3);
  assert.equal(result.metrics.hypotheses_by_class.boundary, 1);
  assert.equal(result.metrics.has_command_evidence, true);
  assert.equal(result.metrics.residual_risk_entries, 1);
});

test('missing mandatory sections and feature mismatch are issues', () => {
  const text = goodReport().replace('## Residual risk', '## Riscos').replace(`feature: ${SLUG}`, 'feature: other-slug');
  const result = analyzeTestReport({ report: text, slug: SLUG });
  assert.ok(result.issues.some((i) => i.includes('## Residual risk')));
  assert.ok(result.issues.some((i) => i.includes('does not match')));
});

test('an invalid hypothesis class is an issue; the enum is pinned', () => {
  const result = analyzeTestReport({
    report: goodReport({
      matrix: '| Path | Class | Test | Result |\n|---|---|---|---|\n| src/a.js | vibes | looks fine | PASS |'
    }),
    slug: SLUG
  });
  assert.equal(result.metrics.hypotheses_invalid_class, 1);
  assert.ok(result.issues.some((i) => i.includes('invalid class "vibes"')));
  assert.deepEqual(HYPOTHESIS_CLASSES, ['boundary', 'invariant', 'state-transition', 'failure', 'regression', 'property']);
});

test('a matrix without boundary or failure rows is the adversarial-floor warning', () => {
  const result = analyzeTestReport({
    report: goodReport({
      matrix: '| Path | Class | Test | Result |\n|---|---|---|---|\n| src/a.js | regression | bug #42 stays fixed | PASS |'
    }),
    slug: SLUG
  });
  assert.deepEqual(result.issues, []);
  assert.ok(result.warnings.some((w) => w.includes('no boundary or failure class')));
});

test('commands without an exact command or result marker are an issue; FAIL is legal evidence', () => {
  const noEvidence = analyzeTestReport({
    report: goodReport({ commands: 'Everything was run and worked well.' }),
    slug: SLUG
  });
  assert.ok(noEvidence.issues.some((i) => i.includes('exact executed command')));

  const failEvidence = analyzeTestReport({
    report: goodReport({ commands: '- `npm test -- tests/orders`: FAIL (1 failing) — reproduction routed to Dev' }),
    slug: SLUG
  });
  assert.ok(!failEvidence.issues.some((i) => i.includes('exact executed command')), 'a recorded FAIL is valid evidence');
});

test('placeholders are issues; an empty residual-risk section is a warning', () => {
  const dirty = analyzeTestReport({ report: goodReport().replace('## Scope\n', '## Scope\n\nTODO: describe scope.\n'), slug: SLUG });
  assert.ok(dirty.issues.some((i) => i.includes('placeholder')));

  const empty = analyzeTestReport({ report: goodReport({ residual: '' }), slug: SLUG });
  assert.equal(empty.metrics.residual_risk_entries, 0);
  assert.ok(empty.warnings.some((w) => w.includes('fully proven')));
});

test('a correction packet without allowed_fix_paths is an issue', () => {
  const packet = `${goodReport()}
## Correction packet

- Affected AC: AC-cancel-02
- Reproduction: cancel twice, second call double-refunds
- Expected: second call rejected with 409
`;
  const result = analyzeTestReport({ report: packet, slug: SLUG });
  assert.ok(result.issues.some((i) => i.includes('allowed_fix_paths')));

  const complete = analyzeTestReport({
    report: `${packet}- allowed_fix_paths:\n  - src/orders/cancel.js\n`,
    slug: SLUG
  });
  assert.ok(!complete.issues.some((i) => i.includes('allowed_fix_paths')));
});

// ── adapter wiring ──

test('kind=test-report is registered and requires a slug', async () => {
  assert.ok(availableKinds().includes('test-report'));
  const logger = makeLogger();
  const res = await runVerifyArtifact({ args: ['.'], options: { kind: 'test-report', json: true, suppressExitCode: true }, logger });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'missing_slug');
});

test('kind=test-report measures a real report on disk end to end', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-test-report-lint-'));
  try {
    await fs.mkdir(path.join(dir, '.aioson/context'), { recursive: true });
    await fs.writeFile(path.join(dir, '.aioson/context', `test-report-${SLUG}.md`), goodReport(), 'utf8');

    const logger = makeLogger();
    const res = await runVerifyArtifact({
      args: [dir],
      options: { kind: 'test-report', slug: SLUG, json: true, advisory: true, suppressExitCode: true },
      logger
    });
    assert.equal(res.ok, true, JSON.stringify(res.issues));
    assert.equal(res.exitCode, 0);
    assert.equal(res.metrics.hypotheses_total, 3);

    const missing = await runVerifyArtifact({
      args: [dir],
      options: { kind: 'test-report', slug: 'ghost', json: true, advisory: true, suppressExitCode: true },
      logger
    });
    assert.equal(missing.ok, false);
    assert.ok(missing.issues.some((i) => i.includes('test report not found')));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
