'use strict';

/**
 * context:usage counts what happened, not how many rows said so (audit of
 * fcc62933): a standalone `agent:done --verdict` writes `finished` AND
 * `agent_done` for one session (counted once, per run key); a feature scope
 * keeps session ends (they carry no feature slug) so done_without_brief can
 * still fire; a doc loaded from the brief's `related` recall is offered, not a
 * routing gap; a bare `--since` is the default window, never one day.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { collectContextUsage } = require('../src/lib/context-usage');
const { openRuntimeDb, appendContextBriefEvent, appendContextLoadEvent } = require('../src/runtime-store');
const { runAgentDone } = require('../src/commands/runtime');

const quiet = { log() {}, error() {}, warn() {} };

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-usage-counting-'));
  const agents = path.join(dir, '.aioson', 'agents');
  await fs.mkdir(agents, { recursive: true });
  await fs.writeFile(path.join(agents, 'dev.md'), '# Dev\n\nRun `aioson context:brief . --agent=dev` first.\n');
  await fs.writeFile(path.join(agents, 'qa.md'), '# QA\n\nRun `aioson context:brief . --agent=qa` before reviewing.\n');
  return dir;
}

test('a session that wrote finished AND agent_done is one session end', async () => {
  const dir = await makeProject();
  try {
    const result = await runAgentDone({ args: [dir], options: { agent: 'qa', summary: 'reviewed', verdict: 'PASS', json: true }, logger: quiet });
    assert.equal(result.ok, true);

    const { db } = await openRuntimeDb(dir);
    let rows;
    try {
      rows = db.prepare("SELECT event_type FROM execution_events WHERE event_type IN ('finished', 'agent_done')").all();
    } finally {
      db.close();
    }
    assert.equal(rows.length, 2, 'the store really holds both rows for the one session');

    const report = await collectContextUsage(dir);
    assert.equal(report.totals.dones, 1);
    const qa = report.agents.find((entry) => entry.agent === 'qa');
    assert.equal(qa.dones, 1);
    assert.deepEqual(report.flags.done_without_brief, ['qa']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a feature scope narrows briefs and loads but keeps session ends, and related recall is an offer', async () => {
  const dir = await makeProject();
  try {
    const { db } = await openRuntimeDb(dir);
    try {
      appendContextBriefEvent(db, {
        agentName: 'dev',
        message: 'brief_built:executing',
        payload: {
          mode: 'executing',
          must_load: ['.aioson/rules/rule-a.md'],
          should_load: [],
          skills: [],
          related: ['.aioson/docs/dev/phase-loop.md'],
          feature_slug: 'alpha'
        }
      });
      appendContextBriefEvent(db, {
        agentName: 'dev',
        message: 'brief_built:executing',
        payload: { mode: 'executing', must_load: ['.aioson/rules/rule-b.md'], should_load: [], skills: [], feature_slug: 'beta' }
      });
      appendContextLoadEvent(db, {
        eventType: 'doc_loaded',
        agentName: 'dev',
        message: 'doc:dev/phase-loop',
        payload: { target_slug: 'dev/phase-loop', target_path: '.aioson/docs/dev/phase-loop.md', agent_name: 'dev', feature_slug: 'alpha' }
      });
    } finally {
      db.close();
    }
    await runAgentDone({ args: [dir], options: { agent: 'qa', summary: 'reviewed', json: true }, logger: quiet });

    const all = await collectContextUsage(dir);
    assert.deepEqual(all.flags.loaded_never_selected, [], 'a doc offered in `related` and then loaded is not a routing gap');
    const related = all.artifacts.find((entry) => entry.path === '.aioson/docs/dev/phase-loop.md');
    assert.deepEqual(related.sections, ['related']);
    assert.equal(related.loaded, 1);

    const scoped = await collectContextUsage(dir, { feature: 'alpha' });
    assert.equal(scoped.totals.briefs, 1);
    assert.equal(scoped.totals.loads, 1);
    assert.equal(scoped.totals.dones, 1, 'session ends are per agent and survive the feature scope');
    assert.deepEqual(scoped.flags.done_without_brief, ['qa']);
    assert.ok(scoped.caveats.some((line) => /not per feature/.test(line)));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('--since accepts a number of days and nothing else', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-usage-since-'));
  try {
    assert.equal((await collectContextUsage(dir, { since: true })).since_days, 30, 'a bare --since is the default, not one day');
    assert.equal((await collectContextUsage(dir, { since: '7' })).since_days, 7);
    assert.equal((await collectContextUsage(dir, { since: 2.5 })).since_days, 2.5);
    assert.equal((await collectContextUsage(dir, { since: 'abc' })).since_days, 30);
    assert.equal((await collectContextUsage(dir, { since: '-3' })).since_days, 30);
    assert.equal((await collectContextUsage(dir, { since: '0' })).since_days, 30);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
