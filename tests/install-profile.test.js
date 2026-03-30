'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldIncludeForProfile,
  TOOL_FILES,
  SQUAD_PATHS,
  ALWAYS_INSTALL,
  DEFAULT_PROFILE
} = require('../src/install-profile');

// null profile → always include
test('shouldIncludeForProfile with null profile always returns true', () => {
  assert.equal(shouldIncludeForProfile('CLAUDE.md', null), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', null), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', null), true);
  assert.equal(shouldIncludeForProfile('OPENCODE.md', null), true);
});

// claude selected
test('claude tool → CLAUDE.md included, AGENTS.md excluded', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('CLAUDE.md', profile), true);
  assert.equal(shouldIncludeForProfile('.claude/commands/aioson/setup.md', profile), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', profile), false);
  assert.equal(shouldIncludeForProfile('.gemini/GEMINI.md', profile), false);
  assert.equal(shouldIncludeForProfile('OPENCODE.md', profile), false);
});

// codex selected
test('codex tool → AGENTS.md included', () => {
  const profile = { tools: ['codex'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('AGENTS.md', profile), true);
  assert.equal(shouldIncludeForProfile('CLAUDE.md', profile), false);
});

// gemini selected
test('gemini tool → .gemini/GEMINI.md and commands included', () => {
  const profile = { tools: ['gemini'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.gemini/GEMINI.md', profile), true);
  assert.equal(shouldIncludeForProfile('.gemini/commands/aios-setup.toml', profile), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', profile), false);
});

// opencode selected
test('opencode tool → OPENCODE.md included', () => {
  const profile = { tools: ['opencode'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('OPENCODE.md', profile), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', profile), false);
});

// development without squads
test('development without squads → squad agent excluded', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/orache.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/genome.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/profiler-researcher.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/profiler-enricher.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/profiler-forge.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/design-hybrid-forge.md', profile), false);
});

// development + squads
test('development + squads → squad agent included', () => {
  const profile = { tools: ['claude'], uses: ['development', 'squads'] };
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', profile), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/orache.md', profile), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/genome.md', profile), true);
});

test('development + squads → squad tasks included', () => {
  const profile = { tools: ['claude'], uses: ['development', 'squads'] };
  assert.equal(shouldIncludeForProfile('.aioson/tasks/squad-create.md', profile), true);
  assert.equal(shouldIncludeForProfile('.aioson/tasks/squad-run.md', profile), true);
});

test('development without squads → squad tasks excluded', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.aioson/tasks/squad-create.md', profile), false);
});

test('development without squads → squad skills excluded', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.aioson/skills/squad/squad-runner.md', profile), false);
});

// Core files always installed
test('.aioson/config.md always included regardless of profile', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.aioson/config.md', profile), true);
});

test('.aioson/schemas/ always included', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.aioson/schemas/context.schema.json', profile), true);
});

test('aioson-models.json always included', () => {
  const profile = { tools: ['opencode'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('aioson-models.json', profile), true);
});

// Corrupted/partial profile → treat as install all
test('profile with missing tools array → fallback to include', () => {
  // isFileForAnyTool returns false for non-tool files, so they pass through
  assert.equal(shouldIncludeForProfile('.aioson/agents/dev.md', { tools: [], uses: ['development'] }), true);
});

test('profile with null tools → no crash, tool files excluded', () => {
  const profile = { tools: null, uses: ['development'] };
  // CLAUDE.md is a tool file, null tools means profile.tools.some fails
  // but we guard with || []
  assert.equal(shouldIncludeForProfile('CLAUDE.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/config.md', profile), true);
});

// Locale squad agents
test('squad locale files excluded without squads', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.aioson/locales/pt-BR/agents/squad.md', profile), false);
  assert.equal(shouldIncludeForProfile('.aioson/locales/en/agents/orache.md', profile), false);
});

test('squad locale files included with squads', () => {
  const profile = { tools: ['claude'], uses: ['development', 'squads'] };
  assert.equal(shouldIncludeForProfile('.aioson/locales/pt-BR/agents/squad.md', profile), true);
});

// Core dev agents always installed
test('core dev agents always included', () => {
  const profile = { tools: ['claude'], uses: ['development'] };
  assert.equal(shouldIncludeForProfile('.aioson/agents/dev.md', profile), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/setup.md', profile), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/architect.md', profile), true);
});

// DEFAULT_PROFILE shape
test('DEFAULT_PROFILE has expected shape', () => {
  assert.deepEqual(DEFAULT_PROFILE, { tools: ['claude'], uses: ['development'] });
});
