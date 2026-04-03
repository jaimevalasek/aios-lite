'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

/**
 * Parseia um implementation-plan-{slug}.md e extrai as phases como tasks.
 *
 * Formatos suportados:
 *   ## Phase 1 — Title
 *   ## Phase 1 - Title
 *   ## Phase 1: Title
 *
 * @param {string} projectDir
 * @param {string} slug
 * @param {{ agent?: string }} options
 * @returns {Promise<Array<{task: string, agent: string, status: string}>>}
 */
async function importFromPlan(projectDir, slug, options = {}) {
  const { agent = 'dev' } = options;

  const candidates = [
    path.join(projectDir, '.aioson', 'context', `implementation-plan-${slug}.md`),
    path.join(projectDir, '.aioson', 'plans', `implementation-plan-${slug}.md`),
    path.join(projectDir, `implementation-plan-${slug}.md`)
  ];

  let content = null;
  let foundPath = null;
  for (const candidate of candidates) {
    try {
      content = await fs.readFile(candidate, 'utf8');
      foundPath = candidate;
      break;
    } catch { /* try next */ }
  }

  if (!content) {
    throw new Error(
      `implementation-plan-${slug}.md not found. Tried:\n` +
      candidates.map((c) => `  ${c}`).join('\n') +
      '\n\nRun `aioson plan . --slug=' + slug + '` to create one.'
    );
  }

  const tasks = [];

  // Captura ## Phase N seguido de separador (—, -, :) e título
  // Exemplos: "## Phase 1 — Create migration"  "## Phase 1 - Foo"  "## Phase 1: Bar"
  const phaseRegex = /^##\s+Phase\s+\d+\s*(?:[—\-:])\s*(.+)$/gim;
  let match;

  while ((match = phaseRegex.exec(content)) !== null) {
    const title = match[1].trim().replace(/\s*\(.*?\)\s*$/, '').trim(); // remove sufixos como "(2-3 days)"
    if (title) {
      tasks.push({ task: title, agent, status: 'pending' });
    }
  }

  return { tasks, planPath: foundPath };
}

module.exports = { importFromPlan };
