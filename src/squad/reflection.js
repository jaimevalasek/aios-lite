'use strict';

/**
 * Squad executor reflection module
 *
 * Before marking a task DONE, an executor runs a self-critique pass
 * against its output. If the output fails the quality checklist, the
 * executor iterates (up to max_iterations) before escalating to the
 * coordinator or marking as DONE_WITH_CONCERNS.
 *
 * Reflection is triggered automatically when:
 *   - A worker calls reflect() before returning its result
 *   - The task-decomposer runs a plan step with reflection enabled
 *   - The squad:autorun command is invoked with --reflect
 *
 * Checklist sources (in priority order):
 *   1. squad.json → executors[slug].reflection.checklist
 *   2. .aioson/squads/{slug}/quality.md (freeform checklist file)
 *   3. Built-in generic quality criteria (fallback)
 *
 * Verdict:
 *   DONE              — passed all checks, no issues
 *   DONE_WITH_CONCERNS — passed minimally but has minor issues (flagged)
 *   NEEDS_ITERATION   — failed critical checks, should retry
 *   ESCALATE          — exhausted iterations, coordinator must decide
 */

const fs = require('node:fs/promises');
const path = require('node:path');

// ─── Built-in quality criteria (generic fallback) ────────────────────────────

const GENERIC_CHECKLIST = [
  { id: 'non_empty',     label: 'Output is not empty',                  critical: true  },
  { id: 'on_topic',      label: 'Output addresses the task objective',  critical: true  },
  { id: 'no_truncation', label: 'Output is not abruptly cut off',       critical: true  },
  { id: 'no_filler',     label: 'Output has no generic filler content', critical: false },
  { id: 'actionable',    label: 'Output contains concrete information', critical: false }
];

// ─── Checklist loading ────────────────────────────────────────────────────────

async function loadSquadJson(projectDir, squadSlug) {
  const p = path.join(projectDir, '.aioson', 'squads', squadSlug, 'squad.json');
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return null;
  }
}

async function loadQualityFile(projectDir, squadSlug) {
  const p = path.join(projectDir, '.aioson', 'squads', squadSlug, 'quality.md');
  try {
    const raw = await fs.readFile(p, 'utf8');
    return parseQualityMarkdown(raw);
  } catch {
    return null;
  }
}

function parseQualityMarkdown(content) {
  const criteria = [];
  const lines = content.split(/\r?\n/);
  let id = 0;

  for (const line of lines) {
    // Support: "- [critical] Label" or "- Label" or "* Label"
    const match = line.match(/^[-*]\s+(?:\[(\w+)\]\s+)?(.+)$/);
    if (!match) continue;

    const tag = (match[1] || '').toLowerCase();
    const label = match[2].trim();
    if (!label) continue;

    criteria.push({
      id: `custom_${++id}`,
      label,
      critical: tag === 'critical'
    });
  }

  return criteria.length > 0 ? criteria : null;
}

async function loadChecklist(projectDir, squadSlug, executorSlug) {
  // 1. squad.json executor-specific checklist
  const squadJson = await loadSquadJson(projectDir, squadSlug);
  if (squadJson) {
    const executorConfig = squadJson.executors && squadJson.executors[executorSlug];
    const checklist = executorConfig && executorConfig.reflection && executorConfig.reflection.checklist;
    if (Array.isArray(checklist) && checklist.length > 0) {
      return checklist.map((item, i) => {
        if (typeof item === 'string') {
          return { id: `exec_${i}`, label: item, critical: false };
        }
        return { id: item.id || `exec_${i}`, label: item.label || item, critical: !!item.critical };
      });
    }
  }

  // 2. quality.md file
  const fromFile = await loadQualityFile(projectDir, squadSlug);
  if (fromFile) return fromFile;

  // 3. Generic fallback
  return GENERIC_CHECKLIST;
}

function loadMaxIterations(squadJson, executorSlug) {
  const config = squadJson && squadJson.executors && squadJson.executors[executorSlug];
  const val = config && config.reflection && config.reflection.max_iterations;
  return Number.isFinite(val) && val > 0 ? Math.min(val, 5) : 2;
}

