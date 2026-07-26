'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  REPORT_SCHEMA_VERSION,
  collectDimensionSummary,
  computeEvalEngineHash,
  computeEvidenceHash,
  hashObject,
  hashSourceInputs,
  normalizeRelativePath,
  resolveContainedPath,
  sha256,
  verdictFromStatuses
} = require('./eval-contract');
const { normalizeGenomeBindings } = require('../genomes/bindings');
const { runWorker } = require('../worker-runner');
const {
  MANAGED_START,
  MANAGED_END,
  removeManagedBlock
} = require('../squads/genome-compiler');
const {
  SOURCE_KINDS,
  normalizeExpected,
  evaluateNumericDimension,
  readText,
  resolveManifestReference,
  resolveCriterionSource,
  evaluateSourceCriterion
} = require('./eval-source-criteria');

function caseDimensions(testCase = {}, baselineOutput = null, candidateOutput = null) {
  const baseline = baselineOutput?.dimensions || baselineOutput?.scores || {};
  const candidate = candidateOutput?.dimensions || candidateOutput?.scores || {};
  const declared = testCase.dimensions && typeof testCase.dimensions === 'object'
    ? testCase.dimensions
    : {};
  const thresholds = testCase.thresholds && typeof testCase.thresholds === 'object'
    ? testCase.thresholds
    : {};
  const criticalDimensions = Array.isArray(testCase.criticalDimensions)
    ? testCase.criticalDimensions
    : [];
  const names = [...new Set([
    ...Object.keys(declared),
    ...Object.keys(thresholds),
    ...criticalDimensions,
    ...Object.keys(baseline),
    ...Object.keys(candidate)
  ])];
  return Object.fromEntries(names.map((name) => [
    name,
    {
      baseline: baseline[name],
      candidate: candidate[name],
      critical: criticalDimensions.includes(name)
        || declared[name]?.critical === true,
      threshold: thresholds[name] ?? declared[name]?.threshold,
      required: Object.prototype.hasOwnProperty.call(declared, name)
        || Object.prototype.hasOwnProperty.call(thresholds, name)
        || criticalDimensions.includes(name),
      evidence: declared[name]?.evidence || 'score produced by held-out worker execution'
    }
  ]));
}

async function hashWorkerSources(projectDir, squadSlug, workerSlug) {
  const base = normalizeRelativePath(path.join(
    '.aioson',
    'squads',
    String(squadSlug || ''),
    'workers',
    String(workerSlug || '')
  ));
  const entries = [];
  for (const name of ['worker.json', 'run.js', 'run.py']) {
    const relativePath = normalizeRelativePath(path.join(base, name));
    const target = await resolveContainedPath(projectDir, relativePath);
    if (!target) return null;
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) continue;
      entries.push({
        path: normalizeRelativePath(path.relative(projectDir, target)),
        hash: sha256(await fs.readFile(target, 'utf8'))
      });
    } catch {
      // A worker may use JavaScript or Python; absent alternatives are expected.
    }
  }
  const hasConfig = entries.some((entry) => entry.path.endsWith('/worker.json'));
  const hasRunner = entries.some((entry) => /\/run\.(?:js|py)$/.test(entry.path));
  return hasConfig && hasRunner ? { entries, hash: hashObject(entries) } : null;
}

function scorerOutputs(output = {}) {
  const dimensions = output?.dimensions || output?.scores || {};
  const baseline = {};
  const candidate = {};
  const evidence = {};
  for (const [name, value] of Object.entries(dimensions)) {
    if (value && typeof value === 'object') {
      baseline[name] = value.baseline;
      candidate[name] = value.candidate ?? value.score;
      evidence[name] = value.evidence;
    } else {
      candidate[name] = value;
    }
  }
  return {
    baseline: { dimensions: baseline },
    candidate: { dimensions: candidate },
    evidence
  };
}

function hasCompleteScorerEvidence(scored, dimensionNames) {
  if (!scored || !Array.isArray(dimensionNames) || dimensionNames.length === 0) return false;
  return dimensionNames.every((name) => (
    typeof scored.evidence?.[name] === 'string'
    && scored.evidence[name].trim().length > 0
  ));
}

