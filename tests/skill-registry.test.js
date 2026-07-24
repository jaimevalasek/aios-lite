'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  loadSkillRegistry,
  resolveSkillCatalog
} = require('../src/skills/registry');

const ROOT = path.resolve(__dirname, '..');

test('process skill registry is valid, complete, and references existing tests', async () => {
  const loaded = await loadSkillRegistry(ROOT);
  assert.equal(loaded.exists, true);
  assert.deepEqual(loaded.issues, []);

  const resolved = await resolveSkillCatalog(ROOT);
  const processSkills = resolved.catalog.filter((skill) => skill.category === 'process');
  assert.equal(processSkills.length > 0, true);
  assert.equal(processSkills.every((skill) => skill.registry_declared), true);
  assert.equal(resolved.registry.issues.length, 0);

  for (const skill of processSkills.filter((entry) => entry.status === 'active')) {
    assert.equal(skill.owner_agents.length > 0, true, `${skill.id} has an owner`);
    assert.equal(skill.triggers.length > 0, true, `${skill.id} has a trigger`);
    assert.equal(skill.tests.length > 0, true, `${skill.id} has test evidence`);
    for (const testPath of skill.tests) {
      await fs.access(path.join(ROOT, ...testPath.split('/')));
    }
  }
});

test('secure-tdd is risk-triggered by Dev and simplify has an explicit replacement', async () => {
  const { catalog } = await resolveSkillCatalog(ROOT);
  const secureTdd = catalog.find((skill) => skill.id === 'secure-tdd');
  const simplify = catalog.find((skill) => skill.id === 'simplify');
  const dev = await fs.readFile(path.join(ROOT, 'template', '.aioson', 'agents', 'dev.md'), 'utf8');

  assert.equal(secureTdd.load_tier, 'risk_triggered');
  assert.deepEqual(secureTdd.owner_agents, ['dev']);
  assert.match(dev, /skills\/process\/secure-tdd\/SKILL\.md/);
  assert.equal(simplify.status, 'deprecated');
  assert.equal(Boolean(simplify.replacement), true);
});
