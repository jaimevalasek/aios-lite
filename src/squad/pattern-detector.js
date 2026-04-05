'use strict';

/**
 * Pattern Detector — Plan 80, Script 4
 *
 * Detects automation candidates from squad learnings, bus messages,
 * STATE.md decisions, and devlogs. Uses heuristics only (no LLM).
 *
 * Heuristics:
 *   - Same learning type repeated ≥ N times → candidate for script
 *   - Block→resolution sequence identical ≥ 2x → candidate for automation
 *   - must_haves failing on same artifact ≥ 2x → candidate for pre-check
 *   - Wave dependency systematic between same executors → candidate for merge
 *
 * Can be used as stage 0 of learning:evolve pipeline.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const SQUADS_DIR = path.join('.aioson', 'squads');

// ─── Data loaders ────────────────────────────────────────────────────────────

/**
 * Load learnings from SQLite for a given squad.
 */
async function loadLearningsFromDb(projectDir, squadSlug, minOccurrences) {
  let openRuntimeDb;
  try {
    ({ openRuntimeDb } = require('../runtime-store'));
  } catch {
    return [];
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) return [];
  const { db } = handle;

  try {
    const rows = db.prepare(
      'SELECT * FROM squad_learnings WHERE squad_slug = ? AND frequency >= ? ORDER BY frequency DESC, created_at DESC'
    ).all(squadSlug, minOccurrences);
    return rows;
  } catch {
    return [];
  } finally {
    db.close();
  }
}

/**
 * Load evolution log from SQLite.
 */
async function loadEvolutionLog(projectDir, squadSlug) {
  let openRuntimeDb;
  try {
    ({ openRuntimeDb } = require('../runtime-store'));
  } catch {
    return [];
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) return [];
  const { db } = handle;

  try {
    const rows = db.prepare(
      'SELECT * FROM evolution_log WHERE squad_slug = ? ORDER BY applied_at DESC LIMIT 50'
    ).all(squadSlug);
    return rows;
  } catch {
    return [];
  } finally {
    db.close();
  }
}

/**
 * Load STATE.md decisions.
 */
async function loadStateDecisions(projectDir, squadSlug) {
  const statePath = path.join(projectDir, SQUADS_DIR, squadSlug, 'STATE.md');
  try {
    const content = await fs.readFile(statePath, 'utf8');
    const match = content.match(/## Decisions Made\n([\s\S]*?)(?=\n## |$)/);
    if (!match) return [];
    return match[1]
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2).trim());
  } catch {
    return [];
  }
}

/**
 * Load learnings index (manual).
 */
async function loadManualLearnings(projectDir, squadSlug) {
  const indexPath = path.join(projectDir, SQUADS_DIR, squadSlug, 'learnings', 'index.md');
  try {
    const content = await fs.readFile(indexPath, 'utf8');
    return content
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2).trim());
  } catch {
    return [];
  }
}

/**
 * Load devlog entries.
 */
async function loadDevlogs(projectDir, squadSlug) {
  const logsDir = path.join(projectDir, 'aioson-logs', squadSlug);
  const entries = [];

  try {
    const files = await fs.readdir(logsDir);
    const devlogs = files.filter((f) => f.startsWith('devlog-') && f.endsWith('.md')).sort().slice(-10);

    for (const f of devlogs) {
      const content = await fs.readFile(path.join(logsDir, f), 'utf8');
      entries.push({ file: f, content });
    }
  } catch { /* no logs dir */ }

  return entries;
}

// ─── Pattern heuristics ──────────────────────────────────────────────────────

/**
 * Detect repeated learnings of the same type → candidate for script.
 */
function detectRepeatedLearnings(learnings, minOccurrences) {
  const candidates = [];

  // Group by normalized title similarity
  const groups = {};
  for (const l of learnings) {
    // Normalize title to group similar learnings
    const key = l.type + ':' + normalizeTitle(l.title);
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  }

  for (const [key, group] of Object.entries(groups)) {
    if (group.length >= minOccurrences || group.some((l) => l.frequency >= minOccurrences)) {
      const maxFreq = Math.max(...group.map((l) => l.frequency || 1));
      const latest = group.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
      candidates.push({
        priority: maxFreq >= 5 ? 'HIGH' : 'MEDIUM',
        name: `repeated-${latest.type}-learning`,
        pattern: `Same ${latest.type} learning repeated ${maxFreq}x: "${latest.title.slice(0, 80)}"`,
        seen: group.length,
        lastDate: latest.updated_at || latest.created_at,
        automatable: 'yes',
        proposed: `Create a pre-check script or rule that prevents this ${latest.type} issue`
      });
    }
  }

  return candidates;
}

/**
 * Detect block→resolution sequences that repeat → candidate for automation.
 */
