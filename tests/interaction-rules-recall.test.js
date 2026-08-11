'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { selectContext } = require('../src/context-selector');

// Recall audit for the interaction-contract rules: realistic pt-BR task
// wordings must route to the rule that owns them. This pins the SHIPPED
// frontmatter (the files are copied verbatim from template/), so a trigger
// regression shows up here instead of in a live session — the
// status-change-confirmation rule was missed on "cancelar OS" wording in a
// real project test before its Portuguese verbs were added.

const TEMPLATE_RULES = path.resolve(__dirname, '..', 'template', '.aioson', 'rules');
const RULE_FILES = [
  'form-fields-masks-and-validation.md',
  'status-change-confirmation.md',
  'status-flow-drag-and-drop.md',
  'management-home-widgets.md'
];

const CASES = [
  { rule: 'form-fields-masks-and-validation', task: 'implementar cadastro de cliente com CPF, CNPJ, telefone e CEP' },
  { rule: 'status-change-confirmation', task: 'cancelar uma OS pelo quadro antes de remover do fluxo' },
  { rule: 'status-flow-drag-and-drop', task: 'quadro kanban de ordens de serviço com etapas que vão e voltam' },
  { rule: 'management-home-widgets', task: 'home do dashboard de gestão com indicadores do dia' }
];

async function makeRulesProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-recall-'));
  await fs.mkdir(path.join(dir, '.aioson', 'rules'), { recursive: true });
  for (const file of RULE_FILES) {
    await fs.copyFile(
      path.join(TEMPLATE_RULES, file),
      path.join(dir, '.aioson', 'rules', file)
    );
  }
  return dir;
}

test('each interaction rule is recalled by its own pt-BR task wording', async () => {
  const dir = await makeRulesProject();

  for (const { rule, task } of CASES) {
    const result = await selectContext(dir, {
      agent: 'dev',
      mode: 'executing',
      task,
      semantic: false
    });
    const paths = result.selected.map((item) => item.path);
    assert.ok(
      paths.includes(`.aioson/rules/${rule}.md`),
      `task "${task}" must recall ${rule}; selected: ${paths.join(', ') || '(none)'}`
    );
  }
});

test('the composite briefing wording recalls the confirmation rule (regression)', async () => {
  const dir = await makeRulesProject();

  // The wording that missed in the real-project test: the confirmation intent
  // is expressed only through the verb "cancelar".
  const result = await selectContext(dir, {
    agent: 'briefing-refiner',
    mode: 'executing',
    task: 'protótipo de gestão de OS: mover etapas no quadro, cancelar OS, cadastro com CPF e dashboard operacional',
    semantic: false
  });
  const paths = result.selected.map((item) => item.path);
  assert.ok(
    paths.includes('.aioson/rules/status-change-confirmation.md'),
    `"cancelar OS" must recall status-change-confirmation; selected: ${paths.join(', ') || '(none)'}`
  );
});
