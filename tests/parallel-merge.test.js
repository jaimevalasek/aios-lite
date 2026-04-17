'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit } = require('../src/commands/parallel-init');
const { runParallelMerge } = require('../src/commands/parallel-merge');
const { runParallelStatus } = require('../src/commands/parallel-status');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-parallel-merge-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

async function writeContext(dir, classification = 'MEDIUM') {
  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "${classification}"
conversation_language: "en"
aioson_version: "0.1.9"
---

# Project Context
`,
    'utf8'
  );
}

async function markLaneCompleted(dir, index, dependencyLine = null) {
  const lanePath = path.join(dir, `.aioson/context/parallel/agent-${index}.status.md`);
  let content = await fs.readFile(lanePath, 'utf8');
  content = content.replace('- status: pending', '- status: completed');
  if (dependencyLine) {
    content = content.replace(
      '- [list dependencies such as lane-1 or shared-decisions]',
      dependencyLine
    );
  }
  await fs.writeFile(lanePath, content, 'utf8');
}

test('parallel:merge reports blocked lanes when merge is not ready', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const result = await runParallelMerge({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.merge.blockedCount, 2);
  assert.equal(result.merge.plan.every((item) => item.action === 'blocked'), true);
});

test('parallel:merge --apply marks completed lanes as merged in deterministic order', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  await markLaneCompleted(dir, 1);
  await markLaneCompleted(dir, 2);

  const result = await runParallelMerge({
    args: [dir],
    options: { apply: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.merge.readyLaneCount, 2);
  assert.equal(result.filesUpdated.includes('.aioson/context/parallel/agent-1.status.md'), true);
  assert.equal(result.filesUpdated.includes('.aioson/context/parallel/agent-2.status.md'), true);

  const lane1 = await fs.readFile(path.join(dir, '.aioson/context/parallel/agent-1.status.md'), 'utf8');
  const lane2 = await fs.readFile(path.join(dir, '.aioson/context/parallel/agent-2.status.md'), 'utf8');
  assert.equal(lane1.includes('- status: merged'), true);
  assert.equal(lane1.includes('- merged_order: 1'), true);
  assert.equal(lane2.includes('- status: merged'), true);
  assert.equal(lane2.includes('- merged_order: 2'), true);

  const status = await runParallelStatus({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });
  assert.equal(status.statusCounts.merged, 2);
});

test('parallel:merge blocks apply when merge artifacts are stale', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  await markLaneCompleted(dir, 1);
  await markLaneCompleted(dir, 2, '- lane-1');
  await fs.writeFile(
    path.join(dir, '.aioson/context/parallel/merge-plan.json'),
    `${JSON.stringify({
      version: 1,
      generated_at: new Date().toISOString(),
      strategy: 'lane-index-asc',
      conflict_policy: 'shared-decisions-first',
      order: [2, 1],
      lanes: [
        { lane: 1, lane_key: 'lane-1', merge_rank: 1, scope_keys: [], depends_on: [] },
        { lane: 2, lane_key: 'lane-2', merge_rank: 2, scope_keys: [], depends_on: ['lane-1'] }
      ]
    }, null, 2)}\n`,
    'utf8'
  );

  const result = await runParallelMerge({
    args: [dir],
    options: { apply: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.structural.sync.staleFiles.includes('merge-plan.json'), true);
});

test('parallel:merge blocks apply when write scope ownership overlaps across lanes', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  await markLaneCompleted(dir, 1);
  await markLaneCompleted(dir, 2);

  const lane1Path = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  const lane2Path = path.join(dir, '.aioson/context/parallel/agent-2.status.md');
  let lane1Content = await fs.readFile(lane1Path, 'utf8');
  lane1Content = lane1Content.replace('- write_paths: [unassigned]', '- write_paths: src/shared/**');
  await fs.writeFile(lane1Path, lane1Content, 'utf8');

  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace('- write_paths: [unassigned]', '- write_paths: src/shared/config.js');
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const result = await runParallelMerge({
    args: [dir],
    options: { apply: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.structural.writeScopeConflictCount, 1);
});
