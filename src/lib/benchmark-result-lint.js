'use strict';

/**
 * Static benchmark-result linter — the deterministic half of the @benchmark
 * output contract (schema v1).
 *
 * The agent's prompt fully specifies the artifact (enums, row shapes, path
 * containment, forbidden provenance fields, feature→validation coverage), but
 * until now every check was self-policed by the LLM at step "parse the JSON
 * after writing it". Pure fs + JSON checks; issues are provable defects. What
 * stays with the agent: whether the delivery is honest, ambitious, and runs.
 */

const fs = require('node:fs');
const path = require('node:path');

const STATUSES = ['completed', 'partial', 'failed'];
const VALIDATION_STATUSES = ['passed', 'failed', 'not_run'];
const FORBIDDEN_FIELDS = ['duration', 'tokens', 'token_usage', 'provider', 'model', 'account', 'price', 'currency', 'score', 'comparison'];

function isRelativeContained(rel) {
  if (typeof rel !== 'string' || rel.trim() === '') return false;
  if (rel.includes('\\')) return false;
  if (path.isAbsolute(rel)) return false;
  const segments = rel.split('/');
  let depth = 0;
  for (const segment of segments) {
    if (segment === '..') { depth -= 1; if (depth < 0) return false; }
    else if (segment !== '.' && segment !== '') depth += 1;
  }
  return true;
}

function isVisualDelivery(entrypoints, root) {
  for (const rel of entrypoints || []) {
    if (/\.(?:html?|jsx|tsx|vue|svelte)$/i.test(String(rel))) return true;
    if (!/package\.json$/i.test(String(rel)) || !isRelativeContained(rel)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve(root, rel), 'utf8'));
      const names = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }).join(' ');
      if (/\b(?:react|vue|vite|next|nuxt|svelte|astro|angular|solid-js|remix)\b/i.test(names)) return true;
    } catch { /* the path validator reports missing/unreadable entrypoints elsewhere */ }
  }
  return false;
}

/**
 * @param {object} inputs
 * @param {string} inputs.file    absolute path to benchmark-result.json
 * @param {string} [inputs.runRoot]  defaults to the file's directory
 * @returns {{ issues: string[], warnings: string[], metrics: object }}
 */
function analyzeBenchmarkResult({ file, runRoot = null }) {
  const issues = [];
  const warnings = [];
  const root = runRoot || path.dirname(file);

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { issues: [`benchmark result not found: ${file}`], warnings: [], metrics: {} };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    return { issues: [`benchmark-result.json is not valid JSON: ${error.message}`], warnings: [], metrics: {} };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { issues: ['benchmark-result.json must be a JSON object'], warnings: [], metrics: {} };
  }

  if (data.schema_version !== 1) issues.push(`schema_version must be 1 (got ${JSON.stringify(data.schema_version)})`);
  const status = String(data.status || '');
  if (!STATUSES.includes(status)) issues.push(`status "${data.status}" is not one of ${STATUSES.join('|')}`);
  if (!String(data.summary || '').trim()) issues.push('summary is missing or empty');

  for (const field of FORBIDDEN_FIELDS) {
    if (field in data) issues.push(`forbidden top-level field "${field}" — provenance values belong to the orchestrator`);
  }

  for (const key of ['entrypoints', 'run_instructions', 'assumptions', 'research', 'features', 'validation', 'known_limitations']) {
    if (!Array.isArray(data[key])) issues.push(`${key} must be an array (empty when no honest item exists)`);
  }

  const research = Array.isArray(data.research) ? data.research : [];
  research.forEach((row, index) => {
    if (!row || typeof row !== 'object' || !row.title || !row.url || !row.applied_to) {
      issues.push(`research[${index}] must be an object with title, url and applied_to`);
    }
  });

  const validation = Array.isArray(data.validation) ? data.validation : [];
  validation.forEach((row, index) => {
    if (!row || typeof row !== 'object' || !row.command || !('evidence' in row)) {
      issues.push(`validation[${index}] must be an object with command, status and evidence`);
    } else if (!VALIDATION_STATUSES.includes(String(row.status || ''))) {
      issues.push(`validation[${index}].status "${row.status}" is not one of ${VALIDATION_STATUSES.join('|')}`);
    }
  });

  const features = Array.isArray(data.features) ? data.features : [];
  if (status === 'completed' && features.length > 0 && validation.length === 0) {
    issues.push('status "completed" with features but zero validation rows — a feature without a validation row moves to known_limitations first');
  } else if (features.length > validation.length && status === 'completed') {
    warnings.push(`${features.length} feature(s) vs ${validation.length} validation row(s) — verify every feature has its validation row or a known_limitations entry`);
  }

  const pathsToCheck = [];
  const entrypoints = Array.isArray(data.entrypoints) ? data.entrypoints : [];
  for (const entry of entrypoints) pathsToCheck.push(['entrypoints', entry]);
  const artifacts = data.artifacts && typeof data.artifacts === 'object' ? data.artifacts : null;
  if (!artifacts || typeof artifacts.report !== 'string') {
    issues.push('artifacts.report must point to the run report (report.md)');
  } else {
    pathsToCheck.push(['artifacts.report', artifacts.report]);
  }
  for (const shot of artifacts && Array.isArray(artifacts.screenshots) ? artifacts.screenshots : []) {
    pathsToCheck.push(['artifacts.screenshots', shot]);
  }

  const visualDelivery = isVisualDelivery(entrypoints, root);
  const screenshots = artifacts && Array.isArray(artifacts.screenshots) ? artifacts.screenshots : [];
  if (status === 'completed' && visualDelivery) {
    if (screenshots.length === 0) {
      issues.push('completed visual delivery requires at least one referenced screenshot — visual inspection cannot be an optional claim');
    }
    const visualValidation = validation.find((row) =>
      row && row.status === 'passed' && /verify:artifact[\s\S]*--kind=visual[\s\S]*--runtime/i.test(String(row.command || '')));
    if (!visualValidation) {
      issues.push('completed visual delivery requires a passed `verify:artifact --kind=visual ... --runtime` validation row');
    }
  }

  let missingPaths = 0;
  for (const [label, rel] of pathsToCheck) {
    if (!isRelativeContained(rel)) {
      issues.push(`${label} path "${rel}" must be relative, /-normalized, and contained by the run root`);
      continue;
    }
    if (!fs.existsSync(path.resolve(root, rel))) {
      missingPaths += 1;
      issues.push(`${label} path does not exist: ${rel}`);
    }
  }

  if (status === 'completed' && (!Array.isArray(data.entrypoints) || data.entrypoints.length === 0)) {
    issues.push('status "completed" requires at least one entrypoint');
  }

  return {
    issues,
    warnings,
    metrics: {
      status: STATUSES.includes(status) ? status : null,
      entrypoints: Array.isArray(data.entrypoints) ? data.entrypoints.length : 0,
      features: features.length,
      validation_rows: validation.length,
      research_rows: research.length,
      known_limitations: Array.isArray(data.known_limitations) ? data.known_limitations.length : 0,
      missing_paths: missingPaths,
      visual_delivery: visualDelivery,
      screenshots: screenshots.length
    }
  };
}

module.exports = { analyzeBenchmarkResult, isVisualDelivery };
