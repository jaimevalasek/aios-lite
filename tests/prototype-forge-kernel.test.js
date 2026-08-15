'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'template', '.aioson', 'skills', 'process', 'prototype-forge');

test('Prototype Forge keeps a compact phased router and preserves enforceable build gates', async () => {
  const [kernel, build, quality] = await Promise.all([
    fs.readFile(path.join(ROOT, 'SKILL.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'references', 'build-contract.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'references', 'quality-and-manifest.md'), 'utf8')
  ]);

  assert.equal(kernel.length < 7000, true, `Prototype Forge kernel is ${kernel.length} chars`);
  assert.match(kernel, /build-contract\.md[\s\S]*quality-and-manifest\.md/i);
  assert.match(kernel, /Do not load the quality reference before functional completeness/i);
  assert.match(kernel, /identity\.md[\s\S]*overlays the one engine[\s\S]*second visual system/i);
  assert.match(kernel, /feature: \{slug\}/);
  assert.match(build, /hash routing[\s\S]*No network request/i);
  assert.match(build, /create, edit, delete, archive, and restore/i);
  assert.match(build, /loading, empty, error, populated, and permission-denied/i);
  assert.match(quality, /exactly one surgical polish pass/i);
  assert.match(quality, /## Core interactions/i);

  // Supervised-briefing feedback contracts: the prototype explains itself, the
  // #1 differentiator is fold-checkable, composition is decided before layout
  // in every mode, and a fresh-eyes walkthrough gates the handoff.
  assert.match(build, /## First-open explainer/);
  assert.match(build, /data-aioson-tour/);
  assert.match(build, /data-aioson-primary/);
  assert.match(quality, /## Visual direction`? first/i);
  assert.match(quality, /identity record supplies tokens/i);
  assert.match(quality, /first-contact walkthrough/i);
  assert.match(quality, /microinteractions bound to the signature move/i);
  assert.match(kernel, /first-open explainer[\s\S]*data-aioson-primary[\s\S]*first-contact walkthrough/i);
});
