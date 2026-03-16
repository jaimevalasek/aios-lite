'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const {
  runWorkflowNext,
  EVENTS_RELATIVE_PATH
} = require('../src/commands/workflow-next');
const { openRuntimeDb } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-workflow-next-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

async function writeFileEnsured(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function writeProjectContext(dir, classification = 'SMALL') {
  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  await writeFileEnsured(
    contextPath,
    `---\nproject_name: "demo"\nproject_type: "web_app"\nprofile: "developer"\nframework: "Next.js"\nframework_installed: true\nclassification: "${classification}"\nconversation_language: "en"\naioson_version: "1.2.1"\n---\n\n# Context\n`
  );
}

test('workflow:next infers project progress from existing artifacts', async () => {
  const dir = await makeTempDir();
  await writeProjectContext(dir, 'SMALL');
  await writeFileEnsured(path.join(dir, '.aioson/context/prd.md'), '# PRD\n');

  const { t } = createTranslator('en');
  const result = await runWorkflowNext({
    args: [dir],
    options: { tool: 'codex' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'project');
  assert.equal(result.agent, 'analyst');
  assert.deepEqual(result.completed, ['setup', 'product']);
  assert.equal(result.current, 'analyst');
});

test('workflow:next infers active feature and routes to analyst after product', async () => {
  const dir = await makeTempDir();
  await writeProjectContext(dir, 'SMALL');
  await writeFileEnsured(path.join(dir, '.aioson/context/prd.md'), '# PRD\n');
  await writeFileEnsured(
    path.join(dir, '.aioson/context/features.md'),
    '# Features\n\n| slug | status | started | completed |\n|------|--------|---------|-----------|\n| compact-layout | in_progress | 2026-03-13 | — |\n'
  );
  await writeFileEnsured(path.join(dir, '.aioson/context/prd-compact-layout.md'), '# Feature PRD\n');

  const { t } = createTranslator('en');
  const result = await runWorkflowNext({
    args: [dir],
    options: { tool: 'codex' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.mode, 'feature');
  assert.equal(result.featureSlug, 'compact-layout');
  assert.equal(result.agent, 'analyst');
  assert.deepEqual(result.completed, ['product']);
});

test('workflow:next supports detours and returns to the saved stage', async () => {
  const dir = await makeTempDir();
  await writeProjectContext(dir, 'SMALL');
  await writeFileEnsured(path.join(dir, '.aioson/context/prd.md'), '# PRD\n');
  await writeFileEnsured(
    path.join(dir, '.aioson/context/features.md'),
    '# Features\n\n| slug | status | started | completed |\n|------|--------|---------|-----------|\n| compact-layout | in_progress | 2026-03-13 | — |\n'
  );
  await writeFileEnsured(path.join(dir, '.aioson/context/prd-compact-layout.md'), '# Feature PRD\n');

  const { t } = createTranslator('en');

  const detour = await runWorkflowNext({
    args: [dir],
    options: { tool: 'codex', agent: 'ux-ui' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(detour.agent, 'ux-ui');
  assert.deepEqual(detour.detour, {
    active: true,
    agent: 'ux-ui',
    returnTo: 'analyst'
  });

  await writeFileEnsured(path.join(dir, '.aioson/context/ui-spec.md'), '# UI Spec\n');

  const resumed = await runWorkflowNext({
    args: [dir],
    options: { tool: 'codex', complete: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(resumed.completedStage, 'ux-ui');
  assert.equal(resumed.agent, 'analyst');
  assert.equal(resumed.detour, null);
});

test('workflow:next allows skip until dev but not past dev', async () => {
  const dir = await makeTempDir();
  await writeProjectContext(dir, 'SMALL');
  await writeFileEnsured(path.join(dir, '.aioson/context/prd.md'), '# PRD\n');

  const { t } = createTranslator('en');
  const skipped = await runWorkflowNext({
    args: [dir],
    options: { tool: 'codex', skip: 'dev' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(skipped.agent, 'dev');
  assert.deepEqual(skipped.skipped, ['analyst', 'architect']);

  await assert.rejects(
    () =>
      runWorkflowNext({
        args: [dir],
        options: { tool: 'codex', skip: 'qa' },
        logger: createQuietLogger(),
        t
      }),
    /Cannot skip past @dev/
  );
});

test('workflow:next appends workflow events for dashboard visibility', async () => {
  const dir = await makeTempDir();
  await writeProjectContext(dir, 'SMALL');
  await writeFileEnsured(path.join(dir, '.aioson/context/prd.md'), '# PRD\n');

  const { t } = createTranslator('en');
  await runWorkflowNext({
    args: [dir],
    options: { tool: 'codex' },
    logger: createQuietLogger(),
    t
  });

  const eventsPath = path.join(dir, EVENTS_RELATIVE_PATH);
  const raw = await fs.readFile(eventsPath, 'utf8');
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1);

  const event = JSON.parse(lines[0]);
  assert.equal(event.kind, 'workflow');
  assert.equal(event.eventType, 'start');
  assert.equal(event.current, 'analyst');
  assert.equal(event.next, 'analyst');
  assert.match(event.message, /Stage @analyst is active|Workflow initialized at @analyst/);
});

test('workflow:next syncs workflow task, runs, and canonical events into runtime sqlite', async () => {
  const dir = await makeTempDir();
  await writeProjectContext(dir, 'SMALL');
  await writeFileEnsured(path.join(dir, '.aioson/context/prd.md'), '# PRD\n');

  const { t } = createTranslator('en');
  const result = await runWorkflowNext({
    args: [dir],
    options: { tool: 'codex' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.runtime.ok, true);

  const runtime = await openRuntimeDb(dir, { mustExist: true });
  try {
    const task = runtime.db.prepare('SELECT task_key, session_key, status FROM tasks ORDER BY updated_at DESC LIMIT 1').get();
    const workflowRun = runtime.db.prepare("SELECT agent_name, agent_kind, source, workflow_id FROM agent_runs WHERE agent_name = '@workflow' ORDER BY updated_at DESC LIMIT 1").get();
    const stageRun = runtime.db.prepare("SELECT agent_name, agent_kind, source, workflow_stage, parent_run_key, status FROM agent_runs WHERE agent_name = '@analyst' ORDER BY updated_at DESC LIMIT 1").get();
    const events = runtime.db.prepare('SELECT event_type, phase, source, workflow_stage FROM execution_events ORDER BY created_at DESC, id DESC LIMIT 10').all();

    assert.equal(task.session_key, 'workflow:project:project:default');
    assert.equal(task.status, 'running');
    assert.equal(workflowRun.agent_kind, 'workflow');
    assert.equal(workflowRun.source, 'workflow');
    assert.equal(workflowRun.workflow_id, 'workflow:project:project:default');
    assert.equal(stageRun.agent_kind, 'official');
    assert.equal(stageRun.source, 'workflow');
    assert.equal(stageRun.workflow_stage, 'analyst');
    assert.equal(stageRun.status, 'running');
    assert.equal(typeof stageRun.parent_run_key, 'string');
    assert.equal(events.some((event) => event.source === 'workflow'), true);
    assert.equal(events.some((event) => event.workflow_stage === 'analyst'), true);
  } finally {
    runtime.db.close();
  }

  await assert.doesNotReject(() => fs.access(path.join(dir, 'aioson-logs')));
});
