'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const PROCESS = path.resolve(__dirname, '..', 'template', '.aioson', 'skills', 'process');

test('Design Hybrid Forge routes one phase at a time while preserving identity rules', async () => {
  const skill = await fs.readFile(path.join(PROCESS, 'design-hybrid-forge', 'SKILL.md'), 'utf8');
  assert.equal(skill.length < 7000, true, `Design Hybrid Forge is ${skill.length} chars`);
  for (const ref of [
    'pair-compatibility.md',
    'external-source-ingestion.md',
    'crossover-protocol.md',
    'variation-library.md',
    'naming-registry.md',
    'output-contract.md',
    'quality-gates.md'
  ]) {
    assert.match(skill, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(skill, /Never preload every reference/i);
  assert.match(skill, /Two and only two co-equal parents/i);
  assert.match(skill, /third identity/i);
});
test('Reference Identity Extract routes extraction and schema separately', async () => {
  const skill = await fs.readFile(path.join(PROCESS, 'reference-identity-extract', 'SKILL.md'), 'utf8');
  assert.equal(skill.length < 7000, true, `Reference Identity Extract is ${skill.length} chars`);
  assert.match(skill, /extraction-contract\.md[\s\S]*identity-schema\.md/i);
  for (const token of [
    'references/identity/',
    'references/structure/',
    '## Component structure notes',
    'generated_by: reference-identity-extract',
    '--kind=identity',
    'source: references',
    'source: intent'
  ]) {
    assert.equal(skill.includes(token), true, `missing identity token: ${token}`);
  }
});
