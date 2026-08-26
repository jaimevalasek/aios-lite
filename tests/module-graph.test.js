'use strict';

/**
 * The coupling doctrine, measured. componentization.md said "dependencies
 * point downward" and file-size.md named the God object; nothing counted an
 * import edge, and no gate ever saw a cycle. These checkers make fan-out and
 * import cycles machine-checked through rules:check: advisory (MED) when the
 * routed doc binds them, blocking (HIGH) when a project rule does.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runRulesCheck, discoverGovernance } = require('../src/commands/rules-check');
const { buildModuleGraph, cyclePath, jsSpecifiers, pySpecifiers, stripJsComments, stronglyConnected } = require('../src/lib/module-graph');
const { MANAGED_FILES } = require('../src/constants');

const silent = { log() {}, error() {} };

async function scaffold(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-module-graph-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf8');
  }
  return dir;
}

function graphOf(files) {
  return buildModuleGraph(Object.entries(files).map(([rel, text]) => ({ rel, lines: text.split('\n') })));
}

const COUPLING_DOC = `---
description: coupling doctrine
enforcement: [module-fan-out, import-cycle]
max_module_fan_out: 15
---
`;

test('JS/TS specifiers: every import form is read, comments are not, strings keep their contents', () => {
  const src = [
    "import a from './a';",
    "import type { T } from './types';",
    "import './side-effect';",
    "export * from './barrel';",
    "export { x } from './x';",
    "const b = require('./b.js');",
    "const lazy = () => import('./lazy');",
    "// import gone from './gone';",
    "/* import gone2 from './gone2'; */",
    "const url = 'http://example.test/not-a-comment'; import c from './c';",
    "import react from 'react';"
  ].join('\n');
  assert.deepEqual(jsSpecifiers(src), ['./a', './types', './side-effect', './c', 'react', './barrel', './x', './lazy', './b.js']);
  assert.equal(stripJsComments("const s = 'a // b'; // real comment"), "const s = 'a // b'; ");
});

test('Python specifiers: import, from-import with names, relative dots, docstrings ignored', () => {
  const lines = [
    '"""',
    'import fake_in_docstring',
    '"""',
    'import os, sys',
    'import app.services.mail as mail',
    'from .models import User, Order',
    'from ..core import (db,',
    '    cache)',
    'from app.models import user',
    '# from .nope import x',
    "s = 'from .also_not import y'"
  ];
  assert.deepEqual(pySpecifiers(lines), [
    { module: 'os', names: [] },
    { module: 'sys', names: [] },
    { module: 'app.services.mail', names: [] },
    { module: '.models', names: ['User', 'Order'] },
    { module: '..core', names: ['db', 'cache'] },
    { module: 'app.models', names: ['user'] }
  ]);
});

test('the graph resolves internal edges only — extension swaps, index files, aliases, Python packages; externals and assets are not edges', () => {
  const graph = graphOf({
    'src/app.ts': "import { a } from './a';\nimport b from './b.js';\nimport dir from './dir';\nimport alias from '@/util/alias';\nimport react from 'react';\nimport './styles.css';\nimport data from './data.json';",
    'src/a.ts': "export const a = 1;",
    'src/b.ts': "export default 2;",
    'src/dir/index.tsx': "export default 3;",
    'src/util/alias.ts': "export default 4;",
    'src/styles.css': 'body {}',
    'src/data.json': '{}',
    'pkg/__init__.py': '',
    'pkg/models/__init__.py': 'from .user import User',
    'pkg/models/user.py': 'class User: pass',
    'pkg/services/mail.py': 'from pkg.models import user\nfrom ..models import User\nimport requests',
    'src/py/run.py': 'import pkg.services.mail'
  });
  const app = graph.nodes.get('src/app.ts');
  assert.deepEqual(app.imports, ['src/a.ts', 'src/b.ts', 'src/dir/index.tsx', 'src/util/alias.ts']);
  assert.equal(app.fan_out, 4);
  assert.equal(app.external, 1, 'react is a dependency decision, not an edge');
  assert.equal(graph.nodes.get('src/a.ts').fan_in, 1);
  assert.equal(graph.nodes.has('src/styles.css'), false);
  const mail = graph.nodes.get('pkg/services/mail.py');
  assert.deepEqual(mail.imports, ['pkg/models/__init__.py', 'pkg/models/user.py']);
  assert.equal(mail.external, 1);
  assert.deepEqual(graph.nodes.get('src/py/run.py').imports, ['pkg/services/mail.py']);
  assert.deepEqual(graph.nodes.get('pkg/models/__init__.py').imports, ['pkg/models/user.py']);
  assert.deepEqual(graph.cycles, []);
});

