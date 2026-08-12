'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeBriefing, MANDATORY_SECTIONS } = require('../src/lib/briefing-lint');
const { runVerifyArtifact, availableKinds } = require('../src/commands/verify-artifact');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

const SLUG = 'demo-feature';

function goodBriefing({ questions, sources } = {}) {
  return `---
slug: ${SLUG}
created_at: 2026-08-11
updated_at: 2026-08-11
source_plans: []
---

# Briefing — Demo Feature

## Context

An order-management back office already exists for the support team.

## Problem

When [a support agent cancels a service order], I want to [confirm the cancellation with its consequences], so I can [avoid destroying billing state by accident].

## Proposed solution

Add a confirmation step to the cancellation flow, reusing the existing modal component.

## Themes

### Theme 1 — Confirmation flow
- Modal from the project design system before the mutation fires.

## Risks

- The cancellation endpoint is shared with the billing batch job.

## Identified gaps

- TBD — not discussed in this session.

## Sources

${sources || 'Conversational — seed from user idea.'}

## Open questions

${questions || '1. [decision-required] Should cancellation require a reason code?\n2. [research-able] Does the billing batch tolerate mid-flight cancellations?'}
`;
}

const GOOD_CONFIG = `---
updated_at: 2026-08-11
briefings:
  - slug: ${SLUG}
    status: draft
    source_plans: []
    created_at: "2026-08-11"
---
`;

test('a well-formed briefing measures clean', () => {
  const result = analyzeBriefing({ briefing: goodBriefing(), config: GOOD_CONFIG, slug: SLUG });
  assert.deepEqual(result.issues, []);
  assert.equal(result.metrics.sections_present, MANDATORY_SECTIONS.length);
  assert.equal(result.metrics.open_questions_total, 2);
  assert.equal(result.metrics.open_questions_by_class['decision-required'], 1);
  assert.equal(result.metrics.registry_status, 'draft');
});

test('missing mandatory sections and slug mismatch are issues', () => {
  const text = goodBriefing().replace('## Risks', '## Perigos').replace(`slug: ${SLUG}`, 'slug: other-slug');
  const result = analyzeBriefing({ briefing: text, config: GOOD_CONFIG, slug: SLUG });
  assert.ok(result.issues.some((i) => i.includes('## Risks')));
  assert.ok(result.issues.some((i) => i.includes('does not match')));
});

test('an unclassified open question is an issue; a classified one is not', () => {
  const result = analyzeBriefing({
    briefing: goodBriefing({ questions: '1. Should we ask billing first?\n2. [testable] Does the endpoint reject double-cancel?' }),
    config: GOOD_CONFIG,
    slug: SLUG
  });
  assert.equal(result.metrics.open_questions_unclassified, 1);
  assert.ok(result.issues.some((i) => i.includes('without a classification tag')));
  assert.equal(result.metrics.open_questions_by_class.testable, 1);
});

test('canonical TBD is legal; bare TBD and TODO are flagged at different tiers', () => {
  const clean = analyzeBriefing({ briefing: goodBriefing(), config: GOOD_CONFIG, slug: SLUG });
  assert.ok(!clean.issues.some((i) => i.includes('placeholder')), 'canonical TBD must not be an issue');

  const dirty = goodBriefing().replace('An order-management back office', 'TBD later. TODO: write context. An order-management back office');
  const result = analyzeBriefing({ briefing: dirty, config: GOOD_CONFIG, slug: SLUG });
  assert.ok(result.issues.some((i) => i.includes('placeholder')), 'TODO is an issue');
  assert.ok(result.warnings.some((w) => w.includes('bare TBD')), 'non-canonical TBD is a warning');
});

test('a missing registry entry and an invalid status are issues', () => {
  const noEntry = analyzeBriefing({ briefing: goodBriefing(), config: GOOD_CONFIG.replace(SLUG, 'someone-else'), slug: SLUG });
  assert.ok(noEntry.issues.some((i) => i.includes('no registry entry')));

  const badStatus = analyzeBriefing({ briefing: goodBriefing(), config: GOOD_CONFIG.replace('status: draft', 'status: shipped'), slug: SLUG });
  assert.ok(badStatus.issues.some((i) => i.includes('invalid status')));
});

test('inventory and promise-map presence are measured, not judged', () => {
  const withLineage = goodBriefing({
    sources: '### Source Inventory\n\n| SRC | Path | sha256 |\n|---|---|---|\n\n### Source Promise Map\n\n| PROM | Source | State |\n|---|---|---|'
  });
  const result = analyzeBriefing({ briefing: withLineage, config: GOOD_CONFIG, slug: SLUG });
  assert.equal(result.metrics.has_source_inventory, true);
  assert.equal(result.metrics.has_promise_map, true);
});

// ── adapter wiring ──

test('kind=briefing is registered and requires a slug', async () => {
  assert.ok(availableKinds().includes('briefing'));
  const logger = makeLogger();
  const res = await runVerifyArtifact({ args: ['.'], options: { kind: 'briefing', json: true, suppressExitCode: true }, logger });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'missing_slug');
});

test('kind=briefing measures a real briefing on disk end to end', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-briefing-lint-'));
  try {
    await fs.mkdir(path.join(dir, '.aioson/briefings', SLUG), { recursive: true });
    await fs.writeFile(path.join(dir, '.aioson/briefings', SLUG, 'briefings.md'), goodBriefing(), 'utf8');
    await fs.writeFile(path.join(dir, '.aioson/briefings/config.md'), GOOD_CONFIG, 'utf8');

    const logger = makeLogger();
    const res = await runVerifyArtifact({
      args: [dir],
      options: { kind: 'briefing', slug: SLUG, json: true, advisory: true, suppressExitCode: true },
      logger
    });
    assert.equal(res.ok, true, JSON.stringify(res.issues));
    assert.equal(res.exitCode, 0);
    assert.equal(res.metrics.sections_present, MANDATORY_SECTIONS.length);

    // No prototype and no non-visual declaration → advisory warning, never an
    // issue: a draft may legitimately not have built it yet, but approve will
    // refuse, so the pending state must surface here first.
    assert.equal(res.metrics.prototype_state, 'missing');
    assert.ok(res.warnings.some((w) => w.includes('prototype unresolved')));

    await fs.writeFile(path.join(dir, '.aioson/briefings', SLUG, 'prototype.html'), '<button>Go</button>\n', 'utf8');
    const resolved = await runVerifyArtifact({
      args: [dir],
      options: { kind: 'briefing', slug: SLUG, json: true, advisory: true, suppressExitCode: true },
      logger
    });
    assert.equal(resolved.metrics.prototype_state, 'prototype');
    assert.ok(!resolved.warnings.some((w) => w.includes('prototype unresolved')));

    const missing = await runVerifyArtifact({
      args: [dir],
      options: { kind: 'briefing', slug: 'ghost', json: true, advisory: true, suppressExitCode: true },
      logger
    });
    assert.equal(missing.ok, false);
    assert.ok(missing.issues.some((i) => i.includes('briefing not found')));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
