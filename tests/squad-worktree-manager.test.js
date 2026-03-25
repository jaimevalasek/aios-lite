'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  createWorktree,
  mergeWorktree,
  cleanupWorktree,
  listWorktrees
} = require('../src/squad/worktree-manager');

/**
 * Create a real temporary git repository for testing.
 * Returns { repoDir, cleanup }.
 */
async function makeGitRepo() {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-wt-repo-'));

  function git(...args) {
    return spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' });
  }

  git('init');
  git('config', 'user.email', 'test@aioson.local');
  git('config', 'user.name', 'AIOSON Test');
  // Ensure we're on 'main'
  git('checkout', '-b', 'main');
  // Create an initial commit (required for worktrees)
  const readmePath = path.join(repoDir, 'README.md');
  require('node:fs').writeFileSync(readmePath, '# test');
  git('add', 'README.md');
  git('commit', '-m', 'init');

  return {
    repoDir,
    async cleanup() {
      await fs.rm(repoDir, { recursive: true, force: true });
    }
  };
}

// --- createWorktree ---

test('createWorktree creates a worktree with correct branch name', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const result = createWorktree(repoDir, 'odonto', 'writer');
    assert.equal(result.ok, true);
    assert.equal(result.branchName, 'aioson/odonto/writer');
    assert.ok(result.worktreePath.includes('worktrees'));
    assert.ok(result.worktreePath.includes('writer'));

    // Verify the worktree path was actually created
    const stat = await fs.stat(result.worktreePath);
    assert.ok(stat.isDirectory());
  } finally {
    await cleanup();
  }
});

test('createWorktree second call on existing path throws with descriptive error', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    createWorktree(repoDir, 'odonto', 'editor');
    // Second call: path already registered — git reports "already exists"
    assert.throws(
      () => createWorktree(repoDir, 'odonto', 'editor'),
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  } finally {
    await cleanup();
  }
});

test('createWorktree branch follows pattern aioson/{squad}/{agent}', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const result = createWorktree(repoDir, 'ecommerce', 'reviewer');
    assert.equal(result.branchName, 'aioson/ecommerce/reviewer');
  } finally {
    await cleanup();
  }
});

// --- listWorktrees ---

test('listWorktrees returns created worktrees filtered by squadSlug', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    createWorktree(repoDir, 'odonto', 'writer');
    createWorktree(repoDir, 'odonto', 'editor');
    const worktrees = listWorktrees(repoDir, 'odonto');
    assert.ok(worktrees.length >= 2);
    assert.ok(worktrees.every(w => w.branch.startsWith('aioson/odonto/')));
  } finally {
    await cleanup();
  }
});

test('listWorktrees returns empty array for squad with no worktrees', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const worktrees = listWorktrees(repoDir, 'ghost-squad');
    assert.deepEqual(worktrees, []);
  } finally {
    await cleanup();
  }
});

test('listWorktrees does not include worktrees from other squads', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    createWorktree(repoDir, 'alpha', 'writer');
    createWorktree(repoDir, 'beta', 'writer');
    const alphaWt = listWorktrees(repoDir, 'alpha');
    const betaWt = listWorktrees(repoDir, 'beta');
    assert.ok(alphaWt.every(w => w.branch.includes('/alpha/')));
    assert.ok(betaWt.every(w => w.branch.includes('/beta/')));
  } finally {
    await cleanup();
  }
});

test('listWorktrees includes agentSlug derived from branch', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    createWorktree(repoDir, 'alpha', 'analyst');
    const wts = listWorktrees(repoDir, 'alpha');
    assert.ok(wts.some(w => w.agentSlug === 'analyst'));
  } finally {
    await cleanup();
  }
});

// --- mergeWorktree ---

test('mergeWorktree returns ok:false when autoMerge is false', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    createWorktree(repoDir, 'alpha', 'writer');
    const result = mergeWorktree(repoDir, 'alpha', 'writer', false);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'auto_merge_disabled');
  } finally {
    await cleanup();
  }
});

test('mergeWorktree with autoMerge=true and no commits returns ok:true (fast-forward)', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    createWorktree(repoDir, 'alpha', 'writer');
    // No changes in the worktree branch — fast-forward should succeed (already up to date)
    const result = mergeWorktree(repoDir, 'alpha', 'writer', true);
    // Either merged or already up-to-date — both are ok:true
    assert.equal(result.ok, true);
  } finally {
    await cleanup();
  }
});

// --- cleanupWorktree ---

test('cleanupWorktree removes the worktree', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const created = createWorktree(repoDir, 'alpha', 'writer');
    const wtPath = created.worktreePath;

    const result = cleanupWorktree(repoDir, 'alpha', 'writer');
    assert.equal(result.ok, true);

    const exists = await fs.access(wtPath).then(() => true).catch(() => false);
    assert.equal(exists, false);
  } finally {
    await cleanup();
  }
});

test('cleanupWorktree returns ok:false for non-existent worktree', async () => {
  const { repoDir, cleanup } = await makeGitRepo();
  try {
    const result = cleanupWorktree(repoDir, 'alpha', 'ghost-agent');
    assert.equal(result.ok, false);
  } finally {
    await cleanup();
  }
});
