'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  stagePaths,
  resolveExplicitPaths,
  listTrackedIgnoredPaths,
  cleanGitStderr,
  formatGitFailure,
  chunkByLength
} = require('../src/lib/git-stage');

async function makeRepo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-git-stage-'));
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

async function writeFile(dir, relPath, content) {
  const target = path.join(dir, relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function stagedPaths(dir) {
  return git(dir, ['diff', '--cached', '--name-only']).split('\n').filter(Boolean).sort();
}

function gitError(stderr, status = 1) {
  const error = new Error(`Command failed: git add -- a b c\n${stderr}`);
  error.stderr = stderr;
  error.status = status;
  return error;
}

const EOL_NOISE = "warning: in the working copy of 'src/a.js', LF will be replaced by CRLF the next time Git touches it\n";

test('cleanGitStderr drops per-file EOL warnings and the command echo, keeps the failure line', () => {
  const lines = cleanGitStderr(`${EOL_NOISE}${EOL_NOISE}The following paths are ignored by one of your .gitignore files:\n.aioson/tasks\nhint: Use -f if you really want to add them.\n`);
  assert.deepEqual(lines, [
    'The following paths are ignored by one of your .gitignore files:',
    '.aioson/tasks',
    'hint: Use -f if you really want to add them.'
  ]);
});

test('formatGitFailure names the verb, the exit status and git\'s own message — never the 5k-char command', () => {
  const message = formatGitFailure(gitError(`${EOL_NOISE}fatal: Unable to create '.git/index.lock': File exists.\n`, 128));
  assert.equal(message, "git add failed (exit 128):\nfatal: Unable to create '.git/index.lock': File exists.");
  assert.equal(message.includes('Command failed'), false);
});

test('chunkByLength keeps every chunk under the ceiling and never drops a path', () => {
  const paths = Array.from({ length: 50 }, (_, i) => `dir/file-${String(i).padStart(3, '0')}.js`);
  const chunks = chunkByLength(paths, 100);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) assert.ok(chunk.join(' ').length <= 100);
  assert.deepEqual(chunks.flat(), paths);
});

test('stagePaths stages tracked paths with git add -u and untracked paths with plain add, chunked', async () => {
  const calls = [];
  const result = await stagePaths('/repo', {
    tracked: ['src/a.js', 'src/b.js'],
    untracked: ['new/c.js']
  }, {
    runGit: (gitRoot, args) => { calls.push(args); return ''; },
    maxChunkChars: 12
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.staged, ['src/a.js', 'src/b.js', 'new/c.js']);
  assert.deepEqual(calls, [
    ['add', '-u', '--', 'src/a.js'],
    ['add', '-u', '--', 'src/b.js'],
    ['add', '--', 'new/c.js']
  ]);
});

test('stagePaths retries on index.lock contention and succeeds once the lock clears', async () => {
  let attempts = 0;
  const waits = [];
  const result = await stagePaths('/repo', { tracked: ['src/a.js'] }, {
    runGit: () => {
      attempts += 1;
      if (attempts < 3) throw gitError("fatal: Unable to create '/repo/.git/index.lock': File exists.\n", 128);
      return '';
    },
    retryDelays: [1, 1, 1],
    wait: async (ms) => { waits.push(ms); }
  });

  assert.equal(result.ok, true);
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [1, 1]);
});

test('stagePaths reports the failing lane, the refused paths, what was already staged and the clean git message', async () => {
  const result = await stagePaths('/repo', {
    tracked: ['src/a.js'],
    untracked: ['vendor/x.js']
  }, {
    runGit: (gitRoot, args) => {
      if (args[1] === '-u') return '';
      throw gitError(`${EOL_NOISE}The following paths are ignored by one of your .gitignore files:\nvendor\nhint: Use -f if you really want to add them.\n`);
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.lane, 'untracked');
  assert.deepEqual(result.failedPaths, ['vendor/x.js']);
  assert.deepEqual(result.staged, ['src/a.js']);
  assert.equal(result.ignoredPathsRefused, true);
  assert.equal(result.indexLock, false);
  assert.equal(result.exitStatus, 1);
  assert.equal(result.gitMessage.some((line) => /LF will be replaced/.test(line)), false);
  assert.match(result.message, /^git add failed \(exit 1\):\nThe following paths are ignored/);
});

test('resolveExplicitPaths expands files and directories against the status snapshot and reports misses', () => {
  const resolved = resolveExplicitPaths(
    ['src/', 'lib', 'new/a.js', 'brand-new/', 'clean.js', '.'],
    {
      unstaged: ['src/a.js', 'src/deep/b.js', 'lib/c.js', 'other.js'],
      untracked: ['new/', 'brand-new/']
    }
  );
  assert.deepEqual(resolved.tracked, ['src/a.js', 'src/deep/b.js', 'lib/c.js']);
  assert.deepEqual(resolved.untracked, ['new/a.js', 'brand-new/']);
  assert.deepEqual(resolved.unmatched, ['clean.js', '.']);
});

test('a tracked file under a later-added .gitignore rule: plain git add refuses, stagePaths succeeds', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(dir, '.aioson/tasks/squad-create.md', 'v1\n');
    await writeFile(dir, 'src/a.js', 'v1\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'init']);
    await writeFile(dir, '.gitignore', '.aioson/tasks/\n');
    await writeFile(dir, '.aioson/tasks/squad-create.md', 'v2\n');
    await writeFile(dir, 'src/a.js', 'v2\n');
    await writeFile(dir, 'new/c.js', 'new\n');

    assert.deepEqual(listTrackedIgnoredPaths(dir), ['.aioson/tasks/squad-create.md']);

    assert.throws(
      () => git(dir, ['add', '--', '.aioson/tasks/squad-create.md', 'src/a.js']),
      (error) => /ignored by one of your \.gitignore files/.test(String(error.stderr))
    );
    git(dir, ['reset', '-q']);

    const result = await stagePaths(dir, {
      tracked: ['.aioson/tasks/squad-create.md', 'src/a.js'],
      untracked: ['new/', '.gitignore']
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(stagedPaths(dir), ['.aioson/tasks/squad-create.md', '.gitignore', 'new/c.js', 'src/a.js']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('stagePaths stages a tracked deletion through the update lane', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(dir, 'src/gone.js', 'bye\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'init']);
    await fs.rm(path.join(dir, 'src/gone.js'));

    const result = await stagePaths(dir, { tracked: ['src/gone.js'] });
    assert.equal(result.ok, true);
    assert.equal(git(dir, ['diff', '--cached', '--name-status']).trim(), 'D\tsrc/gone.js');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
