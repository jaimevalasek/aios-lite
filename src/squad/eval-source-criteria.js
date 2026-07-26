'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  normalizeRelativePath,
  resolveContainedPath,
  sha256
} = require('./eval-contract');

const SOURCE_KINDS = new Set([
  'responsibility',
  'depth',
  'grounding',
  'handoff',
  'anti_pattern',
  'scope'
]);

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function scoreValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1, number));
}

function normalizeExpected(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function evaluateNumericDimension(name, definition = {}) {
  const spec = typeof definition === 'number' ? { candidate: definition } : (definition || {});
  const baseline = scoreValue(spec.baseline);
  const candidate = scoreValue(spec.candidate ?? spec.score);
  const threshold = scoreValue(spec.threshold) ?? 0.8;
  const critical = Boolean(spec.critical);
  if (candidate === null) {
    return {
      name,
      status: critical && spec.required === true ? 'fail' : 'unverified',
      critical,
      baseline,
      candidate: null,
      delta: null,
      threshold,
      evidence: spec.evidence || 'candidate score was not produced'
    };
  }

  const delta = baseline === null ? null : round(candidate - baseline);
  let status = candidate >= threshold ? 'pass' : (critical ? 'fail' : 'warn');
  if (baseline !== null && candidate < baseline) status = 'fail';
  return {
    name,
    status,
    critical,
    baseline,
    candidate,
    delta,
    threshold,
    evidence: spec.evidence || null
  };
}

async function readText(projectDir, relativePath) {
  const target = await resolveContainedPath(projectDir, relativePath);
  if (!target) return { ok: false, reason: `path escapes project: ${relativePath}` };
  try {
    return {
      ok: true,
      path: normalizeRelativePath(path.relative(projectDir, target)),
      content: await fs.readFile(target, 'utf8')
    };
  } catch {
    return { ok: false, reason: `file not found: ${relativePath}` };
  }
}

function findExecutor(manifest, slug) {
  return (manifest.executors || []).find((executor) => executor.slug === slug) || null;
}

function resolveManifestReference(manifest, reference) {
  if (!String(reference || '').startsWith('manifest.')) return null;
  const tokens = String(reference)
    .slice('manifest.'.length)
    .match(/[A-Za-z0-9_-]+|\[\d+\]/g);
  if (!tokens || tokens.length === 0) return null;
  let value = manifest;
  for (const token of tokens) {
    const key = token.startsWith('[') ? Number(token.slice(1, -1)) : token;
    if (value === null || value === undefined || !Object.prototype.hasOwnProperty.call(value, key)) {
      return null;
    }
    value = value[key];
  }
  return value;
}

async function resolveCriterionSource(projectDir, manifest, reference) {
  const manifestValue = resolveManifestReference(manifest, reference);
  if (manifestValue !== null) {
    const content = typeof manifestValue === 'string'
      ? manifestValue
      : JSON.stringify(manifestValue);
    return {
      ok: true,
      path: reference,
      content,
      hash: sha256(content)
    };
  }
  const file = await readText(projectDir, reference);
  return file.ok
    ? { ...file, hash: sha256(file.content) }
    : file;
}

async function evaluateSourceCriterion(projectDir, manifest, criterion, index) {
  const executor = findExecutor(manifest, criterion.executor);
  const artifactPath = criterion.artifact || executor?.file;
  const expected = normalizeExpected(criterion.expectedTerms || criterion.expected);
  const id = criterion.id || `criterion-${index + 1}`;
  const kind = SOURCE_KINDS.has(criterion.kind) ? criterion.kind : 'scope';
  const critical = criterion.critical === true || ['depth', 'grounding'].includes(kind);
  const base = {
    id,
    executor: criterion.executor || null,
    kind,
    statement: criterion.statement || criterion.claim || id,
    source: criterion.source || null,
    critical
  };

  if (!criterion.source) {
    return { ...base, status: 'unverified', reason: 'criterion has no source citation' };
  }
  const source = await resolveCriterionSource(projectDir, manifest, criterion.source);
  if (!source.ok) {
    return { ...base, status: 'unverified', reason: `criterion source is unresolved: ${source.reason}` };
  }
  if (!artifactPath) {
    return { ...base, status: 'unverified', reason: 'criterion has no executor artifact' };
  }
  const artifact = await readText(projectDir, artifactPath);
  if (!artifact.ok) {
    return { ...base, status: 'fail', artifact: normalizeRelativePath(artifactPath), reason: artifact.reason };
  }
  if (expected.length === 0) {
    return {
      ...base,
      status: 'unverified',
      artifact: artifact.path,
      reason: 'criterion has no deterministic expected terms'
    };
  }
  const haystack = artifact.content.toLocaleLowerCase();
  const missing = expected.filter((term) => !haystack.includes(term.toLocaleLowerCase()));
  return {
    ...base,
    status: missing.length === 0 ? 'pass' : 'fail',
    artifact: artifact.path,
    source_hash: source.hash,
    expected,
    missing,
    artifact_hash: sha256(artifact.content),
    reason: missing.length === 0 ? 'all expected terms are present' : `missing: ${missing.join(', ')}`
  };
}

module.exports = {
  SOURCE_KINDS,
  normalizeExpected,
  evaluateNumericDimension,
  readText,
  resolveManifestReference,
  resolveCriterionSource,
  evaluateSourceCriterion
};
