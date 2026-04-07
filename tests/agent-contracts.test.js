'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { AGENT_DEFINITIONS, MANAGED_FILES } = require('../src/constants');

const ROOT = path.resolve(__dirname, '..');
const AGENTS = [
  'setup',
  'discovery-design-doc',
  'product',
  'deyvin',
  'analyst',
  'architect',
  'ux-ui',
  'pm',
  'dev',
  'qa',
  'neo',
  'sheldon',
  'tester',
  'orchestrator',
  'squad',
  'orache',
  'genome',
  'profiler-researcher',
  'profiler-enricher',
  'profiler-forge'
];

// Agents that ship only a base file (no locale variants)
const BASE_ONLY_AGENTS = [
  'copywriter',
  'design-hybrid-forge',
  'site-forge'
];

async function read(filePath) {
  return fs.readFile(filePath, 'utf8');
}

test('template ships all base and localized agent files', async () => {
  for (const agent of AGENTS) {
    const basePath = path.join(ROOT, 'template/.aioson/agents', `${agent}.md`);
    const enPath = path.join(ROOT, 'template/.aioson/locales/en/agents', `${agent}.md`);
    const ptPath = path.join(ROOT, 'template/.aioson/locales/pt-BR/agents', `${agent}.md`);
    const esPath = path.join(ROOT, 'template/.aioson/locales/es/agents', `${agent}.md`);
    const frPath = path.join(ROOT, 'template/.aioson/locales/fr/agents', `${agent}.md`);

    await assert.doesNotReject(() => fs.access(basePath));
    await assert.doesNotReject(() => fs.access(enPath));
    await assert.doesNotReject(() => fs.access(ptPath));
    await assert.doesNotReject(() => fs.access(esPath));
    await assert.doesNotReject(() => fs.access(frPath));
  }
});

test('template ships base file for base-only agents', async () => {
  for (const agent of BASE_ONLY_AGENTS) {
    const basePath = path.join(ROOT, 'template/.aioson/agents', `${agent}.md`);
    await assert.doesNotReject(
      () => fs.access(basePath),
      `missing base agent file for: ${agent}`
    );
  }
});

