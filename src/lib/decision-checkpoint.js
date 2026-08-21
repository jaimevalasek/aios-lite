'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SCHEMA_VERSION = 'feature-decision-checkpoint/v1';
const ITEM_CLASSES = new Set(['required-inferable', 'blocking-decision', 'optional-contextual']);
const ITEM_STATUSES = new Set(['included', 'pending', 'deferred', 'rejected']);

function checkpointPath(targetDir, slug) {
  return path.join(targetDir, '.aioson', 'context', 'features', slug, 'decision-checkpoint.json');
}

function validateCheckpoint(value, slug) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['checkpoint must be an object'], pending: [] };
  }
  if (value.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (value.feature_slug !== slug) errors.push(`feature_slug must be ${slug}`);
  if (!['clear', 'pending'].includes(value.status)) errors.push('status must be clear or pending');
  if (!Array.isArray(value.items)) errors.push('items must be an array');

  const items = Array.isArray(value.items) ? value.items : [];
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`items[${index}] must be an object`);
      return;
    }
    if (!item.id) errors.push(`items[${index}].id is required`);
    if (!ITEM_CLASSES.has(item.classification)) errors.push(`items[${index}].classification is invalid`);
    if (!ITEM_STATUSES.has(item.status)) errors.push(`items[${index}].status is invalid`);
    if (!item.evidence) errors.push(`items[${index}].evidence is required`);
    if (!item.omission_consequence) errors.push(`items[${index}].omission_consequence is required`);
    if (!item.recommendation) errors.push(`items[${index}].recommendation is required`);
  });

  const pending = items.filter((item) => item
    && item.classification === 'blocking-decision'
    && item.status === 'pending');
  if (value.status === 'clear' && pending.length > 0) {
    errors.push('status clear conflicts with pending blocking decisions');
  }
  if (value.status === 'pending' && pending.length === 0) {
    errors.push('status pending requires at least one pending blocking decision');
  }
  return { ok: errors.length === 0, errors, pending };
}

async function readDecisionCheckpoint(targetDir, slug) {
  const filePath = checkpointPath(targetDir, slug);
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { exists: false, ok: false, path: filePath, errors: ['decision checkpoint is missing'], pending: [] };
    }
    return { exists: false, ok: false, path: filePath, errors: [error.message], pending: [] };
  }
  try {
    const checkpoint = JSON.parse(raw);
    return { exists: true, path: filePath, checkpoint, ...validateCheckpoint(checkpoint, slug) };
  } catch (error) {
    return { exists: true, ok: false, path: filePath, errors: [`invalid JSON: ${error.message}`], pending: [] };
  }
}

// ── writers ───────────────────────────────────────────────────────────────────
// The gate above had readers and no producer: `workflow:next` blocked on a
// pending blocking decision, the kernels were forbidden to hand-write the
// file, and nothing else wrote it — so "Autopilot pauses for a genuine
// decision" was prose. These are the producers. The CLI owns the file; an
// agent that hits a decision only a human can make records it with
// `decision:add`, the workflow refuses to advance until a human resolves it
// with `decision:resolve`, and `--force` stays the explicit override.

function recomputeStatus(checkpoint) {
  const pending = (checkpoint.items || []).some((item) => item.classification === 'blocking-decision' && item.status === 'pending');
  checkpoint.status = pending ? 'pending' : 'clear';
  return checkpoint;
}

function emptyCheckpoint(slug) {
  return { schema_version: SCHEMA_VERSION, feature_slug: slug, status: 'clear', items: [] };
}

