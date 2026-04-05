'use strict';

/**
 * Squad Dashboard App Logic — Plan 81, Phase 4.1
 *
 * Provides data fetching and rendering logic for the MCP App dashboard.
 * Can run standalone (via HTTP API) or embedded in MCP App context.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const SQUADS_DIR = path.join('.aioson', 'squads');

// ─── State readers ───────────────────────────────────────────────────────────

async function readSquadState(projectDir, squadSlug) {
  const statePath = path.join(projectDir, SQUADS_DIR, squadSlug, 'STATE.md');
  try {
    const content = await fs.readFile(statePath, 'utf8');
    // Parse frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { raw: content };

    const meta = {};
    for (const line of match[1].split('\n')) {
      const kv = line.match(/^(\w[\w_]*):\s*(.+)$/);
      if (kv) {
        const val = kv[2].trim();
        if (/^\d+(\.\d+)?$/.test(val)) meta[kv[1]] = Number(val);
        else meta[kv[1]] = val.replace(/^["']|["']$/g, '');
      }
    }

    return { ...meta, raw: content };
  } catch {
    return null;
  }
}

async function readBusState(projectDir, squadSlug) {
  // Find the most recent session
  const sessionsDir = path.join(projectDir, SQUADS_DIR, squadSlug, 'sessions');
  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
    const sessions = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();

    if (sessions.length === 0) return { messages: [], total: 0 };

    const latestSession = sessions[0];
    const busPath = path.join(sessionsDir, latestSession, 'bus.jsonl');
    const raw = await fs.readFile(busPath, 'utf8');
    const messages = raw.split('\n')
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);

    // Classify
    const blocks = messages.filter((m) => m.type === 'block');
    const results = messages.filter((m) => m.type === 'result');
    const byType = {};
    const byExecutor = {};
    for (const m of messages) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      byExecutor[m.from] = (byExecutor[m.from] || 0) + 1;
    }

    return {
      sessionId: latestSession,
      total: messages.length,
      blocks: blocks.length,
      results: results.length,
      byType,
      byExecutor,
      lastMessages: messages.slice(-20)
    };
  } catch {
    return { messages: [], total: 0 };
  }
}

async function readBudgetState(projectDir, squadSlug) {
  const manifestPath = path.join(projectDir, SQUADS_DIR, squadSlug, 'squad.manifest.json');
  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    return manifest.budget || { max_tokens_per_session: null, max_tokens_per_task: null };
  } catch {
    return {};
  }
}

async function readWavesState(projectDir, squadSlug) {
  const sessionsDir = path.join(projectDir, SQUADS_DIR, squadSlug, 'sessions');
  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
    const sessions = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();

    if (sessions.length === 0) return { waves: [] };

    const planPath = path.join(sessionsDir, sessions[0], 'plan.json');
    const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));

    const waves = [];
    const groups = plan.parallel_groups || {};

    for (const [groupNum, taskIds] of Object.entries(groups)) {
      const waveTasks = taskIds.map((id) => {
        const task = plan.tasks.find((t) => t.id === id);
        return task ? {
          id: task.id,
          title: task.title,
          executor: task.executor,
          status: task.status || 'pending'
        } : { id, status: 'unknown' };
      });

      const allDone = waveTasks.every((t) => t.status === 'completed');
      const anyRunning = waveTasks.some((t) => t.status === 'in_progress');
      const anyBlocked = waveTasks.some((t) => t.status === 'escalated' || t.status === 'failed');

      waves.push({
        wave: Number(groupNum),
        status: allDone ? 'DONE' : anyRunning ? 'RUNNING' : anyBlocked ? 'BLOCKED' : 'PENDING',
        tasks: waveTasks
      });
    }

    return { sessionId: sessions[0], waves, goal: plan.goal };
  } catch {
    return { waves: [] };
  }
}

// ─── Composite dashboard data ────────────────────────────────────────────────

/**
 * Get complete dashboard data for a squad.
 */
async function getDashboardData(projectDir, squadSlug) {
  const [state, busState, budget, wavesState] = await Promise.all([
    readSquadState(projectDir, squadSlug),
    readBusState(projectDir, squadSlug),
    readBudgetState(projectDir, squadSlug),
    readWavesState(projectDir, squadSlug)
  ]);

  return {
    squad: squadSlug,
    timestamp: new Date().toISOString(),
    state,
    bus: busState,
    budget,
    waves: wavesState
  };
}

module.exports = {
  getDashboardData,
  readSquadState,
  readBusState,
  readBudgetState,
  readWavesState
};