async function resolveEvaluationContexts(projectDir, manifest, testCase, genomeEnabled) {
  const selected = testCase.executor
    ? (manifest.executors || []).filter((executor) => executor.slug === testCase.executor)
    : (manifest.executors || []).filter((executor) => executor.persistent !== false);
  const entries = [];
  let hasCompiledEffects = false;
  for (const executor of selected) {
    if (!executor.file) continue;
    const artifact = await readText(projectDir, executor.file);
    if (!artifact.ok) continue;
    const compiled = artifact.content.includes(MANAGED_START)
      && artifact.content.includes(MANAGED_END);
    hasCompiledEffects ||= compiled;
    const content = genomeEnabled ? artifact.content : removeManagedBlock(artifact.content);
    entries.push({
      executor: executor.slug,
      path: artifact.path,
      hash: sha256(content),
      content
    });
  }
  return {
    entries,
    hash: hashObject(entries.map(({ executor, path: artifactPath, hash }) => ({
      executor,
      path: artifactPath,
      hash
    }))),
    has_compiled_effects: genomeEnabled && hasCompiledEffects
  };
}

async function executeHeldOutRun(projectDir, squadSlug, definition, label, control = {}) {
  if (!definition) return null;
  const config = typeof definition === 'string' ? { worker: definition } : definition;
  if (!config.worker) {
    return { label, ok: false, error: 'worker is required', output: null };
  }
  const workerSources = await hashWorkerSources(projectDir, squadSlug, config.worker);
  if (!workerSources) {
    return {
      label,
      worker: config.worker,
      ok: false,
      error: 'worker sources are missing or escape the project',
      output: null
    };
  }
  const payload = {
    ...(config.input || {}),
    ...(control.input || {}),
    _aioson_eval: {
      variant: label,
      task: control.task || null,
      seed: control.seed ?? null,
      genome_enabled: Boolean(control.genomeEnabled),
      genome_bindings: control.genomeBindings || [],
      executor_contexts: control.executorContexts?.entries || [],
      genome_context_hash: control.executorContexts?.hash || null,
      genome_effects_present: Boolean(control.executorContexts?.has_compiled_effects)
    }
  };
  const result = await runWorker(
    projectDir,
    squadSlug,
    config.worker,
    payload,
    {
      triggerType: 'eval',
      noRetry: config.retry !== true,
      timeoutMs: Number(config.timeoutMs || 30_000)
    }
  );
  return {
    label,
    worker: config.worker,
    ok: Boolean(result.ok),
    error: result.ok ? null : result.error,
    attempt: result.attempt || result.attempts || 0,
    duration_ms: result.durationMs || 0,
    controlled_variant: label,
    genome_enabled: Boolean(control.genomeEnabled),
    seed: control.seed ?? null,
    input_hash: hashObject(config.input || {}),
    payload_hash: hashObject(payload),
    genome_context_hash: control.executorContexts?.hash || null,
    genome_effects_present: Boolean(control.executorContexts?.has_compiled_effects),
    worker_hash: workerSources.hash,
    worker_sources: workerSources.entries,
    output: result.ok ? result.output : null,
    output_hash: result.ok ? hashObject(result.output) : null
  };
}

