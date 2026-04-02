'use strict';

/**
 * Intra-squad message bus
 *
 * Executors within the same squad session write and read from a shared
 * append-only bus file. This enables real-time communication between
 * agents without going through the coordinator.
 *
 * Bus file location:
 *   .aioson/squads/{squadSlug}/sessions/{sessionId}/bus.jsonl
 *
 * Message schema:
 *   { id, session_id, from, to, type, content, ts, metadata }
 *
 * Message types:
 *   finding   — executor discovered something relevant to others
 *   feedback  — critique or review of another executor's output
 *   question  — executor needs input from a peer
 *   result    — executor completed a task, sharing output summary
 *   status    — executor announcing current activity (mirrors task list)
 *   block     — executor is blocked, needs coordinator or peer help
 */

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const BUS_FILE = 'bus.jsonl';
const VALID_TYPES = new Set(['finding', 'feedback', 'question', 'result', 'status', 'block']);
const DEFAULT_POLL_MS = 1500;
const MAX_WATCH_TIMEOUT_MS = 60 * 60 * 1000; // 1h hard cap

function busDir(projectDir, squadSlug, sessionId) {
  return path.join(projectDir, '.aioson', 'squads', squadSlug, 'sessions', sessionId);
}

function busPath(projectDir, squadSlug, sessionId) {
  return path.join(busDir(projectDir, squadSlug, sessionId), BUS_FILE);
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Post a message to the bus.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} sessionId
 * @param {object} msg  — { from, to?, type, content, metadata? }
 * @returns {Promise<object>} Full message with id and ts
 */
async function post(projectDir, squadSlug, sessionId, msg) {
  const { from, to = '*', type, content, metadata = {} } = msg;

  if (!from) throw new Error('bus.post: msg.from is required');
  if (!content) throw new Error('bus.post: msg.content is required');
  if (!VALID_TYPES.has(type)) {
    throw new Error(`bus.post: invalid type "${type}". Valid: ${[...VALID_TYPES].join(', ')}`);
  }

  const entry = {
    id: randomUUID(),
    session_id: sessionId,
    from,
    to,
    type,
    content: String(content),
    ts: nowIso(),
    metadata
  };

  const dir = busDir(projectDir, squadSlug, sessionId);
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(busPath(projectDir, squadSlug, sessionId), JSON.stringify(entry) + '\n', 'utf8');

  return entry;
}

/**
 * Read messages from the bus.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} sessionId
 * @param {object} [filters]  — { from?, to?, type?, since? (ISO string), last? (N messages) }
 * @returns {Promise<object[]>}
 */
async function read(projectDir, squadSlug, sessionId, filters = {}) {
  const filePath = busPath(projectDir, squadSlug, sessionId);

  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = raw.split('\n').filter(Boolean);
  let messages = [];

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }

  const { from, to, type, since, last } = filters;

  if (from) messages = messages.filter((m) => m.from === from);
  if (to) messages = messages.filter((m) => m.to === to || m.to === '*');
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    messages = messages.filter((m) => types.includes(m.type));
  }
  if (since) {
    const sinceMs = new Date(since).getTime();
    messages = messages.filter((m) => new Date(m.ts).getTime() > sinceMs);
  }
  if (last && last > 0) {
    messages = messages.slice(-last);
  }

  return messages;
}

/**
 * Watch the bus for new messages.
 * Polls the file at a configurable interval.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} sessionId
 * @param {function} onMessage  — called with each new message
 * @param {object} [options]  — { pollMs?, timeoutMs?, to?, type? }
 * @returns {function} stop — call to stop watching
 */
function watch(projectDir, squadSlug, sessionId, onMessage, options = {}) {
  const {
    pollMs = DEFAULT_POLL_MS,
    timeoutMs = MAX_WATCH_TIMEOUT_MS,
    to,
    type
  } = options;

  let lastTs = new Date().toISOString();
  let stopped = false;

  const hardStop = setTimeout(() => {
    stopped = true;
  }, timeoutMs);

  async function poll() {
    if (stopped) return;

    const newMessages = await read(projectDir, squadSlug, sessionId, { since: lastTs, to, type });

    for (const msg of newMessages) {
      if (msg.ts > lastTs) {
        lastTs = msg.ts;
      }
      try {
        await onMessage(msg);
      } catch {
        // handler errors do not stop the watch
      }
    }

    if (!stopped) {
      setTimeout(poll, pollMs);
    }
  }

  // Start polling after one tick so caller can capture stop fn first
  setTimeout(poll, pollMs);

  return function stop() {
    stopped = true;
    clearTimeout(hardStop);
  };
}

/**
 * Read messages posted since a given timestamp, then return the last timestamp seen.
 * Useful for coordinator polling without keeping a watcher alive.
 *
 * @returns {Promise<{ messages: object[], lastTs: string }>}
 */
async function poll(projectDir, squadSlug, sessionId, since, filters = {}) {
  const messages = await read(projectDir, squadSlug, sessionId, { ...filters, since });
  let lastTs = since;
  for (const m of messages) {
    if (!lastTs || m.ts > lastTs) lastTs = m.ts;
  }
  return { messages, lastTs: lastTs || nowIso() };
}

/**
 * Get a summary of bus activity for a session.
 * Useful for coordinator to get a quick status overview.
 *
 * @returns {Promise<object>} summary
 */
async function summary(projectDir, squadSlug, sessionId) {
  const messages = await read(projectDir, squadSlug, sessionId);

  if (messages.length === 0) {
    return { total: 0, by_type: {}, by_executor: {}, latest: null, blocks: [] };
  }

  const by_type = {};
  const by_executor = {};
  const blocks = [];

  for (const m of messages) {
    by_type[m.type] = (by_type[m.type] || 0) + 1;
    by_executor[m.from] = (by_executor[m.from] || 0) + 1;
    if (m.type === 'block') blocks.push({ from: m.from, content: m.content, ts: m.ts });
  }

  return {
    total: messages.length,
    by_type,
    by_executor,
    latest: messages[messages.length - 1],
    blocks,
    first_ts: messages[0].ts,
    last_ts: messages[messages.length - 1].ts
  };
}

/**
 * Clear the bus for a session (delete the file).
 * Use with caution — irreversible.
 */
async function clear(projectDir, squadSlug, sessionId) {
  const filePath = busPath(projectDir, squadSlug, sessionId);
  try {
    await fs.unlink(filePath);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'file_not_found' };
  }
}

/**
 * List all sessions that have a bus file for a given squad.
 */
async function listSessions(projectDir, squadSlug) {
  const sessionsDir = path.join(projectDir, '.aioson', 'squads', squadSlug, 'sessions');
  let entries;
  try {
    entries = await fs.readdir(sessionsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const result = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const busFile = path.join(sessionsDir, entry.name, BUS_FILE);
    try {
      const stat = await fs.stat(busFile);
      result.push({
        session_id: entry.name,
        bus_path: path.relative(projectDir, busFile),
        size_bytes: stat.size,
        modified_at: stat.mtime.toISOString()
      });
    } catch {
      // no bus file in this session — skip
    }
  }

  return result.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
}

module.exports = {
  post,
  read,
  watch,
  poll,
  summary,
  clear,
  listSessions,
  busPath,
  busDir,
  VALID_TYPES
};
