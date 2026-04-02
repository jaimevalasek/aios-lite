'use strict';

/**
 * Squad task decomposer — autonomous goal → execution plan
 *
 * Given a high-level goal, the decomposer:
 *   1. Reads the squad manifest to discover available executors and their roles
 *   2. Breaks the goal into sub-tasks with acceptance criteria
 *   3. Maps each task to the most suitable executor
 *   4. Detects dependencies between tasks (sequential vs parallel)
 *   5. Returns a prioritized execution plan
 *
 * Two decomposition modes:
 *   heuristic (default) — regex + keyword matching, zero LLM calls, instant
 *   structured          — uses a structured prompt template saved to disk
 *                         for the agent to fill in (LLM completes it on activation)
 *
 * The execution plan is saved to:
 *   .aioson/squads/{slug}/sessions/{sessionId}/plan.json
 *
 * Format:
 *   {
 *     id, session_id, squad_slug, goal, created_at,
 *     decomposition_mode,
 *     tasks: [{ id, title, description, acceptance_criteria, executor, dependencies,
 *               priority, parallel_group, status }],
 *     execution_order: [...],   // topological order
 *     parallel_groups: { N: [...taskIds] }
 *   }
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// ─── Squad manifest loading ───────────────────────────────────────────────────

async function loadSquadManifest(projectDir, squadSlug) {
  const squadDir = path.join(projectDir, '.aioson', 'squads', squadSlug);

  let squadJson = null;
  try {
    squadJson = JSON.parse(
      await fs.readFile(path.join(squadDir, 'squad.json'), 'utf8')
    );
  } catch { /* optional */ }

  // Discover executor agent files
  const agentsDir = path.join(projectDir, 'agents', squadSlug);
  let executorFiles = [];
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    executorFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name.replace(/\.md$/, ''));
  } catch { /* agents dir optional */ }

  // Build executor list from squad.json + discovered files
  const executors = buildExecutorList(squadJson, executorFiles);

  return { squadJson, executors };
}

function buildExecutorList(squadJson, discoveredFiles) {
  const execMap = {};

  // From squad.json
  if (squadJson && squadJson.executors) {
    for (const [slug, config] of Object.entries(squadJson.executors)) {
      execMap[slug] = {
        slug,
        name: config.name || slug,
        role: config.role || slug,
        skills: config.skills || [],
        keywords: extractKeywords(config.role || '', config.name || '', config.skills || [])
      };
    }
  }

  // From discovered agent files (if not already in map)
  for (const slug of discoveredFiles) {
    if (!execMap[slug]) {
      execMap[slug] = {
        slug,
        name: slug,
        role: slug,
        skills: [],
        keywords: extractKeywords(slug)
      };
    }
  }

  return Object.values(execMap);
}

function extractKeywords(...sources) {
  const text = sources.flat().join(' ').toLowerCase();
  return text.split(/[\s,;_-]+/).filter((w) => w.length > 3);
}

// ─── Heuristic decomposition ─────────────────────────────────────────────────

// Action verb patterns → task type mapping
const ACTION_VERBS = {
  research:   ['research', 'investigate', 'analyze', 'study', 'explore', 'discover', 'find'],
  write:      ['write', 'create', 'draft', 'compose', 'produce', 'generate', 'craft'],
  review:     ['review', 'critique', 'evaluate', 'assess', 'check', 'validate', 'verify'],
  design:     ['design', 'plan', 'structure', 'outline', 'architect', 'map'],
  publish:    ['publish', 'post', 'distribute', 'share', 'deliver', 'send', 'output'],
  summarize:  ['summarize', 'consolidate', 'compile', 'aggregate', 'collect'],
  translate:  ['translate', 'adapt', 'localize', 'convert', 'rewrite'],
  optimize:   ['optimize', 'improve', 'refine', 'enhance', 'edit', 'revise']
};

const EXECUTOR_ROLE_MAP = {
  research:  ['researcher', 'analyst', 'investigator', 'scout', 'explorer'],
  write:     ['writer', 'copywriter', 'author', 'creator', 'scriptwriter'],
  review:    ['critic', 'reviewer', 'editor', 'qa', 'quality', 'validator'],
  design:    ['designer', 'architect', 'strategist', 'planner'],
  publish:   ['publisher', 'distributor', 'delivery', 'output'],
  summarize: ['summarizer', 'aggregator', 'curator'],
  translate: ['translator', 'localizer', 'adapter'],
  optimize:  ['optimizer', 'editor', 'refiner']
};

