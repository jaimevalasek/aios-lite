'use strict';

/**
 * Governance files are ABOUT the product, never the product. Authoring a skill
 * description that says "boards, cards, forms" pulled the kanban and form
 * rules into the edit — observed live while adding routing frontmatter to the
 * shipped SKILL.md set. The guard now injects into `.aioson/{rules,docs,
 * design-docs,skills,installed-skills,agents,brains,evals,learnings,config}`
 * only when a rule explicitly declared those files in `paths:`; briefings and
 * explorations stay injectable — a prototype there IS a product surface.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { buildGuardResponse, isGovernanceArtifact } = require('../src/context-guard');

const ROOT = path.resolve(__dirname, '..');

async function writeFile(dir, relPath, content) {
  const absPath = path.join(dir, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf8');
}

async function shippedRulesProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-guard-gov-'));
  await writeFile(dir, '.aioson/context/project.context.md', [
    '---', 'framework: Node.js', 'project_type: web-app', 'load_tier: always', '---', '# Project'
  ].join('\n'));
  await fs.cp(path.join(ROOT, 'template', '.aioson', 'rules'), path.join(dir, '.aioson', 'rules'), { recursive: true });
  return dir;
}

const SKILL_BODY = [
  'Use when the product implies workspaces, boards, cards, pipelines,',
  'operational CRUD, or Kanban-like drag and drop between stages with form',
  'validation and confirmation modals.'
].join('\n');

test('editing a SKILL.md or a rule about boards and forms pulls no domain rules', async () => {
  const dir = await shippedRulesProject();
  try {
    for (const filePath of [
      '.aioson/skills/process/scope/SKILL.md',
      '.aioson/rules/my-board-rule.md',
      '.aioson/docs/product/board-contract.md'
    ]) {
      const response = await buildGuardResponse({
        tool_name: 'Edit',
        tool_input: { file_path: filePath, new_string: SKILL_BODY }
      }, dir, { tool: 'claude', agent: 'dev' });
      assert.deepEqual(response, {}, `${filePath} pulled ${JSON.stringify(response._guard || response)}`);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a briefing prototype is still a product surface and keeps its injection', async () => {
  const dir = await shippedRulesProject();
  try {
    const response = await buildGuardResponse({
      tool_name: 'Write',
      tool_input: {
        file_path: '.aioson/briefings/landing/prototype.html',
        content: '<form id="cadastro"><label for="cpf">CPF</label><input id="cpf" name="cpf" inputmode="numeric" /><button type="submit">Salvar</button></form>'
      }
    }, dir, { tool: 'claude', agent: 'refiner' });
    assert.ok(response._guard && response._guard.injected, 'a real prototype form gets the form rule');
    assert.ok(
      response._guard.rules.includes('.aioson/rules/form-fields-masks-and-validation.md'),
      JSON.stringify(response._guard.rules)
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a rule that declares paths over a governance tree still injects there', async () => {
  const dir = await shippedRulesProject();
  try {
    await writeFile(dir, '.aioson/rules/skill-authoring-contract.md', [
      '---',
      'name: skill-authoring-contract',
      'description: contract for authoring skill routers',
      'entities: [SKILL]',
      'triggers: [skill router]',
      'paths: [".aioson/skills/**"]',
      '---',
      '## Required behavior',
      '- Keep the router under the size budget and move craft into references/.'
    ].join('\n'));
    const response = await buildGuardResponse({
      tool_name: 'Edit',
      tool_input: {
        file_path: '.aioson/skills/process/scope/SKILL.md',
        new_string: '# Skill router\nDescribe when the SKILL fires and keep the skill router lean.'
      }
    }, dir, { tool: 'claude', agent: 'dev' });
    assert.ok(response._guard && response._guard.injected, 'declared paths over .aioson/skills still inject');
    assert.deepEqual(response._guard.rules, ['.aioson/rules/skill-authoring-contract.md']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the source-code language rule guards code files, not the prose that talks about code', async () => {
  // `paths: ['**']` made every markdown edit that mentioned "function" or
  // "implementar" carry the identifier rule — a learning note, a README, a
  // PRD. The rule is law in every brief (`load_tier: always`); the guard leg
  // now fires only where identifiers are actually written.
  const dir = await shippedRulesProject();
  // "naming convention" is one of the rule's aliases — the domain signal that
  // lets a rule inject at all; the narrowed `paths` is what keeps it off prose.
  const prose = 'Implementar a funcao de refactor seguindo a naming convention: mover as classes do servico para o modulo novo e nomear as rotas.';
  try {
    for (const filePath of ['.aioson/learnings/gotchas/note.md', 'README.md', 'docs/deploy.md']) {
      const response = await buildGuardResponse({
        tool_name: 'Write',
        tool_input: { file_path: filePath, content: prose }
      }, dir, { tool: 'claude', agent: 'dev' });
      const rules = (response._guard && response._guard.rules) || [];
      assert.ok(!rules.includes('.aioson/rules/source-code-language-convention.md'), `${filePath} pulled the identifier rule: ${JSON.stringify(rules)}`);
    }
    const code = await buildGuardResponse({
      tool_name: 'Write',
      tool_input: { file_path: 'src/servico/rotas.ts', content: `// ${prose}\nexport function criarRota() { return 1; }\n` }
    }, dir, { tool: 'claude', agent: 'dev' });
    assert.ok(code._guard && code._guard.rules.includes('.aioson/rules/source-code-language-convention.md'), 'a source file still gets the identifier rule');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('isGovernanceArtifact separates law trees from product artifacts', () => {
  assert.equal(isGovernanceArtifact('.aioson/skills/process/x/SKILL.md'), true);
  assert.equal(isGovernanceArtifact('template/.aioson/docs/design/visual-effects.md'), true);
  assert.equal(isGovernanceArtifact('C:\\repo\\.aioson\\rules\\board.md'), true);
  assert.equal(isGovernanceArtifact('.aioson/briefings/landing/prototype.html'), false);
  assert.equal(isGovernanceArtifact('.aioson/context/prd-checkout.md'), false);
  assert.equal(isGovernanceArtifact('src/skills/parser.ts'), false);
});
