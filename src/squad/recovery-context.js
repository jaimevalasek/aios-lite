'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const stateManager = require('./state-manager');

const SQUADS_DIR = path.join('.aioson', 'squads');
const MAX_HISTORY_ENTRIES = 5;
const MAX_TOKENS = 2000;
const HISTORY_TOKEN_BUDGET = 600; // tokens reserved for history section

// Events that trigger an automatic refresh of the recovery context
const REFRESH_EVENTS = new Set(['task_completed', 'decision_made', 'handoff']);

// Approximate token count (chars / 4) + 1
function estimateTokens(str) {
  return Math.ceil(str.length / 4) + 1;
}

// ─── Data loaders ─────────────────────────────────────────────────────────────

async function readManifest(projectDir, squadSlug) {
  const p = path.join(projectDir, SQUADS_DIR, squadSlug, 'squad.manifest.json');
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Read recent bus events from the bus/ directory (JSONL files).
 * Falls back gracefully if no sessions exist yet.
 */
async function readRecentEvents(projectDir, squadSlug, limit = 10) {
  const busDir = path.join(projectDir, SQUADS_DIR, squadSlug, 'bus');
  try {
    const entries = await fs.readdir(busDir, { withFileTypes: true });
    const jsonlFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.jsonl'))
      .map((e) => path.join(busDir, e.name));

    if (jsonlFiles.length === 0) return [];

    // Read the most recent file (sorted by name — sessions use UUIDs/timestamps)
    const sorted = jsonlFiles.sort();
    const recentFile = sorted[sorted.length - 1];
    const content = await fs.readFile(recentFile, 'utf8');

    const events = content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);

    return events.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Read recent tasks from the most recent session plan.json.
 * Falls back gracefully if no sessions exist yet.
 */
async function readRecentTasks(projectDir, squadSlug, limit = 5) {
  const sessionsDir = path.join(projectDir, SQUADS_DIR, squadSlug, 'sessions');
  try {
    const sessionEntries = await fs.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = sessionEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort(); // lexicographic — UUID/timestamp sorts correctly

    if (sessionDirs.length === 0) return [];

    // Use most recent session
    const latestSession = sessionDirs[sessionDirs.length - 1];
    const planPath = path.join(sessionsDir, latestSession, 'plan.json');
    const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    return tasks.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Read context snapshot from STATE.md via state-manager.
 * Returns a simplified snapshot compatible with buildCurrentState().
 */
async function readContextSnapshot(projectDir, squadSlug) {
  try {
    const state = await stateManager.readState(projectDir, squadSlug);
    if (!state) return null;
    return {
      currentPhase: state.meta.current_session || '',
      recentDecisions: (state.decisions || []).slice(-5),
      activeBlockers: state.blockers || [],
      sessionsCompleted: state.meta.sessions_completed || 0
    };
  } catch {
    return null;
  }
}

// ─── Incremental compaction history ──────────────────────────────────────────

/**
 * Extract the "## Compaction History" section from an existing recovery-context.md.
 * Returns an array of raw entry strings (trimmed), oldest first.
 */
function extractCompactionHistory(existingContent) {
  if (!existingContent) return [];

  const match = existingContent.match(/## Compaction History\n([\s\S]*?)(?=\n---|\n## [^C]|$)/);
  if (!match) return [];

  // Split on "### Snapshot" entries
  const raw = match[1].trim();
  if (!raw) return [];

  const entries = raw.split(/(?=### Snapshot)/).map((e) => e.trim()).filter(Boolean);
  return entries;
}

/**
 * Extract the "## Current State" section from an existing recovery-context.md.
 * This becomes a history entry when a new snapshot is generated.
 */
function extractCurrentState(existingContent) {
  if (!existingContent) return null;

  const match = existingContent.match(/## Current State\n([\s\S]*?)(?=\n## |$)/);
  if (!match) return null;

  const body = match[1].trim();
  if (!body) return null;

  // Wrap as a Snapshot history entry
  const ts = existingContent.match(/> Last Updated: (.+)/)?.[1] || new Date().toISOString();
  return `### Snapshot — ${ts}\n${body}`;
}

// ─── Snapshot builder ─────────────────────────────────────────────────────────

/**
 * Build the "Current State" section content from live data.
 * This is the fresh snapshot injected on every recovery update.
 */
function buildCurrentState(squadSlug, agentSlug, manifest, tasks, events, ctxSnapshot) {
  const lines = [];

  // Squad goal
  if (manifest.goal) {
    lines.push(`**Squad goal:** ${manifest.goal}`);
    lines.push('');
  }

  // Agent role
  const executor = (manifest.executors || []).find((e) => e.slug === agentSlug);
  if (executor) {
    lines.push(`**Your role:** ${executor.title || agentSlug} — ${executor.role || ''}`);
    lines.push('');
  }

  // Recent tasks (most recent first, capped)
  if (tasks.length > 0) {
    lines.push('**Recent tasks:**');
    for (const t of tasks) {
      const status = t.status || 'unknown';
      const title = t.title || t.slug || t.id || '(untitled)';
      lines.push(`- [${status}] ${title}`);
      if (t.output && typeof t.output === 'string') {
        const out = t.output.length > 150 ? t.output.slice(0, 150) + '…' : t.output;
        lines.push(`  → ${out}`);
      }
    }
    lines.push('');
  }

  // Recent events (brief)
  if (events.length > 0) {
    lines.push('**Recent events:**');
    for (const ev of events.slice(-5)) {
      const type = ev.event_type || ev.type || 'event';
      const msg = ev.message || ev.summary || '';
      lines.push(`- ${type}: ${msg}`);
    }
    lines.push('');
  }

  // State snapshot (from STATE.md via state-manager)
  if (ctxSnapshot) {
    if (ctxSnapshot.sessionsCompleted) {
      lines.push(`**Sessions completed:** ${ctxSnapshot.sessionsCompleted}`);
    }
    if (ctxSnapshot.recentDecisions && ctxSnapshot.recentDecisions.length > 0) {
      lines.push('**Recent decisions:**');
      for (const d of ctxSnapshot.recentDecisions.slice(-3)) {
        const text = typeof d === 'string' ? d : (d.text || JSON.stringify(d));
        lines.push(`- ${text}`);
      }
      lines.push('');
    }
    if (ctxSnapshot.activeBlockers && ctxSnapshot.activeBlockers.length > 0) {
      lines.push('**Active blockers:**');
      for (const b of ctxSnapshot.activeBlockers) {
        const text = typeof b === 'string' ? b : (b.text || JSON.stringify(b));
        lines.push(`- ${text}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Full incremental markdown builder ───────────────────────────────────────

/**
 * Build the incremental recovery-context.md content.
 *
 * Strategy:
 *   1. Extract current "Current State" from existing file → becomes history entry
 *   2. Build fresh "Current State" from live data
 *   3. Assemble: header + current state + history (oldest → newest, capped)
 *   4. Enforce MAX_TOKENS budget by trimming history first
 */
function buildIncrementalRecovery(
  squadSlug, agentSlug,
  manifest, tasks, events, ctxSnapshot,
  existingContent
) {
  const now = new Date().toISOString();

  // Build fresh current state
  const currentState = buildCurrentState(squadSlug, agentSlug, manifest, tasks, events, ctxSnapshot);

  // Gather history: existing history entries + previous current state (if any)
  const prevState = extractCurrentState(existingContent);
  const existingHistory = extractCompactionHistory(existingContent);

  let historyEntries = [...existingHistory];
  if (prevState) historyEntries.push(prevState);
  // Keep only the most recent MAX_HISTORY_ENTRIES - 1 entries (we add current above)
  historyEntries = historyEntries.slice(-(MAX_HISTORY_ENTRIES - 1));

  // Assemble full content
  const headerLines = [
    `# Recovery Context — ${squadSlug} / ${agentSlug}`,
    `> Last Updated: ${now}`,
    '',
    '## Current State',
    currentState,
    ''
  ];

  const historyLines = historyEntries.length > 0
    ? ['## Compaction History', '*Previous snapshots — oldest → newest:*', '', ...historyEntries.map((e) => e + '\n'), '']
    : [];

  const footerLines = [
    '---',
    '*Inject at top of session to restore context after compact.*'
  ];

  const allLines = [...headerLines, ...historyLines, ...footerLines];
  let content = allLines.join('\n');

  // Enforce token budget: trim history entries if needed
  while (estimateTokens(content) > MAX_TOKENS && historyEntries.length > 0) {
    historyEntries.shift(); // remove oldest entry
    const trimmedHistoryLines = historyEntries.length > 0
      ? ['## Compaction History', '*Previous snapshots — oldest → newest:*', '', ...historyEntries.map((e) => e + '\n'), '']
      : [];
    content = [...headerLines, ...trimmedHistoryLines, ...footerLines].join('\n');
  }

  return content;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate and write recovery-context.md for a squad agent.
 * Uses incremental merging: preserves compaction history across cycles.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} agentSlug
 * @returns {{ ok: boolean, path: string, tokens: number, incremental: boolean }}
 */
async function generateRecovery(projectDir, squadSlug, agentSlug) {
  const outDir = path.join(projectDir, SQUADS_DIR, squadSlug);
  const outPath = path.join(outDir, 'recovery-context.md');

  const [manifest, tasks, events, ctxSnapshot, existingContent] = await Promise.all([
    readManifest(projectDir, squadSlug),
    readRecentTasks(projectDir, squadSlug),
    readRecentEvents(projectDir, squadSlug),
    readContextSnapshot(projectDir, squadSlug),
    fs.readFile(outPath, 'utf8').catch(() => null)
  ]);

  const content = buildIncrementalRecovery(
    squadSlug, agentSlug,
    manifest, tasks, events, ctxSnapshot,
    existingContent
  );

  const tokens = estimateTokens(content);
  const incremental = Boolean(existingContent);

  // Build structured handoff JSON (consumed by MCP resources, Agent Teams adapter, etc.)
  const completedTasks = tasks.filter((t) => t.status === 'completed').map((t) => t.title || t.id || '(untitled)');
  const pendingTasks = tasks.filter((t) => t.status !== 'completed').map((t) => t.title || t.id || '(untitled)');
  const handoffJson = {
    agent: agentSlug,
    squad: squadSlug,
    session_id: null,
    compacted_at: new Date().toISOString(),
    summary: {
      tasks_completed: completedTasks,
      pending_work: pendingTasks,
      key_files: [],
      decisions: []
    },
    resume_instruction: 'Continue from this checkpoint. Do not acknowledge this summary.'
  };

  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, content, 'utf8');
    await fs.writeFile(
      path.join(outDir, 'last-handoff.json'),
      JSON.stringify(handoffJson, null, 2),
      'utf8'
    );
  } catch (err) {
    return { ok: false, error: err.message, path: outPath, tokens, incremental };
  }

  return { ok: true, path: outPath, tokens, squadSlug, agentSlug, incremental };
}

/**
 * Read the current recovery-context.md for a squad (returns null if missing).
 */
async function readRecovery(projectDir, squadSlug) {
  const p = path.join(projectDir, SQUADS_DIR, squadSlug, 'recovery-context.md');
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Check if a runtime event should trigger a recovery refresh.
 */
function shouldRefreshOnEvent(eventType) {
  return REFRESH_EVENTS.has(eventType);
}

module.exports = {
  generateRecovery,
  readRecovery,
  shouldRefreshOnEvent,
  REFRESH_EVENTS,
  estimateTokens
};
