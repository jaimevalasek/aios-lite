'use strict';

const { AGENT_DEFINITIONS } = require('./constants');
const { getLocalizedAgentPath } = require('./locales');

function normalizeAgentName(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

function getAgentDefinition(name) {
  const normalized = normalizeAgentName(name);
  return AGENT_DEFINITIONS.find((agent) => {
    if (agent.id === normalized) return true;
    return Array.isArray(agent.aliases) && agent.aliases.includes(normalized);
  }) || null;
}

function listAgentDefinitions() {
  return [...AGENT_DEFINITIONS];
}

function resolveInstructionPath(agent, locale) {
  if (!locale) return agent.path;
  return getLocalizedAgentPath(agent.id, locale);
}

function buildAgentPrompt(agent, tool, options = {}) {
  const safeTool = String(tool || 'codex').toLowerCase();
  const instructionPath = options.instructionPath || agent.path;
  const targetDir = options.targetDir ? String(options.targetDir) : '.';
  const dependencyText =
    agent.dependsOn.length > 0
      ? `Check required context files first: ${agent.dependsOn.join(', ')}.`
      : 'No prerequisite context files are required.';

  const lifecycleBlock = [
    '',
    '',
    '## AIOSON Runtime boundary — mandatory, do not skip',
    '',
    '> Runtime persistence belongs to the AIOSON gateway. Do not try to replay telemetry manually with `aioson runtime-log` shell snippets from inside the agent session.',
    '',
    '> If the user needs dashboard-visible tracked execution in an external client, they must enter through `aioson workflow:next` or `aioson agent:prompt` before continuing.',
    '',
    `**Scope boundary:** You operate exclusively as ${agent.command}. Do not perform work that belongs to another agent. When your work is complete, output only the handoff — which agent is next and why. Do not continue into that agent\'s territory.`,
  ].join('\n');

  if (safeTool === 'claude') {
    return `Read ${instructionPath} and execute ${agent.command}. ${dependencyText} Write output to ${agent.output}.${lifecycleBlock}`;
  }

  if (safeTool === 'gemini') {
    return `Run the Gemini command mapped to ${instructionPath} and execute ${agent.command}. ${dependencyText} Save result to ${agent.output}.${lifecycleBlock}`;
  }

  if (safeTool === 'opencode') {
    return `Use agent "${agent.id}" from ${instructionPath}. ${dependencyText} Save output to ${agent.output}.${lifecycleBlock}`;
  }

  return `Read AGENTS.md and execute ${agent.command} using ${instructionPath}. ${dependencyText} Save output to ${agent.output}.${lifecycleBlock}`;
}

module.exports = {
  normalizeAgentName,
  getAgentDefinition,
  listAgentDefinitions,
  resolveInstructionPath,
  buildAgentPrompt
};
