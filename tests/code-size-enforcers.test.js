'use strict';

/**
 * The size doctrine, measured. design-docs/file-size.md said "> 500 lines:
 * alert" and "the alert is never blocking"; nothing counted a line, and no gate
 * ever measured a function. These checkers make both numbers machine-checked
 * through rules:check: advisory (MED) when the routed doc binds them, blocking
 * (HIGH) when a project rule does — with the rule's thresholds winning.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runRulesCheck, discoverGovernance } = require('../src/commands/rules-check');
const { countLogicLines, braceFunctions, indentFunctions, measureFile, neutralizeBraceCode, SIZE_EXEMPT_PATH } = require('../src/lib/code-size');

const silent = { log() {}, error() {} };

async function scaffold(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-code-size-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf8');
  }
  return dir;
}

function jsFunction(name, bodyLines) {
  return [`function ${name}(a, b) {`, ...Array.from({ length: bodyLines }, (_, i) => `  const v${i} = a + b + ${i};`), '  return a;', '}'].join('\n');
}

const SIZE_DOC = `---
description: size doctrine
enforcement: [file-size, function-size]
max_file_lines: 500
max_function_lines: 60
---
`;

test('logic lines exclude blanks, comments, JSDoc bodies and closing-bracket-only lines', () => {
  const src = [
    '/**',
    ' * doc',
    ' */',
    'function f() {',
    '  // comment',
    '  const a = 1; /* inline */',
    '',
    '  return a;',
    '}',
    '  );',
    '});'
  ];
  assert.equal(countLogicLines(src), 3);
  assert.equal(countLogicLines(['# c', 'x = 1', '#[derive(Debug)]'], { hashComments: true }), 2, 'a Rust attribute is not a comment');
});

test('the neutralizer blanks strings, templates with interpolations, comments and regex literals — structure survives', () => {
  const src = 'const re = /[{}]/g; const s = "}{"; const t = `a ${ b ? "{" : "}" } {`; // }\nfoo({ x: 1 });';
  const out = neutralizeBraceCode(src);
  assert.equal(out.split('\n').length, 2, 'line count is preserved');
  const opens = (out.match(/\{/g) || []).length;
  const closes = (out.match(/\}/g) || []).length;
  assert.equal(opens, closes, `braces must balance after neutralization: ${out}`);
  assert.doesNotMatch(out, /\[\{\}\]/);
});

test('named functions are found across languages; control flow and callbacks are not functions', () => {
  const js = [
    jsFunction('big', 3),
    'const arrow = async (x) => {',
    '  return x;',
    '};',
    'class K {',
    '  method(p): number {',
    '    return p;',
    '  }',
    '  async get(): Promise<void> {',
    '    await this.load();',
    '  }',
    '}',
    'if (cond) {',
    '  go();',
    '}',
    'for (let i = 0; i < 3; i += 1) {',
    '  go(i);',
    '}',
    "describe('suite', () => {",
    "  it('case', () => {});",
    '});',
    "app.get('/x', (req, res) => {",
    '  res.end();',
    '});',
    'export default async function handler<T>(req: Request): Promise<T> {',
    '  return await go(req);',
    '}'
  ].join('\n');
  const names = braceFunctions(js.split('\n')).map((f) => f.name);
  assert.deepEqual(names, ['big', 'arrow', 'method', 'get', 'handler']);

  const go = ['func (s *Server) handle(w http.ResponseWriter, r *http.Request) {', '  s.n++', '}', 'func New() *Server {', '  return &Server{}', '}'];
  assert.deepEqual(braceFunctions(go).map((f) => f.name), ['handle', 'New']);
  const rust = ['pub async fn new(cfg: &Config) -> Result<Self, Error> {', '  Ok(Self {})', '}', 'fn select(x: u8) -> u8 {', '  x', '}'];
  assert.deepEqual(braceFunctions(rust).map((f) => f.name), ['new', 'select'], 'a name after an explicit keyword is never a control word');
  const java = ['public static void main(String[] args) {', '  System.out.println(1);', '}', 'private Map<String,Integer> index(List<String> in) throws IOException {', '  return null;', '}'];
  assert.deepEqual(braceFunctions(java).map((f) => f.name), ['main', 'index']);
  const kotlin = ['override fun onCreate(savedInstanceState: Bundle?) {', '  super.onCreate(savedInstanceState)', '}'];
  assert.deepEqual(braceFunctions(kotlin).map((f) => f.name), ['onCreate']);
  const php = ['public function handle(Request $request): Response {', '  return new Response();', '}'];
  assert.deepEqual(braceFunctions(php).map((f) => f.name), ['handle']);

  const py = ['def a(x):', '    # c', '    if x:', '        return 1', '    return 2', '', 'class C:', '    def m(self):', '        return 3', 'print(1)'];
  assert.deepEqual(indentFunctions(py).map((f) => [f.name, f.logic]), [['a', 4], ['m', 2]]);
  const rb = ['def total', '  items.sum', 'end', 'puts total'];
  assert.deepEqual(indentFunctions(rb).map((f) => [f.name, f.start, f.end]), [['total', 1, 3]]);
});

