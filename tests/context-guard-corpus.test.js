'use strict';

/**
 * The guard against the SHIPPED rule corpus — not a two-file fixture.
 *
 * Every consumer receives template/.aioson/rules; the kanban, form, widget and
 * confirmation rules carry entities such as Card, Form, Lane, Stage and no
 * paths. A substring matcher pulled them into every CHANGELOG edit and into
 * orchestration code that says `lane:<id>`; nothing exercised the selector at
 * corpus scale, so the noise was invisible to the suite. This test edits the
 * kinds of files a session really edits and asserts the corpus stays quiet on
 * them — and still speaks on a real form and a real board.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { buildGuardResponse } = require('../src/context-guard');

const ROOT = path.resolve(__dirname, '..');
const RULES_DIR = path.join(ROOT, 'template', '.aioson', 'rules');

async function corpusProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-guard-corpus-'));
  await fs.mkdir(path.join(dir, '.aioson', 'context'), { recursive: true });
  await fs.mkdir(path.join(dir, '.aioson', 'rules'), { recursive: true });
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'project.context.md'), [
    '---',
    'framework: Node.js',
    'project_type: web-app',
    'conversation_language: pt-BR',
    'load_tier: always',
    '---',
    '# Project'
  ].join('\n'), 'utf8');
  let copied = 0;
  for (const entry of await fs.readdir(RULES_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.toLowerCase() === 'readme.md') continue;
    await fs.copyFile(path.join(RULES_DIR, entry.name), path.join(dir, '.aioson', 'rules', entry.name));
    copied += 1;
  }
  assert.ok(copied >= 15, `the shipped corpus has ${copied} rules`);
  return dir;
}

function edit(filePath, content) {
  return { tool_name: 'Write', tool_input: { file_path: filePath, content } };
}

test('the shipped rule corpus stays quiet on a changelog, orchestration-engine code and a graph library', async () => {
  const dir = await corpusProject();
  try {
    const quiet = [
      edit('CHANGELOG.md', [
        '## [Unreleased]',
        '### Changed',
        '- The card on the kanban board moves between stages with drag and drop; the cadastro form validates the CPF mask inline.',
        '- Home widgets: the dashboard keeps 3–6 widgets; confirm a status change with the design-system modal, never a native prompt.'
      ].join('\n')),
      edit('src/agent-execution/execution-run.js', [
        "'use strict';",
        "const MESSAGE_TARGET = /^(?:lane:[a-z0-9][a-z0-9_-]*|unit:[a-z0-9][a-z0-9-]*|integration|orchestrator)$/; // to: lane:<id>|unit:<id>",
        'function formatReport(report) { const platform = process.platform; return discardEmpty(report, platform); }',
        'const pipeline = { stage: 1, lane: "backend", column: null, queue: [] };',
        "emit({ type: 'message', unit: unitState.id, lane: unitState.lane, wave: unitState.wave, role: stage, to: message.to });"
      ].join('\n')),
      edit('src/lib/module-graph.js', [
        "'use strict';",
        'function stronglyConnected(edges) { const stack = []; const onStack = new Set(); const out = []; return out; }',
        'function cyclePath(graph, rel) { const queue = [[rel]]; while (queue.length > 0) { const trail = queue.shift(); if (trail.length > 12) break; } return null; }',
        'module.exports = { stronglyConnected, cyclePath };'
      ].join('\n'))
    ];
    for (const event of quiet) {
      const response = await buildGuardResponse(event, dir, { tool: 'claude', agent: 'dev' });
      assert.deepEqual(response, {}, `${event.tool_input.file_path} pulled ${JSON.stringify(response._guard || response)}`);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the same corpus still speaks on a real form and a real board', async () => {
  const dir = await corpusProject();
  try {
    const form = edit('src/ui/CadastroForm.tsx', [
      'export function CadastroForm() {',
      '  return (',
      '    <form id="cadastro" onSubmit={submit}>',
      '      <label htmlFor="cpf">CPF</label>',
      '      <input id="cpf" name="cpf" placeholder="000.000.000-00" inputMode="numeric" />',
      '      <button type="submit">Salvar</button>',
      '    </form>',
      '  );',
      '}'
    ].join('\n'));
    const formResponse = await buildGuardResponse(form, dir, { tool: 'claude', agent: 'dev' });
    assert.ok(formResponse._guard && formResponse._guard.injected, 'a real form gets the form rule');
    assert.ok(formResponse._guard.rules.includes('.aioson/rules/form-fields-masks-and-validation.md'), JSON.stringify(formResponse._guard.rules));

    const board = edit('src/ui/KanbanBoard.tsx', [
      'export function KanbanBoard({ columns }) {',
      '  return (',
      '    <div className="kanban board">',
      '      {columns.map((column) => <Column key={column.id} stage={column.stage} onDragEnd={(card) => moveCard(card, column)} />)}',
      '    </div>',
      '  );',
      '}'
    ].join('\n'));
    const boardResponse = await buildGuardResponse(board, dir, { tool: 'claude', agent: 'dev' });
    assert.ok(boardResponse._guard && boardResponse._guard.injected, 'a real board gets the kanban rule');
    assert.ok(boardResponse._guard.rules.includes('.aioson/rules/status-flow-drag-and-drop.md'), JSON.stringify(boardResponse._guard.rules));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
