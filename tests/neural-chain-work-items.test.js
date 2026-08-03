'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { openRuntimeDb } = require('../src/runtime-store');
const { buildChainActivationContext, inspectChainHandoffGate } = require('../src/neural-chain-activation');
const { initManifest } = require('../src/agent-execution/manifest');
const {
  claimWorkItems,
  getWorkItem,
  listWorkItems,
  releaseWorkItem,
  resolveWorkItem,
  upsertWorkItemsFromAudits
} = require('../src/neural-chain-work-items');
const {
  PROJECTION_SCHEMA,
  projectionPath,
  reconcileNoiseState,
  syncNoiseProjection
} = require('../src/neural-chain-noise-projection');
const { writeNoiseFile } = require('../src/neural-chain-noise-file');

async function makeTempProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-chain-work-'));
  await fs.mkdir(path.join(dir, '.aioson', 'runtime'), { recursive: true });
  await fs.mkdir(path.join(dir, 'src'), { recursive: true });
  await fs.writeFile(path.join(dir, 'src', 'foo.js'), 'module.exports = 1;\n');
  return dir;
}

function auditFor(source, impacts) {
  return [{ source_file: source, impacts, impacts_found: impacts.length, error: null }];
}

function impact(target, overrides = {}) {
  return {
    target_path: target,
    edge_type: 'agent_event',
    confidence: 0.6,
    hit_count: 3,
    classification: 'noise',
    evidence_kind: 'co_edit_history',
    marker: null,
    ...overrides
  };
}

test('migration creates chain_work_items with queue and lease indexes', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  try {
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='chain_work_items'"
    ).get();
    assert.equal(table.name, 'chain_work_items');
    const columns = db.prepare('PRAGMA table_info(chain_work_items)').all().map((column) => column.name);
    for (const required of ['dedupe_key', 'source_fingerprint', 'status', 'claim_token', 'lease_until', 'resolution_evidence']) {
      assert.ok(columns.includes(required), `${required} missing`);
    }
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='chain_work_items'"
    ).all().map((row) => row.name);
    assert.ok(indexes.includes('idx_chain_work_items_queue'));
    assert.ok(indexes.includes('idx_chain_work_items_lease'));
  } finally {
    db.close();
  }
});

test('materialization suppresses weak co-edit noise and same-session targets but keeps test evidence', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  try {
    const result = upsertWorkItemsFromAudits({
      db,
      targetDir: dir,
      featureSlug: 'queue-v2',
      artifacts: ['src/foo.js', 'src/bar.js'],
      audits: auditFor('src/foo.js', [
        impact('src/weak.js', { confidence: 0.2, hit_count: 1 }),
        impact('src/foo.test.js', { confidence: 0.2, hit_count: 1, evidence_kind: 'test_pair' }),
        impact('src/bar.js', { confidence: 0.9, hit_count: 9 })
      ]),
      autonomyMode: 'guarded'
    });

    assert.equal(result.inserted, 1);
    assert.equal(result.skipped, 2);
    assert.equal(result.items[0].target_path, 'src/foo.test.js');
    assert.equal(result.items[0].kind, 'test');
  } finally {
    db.close();
  }
});

test('same source state deduplicates across sessions and a changed source creates new work', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  try {
    const input = {
      db,
      targetDir: dir,
      featureSlug: 'queue-v2',
      artifacts: ['src/foo.js'],
      audits: auditFor('src/foo.js', [impact('src/dep.js')]),
      autonomyMode: 'guarded'
    };
    upsertWorkItemsFromAudits(input);
    upsertWorkItemsFromAudits(input);

    let rows = db.prepare('SELECT * FROM chain_work_items').all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].occurrence_count, 2);

    const claimed = claimWorkItems(db, { agent: 'dev', itemId: rows[0].id });
    assert.equal(claimed.ok, true);
    const resolved = resolveWorkItem(db, {
      itemId: rows[0].id,
      agent: 'dev',
      claimToken: claimed.claim_token,
      outcome: 'fixed',
      evidence: 'focused test passed'
    });
    assert.equal(resolved.ok, true);

    upsertWorkItemsFromAudits(input);
    assert.equal(listWorkItems(db).length, 0, 'resolved source state must not reopen');

    await fs.writeFile(path.join(dir, 'src', 'foo.js'), 'module.exports = 2;\n');
    upsertWorkItemsFromAudits(input);
    rows = db.prepare('SELECT * FROM chain_work_items ORDER BY id').all();
    assert.equal(rows.length, 2);
    assert.equal(rows[1].status, 'open');
  } finally {
    db.close();
  }
});

