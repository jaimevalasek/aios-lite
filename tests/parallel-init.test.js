'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit, parseWorkers } = require('../src/commands/parallel-init');
const { openRuntimeDb } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-parallel-init-'));
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

test('parseWorkers validates supported worker range', () => {
  assert.equal(parseWorkers(undefined), 3);
  assert.equal(parseWorkers('2'), 2);
  assert.equal(parseWorkers('6'), 6);
  assert.equal(parseWorkers('1'), null);
  assert.equal(parseWorkers('7'), null);
  assert.equal(parseWorkers('abc'), null);
});

test('parallel:init creates shared and lane status files for medium projects', async () => {
  const dir = await makeTempDir();
  await writeContext(dir, 'MEDIUM');

  const { t } = createTranslator('en');
  const result = await runParallelInit({
    args: [dir],
    options: { workers: 4 },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.classification, 'MEDIUM');
  assert.equal(result.workers, 4);
  assert.equal(result.files.length, 8);

  const shared = path.join(dir, '.aioson/context/parallel/shared-decisions.md');
  const lane1 = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  const lane4 = path.join(dir, '.aioson/context/parallel/agent-4.status.md');
  const manifestPath = path.join(dir, '.aioson/context/parallel/workspace.manifest.json');
  const ownershipPath = path.join(dir, '.aioson/context/parallel/ownership-map.json');
  const mergePlanPath = path.join(dir, '.aioson/context/parallel/merge-plan.json');
  await assert.doesNotReject(() => fs.access(shared));
  await assert.doesNotReject(() => fs.access(lane1));
  await assert.doesNotReject(() => fs.access(lane4));
  await assert.doesNotReject(() => fs.access(manifestPath));
  await assert.doesNotReject(() => fs.access(ownershipPath));
  await assert.doesNotReject(() => fs.access(mergePlanPath));

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const ownership = JSON.parse(await fs.readFile(ownershipPath, 'utf8'));
  const mergePlan = JSON.parse(await fs.readFile(mergePlanPath, 'utf8'));
  const lane1Content = await fs.readFile(lane1, 'utf8');
  assert.equal(manifest.workers, 4);
  assert.equal(manifest.merge_strategy, 'lane-index-asc');
  assert.equal(manifest.lanes.length, 4);
  assert.equal(ownership.lanes.length, 4);
  assert.deepEqual(mergePlan.order, [1, 2, 3, 4]);
  assert.equal(lane1Content.includes('- write_paths: [unassigned]'), true);

  const runtime = await openRuntimeDb(dir, { mustExist: true });
  try {
    const run = runtime.db.prepare("SELECT agent_name, source, title, status FROM agent_runs ORDER BY updated_at DESC LIMIT 1").get();
    const event = runtime.db.prepare("SELECT event_type, phase FROM execution_events ORDER BY created_at DESC, id DESC LIMIT 1").get();

    assert.equal(run.agent_name, '@orchestrator');
    assert.equal(run.source, 'orchestration');
    assert.equal(run.title, 'parallel:init');
    assert.equal(run.status, 'completed');
    assert.equal(event.event_type, 'parallel.initialized');
    assert.equal(event.phase, 'parallel');
  } finally {
    runtime.db.close();
  }
});

test('parallel:init rejects non-medium classification unless force is enabled', async () => {
  const dir = await makeTempDir();
  await writeContext(dir, 'SMALL');

  const { t } = createTranslator('en');
  await assert.rejects(
    runParallelInit({
      args: [dir],
      options: {},
      logger: createQuietLogger(),
      t
    }),
    /MEDIUM classification/
  );

  const forced = await runParallelInit({
    args: [dir],
    options: { force: true },
    logger: createQuietLogger(),
    t
  });
  assert.equal(forced.ok, true);
  assert.equal(forced.files.length, 7);
});

test('parallel:init localizes unknown classification fallback in pt-BR', async () => {
  const dir = await makeTempDir();
  await writeContext(dir, '');
  const { t } = createTranslator('pt-BR');

  await assert.rejects(
    runParallelInit({
      args: [dir],
      options: {},
      logger: createQuietLogger(),
      t
    }),
    /desconhecida/
  );
});

test('parallel:init dry-run does not write files', async () => {
  const dir = await makeTempDir();
  await writeContext(dir, 'MEDIUM');
  const { t } = createTranslator('en');

  const result = await runParallelInit({
    args: [dir],
    options: { 'dry-run': true, workers: 2 },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.files.length, 6);
  await assert.rejects(() =>
    fs.access(path.join(dir, '.aioson/context/parallel/shared-decisions.md'))
  );
});

test('parallel:init localizes file listing lines in pt-BR', async () => {
  const dir = await makeTempDir();
  await writeContext(dir, 'MEDIUM');
  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();

  const result = await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(
    logger.lines.some((line) =>
      line.includes('Arquivo: .aioson/context/parallel/shared-decisions.md')
    ),
    true
  );
});
