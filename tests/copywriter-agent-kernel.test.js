'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'template', '.aioson');
const GHOST_REFERENCES = [
  'avatar-construction.md',
  'triade-narrativa.md',
  'kstk-structure.md',
  'ads-cpgc.md',
  'lightcopy-styles.md',
  'content-multiplier.md'
];

test('Copywriter uses a compact mode router with no active dangling reference', async () => {
  const [kernel, legacy, campaign] = await Promise.all([
    fs.readFile(path.join(ROOT, 'agents', 'copywriter.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'docs', 'copywriter', 'legacy-agent-contract.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'docs', 'copywriter', 'campaign-package.md'), 'utf8')
  ]);

  assert.equal(kernel.length < 12000, true, `Copywriter kernel is ${kernel.length} chars`);
  assert.equal(legacy.length > 40000, true, 'legacy Copywriter intelligence was not preserved');

  for (const module of [
    'modes-and-outputs.md',
    'genomes-and-research.md',
    'strategy-and-delivery.md',
    'campaign-package.md'
  ]) {
    assert.match(kernel, new RegExp(module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const ghost of GHOST_REFERENCES) {
    assert.doesNotMatch(kernel, new RegExp(ghost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(kernel, /Never load every module/i);
  assert.match(kernel, /legacy-agent-contract\.md.*non-executable history/is);
  assert.match(kernel, /Mode 6 runs sequentially/i);
  assert.match(campaign, /No absent `ads-cpgc\.md` or `content-multiplier\.md` dependency exists/i);
});
