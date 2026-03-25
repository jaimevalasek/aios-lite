'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runSquadWorktrees, runSquadMerge } = require('../src/commands/squad-worktrees');

function makeLogger() {
  const lines = [];
  const errors = [];
  return {
    log: (msg) => lines.push(msg),
    error: (msg) => errors.push(msg),
    lines,
    errors
  };
}

async function makeGitRepo() {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-wt-cmd-'));

  function git(...args) {
    return spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' });
  }

  git('init');
  git('config', 'user.email', 'test@aioson.local');
  git('config', 'user.name', 'AIOSON Test');
  git('checkout', '-b', 'main');
  require('node:fs').writeFileSync(path.join(repoDir, 'README.md'), '# test');
  git('add', 'README.md');
  git('commit', '-m', 'init');

  return {
    repoDir,
    async cleanup() {
      await fs.rm(repoDir, { recursive: true, force: true });
    }
  };
}

// --- list (no worktrees) ---

test('runSquadWorktrees prints "No worktrees" when squad has none', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const logger = makeLogger();
    const result = await runSquadWorktrees({
      args: [repoDir],
      options: { squad: 'ghost-squad' },
      logger
    });
    assert.equal(result.ok, true);
    assert.ok(logger.lines.some(l => l.includes('No worktrees')));
  } finally {
    await cleanup();
  }
});

test('runSquadWorktrees returns ok:false when squad arg is missing', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const logger = makeLogger();
    const result = await runSquadWorktrees({
      args: [repoDir],
      options: {},
      logger
    });
    assert.equal(result.ok, false);
    assert.ok(logger.errors.length > 0);
  } finally {
    await cleanup();
  }
});

// --- list (with worktrees) ---

test('runSquadWorktrees lists worktrees with branch and path info', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    // Create a worktree directly
    const { createWorktree } = require('../src/squad/worktree-manager');
    createWorktree(repoDir, 'odonto', 'analyst');

    const logger = makeLogger();
    const result = await runSquadWorktrees({
      args: [repoDir],
      options: { squad: 'odonto' },
      logger
    });
    assert.equal(result.ok, true);
    assert.ok(result.worktrees.length >= 1);
    const output = logger.lines.join('\n');
    assert.ok(output.includes('analyst') || output.includes('odonto'));
  } finally {
    await cleanup();
  }
});

// --- --cleanup ---

test('runSquadWorktrees --cleanup removes worktrees for squad', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const { createWorktree } = require('../src/squad/worktree-manager');
    createWorktree(repoDir, 'alpha', 'writer');

    const logger = makeLogger();
    const result = await runSquadWorktrees({
      args: [repoDir],
      options: { squad: 'alpha', cleanup: true },
      logger
    });
    assert.equal(result.ok, true);
    // Should mention the removed worktree
    const output = logger.lines.join('\n');
    assert.ok(output.includes('writer') || output.includes('Removed'));
  } finally {
    await cleanup();
  }
});

test('runSquadWorktrees --cleanup with no worktrees prints empty message', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const logger = makeLogger();
    const result = await runSquadWorktrees({
      args: [repoDir],
      options: { squad: 'no-squad', cleanup: true },
      logger
    });
    assert.equal(result.ok, true);
    assert.ok(logger.lines.some(l => l.includes('No worktrees')));
  } finally {
    await cleanup();
  }
});

// --- runSquadMerge ---

test('runSquadMerge returns ok:false when squad or agent missing', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const logger = makeLogger();
    const result = await runSquadMerge({
      args: [repoDir],
      options: { squad: 'odonto' }, // agent missing
      logger
    });
    assert.equal(result.ok, false);
    assert.ok(logger.errors.length > 0);
  } finally {
    await cleanup();
  }
});

test('runSquadMerge with --no-auto logs "auto-merge disabled"', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const { createWorktree } = require('../src/squad/worktree-manager');
    createWorktree(repoDir, 'alpha', 'writer');

    const logger = makeLogger();
    await runSquadMerge({
      args: [repoDir],
      options: { squad: 'alpha', agent: 'writer', 'no-auto': true },
      logger
    });
    const output = logger.lines.join('\n');
    assert.ok(output.includes('disabled') || output.includes('Branch ready'));
  } finally {
    await cleanup();
  }
});

test('runSquadMerge with autoMerge=true on up-to-date branch logs success', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const { createWorktree } = require('../src/squad/worktree-manager');
    createWorktree(repoDir, 'alpha', 'writer');

    const logger = makeLogger();
    const result = await runSquadMerge({
      args: [repoDir],
      options: { squad: 'alpha', agent: 'writer' },
      logger
    });
    assert.equal(result.ok, true);
  } finally {
    await cleanup();
  }
});
