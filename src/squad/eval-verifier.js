'use strict';

const {
  collectDimensionSummary,
  computeEvalEngineHash,
  computeEvidenceHash,
  hashObject,
  hashSourceInputs,
  stableJson,
  validateEvalReport,
  verdictFromStatuses
} = require('./eval-contract');
const {
  caseDimensions,
  evaluateNumericDimension,
  evaluateSourceCriterion,
  hashWorkerSources,
  resolveEvaluationContexts,
  scorerOutputs,
  hasCompleteScorerEvidence
} = require('./eval-engine');
const { normalizeGenomeBindings } = require('../genomes/bindings');

function sectionStatus(items) {
  return verdictFromStatuses(items).toLowerCase().replace('_', '-');
}

function equalValue(left, right) {
  return stableJson(left) === stableJson(right);
}

function declaredDimensionNames(testCase = {}) {
  const declared = testCase.dimensions && typeof testCase.dimensions === 'object'
    ? testCase.dimensions
    : {};
  const thresholds = testCase.thresholds && typeof testCase.thresholds === 'object'
    ? testCase.thresholds
    : {};
  return [...new Set([
    ...Object.keys(declared),
    ...Object.keys(thresholds),
    ...(Array.isArray(testCase.criticalDimensions) ? testCase.criticalDimensions : [])
  ])];
}

function criterionIntegrityShape(criterion = {}) {
  return {
    id: criterion.id,
    executor: criterion.executor ?? null,
    kind: criterion.kind,
    statement: criterion.statement,
    source: criterion.source ?? null,
    critical: Boolean(criterion.critical),
    status: criterion.status,
    artifact: criterion.artifact,
    source_hash: criterion.source_hash,
    artifact_hash: criterion.artifact_hash,
    expected: criterion.expected,
    missing: criterion.missing,
    reason: criterion.reason
  };
}

function expectedRunDefinition(testCase, label) {
  const raw = label === 'baseline'
    ? testCase.baselineRun
    : label === 'scorer'
      ? testCase.scorer
      : testCase.candidateRun || (testCase.worker ? {
        worker: testCase.worker,
        input: testCase.input,
        timeoutMs: testCase.timeoutMs
      } : null);
  if (!raw) return null;
  return typeof raw === 'string' ? { worker: raw } : raw;
}

function flattenBindings(manifest = {}) {
  const normalized = normalizeGenomeBindings(manifest.genomeBindings || manifest.genomes);
  return [
    ...normalized.squad,
    ...Object.values(normalized.executors).flat()
  ];
}

async function verifyExecution(projectDir, slug, testCase, execution, errors) {
  const prefix = `Held-out case "${testCase.id}" ${execution.label || 'unknown'} execution`;
  const definition = expectedRunDefinition(testCase, execution.label);
  if (!definition || definition.worker !== execution.worker) {
    errors.push(`${prefix} is not bound to the declared worker`);
    return;
  }
  if (execution.input_hash !== hashObject(definition.input || {})) {
    errors.push(`${prefix} input hash does not match the declared input`);
  }
  if (execution.output_hash !== hashObject(execution.output)) {
    errors.push(`${prefix} output hash does not match the persisted output`);
  }
  const currentWorker = await hashWorkerSources(projectDir, slug, execution.worker);
  if (!currentWorker || execution.worker_hash !== currentWorker.hash) {
    errors.push(`${prefix} worker sources are missing or stale`);
  }
  if (!equalValue(execution.worker_sources, currentWorker?.entries || [])) {
    errors.push(`${prefix} worker source inventory is stale`);
  }
  if (execution.seed !== (testCase.seed ?? null)) {
    errors.push(`${prefix} seed does not match the held-out contract`);
  }
}

