'use strict';

/**
 * aioson workflow:execute — orchestrate the full agent workflow for a feature.
 *
 * Uses agent:prompt, gate:check, pulse:update, feature:close as building blocks.
 * Always supports --dry-run to preview the plan without executing.
 *
 * Usage:
 *   aioson workflow:execute . --feature=checkout --tool=claude --dry-run
 *   aioson workflow:execute . --feature=checkout --tool=claude
 *   aioson workflow:execute . --feature=checkout --tool=claude --start-from=dev
 *   aioson workflow:execute . --feature=checkout --json --dry-run
 */

const path = require('node:path');
const { execSync } = require('node:child_process');
const {
  detectClassification,
  scanArtifacts,
  readPhaseGates
} = require('../preflight-engine');

const BAR = '━'.repeat(45);

const WORKFLOW_BY_CLASSIFICATION = {
  MICRO: [
    { agent: 'dev', gate_before: null, gate_after: null, description: 'Direct implementation' }
  ],
  SMALL: [
    { agent: 'product', gate_before: null, gate_after: null, description: 'Generate PRD' },
    { agent: 'sheldon', gate_before: null, gate_after: null, description: 'Enrich PRD (recommended)', optional: true },
    { agent: 'analyst', gate_before: null, gate_after: 'A', description: 'Map requirements + spec' },
    { agent: 'dev', gate_before: 'A', gate_after: 'C', description: 'Implementation' },
    { agent: 'qa', gate_before: 'C', gate_after: 'D', description: 'QA + feature closure' }
  ],
  MEDIUM: [
    { agent: 'product', gate_before: null, gate_after: null, description: 'Generate PRD' },
    { agent: 'sheldon', gate_before: null, gate_after: null, description: 'Enrich PRD (required)', optional: false },
    { agent: 'analyst', gate_before: null, gate_after: 'A', description: 'Map requirements + spec' },
    { agent: 'architect', gate_before: 'A', gate_after: 'B', description: 'Architecture design' },
    { agent: 'ux-ui', gate_before: 'A', gate_after: 'B', description: 'UI/UX design', optional: true },
    { agent: 'pm', gate_before: 'B', gate_after: null, description: 'Backlog + PM plan' },
    { agent: 'dev', gate_before: 'C', gate_after: 'C', description: 'Implementation' },
    { agent: 'qa', gate_before: 'C', gate_after: 'D', description: 'QA + feature closure' }
  ]
};

const GATE_NAMES = { A: 'requirements', B: 'design', C: 'plan', D: 'execution' };

async function buildExecutionPlan(targetDir, slug, classification, startFrom) {
  const steps = WORKFLOW_BY_CLASSIFICATION[classification] || WORKFLOW_BY_CLASSIFICATION.SMALL;
  const artifacts = await scanArtifacts(targetDir, slug);
  const gates = await readPhaseGates(targetDir, slug);

  const plan = [];
  let stepNum = 1;
  let startFromReached = !startFrom;

  for (const step of steps) {
    if (startFrom && !startFromReached) {
      if (step.agent === startFrom) startFromReached = true;
      else continue;
    }

    // Determine if step can be skipped (artifact already exists)
    let skip = false;
    let skipReason = null;

    if (step.agent === 'product' && artifacts.prd.exists) {
      skip = true; skipReason = 'prd already exists';
    } else if (step.agent === 'sheldon' && artifacts.sheldon_enrichment.exists) {
      skip = true; skipReason = 'sheldon enrichment already exists';
    } else if (step.agent === 'analyst' && artifacts.requirements.exists && gates.requirements === 'approved') {
      skip = true; skipReason = 'requirements + Gate A already approved';
    } else if (step.agent === 'architect' && artifacts.architecture.exists && gates.design === 'approved') {
      skip = true; skipReason = 'architecture + Gate B already approved';
    }

    plan.push({
      step: stepNum++,
      agent: step.agent,
      description: step.description,
      gate_before: step.gate_before,
      gate_after: step.gate_after,
      optional: step.optional || false,
      skip,
      skip_reason: skipReason
    });
  }

  return plan;
}