async function evaluateHeldOutCase(projectDir, squadSlug, manifest, testCase, index) {
  const compiledBindings = flattenBindings(manifest)
    .filter((binding) => binding.status === 'compiled')
    .map((binding) => ({
      slug: binding.slug,
      compilationId: binding.compilationId || null,
      sourceHash: binding.sourceHash || null
    }));
  const genomeEnabled = compiledBindings.length > 0;
  const baselineContexts = await resolveEvaluationContexts(
    projectDir,
    manifest,
    testCase,
    false
  );
  const candidateContexts = await resolveEvaluationContexts(
    projectDir,
    manifest,
    testCase,
    genomeEnabled
  );
  const baselineRun = await executeHeldOutRun(
    projectDir,
    squadSlug,
    testCase.baselineRun,
    'baseline',
    {
      task: testCase.task,
      seed: testCase.seed,
      genomeEnabled: false,
      genomeBindings: [],
      executorContexts: baselineContexts
    }
  );
  const candidateRun = await executeHeldOutRun(
    projectDir,
    squadSlug,
    testCase.candidateRun || (testCase.worker ? {
      worker: testCase.worker,
      input: testCase.input,
      timeoutMs: testCase.timeoutMs
    } : null),
    'candidate',
    {
      task: testCase.task,
      seed: testCase.seed,
      genomeEnabled,
      genomeBindings: compiledBindings,
      executorContexts: candidateContexts
    }
  );
  const scorerRun = await executeHeldOutRun(
    projectDir,
    squadSlug,
    testCase.scorer,
    'scorer',
    {
      task: testCase.task,
      seed: testCase.seed,
      genomeEnabled: false,
      genomeBindings: [],
      input: {
        case_id: testCase.id || `held-out-${index + 1}`,
        declared_dimensions: testCase.dimensions || {},
        baseline_output: baselineRun?.output || null,
        candidate_output: candidateRun?.output || null
      }
    }
  );
  const scorerIndependent = Boolean(
    scorerRun?.ok
    && scorerRun.worker !== baselineRun?.worker
    && scorerRun.worker !== candidateRun?.worker
  );
  const scored = scorerRun?.ok ? scorerOutputs(scorerRun.output) : null;
  const numericDefinitions = caseDimensions(
    testCase,
    scored?.baseline || baselineRun?.output,
    scored?.candidate || candidateRun?.output
  );
  const numericDimensionNames = Object.keys(numericDefinitions);
  const scorerEvidenceComplete = Boolean(
    scorerIndependent
    && hasCompleteScorerEvidence(scored, numericDimensionNames)
  );
  const dimensions = Object.entries(numericDefinitions)
    .map(([name, definition]) => evaluateNumericDimension(name, {
      ...definition,
      evidence: scorerRun?.ok
        ? scored?.evidence?.[name]
        : definition.evidence
    }));
  for (const execution of [baselineRun, candidateRun, scorerRun].filter(Boolean)) {
    if (!execution.ok) {
      dimensions.push({
        name: `${execution.label}-execution`,
        status: 'fail',
        critical: true,
        baseline: null,
        candidate: null,
        delta: null,
        threshold: 1,
        evidence: execution.error
      });
    }
  }
  const hasNumericEvidence = numericDimensionNames.length > 0;
  if (hasNumericEvidence && !scorerIndependent) {
    dimensions.push({
      name: 'independent-evaluation',
      status: 'unverified',
      critical: true,
      baseline: null,
      candidate: null,
      delta: null,
      threshold: 1,
      evidence: 'numeric held-out scores require a separate scorer worker'
    });
  } else if (hasNumericEvidence && !scorerEvidenceComplete) {
    dimensions.push({
      name: 'scorer-evidence',
      status: 'unverified',
      critical: true,
      baseline: null,
      candidate: null,
      delta: null,
      threshold: 1,
      evidence: 'the independent scorer must explain every numeric dimension'
    });
  }
  const controlledAb = Boolean(
    genomeEnabled
    && baselineRun?.ok
    && candidateRun?.ok
    && baselineRun.worker === candidateRun.worker
    && baselineRun.input_hash === candidateRun.input_hash
    && baselineRun.genome_enabled === false
    && candidateRun.genome_enabled === true
    && candidateRun.genome_effects_present === true
    && baselineRun.genome_context_hash !== candidateRun.genome_context_hash
  );
  if (genomeEnabled && baselineRun && candidateRun && !controlledAb) {
    dimensions.push({
      name: 'genome-ab-control',
      status: 'fail',
      critical: true,
      baseline: null,
      candidate: null,
      delta: null,
      threshold: 1,
      evidence: 'Genome A/B must execute the same worker and task with only the controlled genome binding changed'
    });
  }
  const artifactPath = testCase.artifact || testCase.output;
  let artifact = null;
  if (artifactPath) {
    artifact = await readText(projectDir, artifactPath);
    const expected = normalizeExpected(testCase.expectedContains);
    const forbidden = normalizeExpected(testCase.expectedNotContains);
    if (!artifact.ok) {
      dimensions.push({
        name: 'task-output',
        status: 'fail',
        critical: true,
        baseline: null,
        candidate: null,
        delta: null,
        threshold: 1,
        evidence: artifact.reason
      });
    } else if (expected.length > 0 || forbidden.length > 0) {
      const text = artifact.content.toLocaleLowerCase();
      const missing = expected.filter((term) => !text.includes(term.toLocaleLowerCase()));
      const presentForbidden = forbidden.filter((term) => text.includes(term.toLocaleLowerCase()));
      dimensions.push({
        name: 'task-output',
        status: missing.length === 0 && presentForbidden.length === 0 ? 'pass' : 'fail',
        critical: true,
        baseline: null,
        candidate: missing.length === 0 && presentForbidden.length === 0 ? 1 : 0,
        delta: null,
        threshold: 1,
        evidence: missing.length === 0 && presentForbidden.length === 0
          ? 'artifact expectations satisfied'
          : `missing=${missing.join(',')}; forbidden=${presentForbidden.join(',')}`
      });
    }
  }
  if (dimensions.length === 0) {
    dimensions.push({
      name: 'task-output',
      status: 'unverified',
      critical: true,
      baseline: null,
      candidate: null,
      delta: null,
      threshold: 1,
      evidence: 'held-out case has no executable dimensions or artifact assertions'
    });
  }
  if (testCase.deterministic !== true) {
    dimensions.push({
      name: 'reproducibility',
      status: 'unverified',
      critical: true,
      baseline: null,
      candidate: null,
      delta: null,
      threshold: 1,
      evidence: 'held-out case must explicitly declare deterministic: true'
    });
  }
  return {
    id: testCase.id || `held-out-${index + 1}`,
    task: testCase.task || testCase.description || null,
    executor: testCase.executor || null,
    artifact: artifact?.ok ? artifact.path : normalizeRelativePath(artifactPath),
    artifact_hash: artifact?.ok ? sha256(artifact.content) : null,
    deterministic: testCase.deterministic === true,
    seed: testCase.seed ?? null,
    scorer_independent: scorerIndependent,
    scorer_evidence_complete: scorerEvidenceComplete,
    ab_controlled: controlledAb,
    executions: [baselineRun, candidateRun, scorerRun].filter(Boolean),
    status: verdictFromStatuses(dimensions).toLowerCase().replace('_', '-'),
    dimensions
  };
}

