'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  MEASURED_RUN_MARKER_PATH,
  readMeasuredRunMarker,
  isMeasuredRun
} = require('../src/lib/measured-run');
const { resolvePrototypeState } = require('../src/lib/refiner/prototype-resolution');
const { validatePrototypeBinding, SKIPPED_MEASURED_RUN_STATUS } = require('../src/lib/prototype-binding');

function makeWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-measured-'));
  fs.mkdirSync(path.join(dir, '.aioson', 'benchmark'), { recursive: true });
  return dir;
}

function writeMarker(dir, payload) {
  const markerPath = path.join(dir, MEASURED_RUN_MARKER_PATH);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.writeFileSync(markerPath, typeof payload === 'string' ? payload : JSON.stringify(payload));
}

test('measured-run marker: absent, valid, and malformed forms', () => {
  const dir = makeWorkspace();
  try {
    assert.equal(isMeasuredRun(dir), false);
    assert.deepEqual(readMeasuredRunMarker(dir).present, false);

    writeMarker(dir, { schema_version: 1, mode: 'measured-run' });
    assert.equal(isMeasuredRun(dir), true);
    assert.equal(readMeasuredRunMarker(dir).marker.mode, 'measured-run');

    // A marker that does not prove itself counts as absent — gates stay strict.
    writeMarker(dir, { mode: 'something-else' });
    assert.equal(isMeasuredRun(dir), false);
    assert.equal(readMeasuredRunMarker(dir).invalid, true);

    writeMarker(dir, '{not json');
    assert.equal(isMeasuredRun(dir), false);
    assert.equal(readMeasuredRunMarker(dir).invalid, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('prototype resolution: measured run yields skipped_measured_run instead of missing', () => {
  const dir = makeWorkspace();
  try {
    const briefing = '## Context\nSomething visual.';
    assert.equal(resolvePrototypeState(dir, 'demo', briefing).state, 'missing');

    writeMarker(dir, { schema_version: 1, mode: 'measured-run' });
    assert.equal(resolvePrototypeState(dir, 'demo', briefing).state, 'skipped_measured_run');

    // Explicit non-visual declaration and a real prototype still win.
    assert.equal(resolvePrototypeState(dir, 'demo', 'prototype: not_applicable').state, 'non_visual');
    const protoPath = path.join(dir, '.aioson', 'briefings', 'demo');
    fs.mkdirSync(protoPath, { recursive: true });
    fs.writeFileSync(path.join(protoPath, 'prototype.html'), '<html></html>');
    assert.equal(resolvePrototypeState(dir, 'demo', briefing).state, 'prototype');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const SKIPPED_PRD = [
  '---',
  'feature: demo',
  'prototype_status: skipped_measured_run',
  'prototype: null',
  'prototype_feature: null',
  '---',
  '',
  '# PRD'
].join('\n');

test('prototype binding: skipped_measured_run is valid only under the marker', async () => {
  const dir = makeWorkspace();
  try {
    const rejected = await validatePrototypeBinding({
      targetDir: dir, slug: 'demo', prd: SKIPPED_PRD, strict: true
    });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.issues[0].reason, 'invalid_prototype_status');
    assert.match(rejected.issues[0].message, /measured-run\.json/);

    writeMarker(dir, { schema_version: 1, mode: 'measured-run' });
    const accepted = await validatePrototypeBinding({
      targetDir: dir, slug: 'demo', prd: SKIPPED_PRD, strict: true
    });
    assert.equal(accepted.ok, true, JSON.stringify(accepted.issues));
    assert.equal(accepted.status, SKIPPED_MEASURED_RUN_STATUS);
    assert.equal(accepted.applicable, false);
    assert.equal(accepted.measured_run, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('prototype binding: skipped status refuses a lingering prototype path', async () => {
  const dir = makeWorkspace();
  try {
    writeMarker(dir, { schema_version: 1, mode: 'measured-run' });
    const prd = SKIPPED_PRD.replace('prototype: null', 'prototype: .aioson/briefings/demo/prototype.html');
    const result = await validatePrototypeBinding({ targetDir: dir, slug: 'demo', prd, strict: true });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((entry) => entry.reason === 'prototype_binding_conflict'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('prototype binding: normal projects keep the current|none contract unchanged', async () => {
  const dir = makeWorkspace();
  try {
    const prd = [
      '---', 'prototype_status: none', 'prototype: null', 'prototype_feature: null', '---', '# PRD'
    ].join('\n');
    const result = await validatePrototypeBinding({ targetDir: dir, slug: 'demo', prd, strict: true });
    assert.equal(result.ok, true, JSON.stringify(result.issues));
    assert.equal(result.status, 'none');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
