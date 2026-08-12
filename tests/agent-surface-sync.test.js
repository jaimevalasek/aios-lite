'use strict';

// Drift guard for the derived agent surfaces. The audit of 2026-08-12 found the
// slash-command wrappers, the routing table, and the neo catalog silently stale
// against AGENT_DEFINITIONS (orchestrator/scope-check/pm/discovery-design-doc
// wrappers advertised abolished artifacts; @benchmark was unreachable). This
// test makes that class of drift fail loudly instead of misleading routing.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { AGENT_DEFINITIONS } = require('../src/constants');

const WRAPPER_DIR = '.claude/commands/aioson/agent';

// Artifact surfaces abolished by the kernel (config.md: "Requirements/spec/
// design/readiness/conformance/harness documents are never canonical
// prerequisites"). A wrapper naming one of these misleads agent selection.
const ABOLISHED_TOKENS = [
  'architecture.md',
  'ui-spec',
  'readiness.md',
  'requirements-{slug}',
  'spec-{slug}',
  'parallel/*.status.md'
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function existsAt(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

test('every AGENT_DEFINITIONS entry has its agent file, byte-identical in workspace and template', () => {
  for (const def of AGENT_DEFINITIONS) {
    const workspace = def.path;
    const template = path.join('template', def.path);
    assert.ok(existsAt(workspace), `${def.id}: missing ${workspace}`);
    assert.ok(existsAt(template), `${def.id}: missing ${template}`);
    assert.strictEqual(
      read(workspace),
      read(template),
      `${def.id}: ${workspace} drifted from template copy — edit template and run npm run sync:agents`
    );
  }
});

test('every AGENT_DEFINITIONS entry has a wrapper pointing at its instruction file, byte-identical in workspace and template', () => {
  for (const def of AGENT_DEFINITIONS) {
    const wrapper = `${WRAPPER_DIR}/${def.id}.md`;
    const templateWrapper = path.join('template', wrapper);
    assert.ok(existsAt(wrapper), `${def.id}: missing ${wrapper}`);
    assert.ok(existsAt(templateWrapper), `${def.id}: missing ${templateWrapper}`);
    const body = read(wrapper);
    assert.strictEqual(
      body,
      read(templateWrapper),
      `${def.id}: wrapper drifted from template copy`
    );
    assert.ok(
      body.includes(def.path),
      `${def.id}: wrapper does not reference its instruction file ${def.path}`
    );
    assert.ok(
      body.startsWith(`---\ndescription: "AIOSON — ${def.description}"`),
      `${def.id}: wrapper description drifted from AGENT_DEFINITIONS — regenerate it ("AIOSON — ${def.description}")`
    );
  }
});

test('every installed agent file has a wrapper (doctor contract)', () => {
  const agentsDir = path.join(ROOT, '.aioson', 'agents');
  const names = fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
  for (const name of names) {
    assert.ok(
      existsAt(`${WRAPPER_DIR}/${name}.md`),
      `agent file ${name}.md has no slash wrapper under ${WRAPPER_DIR}`
    );
  }
});

test('no wrapper advertises an abolished artifact surface', () => {
  const dir = path.join(ROOT, WRAPPER_DIR);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const body = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const token of ABOLISHED_TOKENS) {
      assert.ok(
        !body.includes(token),
        `${WRAPPER_DIR}/${file} advertises abolished surface "${token}" — regenerate it from AGENT_DEFINITIONS`
      );
    }
  }
});

test('routing table and neo catalog reach every defined agent', () => {
  const routing = read('.aioson/docs/gateway/agent-routing.md');
  const catalog = read('.aioson/docs/neo/agent-catalog.md');
  for (const def of AGENT_DEFINITIONS) {
    assert.ok(
      routing.includes(def.id),
      `agent-routing.md never mentions "${def.id}" — the agent is unreachable from gateway routing`
    );
    assert.ok(
      catalog.includes(def.id),
      `neo/agent-catalog.md never mentions "${def.id}" — Neo cannot teach that the agent exists`
    );
  }
});
