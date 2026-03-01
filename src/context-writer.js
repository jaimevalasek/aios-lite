'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { ensureDir } = require('./utils');

function toPositiveInt(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.floor(num));
}

function scoreUserTypes(userTypesCount) {
  const n = toPositiveInt(userTypesCount, 1);
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2;
}

function scoreIntegrations(integrationsCount) {
  const n = toPositiveInt(integrationsCount, 0);
  if (n === 0) return 0;
  if (n <= 2) return 1;
  return 2;
}

function scoreRulesComplexity(rulesComplexity) {
  const value = String(rulesComplexity || 'none').trim().toLowerCase();
  if (value === 'none') return 0;
  if (value === 'some') return 1;
  if (value === 'complex') return 2;
  return 0;
}

function classificationFromScore(score) {
  if (score <= 1) return 'MICRO';
  if (score <= 3) return 'SMALL';
  return 'MEDIUM';
}

function calculateClassification(input) {
  const score =
    scoreUserTypes(input.userTypesCount) +
    scoreIntegrations(input.integrationsCount) +
    scoreRulesComplexity(input.rulesComplexity);

  return {
    score,
    classification: classificationFromScore(score)
  };
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(text)) return true;
  if (['false', 'no', 'n', '0'].includes(text)) return false;
  return fallback;
}

function renderProjectContext(data) {
  const language = data.conversationLanguage || 'en';
  const codeCommentLanguage = data.codeCommentLanguage || language;
  const generatedAt = data.generatedAt || new Date().toISOString();

  return `---
project_name: "${data.projectName}"
project_type: "${data.projectType}"
profile: "${data.profile}"
framework: "${data.framework}"
framework_installed: ${data.frameworkInstalled ? 'true' : 'false'}
classification: "${data.classification}"
conversation_language: "${language}"
aios_lite_version: "${data.aiosLiteVersion}"
generated_at: "${generatedAt}"
---

# Project Context

## Stack
- Backend: ${data.backend || ''}
- Frontend: ${data.frontend || ''}
- Database: ${data.database || ''}
- Auth: ${data.auth || ''}
- UI/UX: ${data.uiux || ''}

## Services
- Queues: ${data.queues || ''}
- Storage: ${data.storage || ''}
- Email: ${data.email || ''}
- Payments: ${data.payments || ''}

## Installation commands
${data.installCommands || (data.frameworkInstalled ? '[already installed]' : '[add commands here]')}

## Conventions
- Language: ${language}
- Code comments language: ${codeCommentLanguage}
- DB naming: snake_case
- JS/TS naming: camelCase
`;
}

async function writeProjectContext(targetDir, content) {
  const contextDir = path.join(targetDir, '.aios-lite/context');
  await ensureDir(contextDir);
  const filePath = path.join(contextDir, 'project.context.md');
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

module.exports = {
  toPositiveInt,
  scoreUserTypes,
  scoreIntegrations,
  scoreRulesComplexity,
  calculateClassification,
  classificationFromScore,
  normalizeBoolean,
  renderProjectContext,
  writeProjectContext
};

