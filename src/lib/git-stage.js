'use strict';

/**
 * Deterministic staging helpers shared by commit:prepare.
 *
 * Why this module exists: a single `git add -- <every path>` call is fragile in
 * exactly the situations an agent-driven commit hits — tracked files that sit
 * under a later-added .gitignore rule (git refuses the whole call, stages
 * nothing), hundreds of paths (argument-length ceilings), a concurrent
 * `git status` holding index.lock, and a stderr flooded with EOL warnings that
 * buries the one line that explains the failure.
 */

const { execFileSync } = require('node:child_process');

// Stay far below every platform's argument ceiling (Windows CreateProcess
// allows ~32k chars for the whole command line).
const DEFAULT_MAX_CHUNK_CHARS = 12000;
const INDEX_LOCK_RETRY_DELAYS_MS = [150, 350, 800];

// EOL normalization chatter git prints once per file under core.autocrlf.
const EOL_WARNING = /^warning: (?:in the working copy of .*?, )?(?:LF|CRLF) will be replaced by (?:LF|CRLF)/i;
const IGNORED_PATHS_HEADER = /^The following paths are ignored by one of your \.gitignore files/i;

function defaultRunGit(gitRoot, args) {
  return execFileSync('git', args, {
    cwd: gitRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRelPath(relPath) {
  return String(relPath || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Drop per-file EOL warnings and the command echo so the line git actually
 * failed on is the first thing a human (or an agent) reads.
 */
function cleanGitStderr(stderr) {
  return String(stderr || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !EOL_WARNING.test(line) && !/^Command failed: /.test(line));
}

function formatGitFailure(error, verb = 'git add') {
  const status = error && Number.isInteger(error.status) ? error.status : null;
  const lines = cleanGitStderr(error && error.stderr);
  const body = lines.length > 0
    ? lines.slice(0, 12).join('\n')
    : String(error && error.message || 'unknown error').split('\n')[0];
  return `${verb} failed${status === null ? '' : ` (exit ${status})`}:\n${body}`;
}

function isIndexLockFailure(error) {
  return /index\.lock/i.test(String(error && error.stderr || '')) || /index\.lock/i.test(String(error && error.message || ''));
}

function isIgnoredPathsFailure(error) {
  return cleanGitStderr(error && error.stderr).some((line) => IGNORED_PATHS_HEADER.test(line));
}

function chunkByLength(paths, maxChars = DEFAULT_MAX_CHUNK_CHARS) {
  const chunks = [];
  let current = [];
  let currentLength = 0;
  for (const item of paths) {
    const cost = item.length + 1;
    if (current.length > 0 && currentLength + cost > maxChars) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(item);
    currentLength += cost;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function runGitWithLockRetry(runGit, gitRoot, args, { delays = INDEX_LOCK_RETRY_DELAYS_MS, wait = sleep } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return runGit(gitRoot, args);
    } catch (error) {
      if (!isIndexLockFailure(error) || attempt >= delays.length) throw error;
      await wait(delays[attempt]);
      attempt += 1;
    }
  }
}

/**
 * Tracked files that also match an ignore rule. `git status` still reports
 * them as modified, but `git add -- <path>` refuses them outright. They are a
 * repository hygiene smell (an ignore rule added after the file was committed)
 * and the usual remedy is `git rm -r --cached -- <path>`.
 */
function listTrackedIgnoredPaths(gitRoot, runGit = defaultRunGit) {
  try {
    const output = runGit(gitRoot, ['ls-files', '-ci', '--exclude-standard', '-z']);
    return String(output)
      .split(String.fromCharCode(0))
      .map((entry) => normalizeRelPath(entry.trim()))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Stage concrete paths in two lanes:
 *   - tracked paths go through `git add -u -- <paths>` (update-only mode only
 *     touches index entries, so ignore rules never apply and deletions stage
 *     correctly);
 *   - untracked paths go through plain `git add -- <paths>`.
 * Each lane is chunked and retried on index.lock contention. On failure the
 * result names the lane, the paths of the failing chunk, git's own message
 * (EOL noise removed) and everything staged before the failure.
 */
async function stagePaths(gitRoot, { tracked = [], untracked = [] }, options = {}) {
  const runGit = options.runGit || defaultRunGit;
  const maxChunkChars = options.maxChunkChars || DEFAULT_MAX_CHUNK_CHARS;
  const retry = { delays: options.retryDelays || INDEX_LOCK_RETRY_DELAYS_MS, wait: options.wait || sleep };
  const staged = [];
  const lanes = [
    { name: 'tracked', flags: ['add', '-u', '--'], paths: tracked },
    { name: 'untracked', flags: ['add', '--'], paths: untracked }
  ];

  for (const lane of lanes) {
    for (const chunk of chunkByLength(lane.paths, maxChunkChars)) {
      try {
        await runGitWithLockRetry(runGit, gitRoot, [...lane.flags, ...chunk], retry);
        staged.push(...chunk);
      } catch (error) {
        return {
          ok: false,
          lane: lane.name,
          failedPaths: chunk,
          staged,
          exitStatus: error && Number.isInteger(error.status) ? error.status : null,
          gitMessage: cleanGitStderr(error && error.stderr).slice(0, 12),
          ignoredPathsRefused: isIgnoredPathsFailure(error),
          indexLock: isIndexLockFailure(error),
          message: formatGitFailure(error, lane.name === 'tracked' ? 'git add -u' : 'git add')
        };
      }
    }
  }

  return { ok: true, staged, lane: null, failedPaths: [], gitMessage: [], exitStatus: 0 };
}

/**
 * Expand user/agent operands (files or directories, with or without a
 * trailing slash) into the concrete dirty entries of a status snapshot.
 * Operands that cover nothing dirty are reported, not staged blindly.
 */
function resolveExplicitPaths(operands, { unstaged = [], untracked = [] }) {
  const tracked = new Set();
  const fresh = new Set();
  const unmatched = [];
  const dirOf = (value) => (value.endsWith('/') ? value : `${value}/`);

  for (const rawOperand of operands) {
    const operand = normalizeRelPath(rawOperand).replace(/\/+$/, '');
    if (!operand || operand === '.') {
      unmatched.push(rawOperand);
      continue;
    }
    let hit = false;
    for (const entry of unstaged) {
      if (entry === operand || entry.startsWith(dirOf(operand))) {
        tracked.add(entry);
        hit = true;
      }
    }
    for (const entry of untracked) {
      const bare = entry.replace(/\/$/, '');
      if (bare === operand || entry.startsWith(dirOf(operand))) {
        fresh.add(entry);
        hit = true;
      } else if (entry.endsWith('/') && operand.startsWith(entry)) {
        // status collapses an untracked directory to `dir/`; an operand inside
        // it names real files, so hand git the narrower operand itself.
        fresh.add(operand);
        hit = true;
      }
    }
    if (!hit) unmatched.push(rawOperand);
  }

  return { tracked: [...tracked], untracked: [...fresh], unmatched };
}

module.exports = {
  stagePaths,
  resolveExplicitPaths,
  listTrackedIgnoredPaths,
  cleanGitStderr,
  formatGitFailure,
  chunkByLength,
  isIgnoredPathsFailure,
  isIndexLockFailure,
  DEFAULT_MAX_CHUNK_CHARS,
  INDEX_LOCK_RETRY_DELAYS_MS
};
