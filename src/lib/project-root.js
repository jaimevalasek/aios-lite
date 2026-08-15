'use strict';

/**
 * Project root discovery for hook entry points.
 *
 * Harness hooks fire with the SHELL's working directory, not the project
 * directory. Any `cd` into a subdirectory during a session moves it, so
 * resolving `.aioson/` relative to that cwd scaffolds an orphan runtime store
 * in whatever subdirectory happened to be current: the repository gains an
 * untracked SQLite database plus telemetry, and the session's runtime state
 * fragments across two stores that never reconcile.
 *
 * The invariant this module exists to enforce: hooks ATTACH to a project that
 * already exists — they never create one. A path outside any AIOSON project
 * resolves to null, and the caller no-ops.
 */

const path = require('node:path');
const fs = require('node:fs');

const PROJECT_MARKER = '.aioson';

// A bare `.aioson/` directory is NOT enough to call a directory a project root.
// The operator store at `~/.aioson/` (config.json, operators/, search/, shards/)
// is shared by every project on the machine, and most projects live somewhere
// under the user's home — so a walk keyed on the directory name alone escapes
// the project and lands in the global store, which is strictly worse than the
// subdirectory it was meant to prevent.
//
// These entries exist in every installed project (they ship in `template/.aioson/`)
// and in no operator store.
const PROJECT_ENTRIES = ['config.md', 'constitution.md', 'context', 'agents'];

// Depth bound: guards against a pathological path or a symlink cycle turning
// the walk into a hang inside a hot-path hook.
const MAX_DEPTH = 64;

/**
 * True when `dir` is an AIOSON PROJECT root: it holds a `.aioson/` directory
 * that carries at least one project-only entry. The operator store returns
 * false.
 *
 * @param {string} dir Absolute or relative directory path.
 * @returns {boolean}
 */
function isProjectRoot(dir) {
  if (!dir) return false;
  const marker = path.join(dir, PROJECT_MARKER);
  try {
    if (!fs.statSync(marker).isDirectory()) return false;
  } catch {
    return false;
  }
  return PROJECT_ENTRIES.some((entry) => fs.existsSync(path.join(marker, entry)));
}

/**
 * Walk up from `startDir` and return the nearest ancestor that is an AIOSON
 * project root. `startDir` itself is checked first.
 *
 * @param {string} startDir Directory to start from (the hook's cwd).
 * @returns {string|null} Absolute project root, or null when outside a project.
 */
function resolveProjectRoot(startDir) {
  let dir = path.resolve(startDir || '.');
  const { root } = path.parse(dir);

  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    if (isProjectRoot(dir)) return dir;
    if (dir === root) return null;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }

  return null;
}

/**
 * Same walk, but falling back to the resolved `startDir` when no project root
 * is found. For user-invoked commands, where running outside a project and
 * scaffolding one is legitimate intent — being inside a subdirectory of a real
 * project still resolves to that project rather than to the subdirectory.
 *
 * Hook entry points that WRITE must use `resolveProjectRoot` and no-op on null;
 * this variant would let them scaffold the orphan store it exists to prevent.
 *
 * @param {string} startDir Directory to start from.
 * @returns {string} Absolute project root, or the resolved `startDir`.
 */
function resolveProjectRootOrSelf(startDir) {
  const resolved = path.resolve(startDir || '.');
  return resolveProjectRoot(resolved) || resolved;
}

module.exports = {
  resolveProjectRoot,
  resolveProjectRootOrSelf,
  isProjectRoot,
  PROJECT_MARKER
};
