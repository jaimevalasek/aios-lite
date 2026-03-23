'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const {
  runLiveStart,
  runRuntimeEmit,
  runLiveHandoff,
  runLiveStatus,
  runLiveClose
} = require('../src/commands/live');
const { openRuntimeDb, readAgentSession } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-live-command-'));
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

test('live session commands track start, plan progress, handoff and close for a no-launch session', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'plan.md'), [
    '# Plano',
    '',
    '### RF-01 - Entregar launcher',
    '### Fase 2 - Handoff entre agentes'
  ].join('\n'));

  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();

  const start = await runLiveStart({
    args: [dir],
    options: {
      tool: 'codex',
      'tool-bin': 'node',
      agent: 'deyvin',
      title: 'Sessao viva do deyvin',
      plan: 'plan.md',
      'no-launch': true,
      json: true
    },
    logger,
    t
  });

  assert.equal(start.ok, true);
  assert.equal(start.agent, '@deyvin');
  assert.equal(start.tool, 'codex');
  assert.equal(start.reused, false);
  assert.equal(start.open, true);
  assert.equal(start.pid, null);

  const { db, runtimeDir } = await openRuntimeDb(dir, { mustExist: true });
  try {
    const sessionTask = db.prepare(`
      SELECT task_key, task_kind, meta_json, status
      FROM tasks
      WHERE task_key = ?
    `).get(start.taskKey);
    const sessionMeta = JSON.parse(sessionTask.meta_json);
    assert.equal(sessionTask.task_kind, 'live_session');
    assert.equal(sessionTask.status, 'running');
    assert.equal(sessionMeta.tool_session, 'codex');
    assert.equal(sessionMeta.plan_ref, 'plan.md');
    assert.deepEqual(sessionMeta.plan_steps.map((step) => step.id), ['RF-01', 'Fase 2']);

    const liveRun = db.prepare(`
      SELECT run_key, source, session_key, status
      FROM agent_runs
      WHERE run_key = ?
    `).get(start.runKey);
    assert.equal(liveRun.source, 'live');
    assert.equal(liveRun.session_key, start.sessionKey);
    assert.equal(liveRun.status, 'running');

    const sessionRef = await readAgentSession(runtimeDir, '@deyvin');
    assert.equal(sessionRef.runKey, start.runKey);
    assert.equal(sessionRef.taskKey, start.taskKey);
    assert.equal(sessionRef.sessionKey, start.sessionKey);
  } finally {
    db.close();
  }

  const statePath = path.join(dir, '.aioson', 'runtime', 'live', start.sessionKey, 'state.json');
  const initialState = JSON.parse(await fs.readFile(statePath, 'utf8'));
  assert.equal(initialState.phase, 'active');
  assert.equal(initialState.tool_session, 'codex');
  assert.equal(initialState.active_agent, '@deyvin');
  assert.equal(initialState.stats.events_total, 1);
  assert.equal(initialState.stats.plan_steps_total, 2);

  const startedTask = await runRuntimeEmit({
    args: [dir],
    options: {
      agent: 'deyvin',
      type: 'task_started',
      title: 'Corrigir modal de estoque',
      json: true
    },
    logger,
    t
  });

  assert.equal(startedTask.ok, true);
  assert.equal(typeof startedTask.currentTask, 'string');

  const checkpoint = await runRuntimeEmit({
    args: [dir],
    options: {
      agent: 'deyvin',
      type: 'plan_checkpoint',
      'plan-step': 'RF-01',
      summary: 'Launcher entregue',
      json: true
    },
    logger,
    t
  });
  assert.equal(checkpoint.ok, true);
  assert.equal(checkpoint.eventType, 'plan_checkpoint');

  const completedTask = await runRuntimeEmit({
    args: [dir],
    options: {
      agent: '@deyvin',
      type: 'task_completed',
      summary: 'Corrigi o modal de estoque',
      refs: 'src/app.js,src/styles.css',
      json: true
    },
    logger,
    t
  });

  assert.equal(completedTask.ok, true);
  assert.equal(completedTask.currentTask, null);

  const openStatus = await runLiveStatus({
    args: [dir],
    options: {
      agent: 'deyvin',
      json: true
    },
    logger,
    t
  });

  assert.equal(openStatus.ok, true);
  assert.equal(openStatus.phase, 'active');
  assert.equal(openStatus.processState, 'not_tracked');
  assert.equal(openStatus.stats.events_total, 4);
  assert.equal(openStatus.stats.tasks_completed, 1);
  assert.equal(openStatus.stats.plan_steps_done, 1);
  assert.equal(openStatus.stats.plan_steps_total, 2);
  assert.equal(openStatus.recentEvents.some((event) => event.type === 'plan_checkpoint'), true);

  const handoff = await runLiveHandoff({
    args: [dir],
    options: {
      agent: 'deyvin',
      to: 'product',
      reason: 'Escopo exige decisao de produto',
      json: true
    },
    logger,
    t
  });

  assert.equal(handoff.ok, true);
  assert.equal(handoff.agent, '@deyvin');
  assert.equal(handoff.nextAgent, '@product');
  assert.notEqual(handoff.runKey, handoff.previousRunKey);

  const { db: handoffDb, runtimeDir: handoffRuntimeDir } = await openRuntimeDb(dir, { mustExist: true });
  try {
    const previousRun = handoffDb.prepare(`
      SELECT run_key, status
      FROM agent_runs
      WHERE run_key = ?
    `).get(handoff.previousRunKey);
    const nextRun = handoffDb.prepare(`
      SELECT run_key, status, parent_run_key, agent_name
      FROM agent_runs
      WHERE run_key = ?
    `).get(handoff.runKey);
    assert.equal(previousRun.status, 'completed');
    assert.equal(nextRun.status, 'running');
    assert.equal(nextRun.parent_run_key, handoff.previousRunKey);
    assert.equal(nextRun.agent_name, '@product');

    const sessionTask = handoffDb.prepare(`
      SELECT meta_json
      FROM tasks
      WHERE task_key = ?
    `).get(start.taskKey);
    const sessionMeta = JSON.parse(sessionTask.meta_json);
    assert.equal(sessionMeta.plan_steps.find((step) => step.id === 'RF-01').done, true);

    const oldSessionRef = await readAgentSession(handoffRuntimeDir, '@deyvin');
    const newSessionRef = await readAgentSession(handoffRuntimeDir, '@product');
    assert.equal(oldSessionRef, null);
    assert.equal(newSessionRef.runKey, handoff.runKey);
    assert.equal(newSessionRef.taskKey, start.taskKey);
    assert.equal(newSessionRef.sessionKey, start.sessionKey);
  } finally {
    handoffDb.close();
  }

  const handoffState = JSON.parse(await fs.readFile(statePath, 'utf8'));
  assert.equal(handoffState.active_agent, '@product');
  assert.equal(handoffState.current_run_key, handoff.runKey);
  assert.equal(handoffState.stats.plan_steps_done, 1);

  const close = await runLiveClose({
    args: [dir],
    options: {
      agent: 'product',
      summary: 'Sessao encerrada com sucesso',
      json: true
    },
    logger,
    t
  });

  assert.equal(close.ok, true);
  assert.equal(close.closed, true);
  assert.equal(close.status, 'completed');

  const closedStatus = await runLiveStatus({
    args: [dir],
    options: {
      agent: '@product',
      json: true
    },
    logger,
    t
  });

  assert.equal(closedStatus.ok, true);
  assert.equal(closedStatus.phase, 'closed');
  assert.equal(closedStatus.open, false);
  assert.equal(closedStatus.recentEvents.some((event) => event.type === 'session_closed'), true);

  const closedSessionRef = await readAgentSession(runtimeDir, '@product');
  assert.equal(closedSessionRef, null);

  const ndjsonPath = path.join(dir, '.aioson', 'runtime', 'live', start.sessionKey, 'events.ndjson');
  const lines = (await fs.readFile(ndjsonPath, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(lines.length, 6);
  assert.deepEqual(lines.map((line) => line.type), [
    'session_started',
    'task_started',
    'plan_checkpoint',
    'task_completed',
    'handoff',
    'session_closed'
  ]);

  const summaryPath = path.join(dir, '.aioson', 'runtime', 'live', start.sessionKey, 'summary.md');
  const summary = await fs.readFile(summaryPath, 'utf8');
  assert.equal(summary.includes('Sessao encerrada com sucesso'), true);
});
