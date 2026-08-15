'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  resolveProjectRoot,
  resolveProjectRootOrSelf,
  isProjectRoot
} = require('../src/lib/project-root');
const { runHooksEmit } = require('../src/commands/hooks-emit');

function withTmp(fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-hook-root-'));
  try {
    return fn(tmpRoot);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function mkdirp(...segments) {
  const dir = path.join(...segments);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// A project root is `.aioson/` PLUS a project-only entry — a bare directory is
// the operator store's shape, not a project's.
function mkProject(...segments) {
  const project = mkdirp(...segments);
  mkdirp(project, '.aioson');
  fs.writeFileSync(path.join(project, '.aioson', 'config.md'), '# project\n', 'utf8');
  return project;
}

test('resolveProjectRoot returns the directory itself when it is the project root', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    assert.equal(resolveProjectRoot(project), fs.realpathSync(project));
  });
});

test('resolveProjectRoot walks up from a deep subdirectory to the owning project root', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const deep = mkdirp(project, 'docs', 'pt', '1-entender');
    assert.equal(resolveProjectRoot(deep), fs.realpathSync(project));
  });
});

test('resolveProjectRoot returns null outside any AIOSON project', () => {
  withTmp((tmp) => {
    const orphan = mkdirp(tmp, 'not-a-project', 'nested');
    assert.equal(resolveProjectRoot(orphan), null);
  });
});

test('resolveProjectRoot stops at the nearest root when projects are nested', () => {
  withTmp((tmp) => {
    const outer = mkProject(tmp, 'outer');
    const inner = mkProject(outer, 'packages', 'inner');
    const deep = mkdirp(inner, 'src');
    assert.equal(resolveProjectRoot(deep), fs.realpathSync(inner));
  });
});

test('resolveProjectRoot ignores a .aioson FILE — only a directory marks a root', () => {
  withTmp((tmp) => {
    const decoy = mkdirp(tmp, 'decoy');
    fs.writeFileSync(path.join(decoy, '.aioson'), 'not a directory', 'utf8');
    assert.equal(isProjectRoot(decoy), false);
    assert.equal(resolveProjectRoot(decoy), null);
  });
});

// The operator store at `~/.aioson/` is shared by every project on the machine
// and holds no project entries. Most projects live somewhere under the home
// directory, so a walk keyed on the directory NAME alone escapes the project and
// lands in the global store — strictly worse than the subdirectory it prevents.
test('resolveProjectRoot does not mistake the operator store for a project root', () => {
  withTmp((tmp) => {
    const home = mkdirp(tmp, 'home');
    const store = mkdirp(home, '.aioson');
    fs.writeFileSync(path.join(store, 'config.json'), '{}', 'utf8');
    mkdirp(store, 'operators');
    const somewhere = mkdirp(home, 'scratch', 'nested');

    assert.equal(isProjectRoot(home), false);
    assert.equal(resolveProjectRoot(somewhere), null);
  });
});

test('the real operator store on this machine is not a project root', () => {
  assert.equal(isProjectRoot(os.homedir()), false);
});

test('resolveProjectRootOrSelf falls back outside a project, so scaffolding stays possible', () => {
  withTmp((tmp) => {
    const fresh = mkdirp(tmp, 'fresh');
    assert.equal(resolveProjectRootOrSelf(fresh), path.resolve(fresh));
  });
});

test('resolveProjectRootOrSelf still prefers the owning project root from a subdirectory', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const deep = mkdirp(project, 'src', 'lib');
    assert.equal(resolveProjectRootOrSelf(deep), fs.realpathSync(project));
  });
});

// The incident: a session `cd`-ed into docs/pt, the PostToolUse hook fired with
// that cwd, and `.aioson/runtime/` (SQLite + telemetry) was created inside the
// subdirectory — untracked junk in the repo plus a forked runtime state.
test('hooks:emit never creates .aioson/ in the subdirectory the hook fired from', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-hook-root-'));
  try {
    const project = mkProject(tmp, 'proj');
    const deep = mkdirp(project, 'docs', 'pt');

    await runHooksEmit({ args: [deep], options: { agent: 'dev', source: 'claude' } });

    assert.equal(fs.existsSync(path.join(deep, '.aioson')), false);
    assert.equal(fs.existsSync(path.join(project, 'docs', '.aioson')), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('hooks:emit no-ops outside any project instead of creating one', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-hook-root-'));
  try {
    const orphan = mkdirp(tmp, 'not-a-project');

    const result = await runHooksEmit({ args: [orphan], options: { agent: 'dev', source: 'claude' } });

    assert.deepEqual(result, { ok: true, skipped: true, reason: 'no-project-root' });
    assert.equal(fs.existsSync(path.join(orphan, '.aioson')), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
