'use strict';

/**
 * Brief Validator — Plan 80, Script 1
 *
 * Validates completeness of a squad brief/spec before spawning workers.
 * Prevents retries caused by incomplete briefs by catching issues early.
 *
 * Validated fields (6):
 *   1. Phase name and objective (non-empty, ≤ 2 sentences)
 *   2. Files to read (at least 1 existing path)
 *   3. Files to write (at least 1 path with action)
 *   4. Constraints (at least 1)
 *   5. Out of scope (at least 1 item — BLOCKING)
 *   6. Done criteria (must contain DONE | DONE_WITH_CONCERNS | BLOCKED)
 *
 * Output:
 *   Score: N/6 — READY | NOT READY (N blocking issues)
 *
 * Evaluator-Optimizer improvement: auto-fix for simple missing fields
 * (out_of_scope, done_criteria template).
 */

const fs = require('node:fs/promises');
const path = require('node:path');

// ─── Section matchers ────────────────────────────────────────────────────────

const SECTION_PATTERNS = {
  phase_objective: /^#+\s*(phase|objective|goal|task)\b/i,
  files_to_read: /^#+\s*(files?\s+to\s+read|read\s+first|input\s+files?)\b/i,
  files_to_write: /^#+\s*(files?\s+to\s+(write|create)|output\s+files?)\b/i,
  constraints: /^#+\s*(constraints?|hard\s+constraints?|rules?|guardrails?)\b/i,
  out_of_scope: /^#+\s*(out\s+of\s+scope|exclusions?|not\s+in\s+scope)\b/i,
  done_criteria: /^#+\s*(done\s+criteria|acceptance\s+criteria|definition\s+of\s+done|completion\s+criteria)\b/i
};

const DONE_VERDICTS = ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED'];
const FILE_ACTIONS = /\b(create|extend|modify|update|replace|overwrite|append|write)\b/i;

// ─── Brief parser ────────────────────────────────────────────────────────────

/**
 * Parse a brief markdown into structured sections.
 * Returns { sections: { name: string[] }, raw: string }
 */
function parseBrief(content) {
  const lines = content.split(/\r?\n/);
  const sections = {};
  let currentSection = null;

  for (const line of lines) {
    // Check if this line starts a recognized section
    let matched = false;
    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        currentSection = name;
        if (!sections[currentSection]) sections[currentSection] = [];
        matched = true;
        break;
      }
    }

    // Also detect generic headings as potential section enders
    if (!matched && /^#+\s/.test(line)) {
      currentSection = null;
    }

    if (currentSection && !matched) {
      sections[currentSection].push(line);
    }
  }

  return { sections, raw: content };
}

/**
 * Extract meaningful list items from section lines.
 */
function extractItems(lines) {
  return lines
    .filter((l) => l.match(/^\s*[-*]\s+/) || l.match(/^\s*\d+\.\s+/) || l.match(/^\s*\[.\]\s+/))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, '').replace(/^\s*\[.\]\s+/, '').trim())
    .filter(Boolean);
}

/**
 * Extract non-empty text content from section lines.
 */
function extractText(lines) {
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('```'))
    .join(' ')
    .trim();
}

// ─── Validators ──────────────────────────────────────────────────────────────

function validatePhaseObjective(sections) {
  const lines = sections.phase_objective || [];
  const text = extractText(lines);

  if (!text) {
    return { valid: false, field: 'phase_objective', message: 'Phase name/objective is missing' };
  }

  // Check ≤ 2 sentences (heuristic: count periods/exclamation/question marks)
  const sentenceCount = (text.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 3) {
    return { valid: false, field: 'phase_objective', message: `Objective has ${sentenceCount} sentences — keep it ≤ 2 for clarity` };
  }

  return { valid: true, field: 'phase_objective' };
}

