'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { scaffoldRule } = require('../src/lib/rule-scaffold');
const { runRuleNew } = require('../src/commands/rule-new');
const { runVerifyArtifact } = require('../src/commands/verify-artifact');
const { selectContext } = require('../src/context-selector');

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-rulenew-'));
  await fs.mkdir(path.join(dir, '.aioson', 'rules'), { recursive: true });
  return dir;
}

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

async function verifyRule(dir, relPath) {
  return runVerifyArtifact({
    args: [dir],
    options: { kind: 'rule', file: relPath, json: true, suppressExitCode: true },
    logger: makeLogger()
  });
}

test('rule:new scaffolds routable frontmatter', async () => {
  const dir = await makeProject();

  const result = await scaffoldRule(dir, {
    name: 'visual-quality-contract',
    description: 'The client design system outranks generic visual guidance',
    agents: 'dev,qa,briefing-refiner',
    paths: 'src/**,resources/**',
    triggers: 'layout,UI,component'
  });

  assert.equal(result.ok, true);
  assert.equal(result.path, '.aioson/rules/visual-quality-contract.md');

  const content = await fs.readFile(path.join(dir, result.path), 'utf8');
  assert.match(content, /^name: visual-quality-contract$/m);
  assert.match(content, /^agents: \[dev, qa, briefing-refiner\]$/m);
  assert.match(content, /^paths: \[src\/\*\*, resources\/\*\*\]$/m, 'globs must stay unquoted like the shipped rules');
  assert.match(content, /^priority: 50$/m);
  assert.match(content, /## Precedence/);
  assert.match(content, /outranks framework defaults/);
});

test('rule:new refuses to clobber an existing project rule without --force', async () => {
  const dir = await makeProject();
  await scaffoldRule(dir, { name: 'house-style', agents: 'dev' });
  await fs.writeFile(path.join(dir, '.aioson/rules/house-style.md'), 'hand-authored', 'utf8');

  const blocked = await scaffoldRule(dir, { name: 'house-style', agents: 'dev' });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'already_exists');
  assert.equal(await fs.readFile(path.join(dir, '.aioson/rules/house-style.md'), 'utf8'), 'hand-authored');

  const forced = await scaffoldRule(dir, { name: 'house-style', agents: 'dev', force: true });
  assert.equal(forced.ok, true);
  assert.equal(forced.overwritten, true);
});

test('rule:new rejects a non-kebab name and a non-AIOSON directory', async () => {
  const dir = await makeProject();

  assert.equal((await scaffoldRule(dir, { name: 'Visual Quality' })).reason, 'invalid_name');
  assert.equal((await scaffoldRule(dir, { name: '' })).reason, 'name_required');
  assert.equal((await scaffoldRule(dir, { name: 'ok-name', priority: 500 })).reason, 'invalid_priority');
  assert.equal((await scaffoldRule(dir, { name: 'ok-name', 'load-tier': 'sometimes' })).reason, 'invalid_load_tier');

  const bare = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-bare-'));
  assert.equal((await scaffoldRule(bare, { name: 'ok-name' })).reason, 'not_an_aioson_project');
});

test('rule:new warns when the rule declares no routing dimension', async () => {
  const dir = await makeProject();
  const result = await scaffoldRule(dir, { name: 'orphan-rule' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, ['no_routing_dimension']);
});

test('verify:artifact --kind=rule fails a freshly scaffolded rule until it is filled in', async () => {
  const dir = await makeProject();
  const scaffolded = await scaffoldRule(dir, {
    name: 'house-style',
    description: 'House component conventions',
    agents: 'dev',
    paths: 'src/**'
  });

  const unfilled = await verifyRule(dir, scaffolded.path);
  assert.equal(unfilled.ok, false);
  assert.match(unfilled.issues.join(' '), /placeholder/i);

  await fs.writeFile(path.join(dir, scaffolded.path), `---
name: house-style
description: House component conventions
priority: 50
agents: [dev]
load_tier: trigger
paths: [src/**]
---

# House style

## Precedence

This is a project rule. It outranks framework defaults and brain nodes.

## Rules

- Every table uses the shared DataTable component; never hand-roll a <table>.
- Currency renders through formatMoney(); never string-concatenate a symbol.
`, 'utf8');

  const filled = await verifyRule(dir, scaffolded.path);
  assert.equal(filled.ok, true, filled.issues.join('; '));
});

test('verify:artifact --kind=rule catches an unroutable rule', async () => {
  const dir = await makeProject();
  await fs.writeFile(path.join(dir, '.aioson/rules/unroutable.md'), `---
name: unroutable
description: Nothing routes to this
priority: 50
load_tier: trigger
---

## Rules

- Something checkable.
- Something else checkable.
`, 'utf8');

  const result = await verifyRule(dir, '.aioson/rules/unroutable.md');
  assert.equal(result.ok, false);
  assert.match(result.issues.join(' '), /no routing dimension/i);
});

test('a scaffolded rule is actually selected by context:select for its declared agent and path', async () => {
  const dir = await makeProject();
  const scaffolded = await scaffoldRule(dir, {
    name: 'visual-quality-contract',
    description: 'The client design system outranks generic visual guidance',
    agents: 'dev',
    paths: 'src/**',
    triggers: 'layout,component'
  });

  const selection = await selectContext(dir, {
    agent: 'dev',
    mode: 'executing',
    task: 'adjust the dashboard layout component',
    paths: 'src/ui/dashboard.tsx'
  });

  const selected = (selection.selected || selection.files || []).map((f) => f.path || f);
  assert.ok(
    selected.some((p) => String(p).replace(/\\/g, '/').includes('visual-quality-contract.md')),
    `scaffolded rule was not selected. Selected: ${JSON.stringify(selected)}`
  );
  assert.ok(scaffolded.ok);
});

test('rule:new reports the created path through the command layer', async () => {
  const dir = await makeProject();
  const logger = makeLogger();

  const result = await runRuleNew({
    args: [dir],
    options: { name: 'house-style', agents: 'dev', paths: 'src/**' },
    logger
  });

  assert.equal(result.ok, true);
  assert.match(logger.lines.join('\n'), /\.aioson\/rules\/house-style\.md/);
  assert.match(logger.lines.join('\n'), /verify:artifact/);
});
