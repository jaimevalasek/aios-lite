'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'template', '.aioson');

test('squad schemas expose the same proportional delivery lanes', async () => {
  const blueprint = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'squad-blueprint.schema.json'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'squad-manifest.schema.json'), 'utf8'));
  const expected = ['quick', 'standard', 'premium', 'regulated'];

  assert.deepEqual(blueprint.properties.deliveryLane.enum, expected);
  assert.deepEqual(manifest.properties.deliveryLane.enum, expected);
});

test('squad creation preserves strict regulated assurance without inflating quick and standard lanes', async () => {
  const [agent, design, create, flow] = await Promise.all([
    fs.readFile(path.join(ROOT, 'agents', 'squad.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'tasks', 'squad-design.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'tasks', 'squad-create.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'docs', 'squad', 'creation-flow.md'), 'utf8')
  ]);

  for (const content of [agent, design, create, flow]) {
    for (const lane of ['quick', 'standard', 'premium', 'regulated']) {
      assert.match(content, new RegExp(lane, 'i'));
    }
  }
  assert.match(design, /force `regulated`|mandatory for `tier-1-regulated`/i);
  assert.match(create, /quick[\s\S]*no ceremonial per-specialist round/i);
  assert.match(create, /regulated[\s\S]*no defer/i);
  assert.match(flow, /Optional richness does not promote Standard to Premium/i);
});
