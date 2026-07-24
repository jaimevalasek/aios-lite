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
  'docs/orache/investigation-strategy.md',
  'docs/orache/dimensions-and-synthesis.md',
  'docs/orache/report-and-integration.md',
  'docs/orache/legacy-agent-contract.md'
];

async function read(root, relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

test('Orache uses a compact investigation kernel and preserves legacy intelligence off the hot path', async () => {
  const [kernel, legacy] = await Promise.all([
    read(TEMPLATE, 'agents/orache.md'),
    read(TEMPLATE, 'docs/orache/legacy-agent-contract.md')
  ]);

  assert.ok(kernel.length < 10000, `Orache kernel is ${kernel.length} chars`);
  assert.ok(legacy.length > 18000, 'legacy Orache intelligence was not preserved');
  assert.match(kernel, /Never load every module/i);
  assert.match(kernel, /legacy-agent-contract\.md.*non-executable history/is);

  for (const module of [
    'investigation-strategy.md',
    'dimensions-and-synthesis.md',
    'report-and-integration.md'
  ]) {
    assert.ok(kernel.includes(module), `Orache kernel missing ${module}`);
  }
});

test('Orache research is cache-first, evidence-traced, and bounded', async () => {
  const [kernel, strategy] = await Promise.all([
    read(TEMPLATE, 'agents/orache.md'),
    read(TEMPLATE, 'docs/orache/investigation-strategy.md')
  ]);
  const active = `${kernel}\n${strategy}`;

  assert.match(active, /query\/evidence matrix/i);
  assert.match(active, /within seven days/i);
  assert.match(active, /at most two evidence passes/i);
  assert.match(active, /one query pivot per unresolved dimension/i);
  assert.match(active, /Search snippets.*not evidence/i);
  assert.doesNotMatch(active, /Write the plan mentally/i);
  assert.match(strategy, /aioson squad:investigate \. --sub=list --json/);
  assert.match(strategy, /Orache does not write the verdict-oriented `researchs\/` schema/i);
});

test('Orache preserves all dimensions while distinguishing mode skeleton from researched coverage', async () => {
  const [kernel, dimensions, report] = await Promise.all([
    read(TEMPLATE, 'agents/orache.md'),
    read(TEMPLATE, 'docs/orache/dimensions-and-synthesis.md'),
    read(TEMPLATE, 'docs/orache/report-and-integration.md')
  ]);

  for (let index = 1; index <= 7; index += 1) {
    assert.match(dimensions, new RegExp(`## D${index}:`));
    assert.match(report, new RegExp(`## D${index}:`));
  }
  assert.match(kernel, /Quick.*D1 frameworks, D2 anti-patterns, and D5 vocabulary/i);
  assert.match(kernel, /Not investigated in this mode/);
  assert.match(report, /Dimensions investigated/);
  assert.match(report, /## Evidence Ledger/);
  assert.match(report, /squad:investigate \. --sub=register/);
  assert.match(report, /context:compact \. --agent=orache/);
});

test('Orache modules are managed and template/workspace copies remain byte-identical', async () => {
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
    read(TEMPLATE, 'agents/orache.md'),
    read(WORKSPACE, 'agents/orache.md')
  ]);
  assert.equal(workspaceAgent, templateAgent, 'template/workspace drift: agents/orache.md');
});

test('Orache public help points to the registered squad-searches cache', async () => {
  const help = await fs.readFile(path.join(ROOT, 'template', '.aioson', 'docs', 'agent-help.md'), 'utf8');
  const start = help.indexOf('## @orache');
  const next = help.indexOf('\n## @', start + 1);
  const section = next === -1 ? help.slice(start) : help.slice(start, next);

  assert.match(section, /quick.*targeted.*full/is);
  assert.match(section, /squad-searches\//);
  assert.match(section, /verified, registered report/);
  assert.doesNotMatch(section, /cached research under `researchs\/`/);
});
