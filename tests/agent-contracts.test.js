'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { AGENT_DEFINITIONS } = require('../src/constants');

const ROOT = path.resolve(__dirname, '..');
const AGENTS = ['setup', 'discovery-design-doc', 'analyst', 'architect', 'ux-ui', 'pm', 'dev', 'qa', 'orchestrator', 'squad', 'genoma'];

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
      file: 'discovery-design-doc.md',
      tokens: ['Mission', 'Responsibilities', 'Output contract', 'design-doc.md', 'readiness.md']
    },
    {
      file: 'analyst.md',
      tokens: ['Phase 1', 'Phase 2', 'Phase 3', 'Classification']
    },
    {
      file: 'architect.md',
      tokens: ['Rules', 'Responsibilities', 'Output contract', 'design-doc.md', 'readiness.md']
    },
    {
      file: 'dev.md',
      tokens: ['Working rules', 'Implementation strategy', 'Laravel conventions', 'Responsibility boundary', 'Atomic execution', 'design-doc.md', 'readiness.md']
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

test('discovery-design-doc contract formalizes design doc and readiness outputs', async () => {
  const baseContent = await read(path.join(ROOT, 'template/.aios-lite/agents/discovery-design-doc.md'));
  const ptContent = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/discovery-design-doc.md'));

  const baseTokens = [
    '.aios-lite/context/design-doc.md',
    '.aios-lite/context/readiness.md',
    'Identify what is already defined and what is still ambiguous',
    'If readiness is low, do not pretend certainty.',
    'ready for planning',
    'Governance / references',
    'Context and motivation',
    'Glossary / key terms',
    'Technical flow step-by-step',
    'Risks and mitigations',
    'Roadmap / MVP cut',
    '## Guided questioning',
    '## Discovery vs design-doc',
    '## Mode detection',
    '## Objective readiness rubric',
    'Project mode',
    'Feature mode',
    '## Skills and docs on demand',
    '.aios-lite/squads/{squad-slug}/skills/',
    'Recommended docs/skills to load next',
    'Readiness total score',
    '0 to 5'
  ];

  const ptTokens = [
    '.aios-lite/context/design-doc.md',
    '.aios-lite/context/readiness.md',
    'Identificar o que ja esta definido e o que ainda esta ambiguo',
    'Se a prontidao estiver baixa, nao finja certeza.',
    'ready for planning',
    'Governanca / referencias',
    'Contexto e motivacao',
    'Glossario / termos-chave',
    'Fluxo tecnico passo a passo',
    'Riscos e mitigacoes',
    'Roadmap / corte de MVP',
    '## Perguntas guiadas',
    '## Discovery vs design-doc',
    '## Deteccao de modo',
    '## Rubrica objetiva de prontidao',
    'Modo projeto',
    'Modo feature',
    '## Skills e documentos sob demanda',
    '.aios-lite/squads/{squad-slug}/skills/',
    'Docs/skills recomendados para carregar a seguir',
    'Readiness score total',
    '0 a 5'
  ];

  for (const token of baseTokens) {
    assert.equal(baseContent.includes(token), true, `missing discovery-design-doc base token: ${token}`);
  }

  for (const token of ptTokens) {
    assert.equal(ptContent.includes(token), true, `missing discovery-design-doc pt token: ${token}`);
  }
});

test('analyst, architect, and dev consume design-doc/readiness and use context on demand', async () => {
  const analystBase = await read(path.join(ROOT, 'template/.aios-lite/agents/analyst.md'));
  const analystPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/analyst.md'));
  const architectBase = await read(path.join(ROOT, 'template/.aios-lite/agents/architect.md'));
  const architectPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/architect.md'));
  const devBase = await read(path.join(ROOT, 'template/.aios-lite/agents/dev.md'));
  const devPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/dev.md'));

  const analystBaseTokens = ['## Skills and docs on demand', 'design-doc.md', 'readiness.md'];
  const analystPtTokens = ['## Skills e documentos sob demanda', 'design-doc.md', 'readiness.md'];
  const architectBaseTokens = ['design-doc.md', 'readiness.md', 'Load architecture docs and skills on demand'];
  const architectPtTokens = ['design-doc.md', 'readiness.md', 'Carregar documentos e skills de arquitetura sob demanda'];
  const devBaseTokens = ['design-doc.md', 'readiness.md', 'minimum context package', 'needs more discovery', '.aios-lite/squads/{squad-slug}/skills/'];
  const devPtTokens = ['design-doc.md', 'readiness.md', 'pacote minimo de contexto', 'needs more discovery', '.aios-lite/squads/{squad-slug}/skills/'];

  for (const token of analystBaseTokens) assert.equal(analystBase.includes(token), true, `missing analyst base token: ${token}`);
  for (const token of analystPtTokens) assert.equal(analystPt.includes(token), true, `missing analyst pt token: ${token}`);
  for (const token of architectBaseTokens) assert.equal(architectBase.includes(token), true, `missing architect base token: ${token}`);
  for (const token of architectPtTokens) assert.equal(architectPt.includes(token), true, `missing architect pt token: ${token}`);
  for (const token of devBaseTokens) assert.equal(devBase.includes(token), true, `missing dev base token: ${token}`);
  for (const token of devPtTokens) assert.equal(devPt.includes(token), true, `missing dev pt token: ${token}`);
});

test('ux-ui contract supports autonomous visual decisions', async () => {
  const uxBase = await read(path.join(ROOT, 'template/.aios-lite/agents/ux-ui.md'));
  const uxPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/ux-ui.md'));

  const baseTokens = [
    '## Step 0 — Autonomous visual direction decision',
    'Autonomous decision-making: infer dark/light and visual direction from context whenever possible.',
    'Premium Dark Platform',
    'Never block the work if the inference is already good enough.'
  ];

  const ptTokens = [
    '## Etapa 0 — Decisao autonoma de direcao visual',
    'Decisao autonoma: inferir dark/light e direcao visual pelo contexto sempre que possivel.',
    'Premium Dark Platform',
    'Nunca bloqueie o trabalho por falta dessa resposta se a inferencia ja for suficientemente boa.'
  ];

  for (const token of baseTokens) {
    assert.equal(uxBase.includes(token), true, `missing ux-ui base token: ${token}`);
  }

  for (const token of ptTokens) {
    assert.equal(uxPt.includes(token), true, `missing ux-ui pt token: ${token}`);
  }
});

test('living PRD contracts preserve downstream sections and QA hooks', async () => {
  const productBase = await read(path.join(ROOT, 'template/.aios-lite/agents/product.md'));
  const pmBase = await read(path.join(ROOT, 'template/.aios-lite/agents/pm.md'));
  const uxBase = await read(path.join(ROOT, 'template/.aios-lite/agents/ux-ui.md'));

  const productTokens = [
    'PRD base',
    'premium-command-center-ui',
    'Do **not** register this skill for generic mentions of `dashboard`, `admin panel`, or `internal tool` alone.'
  ];
  const pmTokens = [
    'Update the same PRD file you read',
    '## Delivery plan',
    '## Acceptance criteria',
    '| AC | Description |',
    'Do not remove `🔴` bullets from `## MVP scope`.'
  ];
  const uxTokens = [
    'Do not load this skill by default for every dashboard, admin panel, or internal tool.',
    'If the PRD does not yet contain `## Visual identity` and the design direction is now clear, create that section first'
  ];

  for (const token of productTokens) {
    assert.equal(productBase.includes(token), true, `missing product token: ${token}`);
  }
  for (const token of pmTokens) {
    assert.equal(pmBase.includes(token), true, `missing pm token: ${token}`);
  }
  for (const token of uxTokens) {
    assert.equal(uxBase.includes(token), true, `missing ux-ui token: ${token}`);
  }
});

test('agent definitions expose PRD dependencies for the living PRD flow', () => {
  const product = AGENT_DEFINITIONS.find((agent) => agent.id === 'product');
  const ux = AGENT_DEFINITIONS.find((agent) => agent.id === 'ux-ui');
  const pm = AGENT_DEFINITIONS.find((agent) => agent.id === 'pm');

  assert.equal(product.dependsOn.includes('.aios-lite/context/project.context.md'), true);
  assert.equal(ux.dependsOn.some((dep) => dep.includes('prd')), true);
  assert.equal(pm.dependsOn.some((dep) => dep.includes('prd')), true);
  assert.equal(String(ux.output).includes('Visual identity enrichment'), true);
  assert.equal(String(pm.output).includes('acceptance criteria'), true);
});

test('squad and genoma contracts include genome binding workflow', async () => {
  const squadBase = await read(path.join(ROOT, 'template/.aios-lite/agents/squad.md'));
  const squadPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/squad.md'));
  const genomaBase = await read(path.join(ROOT, 'template/.aios-lite/agents/genoma.md'));
  const genomaPt = await read(path.join(ROOT, 'template/.aios-lite/locales/pt-BR/agents/genoma.md'));

  const squadTokens = [
    '## Discovery and design-doc before the squad',
    '## Parallel squads rule',
    '## AIOS Lite local dashboard',
    '## Genome binding to the squad',
    '## Active genomes',
    '## Response standard',
    'Reply in a single block if you want:',
    'project mode',
    'feature mode',
    'minimum docs/skills package',
    'readiness',
    'aios-lite dashboard:init .',
    'aios-lite dashboard:dev . --port=3000',
    'aios-lite dashboard:open . --port=3000',
    '## Squad content items',
    'contentBlueprints',
    'do not freeze the system into fixed fields like `script`, `titles`, or `description`',
    'AIOS Lite fixes the shell (`content_key`, `contentType`, `layoutType`, `payload_json`), not the domain-specific inner content',
    'Quick heuristic to choose `layoutType`:',
    'Heuristic to design `contentBlueprints`:',
    'prefer 1 strong primary blueprint before inventing many shallow blueprints',
    '"sections": [',
    '"key": "{section-key-1}"',
    '"blockTypes": ["rich-text"]',
    '- `blocks`',
    'output/{squad-slug}/{content-key}/index.html',
    'output/{squad-slug}/{content-key}/content.json',
    '.aios-lite/squads/{squad-slug}/agents/agents.md',
    '.aios-lite/squads/{squad-slug}/squad.manifest.json',
    '## Squad skills',
    '## Installed squad skills',
    '## Squad MCPs',
    '## Subagent policy',
    'media/{squad-slug}/',
    'output/{squad-slug}/{session-id}.html',
    'output/{squad-slug}/',
    'AgentGenomes:',
    'AGENTS.md: updated with `@agent` shortcuts',
    'Do NOT offer `Genoma mode` as an initial `@squad` entry path.',
    'do not silently reuse the old squad',
    'HARD STOP — `@` ACTIVATION:',
    'Visual direction: sophisticated dark product UI, not neon dashboard UI',
    'do not collapse real work into headline-plus-one-line'
  ];

  const squadPtTokens = [
    '## Discovery e design doc antes da squad',
    '## Regra de paralelismo entre squads',
    '## Dashboard local do AIOS Lite',
    '## Vinculo de genomas ao squad',
    '## Genomas ativos',
    '## Padrao de resposta',
    'Me responda em um único bloco, se quiser:',
    'modo projeto',
    'modo feature',
    'pacote minimo de docs/skills',
    'prontidao',
    'aios-lite dashboard:init .',
    'aios-lite dashboard:dev . --port=3000',
    'aios-lite dashboard:open . --port=3000',
    '## Conteudos da squad',
    'contentBlueprints',
    'nao congele o sistema em campos fixos como `roteiro`, `titulos` ou `descricao`',
    'o AIOS Lite fixa a casca (`content_key`, `contentType`, `layoutType`, `payload_json`), nao o conteudo interno do dominio',
    'Heuristica rapida para escolher `layoutType`:',
    'Heuristica para desenhar `contentBlueprints`:',
    'prefira 1 blueprint principal bem resolvido antes de inventar varios blueprints superficiais',
    '"sections": [',
    '"key": "{section-key-1}"',
    '"blockTypes": ["rich-text"]',
    '- `blocks`',
    'output/{squad-slug}/{content-key}/index.html',
    'output/{squad-slug}/{content-key}/content.json',
    '.aios-lite/squads/{squad-slug}/agents/agents.md',
    '.aios-lite/squads/{squad-slug}/squad.manifest.json',
    '## Skills da squad',
    '## Skills instaladas da squad',
    '## MCPs da squad',
    '## Politica de subagentes',
    'media/{squad-slug}/',
    'output/{squad-slug}/{session-id}.html',
    'output/{squad-slug}/',
    'AgentGenomes:',
    'AGENTS.md: atualizado com atalhos `@agente`',
    'NÃO ofereça `Modo Genoma` como etapa inicial do `@squad`.',
    'nao reutilize silenciosamente a squad antiga',
    'HARD STOP — ATIVAÇÃO VIA `@`:',
    'Direção visual: escuro sofisticado e técnico, inspirado em produto premium, não em dashboard neon',
    'não reduza o trabalho dos agentes a título + uma frase'
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
