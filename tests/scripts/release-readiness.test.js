'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  parseArgs,
  extractPackFiles,
  validatePackContents,
  filterUntrackedShippedFiles,
  collectLocalSpecifiers,
  findMissingLocalDependencies,
  resolveCommandInvocation
} = require('../../scripts/testing/release-readiness');

test('release readiness arguments keep the strict quick gate as the default', () => {
  assert.deepEqual(parseArgs([]), {
    full: false,
    allowUntracked: false,
    json: false
  });
  assert.deepEqual(parseArgs(['--full', '--allow-untracked', '--json']), {
    full: true,
    allowUntracked: true,
    json: true
  });
  assert.throws(() => parseArgs(['--unknown']), /Unknown option/);
  assert.deepEqual(resolveCommandInvocation('npm', ['test'], { platform: 'linux' }), {
    command: 'npm',
    args: ['test']
  });
});

test('package inventory parsing requires the release-critical files', () => {
  const files = extractPackFiles([{
    files: [
      { path: 'package.json' },
      { path: 'bin\\aioson.js' },
      { path: 'src/cli.js' }
    ]
  }]);
  assert.deepEqual(files, ['package.json', 'bin/aioson.js', 'src/cli.js']);
  assert.deepEqual(
    validatePackContents(files, ['package.json', 'src/cli.js', 'template/AGENTS.md']),
    ['template/AGENTS.md']
  );
});

test('untracked package guard ignores tests but catches every shipped root', () => {
  const output = [
    'tests/new-test.test.js',
    'src/new-runtime.js',
    'scripts/testing/new-gate.js',
    'template/.aioson/new.md',
    'notes/local.md'
  ].join('\n');
  assert.deepEqual(filterUntrackedShippedFiles(output), [
    'scripts/testing/new-gate.js',
    'src/new-runtime.js',
    'template/.aioson/new.md'
  ]);
});

test('static dependency extraction covers CommonJS and ESM literals only', () => {
  const source = [
    "const a = require('./a');",
    "require.resolve('../b.json');",
    "const c = import('./c.js');",
    "export { d } from './d.js';",
    "require(variable);",
    "// require('./comment-only');",
    "const generated = `require('./generated-text')`;",
    "const quoted = \"require('./quoted-text')\";"
  ].join('\n');
  assert.deepEqual(
    collectLocalSpecifiers(source).sort(),
    ['./a', './c.js', './d.js', '../b.json'].sort()
  );
});

test('package closure reports a local runtime module excluded from the tarball', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-release-readiness-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  await fs.writeFile(path.join(root, 'src', 'entry.js'), "require('./worker');\n", 'utf8');
  await fs.writeFile(path.join(root, 'src', 'worker.js'), 'module.exports = true;\n', 'utf8');

  assert.deepEqual(
    await findMissingLocalDependencies(root, ['src/entry.js']),
    [{
      source: 'src/entry.js',
      specifier: './worker',
      resolved: 'src/worker.js'
    }]
  );
  assert.deepEqual(
    await findMissingLocalDependencies(root, ['src/entry.js', 'src/worker.js']),
    []
  );
});
