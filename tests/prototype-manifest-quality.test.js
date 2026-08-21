'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateQualityEvidence } = require('../src/lib/prototype-manifest-quality');

const SLUG = 'catalog';

function manifest({ evidence = `.aioson/context/features/${SLUG}/visual-evidence.json`, craft = '3/5' } = {}) {
  return `# Prototype\n\n## Quality evidence\n- verdict: pass\n- evidence: ${evidence}\n- craft: ${craft}\n- runtime: measured in Chromium\n- routes: 1\n`;
}

function runtimeReport() {
  return {
    ok: true,
    verdict: 'pass',
    metrics: {
      craft: { measured: false },
      runtime: {
        available: true,
        assurance: {
          routes_verified: ['entry'],
          craft_axes: { typeface: true, display_scale: true, material: true, motion: false, evidence: false }
        }
      }
    }
  };
}

test('quality evidence binds the exact feature-owned report path', () => {
  const report = runtimeReport();
  assert.equal(validateQualityEvidence(manifest(), { report, slug: SLUG }).valid, true);

  const prefixed = validateQualityEvidence(manifest({
    evidence: `other/.aioson/context/features/${SLUG}/visual-evidence.json`
  }), { report, slug: SLUG });
  assert.equal(prefixed.valid, false);
  assert.ok(prefixed.mismatches.some((item) => /exactly bind/.test(item)));
});

test('runtime-only craft projection must match the measured axes', () => {
  const report = runtimeReport();
  const lied = validateQualityEvidence(manifest({ craft: '5/5' }), { report, slug: SLUG });
  assert.equal(lied.valid, false);
  assert.ok(lied.mismatches.some((item) => /runtime report says 3\/5/.test(item)));

  assert.equal(validateQualityEvidence(manifest({ craft: 'runtime 3/5' }), { report, slug: SLUG }).valid, true);
});