test('claim lease is exclusive, token-protected, releasable, and recoverable after expiry', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  try {
    upsertWorkItemsFromAudits({
      db,
      targetDir: dir,
      featureSlug: 'queue-v2',
      artifacts: ['src/foo.js'],
      audits: auditFor('src/foo.js', [impact('src/dep.js')])
    });
    const item = listWorkItems(db)[0];
    const first = claimWorkItems(db, {
      agent: 'deyvin',
      itemId: item.work_item_id,
      leaseMs: 60_000,
      now: new Date('2026-07-31T12:00:00Z')
    });
    assert.equal(first.ok, true);
    assert.equal(first.items[0].claimed_by, 'dev');

    const second = claimWorkItems(db, {
      agent: 'dev',
      itemId: item.work_item_id,
      now: new Date('2026-07-31T12:00:30Z')
    });
    assert.equal(second.ok, false);
    assert.equal(second.reason, 'no_claimable_items');

    const wrongRelease = releaseWorkItem(db, {
      itemId: item.work_item_id,
      agent: 'dev',
      claimToken: 'wrong'
    });
    assert.equal(wrongRelease.reason, 'claim_token_mismatch');

    const released = releaseWorkItem(db, {
      itemId: item.work_item_id,
      agent: 'dev',
      claimToken: first.claim_token
    });
    assert.equal(released.ok, true);

    claimWorkItems(db, {
      agent: 'dev',
      itemId: item.work_item_id,
      leaseMs: 60_000,
      now: new Date('2026-07-31T12:00:00Z')
    });
    const reclaimed = claimWorkItems(db, {
      agent: 'dev',
      itemId: item.work_item_id,
      now: new Date('2026-07-31T12:01:01Z')
    });
    assert.equal(reclaimed.ok, true, 'expired lease returns item to queue');
  } finally {
    db.close();
  }
});

test('resolution requires a claim and evidence, then closes the projection immediately', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  try {
    upsertWorkItemsFromAudits({
      db,
      targetDir: dir,
      featureSlug: 'queue-v2',
      artifacts: ['src/foo.js'],
      audits: auditFor('src/foo.js', [impact('src/dep.js')])
    });
    const item = listWorkItems(db)[0];
    const projection = syncNoiseProjection({ db, targetDir: dir, featureSlug: 'queue-v2' });
    assert.equal(fsSync.existsSync(projection.path), true);
    assert.match(await fs.readFile(projection.path, 'utf8'), new RegExp(PROJECTION_SCHEMA.replace('/', '\\/')));

    assert.equal(resolveWorkItem(db, {
      itemId: item.work_item_id,
      outcome: 'fixed',
      evidence: 'test passed'
    }).reason, 'claim_required');

    const claim = claimWorkItems(db, { agent: 'dev', itemId: item.work_item_id });
    const closed = resolveWorkItem(db, {
      itemId: item.work_item_id,
      agent: 'dev',
      claimToken: claim.claim_token,
      outcome: 'verified-no-change',
      evidence: 'target inspected; invariant remains valid'
    });
    assert.equal(closed.ok, true);
    assert.equal(closed.item.outcome, 'verified_no_change');
    syncNoiseProjection({ db, targetDir: dir, featureSlug: 'queue-v2' });
    assert.equal(fsSync.existsSync(projection.path), false);
  } finally {
    db.close();
  }
});

test('manual projection checkbox resolves its work item on reconciliation', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  try {
    upsertWorkItemsFromAudits({
      db,
      targetDir: dir,
      featureSlug: 'manual-resolution',
      artifacts: ['src/foo.js'],
      audits: auditFor('src/foo.js', [impact('src/dep.js')])
    });
    const filePath = projectionPath(dir, 'manual-resolution');
    syncNoiseProjection({ db, targetDir: dir, featureSlug: 'manual-resolution' });
    const text = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(filePath, text.replace('- [ ]', '- [x]'));

    const result = reconcileNoiseState({ db, targetDir: dir });
    assert.equal(result.manually_resolved, 1);
    assert.equal(fsSync.existsSync(filePath), false);
    const row = db.prepare('SELECT status, outcome FROM chain_work_items').get();
    assert.deepEqual(row, { status: 'resolved', outcome: 'verified_no_change' });
  } finally {
    db.close();
  }
});

