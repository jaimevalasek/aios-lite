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
  return AGENT_DEFINITIONS.find((agent) => {
    if (agent.id === normalized) return true;
    return Array.isArray(agent.aliases) && agent.aliases.includes(normalized);
  }) || null;
}

function listAgentDefinitions() {
  return [...AGENT_DEFINITIONS];
}

function resolveInstructionPath(agent, locale) {
  return agent.path;
}

function buildAgentPrompt(agent, tool, options = {}) {
  const safeTool = String(tool || 'codex').toLowerCase();
  const instructionPath = options.instructionPath || agent.path;
  const targetDir = options.targetDir ? String(options.targetDir) : '.';
  const interactionLanguage = String(options.interactionLanguage || 'en');
  const autonomyMode = String(options.autonomyMode || '').trim();
  const autoHandoff = options.autoHandoff === true;
  const capabilitySummary = String(options.capabilitySummary || '').trim();
  const activationContext = String(options.activationContext || '').trim();
  const dependsOn = Array.isArray(options.dependsOn) ? options.dependsOn : agent.dependsOn;
  const dependencyText =
    dependsOn.length > 0
      ? `Check required context files first: ${dependsOn.join(', ')}.`
      : 'No prerequisite context files are required.';
  const activationBlock = activationContext
    ? [
      '',
      '## Activation Context',
      '',
      activationContext
    ].join('\n')
    : '';

  // The scope boundary normally orders a hard stop at the handoff. Two
  // exceptions loosen it: autopilot (workflow-signal driven) and the measured
  // benchmark traversal, where conducting the chain IS the agent's own work.
  const orchestration = String(options.orchestration || '').trim();
  let scopeException = '';
  if (orchestration === 'benchmark-traversal') {
    scopeException = ' Exception: this activation conducts a measured benchmark traversal — running `aioson benchmark:bootstrap`, activating the AIOSON chain agents (`@briefing → @briefing-refiner → @product → @sheldon → @planner → @dev → @qa`) inside the assigned run, and resolving their gates under the measured-run contract IS @benchmark\'s own territory. Follow `.aioson/docs/benchmark/traversal.md`. The round is unattended: never ask the user anything mid-round.';
  } else if (autoHandoff) {
    scopeException = ' Exception: autopilot handoff is active for this stage — follow `.aioson/docs/autopilot-handoff.md` and auto-invoke the next agent\'s skill when no stop condition applies. The canonical chain is `@product → @sheldon → @planner → @dev → @qa`: one Sheldon-reviewed PRD, one executable plan, one delivery verdict. Inside DEV, a clean vertical phase checkpoint is recovery state, never a human approval gate: load `.aioson/docs/dev/phase-loop.md` for multi-phase plans and continue immediately through all remaining phases. DEV may dispatch explicitly enabled development lanes with registered host/model pairs, but remains integration owner; unavailable pairs pause unless an applicable fallback is explicit. `@tester`, `@pentester`, and `@validator` are disabled by default and run only when enabled and triggered, then return to `@qa`. Stop for a genuine human decision, and NEVER auto-run `feature:close`/publish — those require explicit human approval.';
  }

  const autonomyBlock = [
    '',
    '## Autonomy Contract',
    '',
    `**Autonomy mode:** ${autonomyMode || 'guarded'}. Respect this as the maximum automation level allowed for this activation.`,
    capabilitySummary ? `**Capability summary:** ${capabilitySummary}` : '**Capability summary:** No manifest declared for this agent in the current workspace.'
  ].join('\n');

  const lifecycleBlock = [
    '',
    '',
    '## AIOSON Runtime boundary — mandatory, do not skip',
    '',
    '> Runtime persistence belongs to the AIOSON gateway. Do not try to replay telemetry manually with `aioson runtime-log` shell snippets from inside the agent session.',
    '',
    '> If the user needs dashboard-visible tracked execution in an external client, they must enter through `aioson workflow:next` or `aioson agent:prompt` before continuing.',
    '',
    '> Context retrieval is progressive: use the generated planning package when present; once exact paths are known, run `aioson context:brief . --agent=' + agent.id + ' --mode=executing --task="<current task>" --paths="<exact paths>"` and load every `must_load` result before inspection or mutation.',
    '',
    `**Language boundary:** Agent instructions are canonical in English. All user-facing communication must be in ${interactionLanguage}.`,
    '',
    `**Scope boundary:** You operate exclusively as ${agent.command}. Do not perform work that belongs to another agent. When your work is complete, output only the handoff — which agent is next and why. Do not continue into that agent\'s territory.${scopeException}`,
  ].join('\n');

  if (safeTool === 'claude') {
    return `Read ${instructionPath} and execute ${agent.command}. ${dependencyText}${activationBlock}\n\nWrite output to ${agent.output}.${autonomyBlock}${lifecycleBlock}`;
  }

  if (safeTool === 'opencode') {
    return `Use agent "${agent.id}" from ${instructionPath}. ${dependencyText}${activationBlock}\n\nSave output to ${agent.output}.${autonomyBlock}${lifecycleBlock}`;
  }

  return `Read AGENTS.md and execute ${agent.command} using ${instructionPath}. ${dependencyText}${activationBlock}\n\nSave output to ${agent.output}.${autonomyBlock}${lifecycleBlock}`;
}

module.exports = {
  normalizeAgentName,
  getAgentDefinition,
  listAgentDefinitions,
  resolveInstructionPath,
  buildAgentPrompt
};