async function verifyEvalReportIntegrity(projectDir, slug, manifest, report) {
  const errors = [];
  const schema = await validateEvalReport(projectDir, report);
  if (!schema.valid) {
    errors.push(...schema.errors.map((error) => (
      `schema ${error.path} ${error.message}`.trim()
    )));
    return { valid: false, schema, errors };
  }

  if (report.squad !== slug || manifest.slug && manifest.slug !== slug) {
    errors.push('Eval report squad identity does not match the validated manifest');
  }
  if (report.inputs.manifest_hash !== hashObject(manifest)) {
    errors.push('Eval report manifest hash is stale');
  }

  const currentSources = await hashSourceInputs(projectDir, manifest);
  if (report.inputs.source_hash !== currentSources.hash) {
    errors.push('Eval report source hash is stale');
  }
  if (!equalValue(report.inputs.sources, currentSources.entries)) {
    errors.push('Eval report source inventory does not match current source files');
  }
  if (report.reproduction.engine_hash !== await computeEvalEngineHash()) {
    errors.push('Eval report was produced by a different evaluation engine');
  }
  if (report.reproduction.evidence_hash !== computeEvidenceHash(report)) {
    errors.push('Eval report evidence hash does not match its persisted evidence');
  }
  if (report.reproduction.command !== `aioson squad:eval . --squad=${slug} --json`) {
    errors.push('Eval report reproduction command is not canonical for this squad');
  }
  if (report.verdict === 'PASS' && report.reproduction.deterministic !== true) {
    errors.push('PASS requires deterministic, content-bound reproduction evidence');
  }

  const evaluation = manifest.evaluation || manifest.evalPolicy || {};
  const expectedCriteria = Array.isArray(evaluation.criteria) ? evaluation.criteria : [];
  const reportedCriteria = Array.isArray(report.source_rubric.criteria)
    ? report.source_rubric.criteria
    : [];
  const expectedCriterionIds = expectedCriteria.map((criterion, index) => (
    criterion.id || `criterion-${index + 1}`
  ));
  const reportedCriterionIds = reportedCriteria.map((criterion) => criterion.id);
  if (new Set(reportedCriterionIds).size !== reportedCriterionIds.length) {
    errors.push('Eval report contains duplicate source criterion IDs');
  }
  if (!equalValue([...reportedCriterionIds].sort(), [...expectedCriterionIds].sort())) {
    errors.push('Eval report criteria do not match the manifest evaluation contract');
  }
  for (let index = 0; index < expectedCriteria.length; index++) {
    const expectedId = expectedCriterionIds[index];
    const persisted = reportedCriteria.find((criterion) => criterion.id === expectedId);
    if (!persisted) continue;
    const recomputed = await evaluateSourceCriterion(
      projectDir,
      manifest,
      expectedCriteria[index],
      index
    );
    if (!equalValue(criterionIntegrityShape(persisted), criterionIntegrityShape(recomputed))) {
      errors.push(`Source criterion "${expectedId}" does not match current deterministic evidence`);
    }
  }

  const expectedCases = Array.isArray(evaluation.heldOutCases) ? evaluation.heldOutCases : [];
  const reportedCases = Array.isArray(report.held_out.cases) ? report.held_out.cases : [];
  const expectedCaseIds = expectedCases.map((testCase, index) => (
    testCase.id || `held-out-${index + 1}`
  ));
  const reportedCaseIds = reportedCases.map((testCase) => testCase.id);
  if (new Set(reportedCaseIds).size !== reportedCaseIds.length) {
    errors.push('Eval report contains duplicate held-out case IDs');
  }
  if (!equalValue([...reportedCaseIds].sort(), [...expectedCaseIds].sort())) {
    errors.push('Eval report held-out cases do not match the manifest evaluation contract');
  }

  for (let index = 0; index < expectedCases.length; index++) {
    const testCase = expectedCases[index];
    const id = expectedCaseIds[index];
    const persisted = reportedCases.find((entry) => entry.id === id);
    if (!persisted) continue;
    if (persisted.task !== (testCase.task || testCase.description || null)) {
      errors.push(`Held-out case "${id}" task does not match the manifest`);
    }
    if (persisted.deterministic !== (testCase.deterministic === true)) {
      errors.push(`Held-out case "${id}" deterministic declaration is stale`);
    }
    if (persisted.seed !== (testCase.seed ?? null)) {
      errors.push(`Held-out case "${id}" seed does not match the manifest`);
    }
    const dimensions = Array.isArray(persisted.dimensions) ? persisted.dimensions : [];
    const names = dimensions.map((dimension) => dimension.name);
    if (new Set(names).size !== names.length) {
      errors.push(`Held-out case "${id}" contains duplicate dimensions`);
    }
    const declared = testCase.dimensions && typeof testCase.dimensions === 'object'
      ? testCase.dimensions
      : {};
    for (const name of declaredDimensionNames(testCase)) {
      const dimension = dimensions.find((item) => item.name === name);
      if (!dimension) {
        errors.push(`Held-out case "${id}" is missing declared dimension "${name}"`);
        continue;
      }
      const expectedCritical = (testCase.criticalDimensions || []).includes(name)
        || declared[name]?.critical === true;
      const expectedThreshold = testCase.thresholds?.[name] ?? declared[name]?.threshold ?? 0.8;
      if (Boolean(dimension.critical) !== expectedCritical) {
        errors.push(`Held-out case "${id}" dimension "${name}" has stale criticality`);
      }
      if (Number(dimension.threshold) !== Number(expectedThreshold)) {
        errors.push(`Held-out case "${id}" dimension "${name}" has a stale threshold`);
      }
      if (expectedCritical && dimension.candidate === null && dimension.status !== 'fail') {
        errors.push(`Held-out case "${id}" missing critical dimension "${name}" must fail`);
      }
    }
    const expectedStatus = sectionStatus(dimensions);
    if (persisted.status !== expectedStatus) {
      errors.push(`Held-out case "${id}" status is inconsistent with its dimensions`);
    }
    const executions = Array.isArray(persisted.executions) ? persisted.executions : [];
    const baselineExecution = executions.find((execution) => execution.label === 'baseline');
    const candidateExecution = executions.find((execution) => execution.label === 'candidate');
    const scorerExecution = executions.find((execution) => execution.label === 'scorer');
    const expectedScorerIndependent = Boolean(
      scorerExecution?.ok
      && scorerExecution.worker !== baselineExecution?.worker
      && scorerExecution.worker !== candidateExecution?.worker
    );
    if (persisted.scorer_independent !== expectedScorerIndependent) {
      errors.push(`Held-out case "${id}" scorer independence is inconsistent`);
    }
    const compiledBindings = flattenBindings(manifest)
      .filter((binding) => binding.status === 'compiled');
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
    if (baselineExecution && baselineExecution.genome_context_hash !== baselineContexts.hash) {
      errors.push(`Held-out case "${id}" baseline genome context is stale`);
    }
    if (candidateExecution && candidateExecution.genome_context_hash !== candidateContexts.hash) {
      errors.push(`Held-out case "${id}" candidate genome context is stale`);
    }
    const expectedControlledAb = Boolean(
      genomeEnabled
      && baselineExecution?.ok
      && candidateExecution?.ok
      && baselineExecution.worker === candidateExecution.worker
      && baselineExecution.input_hash === candidateExecution.input_hash
      && baselineExecution.genome_enabled === false
      && candidateExecution.genome_enabled === true
      && candidateExecution.genome_effects_present === true
      && baselineExecution.genome_context_hash !== candidateExecution.genome_context_hash
    );
    if (persisted.ab_controlled !== expectedControlledAb) {
      errors.push(`Held-out case "${id}" genome A/B control is inconsistent`);
    }
    const scored = scorerExecution?.ok ? scorerOutputs(scorerExecution.output) : null;
    const numericDefinitions = caseDimensions(
      testCase,
      scored?.baseline || baselineExecution?.output,
      scored?.candidate || candidateExecution?.output
    );
    const expectedScorerEvidenceComplete = Boolean(
      expectedScorerIndependent
      && hasCompleteScorerEvidence(scored, Object.keys(numericDefinitions))
    );
    if (persisted.scorer_evidence_complete !== expectedScorerEvidenceComplete) {
      errors.push(`Held-out case "${id}" scorer evidence completeness is inconsistent`);
    }
    const expectedNumericDimensions = Object.entries(numericDefinitions)
      .map(([name, definition]) => evaluateNumericDimension(name, {
      ...definition,
      evidence: scorerExecution?.ok
        ? scored?.evidence?.[name]
        : definition.evidence
    }));
    for (const expectedDimension of expectedNumericDimensions) {
      const persistedDimension = dimensions.find((item) => item.name === expectedDimension.name);
      if (!persistedDimension) continue;
      const numericShape = (item) => ({
        name: item.name,
        status: item.status,
        critical: item.critical,
        baseline: item.baseline,
        candidate: item.candidate,
        delta: item.delta,
        threshold: item.threshold,
        evidence: item.evidence
      });
      if (!equalValue(numericShape(persistedDimension), numericShape(expectedDimension))) {
        errors.push(`Held-out case "${id}" dimension "${expectedDimension.name}" does not match scorer evidence`);
      }
    }
    if (expectedNumericDimensions.length > 0 && !expectedScorerIndependent) {
      const guard = dimensions.find((dimension) => dimension.name === 'independent-evaluation');
      if (!guard || guard.status !== 'unverified' || guard.critical !== true) {
        errors.push(`Held-out case "${id}" lacks the independent scorer guard`);
      }
    } else if (expectedNumericDimensions.length > 0 && !expectedScorerEvidenceComplete) {
      const guard = dimensions.find((dimension) => dimension.name === 'scorer-evidence');
      if (!guard || guard.status !== 'unverified' || guard.critical !== true) {
        errors.push(`Held-out case "${id}" lacks the scorer evidence guard`);
      }
    }
    const hasArtifactAssertions = Boolean(
      (testCase.artifact || testCase.output)
      && (
        (testCase.expectedContains || []).length > 0
        || (testCase.expectedNotContains || []).length > 0
      )
    );
    if (executions.length === 0 && !hasArtifactAssertions) {
      errors.push(`Held-out case "${id}" has no executable or artifact-bound evidence`);
    }
    for (const execution of executions) {
      if (!execution.ok) {
        errors.push(`Held-out case "${id}" contains a failed execution`);
        continue;
      }
      await verifyExecution(projectDir, slug, { ...testCase, id }, execution, errors);
    }
  }

  const sourceStatuses = reportedCriteria.map((criterion) => ({
    status: criterion.status,
    critical: criterion.critical
  }));
  const heldOutStatuses = reportedCases.flatMap((testCase) => testCase.dimensions || []);
  if (report.source_rubric.status !== sectionStatus(sourceStatuses)) {
    errors.push('Eval report source rubric status is inconsistent');
  }
  if (report.held_out.status !== sectionStatus(heldOutStatuses)) {
    errors.push('Eval report held-out status is inconsistent');
  }
  const expectedDeterministic = reportedCases.every((testCase) => (
    testCase.deterministic === true
    && (testCase.executions || []).every((execution) => Boolean(execution.worker_hash))
  ));
  if (report.reproduction.deterministic !== expectedDeterministic) {
    errors.push('Eval report reproducibility declaration is inconsistent');
  }

  const bindings = flattenBindings(manifest);
  if (bindings.length === 0) {
    if (report.genome_comparison.status !== 'not-applicable') {
      errors.push('Eval report genome comparison must be not-applicable without bindings');
    }
  } else {
    const expectedBindings = bindings.map((binding) => ({
      slug: binding.slug,
      status: binding.status,
      compilationId: binding.compilationId || null
    }));
    if (!equalValue(report.genome_comparison.bindings, expectedBindings)) {
      errors.push('Eval report genome bindings do not match the manifest');
    }
  }

  const combinedStatuses = [
    { status: report.precheck.status, critical: true },
    ...sourceStatuses,
    ...heldOutStatuses,
    {
      status: report.genome_comparison.status,
      critical: report.genome_comparison.status !== 'not-applicable'
    }
  ];
  const expectedVerdict = verdictFromStatuses(combinedStatuses);
  if (report.verdict !== expectedVerdict) {
    errors.push(`Eval report verdict is inconsistent; expected ${expectedVerdict}`);
  }
  const expectedCriticalFailures = combinedStatuses
    .filter((item) => item.critical && item.status === 'fail')
    .length;
  if (report.critical_failures !== expectedCriticalFailures) {
    errors.push('Eval report critical failure count is inconsistent');
  }
  const expectedDimensions = collectDimensionSummary(
    reportedCriteria,
    reportedCases,
    report.genome_comparison
  );
  if (!equalValue(report.dimensions, expectedDimensions)) {
    errors.push('Eval report dimension summary is inconsistent');
  }

  return {
    valid: errors.length === 0,
    schema,
    errors
  };
}

module.exports = {
  declaredDimensionNames,
  verifyEvalReportIntegrity
};
