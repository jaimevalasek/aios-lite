'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const Ajv = require('ajv');
const { createHash } = require('node:crypto');
const { isContainedPath, resolveRealContainedPath } = require('./path-containment');

const REPORT_SCHEMA_VERSION = '1.0.0';
const VERDICTS = Object.freeze([
  'PASS',
  'WARN',
  'FAIL',
  'UNVERIFIED',
  'NOT_APPLICABLE'
]);
const DIMENSION_STATUSES = Object.freeze([
  'pass',
  'warn',
  'fail',
  'unverified',
  'not-applicable'
]);
const SHIPPED_REPORT_SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'template',
  '.aioson',
  'schemas',
  'squad-eval-report.schema.json'
);
const EVAL_ENGINE_FILES = [
  path.join(__dirname, 'eval-contract.js'),
  path.join(__dirname, 'eval-engine.js'),
  path.join(__dirname, 'eval-verifier.js'),
  path.join(__dirname, 'path-containment.js'),
  path.join(__dirname, '..', 'worker-runner.js'),
  path.join(__dirname, '..', 'genomes', 'bindings.js'),
  path.join(__dirname, '..', 'squads', 'genome-compiler.js'),
  SHIPPED_REPORT_SCHEMA_PATH
];

function sha256(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashObject(value) {
  return sha256(stableJson(value));
}

function evalEvidencePayload(report = {}) {
  return {
    schemaVersion: report.schemaVersion,
    squad: report.squad,
    generated_at: report.generated_at,
    verdict: report.verdict,
    inputs: report.inputs,
    precheck: report.precheck,
    source_rubric: report.source_rubric,
    held_out: report.held_out,
    genome_comparison: report.genome_comparison,
    dimensions: report.dimensions,
    critical_failures: report.critical_failures,
    reproduction: report.reproduction
      ? {
          command: report.reproduction.command,
          deterministic: report.reproduction.deterministic,
          contract: report.reproduction.contract,
          run_id: report.reproduction.run_id,
          engine_hash: report.reproduction.engine_hash
        }
      : null
  };
}

function computeEvidenceHash(report) {
  return hashObject(evalEvidencePayload(report));
}

function normalizeRelativePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

async function resolveContainedPath(projectDir, relativePath) {
  const target = path.resolve(projectDir, normalizeRelativePath(relativePath));
  if (!isContainedPath(projectDir, target)) return null;
  if (!await pathExists(target)) return target;
  return resolveRealContainedPath(projectDir, target);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function hashSourceInputs(projectDir, manifest = {}) {
  const entries = [];
  const paths = [
    ...(manifest.sourceDocs || []),
    ...(manifest.executors || []).map((executor) => executor.file).filter(Boolean)
  ];
  for (const relativePath of paths) {
    const normalized = normalizeRelativePath(relativePath);
    const target = await resolveContainedPath(projectDir, normalized);
    if (!target || !await pathExists(target)) {
      entries.push({ path: normalized, hash: null });
      continue;
    }
    try {
      const stat = await fs.stat(target);
      const content = stat.isFile() ? await fs.readFile(target, 'utf8') : null;
      entries.push({
        path: normalizeRelativePath(path.relative(projectDir, target)),
        hash: content === null ? null : sha256(content)
      });
    } catch {
      entries.push({ path: normalized, hash: null });
    }
  }
  return {
    entries,
    hash: hashObject(entries)
  };
}

async function computeEvalEngineHash() {
  const entries = [];
  for (const filePath of EVAL_ENGINE_FILES) {
    entries.push({
      path: normalizeRelativePath(path.relative(path.join(__dirname, '..', '..'), filePath)),
      hash: sha256(await fs.readFile(filePath, 'utf8'))
    });
  }
  return hashObject(entries);
}

async function resolveReportSchemaPath(projectDir) {
  const workspacePath = path.resolve(
    projectDir,
    '.aioson',
    'schemas',
    'squad-eval-report.schema.json'
  );
  if (isContainedPath(projectDir, workspacePath) && await pathExists(workspacePath)) {
    const realSchema = await resolveRealContainedPath(projectDir, workspacePath);
    if (realSchema) return realSchema;
  }
  return SHIPPED_REPORT_SCHEMA_PATH;
}

function normalizeSchemaErrors(errors = []) {
  return errors.map((error) => ({
    code: `schema.${error.keyword}`,
    path: error.instancePath || '/',
    message: error.message || 'is invalid'
  }));
}

async function validateEvalReport(projectDir, report) {
  try {
    const schemaPath = await resolveReportSchemaPath(projectDir);
    const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
    const validate = ajv.compile(schema);
    const valid = validate(report);
    return {
      valid: Boolean(valid),
      schemaPath,
      errors: normalizeSchemaErrors(validate.errors || [])
    };
  } catch (error) {
    return {
      valid: false,
      schemaPath: null,
      errors: [{
        code: 'schema.unavailable',
        path: '/',
        message: error.message
      }]
    };
  }
}

function verdictFromStatuses(items = []) {
  const relevant = items.filter((item) => item && item.status !== 'not-applicable');
  if (relevant.some((item) => item.status === 'fail' && item.critical)) return 'FAIL';
  if (relevant.some((item) => item.status === 'fail')) return 'FAIL';
  if (relevant.some((item) => item.status === 'unverified')) return 'UNVERIFIED';
  if (relevant.some((item) => item.status === 'warn')) return 'WARN';
  if (relevant.length > 0 && relevant.every((item) => item.status === 'pass')) return 'PASS';
  return 'NOT_APPLICABLE';
}

function collectDimensionSummary(sourceCriteria = [], heldOutCases = [], genomeComparison = {}) {
  const output = {};
  const add = (name, item) => {
    if (!output[name]) {
      output[name] = {
        pass: 0,
        warn: 0,
        fail: 0,
        unverified: 0,
        'not-applicable': 0,
        critical_failures: 0
      };
    }
    output[name][item.status] = (output[name][item.status] || 0) + 1;
    if (item.critical && item.status === 'fail') output[name].critical_failures += 1;
  };
  for (const criterion of sourceCriteria) add(criterion.kind, criterion);
  for (const testCase of heldOutCases) {
    for (const dimension of testCase.dimensions || []) add(dimension.name, dimension);
  }
  for (const dimension of genomeComparison.dimensions || []) add(`genome:${dimension.name}`, dimension);
  return output;
}

module.exports = {
  REPORT_SCHEMA_VERSION,
  VERDICTS,
  DIMENSION_STATUSES,
  SHIPPED_REPORT_SCHEMA_PATH,
  sha256,
  stableJson,
  hashObject,
  evalEvidencePayload,
  computeEvidenceHash,
  normalizeRelativePath,
  resolveContainedPath,
  hashSourceInputs,
  computeEvalEngineHash,
  resolveReportSchemaPath,
  validateEvalReport,
  verdictFromStatuses,
  collectDimensionSummary
};
