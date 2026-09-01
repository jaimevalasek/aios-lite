'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { MANAGED_FILES } = require('../src/constants');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'template', '.aioson');
const WORKSPACE = path.join(ROOT, '.aioson');
const MODULES = [
  'docs/setup/onboarding-flow.md',
  'docs/setup/stack-and-design-reference.md',
  'docs/setup/context-and-handoff.md',
  'docs/setup/legacy-agent-contract.md'
];

async function read(root, relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

test('Setup keeps a compact hot path and preserves its legacy contract off path', async () => {
  const [kernel, legacy] = await Promise.all([
    read(TEMPLATE, 'agents/setup.md'),
    read(TEMPLATE, 'docs/setup/legacy-agent-contract.md')
  ]);

  assert.ok(kernel.length < 10000, `Setup kernel is ${kernel.length} chars`);
  assert.ok(legacy.length > 22000, 'legacy Setup intelligence was not preserved');
  assert.match(kernel, /Never load every module/i);
  assert.match(kernel, /legacy-agent-contract\.md.*non-executable history/is);

  for (const module of [
    'onboarding-flow.md',
    'stack-and-design-reference.md',
    'context-and-handoff.md'
  ]) {
    assert.ok(kernel.includes(module), `Setup kernel missing ${module}`);
  }
});

test('Setup entry routing repairs evidence-first and avoids repeated onboarding', async () => {
  const kernel = await read(TEMPLATE, 'agents/setup.md');

  assert.match(kernel, /Context exists and is valid.*Do not run full onboarding/is);
  assert.match(kernel, /repair every inferable field first/is);
  assert.match(kernel, /scan:project \. --folder=src/);
  assert.match(kernel, /one repair pass and one clarification pass/i);
  assert.match(kernel, /never ask again for a confirmed value/i);
  assert.match(kernel, /npx @jaimevalasek\/aioson setup \./);
});

test('Setup onboarding remains description-first, bounded, and decision-aware', async () => {
  const [kernel, onboarding] = await Promise.all([
    read(TEMPLATE, 'agents/setup.md'),
    read(TEMPLATE, 'docs/setup/onboarding-flow.md')
  ]);
  const active = `${kernel}\n${onboarding}`;

  assert.match(active, /decision-presentation\/SKILL\.md/);
  assert.match(onboarding, /setup:context \. --defaults --json/);
  assert.match(onboarding, /Describe the project in one or two sentences/i);
  assert.match(onboarding, /0–1 = MICRO.*2–3 = SMALL.*4–6 = MEDIUM/is);
  assert.match(onboarding, /update only those fields and reconfirm once/i);
  assert.match(onboarding, /Do not keep asking optional questions/i);
  assert.match(kernel, /Partial answers narrow the next question/i);
});

test('Setup preserves stack, design, context, and workflow contracts', async () => {
  const [kernel, onboarding, reference, context] = await Promise.all([
    read(TEMPLATE, 'agents/setup.md'),
    read(TEMPLATE, 'docs/setup/onboarding-flow.md'),
    read(TEMPLATE, 'docs/setup/stack-and-design-reference.md'),
    read(TEMPLATE, 'docs/setup/context-and-handoff.md')
  ]);
  const active = `${kernel}\n${onboarding}\n${reference}\n${context}`;

  assert.match(active, /interface-design/);
  // The design skill is never a question: the CLI writes the engine (2026-09-01).
  assert.match(active, /design_skill: "interface-design"/);
  assert.doesNotMatch(active, /design_skill: ""/);
  assert.match(active, /reference images/i);
  assert.match(active, /framework_installed.*true.*detected/is);
  assert.match(active, /interaction_language/);
  assert.match(active, /conversation_language.*legacy compatibility alias/is);
  assert.match(active, /aioson verify:artifact \. --kind=project-context/);
  assert.match(active, /optional `spec\.md`/i);
  assert.match(active, /Route every project type\/classification to `@product`/);
  assert.match(kernel, /do not implement in the setup turn/i);
});

test('Setup modules are managed and mirrored byte-for-byte', async () => {
  for (const relativePath of MODULES) {
    const managedPath = `.aioson/${relativePath}`;
    assert.equal(MANAGED_FILES.includes(managedPath), true, `missing managed file: ${managedPath}`);

    const [template, workspace] = await Promise.all([
      read(TEMPLATE, relativePath),
      read(WORKSPACE, relativePath)
    ]);
    assert.equal(workspace, template, `template/workspace drift: ${relativePath}`);
  }

  const [templateAgent, workspaceAgent] = await Promise.all([
    read(TEMPLATE, 'agents/setup.md'),
    read(WORKSPACE, 'agents/setup.md')
  ]);
  assert.equal(workspaceAgent, templateAgent, 'template/workspace drift: agents/setup.md');
});
