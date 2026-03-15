'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  parseYamlFrontmatter,
  validateContextData,
  validateProjectContextFile,
  isValidLanguageTag
} = require('../src/context');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-context-'));
}

test('parseYamlFrontmatter parses valid context frontmatter', () => {
  const input = `---\nproject_name: "demo"\nframework_installed: true\nconversation_language: "en"\n---\n\n# Context\n`;
  const parsed = parseYamlFrontmatter(input);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.project_name, 'demo');
  assert.equal(parsed.data.framework_installed, true);
  assert.equal(parsed.data.conversation_language, 'en');
});

test('validateContextData returns issues for missing required fields', () => {
  const issues = validateContextData({ project_name: 'demo' });
  assert.equal(issues.length > 0, true);
});

test('isValidLanguageTag validates BCP-47-like values', () => {
  assert.equal(isValidLanguageTag('en'), true);
  assert.equal(isValidLanguageTag('pt-BR'), true);
  assert.equal(isValidLanguageTag('invalid_language_tag_123'), false);
});

test('validateProjectContextFile returns valid true for complete context', async () => {
  const dir = await makeTempDir();
  const file = path.join(dir, '.aioson/context/project.context.md');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    `---\nproject_name: "demo"\nproject_type: "dapp"\nprofile: "developer"\nframework: "Hardhat"\nframework_installed: true\nclassification: "MICRO"\nconversation_language: "en"\nweb3_enabled: true\nweb3_networks: "ethereum"\ncontract_framework: "Hardhat"\naioson_version: "0.1.5"\n---\n\n# Project Context\n`,
    'utf8'
  );

  const result = await validateProjectContextFile(dir);
  assert.equal(result.valid, true);
  assert.equal(result.issues.length, 0);
});

test('validateContextData accepts project_type dapp', () => {
  const issues = validateContextData({
    project_name: 'demo',
    project_type: 'dapp',
    profile: 'developer',
    framework: 'Hardhat',
    framework_installed: true,
    classification: 'MICRO',
    conversation_language: 'en',
    aioson_version: '0.1.5'
  });
  assert.equal(issues.length, 0);
});
