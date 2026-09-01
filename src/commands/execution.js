'use strict';

/**
 * aioson execution:* — the orchestrated execution path (compiled lanes running
 * as parallel external processes with a host/model per role).
 *
 *   execution:offer   [--feature]  is the path available here? (unlock file +
 *                                  signatures; optionally the feature's plan
 *                                  tables, measured scale and compiled state;
 *                                  always the unlock step the answer implies;
 *                                  --confirm-defaults records the owner's
 *                                  answer on roles at the default model)
 *   execution:seed    --lanes      write the roles file for these lanes —
 *                                  disabled, installed hosts, default model;
 *                                  never over an existing one
 *   execution:compile --feature    planner tables + roles → execution plan,
 *                                  unit prompts, manifest lanes
 *   execution:graph   --feature    the compiled plan drawn as a graph (ascii |
 *                                  mermaid | json), run state laid over it
 *
 * All read-only on refusal; `offer` never fails the process.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveTargetDir } = require('../lib/project-root');
const { validateFeatureSlug } = require('../verification/path-policy');
const {
  offerExecution,
  resolveSpawner,
  seedExecutionRoles,
  confirmDefaultModels,
  describeOnboarding,
  installedExecutionHosts
} = require('../lib/execution-roles');
const { listExecutionHosts } = require('../lib/tool-capabilities');
const { measurePlanScale, resolveExecutionChoice, formatPlanScale, formatRecommendation, formatUnit, formatSplitProposal, proposeSplit, recommendExecution, splitMinFiles, unitCeiling } = require('../lib/plan-scale');
const { parseDevelopmentLanes, parseExecutionWaves } = require('../harness/plan-waves');
const {
  compileFeatureExecution,
  executionPlanRelative,
  readExecutionPlan,
  verifyExecutionPlan
} = require('../agent-execution/execution-plan');
const { runExecution, decideExecution, statusExecution } = require('../agent-execution/execution-run');
const { graphExecution, FORMATS: GRAPH_FORMATS } = require('../agent-execution/execution-graph');

const SUBCOMMANDS = ['offer', 'seed', 'compile', 'run', 'decide', 'status', 'graph'];

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
      return `wave ${event.wave}${event.unit ? ` · ${event.unit}` : ''}: ${event.check} ${event.path}${event.lane ? ` (lane ${event.lane})` : ''}`;
    case 'message':
      return `${where}: message [${event.kind}] → ${event.to}: ${event.text}`;
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
  const lanesTable = content !== null ? parseDevelopmentLanes(content) : null;
  const compiled = await readExecutionPlan(projectDir, feature);
  const scale = content !== null ? measurePlanScale(content, { minFiles: splitMinFiles(env), ceiling: unitCeiling(env) }) : null;
  const proposal = content !== null ? proposeSplit(content, { minFiles: splitMinFiles(env), ceiling: unitCeiling(env) }) : null;
  const description = {
    path: relative,
    exists: content !== null,
    lanes_table: lanesTable !== null,
    lanes: lanesTable ? lanesTable.rows.map((row) => row.lane) : [],
    execution_sequence: Array.isArray(waves) && waves.length > 0,
    // The measured size of the plan and the choice it records: the two facts
    // the single-DEV/orchestrated question is asked on. Per unit and as a
    // graph too: one process is one context, and a plan whose only lane runs
    // one whole phase per wave is orchestrated in name only.
    scale,
    execution_choice: content !== null ? resolveExecutionChoice(content).choice : null,
    // Candidate lanes and rows cut by surface — raw material, never a table.
    split_proposal: proposal,
    // What the numbers say the question should recommend. Lock state is not
    // an input: availability names the unlock step, it never flips this.
    recommendation: scale ? recommendExecution(scale, { proposal }) : null,
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
    logger.log(`  lanes ${s.lanes} | units ${s.units} (lane ${s.lane_units}, integration ${s.integration_units}) | waves ${s.waves}${s.edges ? ` | edges ${s.edges}` : ''} | processes ${s.processes}`);
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
    const confirmation = options['confirm-defaults'] === true ? await confirmDefaultModels(projectDir, { now }) : null;
    const offer = await offerExecution(projectDir, { env, now });
    const spawner = resolveSpawner({ roles: offer.roles, env });
    const installed = await installedExecutionHosts({ env });
    const result = {
      ok: true,
      schema_version: 1,
      ...offer,
      // The client seam this engine supports, and whether one is in force here.
      execution: { spawner_supported: true, spawner: spawner ? { configured: true, source: spawner.source, command: spawner.command, args: spawner.args } : { configured: false, source: null, command: null, args: [] }, unit_timeout_ms: offer.roles?.execution?.unit_timeout_ms || null },
      hosts: { registered: listExecutionHosts(), installed },
      exitCode: 0
    };
    if (confirmation) result.confirmation = confirmation;
    if (feature) {
      result.feature = feature;
      result.plan = await describePlanTables(projectDir, feature, { env, now });
    }
    // An unavailable offer names its unlock step — silence here is how a
    // 77-file plan went to one context without anyone being asked.
    // The lanes the unlock step names: the plan's table, or — before the
    // table exists — one lane per measured surface.
    const onboardingLanes = result.plan?.lanes?.length ? result.plan.lanes : (result.plan?.split_proposal?.lanes || []).map((lane) => lane.lane);
    result.onboarding = describeOnboarding(offer, { feature, lanes: onboardingLanes, installed });
    if (!options.json) {
      if (confirmation) {
        logger.log(confirmation.ok
          ? `Default models confirmed for ${confirmation.confirmed.length} role(s): ${confirmation.confirmed.map((item) => `${item.role} (${item.host})`).join(', ') || 'none at the default'}.`
          : `Default models not confirmed (${confirmation.reason}).`);
      }
      if (offer.available) {
        logger.log(`Orchestrated execution available: ${Object.keys(offer.roles.roles).length} role(s) signed on this machine (${offer.roles_path}).`);
      } else {
        const missing = (offer.missing || []).map((item) => `${item.role} ${item.host}/${item.model} (${item.state})`).join(', ');
        logger.log(`Orchestrated execution unavailable: ${offer.reason}${missing ? ` — ${missing}` : ''}`);
        for (const error of offer.errors || []) logger.log(`  · ${error.path}: ${error.message}`);
      }
      logger.log(`  next: ${result.onboarding.next}`);
      if (result.plan) {
        const c = result.plan.compiled;
        logger.log(`Plan ${result.plan.path}: ${result.plan.exists ? `lanes table ${result.plan.lanes_table ? 'present' : 'absent'}, execution sequence ${result.plan.execution_sequence ? 'present' : 'absent'}` : 'absent'}; compiled plan ${c.exists ? (c.fresh ? 'fresh' : `stale (${c.issues.length} issue(s))`) : 'absent'}.`);
        if (result.plan.scale) {
          const s = result.plan.scale;
          logger.log(`  scale: ${formatPlanScale(s)} — ${s.split_candidate ? `SPLIT CANDIDATE (${s.files} ≥ ${s.threshold.min_files} files for one context)` : `below the split floor (${s.threshold.min_files} files)`}; execution choice ${result.plan.execution_choice || 'not recorded'}${s.areas.length ? `; areas: ${s.areas.map((area) => `${area.prefix} (${area.files})`).join(', ')}` : ''}.`);
          const tests = s.surfaces.tests.backend + s.surfaces.tests.frontend + s.surfaces.tests.shared;
          logger.log(`  surfaces: backend ${s.surfaces.backend} · frontend ${s.surfaces.frontend} · shared ${s.surfaces.shared} · tests ${tests}${s.surfaces.two_sided ? ' — two surfaces: one lane per surface is the model axis' : ''}${s.surfaces.shared_test_root ? ' (tests sit at a root no lane can own alone)' : ''}`);
          if (s.units.length > 0) {
            logger.log(`  units: ${s.units.map((unit) => `${formatUnit(unit)}${unit.over_budget ? ` OVER ${unit.reasons.join('+')}` : ''}${unit.two_sided ? ' backend+frontend' : ''}`).join(' · ')} — ceiling ${s.ceiling.max_files} files / ${s.ceiling.max_acs} ACs per context`);
            logger.log(`  parallelism: ${s.parallelism.waves} wave(s), at most ${s.parallelism.max_concurrent_units} unit(s) at once, critical path ${s.parallelism.serial_chain} unit(s) = ${s.parallelism.critical_path_processes} process(es)${s.parallelism.serial ? ' — SERIAL by construction' : ''}`);
          }
          for (const line of formatSplitProposal(result.plan.split_proposal)) logger.log(`  ${line}`);
          if (result.plan.recommendation) {
            const locked = result.plan.recommendation.choice === 'orchestrated' && !offer.available
              ? ` (locked today — that never flips the recommendation; unlock: ${result.onboarding.next})`
              : '';
            logger.log(`  recommendation: ${formatRecommendation(result.plan.recommendation)}${locked}`);
          }
        }
      }
    }
    return result;
  }

  if (sub === 'seed') {
    let lanes = options.lanes && options.lanes !== true ? String(options.lanes).split(',') : [];
    let lanesSource = lanes.length > 0 ? 'option' : null;
    if (lanes.length === 0 && feature) {
      // No --lanes: the plan's own lanes table is the declaration.
      let content = null;
      try {
        content = await fs.readFile(path.join(projectDir, '.aioson', 'context', `implementation-plan-${feature}.md`), 'utf8');
      } catch {
        content = null;
      }
      const table = content !== null ? parseDevelopmentLanes(content) : null;
      if (table && table.rows.length > 0) {
        lanes = table.rows.map((row) => row.lane);
        lanesSource = 'plan';
      } else if (content !== null) {
        // No table yet: a two-surface plan seeds one lane per surface — the
        // axis models are assigned on — and the planner writes the table after.
        const proposal = proposeSplit(content, { minFiles: splitMinFiles(env), ceiling: unitCeiling(env) });
        if (proposal) {
          lanes = proposal.lanes.map((lane) => lane.lane);
          lanesSource = 'surfaces';
        }
      }
    }
    const result = await seedExecutionRoles(projectDir, { lanes, feature, env });
    if (!options.json) {
      if (result.outcome === 'seeded') {
        logger.log(`Roles seeded (disabled): ${result.path}${lanesSource === 'surfaces' ? ' — lanes measured from the plan\'s surfaces (backend/frontend); declare them in the plan\'s lanes table' : ''}`);
        for (const [key, role] of Object.entries(result.roles)) logger.log(`  ${key}: ${role.host}/${role.model}`);
        logger.log(`  hosts installed here: ${result.hosts.installed.join(', ')}${result.independent_review ? '' : ' — one host only: the reviewer is the implementer\'s host (review is not independent)'}`);
        logger.log('  Choosing a model per role and enabling the file are the owner\'s acts. Then: aioson host:signature per role, aioson execution:offer . --feature=<slug>.');
      } else if (result.outcome === 'already_present') {
        logger.log(`${result.message}${Array.isArray(result.missing_roles) && result.missing_roles.length ? ` — role(s) the lanes need and it lacks: ${result.missing_roles.join(', ')}` : ''}`);
      } else {
        logger.error(`Roles not seeded (${result.outcome}): ${result.message}`);
        for (const item of result.install || []) if (item.command) logger.error(`  · ${item.host}: ${item.command}`);
      }
    }
    return { ...result, feature, lanes: result.lanes || lanes.map((lane) => String(lane).trim().toLowerCase()).filter(Boolean), lanes_source: lanesSource, ...(result.ok ? { exitCode: 0 } : {}) };
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

  if (sub === 'graph') {
    if (!feature) return { ok: false, reason: 'feature_required', message: 'Use --feature=<slug>' };
    const format = String(options.format || 'ascii').trim().toLowerCase();
    if (!GRAPH_FORMATS.includes(format)) return { ok: false, reason: 'invalid_format', valid: GRAPH_FORMATS, message: `Use --format=${GRAPH_FORMATS.join('|')}` };
    const result = await graphExecution({ projectDir, feature, format });
    if (!options.json) {
      if (result.ok) logger.log(result.rendered.replace(/\n$/, ''));
      else logger.error(`Execution graph unavailable (${result.reason})${result.message ? `: ${result.message}` : ''}`);
    }
    return result;
  }

  return { ok: false, reason: 'invalid_subcommand', valid: SUBCOMMANDS };
}

module.exports = { runExecution: runExecutionCommand, formatProgress, SUBCOMMANDS };
