'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runAgentPrompt } = require('../src/commands/agents');
const {
  runChainClaim,
  runChainList,
  runChainResolve
} = require('../src/commands/chain-work');
const { createTranslator } = require('../src/i18n');
const { openRuntimeDb } = require('../src/runtime-store');
const { upsertWorkItemsFromAudits } = require('../src/neural-chain-work-items');

const RM = { recursive: true, force: true, maxRetries: 5, retryDelay: 50 };

function silentLogger() {
  return { log() {}, error() {} };
}

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-chain-work-'));
  await fs.mkdir(path.join(dir, '.aioson', 'context'), { recursive: true });
  await fs.mkdir(path.join(dir, 'src'), { recursive: true });
  await fs.writeFile(path.join(dir, 'src', 'source.js'), 'module.exports = 1;\n', 'utf8');
  await fs.writeFile(path.join(dir, 'src', 'target.js'), 'module.exports = 2;\n', 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'project.context.md'), [
    '---',
    'project_name: "queue-test"',
    'project_type: "library"',
    'profile: "developer"',
    'framework: "Node.js"',
    'framework_installed: true',
    'classification: "SMALL"',
    'conversation_language: "en"',
    'aioson_version: "1.44.0"',
    '---',
    '',
    '# Context',
    ''
  ].join('\n'), 'utf8');
  return dir;
}

async function seedWorkItem(dir, featureSlug = 'queue-cli') {
  const handle = await openRuntimeDb(dir);
  try {
    const result = upsertWorkItemsFromAudits({
      db: handle.db,
      targetDir: dir,
      featureSlug,
      originRunKey: 'seed-run',
      artifacts: ['src/source.js'],
      audits: [{
        source_file: 'src/source.js',
        impacts: [{
          target_path: 'src/target.js',
          edge_type: 'agent_event',
          confidence: 0.8,
          hit_count: 4,
          classification: 'noise',
          evidence_kind: 'repeated_relation',
          marker: null
        }]
      }]
    });
    return result.items[0];
  } finally {
    handle.db.close();
  }
}

test('chain commands claim atomically and resolve with evidence', async () => {
  const dir = await makeProject();
  try {
    const seeded = await seedWorkItem(dir);
    const listed = await runChainList({
      args: [dir],
      options: { json: true },
      logger: silentLogger()
    });
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].status, 'open');

    const claimed = await runChainClaim({
      args: [dir],
      options: { json: true, id: seeded.work_item_id, agent: 'deyvin' },
      logger: silentLogger()
    });
    assert.equal(claimed.ok, true);
    assert.equal(claimed.items[0].claimed_by, 'dev');
    assert.equal(typeof claimed.claim_token, 'string');

    const projectionPath = path.join(dir, '.aioson', 'context', 'noises', 'queue-cli.md');
    assert.equal(fsSync.existsSync(projectionPath), true);
    assert.match(await fs.readFile(projectionPath, 'utf8'), /status: claimed/);

    const rejected = await runChainResolve({
      args: [dir],
      options: {
        json: true,
        id: seeded.work_item_id,
        agent: 'dev',
        token: claimed.claim_token,
        outcome: 'fixed'
      },
      logger: silentLogger()
    });
    assert.equal(rejected.reason, 'evidence_required');

    const resolved = await runChainResolve({
      args: [dir],
      options: {
        json: true,
        id: seeded.work_item_id,
        agent: 'dev',
        token: claimed.claim_token,
        outcome: 'fixed',
        evidence: 'node --test tests/target.test.js passed'
      },
      logger: silentLogger()
    });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.item.outcome, 'fixed');
    assert.equal(fsSync.existsSync(projectionPath), false);

    const history = await runChainList({
      args: [dir],
      options: { json: true, 'include-resolved': true },
      logger: silentLogger()
    });
    assert.equal(history.items.length, 1);
    assert.equal(history.items[0].status, 'resolved');
  } finally {
    await fs.rm(dir, RM);
  }
});

test('chain:list CLI exposes the actionable queue as JSON', async () => {
  const dir = await makeProject();
  try {
    const seeded = await seedWorkItem(dir);
    const cliPath = path.resolve(__dirname, '..', 'src', 'cli.js');
    const child = spawnSync(process.execPath, [cliPath, 'chain:list', dir, '--json'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8'
    });
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout);
    assert.equal(result.ok, true);
    assert.equal(result.items[0].work_item_id, seeded.work_item_id);
  } finally {
    await fs.rm(dir, RM);
  }
});

test('DEV prompt receives queued work without claiming it', async () => {
  const dir = await makeProject();
  try {
    const seeded = await seedWorkItem(dir, 'prompt-queue');
    const { t } = createTranslator('en');
    const result = await runAgentPrompt({
      args: ['dev', dir],
      options: { tool: 'codex', headless: true, feature: 'prompt-queue' },
      logger: silentLogger(),
      t
    });
    assert.equal(result.ok, true);
    assert.match(result.prompt, /Neural Chain impact queue/);
    assert.match(result.prompt, new RegExp(seeded.work_item_id));
    assert.match(result.prompt, /chain:claim/);

    const handle = await openRuntimeDb(dir, { mustExist: true });
    try {
      const row = handle.db.prepare('SELECT status, claimed_by FROM chain_work_items WHERE id = ?').get(seeded.id);
      assert.equal(row.status, 'open');
      assert.equal(row.claimed_by, null);
    } finally {
      handle.db.close();
    }
  } finally {
    await fs.rm(dir, RM);
  }
});
