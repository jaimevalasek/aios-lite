'use strict';

/**
 * The incident this file pins, replayed from a real consumer project:
 *
 * An agent ran `verify:artifact --kind=visual --slug=<slug>` with its shell
 * sitting in `<root>/.aioson/briefings/<slug>/`. The command resolved its
 * target directory from that cwd, so it (a) looked for the prototype under
 * `<briefing>/.aioson/briefings/<slug>/` and reported "found no HTML/CSS"
 * while the file sat right there, and (b) persisted its report to
 * `<briefing>/.aioson/context/`. That stray `.aioson/context/` then satisfied
 * the project-root marker walk, so the runtime store followed it in one second
 * later: a second SQLite database, a second live-session directory and an
 * `aioson-logs/` folder, all forked from the real ones.
 *
 * The invariant: a directory inside a `.aioson/` tree is framework storage,
 * never a project.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  escapeDataTree,
  isProjectRoot,
  resolveProjectRootOrSelf,
  resolveTargetDir,
  resolveOperandPath
} = require('../src/lib/project-root');
const { scanNestedProjectRoots } = require('../src/doctor');
const { runVerifyArtifact } = require('../src/commands/verify-artifact');

function withTmp(fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-containment-'));
  try {
    return fn(fs.realpathSync(tmpRoot));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

// Async callbacks need their own wrapper: `withTmp`'s `finally` fires the moment
// an async body returns its promise, deleting the fixture mid-test.
async function withTmpAsync(fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-containment-'));
  try {
    return await fn(fs.realpathSync(tmpRoot));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function mkdirp(...segments) {
  const dir = path.join(...segments);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function mkProject(...segments) {
  const project = mkdirp(...segments);
  mkdirp(project, '.aioson');
  fs.writeFileSync(path.join(project, '.aioson', 'config.md'), '# project\n', 'utf8');
  return project;
}

// --- escapeDataTree ---------------------------------------------------------

test('escapeDataTree leaves an ordinary path untouched', () => {
  withTmp((tmp) => {
    const dir = mkdirp(tmp, 'proj', 'src', 'lib');
    assert.equal(escapeDataTree(dir), dir);
  });
});

test('escapeDataTree returns the directory that owns the .aioson/ tree', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const inside = path.join(project, '.aioson', 'briefings', 'site');
    assert.equal(escapeDataTree(inside), project);
  });
});

// Truncating at the LAST `.aioson` segment would land on the parasite's own
// parent, the very directory the walk must escape.
test('escapeDataTree truncates at the FIRST .aioson segment, not the last', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const parasite = path.join(project, '.aioson', 'briefings', 'site', '.aioson', 'context');
    assert.equal(escapeDataTree(parasite), project);
  });
});

// --- isProjectRoot ----------------------------------------------------------

test('isProjectRoot rejects a fully-marked directory that lives inside .aioson/', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const briefing = mkdirp(project, '.aioson', 'briefings', 'site');
    // Exactly what the incident left behind: a real-looking marker.
    mkdirp(briefing, '.aioson', 'context');
    fs.writeFileSync(path.join(briefing, '.aioson', 'context', 'verify-artifact-visual.json'), '{}', 'utf8');

    assert.equal(isProjectRoot(briefing), false);
    assert.equal(isProjectRoot(project), true);
  });
});

// --- resolveProjectRootOrSelf -----------------------------------------------

test('resolveProjectRootOrSelf escapes a briefing directory to the owning project', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const briefing = mkdirp(project, '.aioson', 'briefings', 'site');
    assert.equal(resolveProjectRootOrSelf(briefing), project);
  });
});

// The amplification step: once a stray marker existed, the pre-fix walk stopped
// there and every later write forked into it.
test('resolveProjectRootOrSelf ignores a stray marker already on disk', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const briefing = mkdirp(project, '.aioson', 'briefings', 'site');
    mkdirp(briefing, '.aioson', 'context');

    assert.equal(resolveProjectRootOrSelf(briefing), project);
  });
});

// --- resolveTargetDir -------------------------------------------------------

test('resolveTargetDir leaves a fresh directory alone, so setup can still scaffold', () => {
  withTmp((tmp) => {
    const fresh = mkdirp(tmp, 'greenfield');
    assert.equal(resolveTargetDir([fresh]), fresh);
    assert.equal(resolveTargetDir([], fresh), fresh);
  });
});

test('resolveTargetDir does not walk up from an ordinary subdirectory', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const sub = mkdirp(project, 'src', 'lib');
    assert.equal(resolveTargetDir([], sub), sub);
  });
});

test('resolveTargetDir redirects a cwd inside .aioson/ to the owning project', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const briefing = mkdirp(project, '.aioson', 'briefings', 'site');
    assert.equal(resolveTargetDir([], briefing), project);
    assert.equal(resolveTargetDir([briefing], tmp), project);
  });
});

// --- resolveOperandPath -----------------------------------------------------

test('resolveOperandPath keeps a relative operand reachable after the redirect', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const briefing = mkdirp(project, '.aioson', 'briefings', 'site');
    const proto = path.join(briefing, 'prototype.html');
    fs.writeFileSync(proto, '<html></html>', 'utf8');

    // Target was lifted to the project root; the operand was typed in the
    // briefing directory and must still resolve to the file the caller meant.
    assert.equal(resolveOperandPath(project, 'prototype.html', briefing), proto);
  });
});

test('resolveOperandPath prefers the target directory when both resolve', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const other = mkdirp(tmp, 'other');
    fs.writeFileSync(path.join(project, 'a.html'), 'root', 'utf8');
    fs.writeFileSync(path.join(other, 'a.html'), 'other', 'utf8');

    assert.equal(resolveOperandPath(project, 'a.html', other), path.join(project, 'a.html'));
  });
});

// --- doctor: residue already on disk ----------------------------------------

test('doctor reports AIOSON storage nested inside .aioson/', async () => {
  await withTmpAsync(async (tmp) => {
    const project = mkProject(tmp, 'proj');
    mkdirp(project, '.aioson', 'briefings', 'site', '.aioson', 'context');
    mkdirp(project, '.aioson', 'briefings', 'site', 'aioson-logs');
    mkdirp(project, '.aioson', 'context');

    const found = await scanNestedProjectRoots(project);
    assert.deepEqual(found, [
      '.aioson/briefings/site/.aioson',
      '.aioson/briefings/site/aioson-logs'
    ]);
  });
});

test('doctor reports nothing for a clean project', async () => {
  await withTmpAsync(async (tmp) => {
    const project = mkProject(tmp, 'proj');
    mkdirp(project, '.aioson', 'context', 'features');
    mkdirp(project, '.aioson', 'briefings', 'site');
    mkdirp(project, 'aioson-logs');

    assert.deepEqual(await scanNestedProjectRoots(project), []);
  });
});

// --- the incident, replayed end to end --------------------------------------

test('verify:artifact run from inside a briefing directory scaffolds nothing there', async () => {
  const tmpRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-containment-')));
  const cwd = process.cwd();
  try {
    const project = mkProject(tmpRoot, 'proj');
    const briefing = mkdirp(project, '.aioson', 'briefings', 'site');
    fs.writeFileSync(
      path.join(briefing, 'prototype.html'),
      '<!doctype html><html><body><h1>Hi</h1></body></html>',
      'utf8'
    );

    process.chdir(briefing);
    const report = await runVerifyArtifact({
      args: [],
      options: { kind: 'visual', slug: 'site', advisory: true, json: true, suppressExitCode: true },
      logger: { log() {}, error() {} }
    });

    assert.equal(report.root, project, 'target directory must be the owning project');
    assert.equal(
      fs.existsSync(path.join(briefing, '.aioson')),
      false,
      'no .aioson/ may be scaffolded inside the briefing directory'
    );
    assert.equal(fs.existsSync(path.join(briefing, 'aioson-logs')), false);
    assert.equal(
      fs.existsSync(path.join(project, '.aioson', 'context', 'verify-artifact-visual.json')),
      true,
      'the report belongs to the real project context'
    );
    // The prototype was found. The pre-fix run reported "found no HTML/CSS"
    // with the file one directory away.
    assert.ok(
      !report.issues.some((i) => /found no HTML\/CSS/.test(i)),
      `prototype must be discovered, got: ${JSON.stringify(report.issues)}`
    );
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// --- what lives under .aioson/ and IS a project, or is never residue ---------

/** A squad worktree: a full checkout (`.git` file) with its own `.aioson/`. */
function mkWorktree(project, squad, agent) {
  const worktree = mkProject(project, '.aioson', 'squads', squad, 'worktrees', agent);
  fs.writeFileSync(path.join(worktree, '.git'), `gitdir: ${path.join(project, '.git', 'worktrees', agent)}\n`, 'utf8');
  return worktree;
}

