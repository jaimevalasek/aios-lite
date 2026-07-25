'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  collectSystemFiles,
  createZipBuffer,
  obfuscateJs
} = require('../src/commands/store-system');

test('build packages retain TypeScript server runtime without source or node_modules', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-system-build-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  await fs.mkdir(path.join(dir, 'server'), { recursive: true });
  await fs.mkdir(path.join(dir, 'src'), { recursive: true });
  await fs.mkdir(path.join(dir, 'node_modules', 'tsx'), { recursive: true });
  await fs.writeFile(path.join(dir, 'server', 'server.ts'), 'export {}', 'utf8');
  await fs.writeFile(path.join(dir, 'src', 'main.ts'), 'export {}', 'utf8');
  await fs.writeFile(path.join(dir, 'node_modules', 'tsx', 'index.js'), 'module.exports = {}', 'utf8');

  const { files } = await collectSystemFiles(dir, { buildMode: true });

  assert.equal(files['server/server.ts'], 'export {}');
  assert.equal(files['src/main.ts'], undefined);
  assert.equal(files['node_modules/tsx/index.js'], undefined);
});

test('store packaging uses the supported Archiver v8 API and produces a ZIP buffer', async () => {
  const archive = await createZipBuffer({
    'index.js': 'module.exports = 42;\n',
    'docs/readme.md': '# Package\n'
  });

  assert.equal(archive.subarray(0, 2).toString('ascii'), 'PK');
  assert.equal(archive.length > 50, true);
});

test('build protection uses the existing Terser boundary without the vulnerable obfuscator chain', async () => {
  const source = 'function add(first, second) { return first + second; }\nmodule.exports = add;\n';
  const protectedSource = await obfuscateJs(source);

  assert.equal(typeof protectedSource, 'string');
  assert.equal(protectedSource.length < source.length, true);
  assert.match(protectedSource, /module\.exports/);
});