function validateFilesToRead(sections, projectDir) {
  const lines = sections.files_to_read || [];
  const items = extractItems(lines);

  if (items.length === 0) {
    return { valid: false, field: 'files_to_read', message: 'No files to read specified' };
  }

  // Extract file paths from items (first path-like token)
  const paths = items
    .map((item) => {
      const match = item.match(/[\w./\\-]+\.\w+|[\w./\\-]+\//);
      return match ? match[0] : null;
    })
    .filter(Boolean);

  if (paths.length === 0) {
    return { valid: false, field: 'files_to_read', message: 'No recognizable file paths in "Files to read"' };
  }

  return { valid: true, field: 'files_to_read', paths };
}

function validateFilesToWrite(sections) {
  const lines = sections.files_to_write || [];
  const items = extractItems(lines);

  if (items.length === 0) {
    return { valid: false, field: 'files_to_write', message: 'No files to write specified' };
  }

  // Check at least one item has an action keyword
  const hasAction = items.some((item) => FILE_ACTIONS.test(item));
  if (!hasAction) {
    return {
      valid: false,
      field: 'files_to_write',
      message: 'Files to write must include at least one action (create|extend|modify)'
    };
  }

  return { valid: true, field: 'files_to_write' };
}

function validateConstraints(sections) {
  const lines = sections.constraints || [];
  const items = extractItems(lines);

  if (items.length === 0) {
    return { valid: false, field: 'constraints', message: 'No constraints specified' };
  }

  return { valid: true, field: 'constraints' };
}

function validateOutOfScope(sections) {
  const lines = sections.out_of_scope || [];
  const items = extractItems(lines);

  if (items.length === 0) {
    return {
      valid: false,
      field: 'out_of_scope',
      message: 'Out of scope section is missing or empty — BLOCKING',
      blocking: true,
      autoFixable: true
    };
  }

  return { valid: true, field: 'out_of_scope' };
}

function validateDoneCriteria(sections) {
  const lines = sections.done_criteria || [];
  const text = lines.join('\n');

  if (!text.trim()) {
    return {
      valid: false,
      field: 'done_criteria',
      message: 'Done criteria section is missing',
      autoFixable: true
    };
  }

  const hasVerdict = DONE_VERDICTS.some((v) => text.includes(v));
  if (!hasVerdict) {
    return {
      valid: false,
      field: 'done_criteria',
      message: 'Done criteria must contain DONE | DONE_WITH_CONCERNS | BLOCKED verdicts',
      autoFixable: true
    };
  }

  return { valid: true, field: 'done_criteria' };
}

// ─── Auto-fix generators ─────────────────────────────────────────────────────

/**
 * Generate a default "Out of scope" section based on brief context.
 */
function generateOutOfScope(sections) {
  const items = ['Refactoring code outside the listed files'];

  const writeItems = extractItems(sections.files_to_write || []);
  if (writeItems.length > 0) {
    items.push('Creating files not listed in "Files to write"');
  }

  items.push('Performance optimization beyond stated requirements');
  items.push('Documentation updates outside this brief\'s scope');

  return `\n## Out of scope\n${items.map((i) => `- ${i}`).join('\n')}\n`;
}

/**
 * Generate a default "Done criteria" section template.
 */
function generateDoneCriteria(sections) {
  const items = ['All files listed in "Files to write" are created/modified'];

  const constraintItems = extractItems(sections.constraints || []);
  if (constraintItems.length > 0) {
    items.push('All constraints are respected');
  }

  return `\n## Done criteria\n${items.map((i) => `- [ ] ${i}`).join('\n')}\n\nVerdict: DONE | DONE_WITH_CONCERNS | BLOCKED\n`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate a brief file for completeness.
 *
 * @param {string} briefPath  — Absolute or relative path to the brief markdown
 * @param {string} [projectDir]  — Project root for path resolution
 * @returns {Promise<object>}  — { ready, score, total, issues, autoFixable }
 */
async function validateBrief(briefPath, projectDir) {
  const resolvedPath = projectDir
    ? path.resolve(projectDir, briefPath)
    : path.resolve(briefPath);

  let content;
  try {
    content = await fs.readFile(resolvedPath, 'utf8');
  } catch (err) {
    return {
      ready: false,
      score: 0,
      total: 6,
      issues: [{ field: 'file', message: `Cannot read brief: ${err.message}` }],
      autoFixable: false
    };
  }

  const { sections } = parseBrief(content);

  const validators = [
    validatePhaseObjective,
    validateFilesToRead,
    validateFilesToWrite,
    validateConstraints,
    validateOutOfScope,
    validateDoneCriteria
  ];

  const results = validators.map((fn) => fn(sections, projectDir));
  const passed = results.filter((r) => r.valid).length;
  const issues = results.filter((r) => !r.valid);
  const autoFixable = issues.some((i) => i.autoFixable);

  return {
    ready: issues.length === 0,
    score: passed,
    total: 6,
    issues,
    autoFixable
  };
}

/**
 * Auto-fix simple missing fields in a brief.
 * Currently supports: out_of_scope, done_criteria.
 *
 * @param {string} briefPath  — Path to the brief
 * @param {string} [projectDir]  — Project root
 * @returns {Promise<object>}  — { fixed, fieldsFixed, newContent }
 */
async function autoFixBrief(briefPath, projectDir) {
  const resolvedPath = projectDir
    ? path.resolve(projectDir, briefPath)
    : path.resolve(briefPath);

  let content;
  try {
    content = await fs.readFile(resolvedPath, 'utf8');
  } catch (err) {
    return { fixed: false, error: err.message };
  }

  const { sections } = parseBrief(content);
  const fieldsFixed = [];
  let newContent = content;

  // Fix out_of_scope
  const oosResult = validateOutOfScope(sections);
  if (!oosResult.valid && oosResult.autoFixable) {
    newContent += generateOutOfScope(sections);
    fieldsFixed.push('out_of_scope');
  }

  // Fix done_criteria
  const dcResult = validateDoneCriteria(sections);
  if (!dcResult.valid && dcResult.autoFixable) {
    newContent += generateDoneCriteria(sections);
    fieldsFixed.push('done_criteria');
  }

  if (fieldsFixed.length === 0) {
    return { fixed: false, fieldsFixed: [] };
  }

  await fs.writeFile(resolvedPath, newContent, 'utf8');
  return { fixed: true, fieldsFixed, newContent };
}

module.exports = {
  validateBrief,
  autoFixBrief,
  parseBrief
};
