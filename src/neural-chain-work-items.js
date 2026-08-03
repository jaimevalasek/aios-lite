'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { isUnsafePath } = require('./neural-chain-sanitize');
const {
  manifestPath,
  resolveChainWorkPolicy
} = require('./agent-execution/manifest');

const DEFAULT_REVIEW_THRESHOLD = 0.4;
const DEFAULT_LEASE_MS = 30 * 60 * 1000;
const MAX_LIST_LIMIT = 200;
const MAX_FINGERPRINT_BYTES = 2 * 1024 * 1024;

const VALID_STATUSES = new Set([
  'open',
  'claimed',
  'in_progress',
  'blocked',
  'resolved',
  'obsolete'
]);
const ACTIONABLE_STATUSES = Object.freeze(['open', 'claimed', 'in_progress', 'blocked']);
const VALID_OUTCOMES = new Set([
  'fixed',
  'verified_no_change',
  'false_positive',
  'obsolete',
  'skipped'
]);

function assertDb(db) {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('Neural Chain work items require an open better-sqlite3 db handle');
  }
}

function normalizeFeatureSlug(value) {
  const normalized = String(value || 'unspecified')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'unspecified';
}

function normalizeAgent(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
  return normalized === 'deyvin' || normalized === 'pair' ? 'dev' : normalized;
}

function normalizeRelPath(value) {
  return String(value || '').trim().replace(/\\/g, '/');
}

