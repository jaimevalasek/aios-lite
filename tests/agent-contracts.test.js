'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS = ['setup', 'analyst', 'architect', 'ux-ui', 'pm', 'dev', 'qa', 'orchestrator', 'squad', 'genoma'];

async function read(filePath) {
  return fs.readFile(filePath, 'utf8');
}

test('template ships all base and localized agent files', async () => {
  for (const agent of AGENTS) {
    const basePath = path.join(ROOT, 'template/.aios-lite/agents', `${agent}.md`);
    const enPath = path.join(ROOT, 'template/.aios-lite/locales/en/agents', `${agent}.md`);
    const ptPath = path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents', `${agent}.md`);
    const esPath = path.join(ROOT, 'template/.aios-lite/locales/es/agents', `${agent}.md`);
    const frPath = path.join(ROOT, 'template/.aios-lite/locales/fr/agents', `${agent}.md`);

    await assert.doesNotReject(() => fs.access(basePath));
    await assert.doesNotReject(() => fs.access(enPath));
    await assert.doesNotReject(() => fs.access(ptPath));
    await assert.doesNotReject(() => fs.access(esPath));
    await assert.doesNotReject(() => fs.access(frPath));
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
      tokens: ['Working rules', 'Implementation strategy', 'Laravel conventions', 'Responsibility boundary', 'Atomic execution']
    },
    {
      file: 'orchestrator.md',
      tokens: ['Session protocol', 'Status file protocol', 'Session start', 'Session end']
    },
    {
      file: 'ux-ui.md',
      tokens: ['Mission', 'Working rules', 'Output contract']
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

test('squad and genoma contracts include genome binding workflow', async () => {
  const squadBase = await read(path.join(ROOT, 'template/.aios-lite/agents/squad.md'));
  const squadPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/squad.md'));
  const genomaBase = await read(path.join(ROOT, 'template/.aios-lite/agents/genoma.md'));
  const genomaPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/genoma.md'));

  const squadTokens = [
    '## Genome binding to the squad',
    '## Active genomes',
    'Reply in a single block if you want:',
    'output/{squad-slug}/{session-id}.html',
    'output/{squad-slug}/',
    'AgentGenomes:',
    'AGENTS.md: updated with `@agent` shortcuts',
    'Do NOT offer `Genoma mode` as an initial `@squad` entry path.',
    'HARD STOP — `@` ACTIVATION:'
  ];

  const squadPtTokens = [
    '## Vinculo de genomas ao squad',
    '## Genomas ativos',
    'Me responda em um único bloco, se quiser:',
    'output/{squad-slug}/{session-id}.html',
    'output/{squad-slug}/',
    'AgentGenomes:',
    'AGENTS.md: atualizado com atalhos `@agente`',
    'NÃO ofereça `Modo Genoma` como etapa inicial do `@squad`.',
    'HARD STOP — ATIVAÇÃO VIA `@`:'
  ];

  const genomaTokens = [
    '[4] Apply this genome to an existing squad/agent',
    'AgentGenomes:',
    'Do not modify official `.aios-lite/agents/` files with user custom genomes'
  ];

  const genomaPtTokens = [
    '[4] Aplicar este genoma a um squad/agente já existente',
    'AgentGenomes:',
    'Não modifique agentes oficiais de `.aios-lite/agents/` com genomas customizados do usuário'
  ];

  for (const token of squadTokens) assert.equal(squadBase.includes(token), true, `missing squad base token: ${token}`);
  for (const token of squadPtTokens) assert.equal(squadPt.includes(token), true, `missing squad pt token: ${token}`);
  for (const token of genomaTokens) assert.equal(genomaBase.includes(token), true, `missing genoma base token: ${token}`);
  for (const token of genomaPtTokens) assert.equal(genomaPt.includes(token), true, `missing genoma pt token: ${token}`);
});
