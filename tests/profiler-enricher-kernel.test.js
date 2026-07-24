'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { MANAGED_FILES } = require('../src/constants');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'template', '.aioson');
const WORKSPACE = path.join(ROOT, '.aioson');
const MODULES = [
  'docs/profiler/evidence-and-inference.md',
  'docs/profiler/trait-and-method-analysis.md',
  'docs/profiler/enriched-profile-contract.md',
  'docs/profiler/legacy-enricher-agent-contract.md'
];

async function read(root, relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

test('Profiler Enricher keeps a compact kernel and preserves legacy intelligence off path', async () => {
  const [kernel, legacy] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-enricher.md'),
    read(TEMPLATE, 'docs/profiler/legacy-enricher-agent-contract.md')
  ]);

  assert.ok(kernel.length < 8000, `Profiler Enricher kernel is ${kernel.length} chars`);
  assert.ok(legacy.length > 13000, 'legacy Enricher intelligence was not preserved');
  assert.match(kernel, /Never load every module/i);
  assert.match(kernel, /legacy-enricher-agent-contract\.md.*non-executable history/is);

  for (const module of [
    'evidence-and-inference.md',
    'trait-and-method-analysis.md',
    'enriched-profile-contract.md'
  ]) {
    assert.ok(kernel.includes(module), `Profiler Enricher kernel missing ${module}`);
  }
});

test('Profiler Enricher no longer blocks on optional material or loops for completeness', async () => {
  const kernel = await read(TEMPLATE, 'agents/profiler-enricher.md');

  assert.match(kernel, /Do not pause merely to solicit optional material/i);
  assert.match(kernel, /Optional input never becomes a mandatory confirmation gate/i);
  assert.match(kernel, /At most two analysis passes/i);
  assert.match(kernel, /No minimum number of trait-interaction patterns is required/i);
  assert.doesNotMatch(kernel, /do not start analysis until the user indicates/i);
  assert.doesNotMatch(kernel, /Capture at least 3 MPD patterns/i);
});

test('Profiler Enricher is evidence-first and resists psychometric false precision', async () => {
  const [kernel, evidence, method] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-enricher.md'),
    read(TEMPLATE, 'docs/profiler/evidence-and-inference.md'),
    read(TEMPLATE, 'docs/profiler/trait-and-method-analysis.md')
  ]);
  const active = `${kernel}\n${evidence}\n${method}`;

  assert.match(active, /source behavior → interpretation → confidence/i);
  assert.match(active, /search snippet.*not evidence/i);
  assert.match(active, /insufficient evidence/i);
  assert.match(active, /Enneagram.*low-to-medium-confidence/is);
  assert.match(active, /MBTI.*descriptive hypotheses/is);
  assert.match(active, /There is no quota/i);
  assert.match(active, /operational method.*highest-value output/is);
  assert.match(active, /Do not browse in this phase/i);
});

test('Enriched profile output preserves verifier and Forge handoff contracts', async () => {
  const [kernel, contract] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-enricher.md'),
    read(TEMPLATE, 'docs/profiler/enriched-profile-contract.md')
  ]);
  const active = `${kernel}\n${contract}`;

  for (const heading of [
    '## Executive Summary',
    '## Psychometric Profile',
    '## Operational Method',
    '## Trait Interactions',
    '## Evidence Map',
    '## Generation Handoff'
  ]) {
    assert.ok(active.includes(heading), `missing enriched-profile heading: ${heading}`);
  }

  assert.match(active, /verify:artifact \. --kind=enriched-profile --slug=<slug>/);
  assert.match(active, /Next agent: @profiler-forge/);
  assert.match(active, /Structural verification does not raise evidentiary confidence/i);
});

test('Profiler Enricher modules are managed and mirrored byte-for-byte', async () => {
  for (const relativePath of MODULES) {
    const managedPath = `.aioson/${relativePath}`;
    assert.equal(MANAGED_FILES.includes(managedPath), true, `missing managed file: ${managedPath}`);

    const [template, workspace] = await Promise.all([
      read(TEMPLATE, relativePath),
      read(WORKSPACE, relativePath)
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
  }

  const [templateAgent, workspaceAgent] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-enricher.md'),
    read(WORKSPACE, 'agents/profiler-enricher.md')
  ]);
  assert.equal(workspaceAgent, templateAgent, 'template/workspace drift: agents/profiler-enricher.md');
});
