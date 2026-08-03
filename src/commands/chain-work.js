'use strict';

const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');
const { reconcileNoiseState, syncNoiseProjection } = require('../neural-chain-noise-projection');
const {
  ACTIONABLE_STATUSES,
  DEFAULT_LEASE_MS,
  claimWorkItems,
  listWorkItems,
  releaseWorkItem,
  resolveWorkItem,
  summarizeWorkItems
} = require('../neural-chain-work-items');

function targetDirFrom(args) {
  return path.resolve(process.cwd(), args[0] || '.');
}

function parseStatuses(options) {
  if (options['include-resolved']) return [...ACTIONABLE_STATUSES, 'resolved', 'obsolete'];
  if (!options.status) return ACTIONABLE_STATUSES;
  return String(options.status).split(',').map((value) => value.trim()).filter(Boolean);
}

function logItem(logger, item) {
  const claim = item.claimed_by ? ` claimed=${item.claimed_by}` : '';
  logger.log(`  ${item.work_item_id} [${item.status}/${item.kind}] ${item.target_path} confidence=${Number(item.confidence).toFixed(2)}${claim}`);
  logger.log(`    source=${item.source_path} — ${item.reason}`);
}

async function withRuntimeDb(targetDir, callback) {
  const handle = await openRuntimeDb(targetDir);
  try {
    return callback(handle.db, handle);
  } finally {
    handle.db.close();
  }
}

async function runChainList({ args = [], options = {}, logger }) {
  const targetDir = targetDirFrom(args);
  return withRuntimeDb(targetDir, (db) => {
    const reconciliation = reconcileNoiseState({ db, targetDir });
    const items = listWorkItems(db, {
      featureSlug: options.feature || null,
      includeUnspecified: Boolean(options.feature),
      agent: options.agent || null,
      statuses: parseStatuses(options),
      limit: options.limit || 50
    });
    const result = {
      ok: true,
      targetDir,
      summary: summarizeWorkItems(db),
      reconciliation,
      items
    };
    if (!options.json && logger) {
      logger.log(`chain:list — ${items.length} item(s), ${result.summary.actionable} actionable`);
      for (const item of items) logItem(logger, item);
    }
    return result;
  });
}

async function runChainClaim({ args = [], options = {}, logger }) {
  const targetDir = targetDirFrom(args);
  return withRuntimeDb(targetDir, (db) => {
    reconcileNoiseState({ db, targetDir });
    const leaseMinutes = Number(options['lease-minutes']);
    const claimed = claimWorkItems(db, {
      agent: options.agent,
      featureSlug: options.feature || null,
      itemId: options.id || args[1] || null,
      limit: options.limit || 1,
      leaseMs: Number.isFinite(leaseMinutes) && leaseMinutes > 0
        ? leaseMinutes * 60 * 1000
        : DEFAULT_LEASE_MS
    });
    if (claimed.items.length > 0) {
      for (const slug of new Set(claimed.items.map((item) => item.feature_slug))) {
        syncNoiseProjection({ db, targetDir, featureSlug: slug });
      }
    }
    const result = { ...claimed, targetDir };
    if (!options.json && logger) {
      if (!claimed.ok) logger.log(`chain:claim — ${claimed.reason}`);
      else {
        logger.log(`chain:claim — ${claimed.items.length} item(s) claimed until ${claimed.lease_until}`);
        logger.log(`  token: ${claimed.claim_token}`);
        for (const item of claimed.items) logItem(logger, item);
      }
    }
    return result;
  });
}

async function runChainResolve({ args = [], options = {}, logger }) {
  const targetDir = targetDirFrom(args);
  return withRuntimeDb(targetDir, (db) => {
    reconcileNoiseState({ db, targetDir });
    const resolved = resolveWorkItem(db, {
      itemId: options.id || args[1],
      outcome: options.outcome,
      evidence: options.evidence,
      agent: options.agent || null,
      claimToken: options.token || null
    });
    if (resolved.ok && resolved.item) {
      syncNoiseProjection({ db, targetDir, featureSlug: resolved.item.feature_slug });
    }
    const result = { ...resolved, targetDir };
    if (!options.json && logger) {
      logger.log(resolved.ok
        ? `chain:resolve — ${resolved.item.work_item_id} ${resolved.item.outcome}`
        : `chain:resolve — ${resolved.reason}`);
    }
    return result;
  });
}

async function runChainRelease({ args = [], options = {}, logger }) {
  const targetDir = targetDirFrom(args);
  return withRuntimeDb(targetDir, (db) => {
    reconcileNoiseState({ db, targetDir });
    const released = releaseWorkItem(db, {
      itemId: options.id || args[1],
      claimToken: options.token || null,
      agent: options.agent || null
    });
    if (released.ok && released.item) {
      syncNoiseProjection({ db, targetDir, featureSlug: released.item.feature_slug });
    }
    const result = { ...released, targetDir };
    if (!options.json && logger) {
      logger.log(released.ok
        ? `chain:release — ${released.item.work_item_id} returned to the queue`
        : `chain:release — ${released.reason}`);
    }
    return result;
  });
}

async function runChainReconcile({ args = [], options = {}, logger }) {
  const targetDir = targetDirFrom(args);
  return withRuntimeDb(targetDir, (db) => {
    const reconciliation = reconcileNoiseState({ db, targetDir });
    const result = {
      ok: true,
      targetDir,
      summary: summarizeWorkItems(db),
      reconciliation
    };
    if (!options.json && logger) {
      logger.log(`chain:reconcile — ${result.summary.actionable} actionable item(s)`);
      logger.log(`  imported=${reconciliation.imported} manual_resolutions=${reconciliation.manually_resolved} expired_claims=${reconciliation.expired_claims}`);
    }
    return result;
  });
}

module.exports = {
  runChainClaim,
  runChainList,
  runChainReconcile,
  runChainRelease,
  runChainResolve
};
