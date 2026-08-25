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

const SUBCOMMANDS = ['offer', 'compile'];

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

async function runExecution({ args, options = {}, logger, env = process.env, now = Date.now() }) {
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

  return { ok: false, reason: 'invalid_subcommand', valid: SUBCOMMANDS };
}

module.exports = { runExecution, SUBCOMMANDS };
