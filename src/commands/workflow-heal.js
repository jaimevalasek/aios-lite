'use strict';

/**
 * aioson workflow:heal — re-run a failed stage with corrective context.
 *
 * Usage:
 *   aioson workflow:heal . --stage=dev
 *   aioson workflow:heal . --stage=qa
 *
 * Reads the last recorded error, checks retry budget (max 3),
 * builds a healing prompt, and re-activates the agent.
 */

const path = require('node:path');
const {
  loadOrCreateState,
  activateStage,
  persistState,
  appendWorkflowEvent
} = require('./workflow-next');
const { syncWorkflowRuntime } = require('../execution-gateway');
const { writeHandoff, buildWorkflowHandoff } = require('../session-handoff');
const { resolveLocaleForTarget } = require('./workflow-next');
const {
  canRetry,
  incrementRetryCount,
  buildHealingActivation
} = require('../self-healing');

async function runWorkflowHeal({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const tool = options.tool || 'codex';
  const stage = options.stage ? String(options.stage).replace(/^@/, '') : null;
  const locale = await resolveLocaleForTarget(targetDir, options);

  if (!stage) {
    logger.error('--stage=<agent> is required. Example: aioson workflow:heal . --stage=dev');
    return { ok: false, reason: 'missing_stage' };
  }

  const allowedStages = ['dev', 'qa', 'tester', 'architect', 'ux-ui'];
  if (!allowedStages.includes(stage)) {
    logger.error(`Stage @${stage} is not supported for healing. Allowed: ${allowedStages.join(', ')}`);
    return { ok: false, reason: 'unsupported_stage' };
  }

  const retryOk = await canRetry(targetDir, stage);
  if (!retryOk) {
    logger.error(`Retry budget exhausted for @${stage}. Maximum 3 attempts reached. Please intervene manually.`);
    return { ok: false, reason: 'retry_budget_exhausted', stage };
  }

  const { state } = await loadOrCreateState(targetDir, options);

  // Ensure the stage is part of the workflow sequence
  if (!state.sequence.includes(stage)) {
    logger.error(`Stage @${stage} is not part of the active workflow sequence.`);
    return { ok: false, reason: 'stage_not_in_sequence' };
  }

  // Build healing activation
  let activation;
  try {
    activation = await buildHealingActivation(
      targetDir,
      state,
      stage,
      locale,
      tool,
      activateStage
    );
  } catch (err) {
    logger.error(`Unable to build healing activation: ${err.message}`);
    return { ok: false, reason: 'activation_failed', error: err.message };
  }

  // Increment retry counter
  const newCount = await incrementRetryCount(targetDir, stage, activation.prompt.substring(0, 200));

  // Persist state with the healed stage as active
  const healedState = {
    ...state,
    current: stage,
    detour: null
  };
  await persistState(targetDir, healedState);

  // Emit workflow event
  const eventPayload = {
    id: Date.now(),
    kind: 'workflow',
    createdAt: new Date().toISOString(),
    eventType: 'heal',
    message: `Healing @${stage} — retry ${newCount}/3`,
    mode: state.mode,
    classification: state.classification,
    featureSlug: state.featureSlug,
    current: stage,
    next: state.next,
    completed: state.completed,
    skipped: state.skipped,
    sequence: state.sequence,
    healing: true,
    retryCount: newCount
  };
  await appendWorkflowEvent(targetDir, eventPayload);

  // Sync runtime
  const runtime = await syncWorkflowRuntime(targetDir, {
    state: healedState,
    eventPayload,
    activationAgent: stage,
    completedStage: null
  });

  // Update handoff
  const handoffData = buildWorkflowHandoff(healedState, null, stage);
  await writeHandoff(targetDir, handoffData);

  logger.log(t('workflow_heal.title', { stage: `@${stage}`, count: newCount }));
  logger.log(activation.prompt);

  return {
    ok: true,
    targetDir,
    stage,
    retryCount: newCount,
    maxRetries: 3,
    runtime,
    agent: activation.agent,
    instructionPath: activation.instructionPath,
    prompt: activation.prompt
  };
}

module.exports = { runWorkflowHeal };
