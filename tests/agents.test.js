'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAgentName,
  getAgentDefinition,
  resolveInstructionPath,
  buildAgentPrompt,
  listAgentDefinitions
} = require('../src/agents');

test('normalizeAgentName strips @ and lowercases value', () => {
  assert.equal(normalizeAgentName('@Setup'), 'setup');
});

test('getAgentDefinition resolves known agent', () => {
  const agent = getAgentDefinition('setup');
  assert.equal(Boolean(agent), true);
  assert.equal(agent.id, 'setup');
});

test('getAgentDefinition resolves ux-ui agent', () => {
  const agent = getAgentDefinition('ux-ui');
  assert.equal(Boolean(agent), true);
  assert.equal(agent.id, 'ux-ui');
  assert.equal(agent.output.includes('.aioson/context/ui-spec.md'), true);
});

test('getAgentDefinition resolves profiler-forge agent', () => {
  const agent = getAgentDefinition('profiler-forge');
  assert.equal(Boolean(agent), true);
  assert.equal(agent.id, 'profiler-forge');
  assert.equal(agent.output.includes('.aioson/advisors/{person-slug}-advisor.md'), true);
});

test('buildAgentPrompt includes target output', () => {
  const agent = getAgentDefinition('analyst');
  const prompt = buildAgentPrompt(agent, 'codex', {
    instructionPath: resolveInstructionPath(agent, 'pt-BR')
  });
  assert.equal(prompt.includes(agent.output), true);
  assert.equal(prompt.includes('.aioson/locales/pt-BR/agents/analyst.md'), true);
});

test('listAgentDefinitions returns non-empty list', () => {
  const list = listAgentDefinitions();
  assert.equal(list.length > 0, true);
});
