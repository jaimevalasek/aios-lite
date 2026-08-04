'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeStoragePolicy,
  normalizeOutputStrategy,
  inspectOutputPolicy
} = require('../src/squad/output-policy');

test('new squad output policy is file-first and preserves delivery settings', () => {
  const strategy = normalizeOutputStrategy({
    mode: 'hybrid',
    fileOutput: { enabled: false, formats: ['json'] },
    dataOutput: { enabled: true, storage: 'sqlite', table: 'content_items' },
    delivery: { autoPublish: true, webhooks: [{ slug: 'cms', trigger: 'on-publish' }] }
  }, { outputDir: 'output/editorial' });

  assert.equal(strategy.mode, 'files');
  assert.equal(strategy.fileOutput.enabled, true);
  assert.equal(strategy.fileOutput.dir, 'output/editorial/');
  assert.deepEqual(strategy.fileOutput.formats, ['json']);
  assert.equal(strategy.dataOutput, undefined);
  assert.equal(strategy.delivery.autoPublish, true);
});

test('storage policy normalizes legacy database primary without losing export preferences', () => {
  const policy = normalizeStoragePolicy({
    primary: 'sqlite',
    artifacts: 'sqlite-json',
    exports: { html: false, pdf: true }
  }, { outputDir: 'output/research' });

  assert.equal(policy.primary, 'file');
  assert.equal(policy.artifacts, 'output/research/');
  assert.equal(policy.exports.html, false);
  assert.equal(policy.exports.markdown, true);
  assert.equal(policy.exports.pdf, true);
});

test('legacy manifests remain inspectable but receive actionable migration warnings', () => {
  const inspection = inspectOutputPolicy({
    storagePolicy: { primary: 'sqlite' },
    outputStrategy: {
      mode: 'hybrid',
      fileOutput: { enabled: false },
      dataOutput: { enabled: true }
    }
  });

  assert.equal(inspection.legacy, true);
  assert.equal(inspection.canonicalStorage, 'file');
  assert.equal(inspection.canonicalOutputMode, 'files');
  assert.equal(inspection.warnings.length, 4);
  assert.ok(inspection.warnings.every((warning) => /legacy|deprecated/.test(warning)));
});
