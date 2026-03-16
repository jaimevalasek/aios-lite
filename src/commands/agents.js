'use strict';

const path = require('node:path');
const {
  normalizeAgentName,
  listAgentDefinitions,
  getAgentDefinition,
  resolveInstructionPath,
  buildAgentPrompt
} = require('../agents');
const { resolveAgentLocale } = require('../locales');
const { validateProjectContextFile } = require('../context');
const { exists } = require('../utils');
const { loadOrCreateState, runWorkflowNext } = require('./workflow-next');
const {
  bootstrapDirectAgentPrompt,
  classifyDirectAgentRuntime
} = require('../execution-gateway');

const WORKFLOW_AGENT_IDS = new Set([
  'setup',
  'product',
  'analyst',
  'architect',
  'ux-ui',
  'pm',
  'orchestrator',
  'dev',
  'qa'
]);

async function resolveLocaleForTarget(targetDir, options) {
  const fromOption = options.language || options.lang;
  if (fromOption) return resolveAgentLocale(fromOption);

  const context = await validateProjectContextFile(targetDir);
  if (context.parsed && context.data && context.data.conversation_language) {
    return resolveAgentLocale(context.data.conversation_language);
  }

  return 'en';
}

async function resolveExistingInstructionPath(targetDir, agent, locale) {
  const candidate = resolveInstructionPath(agent, locale);
  const candidateAbs = path.join(targetDir, candidate);
  if (await exists(candidateAbs)) return candidate;
  return agent.path;
}

async function runAgentsList({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const locale = await resolveLocaleForTarget(targetDir, options);
  const agents = listAgentDefinitions();
  logger.log(t('agents.list_title', { locale }));
  for (const agent of agents) {
    const deps = agent.dependsOn.length > 0 ? agent.dependsOn.join(', ') : t('agents.none');
    const instructionPath = await resolveExistingInstructionPath(targetDir, agent, locale);
    logger.log(
      t('agents.agent_line', {
        label: agent.displayName || agent.id,
        command: agent.command,
        id: agent.id
      })
    );
    logger.log(t('agents.path_line', { path: instructionPath }));
    logger.log(t('agents.active_path_line', { path: agent.path }));
    logger.log(t('agents.depends_line', { value: deps }));
    logger.log(t('agents.output_line', { value: agent.output }));
  }

  return { ok: true, targetDir, count: agents.length, agents, locale };
}

async function runAgentPrompt({ args, options, logger, t }) {
  const name = args[0];
  if (!name) {
    throw new Error(t('agents.prompt_usage_error'));
  }

  const agent = getAgentDefinition(name);
  if (!agent) {
    throw new Error(t('agents.prompt_unknown_agent', { agent: name }));
  }

  const targetDir = path.resolve(process.cwd(), args[1] || '.');
  const locale = await resolveLocaleForTarget(targetDir, options);
  const tool = options.tool || 'codex';

  let routed = false;
  let requestedAgent = normalizeAgentName(agent.id);
  let runtime = null;
  let promptAgent = agent;
  let instructionPath = null;
  let prompt = null;

  if (WORKFLOW_AGENT_IDS.has(requestedAgent)) {
    const loaded = await loadOrCreateState(targetDir, options);
    const hasWorkflowStage = Boolean(loaded.state.current || loaded.state.next || loaded.state.sequence.length > 0);
    if (hasWorkflowStage) {
      const workflowResult = await runWorkflowNext({
        args: [targetDir],
        options: {
          ...options,
          tool,
          requestedAgent
        },
        logger: { log() {}, error() {} },
        t
      });

      routed = workflowResult.agent !== requestedAgent;
      runtime = workflowResult.runtime || null;
      promptAgent = getAgentDefinition(workflowResult.agent) || agent;
      instructionPath = workflowResult.instructionPath;
      prompt = workflowResult.prompt;
    }
  }

  if (!prompt) {
    instructionPath = await resolveExistingInstructionPath(targetDir, promptAgent, locale);
    prompt = buildAgentPrompt(promptAgent, tool, { instructionPath });
    const runtimeClass = classifyDirectAgentRuntime(promptAgent.id);
    const handoffLabel = runtimeClass.source === 'squad_session'
      ? 'Squad session handoff'
      : runtimeClass.source === 'orchestration'
        ? 'Orchestration handoff'
        : 'Direct agent handoff';
    runtime = await bootstrapDirectAgentPrompt(targetDir, {
      agentName: promptAgent.id,
      tool,
      locale,
      instructionPath,
      prompt,
      title: `${handoffLabel}: @${promptAgent.id}`,
      message: `Prompt generated for @${promptAgent.id}`
    });
  }

  logger.log(t('agents.prompt_title', { agent: promptAgent.id, tool, locale }));
  logger.log(prompt);

  return {
    ok: true,
    targetDir,
    agent: promptAgent.id,
    requestedAgent,
    routed,
    tool,
    locale,
    instructionPath,
    prompt,
    runtime
  };
}

module.exports = {
  runAgentsList,
  runAgentPrompt
};
