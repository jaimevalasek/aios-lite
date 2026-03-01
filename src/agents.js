'use strict';

const { AGENT_DEFINITIONS } = require('./constants');

function normalizeAgentName(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

function getAgentDefinition(name) {
  const normalized = normalizeAgentName(name);
  return AGENT_DEFINITIONS.find((agent) => agent.id === normalized) || null;
}

function listAgentDefinitions() {
  return [...AGENT_DEFINITIONS];
}

function buildAgentPrompt(agent, tool) {
  const safeTool = String(tool || 'codex').toLowerCase();
  const dependencyText =
    agent.dependsOn.length > 0
      ? `Check required context files first: ${agent.dependsOn.join(', ')}.`
      : 'No prerequisite context files are required.';

  if (safeTool === 'claude') {
    return `Read ${agent.path} and execute ${agent.command}. ${dependencyText} Write output to ${agent.output}.`;
  }

  if (safeTool === 'gemini') {
    return `Run the Gemini command mapped to ${agent.path} and execute ${agent.command}. ${dependencyText} Save result to ${agent.output}.`;
  }

  if (safeTool === 'opencode') {
    return `Use agent "${agent.id}" from ${agent.path}. ${dependencyText} Save output to ${agent.output}.`;
  }

  return `Read AGENTS.md and execute ${agent.command} using ${agent.path}. ${dependencyText} Save output to ${agent.output}.`;
}

module.exports = {
  normalizeAgentName,
  getAgentDefinition,
  listAgentDefinitions,
  buildAgentPrompt
};

