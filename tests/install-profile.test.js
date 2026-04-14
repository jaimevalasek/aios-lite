'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldIncludeForProfile,
  DESIGN_IDS,
  LOCALE_IDS,
  DEFAULT_PROFILE
} = require('../src/install-profile');

test('null profile always returns true', () => {
  assert.equal(shouldIncludeForProfile('CLAUDE.md', null), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', null), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', null), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', null), true);
});

test('tool-specific files are filtered by selected tools', () => {
  const claude = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('CLAUDE.md', claude), true);
  assert.equal(shouldIncludeForProfile('AGENTS.md', claude), false);

  const codex = { tools: ['codex'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('AGENTS.md', codex), true);
  assert.equal(shouldIncludeForProfile('CLAUDE.md', codex), false);
});

test('squad files depend on uses=squads, not locale', () => {
  const withoutSquads = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', withoutSquads), false);
  assert.equal(shouldIncludeForProfile('.aioson/agents/orache.md', withoutSquads), false);

  const withSquads = { tools: ['claude'], uses: ['development', 'squads'], design: 'none', locale: 'pt-BR' };
  assert.equal(shouldIncludeForProfile('.aioson/agents/squad.md', withSquads), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/genome.md', withSquads), true);
  assert.equal(shouldIncludeForProfile('.aioson/tasks/squad-create.md', withSquads), true);
});

test('site-forge and design-hybrid-forge stay available outside squad mode', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'fr' };
  assert.equal(shouldIncludeForProfile('.aioson/agents/site-forge.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/design-hybrid-forge.md', p), true);
});

test('design=none excludes packaged design skills', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', p), false);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/aurora-command-ui/tokens.md', p), false);
});

test('specific design selection keeps only the chosen skill', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'clean-saas-ui', locale: 'es' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/tokens.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/aurora-command-ui/SKILL.md', p), false);
});

test('non-design skills are unaffected by the design setting', () => {
  const p = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/static/something.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/process/something.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/skills/dynamic/something.md', p), true);
});

test('locale metadata does not filter canonical agent prompts', () => {
  const en = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'en' };
  const pt = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'pt-BR' };
  const es = { tools: ['claude'], uses: ['development'], design: 'none', locale: 'es' };

  assert.equal(shouldIncludeForProfile('.aioson/agents/dev.md', en), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/dev.md', pt), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/dev.md', es), true);
});

test('core files and core workflow agents are always included', () => {
  const p = { tools: ['opencode'], uses: ['development'], design: 'none', locale: 'pt-BR' };
  assert.equal(shouldIncludeForProfile('.aioson/config.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/schemas/context.schema.json', p), true);
  assert.equal(shouldIncludeForProfile('aioson-models.json', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/dev.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/setup.md', p), true);
  assert.equal(shouldIncludeForProfile('.aioson/agents/architect.md', p), true);
});

test('DESIGN_IDS exports packaged design skills only', () => {
  assert.equal(DESIGN_IDS.length, 9);
  assert.ok(DESIGN_IDS.includes('clean-saas-ui'));
  assert.ok(!DESIGN_IDS.includes('none'));
});

test('LOCALE_IDS exports supported interaction language defaults', () => {
  assert.equal(LOCALE_IDS.length, 4);
  assert.deepEqual(LOCALE_IDS, ['en', 'es', 'fr', 'pt-BR']);
});

test('DEFAULT_PROFILE stays stable', () => {
  assert.deepEqual(DEFAULT_PROFILE, {
    tools: ['claude'],
    uses: ['development'],
    design: 'none',
    locale: 'en'
  });
});