test('legacy all-resolved noise is removed even when no new artifacts exist', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  try {
    const legacy = writeNoiseFile({
      targetDir: dir,
      featureSlug: 'legacy',
      audits: auditFor('src/foo.js', [impact('src/dep.js')]),
      now: new Date('2026-07-31T12:00:00Z')
    });
    const text = await fs.readFile(legacy.path, 'utf8');
    await fs.writeFile(legacy.path, text.replace(/- \[ \]/g, '- [x]'));

    const reconciled = reconcileNoiseState({ db, targetDir: dir });
    assert.equal(reconciled.legacy_deleted, 1);
    assert.equal(fsSync.existsSync(legacy.path), false);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM chain_work_items').get().count, 0);
  } finally {
    db.close();
  }
});

test('DEV activation receives a bounded actionable queue without claiming items', async () => {
  const dir = await makeTempProject();
  const { db } = await openRuntimeDb(dir);
  upsertWorkItemsFromAudits({
    db,
    targetDir: dir,
    featureSlug: 'activation',
    artifacts: ['src/foo.js'],
    audits: auditFor('src/foo.js', [impact('src/dep.js')])
  });
  db.close();

  const context = await buildChainActivationContext(dir, {
    agent: 'dev',
    featureSlug: 'activation'
  });
  assert.match(context, /Neural Chain impact queue/);
  assert.match(context, /NC-1/);
  assert.match(context, /chain:claim/);

  const reopened = await openRuntimeDb(dir);
  try {
    assert.equal(getWorkItem(reopened.db, 'NC-1').status, 'open');
  } finally {
    reopened.db.close();
  }
});

test('agent-execution policy routes test/security work only to enabled specialists', async () => {
  const dir = await makeTempProject();
  const made = await initManifest(dir, 'specialists', 'codex');
  made.manifest.agents.tester.enabled = true;
  made.manifest.agents.pentester.enabled = true;
  await fs.writeFile(made.path, JSON.stringify(made.manifest));
  const { db } = await openRuntimeDb(dir);
  try {
    const result = upsertWorkItemsFromAudits({
      db,
      targetDir: dir,
      featureSlug: 'specialists',
      artifacts: ['src/foo.js'],
      audits: auditFor('src/foo.js', [
        impact('src/foo.test.js', { evidence_kind: 'test_pair' }),
        impact('src/auth.js', { kind: 'security' })
      ])
    });
    assert.deepEqual(result.items.map((item) => item.owner_agent), ['tester', 'pentester']);
  } finally {
    db.close();
  }

  const testerContext = await buildChainActivationContext(dir, { agent: 'tester', featureSlug: 'specialists' });
  const pentesterContext = await buildChainActivationContext(dir, { agent: 'pentester', featureSlug: 'specialists' });
  const qaContext = await buildChainActivationContext(dir, { agent: 'qa', featureSlug: 'specialists' });
  assert.match(testerContext, /foo\.test\.js/);
  assert.doesNotMatch(testerContext, /src\/auth\.js/);
  assert.match(pentesterContext, /src\/auth\.js/);
  assert.match(qaContext, /QA oversight/);
  assert.match(qaContext, /owned by tester/);
});

test('v2 manifest blocks DEV handoff while DEV-owned chain work is actionable', async () => {
  const dir = await makeTempProject();
  await initManifest(dir, 'gate', 'codex');
  const { db } = await openRuntimeDb(dir);
  upsertWorkItemsFromAudits({
    db,
    targetDir: dir,
    featureSlug: 'gate',
    artifacts: ['src/foo.js'],
    audits: auditFor('src/foo.js', [impact('src/dep.js')])
  });
  db.close();

  const blocked = await inspectChainHandoffGate(dir, { featureSlug: 'gate', agent: 'dev' });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.items.length, 1);

  const reopened = await openRuntimeDb(dir);
  const item = listWorkItems(reopened.db)[0];
  const claim = claimWorkItems(reopened.db, { agent: 'dev', itemId: item.work_item_id });
  resolveWorkItem(reopened.db, {
    itemId: item.work_item_id,
    agent: 'dev',
    claimToken: claim.claim_token,
    outcome: 'verified_no_change',
    evidence: 'dependency inspected and focused regression passed'
  });
  reopened.db.close();
  const clear = await inspectChainHandoffGate(dir, { featureSlug: 'gate', agent: 'dev' });
  assert.equal(clear.ok, true);
});
