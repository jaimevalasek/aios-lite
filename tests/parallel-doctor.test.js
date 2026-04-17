'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit } = require('../src/commands/parallel-init');
const { runParallelDoctor } = require('../src/commands/parallel-doctor');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-parallel-doctor-'));
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

test('parallel:doctor reports invalid state when context/parallel files are missing', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');

  const result = await runParallelDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.summary.failed >= 1, true);
});

test('parallel:doctor localizes check messages with pt-BR locale', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');

  const result = await runParallelDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  const check = result.checks.find((item) => item.id === 'context.exists');
  assert.equal(Boolean(check), true);
  assert.equal(check.message.includes('ausente'), true);
});

test('parallel:doctor passes after parallel:init baseline', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  const result = await runParallelDoctor({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failed, 0);
  assert.equal(result.state.manifestExists, true);
  assert.equal(result.state.ownershipExists, true);
  assert.equal(result.state.mergePlanExists, true);
  assert.equal(result.analysis.sync.workspaceManifestInSync, true);
  assert.equal(result.analysis.dependencies.invalidCount, 0);
});

test('parallel:doctor --fix restores missing shared, lane and machine files', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  await fs.rm(path.join(dir, '.aioson/context/parallel/shared-decisions.md'));
  await fs.rm(path.join(dir, '.aioson/context/parallel/agent-2.status.md'));
  await fs.rm(path.join(dir, '.aioson/context/parallel/workspace.manifest.json'));
  await fs.rm(path.join(dir, '.aioson/context/parallel/ownership-map.json'));
  await fs.rm(path.join(dir, '.aioson/context/parallel/merge-plan.json'));

  const result = await runParallelDoctor({
    args: [dir],
    options: { workers: 3, fix: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.fix.enabled, true);
  assert.equal(result.fix.changedCount >= 5, true);

  await assert.doesNotReject(() =>
    fs.access(path.join(dir, '.aioson/context/parallel/shared-decisions.md'))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(dir, '.aioson/context/parallel/agent-2.status.md'))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(dir, '.aioson/context/parallel/workspace.manifest.json'))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(dir, '.aioson/context/parallel/ownership-map.json'))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(dir, '.aioson/context/parallel/merge-plan.json'))
  );
});

test('parallel:doctor detects stale artifacts and repairs them with --fix', async () => {
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
  lane2Content = lane2Content.replace(
    '- [list dependencies such as lane-1 or shared-decisions]',
    '- lane-1'
  );
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const before = await runParallelDoctor({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  assert.equal(before.ok, false);
  assert.equal(before.analysis.sync.ownershipMapInSync, false);
  assert.equal(before.analysis.sync.mergePlanInSync, false);

  const fixed = await runParallelDoctor({
    args: [dir],
    options: { workers: 2, fix: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(fixed.ok, true);
  assert.equal(fixed.fix.changedCount >= 2, true);
  assert.equal(fixed.analysis.sync.ownershipMapInSync, true);
  assert.equal(fixed.analysis.sync.mergePlanInSync, true);
});

test('parallel:doctor reports invalid dependencies and merge-order violations', async () => {
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
    '- lane-3'
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
        { lane: 2, lane_key: 'lane-2', merge_rank: 2, scope_keys: [], depends_on: ['lane-3'] }
      ]
    }, null, 2)}\n`,
    'utf8'
  );

  const result = await runParallelDoctor({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.analysis.dependencies.invalidCount, 1);
  const invalidCheck = result.checks.find((item) => item.id === 'parallel.dependencies.valid');
  assert.equal(Boolean(invalidCheck), true);
  assert.equal(invalidCheck.ok, false);
});

test('parallel:doctor reports write scope coverage gaps and invalid path patterns', async () => {
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
  await fs.writeFile(lane1Path, lane1Content, 'utf8');

  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace('- [define module or feature boundary]', '- Billing');
  lane2Content = lane2Content.replace('- write_paths: [unassigned]', '- write_paths: src/billing/**, src/*');
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const result = await runParallelDoctor({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.analysis.writeScope.uncoveredAssignedLaneCount, 1);
  assert.equal(result.analysis.writeScope.invalidPatternCount, 1);
  const coverageCheck = result.checks.find((item) => item.id === 'parallel.write_scope.present');
  const validCheck = result.checks.find((item) => item.id === 'parallel.write_scope.valid');
  assert.equal(Boolean(coverageCheck), true);
  assert.equal(Boolean(validCheck), true);
  assert.equal(coverageCheck.ok, false);
  assert.equal(validCheck.ok, false);
});

test('parallel:doctor --fix localizes unknown classification fallback in pt-BR', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  await writeContext(dir, '');

  await assert.rejects(
    runParallelDoctor({
      args: [dir],
      options: { fix: true },
      logger: createQuietLogger(),
      t
    }),
    /desconhecida/
  );
});

test('parallel:doctor localizes unknown classification fallback in check message (pt-BR)', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  await writeContext(dir, '');

  const result = await runParallelDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  const check = result.checks.find((item) => item.id === 'context.classification');
  assert.equal(Boolean(check), true);
  assert.equal(check.message.includes('desconhecida'), true);
});

test('parallel:doctor localizes hint line formatting in pt-BR output', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();

  const result = await runParallelDoctor({
    args: [dir],
    options: {},
    logger,
    t
  });

  assert.equal(result.ok, false);
  assert.equal(logger.lines.some((line) => line.startsWith('  Dica: ')), true);
});
