'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  calculateClassification,
  normalizeBoolean,
  renderProjectContext,
  writeProjectContext
} = require('../src/context-writer');

test('calculateClassification maps score ranges correctly', () => {
  const micro = calculateClassification({
    userTypesCount: 1,
    integrationsCount: 0,
    rulesComplexity: 'none'
  });
  assert.equal(micro.classification, 'MICRO');

  const small = calculateClassification({
    userTypesCount: 2,
    integrationsCount: 1,
    rulesComplexity: 'none'
  });
  assert.equal(small.classification, 'SMALL');

  const medium = calculateClassification({
    userTypesCount: 3,
    integrationsCount: 3,
    rulesComplexity: 'complex'
  });
  assert.equal(medium.classification, 'MEDIUM');
});

test('normalizeBoolean supports common truthy/falsy forms', () => {
  assert.equal(normalizeBoolean('yes', false), true);
  assert.equal(normalizeBoolean('false', true), false);
  assert.equal(normalizeBoolean(undefined, true), true);
});

test('renderProjectContext writes required frontmatter fields', () => {
  const markdown = renderProjectContext({
    projectName: 'demo',
    projectType: 'web_app',
    profile: 'developer',
    framework: 'Node',
    frameworkInstalled: true,
    classification: 'MICRO',
    conversationLanguage: 'en',
    aiosLiteVersion: '0.1.2'
  });

  assert.equal(markdown.includes('conversation_language: "en"'), true);
  assert.equal(markdown.includes('classification: "MICRO"'), true);
});

test('writeProjectContext persists file on disk', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-context-writer-'));
  const filePath = await writeProjectContext(dir, '# context');
  const content = await fs.readFile(filePath, 'utf8');
  assert.equal(content, '# context');
});

