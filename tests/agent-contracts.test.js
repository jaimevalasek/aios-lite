'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { AGENT_DEFINITIONS, MANAGED_FILES } = require('../src/constants');

const ROOT = path.resolve(__dirname, '..');
const EXTRA_CANONICAL_AGENTS = ['copywriter', 'design-hybrid-forge', 'site-forge'];

async function read(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function collectFiles(dirPath, found = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return found;
    throw error;
  }

  for (const entry of entries) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(nextPath, found);
      continue;
    }
    found.push(nextPath);
  }
  return found;
}

test('template ships canonical base agent files for all managed agents', async () => {
  const canonicalAgents = [
    ...new Set([
      ...AGENT_DEFINITIONS.map((agent) => agent.id),
      ...EXTRA_CANONICAL_AGENTS
    ])
  ];

  for (const agent of canonicalAgents) {
    await assert.doesNotReject(
      () => fs.access(path.join(ROOT, 'template/.aioson/agents', `${agent}.md`)),
      `missing canonical template agent: ${agent}`
    );
  }
});

test('locale agent packs are no longer shipped in template or workspace', async () => {
  const templateFiles = await collectFiles(path.join(ROOT, 'template/.aioson/locales'));
  const workspaceFiles = await collectFiles(path.join(ROOT, '.aioson/locales'));

  const templateAgentFiles = templateFiles.filter((file) => /[/\\]agents[/\\].+\.md$/.test(file));
  const workspaceAgentFiles = workspaceFiles.filter((file) => /[/\\]agents[/\\].+\.md$/.test(file));

  assert.equal(templateAgentFiles.length, 0);
  assert.equal(workspaceAgentFiles.length, 0);
});

test('managed file list excludes locale agent packs', () => {
  assert.equal(
    MANAGED_FILES.some((file) => file.startsWith('.aioson/locales/') && file.includes('/agents/')),
    false
  );
});

test('setup agent contract includes canonical language boundary and workflow gate', async () => {
  const setup = await read(path.join(ROOT, 'template/.aioson/agents/setup.md'));

  const requiredSnippets = [
    'LANGUAGE BOUNDARY',
    'interaction_language',
    'conversation_language',
    'Workflow gate after setup',
    'Repair `.aioson/context/project.context.md` before asking the user what to do next.',
    'Never silently bypass workflow after setup.',
    'restores the canonical prompts and synchronizes the selected `interaction_language`'
  ];

  for (const token of requiredSnippets) {
    assert.equal(setup.includes(token), true, `missing setup token: ${token}`);
  }
});

test('core workflow agents repair context inside the workflow', async () => {
  const product = await read(path.join(ROOT, 'template/.aioson/agents/product.md'));
  const analyst = await read(path.join(ROOT, 'template/.aioson/agents/analyst.md'));
  const dev = await read(path.join(ROOT, 'template/.aioson/agents/dev.md'));
  const ux = await read(path.join(ROOT, 'template/.aioson/agents/ux-ui.md'));

  const checks = [
    [product, 'Never use context repair as a reason to leave the workflow or suggest direct execution.'],
    [analyst, 'Never treat context repair as a reason to recommend execution outside the workflow.'],
    [dev, 'Never suggest direct execution outside the workflow as a workaround for stale context.'],
    [ux, 'never use context inconsistency as a reason to leave the workflow.']
  ];

  for (const [content, token] of checks) {
    assert.equal(content.includes(token), true, `missing context-integrity token: ${token}`);
  }
});

test('core agent contracts keep actionable sections in canonical prompts', async () => {
  const checks = [
    {
      file: 'discovery-design-doc.md',
      tokens: ['## Mission', '## Responsibilities', '## Output contract', 'design-doc.md', 'readiness.md']
    },
    {
      file: 'analyst.md',
      tokens: ['## Mission', '## Classification scoring', '### Output contract — feature mode', '## Output contract']
    },
    {
      file: 'architect.md',
      tokens: ['## Mission', '## Responsibilities', '## Output contract', 'design-doc.md', 'readiness.md']
    },
    {
      file: 'dev.md',
      tokens: ['## Mission', '## Session start protocol', '## Context integrity', '## Implementation strategy']
    },
    {
      file: 'orchestrator.md',
      tokens: ['## Mission', '## Status file protocol', '## Session protocol', '### Session start', '### Session end']
    },
    {
      file: 'ux-ui.md',
      tokens: ['## Mission', '## Step 0 — Design skill gate', '## Output contract']
    },
    {
      file: 'qa.md',
      tokens: ['## Mission', '## Risk-first checklist', '#### Critical']
    }
  ];

  for (const item of checks) {
    const content = await read(path.join(ROOT, 'template/.aioson/agents', item.file));
    for (const token of item.tokens) {
      assert.equal(content.includes(token), true, `missing in ${item.file}: ${token}`);
    }
  }
});