function parseWorkItemId(value) {
  const match = String(value || '').trim().match(/^(?:NC-)?(\d+)$/i);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function formatWorkItemId(value) {
  return `NC-${Number(value)}`;
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function parseEvidence(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toPublicItem(row) {
  if (!row) return null;
  const item = {
    ...row,
    work_item_id: formatWorkItemId(row.id),
    evidence: parseEvidence(row.evidence_json)
  };
  delete item.claim_token;
  return item;
}

function isProjectPath(targetDir, relativePath) {
  if (!targetDir || !relativePath || isUnsafePath(relativePath)) return false;
  const root = path.resolve(targetDir);
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function fingerprintSourceFile(targetDir, sourcePath, fallback = '') {
  const normalized = normalizeRelPath(sourcePath);
  if (!isProjectPath(targetDir, normalized)) {
    return `path:${crypto.createHash('sha256').update(normalized || fallback).digest('hex')}`;
  }

  const absolute = path.resolve(targetDir, normalized);
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) throw new Error('not_file');
    const hash = crypto.createHash('sha256');
    if (stat.size <= MAX_FINGERPRINT_BYTES) {
      hash.update(fs.readFileSync(absolute));
    } else {
      hash.update(`${normalized}\0${stat.size}\0${stat.mtimeMs}`);
    }
    return hash.digest('hex');
  } catch {
    return `path:${crypto.createHash('sha256').update(`${normalized}\0${fallback}`).digest('hex')}`;
  }
}

function buildDedupeKey({ featureSlug, sourcePath, sourceFingerprint, targetPath, edgeType }) {
  return crypto
    .createHash('sha256')
    .update([
      normalizeFeatureSlug(featureSlug),
      normalizeRelPath(sourcePath),
      String(sourceFingerprint || ''),
      normalizeRelPath(targetPath),
      String(edgeType || 'unknown')
    ].join('\0'))
    .digest('hex');
}

function feedbackForRelation(db, sourcePath, targetPath) {
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN outcome = 'fixed' THEN 1 ELSE 0 END) AS fixed_count,
      SUM(CASE WHEN outcome = 'verified_no_change' THEN 1 ELSE 0 END) AS no_change_count,
      SUM(CASE WHEN outcome = 'false_positive' THEN 1 ELSE 0 END) AS false_positive_count
    FROM chain_work_items
    WHERE source_path = ? AND target_path = ?
      AND status IN ('resolved', 'obsolete')
  `).get(sourcePath, targetPath) || {};

  return {
    fixed: Number(row.fixed_count || 0),
    noChange: Number(row.no_change_count || 0),
    falsePositive: Number(row.false_positive_count || 0)
  };
}

function effectiveConfidence(base, feedback) {
  const adjustment = Math.min(0.2, feedback.fixed * 0.05)
    - Math.min(0.2, feedback.noChange * 0.05)
    - Math.min(0.6, feedback.falsePositive * 0.3);
  return clampConfidence(base + adjustment);
}

function deriveKind(impact) {
  const declared = String(impact && impact.kind || '').trim().toLowerCase();
  if (['inspect', 'fix', 'test', 'security', 'documentation'].includes(declared)) return declared;
  if (impact && impact.evidence_kind === 'test_pair') return 'test';
  if (impact && impact.classification && impact.classification.startsWith('auto_fixable')) {
    return 'fix';
  }
  return 'inspect';
}

function readFeatureChainWorkPolicy(targetDir, featureSlug) {
  if (!targetDir || !featureSlug) return resolveChainWorkPolicy(null);
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath(targetDir, normalizeFeatureSlug(featureSlug)), 'utf8'));
    return resolveChainWorkPolicy(manifest);
  } catch {
    return resolveChainWorkPolicy(null);
  }
}

function resolveOwnerForKind(policy, kind) {
  if (!policy || policy.enabled === false) return null;
  return policy.owner_by_kind[kind] || policy.fallback_owner || 'dev';
}

function shouldMaterialize(impact, confidence, feedback, reviewThreshold) {
  if (feedback.falsePositive >= 2) return false;
  if (impact && impact.evidence_kind === 'test_pair') return true;
  if (impact && impact.marker) return true;
  return confidence >= reviewThreshold;
}

function buildReason(impact, sourcePath) {
  const edgeType = String(impact.edge_type || 'unknown');
  const hits = Number(impact.hit_count || 1);
  if (impact.evidence_kind === 'test_pair') {
    return `named test relationship with ${sourcePath}`;
  }
  if (impact.classification === 'auto_fixable') {
    return `${edgeType} relationship met the configured actionable threshold (${hits} observation(s))`;
  }
  if (impact.classification === 'auto_fixable_best_effort') {
    return `${edgeType} relationship selected by autonomous best-effort mode`;
  }
  return `${edgeType} relationship observed ${hits} time(s); inspect before changing code`;
}

function upsertCandidate(db, candidate) {
  const existing = db.prepare(
    'SELECT id, status FROM chain_work_items WHERE dedupe_key = ?'
  ).get(candidate.dedupe_key);

  db.prepare(`
    INSERT INTO chain_work_items (
      dedupe_key, feature_slug, origin_run_key, source_path, source_fingerprint,
      target_path, kind, owner_agent, status, marker, confidence, edge_type,
      hit_count, reason, evidence_json, occurrence_count, created_at, updated_at,
      last_seen_at
    ) VALUES (
      @dedupe_key, @feature_slug, @origin_run_key, @source_path, @source_fingerprint,
      @target_path, @kind, @owner_agent, 'open', @marker, @confidence, @edge_type,
      @hit_count, @reason, @evidence_json, 1, @created_at, @updated_at,
      @last_seen_at
    )
    ON CONFLICT(dedupe_key) DO UPDATE SET
      occurrence_count = chain_work_items.occurrence_count + 1,
      confidence = MAX(chain_work_items.confidence, excluded.confidence),
      hit_count = MAX(chain_work_items.hit_count, excluded.hit_count),
      marker = COALESCE(excluded.marker, chain_work_items.marker),
      kind = CASE
        WHEN excluded.kind = 'test' THEN 'test'
        WHEN excluded.kind = 'fix' AND chain_work_items.kind = 'inspect' THEN 'fix'
        ELSE chain_work_items.kind
      END,
      reason = excluded.reason,
      evidence_json = excluded.evidence_json,
      updated_at = excluded.updated_at,
      last_seen_at = excluded.last_seen_at
  `).run(candidate);

  const row = db.prepare(
    'SELECT * FROM chain_work_items WHERE dedupe_key = ?'
  ).get(candidate.dedupe_key);
  return { item: toPublicItem(row), inserted: !existing, terminal: Boolean(existing && ['resolved', 'obsolete'].includes(existing.status)) };
}

function upsertWorkItemsFromAudits({
  db,
  targetDir,
  featureSlug,
  originRunKey = null,
  audits = [],
  artifacts = [],
  autonomyMode = 'guarded',
  reviewThreshold = DEFAULT_REVIEW_THRESHOLD,
  now = new Date()
} = {}) {
  assertDb(db);
  const at = (now instanceof Date ? now : new Date(now)).toISOString();
  const slug = normalizeFeatureSlug(featureSlug);
  const chainWorkPolicy = readFeatureChainWorkPolicy(targetDir, slug);
  const changed = new Set((artifacts || []).map(normalizeRelPath));
  const fingerprintCache = new Map();
  const result = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    terminal: 0,
    items: [],
    policy: chainWorkPolicy
  };
  if (!chainWorkPolicy.enabled) return result;

  for (const audit of audits || []) {
    const sourcePath = normalizeRelPath(audit && audit.source_file);
    if (!sourcePath || isUnsafePath(sourcePath) || !Array.isArray(audit.impacts)) continue;
    if (!fingerprintCache.has(sourcePath)) {
      fingerprintCache.set(
        sourcePath,
        fingerprintSourceFile(targetDir, sourcePath, originRunKey || at)
      );
    }
    const sourceFingerprint = fingerprintCache.get(sourcePath);

    for (const impact of audit.impacts) {
      const targetPath = normalizeRelPath(impact && impact.target_path);
      if (!targetPath || targetPath === sourcePath || changed.has(targetPath) || isUnsafePath(targetPath)) {
        result.skipped += 1;
        continue;
      }

      const feedback = feedbackForRelation(db, sourcePath, targetPath);
      const confidence = effectiveConfidence(impact.confidence, feedback);
      if (!shouldMaterialize(impact, confidence, feedback, reviewThreshold)) {
        result.skipped += 1;
        continue;
      }

      const edgeType = String(impact.edge_type || 'unknown');
      const marker = impact.marker && /^[A-Z][A-Z0-9_-]*$/.test(impact.marker)
        ? impact.marker
        : null;
      const evidence = {
        source_path: sourcePath,
        target_path: targetPath,
        edge_type: edgeType,
        raw_confidence: clampConfidence(impact.confidence),
        effective_confidence: confidence,
        hit_count: Math.max(1, Number(impact.hit_count || 1)),
        last_seen_at: impact.last_seen_at || null,
        classification: impact.classification || 'noise',
        evidence_kind: impact.evidence_kind || 'co_edit_history',
        autonomy_mode: autonomyMode,
        feedback
      };
      const kind = deriveKind(impact);
      const candidate = {
        dedupe_key: buildDedupeKey({ featureSlug: slug, sourcePath, sourceFingerprint, targetPath, edgeType }),
        feature_slug: slug,
        origin_run_key: originRunKey || null,
        source_path: sourcePath,
        source_fingerprint: sourceFingerprint,
        target_path: targetPath,
        kind,
        owner_agent: resolveOwnerForKind(chainWorkPolicy, kind),
        marker,
        confidence,
        edge_type: edgeType,
        hit_count: evidence.hit_count,
        reason: buildReason(impact, sourcePath),
        evidence_json: JSON.stringify(evidence),
        created_at: at,
        updated_at: at,
        last_seen_at: at
      };
      const upserted = upsertCandidate(db, candidate);
      if (upserted.inserted) result.inserted += 1;
      else result.updated += 1;
      if (upserted.terminal) result.terminal += 1;
      result.items.push(upserted.item);
    }
  }

  return result;
}

function upsertLegacyWorkItem({ db, featureSlug, sourcePath, targetPath, impact = {}, origin, now = new Date() }) {
  assertDb(db);
  const at = (now instanceof Date ? now : new Date(now)).toISOString();
  const slug = normalizeFeatureSlug(featureSlug);
  const normalizedSource = normalizeRelPath(sourcePath || 'legacy-noise');
  const normalizedTarget = normalizeRelPath(targetPath);
  if (!normalizedTarget || isUnsafePath(normalizedTarget)) return null;
  const sourceFingerprint = `legacy:${String(origin || at)}`;
  const edgeType = String(impact.edge_type || 'legacy_noise');
  const marker = impact.marker && /^[A-Z][A-Z0-9_-]*$/.test(impact.marker) ? impact.marker : null;
  const confidence = clampConfidence(impact.confidence);
  const chainWorkPolicy = readFeatureChainWorkPolicy(null, slug);
  const kind = deriveKind({ ...impact, classification: marker ? 'auto_fixable' : 'noise' });
  const candidate = {
    dedupe_key: buildDedupeKey({ featureSlug: slug, sourcePath: normalizedSource, sourceFingerprint, targetPath: normalizedTarget, edgeType }),
    feature_slug: slug,
    origin_run_key: null,
    source_path: normalizedSource,
    source_fingerprint: sourceFingerprint,
    target_path: normalizedTarget,
    kind,
    owner_agent: resolveOwnerForKind(chainWorkPolicy, kind),
    marker,
    confidence,
    edge_type: edgeType,
    hit_count: Math.max(1, Number(impact.hit_count || 1)),
    reason: String(impact.reason || 'imported from legacy Neural Chain noise'),
    evidence_json: JSON.stringify({ origin: 'legacy_noise', source: origin || null }),
    created_at: at,
    updated_at: at,
    last_seen_at: at
  };
  return upsertCandidate(db, candidate).item;
}

function releaseExpiredClaims(db, now = new Date()) {
  assertDb(db);
  const at = (now instanceof Date ? now : new Date(now)).toISOString();
  const info = db.prepare(`
    UPDATE chain_work_items
    SET status = 'open', claimed_by = NULL, claim_token = NULL,
        lease_until = NULL, updated_at = ?
    WHERE status IN ('claimed', 'in_progress')
      AND lease_until IS NOT NULL AND lease_until <= ?
  `).run(at, at);
  return Number(info.changes || 0);
}

function listWorkItems(db, {
  featureSlug = null,
  agent = null,
  statuses = ACTIONABLE_STATUSES,
  limit = 50,
  includeUnspecified = false
} = {}) {
  assertDb(db);
  const selectedStatuses = (Array.isArray(statuses) ? statuses : [statuses])
    .filter((status) => VALID_STATUSES.has(status));
  if (selectedStatuses.length === 0) return [];

  const clauses = [`status IN (${selectedStatuses.map(() => '?').join(', ')})`];
  const params = [...selectedStatuses];
  if (featureSlug) {
    const slug = normalizeFeatureSlug(featureSlug);
    if (includeUnspecified && slug !== 'unspecified') {
      clauses.push('(feature_slug = ? OR feature_slug = ?)');
      params.push(slug, 'unspecified');
    } else {
      clauses.push('feature_slug = ?');
      params.push(slug);
    }
  }
  if (agent) {
    clauses.push('owner_agent = ?');
    params.push(normalizeAgent(agent));
  }
  const boundedLimit = Math.max(1, Math.min(MAX_LIST_LIMIT, Number(limit) || 50));
  params.push(boundedLimit);

  return db.prepare(`
    SELECT * FROM chain_work_items
    WHERE ${clauses.join(' AND ')}
    ORDER BY
      CASE status WHEN 'claimed' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'blocked' THEN 2 ELSE 3 END,
      confidence DESC, id ASC
    LIMIT ?
  `).all(...params).map(toPublicItem);
}

function getWorkItem(db, value) {
  assertDb(db);
  const id = parseWorkItemId(value);
  if (!id) return null;
  return toPublicItem(db.prepare('SELECT * FROM chain_work_items WHERE id = ?').get(id));
}

function claimWorkItems(db, {
  agent,
  featureSlug = null,
  itemId = null,
  limit = 1,
  leaseMs = DEFAULT_LEASE_MS,
  now = new Date()
} = {}) {
  assertDb(db);
  const owner = normalizeAgent(agent);
  if (!owner) return { ok: false, reason: 'agent_required', items: [] };
  const requestedId = itemId === null ? null : parseWorkItemId(itemId);
  if (itemId !== null && !requestedId) return { ok: false, reason: 'invalid_id', items: [] };
  const stamp = now instanceof Date ? now : new Date(now);
  const at = stamp.toISOString();
  const leaseUntil = new Date(stamp.getTime() + Math.max(60_000, Number(leaseMs) || DEFAULT_LEASE_MS)).toISOString();
  const token = crypto.randomUUID();
  const boundedLimit = Math.max(1, Math.min(20, Number(limit) || 1));

  const tx = db.transaction(() => {
    releaseExpiredClaims(db, stamp);
    const clauses = ["status = 'open'", 'owner_agent = ?'];
    const params = [owner];
    if (requestedId) {
      clauses.push('id = ?');
      params.push(requestedId);
    }
    if (featureSlug) {
      clauses.push('feature_slug = ?');
      params.push(normalizeFeatureSlug(featureSlug));
    }
    params.push(boundedLimit);
    const ids = db.prepare(`
      SELECT id FROM chain_work_items
      WHERE ${clauses.join(' AND ')}
      ORDER BY confidence DESC, id ASC
      LIMIT ?
    `).all(...params).map((row) => row.id);
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(', ');
    db.prepare(`
      UPDATE chain_work_items
      SET status = 'claimed', claimed_by = ?, claim_token = ?, lease_until = ?, updated_at = ?
      WHERE status = 'open' AND id IN (${placeholders})
    `).run(owner, token, leaseUntil, at, ...ids);
    return db.prepare(`SELECT * FROM chain_work_items WHERE claim_token = ? ORDER BY id`).all(token);
  });

  const rows = tx.immediate().map(toPublicItem);
  return {
    ok: rows.length > 0,
    reason: rows.length > 0 ? null : 'no_claimable_items',
    claim_token: rows.length > 0 ? token : null,
    lease_until: rows.length > 0 ? leaseUntil : null,
    items: rows
  };
}

function resolveWorkItem(db, {
  itemId,
  outcome,
  evidence,
  agent = null,
  claimToken = null,
  force = false,
  now = new Date()
} = {}) {
  assertDb(db);
  const id = parseWorkItemId(itemId);
  if (!id) return { ok: false, reason: 'invalid_id' };
  const normalizedOutcome = String(outcome || '').trim().toLowerCase().replace(/-/g, '_');
  if (!VALID_OUTCOMES.has(normalizedOutcome)) return { ok: false, reason: 'invalid_outcome' };
  const resolutionEvidence = String(evidence || '').trim();
  if (!resolutionEvidence) return { ok: false, reason: 'evidence_required' };
  const at = (now instanceof Date ? now : new Date(now)).toISOString();

  const tx = db.transaction(() => {
    const current = db.prepare('SELECT * FROM chain_work_items WHERE id = ?').get(id);
    if (!current) return { ok: false, reason: 'not_found' };
    if (['resolved', 'obsolete'].includes(current.status)) {
      return current.outcome === normalizedOutcome
        ? { ok: true, idempotent: true, item: toPublicItem(current) }
        : { ok: false, reason: 'already_resolved', item: toPublicItem(current) };
    }
    if (!force) {
      if (current.status === 'open') return { ok: false, reason: 'claim_required' };
      if (current.claim_token && current.claim_token !== claimToken) {
        return { ok: false, reason: 'claim_token_mismatch' };
      }
      if (agent && current.claimed_by && normalizeAgent(agent) !== current.claimed_by) {
        return { ok: false, reason: 'claim_owner_mismatch' };
      }
    }

    const status = normalizedOutcome === 'obsolete' ? 'obsolete' : 'resolved';
    db.prepare(`
      UPDATE chain_work_items
      SET status = ?, outcome = ?, resolution_evidence = ?, resolved_at = ?,
          updated_at = ?, claimed_by = NULL, claim_token = NULL, lease_until = NULL
      WHERE id = ?
    `).run(status, normalizedOutcome, resolutionEvidence.slice(0, 8000), at, at, id);

    if (normalizedOutcome === 'obsolete') {
      db.prepare(`
        UPDATE chain_edges SET end_at = ?
        WHERE source_path = ? AND target_path = ? AND edge_type = ? AND end_at IS NULL
      `).run(at, current.source_path, current.target_path, current.edge_type);
    } else if (normalizedOutcome === 'false_positive') {
      const repeated = db.prepare(`
        SELECT COUNT(*) AS count FROM chain_work_items
        WHERE source_path = ? AND target_path = ? AND edge_type = ?
          AND outcome = 'false_positive'
      `).get(current.source_path, current.target_path, current.edge_type);
      if (Number(repeated.count || 0) >= 2) {
        db.prepare(`
          UPDATE chain_edges SET end_at = ?
          WHERE source_path = ? AND target_path = ? AND edge_type = ? AND end_at IS NULL
        `).run(at, current.source_path, current.target_path, current.edge_type);
      }
    }

    return { ok: true, idempotent: false, item: getWorkItem(db, id) };
  });

  return tx.immediate();
}

function releaseWorkItem(db, { itemId, claimToken, agent = null, now = new Date() } = {}) {
  assertDb(db);
  const id = parseWorkItemId(itemId);
  if (!id) return { ok: false, reason: 'invalid_id' };
  const current = db.prepare('SELECT * FROM chain_work_items WHERE id = ?').get(id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (!['claimed', 'in_progress', 'blocked'].includes(current.status)) {
    return { ok: false, reason: 'not_claimed', item: toPublicItem(current) };
  }
  if (current.claim_token && current.claim_token !== claimToken) {
    return { ok: false, reason: 'claim_token_mismatch' };
  }
  if (agent && current.claimed_by && normalizeAgent(agent) !== current.claimed_by) {
    return { ok: false, reason: 'claim_owner_mismatch' };
  }
  const at = (now instanceof Date ? now : new Date(now)).toISOString();
  db.prepare(`
    UPDATE chain_work_items
    SET status = 'open', claimed_by = NULL, claim_token = NULL,
        lease_until = NULL, updated_at = ?
    WHERE id = ?
  `).run(at, id);
  return { ok: true, item: getWorkItem(db, id) };
}

function listActionableFeatureSlugs(db) {
  assertDb(db);
  return db.prepare(`
    SELECT DISTINCT feature_slug FROM chain_work_items
    WHERE status IN ('open', 'claimed', 'in_progress', 'blocked')
    ORDER BY feature_slug
  `).all().map((row) => row.feature_slug);
}

function summarizeWorkItems(db) {
  assertDb(db);
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS count FROM chain_work_items GROUP BY status
  `).all();
  const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  const actionable = ACTIONABLE_STATUSES.reduce((total, status) => total + Number(counts[status] || 0), 0);
  return { actionable, counts };
}

module.exports = {
  ACTIONABLE_STATUSES,
  DEFAULT_LEASE_MS,
  DEFAULT_REVIEW_THRESHOLD,
  buildDedupeKey,
  claimWorkItems,
  fingerprintSourceFile,
  formatWorkItemId,
  getWorkItem,
  listActionableFeatureSlugs,
  listWorkItems,
  normalizeAgent,
  normalizeFeatureSlug,
  parseWorkItemId,
  readFeatureChainWorkPolicy,
  releaseExpiredClaims,
  releaseWorkItem,
  resolveWorkItem,
  summarizeWorkItems,
  resolveOwnerForKind,
  upsertLegacyWorkItem,
  upsertWorkItemsFromAudits
};