// ─── Deterministic checks ────────────────────────────────────────────────────

const FILLER_PATTERNS = [
  /\bi will\b/i,
  /\bof course\b/i,
  /\bcertainly\b/i,
  /\bsure,?\s+here\b/i,
  /\bas an ai\b/i,
  /\bgreat question\b/i,
  /\bhappy to help\b/i,
  /\bI'?d be happy\b/i
];

function runBuiltinCheck(id, output) {
  const text = String(output || '').trim();
  switch (id) {
    case 'non_empty':
      return text.length > 0;
    case 'on_topic':
      // heuristic: output has at least 50 chars and is not just whitespace
      return text.length >= 50;
    case 'no_truncation':
      // heuristic: doesn't end mid-sentence (no trailing comma or open paren)
      return !/[,(\[{]$/.test(text.replace(/\s+$/, ''));
    case 'no_filler':
      return !FILLER_PATTERNS.some((re) => re.test(text));
    case 'actionable':
      // heuristic: contains at least one noun or verb indicator
      return text.split(/\s+/).length >= 10;
    default:
      // Custom criteria without a built-in check — mark as needs-llm-review
      return null;
  }
}

// ─── Core reflection ─────────────────────────────────────────────────────────

/**
 * Run a reflection pass on an executor's output.
 *
 * @param {string}  output       — The text output to evaluate
 * @param {object}  context      — { projectDir, squadSlug, executorSlug, taskTitle?, iteration? }
 * @param {object}  [options]    — { checklist?, verbose? }
 * @returns {Promise<ReflectionResult>}
 *
 * ReflectionResult:
 *   {
 *     verdict: 'DONE' | 'DONE_WITH_CONCERNS' | 'NEEDS_ITERATION' | 'ESCALATE',
 *     passed: boolean,
 *     score: number,          // 0.0–1.0
 *     iteration: number,      // current iteration number
 *     max_iterations: number,
 *     issues: string[],       // failed criteria labels
 *     critical_failures: string[],
 *     needs_llm_review: string[],  // criteria that couldn't be checked deterministically
 *     summary: string,        // one-line human-readable result
 *     checklist: object[]     // full results per criterion
 *   }
 */
async function reflect(output, context, options = {}) {
  const { projectDir, squadSlug, executorSlug, taskTitle = 'task', iteration = 1 } = context;

  const squadJson = await loadSquadJson(projectDir, squadSlug);
  const maxIterations = loadMaxIterations(squadJson, executorSlug);

  const checklist = options.checklist
    ? options.checklist.map((item, i) => (
        typeof item === 'string'
          ? { id: `opt_${i}`, label: item, critical: false }
          : item
      ))
    : await loadChecklist(projectDir, squadSlug, executorSlug);

  const results = [];
  const issues = [];
  const criticalFailures = [];
  const needsLlmReview = [];

  for (const criterion of checklist) {
    const checkResult = runBuiltinCheck(criterion.id, output);

    if (checkResult === null) {
      // Cannot evaluate deterministically — flag for LLM review
      needsLlmReview.push(criterion.label);
      results.push({ ...criterion, result: 'needs_review', passed: null });
      continue;
    }

    results.push({ ...criterion, result: checkResult ? 'pass' : 'fail', passed: checkResult });

    if (!checkResult) {
      issues.push(criterion.label);
      if (criterion.critical) criticalFailures.push(criterion.label);
    }
  }

  const evaluated = results.filter((r) => r.passed !== null);
  const passedCount = evaluated.filter((r) => r.passed).length;
  const score = evaluated.length > 0 ? passedCount / evaluated.length : 1.0;
  const passed = criticalFailures.length === 0;

  let verdict;
  if (criticalFailures.length > 0 && iteration < maxIterations) {
    verdict = 'NEEDS_ITERATION';
  } else if (criticalFailures.length > 0 && iteration >= maxIterations) {
    verdict = 'ESCALATE';
  } else if (issues.length > 0) {
    verdict = 'DONE_WITH_CONCERNS';
  } else {
    verdict = 'DONE';
  }

  const summary = buildSummary(verdict, score, issues, criticalFailures, taskTitle, iteration, maxIterations);

  return {
    verdict,
    passed,
    score: Math.round(score * 100) / 100,
    iteration,
    max_iterations: maxIterations,
    issues,
    critical_failures: criticalFailures,
    needs_llm_review: needsLlmReview,
    summary,
    checklist: results
  };
}

function buildSummary(verdict, score, issues, criticalFailures, taskTitle, iteration, maxIterations) {
  const scoreStr = `${Math.round(score * 100)}%`;
  switch (verdict) {
    case 'DONE':
      return `[DONE] "${taskTitle}" passed all checks (${scoreStr})`;
    case 'DONE_WITH_CONCERNS':
      return `[DONE_WITH_CONCERNS] "${taskTitle}" passed (${scoreStr}) with ${issues.length} minor issue(s): ${issues.slice(0, 2).join(', ')}`;
    case 'NEEDS_ITERATION':
      return `[NEEDS_ITERATION] "${taskTitle}" failed ${criticalFailures.length} critical check(s) — iteration ${iteration}/${maxIterations}: ${criticalFailures.slice(0, 2).join(', ')}`;
    case 'ESCALATE':
      return `[ESCALATE] "${taskTitle}" exhausted ${maxIterations} iterations — coordinator must decide. Failed: ${criticalFailures.join(', ')}`;
    default:
      return `[${verdict}] ${scoreStr}`;
  }
}

/**
 * Decide whether to iterate based on a reflection result.
 * Returns true if another attempt is warranted.
 */
function shouldIterate(reflectionResult) {
  return reflectionResult.verdict === 'NEEDS_ITERATION';
}

/**
 * Run a full reflection loop: reflect → iterate if needed → return final result.
 *
 * @param {function}  executeFn   — async function that produces output: async () => string
 * @param {object}    context     — same as reflect()
 * @param {object}    [options]   — { checklist?, onIteration?, verbose? }
 * @returns {Promise<{ output: string, reflection: ReflectionResult, iterations: number }>}
 */
async function reflectLoop(executeFn, context, options = {}) {
  const { projectDir, squadSlug, executorSlug } = context;
  const squadJson = await loadSquadJson(projectDir, squadSlug);
  const maxIterations = loadMaxIterations(squadJson, executorSlug);

  let lastOutput = null;
  let lastReflection = null;
  let iteration = 1;

  while (iteration <= maxIterations) {
    lastOutput = await executeFn(iteration, lastReflection);

    lastReflection = await reflect(lastOutput, { ...context, iteration }, options);

    if (options.onIteration) {
      try { await options.onIteration(iteration, lastOutput, lastReflection); } catch { /* ignore */ }
    }

    if (!shouldIterate(lastReflection)) break;
    iteration++;
  }

  return {
    output: lastOutput,
    reflection: lastReflection,
    iterations: iteration
  };
}

/**
 * Format a reflection result as a markdown report.
 * Useful for the bus (posting reflection results as feedback messages).
 */
function formatReport(result, executorSlug) {
  const lines = [
    `## Reflection: ${result.verdict}`,
    `Executor: ${executorSlug || 'unknown'}`,
    `Score: ${Math.round(result.score * 100)}%  |  Iteration: ${result.iteration}/${result.max_iterations}`,
    '',
    `**Summary:** ${result.summary}`
  ];

  if (result.critical_failures.length > 0) {
    lines.push('', '**Critical failures:**');
    for (const f of result.critical_failures) lines.push(`- ❌ ${f}`);
  }

  if (result.issues.length > result.critical_failures.length) {
    lines.push('', '**Minor issues:**');
    for (const issue of result.issues) {
      if (!result.critical_failures.includes(issue)) lines.push(`- ⚠ ${issue}`);
    }
  }

  if (result.needs_llm_review.length > 0) {
    lines.push('', '**Needs LLM review (could not evaluate deterministically):**');
    for (const c of result.needs_llm_review) lines.push(`- 🔍 ${c}`);
  }

  return lines.join('\n');
}

module.exports = {
  reflect,
  reflectLoop,
  shouldIterate,
  formatReport,
  loadChecklist,
  GENERIC_CHECKLIST
};