async function writeCheckpoint(targetDir, slug, checkpoint) {
  const filePath = checkpointPath(targetDir, slug);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(recomputeStatus(checkpoint), null, 2)}\n`, 'utf8');
  return filePath;
}

async function loadOrCreate(targetDir, slug) {
  const current = await readDecisionCheckpoint(targetDir, slug);
  if (!current.exists) return emptyCheckpoint(slug);
  if (!current.checkpoint) throw new Error(`decision checkpoint is unreadable: ${current.errors.join('; ')}`);
  return current.checkpoint;
}

// The fields that make a decision the decision it is. A resolution answers
// THESE; change them and the recorded answer no longer belongs to the question.
const DECISION_SUBSTANCE = ['question', 'evidence', 'omission_consequence', 'recommendation', 'classification', 'options'];

function sameSubstance(existing, next) {
  return DECISION_SUBSTANCE.every((field) => JSON.stringify(existing[field] ?? null) === JSON.stringify(next[field] ?? null));
}

/**
 * Record (or update) one decision item. Required fields mirror the schema —
 * a decision without evidence, consequence and recommendation is a question,
 * not a checkpoint. Returns the written item.
 *
 * Ids are chosen by the agent that raises the decision, and a fresh agent
 * context restarts them at DEC-01. So re-adding an id that is already RESOLVED
 * is routine — and inheriting that resolution would attribute a human's answer
 * to a question they never saw, and leave the gate open on a decision nobody
 * made. A resolved id whose substance changed is therefore reopened: status
 * back to pending, the old resolution kept as history under
 * `superseded_resolutions`, never as this decision's answer. Re-adding the
 * same substance stays idempotent.
 */
async function addDecision(targetDir, slug, {
  id, question, classification = 'blocking-decision', evidence, omissionConsequence, recommendation,
  options = [], owner = 'human', raisedBy = null
}) {
  if (!slug) throw new Error('--feature is required');
  if (!id) throw new Error('--id is required');
  if (!ITEM_CLASSES.has(classification)) throw new Error(`classification must be one of ${[...ITEM_CLASSES].join(', ')}`);
  for (const [field, value] of [['question', question], ['evidence', evidence], ['consequence', omissionConsequence], ['recommendation', recommendation]]) {
    if (!String(value || '').trim()) throw new Error(`--${field} is required — a decision without it is a question, not a checkpoint`);
  }
  const checkpoint = await loadOrCreate(targetDir, slug);
  const now = new Date().toISOString();
  const existing = checkpoint.items.find((item) => item.id === id);
  const substance = {
    classification,
    question: String(question).trim(),
    evidence: String(evidence).trim(),
    omission_consequence: String(omissionConsequence).trim(),
    recommendation: String(recommendation).trim(),
    options: Array.isArray(options) ? options.filter(Boolean) : []
  };
  const wasResolved = Boolean(existing) && existing.status !== 'pending';
  const reopened = wasResolved && !sameSubstance(existing, substance);
  const item = {
    ...(existing || {}),
    id,
    ...substance,
    status: wasResolved && !reopened ? existing.status : 'pending',
    owner,
    raised_by: raisedBy || (existing && existing.raised_by) || null,
    raised_at: (existing && existing.raised_at) || now,
    updated_at: now
  };
  if (reopened) {
    item.superseded_resolutions = [
      ...(existing.superseded_resolutions || []),
      { ...(existing.resolution || {}), answered: existing.question || null, superseded_at: now }
    ].filter((entry) => entry && entry.choice);
    delete item.resolution;
  }
  if (existing) {
    Object.assign(existing, item);
    // Object.assign never removes a key: the stale answer has to go explicitly.
    if (reopened) delete existing.resolution;
  } else {
    checkpoint.items.push(item);
  }
  const filePath = await writeCheckpoint(targetDir, slug, checkpoint);
  return { item, status: checkpoint.status, path: filePath, reopened };
}

/**
 * Resolve one decision. `status` is the resolution: included (the choice is
 * taken into scope), deferred, or rejected. A resolution records who decided
 * and what — the trail is the point.
 */
async function resolveDecision(targetDir, slug, { id, choice, status = 'included', by = null }) {
  if (!slug) throw new Error('--feature is required');
  if (!id) throw new Error('--id is required');
  if (!['included', 'deferred', 'rejected'].includes(status)) throw new Error('status must be included, deferred, or rejected');
  if (!String(choice || '').trim()) throw new Error('--choice is required — record what was decided, not only that it was');
  const current = await readDecisionCheckpoint(targetDir, slug);
  if (!current.exists || !current.checkpoint) throw new Error(`no decision checkpoint for ${slug}`);
  const checkpoint = current.checkpoint;
  const item = checkpoint.items.find((entry) => entry.id === id);
  if (!item) throw new Error(`decision ${id} not found in ${slug}`);
  item.status = status;
  item.resolution = { choice: String(choice).trim(), by: by || 'human', at: new Date().toISOString() };
  const filePath = await writeCheckpoint(targetDir, slug, checkpoint);
  return { item, status: checkpoint.status, path: filePath };
}

module.exports = {
  SCHEMA_VERSION,
  ITEM_CLASSES,
  ITEM_STATUSES,
  checkpointPath,
  validateCheckpoint,
  readDecisionCheckpoint,
  addDecision,
  resolveDecision,
  writeCheckpoint
};