test('cycles are found with their shortest path; a tree without cycles reports none', () => {
  const graph = graphOf({
    'src/a.js': "require('./b'); require('./util');",
    'src/b.js': "require('./c');",
    'src/c.js': "require('./a'); require('./d');",
    'src/d.js': "module.exports = 1;",
    'src/util.js': "module.exports = 2;"
  });
  assert.deepEqual(graph.cycles, [['src/a.js', 'src/b.js', 'src/c.js']]);
  assert.deepEqual(cyclePath(graph, 'src/a.js'), ['src/a.js', 'src/b.js', 'src/c.js', 'src/a.js']);
  assert.deepEqual(cyclePath(graph, 'src/b.js'), ['src/b.js', 'src/c.js', 'src/a.js', 'src/b.js']);
  assert.equal(cyclePath(graph, 'src/d.js'), null);
  const sccs = stronglyConnected(new Map([['x', new Set(['y'])], ['y', new Set(['x'])], ['z', new Set()]]));
  assert.deepEqual(sccs.map((s) => s.sort()).sort(), [['x', 'y'], ['z']]);
});

test('rules:check bound by the routed doc: fan-out and cycles are MED advisory findings over the checked files only, with a directed message', async () => {
  const many = Array.from({ length: 16 }, (_, i) => `import m${i} from './m/m${i}';`).join('\n');
  const files = {
    '.aioson/docs/quality/coupling-limits.md': COUPLING_DOC,
    'src/hub.ts': many,
    'src/cycle/a.ts': "import './b';",
    'src/cycle/b.ts': "import './a';",
    'src/leaf.ts': "export const leaf = 1;",
    'tests/hub.test.ts': many
  };
  for (let i = 0; i < 16; i += 1) files[`src/m/m${i}.ts`] = `export default ${i};`;
  const dir = await scaffold(files);
  const report = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true }, logger: silent });
  assert.equal(report.ok, true, 'doc-bound coupling checks never refuse');
  const fanOut = report.findings.filter((f) => f.category === 'MODULE_FAN_OUT');
  assert.equal(fanOut.length, 1, JSON.stringify(report.findings));
  assert.equal(fanOut[0].file, 'src/hub.ts');
  assert.equal(fanOut[0].severity, 'MED');
  assert.equal(fanOut[0].authority, 'advisory');
  assert.match(fanOut[0].message, /imports 16 internal modules \(limit 15\)/);
  assert.match(fanOut[0].snippet, /fan-out 16, fan-in 0: src\/m\/m0\.ts/);
  const cycles = report.findings.filter((f) => f.category === 'IMPORT_CYCLE');
  assert.deepEqual(cycles.map((f) => f.file).sort(), ['src/cycle/a.ts', 'src/cycle/b.ts']);
  assert.equal(cycles[0].severity, 'MED');
  assert.match(cycles.find((f) => f.file === 'src/cycle/a.ts').message, /part of an import cycle \(2 modules\): src\/cycle\/a\.ts → src\/cycle\/b\.ts → src\/cycle\/a\.ts/);
  assert.equal(cycles[0].token, 'src/cycle/a.ts>src/cycle/b.ts', 'keyed by the cycle for a stable baseline');
  assert.equal(report.findings.some((f) => f.file === 'tests/hub.test.ts'), false, 'tests are exempt');
  const rows = Object.fromEntries(report.rules_enforced.map((row) => [row.enforcement, row.violations]));
  assert.deepEqual(rows, { 'module-fan-out': 1, 'import-cycle': 2 });

  // Only the files under check carry findings; the graph is still the whole tree.
  const scoped = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true, paths: 'src/cycle/a.ts' }, logger: silent });
  assert.deepEqual(scoped.findings.map((f) => `${f.category}:${f.file}`), ['IMPORT_CYCLE:src/cycle/a.ts']);
});