function flattenBindings(manifest) {
  const normalized = normalizeGenomeBindings(manifest.genomeBindings || manifest.genomes);
  return [
    ...normalized.squad,
    ...Object.values(normalized.executors).flat()
  ];
}

function summarizeGenomeComparison(manifest, heldOutCases) {
  const bindings = flattenBindings(manifest);
  const compiled = bindings.filter((binding) => binding.status === 'compiled');
  if (bindings.length === 0) {
    return {
      status: 'not-applicable',
      bindings: [],
      dimensions: [],
      reason: 'no genome binding declared'
    };
  }
  if (compiled.length !== bindings.length) {
    return {
      status: 'fail',
      bindings: bindings.map((binding) => ({
        slug: binding.slug,
        status: binding.status,
        compilationId: binding.compilationId || null
      })),
      dimensions: [],
      reason: 'one or more genome bindings are not compiled'
    };
  }
  const compared = heldOutCases.flatMap((testCase) => (
    (testCase.ab_controlled ? testCase.dimensions : [])
      .filter((dimension) => dimension.baseline !== null && dimension.candidate !== null)
      .map((dimension) => ({ case: testCase.id, ...dimension }))
  ));
  if (compared.length === 0) {
    return {
      status: 'unverified',
      bindings: compiled.map((binding) => ({
        slug: binding.slug,
        status: binding.status,
        compilationId: binding.compilationId || null
      })),
      dimensions: [],
      reason: 'compiled genome has no held-out A/B comparison'
    };
  }
  return {
    status: verdictFromStatuses(compared).toLowerCase().replace('_', '-'),
    bindings: compiled.map((binding) => ({
      slug: binding.slug,
      status: binding.status,
      compilationId: binding.compilationId || null
    })),
    dimensions: compared,
    reason: compared.some((dimension) => dimension.status === 'fail')
      ? 'at least one dimension regressed or failed its threshold'
      : 'all compared dimensions improved or held their threshold'
  };
}

