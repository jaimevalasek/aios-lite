'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { runCommitPrepare } = require('../src/commands/commit-prepare');

async function makeRepo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-commit-prepare-'));
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
  execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
}

function makeLogger() {
  return {
    log() {},
    error() {}
  };
}

test('commit:prepare blocks agent-safe headless mode when modified files are not explicitly staged', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(dir, 'src/already-staged.js', 'console.log("staged");\n');
    await writeFile(dir, 'src/not-staged.js', 'console.log("unstaged");\n');
    git(dir, ['add', '--', 'src/already-staged.js']);

    const result = await runCommitPrepare({
      args: [dir],
      options: { json: true, 'agent-safe': true, mode: 'headless' },
      logger: makeLogger()
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'explicit_staging_required_in_headless');
    assert.equal(result.ready, false);
    assert.equal(result.agentSafe, true);
    assert.deepEqual(result.stagedFiles, ['src/already-staged.js']);
    assert.deepEqual(result.untrackedFiles, ['src/not-staged.js']);
    assert.ok(Array.isArray(result.suggestedCommands));
    assert.ok(result.suggestedCommands.some((command) => command.includes('--staged-only')));
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('commit:prepare succeeds in agent-safe mode when using staged-only', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(dir, 'src/already-staged.js', 'console.log("staged");\n');
    await writeFile(dir, 'src/not-staged.js', 'console.log("unstaged");\n');
    git(dir, ['add', '--', 'src/already-staged.js']);

    const result = await runCommitPrepare({
      args: [dir],
      options: { json: true, 'agent-safe': true, 'staged-only': true, mode: 'headless' },
      logger: makeLogger()
    });

    assert.equal(result.ok, true);
    assert.equal(result.ready, true);
    assert.equal(result.guardOk, true);
    assert.equal(result.stagedCount, 1);

    const prepPath = path.join(dir, '.aioson', 'context', 'commit-prep.json');
    const prep = JSON.parse(await fs.readFile(prepPath, 'utf8'));
    assert.equal(prep.preparationMode, 'agent_safe');
    assert.deepEqual(prep.stagedFiles, ['src/already-staged.js']);
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
