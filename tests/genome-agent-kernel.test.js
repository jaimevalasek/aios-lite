'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'template', '.aioson');

test('Genome uses a compact operation router and preserves legacy contracts off the hot path', async () => {
  const [kernel, legacy] = await Promise.all([
    fs.readFile(path.join(ROOT, 'agents', 'genome.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'docs', 'genome', 'legacy-command-contracts.md'), 'utf8')
  ]);

  assert.equal(kernel.length < 12000, true, `Genome kernel is ${kernel.length} chars`);
  assert.equal(legacy.length > 50000, true, 'legacy intelligence was not preserved');
  for (const module of ['generation-flow.md', 'evidence-and-quality.md', 'runtime-application.md']) {
    assert.match(kernel, new RegExp(module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(kernel, /Never load every module/i);
  assert.match(kernel, /legacy-command-contracts\.md.*legacy field|legacy.*backward-compatibility/is);
  assert.match(kernel, /procedure[\s\S]*restrictions[\s\S]*checklist[\s\S]*style[\s\S]*output contract/i);
});
