'use strict';

/**
 * aioson execution:* — the orchestrated execution path (compiled lanes running
 * as parallel external processes with a host/model per role).
 *
 *   execution:offer   [--feature]  is the path available here? (unlock file +
 *                                  signatures; optionally the feature's plan
 *                                  tables and compiled state)
 *   execution:compile --feature    planner tables + roles → execution plan,
 *                                  unit prompts, manifest lanes
 *
 * Both read-only on refusal; `offer` never fails the process.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveTargetDir } = require('../lib/project-root');
const { validateFeatureSlug } = require('../verification/path-policy');
const { offerExecution } = require('../lib/execution-roles');
const { parseDevelopmentLanes, parseExecutionWaves } = require('../harness/plan-waves');
const {
  compileFeatureExecution,
  executionPlanRelative,
  readExecutionPlan,
  verifyExecutionPlan
} = require('../agent-execution/execution-plan');
const { runExecution, decideExecution, statusExecution } = require('../agent-execution/execution-run');

const SUBCOMMANDS = ['offer', 'compile', 'run', 'decide', 'status'];

/** One line per engine event — the live channel that does not depend on the host streaming. */
function formatProgress(event) {
  const where = [event.wave !== undefined && event.wave !== null ? `wave ${event.wave}` : null, event.unit || null, event.role || null].filter(Boolean).join(' · ');
  switch (event.type) {
    case 'run':
      return `run ${event.status}${event.run_id ? ` (${event.run_id})` : ''}${event.resumed ? ' [resumed]' : ''}${Array.isArray(event.integration_units) && event.integration_units.length ? ` — integration units for dev: ${event.integration_units.join(', ')}` : ''}`;
    case 'wave':
      return `${where}: ${event.status}${Array.isArray(event.units) ? ` [${event.units.join(', ')}]` : ''}${Array.isArray(event.decisions) ? ` — decisions: ${event.decisions.join(', ')}` : ''}`;
    case 'unit':
      return `${where}: ${event.status}${event.host ? ` ${event.host}/${event.model}` : ''}${event.verdict ? ` verdict ${event.verdict}` : ''}${event.reason ? ` (${event.reason})` : ''}${event.findings ? ` findings ${event.findings}` : ''}${event.corrections ? ` corrections ${event.corrections}` : ''}`;
    case 'stalled':
      return `${where}: stalled for ${Math.round((event.silent_ms || 0) / 1000)}s (no output, no file change under the lane write paths)`;
    case 'decision_required':
      return `${where}: DECISION REQUIRED (${event.reason}) → ${event.hint}`;
    case 'scope':
      return `wave ${event.wave}: ${event.check} ${event.path}${event.lane ? ` (lane ${event.lane})` : ''}`;
    default:
      return JSON.stringify(event);
  }
}

function logRun(logger, result) {
  const s = result.summary;
  if (result.status === 'ready') {
    logger.log(`Preflight ok for ${result.feature}: ${result.preflight.checks.map((c) => c.id).join(', ')}`);
    return;
  }
  if (result.status === 'refused') {
    logger.error(`Execution refused (${result.reason})${result.message ? `: ${result.message}` : ''}`);
    for (const issue of result.preflight?.issues || []) logger.error(`  ✗ ${issue}`);
    return;
  }
  if (result.status === 'completed') {
    logger.log(`Run ${result.run_id} completed: ${s.units.passed}/${s.units.lane} lane unit(s) passed, qa passed ${s.units.qa_passed}, qa failed ${s.units.qa_failed}, findings ${(result.findings || []).length}.`);
    if (result.integration?.units?.length) logger.log(`  integration units for dev: ${result.integration.units.join(', ')}`);
    logger.log(`Ledger: aioson execution:status . --feature=${result.feature}`);
    return;
  }
  logger.log(`Run ${result.run_id || ''} ${result.status}${result.reason ? ` (${result.reason})` : ''}.`);
  for (const decision of result.decisions_pending || []) {
    logger.log(`  ? ${decision.unit} [${decision.stage}] ${decision.reason} → ${decision.hint}`);
  }
  if (result.resume_command) logger.log(`Resume: ${result.resume_command}`);
}

