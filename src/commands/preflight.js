'use strict';

/**
 * aioson preflight — consolidated pre-flight analysis for any agent session.
 *
 * Replaces 10+ manual file checks with one command. Returns mode, context package,
 * readiness, phase gates, and next step — deterministically, with no LLM calls.
 *
 * Usage:
 *   aioson preflight . --agent=dev --feature=checkout
 *   aioson preflight . --agent=qa --feature=checkout --json
 *   aioson preflight .   (project-level, no feature)
 */

const path = require('node:path');
const {
  loadProjectContext,
  scanArtifacts,
  readPhaseGates,
  readDevState,
  readProjectPulse,
  detectClassification,
  detectFramework,
  detectTestRunner,
  discoverRules,
  buildContextPackage,
  evaluateReadiness,
  extractSpecVersion,
  extractLastCheckpoint,
  GATE_NAMES
} = require('../preflight-engine');

const BAR = '━'.repeat(55);

function gateIcon(status) {
  if (!status) return '○';
  if (status === 'approved') return '✓';
  if (status === 'pending') return '○';
  return '✗';
}

async function runPreflight({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const agent = options.agent ? String(options.agent) : null;
  const slug = options.feature ? String(options.feature) : null;

  // --- Gather all data ---
  const ctx = await loadProjectContext(targetDir);
  const artifacts = await scanArtifacts(targetDir, slug);
  const phaseGates = await readPhaseGates(targetDir, slug);
  const devState = await readDevState(targetDir);
  const pulse = await readProjectPulse(targetDir);

  let classification = await detectClassification(targetDir, slug);
  const framework = ctx.data.framework || ctx.data.stack || await detectFramework(targetDir);
  const testRunnerInfo = await detectTestRunner(targetDir);
  const testRunner = testRunnerInfo ? testRunnerInfo.name : (ctx.data.test_runner || null);
  const rules = agent ? await discoverRules(targetDir, agent) : [];
  const contextPackage = buildContextPackage(agent || 'dev', slug, classification, artifacts, devState);
  const readiness = evaluateReadiness(artifacts, phaseGates, classification, agent);

  // Determine mode
  const mode = slug
    ? (artifacts.prd.exists ? 'feature' : 'continuation')
    : (artifacts.project_context.exists ? 'project' : 'greenfield');

  // Spec version + checkpoint
  const specVersion = extractSpecVersion(artifacts.spec);
  const lastCheckpoint = extractLastCheckpoint(artifacts.spec);

  const result = {
    ok: true,
    mode,
    feature_slug: slug,
    agent,
    classification,
    framework: framework || null,
    test_runner: testRunner,
    artifacts: {
      project_context: { exists: artifacts.project_context.exists, path: artifacts.project_context.path || null },
      prd: { exists: artifacts.prd.exists, path: artifacts.prd.path || null },
      sheldon_enrichment: { exists: artifacts.sheldon_enrichment.exists },
      requirements: { exists: artifacts.requirements.exists, path: artifacts.requirements.path || null },
      spec: {
        exists: artifacts.spec.exists,
        path: artifacts.spec.path || null,
        version: specVersion,
        last_checkpoint: lastCheckpoint
      },
      architecture: { exists: artifacts.architecture.exists },
      implementation_plan: {
        exists: artifacts.implementation_plan.exists,
        path: artifacts.implementation_plan.path || null,
        status: artifacts.implementation_plan.exists ? (artifacts.implementation_plan.frontmatter.status || null) : null
      },
      conformance: { exists: artifacts.conformance.exists },
      dev_state: {
        exists: devState.exists,
        next_step: devState.next_step || null
      }
    },
    phase_gates: {
      requirements: phaseGates.requirements || 'pending',
      design: phaseGates.design || 'pending',
      plan: phaseGates.plan || 'pending',
      execution: phaseGates.execution || 'pending'
    },
    context_package: contextPackage,
    rules,
    readiness: readiness.status,
    readiness_blockers: readiness.blockers,
    pulse: {
      last_agent: pulse.last_agent || null,
      last_gate: pulse.last_gate || null,
      blockers: pulse.blockers || 'none'
    },
    dev_state: {
      active_feature: devState.active_feature || null,
      active_phase: devState.active_phase || null,
      next_step: devState.next_step || null,
      last_spec_version: devState.last_spec_version || null
    }
  };

  if (options.json) return result;

  // --- Human output ---
  const header = agent && slug
    ? `AIOSON Pre-flight — @${agent} / ${slug}`
    : agent
      ? `AIOSON Pre-flight — @${agent}`
      : 'AIOSON Pre-flight';

  logger.log('');
  logger.log(header);
  logger.log(BAR);
  logger.log('');
  logger.log(`Mode: ${mode}${classification ? ' | Classification: ' + classification : ''}${framework ? ' | Framework: ' + framework : ''}${testRunner ? ' | Test runner: ' + testRunner : ''}`);
  logger.log('');

  logger.log('Artifacts:');
  const checks = [
    ['project.context.md', artifacts.project_context.exists, null],
    slug ? [`prd-${slug}.md`, artifacts.prd.exists, null] : null,
    slug ? [`sheldon-enrichment-${slug}.md`, artifacts.sheldon_enrichment.exists, 'optional'] : null,
    slug ? [`requirements-${slug}.md`, artifacts.requirements.exists, null] : null,
    slug
      ? [`spec-${slug}.md`, artifacts.spec.exists, specVersion ? `version: ${specVersion}${lastCheckpoint ? ', last: "' + lastCheckpoint + '"' : ''}` : null]
      : null,
    ['architecture.md', artifacts.architecture.exists, null],
    slug ? [`implementation-plan-${slug}.md`, artifacts.implementation_plan.exists, artifacts.implementation_plan.exists ? `status: ${artifacts.implementation_plan.frontmatter.status || 'unknown'}` : null] : null,
    slug ? [`conformance-${slug}.yaml`, artifacts.conformance.exists, classification === 'SMALL' || classification === 'MICRO' ? 'MEDIUM only — not required' : null] : null
  ].filter(Boolean);

  for (const [name, exists, note] of checks) {
    const icon = exists ? '  ✓' : '  ✗';
    const suffix = note ? ` (${note})` : '';
    logger.log(`${icon} ${name}${suffix}`);
  }

  logger.log('');
  logger.log('Phase gates:');
  for (const [letter, name] of Object.entries(GATE_NAMES)) {
    const status = phaseGates[name] || 'pending';
    logger.log(`  ${gateIcon(status)} Gate ${letter} (${name}): ${status}`);
  }

  if (devState.exists && devState.next_step) {
    logger.log('');
    logger.log('Dev state:');
    if (devState.active_feature) logger.log(`  active_feature: ${devState.active_feature}`);
    if (devState.active_phase) logger.log(`  active_phase: ${devState.active_phase}`);
    logger.log(`  next_step: "${devState.next_step}"`);
    if (devState.last_spec_version) logger.log(`  last_spec_version: ${devState.last_spec_version}`);
  }

  if (contextPackage.length > 0) {
    logger.log('');
    logger.log('Context package (load these):');
    contextPackage.forEach((p, i) => logger.log(`  ${i + 1}. ${p}`));
  }

  if (rules.length > 0) {
    logger.log('');
    logger.log(`Rules loaded: ${rules.join(', ')}`);
  }

  if (pulse.last_agent) {
    logger.log('');
    logger.log('Project pulse:');
    if (pulse.last_agent) logger.log(`  last_agent: @${pulse.last_agent}`);
    if (pulse.last_gate) logger.log(`  last_gate: ${pulse.last_gate}`);
    logger.log(`  blockers: ${pulse.blockers || 'none'}`);
  }

  logger.log('');
  if (readiness.status === 'READY') {
    logger.log(`Readiness: READY — proceed`);
  } else {
    logger.log(`Readiness: BLOCKED`);
    for (const b of readiness.blockers) logger.log(`  ✗ ${b}`);
  }
  logger.log('');

  return result;
}

module.exports = { runPreflight };