test('setup agent contract includes required context fields and service sections', async () => {
  const setupBase = await read(path.join(ROOT, 'template/.aioson/agents/setup.md'));
  const setupEn = await read(path.join(ROOT, 'template/.aioson/locales/en/agents/setup.md'));

  const requiredSnippets = [
    'project_name',
    'project_type',
    'profile',
    'framework_installed',
    'classification',
    'conversation_language',
    'design_skill',
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

test('workflow gate contract is explicit in AGENTS and setup locales', async () => {
  const agentsGateway = await read(path.join(ROOT, 'template/AGENTS.md'));
  const setupBase = await read(path.join(ROOT, 'template/.aioson/agents/setup.md'));
  const setupEn = await read(path.join(ROOT, 'template/.aioson/locales/en/agents/setup.md'));
  const setupPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/setup.md'));
  const setupEs = await read(path.join(ROOT, 'template/.aioson/locales/es/agents/setup.md'));
  const setupFr = await read(path.join(ROOT, 'template/.aioson/locales/fr/agents/setup.md'));

  const gatewayTokens = [
    '## Workflow enforcement',
    'must stay inside the workflow',
    'repair it inside the workflow',
    'Never silently bypass workflow',
    'Tracked execution in external clients',
    'does not guarantee runtime records in the dashboard'
  ];
  for (const token of gatewayTokens) {
    assert.equal(agentsGateway.includes(token), true, `missing AGENTS workflow token: ${token}`);
  }
  assert.equal(agentsGateway.includes('Do you want to execute this directly outside the workflow?'), false);
  assert.equal(agentsGateway.includes('aioson runtime-log . --agent=@{agent}'), false);

  const setupTokens = [
    [setupBase, 'Workflow gate after setup'],
    [setupBase, 'correct the file inside the workflow before handing off.'],
    [setupBase, 'Never offer direct execution outside the workflow as a setup shortcut.'],
    [setupBase, 'Never silently bypass workflow after setup.'],
    [setupEn, 'Workflow gate after setup'],
    [setupEn, 'correct the file inside the workflow before handing off.'],
    [setupEn, 'Never offer direct execution outside the workflow as a setup shortcut.'],
    [setupEn, 'Never silently bypass workflow after setup.'],
    [setupPt, 'Gate de workflow apos o setup'],
    [setupPt, 'corrigir o arquivo dentro do workflow antes do handoff.'],
    [setupPt, 'Nunca oferecer execucao direta fora do workflow como atalho do setup.'],
    [setupPt, 'Nunca contornar workflow em silencio apos o setup.'],
    [setupEs, 'Gate de workflow despues del setup'],
    [setupEs, 'corregir el archivo dentro del workflow antes del handoff.'],
    [setupEs, 'Nunca ofrecer ejecucion directa fuera del workflow como atajo del setup.'],
    [setupEs, 'Nunca saltar el workflow en silencio despues del setup.'],
    [setupFr, 'Gate workflow apres setup'],
    [setupFr, 'corriger le fichier dans le workflow avant le handoff.'],
    [setupFr, 'Ne jamais proposer une execution directe hors workflow comme raccourci du setup.'],
    [setupFr, 'Ne jamais contourner le workflow silencieusement apres setup.']
  ];

  for (const [content, token] of setupTokens) {
    assert.equal(content.includes(token), true, `missing setup workflow token: ${token}`);
  }
  assert.equal(setupBase.includes('Do you want to execute this directly outside the workflow?'), false);
  assert.equal(setupEn.includes('Do you want to execute this directly outside the workflow?'), false);
  assert.equal(setupPt.includes('Deseja executar direto fora do workflow?'), false);
  assert.equal(setupEs.includes('¿Quieres ejecutar esto directamente fuera del workflow?'), false);
  assert.equal(setupFr.includes('Voulez-vous executer cela directement hors workflow ?'), false);
});

test('setup auto-repairs inconsistent returning context before offering manual menu', async () => {
  const setupBase = await read(path.join(ROOT, 'template/.aioson/agents/setup.md'));
  const setupEn = await read(path.join(ROOT, 'template/.aioson/locales/en/agents/setup.md'));
  const setupPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/setup.md'));
  const setupEs = await read(path.join(ROOT, 'template/.aioson/locales/es/agents/setup.md'));
  const setupFr = await read(path.join(ROOT, 'template/.aioson/locales/fr/agents/setup.md'));

  const expected = [
    [setupBase, 'If the existing context is inconsistent, stale, or still contains placeholders'],
    [setupBase, 'do NOT stop at the menu first.'],
    [setupBase, 'Repair `.aioson/context/project.context.md` before asking the user what to do next.'],
    [setupBase, 'Only ask for clarification for fields that remain genuinely ambiguous after the repair pass.'],
    [setupEn, 'If the existing context is inconsistent, stale, or still contains placeholders'],
    [setupEn, 'do NOT stop at the menu first.'],
    [setupEn, 'Repair `.aioson/context/project.context.md` before asking the user what to do next.'],
    [setupEn, 'Only ask for clarification for fields that remain genuinely ambiguous after the repair pass.'],
    [setupPt, 'Se o contexto existente estiver inconsistente, desatualizado ou ainda contiver placeholders'],
    [setupPt, 'NAO parar no menu primeiro.'],
    [setupPt, 'Corrigir `.aioson/context/project.context.md` antes de perguntar ao usuario o que fazer em seguida.'],
    [setupPt, 'So pedir esclarecimento para campos que continuarem genuinamente ambiguos depois da etapa de reparo.'],
    [setupEs, 'Si el contexto existente esta inconsistente, desactualizado o todavia contiene placeholders'],
    [setupEs, 'NO detenerse primero en el menu.'],
    [setupEs, 'Corregir `.aioson/context/project.context.md` antes de preguntar al usuario que hacer a continuacion.'],
    [setupEs, 'Solo pedir aclaracion para campos que sigan genuinamente ambiguos despues de la etapa de reparacion.'],
    [setupFr, 'Si le contexte existant est incoherent, obsolete ou contient encore des placeholders'],
    [setupFr, "NE PAS s'arreter d'abord au menu."],
    [setupFr, "Corriger `.aioson/context/project.context.md` avant de demander a l'utilisateur quoi faire ensuite."],
    [setupFr, 'Ne demander une clarification que pour les champs qui restent reellement ambigus apres la passe de reparation.']
  ];

  for (const [content, token] of expected) {
    assert.equal(content.includes(token), true, `missing setup auto-repair token: ${token}`);
  }
});

test('core workflow agents repair context inside the workflow', async () => {
  const productBase = await read(path.join(ROOT, 'template/.aioson/agents/product.md'));
  const productPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/product.md'));
  const analystBase = await read(path.join(ROOT, 'template/.aioson/agents/analyst.md'));
  const analystPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/analyst.md'));
  const devBase = await read(path.join(ROOT, 'template/.aioson/agents/dev.md'));
  const devPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/dev.md'));
  const uxBase = await read(path.join(ROOT, 'template/.aioson/agents/ux-ui.md'));
  const uxPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/ux-ui.md'));

  const expected = [
    [productBase, 'Never use context repair as a reason to leave the workflow or suggest direct execution.'],
    [productPt, 'Nunca usar reparo de contexto como motivo para sair do workflow ou sugerir execucao direta.'],
    [analystBase, 'Never treat context repair as a reason to recommend execution outside the workflow.'],
    [analystPt, 'Nunca tratar reparo de contexto como motivo para recomendar execucao fora do workflow.'],
    [devBase, 'Never suggest direct execution outside the workflow as a workaround for stale context.'],
    [devPt, 'Nunca sugerir execucao direta fora do workflow como atalho para contexto desatualizado.'],
    [uxBase, 'never use context inconsistency as a reason to leave the workflow.'],
    [uxPt, 'nunca usar inconsistencia de contexto como motivo para sair do workflow.']
  ];

  for (const [content, token] of expected) {
    assert.equal(content.includes(token), true, `missing context-integrity token: ${token}`);
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
    const baseContent = await read(path.join(ROOT, 'template/.aioson/agents', item.file));
    const enContent = await read(path.join(ROOT, 'template/.aioson/locales/en/agents', item.file));
    for (const token of item.tokens) {
      assert.equal(baseContent.includes(token), true, `missing in base ${item.file}: ${token}`);
      assert.equal(enContent.includes(token), true, `missing in en ${item.file}: ${token}`);
    }
  }
});

test('discovery-design-doc contract formalizes design doc and readiness outputs', async () => {
  const baseContent = await read(path.join(ROOT, 'template/.aioson/agents/discovery-design-doc.md'));
  const ptContent = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/discovery-design-doc.md'));

  const baseTokens = [
    '.aioson/context/design-doc.md',
    '.aioson/context/readiness.md',
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
    '.aioson/squads/{squad-slug}/skills/',
    'Recommended docs/skills to load next',
    'Readiness total score',
    '0 to 5'
  ];

  const ptTokens = [
    '.aioson/context/design-doc.md',
    '.aioson/context/readiness.md',
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
    '.aioson/squads/{squad-slug}/skills/',
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
  const analystBase = await read(path.join(ROOT, 'template/.aioson/agents/analyst.md'));
  const analystPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/analyst.md'));
  const architectBase = await read(path.join(ROOT, 'template/.aioson/agents/architect.md'));
  const architectPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/architect.md'));
  const devBase = await read(path.join(ROOT, 'template/.aioson/agents/dev.md'));
  const devPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/dev.md'));

  const analystBaseTokens = ['## Skills and docs on demand', 'design-doc.md', 'readiness.md'];
  const analystPtTokens = ['## Skills e documentos sob demanda', 'design-doc.md', 'readiness.md'];
  const architectBaseTokens = ['design-doc.md', 'readiness.md', 'Load architecture docs and skills on demand'];
  const architectPtTokens = ['design-doc.md', 'readiness.md', 'Carregar documentos e skills de arquitetura sob demanda'];
  const devBaseTokens = ['design-doc.md', 'readiness.md', 'minimum context package', 'needs more discovery', '.aioson/squads/{squad-slug}/skills/', 'design_skill'];
  const devPtTokens = ['design-doc.md', 'readiness.md', 'pacote minimo de contexto', 'needs more discovery', '.aioson/squads/{squad-slug}/skills/', 'design_skill'];

  for (const token of analystBaseTokens) assert.equal(analystBase.includes(token), true, `missing analyst base token: ${token}`);
  for (const token of analystPtTokens) assert.equal(analystPt.includes(token), true, `missing analyst pt token: ${token}`);
  for (const token of architectBaseTokens) assert.equal(architectBase.includes(token), true, `missing architect base token: ${token}`);
  for (const token of architectPtTokens) assert.equal(architectPt.includes(token), true, `missing architect pt token: ${token}`);
  for (const token of devBaseTokens) assert.equal(devBase.includes(token), true, `missing dev base token: ${token}`);
  for (const token of devPtTokens) assert.equal(devPt.includes(token), true, `missing dev pt token: ${token}`);
});

test('ux-ui contract enforces explicit design skill gating', async () => {
  const uxBase = await read(path.join(ROOT, 'template/.aioson/agents/ux-ui.md'));
  const uxPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/ux-ui.md'));

  const baseTokens = [
    '## Step 0 — Design skill gate',
    'If `project_type=site` or `project_type=web_app` and `design_skill` is blank, stop and ask the user which installed design skill to use.',
    'Proceeding without a registered design skill.',
    'Never silently invent, swap, or auto-pick a design skill inside `@ux-ui`'
  ];

  const ptTokens = [
    '## Etapa 0 — Gate da design skill',
    'Se `project_type=site` ou `project_type=web_app` e `design_skill` estiver em branco, parar e perguntar ao usuario qual design skill instalada deve ser usada.',
    'Prosseguindo sem uma design skill registrada.',
    'Nunca inventar, trocar ou selecionar automaticamente uma design skill dentro do `@ux-ui`'
  ];

  for (const token of baseTokens) {
    assert.equal(uxBase.includes(token), true, `missing ux-ui base token: ${token}`);
  }

  for (const token of ptTokens) {
    assert.equal(uxPt.includes(token), true, `missing ux-ui pt token: ${token}`);
  }
});

test('living PRD contracts preserve downstream sections and QA hooks', async () => {
  const productBase = await read(path.join(ROOT, 'template/.aioson/agents/product.md'));
  const pmBase = await read(path.join(ROOT, 'template/.aioson/agents/pm.md'));
  const uxBase = await read(path.join(ROOT, 'template/.aioson/agents/ux-ui.md'));

  const productTokens = [
    'PRD base',
    'Design skill preservation',
    'If `project_type=site` or `project_type=web_app` and `design_skill` is blank',
    '.aioson/skills/design/{skill}/SKILL.md'
  ];
  const pmTokens = [
    'Update the same PRD file you read',
    '## Delivery plan',
    '## Acceptance criteria',
    '| AC | Description |',
    'Do not remove `🔴` bullets from `## MVP scope`.'
  ];
  const uxTokens = [
    'design skill reference (`skill: cognitive-ui` or another installed design skill) if applied',
    'pending-selection',
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

test('cognitive-core-ui packaged skill is shipped and managed', async () => {
  const managedPaths = [
    '.aioson/skills/design/cognitive-core-ui/SKILL.md',
    '.aioson/skills/design/cognitive-core-ui/references/design-tokens.md',
    '.aioson/skills/design/cognitive-core-ui/references/components.md',
    '.aioson/skills/design/cognitive-core-ui/references/patterns.md',
    '.aioson/skills/design/cognitive-core-ui/references/motion.md',
    '.aioson/skills/design/cognitive-core-ui/references/dashboards.md',
    '.aioson/skills/design/cognitive-core-ui/references/websites.md'
  ];

  for (const file of managedPaths) {
    assert.equal(MANAGED_FILES.includes(file), true, `missing managed file: ${file}`);
    await assert.doesNotReject(() => fs.access(path.join(ROOT, 'template', file)));
  }
});

test('additional packaged design skills are shipped and managed', async () => {
  const managedPaths = [
    '.aioson/skills/design/premium-command-center-ui/SKILL.md',
    '.aioson/skills/design/premium-command-center-ui/references/visual-system.md',
    '.aioson/skills/design/premium-command-center-ui/references/patterns.md',
    '.aioson/skills/design/premium-command-center-ui/references/operations.md',
    '.aioson/skills/design/premium-command-center-ui/references/validation.md',
    '.aioson/skills/design/interface-design/SKILL.md',
    '.aioson/skills/design/interface-design/references/intent-and-domain.md',
    '.aioson/skills/design/interface-design/references/design-directions.md',
    '.aioson/skills/design/interface-design/references/tokens-and-depth.md',
    '.aioson/skills/design/interface-design/references/components-and-states.md',
    '.aioson/skills/design/interface-design/references/handoff-and-quality.md'
  ];

  for (const file of managedPaths) {
    assert.equal(MANAGED_FILES.includes(file), true, `missing managed file: ${file}`);
    await assert.doesNotReject(() => fs.access(path.join(ROOT, 'template', file)));
  }
});

test('cognitive-core-ui documents token scope, brownfield usage, and premium table guardrails', async () => {
  const skill = await read(path.join(ROOT, 'template/.aioson/skills/design/cognitive-core-ui/SKILL.md'));
  const tokens_file = await read(path.join(ROOT, 'template/.aioson/skills/design/cognitive-core-ui/references/design-tokens.md'));
  const components = await read(path.join(ROOT, 'template/.aioson/skills/design/cognitive-core-ui/references/components.md'));
  const patterns = await read(path.join(ROOT, 'template/.aioson/skills/design/cognitive-core-ui/references/patterns.md'));

  const tokens = [
    '## Delivery modes',
    'Greenfield',
    'Brownfield',
    '## Token Scope Guardrails',
    ':root {',
    'If `body` consumes `var(--font-body)`, that variable must exist in `:root`',
    'border-collapse: separate;',
    '### Brownfield'
  ];

  for (const token of tokens) {
    const haystack = [skill, tokens_file, components, patterns].find((content) => content.includes(token));
    assert.equal(Boolean(haystack), true, `missing cognitive-core-ui guidance token: ${token}`);
  }
});

test('agent definitions expose PRD dependencies for the living PRD flow', () => {
  const product = AGENT_DEFINITIONS.find((agent) => agent.id === 'product');
  const ux = AGENT_DEFINITIONS.find((agent) => agent.id === 'ux-ui');
  const pm = AGENT_DEFINITIONS.find((agent) => agent.id === 'pm');
  const pair = AGENT_DEFINITIONS.find((agent) => agent.id === 'deyvin');

  assert.equal(product.dependsOn.includes('.aioson/context/project.context.md'), true);
  assert.equal(pair.dependsOn.includes('.aioson/context/project.context.md'), true);
  assert.equal(String(pair.output).includes('continuity'), true);
  assert.deepEqual(pair.aliases, ['pair']);
  assert.equal(ux.dependsOn.some((dep) => dep.includes('prd')), true);
  assert.equal(pm.dependsOn.some((dep) => dep.includes('prd')), true);
  assert.equal(String(ux.output).includes('Visual identity enrichment'), true);
  assert.equal(String(pm.output).includes('acceptance criteria'), true);
});

test('deyvin contract prioritizes rules, memory, runtime, and git fallback', async () => {
  const baseContent = await read(path.join(ROOT, 'template/.aioson/agents/deyvin.md'));
  const ptContent = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/deyvin.md'));

  const baseTokens = [
    'Project rules, docs & design docs',
    '.aioson/rules/',
    '.aioson/docs/',
    'memory-index.md',
    'spec-current.md',
    'spec-history.md',
    '.aioson/runtime/aios.sqlite',
    'Git is a fallback',
    '@product',
    '@analyst',
    '@architect'
  ];

  const ptTokens = [
    'Ordem de leitura no inicio da sessao',
    '.aioson/rules/',
    '.aioson/docs/',
    'memory-index.md',
    'spec-current.md',
    'spec-history.md',
    '.aioson/runtime/aios.sqlite',
    'Git e fallback',
    '@product',
    '@analyst',
    '@architect'
  ];

  for (const token of baseTokens) {
    assert.equal(baseContent.includes(token), true, `missing deyvin base token: ${token}`);
  }

  for (const token of ptTokens) {
    assert.equal(ptContent.includes(token), true, `missing deyvin pt token: ${token}`);
  }
});

test('deyvin contract hard-gates greenfield and oversized requests', async () => {
  const baseContent = await read(path.join(ROOT, 'template/.aioson/agents/deyvin.md'));
  const ptContent = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/deyvin.md'));

  const expected = [
    [baseContent, '## Immediate scope gate'],
    [baseContent, 'do not start implementation'],
    [baseContent, 'new project or greenfield build'],
    [baseContent, 'scope is large, vague, contradictory'],
    [baseContent, 'Reply only with the next agent and why:'],
    [baseContent, 'Treat prompts that change product identity mid-request as unclear scope'],
    [ptContent, '## Gate imediato de escopo'],
    [ptContent, 'nao iniciar implementacao'],
    [ptContent, 'projeto novo ou pedido greenfield'],
    [ptContent, 'o escopo for grande, vago, contraditorio'],
    [ptContent, 'Responder somente com o proximo agente e o motivo:'],
    [ptContent, 'mudar a identidade do produto no meio do pedido']
  ];

  for (const [content, token] of expected) {
    assert.equal(content.includes(token), true, `missing deyvin scope-gate token: ${token}`);
  }
});

test('squad and genome contracts include genome binding workflow', async () => {
  const squadBase = await read(path.join(ROOT, 'template/.aioson/agents/squad.md'));
  const squadPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/squad.md'));
  const genomeBase = await read(path.join(ROOT, 'template/.aioson/agents/genome.md'));
  const genomePt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/genome.md'));

  const squadTokens = [
    '## Discovery and design-doc before the squad',
    '## Parallel squads rule',
    '## AIOSON dashboard app',
    '## Genome binding to the squad',
    '## Active genomes',
    '## Response standard',
    'Reply in a single block if you want:',
    'project mode',
    'feature mode',
    'minimum docs/skills package',
    'readiness',
    'dashboard app is now installed separately from the CLI',
    'select the project folder that already contains `.aioson/`',
    'Do not tell the user to use `aioson dashboard:init`, `dashboard:dev`, or `dashboard:open`.',
    '## Squad content items',
    'contentBlueprints',
    'do not freeze the system into fixed fields like `script`, `titles`, or `description`',
    'AIOSON fixes the shell (`content_key`, `contentType`, `layoutType`, `payload_json`), not the domain-specific inner content',
    'Quick heuristic to choose `layoutType`:',
    'Heuristic to design `contentBlueprints`:',
    'prefer 1 strong primary blueprint before inventing many shallow blueprints',
    '"sections": [',
    '"key": "{section-key-1}"',
    '"blockTypes": ["rich-text"]',
    '- `blocks`',
    'output/{squad-slug}/{content-key}/index.html',
    'output/{squad-slug}/{content-key}/content.json',
    '.aioson/squads/{squad-slug}/agents/agents.md',
    '.aioson/squads/{squad-slug}/squad.manifest.json',
    '## Squad skills',
    '## Installed squad skills',
    '## Squad MCPs',
    '## Subagent policy',
    'media/{squad-slug}/',
    'output/{squad-slug}/{session-id}.html',
    'output/{squad-slug}/',
    'AgentGenomes:',
    'AGENTS.md: updated with `@agent` shortcuts',
    'Do NOT offer `Genome mode` as an initial `@squad` entry path.',
    'do not silently reuse the old squad',
    'HARD STOP — `@` ACTIVATION:',
    'Visual direction: sophisticated dark product UI, not neon dashboard UI',
    'do not collapse real work into headline-plus-one-line'
  ];

  const squadPtTokens = [
    '## Discovery e design doc antes da squad',
    '## Regra de paralelismo entre squads',
    '## App de dashboard do AIOSON',
    '## Vinculo de genomes ao squad',
    '## Genomes ativos',
    '## Padrao de resposta',
    'Me responda em um único bloco, se quiser:',
    'modo projeto',
    'modo feature',
    'pacote minimo de docs/skills',
    'prontidao',
    'app do dashboard agora e instalado separadamente do CLI',
    'selecionar a pasta do projeto que ja contem `.aioson/`',
    'Nao mande usar `aioson dashboard:init`, `dashboard:dev` ou `dashboard:open`.',
    '## Conteudos da squad',
    'contentBlueprints',
    'nao congele o sistema em campos fixos como `roteiro`, `titulos` ou `descricao`',
    'o AIOSON fixa a casca (`content_key`, `contentType`, `layoutType`, `payload_json`), nao o conteudo interno do dominio',
    'Heuristica rapida para escolher `layoutType`:',
    'Heuristica para desenhar `contentBlueprints`:',
    'prefira 1 blueprint principal bem resolvido antes de inventar varios blueprints superficiais',
    '"sections": [',
    '"key": "{section-key-1}"',
    '"blockTypes": ["rich-text"]',
    '- `blocks`',
    'output/{squad-slug}/{content-key}/index.html',
    'output/{squad-slug}/{content-key}/content.json',
    '.aioson/squads/{squad-slug}/agents/agents.md',
    '.aioson/squads/{squad-slug}/squad.manifest.json',
    '## Skills da squad',
    '## Skills instaladas da squad',
    '## MCPs da squad',
    '## Politica de subagentes',
    'media/{squad-slug}/',
    'output/{squad-slug}/{session-id}.html',
    'output/{squad-slug}/',
    'AgentGenomes:',
    'AGENTS.md: atualizado com atalhos `@agente`',
    'NÃO ofereça `Modo Genome` como etapa inicial do `@squad`.',
    'nao reutilize silenciosamente a squad antiga',
    'HARD STOP — ATIVAÇÃO VIA `@`:',
    'Direção visual: escuro sofisticado e técnico, inspirado em produto premium, não em dashboard neon',
    'não reduza o trabalho dos agentes a título + uma frase'
  ];

  const genomeTokens = [
    '[4] Apply this genome to an existing squad/agent',
    'AgentGenomes:',
    'Do not modify official `.aioson/agents/` files with user custom genomes',
    '## Persona Pipeline Integration',
    '@profiler-researcher',
    'version: 3',
    'format: genome-v3',
    '## Perfil Cognitivo',
    '## Estilo de Comunicação',
    '## Vieses e Pontos Cegos',
    'domain',
    'function',
    'persona',
    'hybrid',
    'evidence_mode',
    'sources_count',
    '## Filosofias',
    '## Modelos mentais',
    '## Heurísticas',
    '## Frameworks',
    '## Metodologias',
    '## Evidence',
    '## Application notes',
    '.meta.json',
    'depth controls density, not only size',
    'The Genome 2.0 should not become verbose by default'
  ];

  const genomePtTokens = [
    '[4] Aplicar este genome a um squad/agente já existente',
    'AgentGenomes:',
    'Não modifique agentes oficiais de `.aioson/agents/` com genomes customizados do usuário',
    '## Integracao com pipeline persona',
    '@profiler-researcher',
    'version: 3',
    'format: genome-v3',
    '## Perfil Cognitivo',
    '## Estilo de Comunicação',
    '## Vieses e Pontos Cegos',
    'domain',
    'function',
    'persona',
    'hybrid',
    'evidence_mode',
    'sources_count',
    '## Filosofias',
    '## Modelos mentais',
    '## Heurísticas',
    '## Frameworks',
    '## Metodologias',
    '## Evidence',
    '## Application notes',
    '.meta.json',
    'profundidade controla densidade, não só tamanho',
    'o Genome 2.0 não deve ficar verborrágico por padrão'
  ];

  for (const token of squadTokens) assert.equal(squadBase.includes(token), true, `missing squad base token: ${token}`);
  for (const token of squadPtTokens) assert.equal(squadPt.includes(token), true, `missing squad pt token: ${token}`);
  for (const token of genomeTokens) assert.equal(genomeBase.includes(token), true, `missing genome base token: ${token}`);
  for (const token of genomePtTokens) assert.equal(genomePt.includes(token), true, `missing genome pt token: ${token}`);
});

test('profiler agent contracts ship with workflow and localized wrappers', async () => {
  const researcherBase = await read(path.join(ROOT, 'template/.aioson/agents/profiler-researcher.md'));
  const enricherBase = await read(path.join(ROOT, 'template/.aioson/agents/profiler-enricher.md'));
  const forgeBase = await read(path.join(ROOT, 'template/.aioson/agents/profiler-forge.md'));
  const researcherPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/profiler-researcher.md'));
  const enricherPt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/profiler-enricher.md'));
  const forgePt = await read(path.join(ROOT, 'template/.aioson/locales/pt-BR/agents/profiler-forge.md'));

  const baseChecks = [
    [researcherBase, ['## Mission', '## Step 2 - Research protocol', 'research-report.md', 'DECISION', 'WORK-SAMPLE', '## Hard constraints', '.aioson/context/']],
    [enricherBase, ['## Mission', '## Step 3 - Extract the cognitive profile', 'DISC Profile', 'MBTI', 'enriched-profile.md', '## Hard constraints', '.aioson/context/']],
    [forgeBase, ['## Mission', 'Genome 3.0', 'Advisor Agent', 'genome-v3', '.aioson/advisors/{person-slug}-advisor.md', '## Hard constraints', '.aioson/context/']]
  ];

  for (const [content, tokens] of baseChecks) {
    for (const token of tokens) {
      assert.equal(content.includes(token), true, `missing profiler base token: ${token}`);
    }
  }

  const localeChecks = [
    [researcherPt, /INSTRU(?:CAO|ÇÃO) ABSOLUTA/, '.aioson/agents/profiler-researcher.md'],
    [enricherPt, /INSTRU(?:CAO|ÇÃO) ABSOLUTA/, '.aioson/agents/profiler-enricher.md'],
    [forgePt, /INSTRU(?:CAO|ÇÃO) ABSOLUTA/, '.aioson/agents/profiler-forge.md']
  ];

  for (const [content, instructionPattern, basePathToken] of localeChecks) {
    assert.equal(instructionPattern.test(content), true, `missing profiler locale instruction: ${instructionPattern}`);
    assert.equal(content.includes(basePathToken), true, `missing profiler locale base path: ${basePathToken}`);
  }
});