async function evaluateSquad({
  projectDir,
  slug,
  manifest,
  precheck,
  now = new Date().toISOString()
}) {
  const evaluation = manifest.evaluation || manifest.evalPolicy || {};
  const criteria = Array.isArray(evaluation.criteria) ? evaluation.criteria : [];
  const heldOut = Array.isArray(evaluation.heldOutCases) ? evaluation.heldOutCases : [];
  const sourceCriteria = [];
  for (let index = 0; index < criteria.length; index++) {
    sourceCriteria.push(await evaluateSourceCriterion(projectDir, manifest, criteria[index], index));
  }
  if (sourceCriteria.length === 0) {
    sourceCriteria.push({
      id: 'source-rubric',
      executor: null,
      kind: 'grounding',
      statement: 'Source-grounded rubric is declared',
      source: null,
      critical: true,
      status: 'unverified',
      reason: 'manifest.evaluation.criteria is empty'
    });
  }
  const heldOutCases = [];
  for (let index = 0; index < heldOut.length; index++) {
    heldOutCases.push(await evaluateHeldOutCase(projectDir, slug, manifest, heldOut[index], index));
  }
  if (heldOutCases.length === 0) {
    heldOutCases.push({
      id: 'held-out-required',
      task: null,
      executor: null,
      artifact: null,
      artifact_hash: null,
      status: 'unverified',
      dimensions: [{
        name: 'task-output',
        status: 'unverified',
        critical: true,
        baseline: null,
        candidate: null,
        delta: null,
        threshold: 1,
        evidence: 'manifest.evaluation.heldOutCases is empty'
      }]
    });
  }
  const genomeComparison = summarizeGenomeComparison(manifest, heldOutCases);
  const sourceStatuses = sourceCriteria.map((criterion) => ({
    status: criterion.status,
    critical: criterion.critical
  }));
  const heldOutStatuses = heldOutCases.flatMap((testCase) => testCase.dimensions);
  const combinedStatuses = [
    {
      status: precheck?.valid ? 'pass' : 'fail',
      critical: true
    },
    ...sourceStatuses,
    ...heldOutStatuses,
    {
      status: genomeComparison.status,
      critical: genomeComparison.status !== 'not-applicable'
    }
  ];
  const sourceInputs = await hashSourceInputs(projectDir, manifest);
  const verdict = verdictFromStatuses(combinedStatuses);
  const criticalFailures = combinedStatuses.filter((item) => item.critical && item.status === 'fail').length;

  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    squad: slug,
    generated_at: now,
    verdict,
    inputs: {
      manifest_hash: hashObject(manifest),
      source_hash: sourceInputs.hash,
      sources: sourceInputs.entries
    },
    precheck: {
      status: precheck?.valid ? 'pass' : 'fail',
      strict: true,
      errors: precheck?.errors || [],
      warnings: precheck?.warnings || []
    },
    source_rubric: {
      status: verdictFromStatuses(sourceStatuses).toLowerCase().replace('_', '-'),
      criteria: sourceCriteria
    },
    held_out: {
      status: verdictFromStatuses(heldOutStatuses).toLowerCase().replace('_', '-'),
      cases: heldOutCases
    },
    genome_comparison: genomeComparison,
    dimensions: collectDimensionSummary(sourceCriteria, heldOutCases, genomeComparison),
    critical_failures: criticalFailures
  };
  const deterministic = heldOutCases.every((testCase) => (
    testCase.deterministic === true
    && (testCase.executions || []).every((execution) => Boolean(execution.worker_hash))
  ));
  report.reproduction = {
    command: `aioson squad:eval . --squad=${slug} --json`,
    deterministic,
    contract: REPORT_SCHEMA_VERSION,
    run_id: randomUUID(),
    engine_hash: await computeEvalEngineHash()
  };
  report.reproduction.evidence_hash = computeEvidenceHash(report);
  return report;
}

module.exports = {
  SOURCE_KINDS,
  evaluateNumericDimension,
  resolveManifestReference,
  resolveCriterionSource,
  evaluateSourceCriterion,
  caseDimensions,
  hashWorkerSources,
  scorerOutputs,
  hasCompleteScorerEvidence,
  resolveEvaluationContexts,
  executeHeldOutRun,
  evaluateHeldOutCase,
  summarizeGenomeComparison,
  evaluateSquad
};
