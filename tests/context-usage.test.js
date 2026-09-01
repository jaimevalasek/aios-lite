'use strict';

/**
 * context:usage — reachable is not consulted. The brief/load/done rows were
 * written and never read; this reader turns them into the four flags that
 * name a routing gap, a dead skill, or an agent that closed without asking
 * for its brief — and agent:done says the last one out loud (advisory).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { collectContextUsage, normalizeAgent } = require('../src/lib/context-usage');
const { openRuntimeDb, appendContextBriefEvent, appendContextLoadEvent } = require('../src/runtime-store');
const { runAgentDone } = require('../src/commands/runtime');

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'aioson.js');
const quiet = { log() {}, error() {}, warn() {} };

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-context-usage-'));
  const agents = path.join(dir, '.aioson', 'agents');
  await fs.mkdir(agents, { recursive: true });
  await fs.writeFile(path.join(agents, 'dev.md'), '# Dev\n\nLoad only rules selected by `context:brief` for the paths touched.\n');
  await fs.writeFile(path.join(agents, 'qa.md'), '# QA\n\nRun `aioson context:brief . --agent=qa` before reviewing.\n');
  await fs.writeFile(path.join(agents, 'committer.md'), '# Committer\n\nStage and commit; no knowledge routing here.\n');
  await fs.mkdir(path.join(dir, '.aioson', 'skills'), { recursive: true });
  await fs.writeFile(path.join(dir, '.aioson', 'skills', 'registry.json'), JSON.stringify({
    skills: [
      { id: 'skill-x', status: 'active', path: '.aioson/skills/process/skill-x/SKILL.md' },
      { id: 'skill-y', status: 'active', path: '.aioson/skills/process/skill-y/SKILL.md' },
      { id: 'skill-z', status: 'deprecated', path: '.aioson/skills/process/skill-z/SKILL.md' }
    ]
  }));
  return dir;
}

test('normalizeAgent folds the @-prefixed run form and the bare brief form into one key', () => {
  assert.equal(normalizeAgent('@dev'), 'dev');
  assert.equal(normalizeAgent(' dev '), 'dev');
  assert.equal(normalizeAgent(''), null);
});

test('no runtime store is "nothing recorded", never an error', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-context-usage-empty-'));
  try {
    const report = await collectContextUsage(dir);
    assert.equal(report.ok, true);
    assert.equal(report.available, false);
    assert.equal(report.reason, 'runtime_store_missing');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the reader folds briefs, loads and session ends into artifact and agent views with the four flags', async () => {
  const dir = await makeProject();
  try {
    const { db } = await openRuntimeDb(dir);
    try {
      for (let i = 0; i < 2; i += 1) {
        appendContextBriefEvent(db, {
          agentName: 'dev',
          message: 'brief_built:executing',
          payload: {
            mode: 'executing',
            must_load: ['.aioson/rules/rule-a.md'],
            should_load: ['.aioson/docs/dev/phase-loop.md'],
            skills: ['.aioson/skills/process/skill-x/SKILL.md'],
            feature_slug: i === 0 ? 'alpha' : 'beta'
          }
        });
      }
      appendContextLoadEvent(db, {
        eventType: 'doc_loaded',
        agentName: 'dev',
        message: 'doc:dev/stack-conventions',
        payload: { target_slug: 'dev/stack-conventions', target_path: '.aioson/docs/dev/stack-conventions.md', agent_name: 'dev' }
      });
    } finally {
      db.close();
    }

    // Session ends: dev (briefed), qa (kernel mandates a brief, none recorded),
    // committer (kernel never asks for one).
    const dev = await runAgentDone({ args: [dir], options: { agent: 'dev', summary: 'done', json: true }, logger: quiet });
    const qa = await runAgentDone({ args: [dir], options: { agent: 'qa', summary: 'reviewed', json: true }, logger: quiet });
    const committer = await runAgentDone({ args: [dir], options: { agent: 'committer', summary: 'committed', json: true }, logger: quiet });
    assert.equal(dev.ok, true);
    assert.equal(dev.context_brief.state, 'consulted');
    assert.equal(dev.context_brief.briefs, 2);
    assert.equal(qa.ok, true, 'the advisory never flips agent:done');
    assert.equal(qa.context_brief.state, 'not_consulted');
    assert.equal(qa.context_brief.required, true);
    assert.equal(committer.context_brief.state, 'not_required');

    const report = await collectContextUsage(dir);
    assert.equal(report.available, true);
    assert.deepEqual(
      { briefs: report.totals.briefs, loads: report.totals.loads, dones: report.totals.dones },
      { briefs: 2, loads: 1, dones: 3 }
    );

    const byPath = new Map(report.artifacts.map((entry) => [entry.path, entry]));
    assert.equal(byPath.get('.aioson/rules/rule-a.md').selected, 2);
    assert.deepEqual(byPath.get('.aioson/rules/rule-a.md').sections, ['must_load']);
    assert.equal(byPath.get('.aioson/skills/process/skill-x/SKILL.md').selected, 2);
    assert.equal(byPath.get('.aioson/docs/dev/stack-conventions.md').loaded, 1);
    assert.equal(byPath.get('.aioson/docs/dev/stack-conventions.md').selected, 0);

    const agents = Object.fromEntries(report.agents.map((entry) => [entry.agent, entry]));
    assert.equal(agents.dev.briefs, 2);
    assert.equal(agents.dev.loads, 1);
    assert.equal(agents.dev.dones, 1);
    assert.equal(agents.qa.dones, 1);
    assert.equal(agents.qa.briefs, 0);

    assert.deepEqual(report.flags.loaded_never_selected, ['.aioson/docs/dev/stack-conventions.md']);
    assert.ok(report.flags.selected_never_loaded.includes('.aioson/rules/rule-a.md'));
    assert.deepEqual(report.flags.skills_never_selected.map((skill) => skill.id), ['skill-y'], 'active and unselected only — never the routed one, never the deprecated one');
    assert.deepEqual(report.flags.done_without_brief, ['qa'], 'the committer kernel never promised a brief');

    const scoped = await collectContextUsage(dir, { feature: 'alpha' });
    assert.equal(scoped.totals.briefs, 1);
    assert.equal(scoped.totals.loads, 0, 'a load without a feature slug is outside the feature scope');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the loaded side is a caveat, not a flag, when nothing was ever confirmed', async () => {
  const dir = await makeProject();
  try {
    const { db } = await openRuntimeDb(dir);
    try {
      appendContextBriefEvent(db, {
        agentName: 'dev',
        message: 'brief_built:planning',
        payload: { mode: 'planning', must_load: ['.aioson/rules/rule-a.md', '.aioson/rules/rule-b.md'], skills: [] }
      });
      appendContextBriefEvent(db, {
        agentName: 'dev',
        message: 'brief_built:planning',
        payload: { mode: 'planning', must_load: ['.aioson/rules/rule-a.md'], skills: [] }
      });
    } finally {
      db.close();
    }
    const report = await collectContextUsage(dir);
    assert.deepEqual(report.flags.selected_never_loaded, [], 'without any context:load row, "never loaded" would be noise');
    assert.ok(report.caveats.some((line) => line.includes('context:load')));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the CLI is advisory: exit 0 with and without a store, JSON on request', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-context-usage-cli-'));
  try {
    const json = spawnSync(process.execPath, [BIN, 'context:usage', dir, '--json'], { encoding: 'utf8' });
    assert.equal(json.status, 0, json.stderr);
    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.available, false);

    const human = spawnSync(process.execPath, [BIN, 'context:usage', dir], { encoding: 'utf8' });
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /no runtime store yet/);

    const help = spawnSync(process.execPath, [BIN, 'help'], { encoding: 'utf8' });
    assert.match(help.stdout, /context:usage \[path\] \[--since=<days>\]/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
