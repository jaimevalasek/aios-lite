'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'template', '.aioson');

test('Neo uses a compact read-only router with lazy operational modules', async () => {
  const [kernel, legacy] = await Promise.all([
    fs.readFile(path.join(ROOT, 'agents', 'neo.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'docs', 'neo', 'legacy-routing-reference.md'), 'utf8')
  ]);

  assert.equal(kernel.length < 12000, true, `Neo kernel is ${kernel.length} chars`);
  assert.equal(legacy.length > 20000, true, 'legacy routing intelligence was not preserved');

  for (const module of ['state-diagnostics.md', 'routing-matrix.md', 'agent-catalog.md']) {
    assert.match(kernel, new RegExp(module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(kernel, /Never load every module/i);
  assert.match(kernel, /legacy-routing-reference\.md.*non-executable history/is);
  assert.match(kernel, /5 behavior files[\s\S]*8 total paths[\s\S]*2 existing modules[\s\S]*Simple Plan/i);
  assert.match(kernel, /Neural Chain noises[\s\S]*pause all routing/i);
  assert.match(kernel, /Current QA PASS is terminal/i);
  assert.match(kernel, /Do not write files|Never write files/i);
  assert.match(kernel, /does not persist a handoff/i);
  assert.match(kernel, /---routing---[\s\S]*agent:[\s\S]*confidence:[\s\S]*reason:[\s\S]*clarification:/i);
});
