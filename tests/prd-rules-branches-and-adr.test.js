'use strict';

/**
 * Three sections the contracts never had a machine check for:
 *   - PRD `## Business Rules` (RULE-*, rule | invariant, bound to CAPs, cited by ACs)
 *   - PRD `## Decision Branches` (BR-*, condition → expected behavior → AC)
 *   - plan `## Architecture Decisions` (ADR-*, decision, alternatives rejected, evidence, consequence)
 * All optional; linted when present; their ABSENCE measured against the prose
 * that should have become a table.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzePrd } = require('../src/lib/prd-lint');
const { analyzeFeatureCompleteness } = require('../src/lib/feature-completeness');
const { runFeatureSummary } = require('../src/commands/feature-summary');

const SLUG = 'billing';

function basePrd(extra = '') {
  return `---\nclassification: SMALL\nproduct_scope: approved\nprd_ready: approved\n---\n# Billing\n\n## Feature Capability Map\n\n| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |\n|---|---|---|---|---|\n| CAP-${SLUG}-01 | Customer receives one invoice per month | Scheduler on day 1 | required | Core promise |\n\n## Current System Fit\n\n| CAP | Evidence | Decision |\n|---|---|---|\n| CAP-${SLUG}-01 | src/billing/invoice.js inspected | extend |\n\n## Acceptance Criteria\n\n| AC | CAP | Observable behavior | Evidence |\n|---|---|---|---|\n| AC-${SLUG}-01 | CAP-${SLUG}-01 | Exactly one invoice is generated for the month (RULE-01) | integration test |\n| AC-${SLUG}-02 | CAP-${SLUG}-01 | A cancelled account generates no invoice | integration test |\n${extra}`;
}

test('business rules: linted when present — ids, kinds, CAP binding, and the AC that cites each rule', () => {
  const rules = `\n## Business Rules\n\n| Rule | Statement | Kind | Applies to | Source |\n|---|---|---|---|---|\n| RULE-01 | An account is invoiced at most once per calendar month | invariant | CAP-${SLUG}-01 | PROM-01 |\n| RULE-02 | Cancelled accounts are never invoiced again | rule | CAP-${SLUG}-01 | owner |\n`;
  const clean = analyzePrd({ prd: basePrd(rules) });
  assert.deepEqual(clean.issues, []);
  assert.equal(clean.metrics.business_rules.rows, 2);
  assert.equal(clean.metrics.business_rules.without_ac, 1, 'RULE-02 is cited by no AC');
  assert.ok(clean.warnings.some((w) => /1 rule\(s\) no acceptance criterion cites \(RULE-02\)/.test(w)), clean.warnings.join('\n'));

  const broken = `\n## Business Rules\n\n| Rule | Statement | Kind | Applies to | Source |\n|---|---|---|---|---|\n| RULE-01 | short | law | CAP-nope-99 | ? |\n| RULE-01 | Duplicate id with a long enough statement here | rule | feature-wide | owner |\n`;
  const result = analyzePrd({ prd: basePrd(broken) });
  assert.ok(result.issues.some((i) => /duplicate RULE id\(s\): RULE-01/.test(i)), result.issues.join('\n'));
  assert.ok(result.issues.some((i) => /RULE-01 statement is under 15 chars/.test(i)));
  assert.ok(result.issues.some((i) => /RULE-01 kind must be rule or invariant, got "law"/.test(i)));
  assert.ok(result.issues.some((i) => /RULE-01 cites unknown capability CAP-nope-99/.test(i)));

  const empty = analyzePrd({ prd: basePrd('\n## Business Rules\n\nSome prose, no table.\n') });
  assert.ok(empty.issues.some((i) => /## Business Rules has no RULE-\* rows/.test(i)));
});

test('absence is measured against the prose: rule language with no table warns; a PRD without rule language owes nothing', () => {
  const prose = basePrd('\n## User flows\n\nThe scheduler must run on day 1. An account must never be invoiced twice. Refunds always reverse the last invoice. Only if the account is active may an invoice be issued.\n');
  const result = analyzePrd({ prd: prose });
  assert.equal(result.metrics.business_rules, null);
  assert.ok(result.warnings.some((w) => /rule-language occurrences .* and no ## Business Rules table/.test(w)), result.warnings.join('\n'));

  const quiet = analyzePrd({ prd: basePrd() });
  assert.equal(quiet.warnings.some((w) => /Business Rules/.test(w)), false, quiet.warnings.join('\n'));
});

test('decision branches: linted when present, and conditional prose with no table warns', () => {
  const branches = `\n## Decision Branches\n\n| Branch | Condition | Expected behavior | AC |\n|---|---|---|---|\n| BR-01 | account active on day 1 | one invoice is generated and emailed | AC-${SLUG}-01 |\n| BR-02 | account cancelled before day 1 | no invoice; the cancellation notice is the last email | AC-${SLUG}-02 |\n| BR-03 | payment method expired | invoice generated, payment deferred with a warning email | |\n`;
  const result = analyzePrd({ prd: basePrd(branches) });
  assert.deepEqual(result.issues, []);
  assert.equal(result.metrics.decision_branches.rows, 3);
  assert.equal(result.metrics.decision_branches.without_ac, 1);
  assert.ok(result.warnings.some((w) => /1 decision branch\(es\) with no acceptance criterion/.test(w)), result.warnings.join('\n'));

  const broken = `\n## Decision Branches\n\n| Branch | Condition | Expected behavior | AC |\n|---|---|---|---|\n| BR-01 | x | y | AC-${SLUG}-77 |\n`;
  const bad = analyzePrd({ prd: basePrd(broken) });
  assert.ok(bad.issues.some((i) => /BR-01 has no condition/.test(i)));
  assert.ok(bad.issues.some((i) => /BR-01 has no expected behavior/.test(i)));
  assert.ok(bad.issues.some((i) => new RegExp(`BR-01 cites unknown acceptance criterion AC-${SLUG}-77`).test(i)));

  const prose = basePrd('\n## User flows\n\nWhen the scheduler runs, if the account is active, an invoice is generated; otherwise nothing happens. When the payment method is expired, the invoice is deferred unless the owner updates it. If the email bounces, retry when the address changes; else archive. Caso o cliente cancele, se houver crédito, o sistema reembolsa.\n');
  const result2 = analyzePrd({ prd: prose });
  assert.equal(result2.metrics.decision_branches, null);
  assert.ok(result2.warnings.some((w) => /conditional clauses .* and no ## Decision Branches table/.test(w)), result2.warnings.join('\n'));
});

function plan(adr) {
  return `---\nstatus: approved\n---\n# Plan\n\n## Engineering Controls\n\n| Concern | Evidence / trigger | Planned control | Verification | Recovery |\n|---|---|---|---|---|\n| compatibility | package.json establishes the current Node runtime | Preserve the existing module contract | node --test | Revert the additive change; no persistent data |\n${adr}\n## Implementation Delta\n\n| CAP | Action | Existing evidence | Exact paths | Required change |\n|---|---|---|---|---|\n| CAP-${SLUG}-01 | modify | Inspected src/billing/invoice.js | src/billing/invoice.js, tests/billing.test.js | Add the monthly guard and AC-linked coverage |\n\n## Capability Delivery Plan\n\n| CAP | Phase | Files | Verification |\n|---|---|---|---|\n| CAP-${SLUG}-01 | 1 | src/billing/invoice.js, tests/billing.test.js | node --test |\n`;
}

async function project(adr) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-adr-'));
  const write = async (rel, body) => { const f = path.join(dir, rel); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, body, 'utf8'); };
  await write('.aioson/context/project.context.md', '---\nclassification: "SMALL"\ninteraction_language: "en"\n---\n# C\n');
  await write(`.aioson/context/prd-${SLUG}.md`, basePrd());
  await write(`.aioson/context/implementation-plan-${SLUG}.md`, plan(adr));
  await write('src/billing/invoice.js', 'module.exports = 1;\n');
  await write('tests/billing.test.js', 'test\n');
  return dir;
}

test('architecture decisions in the plan: optional, linted when present, and carried into the owner summary', async () => {
  const none = await project('');
  const without = await analyzeFeatureCompleteness(none, SLUG, {});
  assert.equal(without.architecture_decisions.rows.length, 0);
  assert.equal(without.findings.some((f) => /architecture/.test(f.check)), false, 'absence owes nothing');

  const good = await project(`\n## Architecture Decisions\n\n| ADR | Decision | Alternatives rejected | Evidence | Consequence |\n|---|---|---|---|---|\n| ADR-01 | Monthly idempotency key stored on the invoice row | Cron-level lock (killed by the two-region scheduler in infra/cron.yml); Redis lock (no Redis in package.json) | src/billing/invoice.js writes one row per period; infra/cron.yml | Every invoice write must carry the period key; backfills need the same key |\n`);
  const withAdr = await analyzeFeatureCompleteness(good, SLUG, {});
  assert.equal(withAdr.findings.filter((f) => /architecture/.test(f.check)).length, 0, JSON.stringify(withAdr.findings));
  assert.equal(withAdr.architecture_decisions.rows.length, 1);
  assert.equal(withAdr.architecture_decisions.rows[0].id, 'ADR-01');

  const summary = await runFeatureSummary({ args: [good], options: { feature: SLUG, json: true }, logger: { log() {}, error() {} } });
  assert.equal(summary.summary.adrs.length, 1);
  const human = { lines: [], log(m = '') { this.lines.push(String(m)); }, error() {} };
  await runFeatureSummary({ args: [good], options: { feature: SLUG }, logger: human });
  assert.ok(human.lines.some((l) => /## Architecture decisions/.test(l)) && human.lines.some((l) => /ADR-01.*Monthly idempotency key/.test(l)), human.lines.join('\n'));

  const bad = await project(`\n## Architecture Decisions\n\n| ADR | Decision | Alternatives rejected | Evidence | Consequence |\n|---|---|---|---|---|\n| ADR-01 | tbd | none | - | |\n| adr-2 | We will probably store the key somewhere sensible | none | src/billing/invoice.js | Key everywhere |\n| ADR-01 | Duplicate id with a decision sentence long enough | Redis lock (no Redis) | package.json | Same key on backfills |\n`);
  const broken = await analyzeFeatureCompleteness(bad, SLUG, {});
  const checks = broken.findings.filter((f) => /architecture/.test(f.check)).map((f) => f.check);
  for (const expected of ['architecture_decision_missing', 'architecture_decision_alternatives_missing', 'architecture_decision_evidence_missing', 'architecture_decision_consequence_missing', 'architecture_decision_id_invalid', 'architecture_decision_duplicate']) {
    assert.ok(checks.includes(expected), `expected ${expected} in ${checks.join(', ')}`);
  }
  assert.ok(broken.findings.every((f) => !/architecture/.test(f.check) || f.stage === 'plan'), 'ADR findings belong to the plan stage (planner)');
});