function detectVerbType(text) {
  const lower = text.toLowerCase();
  for (const [type, verbs] of Object.entries(ACTION_VERBS)) {
    if (verbs.some((v) => lower.includes(v))) return type;
  }
  return 'write'; // default
}

function scoreExecutorForType(executor, verbType) {
  const roleKeywords = EXECUTOR_ROLE_MAP[verbType] || [];
  const execKeywords = executor.keywords;
  return roleKeywords.reduce((score, rk) => {
    return score + (execKeywords.some((ek) => ek.includes(rk) || rk.includes(ek)) ? 1 : 0);
  }, 0);
}

function assignExecutor(executors, verbType) {
  if (executors.length === 0) return null;

  const scored = executors.map((e) => ({
    executor: e,
    score: scoreExecutorForType(e, verbType)
  }));
  scored.sort((a, b) => b.score - a.score);

  return scored[0].score > 0 ? scored[0].executor : executors[0];
}

function extractSubGoals(goal) {
  const text = String(goal || '').trim();

  // Split on: numbered lists, bullet points, "and then", semicolons, newlines
  const parts = text
    .split(/(?:\d+[.)]\s+|[•\-*]\s+|\band\s+then\b|;\s*|\n+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (parts.length > 1) return parts;

  // Single sentence: split on commas + conjunctions suggesting parallel work
  const commaSplit = text.split(/,\s+(?:and\s+)?/).map((s) => s.trim()).filter((s) => s.length > 10);
  if (commaSplit.length > 1 && commaSplit.length <= 8) return commaSplit;

  // Single goal — treat as one task
  return [text];
}

function buildAcceptanceCriteria(taskTitle, verbType) {
  const base = [
    `Output directly addresses the task: "${taskTitle.slice(0, 80)}"`,
    'Content is complete, not truncated',
    'No generic filler — all content is task-specific'
  ];

  const specific = {
    research:  ['Findings cite at least one concrete source or evidence', 'Distinguishes facts from inferences'],
    write:     ['Follows the squad\'s tone and style guidelines', 'Covers all required points from the brief'],
    review:    ['Lists specific issues with clear descriptions', 'Each issue has a concrete recommendation'],
    design:    ['Plan is actionable — each step is executable', 'Dependencies between steps are explicit'],
    publish:   ['Output format matches delivery specification', 'File is written to correct output path'],
    summarize: ['Captures all key points from source material', 'No important information omitted'],
    translate: ['Preserves original meaning accurately', 'Reads naturally in the target language'],
    optimize:  ['Each change is explained with a clear reason', 'Original intent is preserved']
  };

  return [...base, ...(specific[verbType] || [])];
}

function detectDependencies(tasks) {
  // Simple heuristic: review/optimize/publish tasks depend on write/research tasks
  const DEPENDENT_TYPES = new Set(['review', 'optimize', 'publish', 'summarize']);
  const PRODUCER_TYPES = new Set(['research', 'write', 'design']);

  const producerIds = tasks
    .filter((t) => PRODUCER_TYPES.has(t._verbType))
    .map((t) => t.id);

  return tasks.map((task) => ({
    ...task,
    dependencies: DEPENDENT_TYPES.has(task._verbType) ? producerIds.filter((id) => id !== task.id) : []
  }));
}

function assignParallelGroups(tasks) {
  // Group 1: tasks with no dependencies (can run in parallel)
  // Group 2: tasks that depend only on group 1
  // Group N: tasks that depend on group N-1
  const groupMap = {};
  const assigned = new Set();

  let group = 1;
  let remaining = [...tasks];

  while (remaining.length > 0) {
    const currentGroup = remaining.filter((t) =>
      t.dependencies.every((dep) => assigned.has(dep))
    );

    if (currentGroup.length === 0) {
      // Circular dependency or unresolvable — assign all remaining to next group
      for (const t of remaining) {
        groupMap[t.id] = group;
        assigned.add(t.id);
      }
      break;
    }

    for (const t of currentGroup) {
      groupMap[t.id] = group;
      assigned.add(t.id);
    }

    remaining = remaining.filter((t) => !assigned.has(t));
    group++;
  }

  return tasks.map((t) => ({ ...t, parallel_group: groupMap[t.id] || 1 }));
}

function heuristicDecompose(goal, executors) {
  const subGoals = extractSubGoals(goal);

  let tasks = subGoals.map((sg, i) => {
    const verbType = detectVerbType(sg);
    const executor = assignExecutor(executors, verbType);
    const criteria = buildAcceptanceCriteria(sg, verbType);

    return {
      id: `task-${String(i + 1).padStart(2, '0')}`,
      title: sg.slice(0, 100),
      description: sg,
      acceptance_criteria: criteria,
      executor: executor ? executor.slug : null,
      dependencies: [],
      priority: i + 1,
      parallel_group: 1,
      status: 'pending',
      _verbType: verbType
    };
  });

  tasks = detectDependencies(tasks);
  tasks = assignParallelGroups(tasks);

  // Topological sort
  const executionOrder = topologicalSort(tasks);

  // Build parallel group index
  const parallelGroups = {};
  for (const t of tasks) {
    const g = t.parallel_group;
    if (!parallelGroups[g]) parallelGroups[g] = [];
    parallelGroups[g].push(t.id);
  }

  // Clean up internal field
  const cleanTasks = tasks.map(({ _verbType, ...rest }) => rest);

  return { tasks: cleanTasks, executionOrder, parallelGroups };
}

function topologicalSort(tasks) {
  const inDegree = {};
  const adj = {};
  const order = [];
  const queue = [];

  for (const t of tasks) {
    inDegree[t.id] = t.dependencies.length;
    adj[t.id] = tasks.filter((o) => o.dependencies.includes(t.id)).map((o) => o.id);
  }

  for (const t of tasks) {
    if (inDegree[t.id] === 0) queue.push(t.id);
  }

  while (queue.length > 0) {
    const id = queue.shift();
    order.push(id);
    for (const neighbor of (adj[id] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  // Add any remaining (handles cycles gracefully)
  for (const t of tasks) {
    if (!order.includes(t.id)) order.push(t.id);
  }

  return order;
}

// ─── Structured prompt template (for LLM-powered decomposition) ──────────────

function buildStructuredPrompt(goal, executors, squadSlug) {
  const execList = executors
    .map((e) => `- ${e.slug}: ${e.role}${e.skills.length ? ` (skills: ${e.skills.join(', ')})` : ''}`)
    .join('\n');

  return `You are the @squad coordinator for squad "${squadSlug}".

## Goal
${goal}

## Available executors
${execList || '(none discovered — create generic tasks)'}

## Your task
Decompose the goal above into 2–7 concrete sub-tasks.

For each sub-task, provide:
1. A short title (max 80 chars)
2. A clear description (1–3 sentences)
3. 3–5 acceptance criteria (specific, verifiable)
4. The executor slug that should handle it
5. Dependencies (list task IDs that must complete first, or empty)

Output ONLY valid JSON in this format:
{
  "tasks": [
    {
      "id": "task-01",
      "title": "...",
      "description": "...",
      "acceptance_criteria": ["...", "..."],
      "executor": "executor-slug",
      "dependencies": []
    }
  ]
}

Rules:
- Do not create tasks for unavailable executors
- Research tasks always precede write tasks when both exist
- Review/critique tasks always depend on write tasks
- Maximum 7 tasks — merge smaller tasks if needed
- Each task must be completable in one session`;
}

// ─── Plan persistence ─────────────────────────────────────────────────────────

async function savePlan(projectDir, squadSlug, sessionId, plan) {
  const planDir = path.join(
    projectDir, '.aioson', 'squads', squadSlug, 'sessions', sessionId
  );
  await fs.mkdir(planDir, { recursive: true });
  const planPath = path.join(planDir, 'plan.json');
  await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf8');
  return planPath;
}

async function loadPlan(projectDir, squadSlug, sessionId) {
  const planPath = path.join(
    projectDir, '.aioson', 'squads', squadSlug, 'sessions', sessionId, 'plan.json'
  );
  try {
    return JSON.parse(await fs.readFile(planPath, 'utf8'));
  } catch {
    return null;
  }
}

async function updateTaskStatus(projectDir, squadSlug, sessionId, taskId, status, result = null) {
  const plan = await loadPlan(projectDir, squadSlug, sessionId);
  if (!plan) return null;

  const task = plan.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  task.status = status;
  if (result !== null) task.result = result;
  task.updated_at = new Date().toISOString();

  await savePlan(projectDir, squadSlug, sessionId, plan);
  return plan;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Decompose a goal into an execution plan.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} goal          — High-level objective
 * @param {object} [options]
 *   @param {string}  [options.sessionId]   — Defaults to generated UUID
 *   @param {string}  [options.mode]        — 'heuristic' (default) | 'structured'
 *   @param {boolean} [options.save]        — Save plan to disk (default: true)
 * @returns {Promise<object>} plan
 */
async function decompose(projectDir, squadSlug, goal, options = {}) {
  const {
    sessionId = randomUUID(),
    mode = 'heuristic',
    save = true
  } = options;

  const { executors } = await loadSquadManifest(projectDir, squadSlug);

  let tasks, executionOrder, parallelGroups;
  let structuredPrompt = null;

  if (mode === 'structured') {
    // Return a prompt template for the agent to fill in with LLM
    structuredPrompt = buildStructuredPrompt(goal, executors, squadSlug);
    // Use heuristic as fallback scaffold
    ({ tasks, executionOrder, parallelGroups } = heuristicDecompose(goal, executors));
  } else {
    ({ tasks, executionOrder, parallelGroups } = heuristicDecompose(goal, executors));
  }

  const plan = {
    id: randomUUID(),
    session_id: sessionId,
    squad_slug: squadSlug,
    goal,
    created_at: new Date().toISOString(),
    decomposition_mode: mode,
    executor_count: executors.length,
    tasks,
    execution_order: executionOrder,
    parallel_groups: parallelGroups,
    structured_prompt: structuredPrompt
  };

  if (save) {
    await savePlan(projectDir, squadSlug, sessionId, plan);
  }

  return plan;
}

/**
 * Get the next tasks ready to execute (dependencies satisfied, status pending).
 *
 * @returns {object[]} tasks ready to run
 */
function getReadyTasks(plan) {
  const completed = new Set(
    plan.tasks.filter((t) => t.status === 'completed' || t.status === 'done').map((t) => t.id)
  );

  return plan.tasks.filter((t) => {
    if (t.status !== 'pending') return false;
    return t.dependencies.every((dep) => completed.has(dep));
  });
}

/**
 * Check if a plan is fully complete.
 */
function isPlanComplete(plan) {
  return plan.tasks.every((t) => ['completed', 'done', 'skipped'].includes(t.status));
}

/**
 * Format a plan as a human-readable markdown summary.
 */
function formatPlan(plan) {
  const lines = [
    `## Execution Plan — ${plan.squad_slug}`,
    `Session: ${plan.session_id}`,
    `Goal: ${plan.goal}`,
    `Decomposition: ${plan.decomposition_mode}  |  Executors: ${plan.executor_count}`,
    `Created: ${plan.created_at}`,
    '',
    `### Tasks (${plan.tasks.length})`
  ];

  for (const taskId of plan.execution_order) {
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) continue;
    const statusIcon = {
      pending: '○', in_progress: '●', completed: '✓', done: '✓',
      failed: '✗', skipped: '–', escalated: '⚠'
    }[task.status] || '?';

    lines.push(`\n**[${statusIcon}] ${task.id}: ${task.title}**`);
    lines.push(`  Executor: ${task.executor || 'unassigned'}  |  Group: ${task.parallel_group}`);
    if (task.dependencies.length > 0) lines.push(`  Depends on: ${task.dependencies.join(', ')}`);
    lines.push('  Acceptance criteria:');
    for (const c of task.acceptance_criteria) lines.push(`    - ${c}`);
  }

  if (Object.keys(plan.parallel_groups).length > 1) {
    lines.push('', '### Parallel execution groups');
    for (const [group, ids] of Object.entries(plan.parallel_groups)) {
      lines.push(`  Group ${group}: ${ids.join(', ')}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  decompose,
  getReadyTasks,
  isPlanComplete,
  updateTaskStatus,
  loadPlan,
  savePlan,
  formatPlan,
  heuristicDecompose,
  buildStructuredPrompt,
  loadSquadManifest
};