test('living PRD flow preserves visual identity and design-skill gating', async () => {
  const product = await read(path.join(ROOT, 'template/.aioson/agents/product.md'));
  const pm = await read(path.join(ROOT, 'template/.aioson/agents/pm.md'));
  const ux = await read(path.join(ROOT, 'template/.aioson/agents/ux-ui.md'));

  const checks = [
    [product, 'PRD base'],
    [product, '## Visual identity'],
    [product, 'If pending: write `pending-selection`'],
    [product, 'ask explicitly whether to register one of the installed design skills'],
    [pm, 'Update the same PRD file you read'],
    [pm, '## Delivery plan'],
    [pm, '## Acceptance criteria'],
    [pm, 'Never remove or condense `Visual identity`.'],
    [ux, '## Step 0 — Design skill gate'],
    [ux, 'stop and ask the user which installed design skill to use.'],
    [ux, 'pending-selection'],
    [ux, 'If the PRD does not yet contain `## Visual identity`']
  ];

  for (const [content, token] of checks) {
    assert.equal(content.includes(token), true, `missing PRD token: ${token}`);
  }
});

test('deyvin contract prioritizes memory and hard-gates oversized requests', async () => {
  const deyvin = await read(path.join(ROOT, 'template/.aioson/agents/deyvin.md'));

  const tokens = [
    '## Immediate scope gate',
    'do not start implementation',
    'Reply only with the next agent and why:',
    'memory-index.md',
    'spec-current.md',
    'spec-history.md',
    'Git is a fallback'
  ];

  for (const token of tokens) {
    assert.equal(deyvin.includes(token), true, `missing deyvin token: ${token}`);
  }
});

test('squad and genome contracts stay canonical and preserve genome workflow', async () => {
  const squad = await read(path.join(ROOT, 'template/.aioson/agents/squad.md'));
  const genome = await read(path.join(ROOT, 'template/.aioson/agents/genome.md'));

  const squadTokens = [
    'LANGUAGE BOUNDARY',
    'Lite mode',
    'Genome mode',
    '## Executor classification',
    '## Agent generation'
  ];
  const genomeTokens = [
    'interaction_language',
    '## Persona Pipeline Integration',
    'version: 3',
    'format: genome-v3',
    'Do not modify official `.aioson/agents/` files with user custom genomes',
    'The Genome 2.0 should not become verbose by default'
  ];

  for (const token of squadTokens) {
    assert.equal(squad.includes(token), true, `missing squad token: ${token}`);
  }
  for (const token of genomeTokens) {
    assert.equal(genome.includes(token), true, `missing genome token: ${token}`);
  }
});

test('profiler agents ship canonical prompts with interaction-language guidance', async () => {
  const researcher = await read(path.join(ROOT, 'template/.aioson/agents/profiler-researcher.md'));
  const enricher = await read(path.join(ROOT, 'template/.aioson/agents/profiler-enricher.md'));
  const forge = await read(path.join(ROOT, 'template/.aioson/agents/profiler-forge.md'));

  const checks = [
    [researcher, ['interaction_language', '## Mission', '## Step 2 - Research protocol', 'research-report.md']],
    [enricher, ['interaction_language', '## Mission', '## Step 3 - Extract the cognitive profile', 'enriched-profile.md']],
    [forge, ['interaction_language', '## Mission', 'Genome 3.0', 'Advisor Agent', 'format: genome-v3', '.aioson/advisors/']]
  ];

  for (const [content, tokens] of checks) {
    for (const token of tokens) {
      assert.equal(content.includes(token), true, `missing profiler token: ${token}`);
    }
    assert.equal(content.includes('INSTRUÇÃO ABSOLUTA'), false);
    assert.equal(content.includes('INSTRUCAO ABSOLUTA'), false);
  }
});

test('packaged design skills are shipped and managed', async () => {
  const managedPaths = [
    '.aioson/skills/design/cognitive-core-ui/SKILL.md',
    '.aioson/skills/design/cognitive-core-ui/references/design-tokens.md',
    '.aioson/skills/design/cognitive-core-ui/references/components.md',
    '.aioson/skills/design/cognitive-core-ui/references/patterns.md',
    '.aioson/skills/design/cognitive-core-ui/references/motion.md',
    '.aioson/skills/design/cognitive-core-ui/references/dashboards.md',
    '.aioson/skills/design/cognitive-core-ui/references/websites.md',
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

test('agent definitions expose PRD dependencies for the living PRD flow', () => {
  const product = AGENT_DEFINITIONS.find((agent) => agent.id === 'product');
  const ux = AGENT_DEFINITIONS.find((agent) => agent.id === 'ux-ui');
  const pm = AGENT_DEFINITIONS.find((agent) => agent.id === 'pm');
  const deyvin = AGENT_DEFINITIONS.find((agent) => agent.id === 'deyvin');

  assert.equal(product.dependsOn.includes('.aioson/context/project.context.md'), true);
  assert.equal(deyvin.dependsOn.includes('.aioson/context/project.context.md'), true);
  assert.deepEqual(deyvin.aliases, ['pair']);
  assert.equal(ux.dependsOn.some((dep) => dep.includes('prd')), true);
  assert.equal(pm.dependsOn.some((dep) => dep.includes('prd')), true);
  assert.equal(String(ux.output).includes('Visual identity enrichment'), true);
  assert.equal(String(pm.output).includes('acceptance criteria'), true);
});
