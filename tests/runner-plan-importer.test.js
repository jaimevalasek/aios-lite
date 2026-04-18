'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { importFromPlan } = require('../src/runner/plan-importer');

describe('runner/plan-importer.js — importFromPlan', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-importer-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('throws when plan file is not found', async () => {
    await assert.rejects(
      () => importFromPlan(tmpDir, 'nonexistent'),
      /implementation-plan-nonexistent\.md not found/
    );
  });

  it('parses phases from context/implementation-plan-{slug}.md', async () => {
    const planDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(
      path.join(planDir, 'implementation-plan-auth.md'),
      '## Phase 1 — Create migration\n\nSome text.\n\n## Phase 2 — Implement controller\n\nMore text.\n'
    );

    const result = await importFromPlan(tmpDir, 'auth');
    assert.equal(result.tasks.length, 2);
    assert.equal(result.tasks[0].task, 'Create migration');
    assert.equal(result.tasks[0].agent, 'dev');
    assert.equal(result.tasks[0].status, 'pending');
    assert.equal(result.tasks[1].task, 'Implement controller');
    assert.ok(result.planPath.includes('implementation-plan-auth.md'));
  });

  it('parses phases from plans/implementation-plan-{slug}.md', async () => {
    const planDir = path.join(tmpDir, '.aioson', 'plans');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(
      path.join(planDir, 'implementation-plan-cart.md'),
      '## Phase 1 — Setup models\n'
    );

    const result = await importFromPlan(tmpDir, 'cart');
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].task, 'Setup models');
  });

  it('parses phases with dash and colon separators', async () => {
    const planDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(
      path.join(planDir, 'implementation-plan-api.md'),
      '## Phase 1 - First task\n\n## Phase 2: Second task\n'
    );

    const result = await importFromPlan(tmpDir, 'api');
    assert.equal(result.tasks.length, 2);
    assert.equal(result.tasks[0].task, 'First task');
    assert.equal(result.tasks[1].task, 'Second task');
  });

  it('strips duration suffixes from phase titles', async () => {
    const planDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(
      path.join(planDir, 'implementation-plan-fix.md'),
      '## Phase 1 — Fix bug (2-3 days)\n'
    );

    const result = await importFromPlan(tmpDir, 'fix');
    assert.equal(result.tasks[0].task, 'Fix bug');
  });

  it('uses custom agent option', async () => {
    const planDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(
      path.join(planDir, 'implementation-plan-qa.md'),
      '## Phase 1 — Write tests\n'
    );

    const result = await importFromPlan(tmpDir, 'qa', { agent: 'tester' });
    assert.equal(result.tasks[0].agent, 'tester');
  });

  it('ignores non-phase headings', async () => {
    const planDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(
      path.join(planDir, 'implementation-plan-mixed.md'),
      '# Overview\n\n## Phase 1 — Real phase\n\n## Notes\nSome notes.\n'
    );

    const result = await importFromPlan(tmpDir, 'mixed');
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].task, 'Real phase');
  });
});
