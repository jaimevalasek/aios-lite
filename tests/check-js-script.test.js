'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  collectJsFiles,
  resolveConcurrency,
  runSyntaxCheck
} = require('../scripts/check-js');

test('syntax checker discovers supported JavaScript files recursively', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-syntax-check-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'nested'));
  await fs.writeFile(path.join(root, 'a.js'), 'module.exports = true;\n');
  await fs.writeFile(path.join(root, 'nested', 'b.mjs'), 'export default true;\n');
  await fs.writeFile(path.join(root, 'ignored.ts'), 'export const value = true;\n');

  assert.deepEqual(
    collectJsFiles(root).map((file) => path.basename(file)).sort(),
    ['a.js', 'b.mjs']
  );
});

test('syntax checker uses bounded concurrency and reports invalid files', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-syntax-check-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const good = path.join(root, 'good.js');
  const bad = path.join(root, 'bad.js');
  await fs.writeFile(good, 'module.exports = true;\n');
  await fs.writeFile(bad, 'const broken = ;\n');

  const result = await runSyntaxCheck({ files: [good, bad], concurrency: 2 });
  assert.equal(resolveConcurrency(100), 32);
  assert.equal(result.ok, false);
  assert.equal(result.files, 2);
  assert.equal(result.concurrency, 2);
  assert.deepEqual(result.failures.map((item) => path.basename(item.file)), ['bad.js']);
});
