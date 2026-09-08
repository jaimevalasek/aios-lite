'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { MANAGED_FILES } = require('../src/constants');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'template', '.aioson');
const WORKSPACE = path.join(ROOT, '.aioson');

const DOCS = [
  'docs/briefing/activation-and-intake.md',
  'docs/briefing/source-pack-intake.md',
  'docs/briefing/sql-as-documentation.md',
  'docs/briefing/exploration-and-artifacts.md',
  'docs/briefing/refinement-loop.md',
  'docs/briefing/prototype-and-delegation.md',
  'docs/briefing/visual-exploration.md',
  'docs/briefing/review-surface-fallback.md',
  'docs/briefing/legacy-agent-contract.md',
  'docs/briefing/legacy-refiner-agent-contract.md'
];

async function read(root, relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

test('Briefing kernels stay compact and preserve full historical contracts off the hot path', async () => {
  const [briefing, refiner, briefingLegacy, refinerLegacy] = await Promise.all([
    read(TEMPLATE, 'agents/briefing.md'),
    read(TEMPLATE, 'agents/refiner.md'),
    read(TEMPLATE, 'docs/briefing/legacy-agent-contract.md'),
    read(TEMPLATE, 'docs/briefing/legacy-refiner-agent-contract.md')
  ]);

  assert.ok(briefing.length < 12000, `Briefing kernel is ${briefing.length} chars`);
  assert.ok(refiner.length < 12000, `Refiner kernel is ${refiner.length} chars`);
  assert.ok(briefingLegacy.length > 25000, 'legacy Briefing intelligence was not preserved');
  assert.ok(refinerLegacy.length > 18000, 'legacy Refiner intelligence was not preserved');

  assert.match(briefing, /Never load every module/i);
  assert.match(refiner, /Never load every module/i);
  assert.match(briefing, /legacy-agent-contract\.md.*non-executable history/is);
  assert.match(refiner, /legacy-refiner-agent-contract\.md.*non-executable history/is);
});

test('Briefing routes activation, exploration, deep craft, expansion, and exact artifacts progressively', async () => {
  const kernel = await read(TEMPLATE, 'agents/briefing.md');

  for (const token of [
    'activation-and-intake.md',
    'source-pack-intake.md',
    'sql-as-documentation.md',
    'briefing:sources',
    'exploration-and-artifacts.md',
    'briefing-craft.md',
    'briefing-expansion-scout/SKILL.md',
    'visual-exploration.md',
    'plans/{slug}/visual-exploration.md',
    '.aioson/briefings/{slug}/expansion-scout.md',
    '## Context',
    '## Problem',
    '## Proposed solution',
    '## Themes',
    '## Risks',
    '## Identified gaps',
    '## Sources',
    '## Open questions',
    // Origination bindings: the spec-quality brain query, the interaction
    // contracts recorded as promises, and the deterministic artifact gate.
    '--agent=briefing --tags=spec-quality',
    'replaceability test',
    'interaction contracts',
    '--kind=briefing --slug={slug} --advisory'
  ]) {
    assert.ok(kernel.includes(token), `Briefing kernel missing ${token}`);
  }

  assert.match(kernel, /one specified observable outcome/i);
  assert.match(kernel, /obtain explicit confirmation before the first write/i);
  assert.match(kernel, /One activation should advance one coherent decision branch/i);
});

test('Refiner is a bounded filesystem state machine with on-demand rare routes', async () => {
  const kernel = await read(TEMPLATE, 'agents/refiner.md');

  for (const token of [
    'refinement-loop.md',
    'prototype-and-delegation.md',
    'review-surface-fallback.md',
    'briefing-expansion-scout/SKILL.md',
    'visual-exploration.md',
    '.aioson/explorations/{exploration-slug}/',
    'plans/{briefing-slug}/visual-exploration.md',
    '.aioson/briefings/{slug}/expansion-scout.md',
    'references/identity',
    'reference-identity-extract',
    '--kind=identity',
    'identity.md',
    'bounded premium quality pass'
  ]) {
    assert.ok(kernel.includes(token), `Refiner kernel missing ${token}`);
  }

  assert.match(kernel, /Each generated review is a terminal point for that activation/i);
  assert.match(kernel, /at most one fresh review/i);
  assert.match(kernel, /Never poll, re-audit unchanged text/i);
  assert.match(kernel, /explicit confirmation before `--confirm`/i);
});

test('Refiner delivers its initial draft before optional visual work and preserves approval gates', async () => {
  const kernel = await read(TEMPLATE, 'agents/refiner.md');
  const prototype = await read(TEMPLATE, 'docs/briefing/prototype-and-delegation.md');
  const initial = prototype.indexOf('## Build initial prototype');
  const choice = prototype.indexOf('## Prototype continuation choice');
  const validation = prototype.indexOf('## Authorized refinement and approval validation');
  assert.ok(initial >= 0 && initial < choice && choice < validation, 'initial creation and user choice must precede expensive validation');
  const draft = prototype.slice(initial, choice);
  const checkpoint = prototype.slice(choice, validation);
  const fullValidation = prototype.slice(validation);

  assert.match(kernel, /Build an initial draft, then offer stopping or a bounded premium quality pass/i);
  assert.match(kernel, /Draft delivery never grants approval/i);
  assert.match(draft, /pause before Prototype Forge's `After the functional build`/);
  assert.doesNotMatch(draft, /aioson (?:verify:artifact|browser:run)|--screenshots/);
  assert.match(checkpoint, /Finish with the current prototype/);
  assert.match(checkpoint, /Continue refining \(more time and tokens\)/);
  assert.match(checkpoint, /stop and wait for the answer before polishing/i);
  assert.match(checkpoint, /No answer authorizes no additional work/);
  assert.match(checkpoint, /status: draft/);
  assert.match(checkpoint, /Do not propose `briefing:approve` or Product as ready/);
  assert.match(checkpoint, /`agent:done` static check.*does not restart work/);
  assert.match(checkpoint, /one bounded cycle: inspect → repair → final verification/);
  assert.match(checkpoint, /do not reset that budget/);
  assert.match(checkpoint, /prior explicit request.*counts; do not ask again/);
  assert.match(checkpoint, /Autopilot.*does not itself authorize the refinement loop/);
  assert.match(checkpoint, /On resume, read it before work: pending\/finish is a stop/);
  assert.match(checkpoint, /Update the record before final measurement/);
  assert.match(checkpoint, /Stopping never waives an approval gate/);

  // Approval still requires the same evidence and owns no implicit waiver.
  assert.match(fullValidation, /--kind=visual --slug=\{slug\} --advisory --runtime --screenshots/);
  assert.match(fullValidation, /aioson browser:run/);
  assert.match(fullValidation, /refuses missing, stale, failed, or unverified evidence/);
  assert.match(fullValidation, /do not restart it to make a gate green/);
});

test('Briefing modules are managed and template/workspace copies remain byte-identical', async () => {
  for (const relativePath of DOCS) {
    const managedPath = `.aioson/${relativePath}`;
    assert.equal(MANAGED_FILES.includes(managedPath), true, `missing managed file: ${managedPath}`);

    const [template, workspace] = await Promise.all([
      read(TEMPLATE, relativePath),
      read(WORKSPACE, relativePath)
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
  }

  for (const relativePath of ['agents/briefing.md', 'agents/refiner.md']) {
    const [template, workspace] = await Promise.all([
      read(TEMPLATE, relativePath),
      read(WORKSPACE, relativePath)
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
  }
});

test('active Briefing modules retain the high-value contracts removed from kernels', async () => {
  const [activation, sourcePack, sqlSources, exploration, refinement, prototype, visualExploration, fallback] = await Promise.all([
    read(TEMPLATE, 'docs/briefing/activation-and-intake.md'),
    read(TEMPLATE, 'docs/briefing/source-pack-intake.md'),
    read(TEMPLATE, 'docs/briefing/sql-as-documentation.md'),
    read(TEMPLATE, 'docs/briefing/exploration-and-artifacts.md'),
    read(TEMPLATE, 'docs/briefing/refinement-loop.md'),
    read(TEMPLATE, 'docs/briefing/prototype-and-delegation.md'),
    read(TEMPLATE, 'docs/briefing/visual-exploration.md'),
    read(TEMPLATE, 'docs/briefing/review-surface-fallback.md')
  ]);

  assert.match(activation, /JTBD/);
  assert.match(activation, /aioson intake:ask/);
  assert.match(activation, /SQL, only Markdown, or heterogeneous auxiliary sources/i);
  assert.match(sourcePack, /never.*moving, renaming, rewriting/is);
  assert.match(sourcePack, /Observed.*Strong inference.*Hypothesis.*Unknown/is);
  assert.match(sourcePack, /consulted.*metadata_only.*blocked/is);
  assert.match(sqlSources, /Never execute SQL/i);
  assert.match(sqlSources, /current system, a desired blueprint, or history/i);
  assert.match(sqlSources, /schema dump rewritten as prose/i);
  assert.match(exploration, /3–5 materially different shapes/);
  assert.match(exploration, /Operational surface/i);
  assert.match(refinement, /notes alone never reach `briefings\.md`/i);
  assert.match(refinement, /blocking.*Product cannot responsibly write the PRD/is);
  assert.match(prototype, /native_dispatch\.model/);
  assert.match(prototype, /mock-only/i);
  // Runtime telemetry off is a user decision, never a default discovered later;
  // a gate-passing rejection feeds the learnings loop instead of only a rebuild.
  assert.match(prototype, /surface the enable decision to the user once per feature/i);
  assert.match(prototype, /--route=<hash>/);
  assert.match(prototype, /## Rejection closes the loop/);
  assert.match(prototype, /\.aioson\/learnings\//);
  assert.match(visualExploration, /single.*sequential.*arena/is);
  assert.match(visualExploration, /targeted repository scan/i);
  assert.match(visualExploration, /reusable prompts are always retained/i);
  assert.match(visualExploration, /Selection means.*not Briefing approval/i);
  assert.match(fallback, /canonical feedback v1\.1 JSON/);
});
