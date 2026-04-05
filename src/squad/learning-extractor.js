'use strict';

/**
 * Automatic Learning Extraction — Phase 5.1
 *
 * Reads bus messages and task results after a squad:autorun session and
 * extracts structured learnings using heuristics (no LLM by default).
 *
 * Detected patterns:
 *   block + resolution → type: 'process' (error-pattern)
 *   verdict NEEDS_ITERATION + retry success → type: 'process' (correction)
 *   must_haves artifact failures → type: 'quality' (missing-dependency)
 *   tasks in wave > 1 blocking others → type: 'process' (dependency-pattern)
 *
 * With --llm-extract: uses model 'fast' for richer extraction (opt-in).
 */

const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb, upsertSquadLearning } = require('../runtime-store');

function nowIso() { return new Date().toISOString(); }

/**
 * Extract learnings from a completed squad:autorun session.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} sessionId
 * @param {{ busMessages: object[], taskResults: object[], reflectionReports: object[] }} data
 * @returns {Promise<object[]>} Array of extracted learning objects
 */
async function extractLearnings(projectDir, squadSlug, sessionId, data) {
  const { busMessages = [], taskResults = [], reflectionReports = [] } = data;
  const extracted = [];

  // ── Pattern 1: Block + Resolution pairs → error-pattern ──────────────────
  const blocks = busMessages.filter((m) => m.type === 'block');
  const resolutions = busMessages.filter((m) => m.type === 'resolution');

  for (const block of blocks) {
    const hasResolution = resolutions.some(
      (r) => r.metadata?.block_id === block.id || r.to === block.from
    );
    if (hasResolution) {
      const title = `Executor "${block.from}" blocked on: ${String(block.content || '').slice(0, 80)}`;
      extracted.push({
        type: 'process',
        title,
        signal: 'implicit',
        confidence: 'medium',
        evidence: `Session ${sessionId} — block resolved via coordinator`,
        source_session: sessionId
      });
    }
  }

  // ── Pattern 2: NEEDS_ITERATION + successful gap_closure → correction ──────
  const gapAttempts = busMessages.filter((m) => m.type === 'gap_closure_attempt');
  const resultMessages = busMessages.filter((m) => m.type === 'result');

  for (const attempt of gapAttempts) {
    const taskId = attempt.metadata?.task_id;
    if (!taskId) continue;

    const laterResult = resultMessages.find(
      (r) => r.metadata?.task_id === taskId && r.ts > attempt.ts && r.metadata?.status === 'completed'
    );
    if (laterResult) {
      const prevError = String(attempt.metadata?.prev_error || '').slice(0, 100);
      extracted.push({
        type: 'process',
        title: `Task "${taskId}" succeeded after correction — initial failure: ${prevError}`,
        signal: 'implicit',
        confidence: 'high',
        evidence: `Gap closure retry succeeded in session ${sessionId}`,
        source_session: sessionId
      });
    }
  }

  // ── Pattern 3: must_haves artifact failures → quality ────────────────────
  for (const result of taskResults) {
    const mustHaves = result.task?.must_haves;
    if (!mustHaves || result.finalStatus === 'completed') continue;

    const artifacts = mustHaves.artifacts || [];
    if (artifacts.length > 0 && result.finalStatus !== 'completed') {
      extracted.push({
        type: 'quality',
        title: `Task "${result.task.id}" failed must_haves artifacts: ${artifacts.slice(0, 2).join(', ')}`,
        signal: 'implicit',
        confidence: 'medium',
        evidence: `must_haves check failed in session ${sessionId}`,
        source_session: sessionId
      });
    }
  }

  // ── Pattern 4: Escalated tasks after gap closure exhaustion → process ─────
  const escalated = taskResults.filter(
    (r) => r.finalStatus === 'escalated' && r.workerResult?.gap_closure_exhausted
  );
  for (const r of escalated) {
    const lastErr = String(r.workerResult?.error || '').slice(0, 100);
    extracted.push({
      type: 'process',
      title: `Task "${r.task.id}" cannot complete autonomously — requires human: ${lastErr}`,
      signal: 'implicit',
      confidence: 'high',
      evidence: `Escalated after max gap closure retries in session ${sessionId}`,
      source_session: sessionId
    });
  }

  if (extracted.length === 0) return [];

  // ── Persist to SQLite ──────────────────────────────────────────────────────
  const handle = await openRuntimeDb(projectDir);
  if (!handle) return extracted;
  const { db } = handle;

  try {
    for (const learning of extracted) {
      upsertSquadLearning(db, {
        squadSlug,
        type: learning.type,
        title: learning.title,
        signal: learning.signal,
        confidence: learning.confidence,
        evidence: learning.evidence,
        sourceSession: learning.source_session,
        appliesTo: 'squad'
      });
    }
  } finally {
    db.close();
  }

  return extracted;
}

// ─── Per-Agent Persistent Memory (Plan 81 §Sprint 4) ────────────────────────

const AGENT_MEMORY_DIR = 'agent-memory';

/**
 * Persist learnings to per-agent memory files.
 *
 * After extracting learnings from a session, writes relevant learnings
 * to `.aioson/squads/{slug}/agent-memory/{executor}.md` so they can be
 * loaded by worker-runner at spawn time.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {object[]} learnings  — extracted learning objects
 * @param {object[]} taskResults  — task results with executor info
 */
async function persistAgentMemory(projectDir, squadSlug, learnings, taskResults = []) {
  if (learnings.length === 0) return;

  const memoryDir = path.join(
    projectDir, '.aioson', 'squads', squadSlug, AGENT_MEMORY_DIR
  );
  await fs.mkdir(memoryDir, { recursive: true });

  // Group learnings by executor
  const byExecutor = {};
  for (const learning of learnings) {
    // Match learning to executor via task results evidence
    const executors = new Set();
    for (const r of taskResults) {
      if (!r.task?.executor) continue;
      // Match by task id in the learning title or evidence
      const taskId = r.task.id || '';
      if (learning.title.includes(taskId) || learning.title.includes(r.task.executor)) {
        executors.add(r.task.executor);
      }
    }
    // If no specific executor matched, attribute to all executors in this session
    if (executors.size === 0) {
      for (const r of taskResults) {
        if (r.task?.executor) executors.add(r.task.executor);
      }
    }
    for (const exec of executors) {
      if (!byExecutor[exec]) byExecutor[exec] = [];
      byExecutor[exec].push(learning);
    }
  }

  // Append to each executor's memory file
  for (const [executor, execLearnings] of Object.entries(byExecutor)) {
    const memPath = path.join(memoryDir, `${executor}.md`);
    let existing = '';
    try { existing = await fs.readFile(memPath, 'utf8'); } catch { /* new file */ }

    const newEntries = execLearnings.map((l) =>
      `- [${l.type}] ${l.title} (confidence: ${l.confidence})`
    ).join('\n');

    const header = existing ? '' : `# Agent Memory: ${executor}\n\n`;
    const separator = existing ? `\n\n## Session ${nowIso().slice(0, 10)}\n\n` : '## Learnings\n\n';
    const content = existing
      ? existing.trimEnd() + separator + newEntries + '\n'
      : header + separator + newEntries + '\n';

    await fs.writeFile(memPath, content, 'utf8');
  }
}

module.exports = { extractLearnings, persistAgentMemory };
