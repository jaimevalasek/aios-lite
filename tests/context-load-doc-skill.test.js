'use strict';

/**
 * Runtime usage telemetry for docs and skills — the dormant half of the
 * operational loop: `context:load` could only record rule/brain loads and no
 * flow recorded the brief decision at all, so "are the routed docs and skills
 * actually used at runtime?" was unmeasurable. Now `context:load` accepts
 * doc:/skill: targets and every `context:brief` CLI call best-effort appends
 * one `brief_built` row when the runtime DB exists.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { openRuntimeDb } = require('../src/runtime-store');
const { runContextLoad } = require('../src/commands/context-load');
const { runContextBrief } = require('../src/commands/context-brief');

async function writeFile(dir, relPath, content) {
  const absPath = path.join(dir, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf8');
}

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-ctx-load-'));
  await writeFile(dir, '.aioson/context/project.context.md', [
    '---', 'framework: Node.js', 'project_type: web-app', 'load_tier: always', '---', '# Project'
  ].join('\n'));
  await writeFile(dir, '.aioson/docs/dev/phase-loop.md', '---\ndescription: phase loop\n---\nbody');
  await writeFile(dir, '.aioson/skills/process/secure-demo/SKILL.md', [
    '---', 'name: secure-demo', 'description: demo', 'agents: [dev]', 'triggers: [authentication]', '---', '# S'
  ].join('\n'));
  return dir;
}

function readEvents(db, eventType) {
  return db.prepare('SELECT event_type, agent_name, message, payload_json FROM execution_events WHERE event_type = ?')
    .all(eventType);
}

const silentLogger = { log: () => {} };

test('context:load records doc_loaded and skill_loaded with resolved paths', async () => {
  const dir = await makeProject();
  try {
    const doc = await runContextLoad({
      args: [dir], logger: silentLogger,
      options: { target: 'doc:dev/phase-loop', agent: 'dev', json: true }
    });
    assert.equal(doc.ok, true, JSON.stringify(doc));
    assert.equal(doc.event_type, 'doc_loaded');
    assert.deepEqual(doc.missing, []);

    const skill = await runContextLoad({
      args: [dir], logger: silentLogger,
      options: { target: 'skill:process/secure-demo', agent: 'dev', json: true }
    });
    assert.equal(skill.ok, true, JSON.stringify(skill));
    assert.equal(skill.event_type, 'skill_loaded');
    assert.deepEqual(skill.missing, []);

    const { db } = await openRuntimeDb(dir);
    try {
      const docRows = readEvents(db, 'doc_loaded');
      assert.equal(docRows.length, 1);
      assert.match(docRows[0].payload_json, /\.aioson\/docs\/dev\/phase-loop\.md/);
      const skillRows = readEvents(db, 'skill_loaded');
      assert.equal(skillRows.length, 1);
      assert.match(skillRows[0].payload_json, /\.aioson\/skills\/process\/secure-demo\/SKILL\.md/);
    } finally {
      db.close();
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('context:brief best-effort appends one brief_built row when the runtime DB exists', async () => {
  const dir = await makeProject();
  try {
    // No runtime DB yet: the brief still works and records nothing.
    const cold = await runContextBrief({
      args: [dir], logger: silentLogger,
      options: { agent: 'dev', mode: 'executing', task: 'implement authentication middleware', json: true, 'no-recall': true }
    });
    assert.equal(cold.ok, true);

    const seeded = await openRuntimeDb(dir);
    seeded.db.close();

    const warm = await runContextBrief({
      args: [dir], logger: silentLogger,
      options: { agent: 'dev', mode: 'executing', task: 'implement authentication middleware', json: true, 'no-recall': true }
    });
    assert.equal(warm.ok, true);

    const { db } = await openRuntimeDb(dir);
    try {
      const rows = readEvents(db, 'brief_built');
      assert.equal(rows.length, 1, JSON.stringify(rows));
      const payload = JSON.parse(rows[0].payload_json);
      assert.equal(payload.mode, 'executing');
      assert.ok(payload.skills.includes('.aioson/skills/process/secure-demo/SKILL.md'), JSON.stringify(payload));
    } finally {
      db.close();
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
