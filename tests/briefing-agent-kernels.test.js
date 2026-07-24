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
  'docs/briefing/exploration-and-artifacts.md',
  'docs/briefing/refinement-loop.md',
  'docs/briefing/prototype-and-delegation.md',
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
    read(TEMPLATE, 'agents/briefing-refiner.md'),
    read(TEMPLATE, 'docs/briefing/legacy-agent-contract.md'),
    read(TEMPLATE, 'docs/briefing/legacy-refiner-agent-contract.md')
  ]);

  assert.ok(briefing.length < 12000, `Briefing kernel is ${briefing.length} chars`);
  assert.ok(refiner.length < 12000, `Briefing Refiner kernel is ${refiner.length} chars`);
  assert.ok(briefingLegacy.length > 25000, 'legacy Briefing intelligence was not preserved');
  assert.ok(refinerLegacy.length > 18000, 'legacy Briefing Refiner intelligence was not preserved');

  assert.match(briefing, /Never load every module/i);
  assert.match(refiner, /Never load every module/i);
  assert.match(briefing, /legacy-agent-contract\.md.*non-executable history/is);
  assert.match(refiner, /legacy-refiner-agent-contract\.md.*non-executable history/is);
});

test('Briefing routes activation, exploration, deep craft, expansion, and exact artifacts progressively', async () => {
  const kernel = await read(TEMPLATE, 'agents/briefing.md');

  for (const token of [
    'activation-and-intake.md',
    'exploration-and-artifacts.md',
    'briefing-craft.md',
    'briefing-expansion-scout/SKILL.md',
    '.aioson/briefings/{slug}/expansion-scout.md',
    '## Context',
    '## Problem',
    '## Proposed solution',
    '## Themes',
    '## Risks',
    '## Identified gaps',
    '## Sources',
    '## Open questions'
  ]) {
    assert.ok(kernel.includes(token), `Briefing kernel missing ${token}`);
  }

  assert.match(kernel, /one specified observable outcome/i);
  assert.match(kernel, /obtain explicit confirmation before the first write/i);
  assert.match(kernel, /One activation should advance one coherent decision branch/i);
});

test('Briefing Refiner is a bounded filesystem state machine with on-demand rare routes', async () => {
  const kernel = await read(TEMPLATE, 'agents/briefing-refiner.md');

  for (const token of [
    'refinement-loop.md',
    'prototype-and-delegation.md',
    'review-surface-fallback.md',
    'briefing-expansion-scout/SKILL.md',
    '.aioson/briefings/{slug}/expansion-scout.md',
    'references/identity',
    'reference-identity-extract',
    '--kind=identity',
    'identity.md',
    'bounded premium quality pass'
  ]) {
    assert.ok(kernel.includes(token), `Briefing Refiner kernel missing ${token}`);
  }

  assert.match(kernel, /Each generated review is a terminal point for that activation/i);
  assert.match(kernel, /at most one fresh review/i);
  assert.match(kernel, /Never poll, re-audit unchanged text/i);
  assert.match(kernel, /explicit confirmation before `--confirm`/i);
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

  for (const relativePath of ['agents/briefing.md', 'agents/briefing-refiner.md']) {
    const [template, workspace] = await Promise.all([
      read(TEMPLATE, relativePath),
      read(WORKSPACE, relativePath)
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
  }
});

test('active Briefing modules retain the high-value contracts removed from kernels', async () => {
  const [activation, exploration, refinement, prototype, fallback] = await Promise.all([
    read(TEMPLATE, 'docs/briefing/activation-and-intake.md'),
    read(TEMPLATE, 'docs/briefing/exploration-and-artifacts.md'),
    read(TEMPLATE, 'docs/briefing/refinement-loop.md'),
    read(TEMPLATE, 'docs/briefing/prototype-and-delegation.md'),
    read(TEMPLATE, 'docs/briefing/review-surface-fallback.md')
  ]);

  assert.match(activation, /JTBD/);
  assert.match(activation, /aioson intake:ask/);
  assert.match(exploration, /3–5 materially different shapes/);
  assert.match(exploration, /Operational surface/i);
  assert.match(refinement, /notes alone never reach `briefings\.md`/i);
  assert.match(refinement, /blocking.*Product cannot responsibly write the PRD/is);
  assert.match(prototype, /native_dispatch\.model/);
  assert.match(prototype, /mock-only/i);
  assert.match(fallback, /canonical feedback v1\.1 JSON/);
});
