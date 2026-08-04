'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { getInteractionLanguage, validateProjectContextFile } = require('../context');
const { detectHost } = require('../model-delegation');
const { resolveExistingInsideRoot, toPosixPath } = require('../verification/path-policy');
const { reviewHash, writeComparisonReview } = require('../visual-exploration/review-html');
const { runModelArena } = require('../visual-exploration/runner');
const {
  addReferences,
  addRun,
  atomicJson,
  configureExploration,
  createExploration,
  promoteExploration,
  readManifest,
  recordRun,
  scanExploration,
  selectRun,
  updateIntake,
  validateRunArtifacts
} = require('../visual-exploration/store');
const { validateIntake } = require('../visual-exploration/schema');

function projectDir(args) {
  return path.resolve(process.cwd(), args[0] || '.');
}

function csv(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function output(logger, options, result, success) {
  if (!options.json) {
    if (result.ok) logger.log(success || 'Visual exploration command completed.');
    else logger.error(`Visual exploration blocked: ${result.reason || 'unknown_error'}`);
  }
  return result;
}

async function readJsonInside(root, relativePath) {
  const resolved = await resolveExistingInsideRoot(root, relativePath);
  if (!resolved.ok) return resolved;
  try {
    return { ok: true, value: JSON.parse(await fs.readFile(resolved.real_path, 'utf8')), path: resolved.real_path };
  } catch (error) {
    return { ok: false, reason: 'invalid_json', error: error.message };
  }
}

async function runExplorationInit({ args, options = {}, logger }) {
  const root = projectDir(args);
  const context = await validateProjectContextFile(root);
  const language = options.locale || options.language || options.lang
    || (context.parsed && context.data ? getInteractionLanguage(context.data, 'en') : 'en');
  const result = await createExploration(root, {
    slug: options.slug,
    title: options.title,
    goal: options.goal,
    strategy: options.strategy,
    contextPolicy: options['context-policy'],
    displayMode: options['display-mode'],
    targetKind: options.target,
    scanScope: options.scan,
    language
  }).catch(error => ({ ok: false, reason: 'invalid_options', error: error.message }));
  return output(logger, options, result, result.ok ? `Created visual exploration at ${result.root}` : null);
}

async function runExplorationReferences({ args, options = {}, logger }) {
  const root = projectDir(args);
  const result = await addReferences(root, options.slug, csv(options.files || options.references));
  return output(logger, options, result, result.ok ? `Imported ${result.added.length} reference file(s).` : null);
}

async function runExplorationConfigure({ args, options = {}, logger }) {
  const result = await configureExploration(projectDir(args), options.slug, {
    strategy: options.strategy,
    contextPolicy: options['context-policy'],
    displayMode: options['display-mode'],
    targetKind: options.target,
    scanScope: options.scan
  }).catch(error => ({ ok: false, reason: 'invalid_options', error: error.message }));
  return output(logger, options, result, result.ok ? 'Exploration configuration updated.' : null);
}

async function runExplorationIntake({ args, options = {}, logger }) {
  const root = projectDir(args);
  if (!options.file) return output(logger, options, { ok: false, reason: 'intake_file_required' });
  const input = await readJsonInside(root, options.file);
  if (!input.ok) return output(logger, options, input);
  const result = await updateIntake(root, options.slug, input.value);
  return output(logger, options, result, result.ok ? 'Exploration intake updated.' : null);
}

async function runExplorationScan({ args, options = {}, logger }) {
  const result = await scanExploration(projectDir(args), options.slug, {
    scope: options.scope || options.scan,
    paths: csv(options.paths)
  }).catch(error => ({ ok: false, reason: 'scan_failed', error: error.message }));
  return output(logger, options, result, result.ok ? `Recorded ${result.files?.length || 0} front-end path(s).` : null);
}

async function runExplorationAddRun({ args, options = {}, logger }) {
  const result = await addRun(projectDir(args), options.slug, {
    host: options.host || options.provider,
    model: options.model,
    label: options.label,
    parentRun: options.parent,
    contextPolicy: options['context-policy']
  }).catch(error => ({ ok: false, reason: 'invalid_options', error: error.message }));
  return output(logger, options, result, result.ok ? `Created ${result.run.id}.` : null);
}

async function runExplorationRecord({ args, options = {}, logger }) {
  const result = await recordRun(projectDir(args), options.slug, options.run, {
    status: options.status,
    modelResolved: options['model-resolved'],
    resolutionStrategy: options['resolution-strategy'],
    warnings: csv(options.warnings)
  });
  return output(logger, options, result, result.ok ? `Recorded ${options.run} as ${result.run.status}.` : null);
}

async function runExplorationValidate({ args, options = {}, logger }) {
  const root = projectDir(args);
  const loaded = await readManifest(root, options.slug);
  if (!loaded.ok) return output(logger, options, loaded);
  let intake;
  try {
    intake = JSON.parse(await fs.readFile(path.join(loaded.root, 'intake.json'), 'utf8'));
  } catch (error) {
    return output(logger, options, { ok: false, reason: 'intake_invalid_json', error: error.message });
  }
  const intakeValidation = validateIntake(intake, loaded.manifest.slug);
  const runs = [];
  for (const run of loaded.manifest.runs) {
    runs.push({ status: run.status, ...(await validateRunArtifacts(root, options.slug, run.id)) });
  }
  const artifactRequired = new Set(['completed', 'completed-with-warnings', 'selected']);
  const result = {
    ok: intakeValidation.ok
      && intake.decision !== 'pending'
      && runs.every(run => !artifactRequired.has(run.status) || run.ok),
    slug: loaded.manifest.slug,
    manifest: loaded.manifest,
    intake: { valid: intakeValidation.ok, decision: intake.decision, errors: intakeValidation.errors },
    runs
  };
  if (intake.decision === 'pending') result.reason = 'intake_confirmation_required';
  else if (!intakeValidation.ok) result.reason = 'intake_invalid';
  else if (!result.ok) result.reason = 'run_artifacts_invalid';
  return output(logger, options, result, result.ok ? 'Exploration validation passed.' : null);
}

async function runExplorationStatus({ args, options = {}, logger }) {
  const result = await readManifest(projectDir(args), options.slug);
  if (!options.json && result.ok) {
    logger.log(`${result.manifest.slug}: ${result.manifest.status} (${result.manifest.strategy})`);
    logger.log(`Report index: ${result.report_path}`);
    for (const run of result.manifest.runs) {
      logger.log(`- ${run.label}: ${run.status} — ${run.host}/${run.model_resolved || run.model_requested} — ${path.join(result.root, 'runs', run.id, 'report.md')}`);
    }
  } else if (!options.json && !result.ok) logger.error(`Visual exploration blocked: ${result.reason}`);
  return result;
}

async function runExplorationReview({ args, options = {}, logger }) {
  const result = await writeComparisonReview(projectDir(args), options.slug);
  return output(logger, options, result, result.ok ? `Comparison review: ${result.review_path}` : null);
}

async function runExplorationSelect({ args, options = {}, logger }) {
  const root = projectDir(args);
  let runId = options.run;
  let importedFeedback = null;
  let canonicalFeedbackPath = null;
  if (options.feedback) {
    const feedback = await readJsonInside(root, options.feedback);
    if (!feedback.ok) return output(logger, options, feedback);
    const loaded = await readManifest(root, options.slug);
    if (!loaded.ok) return output(logger, options, loaded);
    if (feedback.value?.version !== 1
      || feedback.value.exploration !== loaded.manifest.slug
      || feedback.value.source_hash !== reviewHash(loaded.manifest)
      || !Array.isArray(feedback.value.comments)
      || typeof feedback.value.notes !== 'string') {
      return output(logger, options, { ok: false, reason: 'feedback_invalid_or_stale' });
    }
    runId = feedback.value.selected_run;
    importedFeedback = feedback.value;
    canonicalFeedbackPath = path.join(loaded.root, 'exploration-feedback.json');
  }
  if (!runId) return output(logger, options, { ok: false, reason: 'run_required' });
  const result = await selectRun(root, options.slug, runId);
  if (result.ok && importedFeedback) {
    await atomicJson(canonicalFeedbackPath, importedFeedback);
  }
  return output(logger, options, result, result.ok ? `Selected ${runId}.` : null);
}

async function runExplorationPromote({ args, options = {}, logger }) {
  const result = await promoteExploration(projectDir(args), options.slug, options['briefing-slug'], { force: options.force === true })
    .catch(error => ({ ok: false, reason: 'invalid_options', error: error.message }));
  return output(logger, options, result, result.ok ? `Prepared Briefing source pack at ${result.source_pack}.` : null);
}

async function runExplorationRun({ args, options = {}, logger, catalogLoader, adapterRegistry }) {
  const root = projectDir(args);
  const result = await runModelArena({
    projectDir: root,
    slug: options.slug,
    models: options.models,
    currentHost: detectHost(options.host),
    parallel: options.parallel,
    parentRun: options.parent,
    logger,
    catalogLoader,
    adapterRegistry,
    timeout: options.timeout,
    explicitModelRequest: options['explicit-model-request'] === true
  });
  if (!options.json) {
    for (const item of result.results || []) {
      const line = `${item.run || '?'}: ${item.ok ? `completed — ${item.report_path}` : `failed (${item.reason})`}`;
      item.ok ? logger.log(line) : logger.error(line);
    }
    if (result.summary_report_path) logger.log(`Report index: ${result.summary_report_path}`);
  }
  return result;
}

module.exports = {
  runExplorationAddRun,
  runExplorationConfigure,
  runExplorationInit,
  runExplorationIntake,
  runExplorationPromote,
  runExplorationRecord,
  runExplorationReferences,
  runExplorationReview,
  runExplorationRun,
  runExplorationScan,
  runExplorationSelect,
  runExplorationStatus,
  runExplorationValidate
};