test('a project rule makes coupling law: HIGH, blocking, its threshold outranks the doc; --baseline records the legacy tangle', async () => {
  const dir = await scaffold({
    '.aioson/docs/quality/coupling-limits.md': COUPLING_DOC,
    '.aioson/rules/coupling.md': '---\nname: coupling\ndescription: strict\nenforcement: [module-fan-out, import-cycle]\nmax_module_fan_out: 2\n---\n',
    'src/hub.js': "require('./a'); require('./b'); require('./c');",
    'src/a.js': "require('./b');",
    'src/b.js': "require('./a');",
    'src/c.js': 'module.exports = 1;'
  });
  const report = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true }, logger: silent });
  assert.equal(report.ok, false);
  const fanOut = report.findings.find((f) => f.category === 'MODULE_FAN_OUT');
  assert.equal(fanOut.severity, 'HIGH');
  assert.equal(fanOut.authority, 'binding');
  assert.match(fanOut.message, /imports 3 internal modules \(limit 2\)/);
  assert.deepEqual(fanOut.declared_by.sort(), ['coupling', 'coupling-limits']);
  assert.equal(report.findings.filter((f) => f.category === 'IMPORT_CYCLE' && f.severity === 'HIGH').length, 2);

  const baselined = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true, baseline: true }, logger: silent });
  assert.equal(baselined.ok, true, JSON.stringify(baselined));
  const after = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true }, logger: silent });
  assert.equal(after.ok, true, 'the recorded tangle is counted debt, not a block');
  assert.equal(after.findings.filter((f) => f.severity === 'HIGH').length, 0);
});

test('composition roots and barrels are exempt from fan-out only — a cycle through them still reports', async () => {
  const many = Array.from({ length: 16 }, (_, i) => `import m${i} from './m/m${i}';`).join('\n');
  const files = {
    '.aioson/docs/quality/coupling-limits.md': COUPLING_DOC,
    'src/cli.ts': `${many}\nimport './m/m0';`,
    'src/area/index.ts': many.replace(/\.\/m\//g, '../m/'),
    'src/m/m0.ts': "import '../cli';"
  };
  for (let i = 1; i < 16; i += 1) files[`src/m/m${i}.ts`] = `export default ${i};`;
  const dir = await scaffold(files);
  const report = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true }, logger: silent });
  assert.equal(report.findings.filter((f) => f.category === 'MODULE_FAN_OUT').length, 0, JSON.stringify(report.findings));
  assert.deepEqual(report.findings.filter((f) => f.category === 'IMPORT_CYCLE').map((f) => f.file).sort(), ['src/cli.ts', 'src/m/m0.ts']);
});

test('the shipped template binds the coupling checkers through the quality doc and ships it as a managed file', async () => {
  const root = path.resolve(__dirname, '..');
  const docs = await discoverGovernance(path.join(root, 'template'));
  const doc = docs.find((d) => d.path === '.aioson/docs/quality/coupling-limits.md');
  assert.ok(doc, 'template/.aioson/docs/quality/coupling-limits.md must exist and be discovered');
  assert.deepEqual(doc.enforcements, ['module-fan-out', 'import-cycle']);
  assert.equal(doc.authority, 'advisory');
  assert.equal(Number(doc.frontmatter.max_module_fan_out), 15);
  assert.equal(MANAGED_FILES.includes('.aioson/docs/quality/coupling-limits.md'), true);
  const mirror = await fs.readFile(path.join(root, '.aioson/docs/quality/coupling-limits.md'), 'utf8');
  const template = await fs.readFile(path.join(root, 'template/.aioson/docs/quality/coupling-limits.md'), 'utf8');
  assert.equal(mirror, template, 'workspace mirror must match the template');
});