test('a squad worktree inside .aioson/ is its own project, not storage of the main tree', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const worktree = mkWorktree(project, 'growth', 'dev-a');
    const src = mkdirp(worktree, 'src', 'lib');

    assert.equal(isProjectRoot(worktree), true);
    assert.equal(escapeDataTree(src), src, 'a path inside the checkout is an ordinary path');
    assert.equal(resolveTargetDir([], src), src, 'no hoist to the main project from inside the worktree');
    assert.equal(resolveTargetDir([worktree], tmp), worktree);
    assert.equal(resolveProjectRootOrSelf(src), worktree, 'hooks attach to the worktree, not the main tree');

    // Storage INSIDE the worktree is still storage — of the worktree.
    const briefing = mkdirp(worktree, '.aioson', 'briefings', 'site');
    assert.equal(escapeDataTree(briefing), worktree);
    assert.equal(resolveTargetDir([], briefing), worktree);
  });
});

test('without a .git the same shape is residue and still hoists to the owner', () => {
  withTmp((tmp) => {
    const project = mkProject(tmp, 'proj');
    const residue = mkProject(project, '.aioson', 'squads', 'growth', 'worktrees', 'ghost');
    assert.equal(isProjectRoot(residue), false);
    assert.equal(resolveTargetDir([], path.join(residue, 'src')), project);
  });
});

test('doctor never reports update backups or git checkouts as nested storage', async () => {
  await withTmpAsync(async (tmp) => {
    const project = mkProject(tmp, 'proj');
    mkdirp(project, '.aioson', 'context');
    // `aioson update` snapshots mirror the whole tree they replaced.
    mkdirp(project, '.aioson', 'backups', '2026-08-20T10-00-00', '.aioson', 'context');
    mkdirp(project, '.aioson', 'backups', '2026-08-20T10-00-00', '.aioson', 'agents');
    mkdirp(project, '.aioson', 'backups', '2026-08-19T09-00-00', '.aioson', 'context');
    // A squad worktree carries a full project of its own.
    mkWorktree(project, 'growth', 'dev-a');
    // Real residue next to them is still reported.
    mkdirp(project, '.aioson', 'briefings', 'site', '.aioson', 'context');

    assert.deepEqual(await scanNestedProjectRoots(project), ['.aioson/briefings/site/.aioson']);
  });
});