function detectBlockResolutionPatterns(learnings) {
  const candidates = [];

  // Look for process learnings that mention "blocked" or "resolved"
  const blockLearnings = learnings.filter(
    (l) => l.type === 'process' && /block|resolv|retry|closure/i.test(l.title)
  );

  // Group by similarity
  const groups = {};
  for (const l of blockLearnings) {
    const key = normalizeTitle(l.title);
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  }

  for (const [, group] of Object.entries(groups)) {
    if (group.length >= 2 || group.some((l) => l.frequency >= 2)) {
      const latest = group[0];
      candidates.push({
        priority: 'HIGH',
        name: 'block-resolution-automation',
        pattern: `Block→resolution sequence repeated: "${latest.title.slice(0, 80)}"`,
        seen: group.length,
        lastDate: latest.updated_at || latest.created_at,
        automatable: 'partial',
        proposed: 'Create an automatic resolver or pre-validation to prevent this block'
      });
    }
  }

  return candidates;
}

/**
 * Detect must_haves failures on same artifact → candidate for pre-check.
 */
function detectMustHavesPatterns(learnings) {
  const candidates = [];

  const qualityLearnings = learnings.filter(
    (l) => l.type === 'quality' && /must_haves|artifact/i.test(l.title)
  );

  const groups = {};
  for (const l of qualityLearnings) {
    const key = normalizeTitle(l.title);
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  }

  for (const [, group] of Object.entries(groups)) {
    if (group.length >= 2 || group.some((l) => l.frequency >= 2)) {
      const latest = group[0];
      candidates.push({
        priority: 'MEDIUM',
        name: 'must-haves-precheck',
        pattern: `must_haves failing on same artifact: "${latest.title.slice(0, 80)}"`,
        seen: group.length,
        lastDate: latest.updated_at || latest.created_at,
        automatable: 'yes',
        proposed: 'Add artifact existence check to brief-validator or pre_run hook'
      });
    }
  }

  return candidates;
}

/**
 * Detect patterns in STATE.md decisions that suggest systematic behavior.
 */
function detectDecisionPatterns(decisions) {
  const candidates = [];

  // Look for repeated decision themes
  const themes = {};
  for (const d of decisions) {
    // Extract theme keywords
    const words = d.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    for (const w of words) {
      if (!themes[w]) themes[w] = 0;
      themes[w]++;
    }
  }

  // Find themes that appear in 3+ decisions
  for (const [theme, count] of Object.entries(themes)) {
    if (count >= 3 && !['completed', 'session', 'tasks'].includes(theme)) {
      candidates.push({
        priority: 'LOW',
        name: `decision-theme-${theme}`,
        pattern: `Theme "${theme}" appears in ${count} decisions — may indicate systematic pattern`,
        seen: count,
        lastDate: null,
        automatable: 'partial',
        proposed: 'Review decisions for extractable rule or automation'
      });
    }
  }

  return candidates;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Detect automation candidates for a squad.
 *
 * @param {string} projectDir  — Project root
 * @param {string} squadSlug  — Squad identifier
 * @param {object} [options]  — { minOccurrences }
 * @returns {Promise<object>}  — { candidates[], sources }
 */
async function detectPatterns(projectDir, squadSlug, options = {}) {
  const minOccurrences = options.minOccurrences || 3;

  // Load all data sources in parallel
  const [learnings, evolutionLog, decisions, manualLearnings, devlogs] = await Promise.all([
    loadLearningsFromDb(projectDir, squadSlug, 1), // load all, filter later
    loadEvolutionLog(projectDir, squadSlug),
    loadStateDecisions(projectDir, squadSlug),
    loadManualLearnings(projectDir, squadSlug),
    loadDevlogs(projectDir, squadSlug)
  ]);

  const sources = {
    db_learnings: learnings.length,
    evolution_entries: evolutionLog.length,
    state_decisions: decisions.length,
    manual_learnings: manualLearnings.length,
    devlog_files: devlogs.length
  };

  // Run all heuristics
  const candidates = [
    ...detectRepeatedLearnings(learnings, minOccurrences),
    ...detectBlockResolutionPatterns(learnings),
    ...detectMustHavesPatterns(learnings),
    ...detectDecisionPatterns(decisions)
  ];

  // Sort by priority (HIGH > MEDIUM > LOW)
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  candidates.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  return {
    squad: squadSlug,
    candidates,
    total: candidates.length,
    sources
  };
}

/**
 * Format detection results as a human-readable report.
 */
function formatPatternReport(result) {
  if (result.total === 0) {
    return `No automation candidates detected for squad "${result.squad}".\nSources analyzed: ${JSON.stringify(result.sources)}`;
  }

  const lines = [];
  lines.push(`Detected ${result.total} automation candidate${result.total > 1 ? 's' : ''} for squad "${result.squad}":`);
  lines.push('');

  for (let i = 0; i < result.candidates.length; i++) {
    const c = result.candidates[i];
    lines.push(`${i + 1}. [${c.priority}] ${c.name}`);
    lines.push(`   Pattern: ${c.pattern}`);
    lines.push(`   Seen: ${c.seen} sessions${c.lastDate ? ` — Last: ${c.lastDate}` : ''}`);
    lines.push(`   Automatable: ${c.automatable}`);
    lines.push(`   → Proposed: ${c.proposed}`);
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  detectPatterns,
  formatPatternReport
};