async function describePlanTables(projectDir, feature, { env, now }) {
  const relative = `.aioson/context/implementation-plan-${feature}.md`;
  let content = null;
  try {
    content = await fs.readFile(path.join(projectDir, ...relative.split('/')), 'utf8');
  } catch {
    content = null;
  }
  const waves = content !== null ? parseExecutionWaves(content) : null;
  const compiled = await readExecutionPlan(projectDir, feature);
  const description = {
    path: relative,
    exists: content !== null,
    lanes_table: content !== null && parseDevelopmentLanes(content) !== null,
    execution_sequence: Array.isArray(waves) && waves.length > 0,
    compiled: { path: executionPlanRelative(feature), exists: compiled.exists, fresh: false, issues: [] }
  };
  if (compiled.exists) {
    const verified = await verifyExecutionPlan(projectDir, feature, { env, now });
    description.compiled.fresh = verified.ok;
    description.compiled.issues = verified.issues;
    description.compiled.summary = verified.metrics;
  }
  return description;
}

function logCompile(logger, result) {
  if (result.ok) {
    const s = result.summary || {};
    logger.log(`${result.dry_run ? 'Execution plan (dry run)' : 'Execution plan compiled'}: ${result.path}`);
    logger.log(`  lanes ${s.lanes} | units ${s.units} (lane ${s.lane_units}, integration ${s.integration_units}) | waves ${s.waves} | processes ${s.processes}`);
    if (result.manifest) {
      logger.log(`  manifest: ${result.manifest.path}${result.dry_run ? (result.manifest.would_create ? ' (would be created)' : ' (would be updated)') : (result.manifest.created ? ' (created)' : ' (updated)')}`);
    }
    for (const warning of result.warnings || []) logger.log(`  ⚠ [${warning.check}] ${warning.message}`);
    if (!result.dry_run) logger.log(`Verify: aioson verify:artifact . --kind=execution-plan --slug=${result.feature}`);
    return;
  }
  logger.error(`Execution plan refused (${(result.errors || []).length} finding(s)) — ${result.reason}:`);
  for (const error of result.errors || []) {
    logger.error(`  ✗ [${error.check}] ${error.message}`);
    if (error.hint) logger.error(`    → ${error.hint}`);
    for (const nested of error.errors || []) logger.error(`    · ${nested.path}: ${nested.message}`);
  }
  for (const warning of result.warnings || []) logger.error(`  ⚠ [${warning.check}] ${warning.message}`);
}

