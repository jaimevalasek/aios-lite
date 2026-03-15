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
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-forge-parallel-status-'));
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
  const contextPath = path.join(dir, '.aios-forge/context/project.context.md');
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
aios_forge_version: "0.1.9"
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

  const lanePath = path.join(dir, '.aios-forge/context/parallel/agent-1.status.md');
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
});
