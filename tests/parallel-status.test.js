'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit } = require('../src/commands/parallel-init');
const { runParallelStatus } = require('../src/commands/parallel-status');
const { openRuntimeDb } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-parallel-status-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

function createCollectLogger() {
  const lines = [];
  return {
    lines,
    log(line) {
      lines.push(String(line));
    },
    error(line) {
      lines.push(String(line));
    }
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

test('parallel:status reports baseline lane summary', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  const result = await runParallelStatus({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.laneCount, 3);
  assert.equal(result.statusCounts.pending, 3);
  assert.equal(result.scopeCount, 0);
  assert.equal(result.blockerCount, 0);
  assert.equal(result.deliverables.completed, 0);
  assert.equal(result.deliverables.total, 9);
  assert.equal(result.sharedDecisions.exists, true);
  assert.equal(result.sharedDecisions.entries, 1);
  assert.deepEqual(result.machineFiles, {
    workspaceManifest: true,
    ownershipMap: true,
    mergePlan: true
  });
  assert.equal(result.ownership.assignedScopeCount, 0);
  assert.equal(result.ownership.conflictCount, 0);
  assert.equal(result.writeScope.totalPathCount, 0);
  assert.equal(result.writeScope.conflictCount, 0);
  assert.equal(result.writeScope.invalidPatternCount, 0);
  assert.equal(result.dependencies.declaredCount, 0);
  assert.equal(result.dependencies.invalidCount, 0);
  assert.equal(result.dependencies.blockedCount, 0);
  assert.equal(result.dependencies.orderViolationCount, 0);
  assert.equal(result.merge.strategy, 'lane-index-asc');
  assert.deepEqual(result.merge.order, [1, 2, 3]);
  assert.equal(result.merge.laneCount, 3);
  assert.equal(result.sync.workspaceManifestInSync, true);
  assert.equal(result.sync.ownershipMapInSync, true);
  assert.equal(result.sync.mergePlanInSync, true);
  assert.deepEqual(result.sync.staleFiles, []);

  const runtime = await openRuntimeDb(dir, { mustExist: true });
  try {
    const run = runtime.db.prepare("SELECT agent_name, source, title, status FROM agent_runs WHERE title = 'parallel:status' ORDER BY updated_at DESC LIMIT 1").get();
    const event = runtime.db.prepare("SELECT event_type, phase FROM execution_events WHERE event_type = 'parallel.status_reported' ORDER BY created_at DESC, id DESC LIMIT 1").get();

    assert.equal(run.agent_name, '@orchestrator');
    assert.equal(run.source, 'orchestration');
    assert.equal(run.status, 'completed');
    assert.equal(event.event_type, 'parallel.status_reported');
    assert.equal(event.phase, 'parallel');
  } finally {
    runtime.db.close();
  }
});

test('parallel:status reflects lane progress and blockers', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lanePath = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  let laneContent = await fs.readFile(lanePath, 'utf8');
  laneContent = laneContent.replace('- status: pending', '- status: in_progress');
  laneContent = laneContent.replace(
    '- [define module or feature boundary]',
    '- API Gateway'
  );
  laneContent = laneContent.replace(
    '- [ ] Code changes completed',
    '- [x] Code changes completed'
  );
  laneContent = laneContent.replace('- [none]', '- Waiting for schema review');
  await fs.writeFile(lanePath, laneContent, 'utf8');

  const result = await runParallelStatus({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.laneCount, 2);
  assert.equal(result.statusCounts.in_progress, 1);
  assert.equal(result.statusCounts.pending, 1);
  assert.equal(result.scopeCount, 1);
  assert.equal(result.blockerCount, 1);
  assert.equal(result.deliverables.completed, 1);
  assert.equal(result.deliverables.total, 6);
});

test('parallel:status reports dependency blockers and stale machine files', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lane2Path = path.join(dir, '.aioson/context/parallel/agent-2.status.md');
  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace('- status: pending', '- status: in_progress');
  lane2Content = lane2Content.replace(
    '- [list dependencies such as lane-1 or shared-decisions]',
    '- lane-1'
  );
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

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
        { lane: 2, lane_key: 'lane-2', merge_rank: 2, scope_keys: [], depends_on: [] }
      ]
    }, null, 2)}\n`,
    'utf8'
  );

  const result = await runParallelStatus({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.dependencies.declaredCount, 1);
  assert.equal(result.dependencies.blockedCount, 1);
  assert.equal(result.dependencies.orderViolationCount, 1);
  assert.equal(result.sync.mergePlanInSync, false);
  assert.equal(result.sync.ownershipMapInSync, false);
  assert.equal(result.sync.staleFiles.includes('merge-plan.json'), true);
  assert.equal(result.sync.staleFiles.includes('ownership-map.json'), true);
});

test('parallel:status reports ownership conflicts from ownership map', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  await fs.writeFile(
    path.join(dir, '.aioson/context/parallel/ownership-map.json'),
    `${JSON.stringify({
      version: 1,
      generated_at: new Date().toISOString(),
      lanes: [
        { lane: 1, scope_keys: ['api-gateway'] },
        { lane: 2, scope_keys: ['api-gateway'] }
      ]
    }, null, 2)}\n`,
    'utf8'
  );

  const result = await runParallelStatus({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.ownership.conflictCount, 1);
  assert.deepEqual(result.ownership.conflicts, [
    {
      scope_key: 'api-gateway',
      lanes: [1, 2]
    }
  ]);
});

test('parallel:status reports write scope coverage and path conflicts', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lane1Path = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  const lane2Path = path.join(dir, '.aioson/context/parallel/agent-2.status.md');
  let lane1Content = await fs.readFile(lane1Path, 'utf8');
  lane1Content = lane1Content.replace('- [define module or feature boundary]', '- API Gateway');
  lane1Content = lane1Content.replace('- write_paths: [unassigned]', '- write_paths: src/api/**');
  await fs.writeFile(lane1Path, lane1Content, 'utf8');

  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace('- [define module or feature boundary]', '- Dashboard');
  lane2Content = lane2Content.replace('- write_paths: [unassigned]', '- write_paths: src/api/**, src/*');
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const result = await runParallelStatus({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.writeScope.laneCount, 2);
  assert.equal(result.writeScope.totalPathCount, 3);
  assert.equal(result.writeScope.conflictCount, 1);
  assert.equal(result.writeScope.invalidPatternCount, 1);
  assert.equal(result.writeScope.uncoveredAssignedLaneCount, 0);
});

test('parallel:status fails when parallel directory is missing', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');

  await assert.rejects(
    runParallelStatus({
      args: [dir],
      options: {},
      logger: createQuietLogger(),
      t
    }),
    /Parallel directory not found/
  );
});

test('parallel:status localizes status labels and lane lines in pt-BR', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const logger = createCollectLogger();
  await runParallelStatus({
    args: [dir],
    options: {},
    logger,
    t
  });

  assert.equal(logger.lines.some((line) => line.includes('- pendente: 2')), true);
  assert.equal(logger.lines.some((line) => line.includes('status=pendente')), true);
  assert.equal(logger.lines.some((line) => line.includes('Conflitos de ownership: 0')), true);
});