async function runExecutionCommand({ args, options = {}, logger, env = process.env, now = Date.now(), engineOptions = {} }) {
  const projectDir = resolveTargetDir(args);
  const sub = String(options.sub || '').trim();
  const featureInput = String(options.feature || options.slug || '').trim();
  let feature = null;
  if (featureInput) {
    const validation = validateFeatureSlug(featureInput);
    if (!validation.ok) {
      return { ok: false, reason: 'invalid_feature_slug', feature: featureInput, message: '--feature must be a lowercase kebab-case slug' };
    }
    feature = validation.feature_slug;
  }

  if (sub === 'offer') {
    const offer = await offerExecution(projectDir, { env, now });
    const result = { ok: true, schema_version: 1, ...offer, exitCode: 0 };
    if (feature) {
      result.feature = feature;
      result.plan = await describePlanTables(projectDir, feature, { env, now });
    }
    if (!options.json) {
      if (offer.available) {
        logger.log(`Orchestrated execution available: ${Object.keys(offer.roles.roles).length} role(s) signed on this machine (${offer.roles_path}).`);
      } else {
        const missing = (offer.missing || []).map((item) => `${item.role} ${item.host}/${item.model} (${item.state})`).join(', ');
        logger.log(`Orchestrated execution unavailable: ${offer.reason}${missing ? ` — ${missing}` : ''}`);
        for (const error of offer.errors || []) logger.log(`  · ${error.path}: ${error.message}`);
      }
      if (result.plan) {
        const c = result.plan.compiled;
        logger.log(`Plan ${result.plan.path}: ${result.plan.exists ? `lanes table ${result.plan.lanes_table ? 'present' : 'absent'}, execution sequence ${result.plan.execution_sequence ? 'present' : 'absent'}` : 'absent'}; compiled plan ${c.exists ? (c.fresh ? 'fresh' : `stale (${c.issues.length} issue(s))`) : 'absent'}.`);
      }
    }
    return result;
  }

  if (sub === 'compile') {
    if (!feature) return { ok: false, reason: 'feature_required', message: 'Use --feature=<slug>' };
    const result = await compileFeatureExecution(projectDir, feature, { env, now, dryRun: options['dry-run'] === true });
    if (!options.json) logCompile(logger, result);
    return result;
  }

  if (sub === 'run') {
    if (!feature) return { ok: false, reason: 'feature_required', message: 'Use --feature=<slug>' };
    // Live lines: stdout in human mode; stderr in --json mode so the JSON
    // document stays the only thing on stdout while a supervising terminal
    // still sees every event as it happens.
    const progress = options.json
      ? (event) => process.stderr.write(`[execution] ${formatProgress(event)}\n`)
      : (event) => logger.log(`[execution] ${formatProgress(event)}`);
    const result = await runExecution({
      projectDir,
      feature,
      resume: options.resume === true,
      fresh: options.fresh === true,
      preflightOnly: options.preflight === true,
      stopAfterWave: options.wave !== undefined && options.wave !== true ? Number(options.wave) : null,
      env,
      progress,
      ...engineOptions
    });
    if (!options.json) logRun(logger, result);
    return result;
  }

  if (sub === 'decide') {
    if (!feature) return { ok: false, reason: 'feature_required', message: 'Use --feature=<slug>' };
    if (!options.unit || options.unit === true) return { ok: false, reason: 'unit_required', message: 'Use --unit=<unit-id>' };
    if (!options.choice || options.choice === true) return { ok: false, reason: 'choice_required', message: 'Use --choice=<retry|fallback:<host>/<model>[/<effort>]|skip|skip-qa|abort>' };
    const result = await decideExecution({ projectDir, feature, unit: String(options.unit), choice: String(options.choice), env, ...(engineOptions.now ? { now: engineOptions.now } : {}) });
    if (!options.json) {
      if (result.ok) logger.log(`Decision applied to ${result.unit} [${result.stage}]: ${result.choice} → run ${result.status}${result.resume_command ? `. Resume: ${result.resume_command}` : ''}`);
      else logger.error(`Decision refused (${result.reason})${result.message ? `: ${result.message}` : ''}${result.hint ? ` → ${result.hint}` : ''}`);
    }
    return result;
  }

  if (sub === 'status') {
    if (!feature) return { ok: false, reason: 'feature_required', message: 'Use --feature=<slug>' };
    const result = await statusExecution({ projectDir, feature });
    if (!options.json) {
      if (!result.run) {
        logger.log(`${feature}: ${result.message}`);
      } else {
        const r = result.run;
        logger.log(`${feature}: run ${r.run_id} ${r.status}${r.reason ? ` (${r.reason})` : ''} — lane units passed ${r.units.passed}/${r.units.lane}, qa passed ${r.units.qa_passed}, findings ${result.findings.length}, decisions pending ${r.decisions_pending.length}`);
        for (const wave of result.waves) {
          logger.log(`  wave ${wave.wave} ${wave.status}: ${wave.units.map((u) => `${u.id}${u.owner === 'integration' ? ' (dev)' : ` ${u.status}${u.qa && u.qa.status !== 'not_applicable' ? `/qa ${u.qa.status}` : ''}`}`).join(', ')}`);
        }
        for (const decision of result.decisions_pending) logger.log(`  ? ${decision.unit} [${decision.stage}] ${decision.reason} → ${decision.hint}`);
        if (result.resume_command) logger.log(`Resume: ${result.resume_command}`);
      }
    }
    return result;
  }

  return { ok: false, reason: 'invalid_subcommand', valid: SUBCOMMANDS };
}

module.exports = { runExecution: runExecutionCommand, formatProgress, SUBCOMMANDS };
