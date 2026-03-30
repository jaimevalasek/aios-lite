'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const CONTEXT_DIR = path.join('.aioson', 'context');
const RECOVERY_FILE = 'recovery-context.md';
const MAX_TOKENS = 2000;

function estimateTokens(str) {
  return Math.ceil(str.length / 4);
}

async function readRecentGitLog(cwd, limit = 10) {
  try {
    const { stdout } = await execFileAsync('git', [
      'log', `--max-count=${limit}`, '--oneline', '--no-merges'
    ], { cwd });
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function readModifiedFiles(cwd) {
  try {
    const { stdout } = await execFileAsync('git', [
      'diff', '--name-only', 'HEAD'
    ], { cwd });
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function buildSessionRecoveryMarkdown(sessionState, gitLog, modifiedFiles) {
  const lines = [];

  lines.push('# Recovery Context — Direct Session');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Session goal/task
  if (sessionState.goal) {
    lines.push('## Current Goal');
    lines.push(sessionState.goal);
    lines.push('');
  }

  // Active agent
  if (sessionState.agent) {
    lines.push('## Active Agent');
    lines.push(sessionState.agent);
    lines.push('');
  }

  // Tasks
  const tasks = Array.isArray(sessionState.tasks) ? sessionState.tasks : [];
  if (tasks.length > 0) {
    lines.push('## Tasks');
    for (const t of tasks.slice(-5)) {
      const status = t.status || 'unknown';
      const title = t.title || t.id || '(untitled)';
      lines.push(`- [${status}] ${title}`);
    }
    lines.push('');
  }

  // Notes
  const notes = Array.isArray(sessionState.notes) ? sessionState.notes : [];
  if (notes.length > 0) {
    lines.push('## Notes');
    for (const note of notes.slice(-5)) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // Modified files
  if (modifiedFiles.length > 0) {
    lines.push('## Modified Files');
    for (const f of modifiedFiles.slice(0, 10)) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  // Recent git commits
  if (gitLog.length > 0) {
    lines.push('## Recent Commits');
    for (const entry of gitLog.slice(0, 5)) {
      lines.push(`- ${entry}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Inject this file at the top of your next session to restore context after a compact.*');

  return lines.join('\n');
}

/**
 * Generate and write recovery-context.md for a direct session (no squad).
 * @param {string} cwd  — project root directory
 * @param {object} sessionState  — { goal?, agent?, tasks?, notes? }
 * @returns {{ ok: boolean, path: string, tokens: number }}
 */
async function generateSessionRecovery(cwd, sessionState = {}) {
  const [gitLog, modifiedFiles] = await Promise.all([
    readRecentGitLog(cwd),
    readModifiedFiles(cwd)
  ]);

  let content = buildSessionRecoveryMarkdown(sessionState, gitLog, modifiedFiles);

  // Enforce token budget
  if (estimateTokens(content) > MAX_TOKENS) {
    content = buildSessionRecoveryMarkdown(sessionState, gitLog.slice(0, 3), modifiedFiles.slice(0, 5));
  }

  const tokens = estimateTokens(content);
  const outDir = path.join(cwd, CONTEXT_DIR);
  const outPath = path.join(outDir, RECOVERY_FILE);

  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, content, 'utf8');
  } catch (err) {
    return { ok: false, error: err.message, path: outPath, tokens };
  }

  return { ok: true, path: outPath, tokens };
}

/**
 * Read the current session recovery-context.md (returns null if missing).
 * @param {string} cwd
 * @returns {string|null}
 */
async function readSessionRecovery(cwd) {
  const p = path.join(cwd, CONTEXT_DIR, RECOVERY_FILE);
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return null;
  }
}

module.exports = { generateSessionRecovery, readSessionRecovery };