test('a multi-line signature still finds its body; a bodiless signature is skipped', () => {
  const src = [
    'export async function longSignature(',
    '  first: string,',
    '  second: number',
    '): Promise<void> {',
    '  await go(first, second);',
    '}',
    'interface I {',
    '  declared(a: string): void;',
    '}'
  ];
  const fns = braceFunctions(src);
  assert.deepEqual(fns.map((f) => [f.name, f.start, f.end]), [['longSignature', 1, 6]]);
});

test('the doctrine exemptions are the checker exemptions — and a two-letter module name is not a locale file', () => {
  for (const p of ['src/__tests__/a.ts', 'tests/b.js', 'src/a.spec.ts', 'src/i18n/pt-BR.ts', 'src/messages.json', 'config/app.ts', 'app/routes.php', 'db/migrations/001_init.rb', 'src/x.generated.ts', 'src/types.d.ts', 'pkg/a_test.go']) {
    assert.equal(SIZE_EXEMPT_PATH.test(p), true, `${p} must be exempt`);
  }
  for (const p of ['src/db.js', 'src/ui.ts', 'app/controllers/orders.rb', 'src/core/engine.ts', 'lib/io.go']) {
    assert.equal(SIZE_EXEMPT_PATH.test(p), false, `${p} must be measured`);
  }
  assert.equal(measureFile('src/x.test.ts', ['a', 'b']).exempt, true);
});

test('bound by a doc, size findings are advisory MED with the doctrine thresholds from its frontmatter', async () => {
  const dir = await scaffold({
    '.aioson/docs/quality/code-size-limits.md': SIZE_DOC,
    'src/small.js': jsFunction('fine', 10),
    'src/long-function.js': jsFunction('narrates', 70),
    'src/big-file.js': Array.from({ length: 60 }, (_, i) => jsFunction(`f${i}`, 8)).join('\n'),
    'src/__tests__/huge.test.js': Array.from({ length: 60 }, (_, i) => jsFunction(`t${i}`, 8)).join('\n')
  });
  const report = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true }, logger: silent });

  assert.equal(report.ok, true, 'a doc-bound finding never refuses the stage');
  assert.equal(report.by_severity.HIGH || 0, 0);
  const fileSize = report.findings.filter((f) => f.category === 'FILE_SIZE');
  const fnSize = report.findings.filter((f) => f.category === 'FUNCTION_SIZE');
  assert.deepEqual(fileSize.map((f) => f.file), ['src/big-file.js'], 'the test file is exempt');
  assert.equal(fileSize[0].severity, 'MED');
  assert.equal(fileSize[0].authority, 'advisory');
  assert.match(fileSize[0].message, /^\d+ logic lines \(limit 500\)/);
  assert.equal(fnSize.length, 1);
  assert.equal(fnSize[0].file, 'src/long-function.js');
  assert.equal(fnSize[0].token, 'narrates');
  assert.equal(fnSize[0].line, 1);
  assert.match(fnSize[0].message, /`narrates` has 7\d logic lines \(limit 60, lines 1-7\d\)/);

  // One document, two checkers — coverage counts the document once.
  assert.equal(report.coverage.docs.total, 1);
  assert.equal(report.coverage.docs.enforced, 1);
  assert.deepEqual(report.rules_enforced.map((r) => r.enforcement).sort(), ['file-size', 'function-size']);

  // …and each row counts ITS OWN checker. A row is one (document × checker)
  // pair, so a count keyed only on the document reported every row with the
  // sum of both — this doc is the first to declare two, and the summary said
  // 2 file-size violations next to a findings list holding exactly 1.
  const byEnforcement = Object.fromEntries(report.rules_enforced.map((row) => [row.enforcement, row.violations]));
  assert.deepEqual(byEnforcement, { 'file-size': fileSize.length, 'function-size': fnSize.length });
  assert.deepEqual(byEnforcement, { 'file-size': 1, 'function-size': 1 });
  const human = [];
  await runRulesCheck({ args: [dir], options: { suppressExitCode: true }, logger: { log: (m = '') => human.push(String(m)), error() {} } });
  assert.equal(human.filter((line) => /code-size-limits .*\(1\)$/.test(line)).length, 2, human.join('\n'));
});

