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
 *   node squad-scaffold.js --slug=<slug> --name="Name" --mode=content|software|research|mixed
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const stateManager = require('./state-manager');

const SQUADS_DIR = path.join('.aioson', 'squads');

// ─── Templates ───────────────────────────────────────────────────────────────

function normalizeMode(mode) {
  const raw = String(mode || '').trim().toLowerCase();
  if (raw === 'code') return 'software';
  if (raw === 'hybrid') return 'mixed';
  if (raw === 'content' || raw === 'software' || raw === 'research' || raw === 'mixed') {
    return raw;
  }
  return null;
}

function agentsSkeleton(name, mode) {
  const executorTypes = {
    content: ['writer', 'editor', 'researcher'],
    software: ['developer', 'reviewer', 'tester'],
    research: ['researcher', 'analyst', 'reviewer'],
    mixed: ['researcher', 'developer', 'writer']
  };

  const types = executorTypes[mode] || executorTypes.mixed;
  const slots = [
    '## Mission',
    '(define the squad mission here)',
    '',
    '## Does',
    '- (define the main responsibilities)',
    '',
    '## Does not',
    '- (define explicit out-of-scope boundaries)',
    '',
    '## Permanent executors',
    '- @orquestrador — coordinates work, routes requests, and synthesizes outputs',
    ...types.map((t) => `- @${t} — (define role)`),
    '',
    '## Squad skills',
    '- (declare reusable skills when they exist)',
    '',
    '## Squad MCPs',
    '- (declare MCPs when they exist)',
    '',
    '## Subagent policy',
    '- (define when temporary subagents are allowed)',
    '',
    '## Outputs and review',
    '- (define output locations and review policy)'
  ];

  return `# Squad ${name}\n\n${slots.join('\n')}\n`;
}

function manifestSkeleton(slug, name, mode) {
  const rootDir = `${SQUADS_DIR}/${slug}`;
  return JSON.stringify({
    schemaVersion: '1.0.0',
    packageVersion: '1.0.0',
    slug,
    name,
    mode,
    mission: `Define the mission for ${name}.`,
    goal: `Define the goal for ${name}.`,
    visibility: 'private',
    locale_scope: 'universal',
    storagePolicy: {
      primary: 'file',
      artifacts: `output/${slug}/`,
      exports: {
        html: true,
        markdown: true,
        json: true
      }
    },
    package: {
      rootDir,
      agentsDir: `${rootDir}/agents`,
      workersDir: `${rootDir}/workers`,
      workflowsDir: `${rootDir}/workflows`,
      checklistsDir: `${rootDir}/checklists`,
      skillsDir: `${rootDir}/skills`,
      templatesDir: `${rootDir}/templates`,
      docsDir: `${rootDir}/docs`
    },
    rules: {
      outputsDir: `output/${slug}`,
      logsDir: `aioson-logs/${slug}`,
      mediaDir: `media/${slug}`,
      reviewPolicy: []
    },
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
    },
    skills: [],
    mcps: [],
    subagents: [],
    contentBlueprints: [],
    executors: [
      {
        slug: 'orquestrador',
        title: 'Orquestrador',
        type: 'agent',
        role: 'Coordinate the squad execution and synthesize specialist outputs.',
        file: `${rootDir}/agents/orquestrador.md`,
        usesLLM: true,
        deterministic: false,
        modelTier: 'balanced',
        skills: [],
        genomes: []
      }
    ],
    checklists: [
      {
        slug: 'quality',
        title: 'Quality Checklist',
        file: `${rootDir}/checklists/quality.md`
      }
    ],
    workflows: [
      {
        slug: 'default',
        title: 'Default Workflow',
        file: `${rootDir}/workflows/default.md`,
        phases: []
      }
    ],
    genomes: [],
    created_at: new Date().toISOString()
  }, null, 2);
}

function squadMdSkeleton(slug, name, mode) {
  return `# ${name}

Mode: ${mode}
Goal: (define the squad goal)
Agents: .aioson/squads/${slug}/agents
Manifest: .aioson/squads/${slug}/squad.manifest.json
Output: output/${slug}
Logs: aioson-logs/${slug}
Media: media/${slug}
LatestSession: output/${slug}/latest.html

## Skills
- (declare squad-level skills here)

## MCPs
- (declare MCPs here)

## SubagentPolicy
- (define temporary subagent rules)
`;
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

function orchestratorSkeleton(name, slug) {
  return `# Agent @orquestrador

> ⚡ **ACTIVATED** — Execute immediately as @orquestrador.

## Mission
Coordinate the ${name} squad, route requests to the right executor, and synthesize the final output.

## Quick context
Squad: ${name} | Slug: ${slug}

## Focus
- Route work to the right specialist
- Protect scope and output quality
- Keep workflows, reviews, and hand-offs coherent

## Hard constraints
- Respect the squad manifest and package contract
- Do not absorb specialist work silently when routing is required
- Keep user-facing interaction aligned with the squad locale policy

## Output contract
- Primary synthesis: .aioson/squads/${slug}/docs/design-doc.md
- Session deliverables: output/${slug}/
`;
}

function workflowSkeleton(name) {
  return `# Workflow: default

## Goal
Default execution flow for ${name}.

## Phases
1. Intake
2. Execution
3. Review
4. Final synthesis
`;
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
  const { slug, name } = options;
  const mode = normalizeMode(options.mode || 'mixed');

  if (!slug) return { ok: false, error: 'slug is required' };
  if (!name) return { ok: false, error: 'name is required' };
  if (!mode) {
    return { ok: false, error: `Invalid mode "${options.mode}" — use content|software|research|mixed` };
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
  await writeFile(path.join(base, 'agents', 'orquestrador.md'), orchestratorSkeleton(name, slug));
  await writeFile(path.join(base, 'squad.manifest.json'), manifestSkeleton(slug, name, mode));
  await writeFile(path.join(base, 'squad.md'), squadMdSkeleton(slug, name, mode));
  await writeFile(path.join(base, 'docs', 'design-doc.md'), designDocSkeleton(name));
  await writeFile(path.join(base, 'docs', 'readiness.md'), readinessSkeleton(name));
  await writeFile(path.join(base, 'checklists', 'quality.md'), qualitySkeleton(name));
  await writeFile(path.join(base, 'learnings', 'index.md'), learningsIndexSkeleton(name));
  await writeFile(path.join(base, 'workflows', 'default.md'), workflowSkeleton(name));

  // Empty directories
  await ensureDir(path.join(base, 'workers'));
  await ensureDir(path.join(base, 'skills'));
  await ensureDir(path.join(base, 'templates'));

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
