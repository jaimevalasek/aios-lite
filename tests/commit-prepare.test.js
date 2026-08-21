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

test('commit:prepare parses non-ASCII paths without git C-quoting', async () => {
  const dir = await makeRepo();
  try {
    // git's default core.quotePath=true would emit this non-ASCII path as a
    // C-style double-quoted/escaped string, so the parsed path no longer matches
    // the real file and a later `git add -- <path>` would miss it.
    await writeFile(dir, 'src/relatório-café.js', 'console.log("unicode");\n');
    git(dir, ['add', '--', 'src/relatório-café.js']);

    const result = await runCommitPrepare({
      args: [dir],
      options: { json: true, 'agent-safe': true, 'staged-only': true, mode: 'headless' },
      logger: makeLogger()
    });

    assert.equal(result.ok, true);
    assert.equal(result.stagedCount, 1);

    const prep = JSON.parse(
      await fs.readFile(path.join(dir, '.aioson', 'context', 'commit-prep.json'), 'utf8')
    );
    const staged = prep.stagedFiles[0];
    assert.ok(!staged.startsWith('"'), `path should not be C-quoted: ${staged}`);
    assert.ok(!staged.includes('\\'), `path should not be C-escaped: ${staged}`);
    assert.ok(staged.includes('caf') && staged.endsWith('.js'), `expected the literal path, got: ${staged}`);
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('commit:prepare rejects unknown execution modes', async () => {
  const result = await runCommitPrepare({
    args: ['.'],
    options: { json: true, mode: 'unsafe' },
    logger: makeLogger()
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'invalid_mode');
  assert.equal(result.ready, false);
  process.exitCode = 0;
});

test('SF-aioson-02: commit:prepare rejects non-headless modes for agent-safe callers', async () => {
  const dir = await makeRepo();
  try {
    // aioson-secret: fixture
    await writeFile(dir, 'src/config.js', "const API_TOKEN = 'abcd1234efgh5678';\n");
    git(dir, ['add', '--', 'src/config.js']);

    for (const mode of ['trusted', 'guarded']) {
      const result = await runCommitPrepare({
        args: [dir],
        options: { json: true, 'agent-safe': true, 'staged-only': true, mode },
        logger: makeLogger()
      });

      assert.equal(result.ok, false);
      assert.equal(result.error, 'agent_safe_requires_headless');
      assert.equal(result.mode, mode);
      assert.equal(result.requiredMode, 'headless');
      assert.equal(result.ready, false);
    }
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('commit:prepare headless blocks warnings while trusted mode records and accepts them', async () => {
  const dir = await makeRepo();
  try {
    // aioson-secret: fixture
    await writeFile(dir, 'src/config.js', "const API_TOKEN = 'abcd1234efgh5678';\n");
    git(dir, ['add', '--', 'src/config.js']);

    const headless = await runCommitPrepare({
      args: [dir],
      options: { json: true, 'agent-safe': true, 'staged-only': true, mode: 'headless' },
      logger: makeLogger()
    });
    assert.equal(headless.ok, false);
    assert.equal(headless.error, 'guard_failed');
    assert.ok(headless.guard.warnings.some((item) => item.id === 'generic_secret_assignment'));

    process.exitCode = 0;
    const trusted = await runCommitPrepare({
      args: [dir],
      options: { json: true, 'staged-only': true, mode: 'trusted' },
      logger: makeLogger()
    });
    assert.equal(trusted.ok, true);
    assert.equal(trusted.guardMode, 'trusted');

    const prep = JSON.parse(
      await fs.readFile(path.join(dir, '.aioson', 'context', 'commit-prep.json'), 'utf8')
    );
    assert.equal(prep.guardMode, 'trusted');
    assert.ok(prep.guard.warnings.some((item) => item.id === 'generic_secret_assignment'));

    process.exitCode = 0;
    const strictRetry = await runCommitPrepare({
      args: [dir],
      options: { json: true, 'agent-safe': true, 'staged-only': true, mode: 'headless' },
      logger: makeLogger()
    });
    assert.equal(strictRetry.ok, false, 'trusted prep must not be reused in headless mode');
    assert.equal(strictRetry.error, 'guard_failed');
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('commit:prepare trusted mode still blocks high-confidence secret errors', async () => {
  const dir = await makeRepo();
  try {
    const realisticToken = ['ghp', 'L1k2J3h4G5f6D7s8A9p0O1i2U3y4T5r6'].join('_');
    await writeFile(dir, 'src/provider.js', `const token = '${realisticToken}';\n`);
    git(dir, ['add', '--', 'src/provider.js']);

    const result = await runCommitPrepare({
      args: [dir],
      options: { json: true, 'staged-only': true, mode: 'trusted' },
      logger: makeLogger()
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'guard_failed');
    assert.ok(result.guard.errors.some((item) => item.id === 'github_token'));
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('commit:prepare stages explicit operands in agent-safe headless mode — a tracked file under a .gitignore rule included', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(dir, '.aioson/tasks/squad-create.md', 'v1\n');
    await writeFile(dir, 'src/a.js', 'v1\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'init']);
    await writeFile(dir, '.gitignore', '.aioson/tasks/\n');
    await writeFile(dir, '.aioson/tasks/squad-create.md', 'v2\n');
    await writeFile(dir, 'src/a.js', 'v2\n');
    await writeFile(dir, 'feature/new.js', 'console.log("new");\n');
    await writeFile(dir, 'src/untouched.js', 'stay\n');
    git(dir, ['add', '--', 'src/untouched.js']);
    git(dir, ['commit', '-q', '-m', 'second']);

    const result = await runCommitPrepare({
      args: [dir, '.aioson/tasks/squad-create.md', 'src/', 'feature/', '.gitignore', 'src/untouched.js'],
      options: { json: true, 'agent-safe': true, mode: 'headless' },
      logger: makeLogger()
    });

    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.ready, true);
    assert.equal(result.stagedCount, 4);
    assert.deepEqual(result.trackedIgnored, ['.aioson/tasks/squad-create.md']);
    assert.deepEqual(result.unmatchedOperands, ['src/untouched.js']);
    const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: dir, encoding: 'utf8' }).split('\n').filter(Boolean).sort();
    assert.deepEqual(staged, ['.aioson/tasks/squad-create.md', '.gitignore', 'feature/new.js', 'src/a.js']);
    const prep = JSON.parse(await fs.readFile(result.prepPath, 'utf8'));
    assert.deepEqual(prep.advisories.trackedIgnored, ['.aioson/tasks/squad-create.md']);
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('commit:prepare explicit operands exclude guard-blocked paths and report operands with no changes', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(dir, 'src/a.js', 'ok\n');
    await writeFile(dir, 'node_modules/pkg/index.js', 'module.exports = 1;\n');

    const result = await runCommitPrepare({
      args: [dir, 'src/a.js', 'node_modules/'],
      options: { json: true, 'agent-safe': true, mode: 'headless' },
      logger: makeLogger()
    });

    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.excludedByGuard.map((item) => item.path), ['node_modules/']);
    assert.ok(result.excludedByGuard[0].ids.includes('dependency_dir'));
    const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: dir, encoding: 'utf8' }).split('\n').filter(Boolean);
    assert.deepEqual(staged, ['src/a.js']);

    const nothing = await runCommitPrepare({
      args: [dir, 'missing.js'],
      options: { json: true, 'agent-safe': true, mode: 'headless' },
      logger: makeLogger()
    });
    assert.equal(nothing.ok, true, 'already-staged files keep the prep alive');

    git(dir, ['reset', '-q']);
    const empty = await runCommitPrepare({
      args: [dir, 'missing.js'],
      options: { json: true, 'agent-safe': true, mode: 'headless' },
      logger: makeLogger()
    });
    assert.equal(empty.ok, false);
    assert.equal(empty.error, 'no_matching_paths');
    assert.deepEqual(empty.unmatched, ['missing.js']);
  } finally {
    process.exitCode = 0;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
