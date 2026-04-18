'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runSpecTasks } = require('../src/commands/spec-tasks');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

describe('spec-tasks.js — runSpecTasks', () => {
  let tmpDir;
  const mockLogger = { log: () => {} };

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spec-tasks-test-'));
    await ensureDir(path.join(tmpDir, '.aioson', 'context'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('generates tasks from implementation plan', async () => {
    const planContent = `---
feature_slug: auth
project: Authentication System
---

# Implementation Plan — Authentication System

### Phase 1 — Setup
- **What:** Configure JWT middleware and user model
- **Depends on:** nothing
- **Input artifacts:** architecture.md
- **Done criterion:** Tests pass for middleware and model
- **Checkpoint:** Gate C approved

### Phase 2 — Routes
- **What:** Implement login, register and logout endpoints
- **Depends on:** Phase 1
- **Input artifacts:** requirements-auth.md
- **Done criterion:** All endpoints return correct status codes
- **Checkpoint:** QA review passed

## Parallel phases
- Phase 1 and Phase 2 can be sequential only

## Deferred decisions
- Whether to use Redis for sessions
`;
    const planPath = path.join(tmpDir, '.aioson', 'context', 'implementation-plan.md');
    await fs.writeFile(planPath, planContent);

    const result = await runSpecTasks({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger
    });

    assert.equal(result.ok, true);
    assert.equal(result.phasesCount, 2);
    assert.equal(result.featureSlug, 'auth');
    assert.ok(result.outputPath.includes('tasks-auth.md'));

    const tasksContent = await fs.readFile(result.outputPath, 'utf8');
    assert.ok(tasksContent.includes('# Tasks — Authentication System'));
    assert.ok(tasksContent.includes('## Phase 1 — Setup'));
    assert.ok(tasksContent.includes('## Phase 2 — Routes'));
    assert.ok(tasksContent.includes('Configure JWT middleware and user model'));
    assert.ok(tasksContent.includes('Implement login, register and logout endpoints'));
    assert.ok(tasksContent.includes('Tests pass for middleware and model'));
    assert.ok(tasksContent.includes('Depends on: Phase 1'));
    assert.ok(tasksContent.includes('## Parallel notes'));
    assert.ok(tasksContent.includes('## Deferred decisions'));
    assert.ok(tasksContent.includes('Whether to use Redis for sessions'));
  });

  it('returns error when plan file not found', async () => {
    const result = await runSpecTasks({
      args: [tmpDir],
      options: { json: true, plan: path.join(tmpDir, 'missing-plan.md') },
      logger: mockLogger
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'plan_not_found');
  });

  it('returns error when no phases found', async () => {
    const planContent = `---
feature_slug: empty
---

# Plan with no phases
`;
    const planPath = path.join(tmpDir, '.aioson', 'context', 'implementation-plan.md');
    await fs.writeFile(planPath, planContent);

    const result = await runSpecTasks({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'no_phases');
  });

  it('uses tasks.md when no feature slug', async () => {
    const planContent = `---
---

# Implementation Plan

### Phase 1 — Design
- **What:** Create wireframes
- **Done criterion:** Wireframes approved
`;
    const planPath = path.join(tmpDir, '.aioson', 'context', 'implementation-plan.md');
    await fs.writeFile(planPath, planContent);

    const result = await runSpecTasks({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger
    });

    assert.equal(result.ok, true);
    assert.equal(result.featureSlug, null);
    assert.ok(result.outputPath.includes('tasks.md'));
  });

  it('respects custom plan path', async () => {
    const planContent = `---
feature_slug: custom
---

# Plan

### Phase 1 — Work
- **What:** Do something
- **Done criterion:** Done
`;
    const customPlanPath = path.join(tmpDir, 'my-plan.md');
    await fs.writeFile(customPlanPath, planContent);

    const result = await runSpecTasks({
      args: [tmpDir],
      options: { json: true, plan: customPlanPath },
      logger: mockLogger
    });

    assert.equal(result.ok, true);
    assert.equal(result.planPath, customPlanPath);
  });
});
