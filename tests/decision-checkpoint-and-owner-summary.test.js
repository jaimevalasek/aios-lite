'use strict';

/**
 * Two human checkpoints that used to be prose.
 *
 * The decision checkpoint had a reader (workflow:next refused to advance on a
 * pending blocking decision) and no producer — the kernels were forbidden to
 * hand-write it. `decision:add` / `decision:resolve` are the producers.
 *
 * The owner summary was named by the decision-presentation skill and written
 * by nothing. `feature:summary --write` renders it from the recorded chain;
 * `feature:acknowledge` records that the owner read THAT version (hash) and
 * refuses a stale one; `feature:close` reports the state, never blocks on it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runDecisionAdd, runDecisionResolve, runDecisionList } = require('../src/commands/decision');
const { readDecisionCheckpoint } = require('../src/lib/decision-checkpoint');
const { runFeatureSummary, runFeatureAcknowledge, summaryState, loadJargonMap, translateJargon } = require('../src/commands/feature-summary');
const { runFeatureClose } = require('../src/commands/feature-close');
const { assertManifestNotPending } = require('../src/commands/workflow-next');

const silent = { log() {}, error() {} };

async function write(root, rel, body) {
  const file = path.join(root, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body, 'utf8');
}

function logger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), lines };
}

const SLUG = 'checkout';

function prd() {
  return `---\nclassification: SMALL\nproduct_scope: approved\nprd_ready: approved\n---\n# Checkout rápido\n\n## Feature Capability Map\n\n| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |\n|---|---|---|---|---|\n| CAP-${SLUG}-01 | Customer pays in one step | Customer submits the cart | required | Core promise |\n\n## Acceptance Criteria\n\n| AC | CAP | Observable behavior | Evidence |\n|---|---|---|---|\n| AC-${SLUG}-01 | CAP-${SLUG}-01 | Order confirmed after payment | integration test |\n`;
}

function plan() {
  return `---\nstatus: approved\n---\n# Plan\n\n## Engineering Controls\n\n| Concern | Evidence / trigger | Planned control | Verification | Recovery |\n|---|---|---|---|---|\n| compatibility | package.json establishes the current Node runtime | Preserve the existing module contract | node --test | Revert the additive change; no persistent data |\n\n## Implementation Delta\n\n| CAP | Action | Existing evidence | Exact paths | Required change |\n|---|---|---|---|---|\n| CAP-${SLUG}-01 | create | Inspected the nearest boundary from package.json | src/checkout.js, tests/checkout.test.js | Add implementation and AC-linked coverage |\n\n## Capability Delivery Plan\n\n| CAP | Phase | Files | Verification |\n|---|---|---|---|\n| CAP-${SLUG}-01 | 1 | src/checkout.js, tests/checkout.test.js | node --test |\n`;
}

async function project({ language = 'en' } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-decision-summary-'));
  await write(dir, '.aioson/context/project.context.md', `---\nclassification: "SMALL"\ninteraction_language: "${language}"\n---\n# C\n`);
  await write(dir, `.aioson/context/prd-${SLUG}.md`, prd());
  await write(dir, `.aioson/context/implementation-plan-${SLUG}.md`, plan());
  return dir;
}

test('decision:add records a blocking decision the workflow refuses to advance past; decision:resolve clears it', async () => {
  const dir = await project();

  // A decision without evidence/consequence/recommendation is a question, not a checkpoint.
  const incomplete = await runDecisionAdd({ args: [dir], options: { feature: SLUG, id: 'DEC-01', question: 'Charge at order or at shipment?', json: true }, logger: silent });
  assert.equal(incomplete.ok, false);
  assert.match(incomplete.error, /--evidence is required/);

  const added = await runDecisionAdd({
    args: [dir],
    options: {
      feature: SLUG, id: 'DEC-01', question: 'Charge at order or at shipment?',
      evidence: 'PRD CAP-01 says "pays in one step"; the plan fires payment at shipment',
      consequence: 'Refund semantics differ; the AC becomes untestable',
      recommendation: 'Charge at shipment — matches the ledger',
      options: 'at order|at shipment', by: '@sheldon', json: true
    },
    logger: silent
  });
  assert.equal(added.ok, true, JSON.stringify(added));
  assert.equal(added.checkpoint_status, 'pending');
  assert.deepEqual(added.item.options, ['at order', 'at shipment']);
  assert.equal(added.item.raised_by, '@sheldon');

  const checkpoint = await readDecisionCheckpoint(dir, SLUG);
  assert.equal(checkpoint.ok, true, checkpoint.errors.join('; '));
  assert.deepEqual(checkpoint.pending.map((i) => i.id), ['DEC-01']);

  // The existing workflow:next gate now has something to read: advancing the
  // feature is refused until a human resolves it; --force stays the override.
  await assert.rejects(() => assertManifestNotPending(dir, SLUG, false), /decision checkpoint has pending decision\(s\): DEC-01/);
  await assertManifestNotPending(dir, SLUG, true);

  const listed = await runDecisionList({ args: [dir], options: { feature: SLUG, json: true }, logger: silent });
  assert.deepEqual(listed.pending, ['DEC-01']);

  const unresolved = await runDecisionResolve({ args: [dir], options: { feature: SLUG, id: 'DEC-01', json: true }, logger: silent });
  assert.equal(unresolved.ok, false);
  assert.match(unresolved.error, /--choice is required/);

  const resolved = await runDecisionResolve({ args: [dir], options: { feature: SLUG, id: 'DEC-01', choice: 'at shipment', by: 'jaime', json: true }, logger: silent });
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  assert.equal(resolved.checkpoint_status, 'clear');
  assert.equal(resolved.item.status, 'included');
  assert.equal(resolved.item.resolution.by, 'jaime');

  const after = await readDecisionCheckpoint(dir, SLUG);
  assert.equal(after.ok, true);
  assert.equal(after.pending.length, 0);
  const human = logger();
  await runDecisionList({ args: [dir], options: { feature: SLUG }, logger: human });
  assert.ok(human.lines.some((l) => /◼ DEC-01 .*→ at shipment \(jaime/.test(l)), human.lines.join('\n'));
});

test('feature:summary renders the owner summary from the recorded chain, in the project language, jargon translated', async () => {
  const dir = await project({ language: 'pt-BR' });
  await write(dir, '.aioson/skills/process/decision-presentation/references/jargon-map.pt-BR.yaml', 'version: 1\nlanguage: pt-BR\nterms:\n  PRD:\n    translation: "documento do produto"\n    context: "x"\n    examples: ["PRD"]\n  "Gate A":\n    translation: "primeiro checkpoint"\n    context: "y"\n    examples: ["Gate A"]\n');
  await runDecisionAdd({ args: [dir], options: { feature: SLUG, id: 'DEC-02', question: 'Cobrar no pedido ou no envio?', evidence: 'PRD diz uma coisa, plano outra', consequence: 'AC fica sem teste', recommendation: 'No envio', json: true }, logger: silent });

  const terms = loadJargonMap(dir, 'pt-BR');
  assert.deepEqual(terms, [{ term: 'PRD', translation: 'documento do produto' }, { term: 'Gate A', translation: 'primeiro checkpoint' }]);
  assert.equal(translateJargon('the PRD and Gate A; not PRDX', terms), 'the documento do produto (PRD) and primeiro checkpoint (Gate A); not PRDX');

  const preview = await runFeatureSummary({ args: [dir], options: { feature: SLUG, json: true }, logger: silent });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  assert.equal(preview.language, 'pt-BR');
  assert.equal(preview.state, 'missing');
  assert.equal(preview.written, false);

  const human = logger();
  await runFeatureSummary({ args: [dir], options: { feature: SLUG }, logger: human });
  const text = human.lines.join('\n');
  assert.match(text, /# Resumo executivo — Checkout rápido/);
  assert.match(text, /## O que ela entrega/);
  assert.match(text, new RegExp(`CAP-${SLUG}-01.*obrigatória.*Customer pays in one step`));
  assert.match(text, /Aguardando uma decisão humana/);
  assert.match(text, /DEC-02 — Cobrar no pedido ou no envio\?/);
  assert.match(text, /documento do produto \(PRD\) diz uma coisa/, 'jargon in recorded text is translated');
  assert.match(text, /not written yet — add --write/);

  const written = await runFeatureSummary({ args: [dir], options: { feature: SLUG, write: true, json: true }, logger: silent });
  assert.equal(written.written, true);
  assert.equal(written.path, `.aioson/context/executive-summary-${SLUG}.md`);
  const file = await fs.readFile(path.join(dir, written.path), 'utf8');
  assert.match(file, /^---\nfeature: checkout\ngenerated_at: .+\nsource_hash: [0-9a-f]{16}\nacknowledged_by: ""\nacknowledged_at: ""\n---/);
  assert.match(file, /## Confirmação/);
  assert.match(file, /aioson feature:acknowledge \. --feature=checkout/);
});

test('feature:acknowledge records the owner on the current summary, refuses a missing or stale one; feature:close reports the state', async () => {
  const dir = await project();

  const missing = await runFeatureAcknowledge({ args: [dir], options: { feature: SLUG, by: 'Jaime', json: true }, logger: silent });
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'summary_missing');

  await runFeatureSummary({ args: [dir], options: { feature: SLUG, write: true, json: true }, logger: silent });
  const ack = await runFeatureAcknowledge({ args: [dir], options: { feature: SLUG, by: 'Jaime', note: 'matches what I asked for', json: true }, logger: silent });
  assert.equal(ack.ok, true, JSON.stringify(ack));
  assert.equal(ack.acknowledged_by, 'Jaime');
  const current = await summaryState(dir, SLUG);
  assert.equal(current.state, 'current');
  assert.equal(current.acknowledged, true);
  const file = await fs.readFile(current.path, 'utf8');
  assert.match(file, /acknowledged_by: "Jaime"/);
  assert.match(file, /Acknowledged by: \*\*Jaime\*\* — .* — matches what I asked for/);

  // Close reports the acknowledgment — on the preflight notes and the close updates.
  const preflight = await runFeatureClose({ args: [dir], options: { json: true, feature: SLUG, verdict: 'PASS', preflight: true }, logger: silent });
  assert.ok(preflight.notes.some((n) => /^owner summary: acknowledged by Jaime/.test(n)), JSON.stringify(preflight.notes));

  // The artifacts move on (a new decision): the summary is stale, the
  // acknowledgment no longer counts, and acknowledging again is refused
  // until the summary is regenerated.
  await runDecisionAdd({ args: [dir], options: { feature: SLUG, id: 'DEC-03', question: 'Retry failed payments?', evidence: 'PRD silent', consequence: 'Double charges possible', recommendation: 'Once, after 30s', json: true }, logger: silent });
  const stale = await summaryState(dir, SLUG);
  assert.equal(stale.state, 'stale');
  assert.equal(stale.acknowledged, false);
  const refused = await runFeatureAcknowledge({ args: [dir], options: { feature: SLUG, by: 'Jaime', json: true }, logger: silent });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'summary_stale');
  const stalePreflight = await runFeatureClose({ args: [dir], options: { json: true, feature: SLUG, verdict: 'PASS', preflight: true }, logger: silent });
  assert.ok(stalePreflight.notes.some((n) => /^owner summary: STALE/.test(n)), JSON.stringify(stalePreflight.notes));
  assert.equal(stalePreflight.blockers.some((b) => /owner|summary/i.test(b.gate)), false, 'the owner summary never blocks');

  // Regenerating after the change starts unacknowledged again.
  const regenerated = await runFeatureSummary({ args: [dir], options: { feature: SLUG, write: true, json: true }, logger: silent });
  assert.equal(regenerated.acknowledged, false);
  const notYet = await runFeatureClose({ args: [dir], options: { json: true, feature: SLUG, verdict: 'PASS', preflight: true }, logger: silent });
  assert.ok(notYet.notes.some((n) => /^owner summary: written, not yet acknowledged/.test(n)), JSON.stringify(notYet.notes));
});
