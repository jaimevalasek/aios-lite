'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runRunnerQueueFromPlan } = require('../src/commands/runner-queue-from-plan');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-queue-plan-'));
}

async function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

function makeLogger() {
  const lines = [];
  const errors = [];
  return {
    log: (msg = '') => lines.push(String(msg)),
    error: (msg = '') => errors.push(String(msg)),
    lines,
    errors
  };
}

const PLAN_CONTENT = `---
status: approved
---

# Implementation Plan — Checkout

## Phase 1: Create database migrations

- Create cart_items table
- Create orders table

## Phase 2: Implement AddToCart action

- Write AddToCart service
- Write unit tests

## Phase 3: Payment webhook handler

- Implement Stripe webhook
- Handle idempotency

## Phase 4: Notification listeners

- Send order confirmation email

## Phase 5: Integration tests

- End-to-end checkout flow test
`;

test('runner:queue:from-plan: requires --feature or --plan', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_plan');
});

test('runner:queue:from-plan: returns ok=false when file not found', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { json: true, feature: 'missing' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'file_not_found');
});

test('runner:queue:from-plan: returns ok=false when no phases found', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/implementation-plan-empty.md',
    '# Plan\n\nThis has no phase headers.\n');
  const result = await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { json: true, feature: 'empty' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_phases');
});

test('runner:queue:from-plan: dry-run extracts phases without queuing', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/implementation-plan-checkout.md', PLAN_CONTENT);

  const result = await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.ok(Array.isArray(result.phases));
  assert.equal(result.phases.length, 5);
  assert.equal(result.phases[0].num, 1);
  assert.ok(result.phases[0].title.includes('migration') || result.phases[0].title.length > 0);
});

test('runner:queue:from-plan: phases are in correct order', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/implementation-plan-checkout.md', PLAN_CONTENT);

  const result = await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true },
    logger: makeLogger()
  });
  for (let i = 0; i < result.phases.length; i++) {
    assert.equal(result.phases[i].num, i + 1);
  }
});

test('runner:queue:from-plan: reads plan via --plan flag', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, 'docs/my-plan.md',
    '## Phase 1: Setup\n- Install deps\n## Phase 2: Build\n- Write code\n');

  const result = await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { json: true, plan: 'docs/my-plan.md', 'dry-run': true },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.phases.length, 2);
});

test('runner:queue:from-plan: dry-run human output lists phases', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/implementation-plan-checkout.md', PLAN_CONTENT);
  const logger = makeLogger();
  await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { feature: 'checkout', 'dry-run': true },
    logger
  });
  assert.ok(logger.lines.some((l) => l.includes('Phase 1') || l.includes('Phase')));
  assert.ok(logger.lines.some((l) => l.includes('dry-run') || l.includes('would queue')));
});

test('runner:queue:from-plan: queues phases with correct priority (requires runtime)', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/implementation-plan-checkout.md', PLAN_CONTENT);

  // Initialize runtime DB for queuing
  const { openRuntimeDb } = require('../src/runtime-store');
  const { ensureRunnerQueue } = require('../src/runner/queue-store');
  const handle = await openRuntimeDb(tmpDir, {});
  ensureRunnerQueue(handle.db);
  handle.db.close();

  const result = await runRunnerQueueFromPlan({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', agent: 'dev' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.queued.length, 5);
  // Priorities should match phase numbers
  assert.equal(result.queued[0].phase, 1);
  assert.equal(result.queued[4].phase, 5);
});
