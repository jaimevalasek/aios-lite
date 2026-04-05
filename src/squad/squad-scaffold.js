'use strict';

/**
 * Squad Scaffold — Plan 80, Script 3
 *
 * Deterministic generator of squad directory structure.
 * Eliminates ~2,000 tokens of LLM usage by creating all 15+ files/directories
 * that every squad needs via templates.
 *
 * Integrates with state-manager.js for STATE.md generation.
 *
 * Usage:
 *   node squad-scaffold.js --slug=<slug> --name="Name" --mode=content|code|hybrid
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const stateManager = require('./state-manager');

const SQUADS_DIR = path.join('.aioson', 'squads');

// ─── Templates ───────────���─────────────────────────��─────────────────────────

function agentsSkeleton(name, mode) {
  const executorTypes = {
    content: ['writer', 'editor', 'researcher'],
    code: ['developer', 'reviewer', 'tester'],
    hybrid: ['researcher', 'developer', 'writer']
  };

  const types = executorTypes[mode] || executorTypes.hybrid;
  const slots = types.map((t) => `### ${t}\n- **Role:** (define)\n- **Tools:** (define)\n- **Checklist:** (define)`);

  return `# ${name} — Agent Roster\n\n${slots.join('\n\n')}\n`;
}

function manifestSkeleton(slug, name, mode) {
  return JSON.stringify({
    slug,
    name,
    mode,
    created_at: new Date().toISOString(),
    budget: {
      max_tokens_per_session: null,
      max_tokens_per_task: null,
      action_on_exceed: 'pause'
    },
    depends_on: [],
    subscriptions: [],
    hooks: {
      pre_run: null,
      post_run: null
    },
    anti_loop: {
      threshold: 8,
      action: 'feedback'
    }
  }, null, 2);
}

function squadMdSkeleton(name, mode) {
  return `# ${name}\n\n## Overview\n(describe the squad's purpose)\n\n## Mode\n${mode}\n\n## Executors\nSee agents/agents.md\n\n## Workflows\n(define execution workflows)\n\n## Quality Gates\nSee checklists/quality.md\n`;
}

function designDocSkeleton(name) {
  return `# ${name} — Design Document\n\n## Problem Statement\n(what problem does this squad solve?)\n\n## Approach\n(how will it be solved?)\n\n## Executors & Responsibilities\n(who does what?)\n\n## Data Flow\n(how do executors communicate?)\n\n## Risks & Mitigations\n(what could go wrong?)\n`;
}

function readinessSkeleton(name) {
  return `# ${name} — Readiness Checklist\n\n- [ ] Squad manifest configured\n- [ ] All executors defined in agents.md\n- [ ] Quality checklist in place\n- [ ] At least one workflow defined\n- [ ] Design doc reviewed\n- [ ] Test run completed\n`;
}

function qualitySkeleton(name) {
  return `# ${name} — Quality Checklist\n\n## Per-Task Checks\n- [ ] Output matches acceptance criteria\n- [ ] No placeholder or TODO content\n- [ ] Files listed in brief are created/modified\n\n## Per-Session Checks\n- [ ] All tasks completed or properly escalated\n- [ ] Bus has no unresolved blocks\n- [ ] STATE.md updated with decisions\n\n## Per-Deliverable Checks\n- [ ] verify:gate passes on final output\n- [ ] No sensitive data in output files\n`;
}

function learningsIndexSkeleton(name) {
  return `# ${name} — Learnings Index\n\nsession_count: 0\n\n## Extracted Learnings\n*(populated automatically by learning-extractor after sessions)*\n\n## Manual Observations\n*(add observations here)*\n`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Scaffold a new squad directory structure.
 *
 * @param {string} projectDir  — Project root
 * @param {object} options  — { slug, name, mode }
 * @returns {Promise<object>}  — { ok, slug, files, directories }
 */
async function scaffoldSquad(projectDir, options = {}) {
  const { slug, name, mode = 'hybrid' } = options;

  if (!slug) return { ok: false, error: 'slug is required' };
  if (!name) return { ok: false, error: 'name is required' };
  if (!['content', 'code', 'hybrid'].includes(mode)) {
    return { ok: false, error: `Invalid mode "${mode}" — use content|code|hybrid` };
  }

  const squadDir = path.join(projectDir, SQUADS_DIR, slug);

  // Check if slug already exists
  try {
    await fs.access(squadDir);
    return { ok: false, error: `Squad "${slug}" already exists at ${squadDir}` };
  } catch { /* expected — directory doesn't exist yet */ }

  const createdFiles = [];
  const createdDirs = [];

  // Helper
  async function writeFile(relPath, content) {
    const fullPath = path.join(projectDir, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    createdFiles.push(relPath);
  }

  async function ensureDir(relPath) {
    const fullPath = path.join(projectDir, relPath);
    await fs.mkdir(fullPath, { recursive: true });
    createdDirs.push(relPath);
  }

  const base = path.join(SQUADS_DIR, slug);

  // Squad directory files
  await writeFile(path.join(base, 'agents', 'agents.md'), agentsSkeleton(name, mode));
  await writeFile(path.join(base, 'squad.manifest.json'), manifestSkeleton(slug, name, mode));
  await writeFile(path.join(base, 'squad.md'), squadMdSkeleton(name, mode));
  await writeFile(path.join(base, 'docs', 'design-doc.md'), designDocSkeleton(name));
  await writeFile(path.join(base, 'docs', 'readiness.md'), readinessSkeleton(name));
  await writeFile(path.join(base, 'checklists', 'quality.md'), qualitySkeleton(name));
  await writeFile(path.join(base, 'learnings', 'index.md'), learningsIndexSkeleton(name));

  // Empty directories
  await ensureDir(path.join(base, 'workflows'));
  await ensureDir(path.join(base, 'scripts'));
  await ensureDir(path.join(base, 'script-plans'));
  await ensureDir(path.join(base, 'bus'));

  // Output directories
  await ensureDir(path.join('output', slug));
  await ensureDir(path.join('aioson-logs', slug));
  await ensureDir(path.join('media', slug));

  // STATE.md via state-manager (already formatted)
  await stateManager.writeState(projectDir, slug, stateManager.readState
    ? await stateManager.readState(projectDir, slug)
    : {
        meta: {
          squad: slug,
          current_session: '',
          sessions_completed: 0,
          tasks_completed_total: 0,
          avg_tasks_per_session: 0,
          last_activity: new Date().toISOString()
        },
        decisions: [],
        blockers: [],
        pending: [],
        notes: [`Squad "${name}" scaffolded (mode: ${mode})`]
      }
  );
  createdFiles.push(path.join(base, 'STATE.md'));

  return {
    ok: true,
    slug,
    name,
    mode,
    files: createdFiles,
    directories: createdDirs,
    total: createdFiles.length + createdDirs.length
  };
}

module.exports = { scaffoldSquad };
