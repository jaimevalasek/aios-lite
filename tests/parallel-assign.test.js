'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit } = require('../src/commands/parallel-init');
const { runParallelAssign, extractScopesFromContent } = require('../src/commands/parallel-assign');
const { openRuntimeDb } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-parallel-assign-'));
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

async function writeArchitecture(dir) {
  const filePath = path.join(dir, '.aioson/context/architecture.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    `# Architecture

## Auth Module
## Billing Module
## Notification Pipeline
## Admin Dashboard
`,
    'utf8'
  );
}

test('extractScopesFromContent prioritizes headings', () => {
  const content = `# Doc\n\n## API Gateway\n## Event Worker\n`;
  const result = extractScopesFromContent(content);
  assert.equal(result.method, 'headings');
  assert.deepEqual(result.scopes, ['API Gateway', 'Event Worker']);
});

test('parallel:assign distributes scopes across lane files', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await writeArchitecture(dir);

  await runParallelInit({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  const lane2Path = path.join(dir, '.aioson/context/parallel/agent-2.status.md');
  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace(
    '- [list dependencies such as lane-1 or shared-decisions]',
    '- lane-1'
  );
  lane2Content = lane2Content.replace(
    '- write_paths: [unassigned]',
    '- write_paths: src/billing/**, tests/billing/**'
  );
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const result = await runParallelAssign({
    args: [dir],
    options: { workers: 3, source: 'architecture' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.scopeCount, 4);
  assert.equal(result.assignments.length, 3);
  assert.equal(result.filesUpdated.includes('.aioson/context/parallel/workspace.manifest.json'), true);
  assert.equal(result.filesUpdated.includes('.aioson/context/parallel/ownership-map.json'), true);
  assert.equal(result.filesUpdated.includes('.aioson/context/parallel/merge-plan.json'), true);

  const lane1 = await fs.readFile(
    path.join(dir, '.aioson/context/parallel/agent-1.status.md'),
    'utf8'
  );
  const lane2 = await fs.readFile(
    path.join(dir, '.aioson/context/parallel/agent-2.status.md'),
    'utf8'
  );
  const lane3 = await fs.readFile(
    path.join(dir, '.aioson/context/parallel/agent-3.status.md'),
    'utf8'
  );

  assert.equal(lane1.includes('- Auth Module'), true);
  assert.equal(lane1.includes('- Admin Dashboard'), true);
  assert.equal(lane1.includes('- lane_key: lane-1'), true);
  assert.equal(lane2.includes('- Billing Module'), true);
  assert.equal(lane2.includes('- write_paths: src/billing/**, tests/billing/**'), true);
  assert.equal(lane3.includes('- Notification Pipeline'), true);

  const ownership = JSON.parse(
    await fs.readFile(path.join(dir, '.aioson/context/parallel/ownership-map.json'), 'utf8')
  );
  const mergePlan = JSON.parse(
    await fs.readFile(path.join(dir, '.aioson/context/parallel/merge-plan.json'), 'utf8')
  );
  assert.equal(ownership.lanes.length, 3);
  assert.deepEqual(ownership.lanes[0].scope_labels, ['Auth Module', 'Admin Dashboard']);
  assert.deepEqual(ownership.lanes[1].depends_on, ['lane-1']);
  assert.deepEqual(ownership.lanes[1].write_paths, ['src/billing/**', 'tests/billing/**']);
  assert.deepEqual(mergePlan.order, [1, 2, 3]);
  assert.equal(mergePlan.strategy, 'lane-index-asc');
  assert.deepEqual(mergePlan.lanes[1].depends_on, ['lane-1']);

  const runtime = await openRuntimeDb(dir, { mustExist: true });
  try {
    const run = runtime.db.prepare("SELECT agent_name, source, title, status FROM agent_runs WHERE title = 'parallel:assign' ORDER BY updated_at DESC LIMIT 1").get();
    const event = runtime.db.prepare("SELECT event_type, message FROM execution_events WHERE event_type = 'parallel.assigned' ORDER BY created_at DESC, id DESC LIMIT 1").get();

    assert.equal(run.agent_name, '@orchestrator');
    assert.equal(run.source, 'orchestration');
    assert.equal(run.status, 'completed');
    assert.equal(event.event_type, 'parallel.assigned');
    assert.match(event.message, /4 scopes across 3 lanes/i);
  } finally {
    runtime.db.close();
  }
});

test('parallel:assign dry-run does not mutate lane files', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await writeArchitecture(dir);

  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lanePath = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  const ownershipPath = path.join(dir, '.aioson/context/parallel/ownership-map.json');
  const before = await fs.readFile(lanePath, 'utf8');
  const ownershipBefore = await fs.readFile(ownershipPath, 'utf8');

  const result = await runParallelAssign({
    args: [dir],
    options: { workers: 2, source: 'architecture', 'dry-run': true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  const after = await fs.readFile(lanePath, 'utf8');
  const ownershipAfter = await fs.readFile(ownershipPath, 'utf8');
  assert.equal(after, before);
  assert.equal(ownershipAfter, ownershipBefore);
});

test('parallel:assign fails when parallel directory is missing', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await writeArchitecture(dir);

  await assert.rejects(
    runParallelAssign({
      args: [dir],
      options: { source: 'architecture' },
      logger: createQuietLogger(),
      t
    }),
    /Parallel directory not found/
  );
});

test('parallel:assign localizes lane scope summary in pt-BR', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  await writeContext(dir, 'MEDIUM');
  await writeArchitecture(dir);

  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const logger = createCollectLogger();
  await runParallelAssign({
    args: [dir],
    options: { workers: 2, source: 'architecture' },
    logger,
    t
  });

  assert.equal(logger.lines.some((line) => line.includes('item(ns) de escopo')), true);
});

test('parallel:assign localizes unknown classification fallback in pt-BR', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  await writeContext(dir, '');
  await writeArchitecture(dir);

  await assert.rejects(
    runParallelAssign({
      args: [dir],
      options: { source: 'architecture' },
      logger: createQuietLogger(),
      t
    }),
    /desconhecida/
  );
});
