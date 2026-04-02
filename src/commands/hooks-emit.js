'use strict';

/**
 * aioson hooks:emit [projectDir] --agent=<name> --source=<tool>
 *
 * Called by Claude Code / Antigravity / Codex hooks on every tool use.
 * Reads the hook payload from stdin (JSON), maps it to an AIOSON runtime event,
 * and writes it to the active live session in SQLite + events.ndjson.
 *
 * If no live session exists, auto-starts one (--no-launch mode) before emitting.
 *
 * Designed to be fast (< 50ms hot path) and never block the agent.
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { execFileSync } = require('node:child_process');
const {
  openRuntimeDb,
  resolveRuntimePaths,
  readAgentSession,
  appendRunEvent,
  startTask,
  startRun,
  writeAgentSession
} = require('../runtime-store');

const HOOKS_EMIT_VERSION = '1';

// Tool name → event_type mapping
const TOOL_EVENT_MAP = {
  Write: 'artifact',
  Edit: 'artifact',
  MultiEdit: 'artifact',
  Bash: 'step_done',
  Task: 'note',
  TodoWrite: 'note',
  WebSearch: 'note',
  WebFetch: 'note'
};

// Tools to skip — too noisy, no meaningful event
const SKIP_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS', 'NotebookRead', 'mcp__']);

function nowIso() {
  return new Date().toISOString();
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) { resolve(null); return; }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve(null); }
    });
    // Timeout: don't block if stdin is empty
    setTimeout(() => resolve(null), 500);
  });
}

function buildEventFromPayload(payload, source) {
  if (!payload) return null;

  const toolName = payload.tool_name || payload.toolName || null;
  if (!toolName) return null;

  // Skip noisy read-only tools
  if (SKIP_TOOLS.has(toolName) || [...SKIP_TOOLS].some((p) => toolName.startsWith(p))) {
    return null;
  }

  const eventType = TOOL_EVENT_MAP[toolName] || 'note';
  const input = payload.tool_input || payload.toolInput || {};

  let message = `[${source}] ${toolName}`;
  let filePath = null;

  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') {
    filePath = input.file_path || input.path || null;
    message = filePath ? `${toolName}: ${path.basename(filePath)}` : `${toolName}`;
  } else if (toolName === 'Bash') {
    const cmd = String(input.command || input.cmd || '').trim().slice(0, 80);
    message = cmd ? `$ ${cmd}` : 'Bash';
  } else if (toolName === 'Task') {
    const desc = String(input.description || input.prompt || '').slice(0, 80);
    message = desc || 'Task launched';
  } else if (toolName === 'TodoWrite') {
    message = 'Task list updated';
  }

  return {
    eventType,
    message,
    filePath,
    toolName,
    sessionId: payload.session_id || payload.sessionId || null
  };
}

async function ensureOrCreateLiveSession(targetDir, agentName, source, runtimeDir) {
  // Fast path: check existing session file
  const session = await readAgentSession(runtimeDir, agentName);
  if (session && !session.finished && session.source === 'live' && session.runKey) {
    return session.runKey;
  }

  // No session — auto-start one inline (no-launch mode)
  const now = nowIso();
  const sessionKey = `hooks-${agentName}-${Date.now()}`;
  const title = `[hooks] ${agentName} via ${source}`;

  const { db } = await openRuntimeDb(targetDir);
  try {
    const taskKey = startTask(db, {
      sessionKey,
      title,
      status: 'running',
      createdBy: agentName,
      taskKind: 'live_session',
      metaJson: { tool_session: source, path: targetDir, auto_started: true }
    });

    const runKey = startRun(db, {
      taskKey,
      agentName,
      agentKind: 'official',
      sessionKey,
      source: 'live',
      title,
      eventType: 'session_started',
      phase: 'live',
      message: `Auto-started by hooks:emit (${source})`,
      payload: { tool_session: source, path: targetDir, hooks_version: HOOKS_EMIT_VERSION }
    });

    await writeAgentSession(runtimeDir, agentName, {
      runKey,
      taskKey,
      sessionKey,
      startedAt: now,
      finished: false,
      source: 'live'
    });

    // Write state.json for dashboard live view
    const stateDir = path.join(runtimeDir, 'live', sessionKey);
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, 'state.json'), JSON.stringify({
      session_key: sessionKey,
      run_key: runKey,
      task_key: taskKey,
      agent_name: agentName,
      tool_session: source,
      status: 'running',
      started_at: now,
      updated_at: now,
      auto_started: true,
      last_events: [{ ts: now, type: 'session_started', summary: `Auto-started by hooks:emit (${source})` }]
    }, null, 2), 'utf8');

    return runKey;
  } finally {
    db.close();
  }
}

async function appendLiveEventFile(runtimeDir, runKey, event) {
  // Find the session dir for this runKey
  try {
    const liveRoot = path.join(runtimeDir, 'live');
    const entries = await fs.readdir(liveRoot).catch(() => []);
    for (const entry of entries) {
      const statePath = path.join(liveRoot, entry, 'state.json');
      try {
        const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
        if (state.run_key === runKey) {
          const eventsPath = path.join(liveRoot, entry, 'events.ndjson');
          await fs.appendFile(eventsPath, JSON.stringify(event) + '\n', 'utf8');

          // Update state.json updated_at + last_events
          state.updated_at = event.ts;
          const lastEvents = state.last_events || [];
          lastEvents.push({ ts: event.ts, type: event.type, summary: event.summary || event.message });
          state.last_events = lastEvents.slice(-10); // keep last 10
          await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
          break;
        }
      } catch { /* skip */ }
    }
  } catch { /* non-fatal */ }
}

async function runHooksEmit({ args, options = {} }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const agentName = options.agent ? String(options.agent).replace(/^@/, '') : 'dev';
  const source = options.source ? String(options.source).trim() : 'claude';

  // Silence all output — hooks must be silent
  const logger = { log: () => {}, error: () => {} };

  try {
    const { runtimeDir } = resolveRuntimePaths(targetDir);

    // Read hook payload from stdin
    const payload = await readStdin();
    const event = buildEventFromPayload(payload, source);

    // Skip if no meaningful event (read-only tools, etc.)
    if (!event) return { ok: true, skipped: true };

    const now = nowIso();

    // Ensure live session exists (fast path: session file read)
    const runKey = await ensureOrCreateLiveSession(targetDir, agentName, source, runtimeDir);

    // Write to SQLite
    const { db } = await openRuntimeDb(targetDir, { mustExist: true });
    try {
      appendRunEvent(db, {
        runKey,
        eventType: event.eventType,
        phase: 'live',
        status: 'running',
        message: event.message,
        payload: event.filePath ? { file: event.filePath, tool: event.toolName } : { tool: event.toolName },
        createdAt: now
      });
    } finally {
      db.close();
    }

    // Append to events.ndjson for real-time dashboard view
    await appendLiveEventFile(runtimeDir, runKey, {
      ts: now,
      type: event.eventType,
      message: event.message,
      tool: event.toolName,
      file: event.filePath || undefined,
      source,
      agent: agentName
    });

    return { ok: true, runKey, event: event.eventType, message: event.message };
  } catch {
    // Never fail — hooks must not block the agent
    return { ok: false };
  }
}

module.exports = { runHooksEmit };
