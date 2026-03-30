'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const CACHE_DIR = path.join(os.homedir(), '.aioson', 'temp');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const META_FILE = 'sessions.json';

function nowIso() {
  return new Date().toISOString();
}

function generateSessionId() {
  return crypto.randomBytes(8).toString('hex');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readMeta(cacheDir) {
  const p = path.join(cacheDir, META_FILE);
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return { sessions: {} };
  }
}

async function writeMeta(cacheDir, meta) {
  const p = path.join(cacheDir, META_FILE);
  await ensureDir(cacheDir);
  await fs.writeFile(p, JSON.stringify(meta, null, 2), 'utf8');
}

/**
 * Save a context snapshot to the RAM cache (shadow file in ~/.aioson/temp/).
 * @param {string} content — context content to save
 * @param {object} metadata — { goal?, agent?, projectDir? }
 * @param {object} opts — { cacheDir?, sessionId? }
 * @returns {{ ok: boolean, sessionId: string, path: string }}
 */
async function saveContextShadow(content, metadata = {}, opts = {}) {
  const cacheDir = opts.cacheDir || CACHE_DIR;
  const sessionId = opts.sessionId || generateSessionId();
  const sessionDir = path.join(cacheDir, sessionId);

  await ensureDir(sessionDir);

  const contentPath = path.join(sessionDir, 'context.md');
  await fs.writeFile(contentPath, content, 'utf8');

  const entry = {
    sessionId,
    path: contentPath,
    createdAt: nowIso(),
    metadata: {
      goal: metadata.goal || '',
      agent: metadata.agent || '',
      projectDir: metadata.projectDir || ''
    },
    size: content.length
  };

  const meta = await readMeta(cacheDir);
  meta.sessions[sessionId] = entry;
  await writeMeta(cacheDir, meta);

  return { ok: true, sessionId, path: contentPath };
}

/**
 * List all cached sessions, newest first.
 * @param {object} opts — { cacheDir? }
 * @returns {Array<session_entry>}
 */
async function listSessions(opts = {}) {
  const cacheDir = opts.cacheDir || CACHE_DIR;
  const meta = await readMeta(cacheDir);
  const sessions = Object.values(meta.sessions || {});
  sessions.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  return sessions;
}

/**
 * Restore a cached context by sessionId.
 * @param {string} sessionId
 * @param {object} opts — { cacheDir?, query? }
 * @returns {{ ok: boolean, content: string, metadata: object }|null}
 */
async function restoreContext(sessionId, opts = {}) {
  const cacheDir = opts.cacheDir || CACHE_DIR;
  const meta = await readMeta(cacheDir);
  const entry = meta.sessions[sessionId];

  if (!entry) {
    return { ok: false, error: 'session_not_found' };
  }

  let content;
  try {
    content = await fs.readFile(entry.path, 'utf8');
  } catch {
    return { ok: false, error: 'file_not_found', sessionId };
  }

  // If query is provided, extract relevant excerpt
  if (opts.query) {
    const lines = content.split('\n');
    const qLower = opts.query.toLowerCase();
    const relevant = lines.filter(l => l.toLowerCase().includes(qLower));
    if (relevant.length > 0) {
      content = relevant.join('\n');
    }
  }

  return { ok: true, sessionId, content, metadata: entry.metadata };
}

/**
 * Remove sessions older than maxAge ms.
 * @param {object} opts — { cacheDir?, maxAge? }
 * @returns {{ removed: number }}
 */
async function cleanup(opts = {}) {
  const cacheDir = opts.cacheDir || CACHE_DIR;
  const maxAge = opts.maxAge !== undefined ? opts.maxAge : MAX_AGE_MS;
  const cutoff = Date.now() - maxAge + 1;

  const meta = await readMeta(cacheDir);
  const sessions = meta.sessions || {};
  let removed = 0;

  for (const [id, entry] of Object.entries(sessions)) {
    const createdMs = new Date(entry.createdAt).getTime();
    if (createdMs < cutoff) {
      // Remove session dir
      try {
        await fs.rm(path.join(cacheDir, id), { recursive: true, force: true });
      } catch {
        // best-effort
      }
      delete sessions[id];
      removed++;
    }
  }

  meta.sessions = sessions;
  await writeMeta(cacheDir, meta);

  return { removed };
}

module.exports = { saveContextShadow, listSessions, restoreContext, cleanup };
