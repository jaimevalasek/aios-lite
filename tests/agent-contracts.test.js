'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS = ['setup', 'analyst', 'architect', 'pm', 'dev', 'qa', 'orchestrator'];

async function read(filePath) {
  return fs.readFile(filePath, 'utf8');
}

test('template ships all base and localized agent files', async () => {
  for (const agent of AGENTS) {
    const basePath = path.join(ROOT, 'template/.aios-lite/agents', `${agent}.md`);
    const enPath = path.join(ROOT, 'template/.aios-lite/locales/en/agents', `${agent}.md`);
    const ptPath = path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents', `${agent}.md`);

    await assert.doesNotReject(() => fs.access(basePath));
    await assert.doesNotReject(() => fs.access(enPath));
    await assert.doesNotReject(() => fs.access(ptPath));
  }
});

test('setup agent contract includes required context fields and service sections', async () => {
  const setupBase = await read(path.join(ROOT, 'template/.aios-lite/agents/setup.md'));
  const setupEn = await read(path.join(ROOT, 'template/.aios-lite/locales/en/agents/setup.md'));

  const requiredSnippets = [
    'project_name',
    'project_type',
    'profile',
    'framework_installed',
    'classification',
    'conversation_language',
    'web3_enabled',
    'web3_networks',
    'contract_framework',
    'wallet_provider',
    'indexer',
    'rpc_provider',
    '## Services',
    '- WebSockets:',
    '- Cache:',
    '- Search:',
    '## Notes'
  ];

  for (const token of requiredSnippets) {
    assert.equal(setupBase.includes(token), true, `missing in base setup: ${token}`);
    assert.equal(setupEn.includes(token), true, `missing in en setup: ${token}`);
  }
});

test('core agent contracts include actionable sections', async () => {
  const checks = [
    {
      file: 'analyst.md',
      tokens: ['Phase 1', 'Phase 2', 'Phase 3', 'Classification']
    },
    {
      file: 'architect.md',
      tokens: ['Rules', 'Responsibilities', 'Output contract']
    },
    {
      file: 'dev.md',
      tokens: ['Working rules', 'Implementation strategy', 'Output expectations']
    },
    {
      file: 'qa.md',
      tokens: ['Risk-first checklist', 'Report format', 'Critical']
    }
  ];

  for (const item of checks) {
    const baseContent = await read(path.join(ROOT, 'template/.aios-lite/agents', item.file));
    const enContent = await read(path.join(ROOT, 'template/.aios-lite/locales/en/agents', item.file));
    for (const token of item.tokens) {
      assert.equal(baseContent.includes(token), true, `missing in base ${item.file}: ${token}`);
      assert.equal(enContent.includes(token), true, `missing in en ${item.file}: ${token}`);
    }
  }
});
