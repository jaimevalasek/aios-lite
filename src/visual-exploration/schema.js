'use strict';

const { validateFeatureSlug } = require('../verification/path-policy');

const VERSION = 1;
const STRATEGIES = ['single', 'sequential', 'arena'];
const CONTEXT_POLICIES = ['isolated', 'cumulative'];
const DISPLAY_MODES = ['blind', 'labeled'];
const TARGET_KINDS = ['current-system-redesign', 'external-reference', 'mixed-reference'];
const SCAN_SCOPES = ['none', 'targeted', 'full'];
const EXPLORATION_STATUSES = ['open', 'selected', 'promotion-prepared', 'closed'];
const RUN_STATUSES = ['planned', 'running', 'completed', 'completed-with-warnings', 'failed', 'rejected', 'selected'];
const COVERAGE_STATES = ['covered', 'missing', 'unknown', 'not-requested'];
const COVERAGE_KEYS = ['shell', 'primary_surface', 'critical_detail', 'important_states', 'responsive'];

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeText(value, max = 500) {
  const text = String(value || '').trim();
  return text && text.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text);
}

function validateRun(run, index, errors) {
  const at = `runs[${index}]`;
  if (!isObject(run)) {
    errors.push(`${at} must be an object`);
    return;
  }
  if (!/^variant-[a-z]+$/.test(String(run.id || ''))) errors.push(`${at}.id must be variant-[a-z]+`);
  if (!safeText(run.label, 120)) errors.push(`${at}.label is required and must be <= 120 characters`);
  if (!safeText(run.host, 50)) errors.push(`${at}.host is required`);
  if (!safeText(run.model_requested, 200)) errors.push(`${at}.model_requested is required`);
  if (run.model_resolved !== null && run.model_resolved !== undefined && !safeText(run.model_resolved, 200)) {
    errors.push(`${at}.model_resolved must be null or a safe model id`);
  }
  if (!RUN_STATUSES.includes(run.status)) errors.push(`${at}.status must be one of ${RUN_STATUSES.join(', ')}`);
  if (run.parent_run !== null && run.parent_run !== undefined && !/^variant-[a-z]+$/.test(String(run.parent_run))) {
    errors.push(`${at}.parent_run must be null or a variant id`);
  }
  if (run.input_hash && !/^[a-f0-9]{64}$/.test(run.input_hash)) errors.push(`${at}.input_hash must be sha256`);
  if (run.artifact_hash && !/^[a-f0-9]{64}$/.test(run.artifact_hash)) errors.push(`${at}.artifact_hash must be sha256`);
}

function validateManifest(manifest, expectedSlug) {
  const errors = [];
  if (!isObject(manifest)) return { ok: false, errors: ['manifest must be an object'] };
  if (manifest.version !== VERSION) errors.push(`version must equal ${VERSION}`);
  const slug = validateFeatureSlug(manifest.slug);
  if (!slug.ok) errors.push('slug must be kebab-case');
  if (expectedSlug && manifest.slug !== expectedSlug) errors.push(`slug must equal ${expectedSlug}`);
  if (!safeText(manifest.title, 200)) errors.push('title is required and must be <= 200 characters');
  if (!EXPLORATION_STATUSES.includes(manifest.status)) errors.push(`status must be one of ${EXPLORATION_STATUSES.join(', ')}`);
  if (!STRATEGIES.includes(manifest.strategy)) errors.push(`strategy must be one of ${STRATEGIES.join(', ')}`);
  if (!CONTEXT_POLICIES.includes(manifest.context_policy)) errors.push(`context_policy must be one of ${CONTEXT_POLICIES.join(', ')}`);
  if (!DISPLAY_MODES.includes(manifest.display_mode)) errors.push(`display_mode must be one of ${DISPLAY_MODES.join(', ')}`);
  if (!TARGET_KINDS.includes(manifest.target_kind)) errors.push(`target_kind must be one of ${TARGET_KINDS.join(', ')}`);
  if (!SCAN_SCOPES.includes(manifest.scan_scope)) errors.push(`scan_scope must be one of ${SCAN_SCOPES.join(', ')}`);
  if (!Array.isArray(manifest.runs)) errors.push('runs must be an array');
  else {
    manifest.runs.forEach((run, index) => validateRun(run, index, errors));
    const ids = manifest.runs.map(run => run && run.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) errors.push('run ids must be unique');
    if (manifest.strategy === 'single' && manifest.runs.length > 1) errors.push('single strategy permits only one run');
  }
  if (manifest.selected_run !== null && manifest.selected_run !== undefined) {
    if (!manifest.runs?.some(run => run.id === manifest.selected_run)) errors.push('selected_run must reference an existing run');
  }
  if (!isObject(manifest.promotion)) errors.push('promotion must be an object');
  return { ok: errors.length === 0, errors };
}

function validateIntake(intake, expectedSlug) {
  const errors = [];
  if (!isObject(intake)) return { ok: false, errors: ['intake must be an object'] };
  if (intake.version !== VERSION) errors.push(`version must equal ${VERSION}`);
  const slug = validateFeatureSlug(intake.exploration);
  if (!slug.ok) errors.push('exploration must be a kebab-case slug');
  if (expectedSlug && intake.exploration !== expectedSlug) errors.push(`exploration must equal ${expectedSlug}`);
  if (!isObject(intake.understanding)) errors.push('understanding must be an object');
  for (const key of ['goal', 'preserve', 'change']) {
    if (!Array.isArray(intake.understanding?.[key])) errors.push(`understanding.${key} must be an array`);
  }
  if (!isObject(intake.coverage)) errors.push('coverage must be an object');
  for (const key of COVERAGE_KEYS) {
    if (!COVERAGE_STATES.includes(intake.coverage?.[key])) {
      errors.push(`coverage.${key} must be one of ${COVERAGE_STATES.join(', ')}`);
    }
  }
  for (const key of ['unknowns', 'assumptions', 'references']) {
    if (!Array.isArray(intake[key])) errors.push(`${key} must be an array`);
  }
  if (!['pending', 'confirmed', 'proceed-with-assumptions'].includes(intake.decision)) {
    errors.push('decision must be pending, confirmed, or proceed-with-assumptions');
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  CONTEXT_POLICIES,
  COVERAGE_KEYS,
  COVERAGE_STATES,
  DISPLAY_MODES,
  EXPLORATION_STATUSES,
  RUN_STATUSES,
  SCAN_SCOPES,
  STRATEGIES,
  TARGET_KINDS,
  VERSION,
  validateIntake,
  validateManifest
};
