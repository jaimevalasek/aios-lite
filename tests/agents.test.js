'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAgentName,
  getAgentDefinition,
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

test('buildAgentPrompt includes target output', () => {
  const agent = getAgentDefinition('analyst');
  const prompt = buildAgentPrompt(agent, 'codex');
  assert.equal(prompt.includes(agent.output), true);
});

test('listAgentDefinitions returns non-empty list', () => {
  const list = listAgentDefinitions();
  assert.equal(list.length > 0, true);
});
