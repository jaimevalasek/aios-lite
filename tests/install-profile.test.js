'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldIncludeForProfile,
  TOOL_FILES,
  SQUAD_PATHS,
  DESIGN_IDS,
  LOCALE_IDS,
  ALWAYS_INSTALL,
  DEFAULT_PROFILE
} = require('../src/install-profile');

// null profile → always include
test('null profile always returns true', () => {
  assert.equal(shouldIncludeForProfile('CLAUDE.md', null), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', null), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', null), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', null), true);
  assert.equal(shouldIncludeForProfile('.aioson/locales/pt-BR/agents/dev.md', null), true);
});

// Tools
test('claude tool → CLAUDE.md included, AGENTS.md excluded', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('CLAUDE.md', p), true);
  assert.equal(shouldIncludeForProfile('.claude/commands/aioson/setup.md', p), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', p), false);
  assert.equal(shouldIncludeForProfile('.gemini/GEMINI.md', p), false);
  assert.equal(shouldIncludeForProfile('OPENCODE.md', p), false);
});

test('codex tool → AGENTS.md included', () => {
  const p = { tools: ['codex'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('AGENTS.md', p), true);
  assert.equal(shouldIncludeForProfile('CLAUDE.md', p), false);
});

test('gemini tool → .gemini/ included', () => {
  const p = { tools: ['gemini'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.gemini/GEMINI.md', p), true);
  assert.equal(shouldIncludeForProfile('.gemini/commands/aios-setup.toml', p), true);
  assert.equal(shouldIncludeForProfile('CLAUDE.md', p), false);
});

test('opencode tool → OPENCODE.md included', () => {
  const p = { tools: ['opencode'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('OPENCODE.md', p), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', p), false);
});

// Squads
test('development without squads → squad agent excluded', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/orache.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/tasks/squad-create.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/skills/squad/runner.md', p), false);
});

test('development + squads → squad files included', () => {
  const p = { tools: ['claude'], uses: ['development', 'squads'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/genome.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/tasks/squad-create.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/locales/pt-BR/agents/squad.md', p), false); // locale filtered
});

// Design
test('design=none → all design skill dirs excluded', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/aurora-command-ui/tokens.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/interface-design/components.md', p), false);
});

test('design=clean-saas-ui → only clean-saas-ui included', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'clean-saas-ui', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/tokens.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/aurora-command-ui/SKILL.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/interface-design/SKILL.md', p), false);
});

test('design=aurora-command-ui → only aurora included', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'aurora-command-ui', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/aurora-command-ui/SKILL.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', p), false);
});

test('non-design skills are unaffected by design setting', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/static/something.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/process/something.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/dynamic/something.md', p), true);
});

// Locale
test('locale=en → only en locale files included', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/locales/en/agents/dev.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/locales/pt-BR/agents/dev.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/locales/es/agents/dev.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/locales/fr/agents/dev.md', p), false);
});

test('locale=pt-BR → only pt-BR locale files included', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'pt-BR' };
  assert.equal(shouldIncludeForProfile('.aioson/locales/pt-BR/agents/dev.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/locales/en/agents/dev.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/locales/es/agents/dev.md', p), false);
});

test('locale=es → only es locale files included', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'es' };
  assert.equal(shouldIncludeForProfile('.aioson/locales/es/agents/dev.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/locales/en/agents/dev.md', p), false);
});

// Core always installed
test('.aioson/config.md always included', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/config.md', p), true);
});

test('.aioson/schemas/ always included', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/schemas/context.schema.json', p), true);
});

test('aioson-models.json always included', () => {
  const p = { tools: ['opencode'], uses: ['development'], design: 'none', locale: 'pt-BR' };
  assert.equal(shouldIncludeForProfile('aioson-models.json', p), true);
});

// Core dev agents always installed
test('core dev agents always included regardless of profile', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/agents/dev.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/setup.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/architect.md', p), true);
});

// Combined: locale + squads
test('pt-BR locale + squads → pt-BR squad locale included', () => {
  const p = { tools: ['claude'], uses: ['development', 'squads'], design: 'none', locale: 'pt-BR' };
  assert.equal(shouldIncludeForProfile('.aioson/locales/pt-BR/agents/squad.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/locales/en/agents/squad.md', p), false);
});

test('en locale + no squads → en squad locale excluded (squad filter wins)', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/locales/en/agents/squad.md', p), false);
});

// Exports
test('DESIGN_IDS exports 9 design ids', () => {
  assert.equal(DESIGN_IDS.length, 9);
  assert.ok(DESIGN_IDS.includes('clean-saas-ui'));
  assert.ok(!DESIGN_IDS.includes('none')); // none is not a real dir
});

test('LOCALE_IDS exports 4 locale ids', () => {
  assert.equal(LOCALE_IDS.length, 4);
  assert.deepEqual(LOCALE_IDS, ['en', 'es', 'fr', 'pt-BR']);
});

test('DEFAULT_PROFILE has all 4 fields', () => {
  assert.deepEqual(DEFAULT_PROFILE, { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' });
});
