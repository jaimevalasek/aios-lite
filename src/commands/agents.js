'use strict';

const { listAgentDefinitions, getAgentDefinition, buildAgentPrompt } = require('../agents');

async function runAgentsList({ logger, t }) {
  const agents = listAgentDefinitions();
  logger.log(t('agents.list_title'));
  for (const agent of agents) {
    const deps = agent.dependsOn.length > 0 ? agent.dependsOn.join(', ') : t('agents.none');
    logger.log(`- ${agent.command} (${agent.id})`);
    logger.log(`  ${t('agents.path')}: ${agent.path}`);
    logger.log(`  ${t('agents.depends')}: ${deps}`);
    logger.log(`  ${t('agents.output')}: ${agent.output}`);
  }

  return { count: agents.length, agents };
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

  const tool = options.tool || 'codex';
  const prompt = buildAgentPrompt(agent, tool);

  logger.log(t('agents.prompt_title', { agent: agent.id, tool }));
  logger.log(prompt);

  return { agent: agent.id, tool, prompt };
}

module.exports = {
  runAgentsList,
  runAgentPrompt
};

