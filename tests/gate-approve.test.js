'use strict';

/**
 * Tests for gate:approve command (AC-SDLC-05 through AC-SDLC-09).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runGateApprove } = require('../src/commands/gate-approve');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-gate-approve-'));
}

async function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
  return full;
}

function makeLogger() {
  const lines = [];
  return {
    log: (msg = '') => lines.push(String(msg)),
    error: (msg = '') => lines.push(String(msg)),
    lines
  };
}

test('gate:approve: requires --feature', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, gate: 'A' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_feature');
});

test('gate:approve: requires --gate', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: 'checkout' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_gate');
});

test('gate:approve: invalid gate letter', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', gate: 'Z' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_gate');
});

test('gate:approve: blocks when gate:check fails', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', gate: 'A' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.blocked, true);
  assert.ok(Array.isArray(result.missing) && result.missing.length > 0, 'must list missing prerequisites');
  assert.ok(result.manual_fallback, 'must provide manual fallback');
});

test('gate:approve: approves Gate A and writes flat field when requirements exist', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'checkout';
  await writeFile(tmpDir, `.aioson/context/requirements-${slug}.md`, '# Requirements\nREQ-01\n');

  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: slug, gate: 'A' },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.gate, 'A');
  assert.equal(result.gate_name, 'requirements');
  assert.equal(result.field_written, 'gate_requirements');
  assert.ok(result.next_agent.includes('@architect'), 'Gate A next agent must be @architect');

  const specPath = path.join(tmpDir, `.aioson/context/spec-${slug}.md`);
  const specContent = await fs.readFile(specPath, 'utf8');
  assert.ok(specContent.includes('gate_requirements: approved'));
  assert.ok(!specContent.includes('phase_gates'), 'must NOT use nested phase_gates');
});

test('gate:approve: preserves existing spec frontmatter when updating', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'my-feature';

  // Pre-existing spec with other frontmatter
  await writeFile(tmpDir, `.aioson/context/spec-${slug}.md`,
    '---\nfeature: my-feature\nclassification: MEDIUM\nstatus: in_progress\n---\n# Spec\n'
  );
  await writeFile(tmpDir, `.aioson/context/requirements-${slug}.md`, '# Requirements\n');

  await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: slug, gate: 'A' },
    logger: makeLogger()
  });

  const specPath = path.join(tmpDir, `.aioson/context/spec-${slug}.md`);
  const specContent = await fs.readFile(specPath, 'utf8');

  // Check existing fields preserved
  assert.ok(specContent.includes('feature: my-feature'), 'must preserve feature field');
  assert.ok(specContent.includes('classification: MEDIUM'), 'must preserve classification field');
  assert.ok(specContent.includes('status: in_progress'), 'must preserve status field');
  // And new gate field added
  assert.ok(specContent.includes('gate_requirements: approved'), 'must add gate_requirements field');
});

test('gate:approve: resolves gate name aliases (requirements → A)', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'alias-test';
  await writeFile(tmpDir, `.aioson/context/requirements-${slug}.md`, '# Requirements\n');

  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: slug, gate: 'requirements' },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.gate, 'A');
});

test('gate:approve: Gate C points to @orchestrator or @dev as next agent', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'plan-test';

  // Gate A + B approved in spec
  await writeFile(tmpDir, `.aioson/context/spec-${slug}.md`,
    '---\nfeature: plan-test\ngate_requirements: approved\ngate_design: approved\n---\n# Spec\n'
  );
  await writeFile(tmpDir, `.aioson/context/requirements-${slug}.md`, '# Requirements\n');
  await writeFile(tmpDir, `.aioson/context/architecture.md`, '# Architecture\n');
  await writeFile(tmpDir, `.aioson/context/implementation-plan-${slug}.md`,
    '---\nfeature: plan-test\nstatus: approved\n---\n# Plan\n'
  );

  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: slug, gate: 'C' },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.gate, 'C');
  assert.ok(
    result.next_agent.includes('orchestrator') || result.next_agent.includes('dev'),
    `Gate C next agent must be orchestrator or dev, got: ${result.next_agent}`
  );
});

test('gate:approve: manual fallback names spec file and correct flat field', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'fallback-test';

  // No artifacts — gate:check will fail
  const result = await runGateApprove({
    args: [tmpDir],
    options: { json: true, feature: slug, gate: 'B' },
    logger: makeLogger()
  });

  assert.equal(result.ok, false);
  assert.ok(result.manual_fallback.includes(`spec-${slug}.md`), 'fallback must name spec file');
  assert.ok(result.manual_fallback.includes('gate_design'), 'fallback must name gate_design field for Gate B');
  assert.ok(result.manual_fallback.includes('approved'), 'fallback must show value approved');
});
