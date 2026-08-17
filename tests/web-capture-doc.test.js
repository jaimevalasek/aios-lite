'use strict';

// web-capture shared module — one on-demand doc owns the capture-route decision
// (aioson web:save/web:extract vs harness web tools) for every consumer agent;
// kernels carry only a pointer. Convention: template/ is the source of truth;
// tracked mirrors (.aioson/agents, .aioson/docs) assert template <-> .aioson
// byte-parity; .aioson/skills is gitignored so skills are read from template only.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { MANAGED_FILES } = require('../src/constants');

const ROOT = path.resolve(__dirname, '..');
const DOC = '.aioson/docs/web-capture.md';

function readTemplate(rel) {
  return fs.readFile(path.join(ROOT, 'template', rel), 'utf8');
}

async function parityTracked(rel) {
  const tmpl = await readTemplate(rel);
  const work = await fs.readFile(path.join(ROOT, rel), 'utf8');
  assert.equal(tmpl, work, `template/${rel} and ${rel} must be byte-identical`);
  return tmpl;
}

test('web-capture doc is shipped, managed, byte-parity, and carries its contract', async () => {
  assert.equal(MANAGED_FILES.includes(DOC), true, 'web-capture doc must be a managed file');
  const doc = await parityTracked(DOC);
  for (const token of [
    'aioson web:save . --url=<url> --slug=<ref-slug>',
    'aioson web:extract . --slug=<ref-slug>',
    "client's decision",              // route choice belongs to the operator
    'Harness web tools',              // both routes stay legitimate options
    'captured_via: aioson | harness', // routes stay comparable in practice
    'Autopilot',
    'Never bulk-read saved HTML/CSS/JS bundles',
    '--query=<text>',
    'local reference only',
    '--dir=<path>'                    // external-mirror fallback stays reachable
  ]) {
    assert.equal(doc.includes(token), true, `web-capture doc missing token: ${token}`);
  }
});

test('consumer kernels point at the shared module instead of restating it', async () => {
  // benchmark left this list when it became the traversal orchestrator: web
  // capture belongs to the building agents (refiner/dev routes), not to the
  // conductor of a measured round.
  const consumers = [
    { rel: '.aioson/agents/site-forge.md', tracked: true },
    { rel: '.aioson/docs/briefing/prototype-and-delegation.md', tracked: true },
    { rel: '.aioson/skills/static/web-research-cache.md', tracked: false }
  ];

  for (const { rel, tracked } of consumers) {
    const content = tracked ? await parityTracked(rel) : await readTemplate(rel);
    assert.equal(content.includes(DOC), true, `${rel} must point at ${DOC}`);
  }
});
