'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runAgentsList, runAgentPrompt } = require('../src/commands/agents');
const { openRuntimeDb } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-forge-agents-cmd-'));
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

async function writeProjectContext(dir, classification = 'SMALL') {
  await fs.mkdir(path.join(dir, '.aios-forge/context'), { recursive: true });
  await fs.writeFile(
    path.join(dir, '.aios-forge/context/project.context.md'),
    `---\nproject_name: "demo"\nproject_type: "web_app"\nprofile: "developer"\nframework: "Next.js"\nframework_installed: true\nclassification: "${classification}"\nconversation_language: "en"\naios_forge_version: "1.2.1"\n---\n\n# Context\n`,
    'utf8'
  );
}

test('agents command localizes line formatting in pt-BR', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();

  const result = await runAgentsList({
    args: [dir],
    options: { lang: 'pt-BR' },
    logger,
    t
  });

  assert.equal(result.count > 0, true);
  assert.equal(logger.lines.some((line) => line.includes('- Agente: ')), true);
  assert.equal(logger.lines.some((line) => line.includes('Caminho: ')), true);
});

test('agent:prompt bootstraps direct runtime handoff for non-workflow agents', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = createCollectLogger();

  const result = await runAgentPrompt({
    args: ['genoma', dir],
    options: { tool: 'codex' },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.agent, 'genoma');
  assert.equal(result.routed, false);
  assert.equal(Boolean(result.runtime), true);

  const runtime = await openRuntimeDb(dir, { mustExist: true });
  try {
    const run = runtime.db.prepare("SELECT agent_name, source, status FROM agent_runs ORDER BY updated_at DESC LIMIT 1").get();
    const event = runtime.db.prepare("SELECT event_type, phase FROM execution_events ORDER BY created_at DESC, id DESC LIMIT 1").get();

    assert.equal(run.agent_name, '@genoma');
    assert.equal(run.source, 'direct');
    assert.equal(run.status, 'queued');
    assert.equal(event.event_type, 'prompt.generated');
    assert.equal(event.phase, 'handoff');
  } finally {
    runtime.db.close();
  }
});

test('agent:prompt classifies squad handoff as squad runtime activity', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = createCollectLogger();

  const result = await runAgentPrompt({
    args: ['squad', dir],
    options: { tool: 'codex' },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.agent, 'squad');
  assert.equal(result.routed, false);

  const runtime = await openRuntimeDb(dir, { mustExist: true });
  try {
    const run = runtime.db.prepare("SELECT agent_name, agent_kind, source, title FROM agent_runs ORDER BY updated_at DESC LIMIT 1").get();

    assert.equal(run.agent_name, '@squad');
    assert.equal(run.agent_kind, 'squad');
    assert.equal(run.source, 'squad_session');
    assert.match(run.title, /squad session handoff/i);
  } finally {
    runtime.db.close();
  }
});

test('agent:prompt enforces workflow and routes to the active stage', async () => {
  const dir = await makeTempDir();
  await writeProjectContext(dir, 'SMALL');
  await fs.writeFile(path.join(dir, '.aios-forge/context/prd.md'), '# PRD\n', 'utf8');
  const { t } = createTranslator('en');
  const logger = createCollectLogger();

  const result = await runAgentPrompt({
    args: ['dev', dir],
    options: { tool: 'codex' },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.requestedAgent, 'dev');
  assert.equal(result.agent, 'analyst');
  assert.equal(result.routed, true);
  assert.equal(Boolean(result.runtime), true);

  const runtime = await openRuntimeDb(dir, { mustExist: true });
  try {
    const stageRun = runtime.db.prepare("SELECT agent_name, source, workflow_stage, status FROM agent_runs WHERE agent_name = '@analyst' ORDER BY updated_at DESC LIMIT 1").get();
    const routedEvent = runtime.db.prepare("SELECT event_type, message FROM execution_events WHERE source = 'workflow' ORDER BY created_at DESC, id DESC LIMIT 1").get();

    assert.equal(stageRun.agent_name, '@analyst');
    assert.equal(stageRun.source, 'workflow');
    assert.equal(stageRun.workflow_stage, 'analyst');
    assert.equal(stageRun.status, 'running');
    assert.equal(routedEvent.event_type, 'routed');
    assert.match(routedEvent.message, /direct request for @dev/i);
  } finally {
    runtime.db.close();
  }
});
