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
  'docs/profiler/forge-package-contract.md',
  'docs/profiler/advisor-hybrid-and-binding.md',
  'docs/profiler/forge-verification.md',
  'docs/profiler/legacy-forge-agent-contract.md'
];

async function read(root, relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

test('Profiler Forge keeps a compact kernel and preserves its legacy contract off path', async () => {
  const [kernel, legacy] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-forge.md'),
    read(TEMPLATE, 'docs/profiler/legacy-forge-agent-contract.md')
  ]);

  assert.ok(kernel.length < 8000, `Profiler Forge kernel is ${kernel.length} chars`);
  assert.ok(legacy.length > 9000, 'legacy Forge intelligence was not preserved');
  assert.match(kernel, /Never load every module/i);
  assert.match(kernel, /legacy-forge-agent-contract\.md.*non-executable history/is);

  for (const module of [
    'forge-package-contract.md',
    'advisor-hybrid-and-binding.md',
    'forge-verification.md'
  ]) {
    assert.ok(kernel.includes(module), `Profiler Forge kernel missing ${module}`);
  }
});

test('Profiler Forge defaults to the current modular package without a blocking menu', async () => {
  const [kernel, contract] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-forge.md'),
    read(TEMPLATE, 'docs/profiler/forge-package-contract.md')
  ]);
  const active = `${kernel}\n${contract}`;

  assert.match(kernel, /no output choice, generate the recommended modular Genome package/i);
  assert.match(kernel, /Advisor generation and hybrid composition are additive only when explicitly requested/i);
  assert.match(active, /\.aioson\/genomes\/\{genome-slug\}\//);
  assert.match(active, /SKILL\.md/);
  assert.match(active, /manifest\.json/);
  assert.match(active, /references\/methodology\.md/);
  assert.doesNotMatch(active, /\.aioson\/genomes\/\{person-slug\}-\{domain-slug\}\.md/);
});

test('Profiler Forge emits doctor-compatible structured references and compiler-visible behavior', async () => {
  const [kernel, contract] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-forge.md'),
    read(TEMPLATE, 'docs/profiler/forge-package-contract.md')
  ]);
  const active = `${kernel}\n${contract}`;

  assert.match(contract, /"track": "4\.2"/);
  assert.match(contract, /"format": "genome-v4-modular"/);
  for (const field of ['"id"', '"file"', '"when"', '"load_priority"']) {
    assert.ok(contract.includes(field), `missing structured reference field: ${field}`);
  }
  assert.match(active, /ordered operating procedure and decision points/i);
  assert.match(active, /restrictions\/prohibitions/i);
  assert.match(active, /observable delivery checklist/i);
  assert.match(active, /evidence\/source IDs and limitations/i);
  assert.match(contract, /Do not fabricate numeric fidelity\/viability scores/i);
});

test('Profiler Forge isolates Advisor, hybrid, and squad binding responsibilities', async () => {
  const [kernel, extras] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-forge.md'),
    read(TEMPLATE, 'docs/profiler/advisor-hybrid-and-binding.md')
  ]);
  const active = `${kernel}\n${extras}`;

  assert.match(active, /cognitive model, not the real person/i);
  assert.match(extras, /Require 2–5 verified enriched profiles/i);
  assert.match(extras, /Do not average personas into a generic voice/i);
  assert.match(kernel, /does not edit official `.aioson\/agents\/` or directly mutate squad executors/i);
  assert.match(extras, /compilation identity and actual executor delta/i);
});

test('Profiler Forge and Genome use the positional doctor command and bounded repair', async () => {
  const [kernel, verification, genome, generation] = await Promise.all([
    read(TEMPLATE, 'agents/profiler-forge.md'),
    read(TEMPLATE, 'docs/profiler/forge-verification.md'),
    read(TEMPLATE, 'agents/genome.md'),
    read(TEMPLATE, 'docs/genome/generation-flow.md')
  ]);
  const active = `${kernel}\n${verification}\n${genome}\n${generation}`;

  assert.match(active, /genome:doctor \.aioson\/genomes\/<slug> --json/);
  assert.match(verification, /genome:doctor \.aioson\/genomes\/<genome-slug> --json/);
  assert.doesNotMatch(active, /genome:doctor \. --genome=/);
  assert.match(kernel, /at most one structural repair pass/i);
  assert.match(verification, /If the same gate fails again, return `NEEDS_REPAIR`/i);
});

test('Profiler Forge modules are managed and mirrored byte-for-byte', async () => {
  for (const relativePath of MODULES) {
    const managedPath = `.aioson/${relativePath}`;
    assert.equal(MANAGED_FILES.includes(managedPath), true, `missing managed file: ${managedPath}`);

    const [template, workspace] = await Promise.all([
      read(TEMPLATE, relativePath),
      read(WORKSPACE, relativePath)
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
  }

  for (const relativePath of ['agents/profiler-forge.md', 'agents/genome.md', 'docs/genome/generation-flow.md']) {
    const [template, workspace] = await Promise.all([
      read(TEMPLATE, relativePath),
      read(WORKSPACE, relativePath)
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
  }
});