function runCommand(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function runWorkflowExecute({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.feature ? String(options.feature) : null;
  const tool = options.tool ? String(options.tool) : 'claude';
  const dryRun = Boolean(options['dry-run'] || options.dry);
  const startFrom = options['start-from'] ? String(options['start-from']) : null;
  const skipOptional = Boolean(options['skip-optional']);

  if (!slug) {
    if (options.json) return { ok: false, reason: 'missing_feature' };
    logger.log('--feature=<slug> is required.');
    return { ok: false };
  }

  let classification = await detectClassification(targetDir, slug);
  if (!classification) classification = options.classification ? String(options.classification).toUpperCase() : 'SMALL';

  const plan = await buildExecutionPlan(targetDir, slug, classification, startFrom);
  const activePlan = plan.filter((s) => !s.skip && !(skipOptional && s.optional));
  const skippedPlan = plan.filter((s) => s.skip);

  if (dryRun || options.json) {
    const result = {
      ok: true,
      feature: slug,
      classification,
      tool,
      dry_run: true,
      steps: plan,
      active_steps: activePlan.length,
      skipped_steps: skippedPlan.length
    };

    if (options.json) return result;

    logger.log('');
    logger.log(`Workflow Execution Plan — ${slug} (${classification})`);
    logger.log(BAR);

    for (const step of plan) {
      const icon = step.skip ? '○ (skip)' : `Step ${step.step}:`;
      const optional = step.optional ? ' (optional)' : '';
      const gateInfo = step.gate_after ? ` → Gate ${step.gate_after} check` : '';
      const skipInfo = step.skip ? ` — ${step.skip_reason}` : '';
      logger.log(`${icon} @${step.agent}${optional} — ${step.description}${gateInfo}${skipInfo}`);
    }

    logger.log('');
    logger.log(`Gates enforced: ${plan.filter((s) => s.gate_after && !s.skip).map((s) => s.gate_after).join(', ') || 'none'}`);
    logger.log(`Active sessions: ${activePlan.length} | Skipped: ${skippedPlan.length}`);
    logger.log('');
    logger.log('Run without --dry-run to execute.');
    logger.log('');

    return result;
  }

  // Execute
  logger.log('');
  logger.log(`Workflow Execution — ${slug} (${classification})`);
  logger.log(BAR);

  let completed = 0;
  let failed = 0;
  const executionLog = [];

  for (const step of plan) {
    if (step.skip) {
      logger.log(`[skip] @${step.agent} — ${step.skip_reason}`);
      executionLog.push({ step: step.step, agent: step.agent, status: 'skipped', reason: step.skip_reason });
      continue;
    }

    if (skipOptional && step.optional) {
      logger.log(`[skip] @${step.agent} — optional, skipped`);
      executionLog.push({ step: step.step, agent: step.agent, status: 'skipped', reason: 'optional' });
      continue;
    }

    // Gate check before
    if (step.gate_before) {
      logger.log(`[Gate ${step.gate_before} check] pre-step ${step.step}...`);
      const gateCmd = `aioson gate:check ${targetDir} --feature=${slug} --gate=${step.gate_before}`;
      const gateResult = runCommand(gateCmd);
      if (!gateResult.ok) {
        logger.log(`[Gate ${step.gate_before}] BLOCKED — cannot proceed with @${step.agent}`);
        executionLog.push({ step: step.step, agent: step.agent, status: 'blocked', gate: step.gate_before });
        failed++;
        break;
      }
    }

    logger.log(`[Step ${step.step}/${activePlan.length}] @${step.agent} — ${step.description}...`);
    const agentCmd = `aioson agent:prompt ${targetDir} --agent=${step.agent} --feature=${slug} --tool=${tool}`;
    const agentResult = runCommand(agentCmd);

    if (!agentResult.ok) {
      logger.log(`[Step ${step.step}] @${step.agent} FAILED`);
      executionLog.push({ step: step.step, agent: step.agent, status: 'failed' });
      failed++;
      break;
    }

    // Gate check after
    if (step.gate_after) {
      logger.log(`[Gate ${step.gate_after} check] post-step ${step.step}...`);
    }

    // Pulse update
    const pulseCmd = `aioson pulse:update ${targetDir} --agent=${step.agent} --feature=${slug} --action="${step.description}" 2>/dev/null || true`;
    runCommand(pulseCmd);

    executionLog.push({ step: step.step, agent: step.agent, status: 'completed' });
    completed++;
    logger.log(`[Step ${step.step}] @${step.agent} ✓`);
  }

  const allDone = completed === activePlan.length;
  if (allDone) {
    logger.log('');
    logger.log(`Workflow complete: ${slug} → done`);
    logger.log(`Total sessions: ${completed}`);
  } else {
    logger.log('');
    logger.log(`Workflow stopped: ${completed} completed, ${failed} failed.`);
  }

  return {
    ok: allDone,
    feature: slug,
    classification,
    completed,
    failed,
    execution_log: executionLog
  };
}

module.exports = { runWorkflowExecute };