test('a project rule makes the size limit law: HIGH, blocking, and its thresholds outrank the doc', async () => {
  const dir = await scaffold({
    '.aioson/docs/quality/code-size-limits.md': SIZE_DOC,
    '.aioson/rules/code-size.md': '---\nname: code-size\ndescription: strict\nenforcement: file-size, function-size\nmax_file_lines: 400\nmax_function_lines: 40\n---\n',
    'src/medium.js': jsFunction('fortyFive', 45)
  });
  const report = await runRulesCheck({ args: [dir], options: { json: true, suppressExitCode: true }, logger: silent });
  assert.equal(report.ok, false);
  const fn = report.findings.find((f) => f.category === 'FUNCTION_SIZE');
  assert.ok(fn, JSON.stringify(report.findings));
  assert.equal(fn.severity, 'HIGH');
  assert.equal(fn.authority, 'binding');
  assert.match(fn.message, /limit 40/);
  assert.deepEqual(fn.declared_by.sort(), ['code-size', 'code-size-limits']);
});

test('discovery reads a bracketed list, a comma list, and a single id the same way', async () => {
  const dir = await scaffold({
    '.aioson/rules/a.md': '---\nname: a\nenforcement: [file-size, function-size]\n---\n',
    '.aioson/rules/b.md': '---\nname: b\nenforcement: file-size, no-native-dialogs\n---\n',
    '.aioson/rules/c.md': '---\nname: c\nenforcement: function-size\n---\n',
    '.aioson/rules/d.md': '---\nname: d\nenforcement: [file-size, not-a-checker]\n---\n'
  });
  const docs = await discoverGovernance(dir);
  const byName = Object.fromEntries(docs.map((d) => [d.name, d]));
  assert.deepEqual(byName.a.enforcements, ['file-size', 'function-size']);
  assert.deepEqual(byName.b.enforcements, ['file-size', 'no-native-dialogs']);
  assert.deepEqual(byName.c.enforcements, ['function-size']);
  assert.equal(byName.c.enforcement, 'function-size', 'the single-id field stays for every older reader');
  assert.deepEqual(byName.d.enforcements, ['file-size'], 'an unknown id is dropped, the known one still binds');
  assert.equal(byName.d.declared_enforcement, 'file-size, not-a-checker');
});

test('the shipped template binds the size checkers through the quality doc with the doctrine numbers', async () => {
  const root = path.resolve(__dirname, '..');
  const docs = await discoverGovernance(path.join(root, 'template'));
  const sizeDoc = docs.find((d) => d.path === '.aioson/docs/quality/code-size-limits.md');
  assert.ok(sizeDoc, 'template/.aioson/docs/quality/code-size-limits.md must exist and be discovered');
  assert.deepEqual(sizeDoc.enforcements, ['file-size', 'function-size']);
  assert.equal(sizeDoc.authority, 'advisory');
  assert.equal(Number(sizeDoc.frontmatter.max_file_lines), 500);
  assert.equal(Number(sizeDoc.frontmatter.max_function_lines), 60);
  const mirror = await fs.readFile(path.join(root, '.aioson/docs/quality/code-size-limits.md'), 'utf8');
  const template = await fs.readFile(path.join(root, 'template/.aioson/docs/quality/code-size-limits.md'), 'utf8');
  assert.equal(mirror, template, 'workspace mirror must match the template');
});
