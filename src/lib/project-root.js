'use strict';

/**
 * Project root discovery for hook entry points and command target directories.
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
 *
 * The second invariant, `escapeDataTree`: a directory that lives INSIDE a
 * `.aioson/` tree is the framework's own storage, never a project. Without it
 * the first stray write under `.aioson/` (a report persisted next to the
 * artifact it graded, say) creates `.aioson/<...>/.aioson/context/`, and from
 * that moment the marker walk CONFIRMS the parasite: every later resolution
 * stops there and the runtime store, logs and live sessions follow it in.
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
 * The directory that OWNS the `.aioson/` tree `dir` sits inside, or `dir`
 * itself when it sits inside none.
 *
 * Truncation is at the FIRST `.aioson` segment, not the last: a nested
 * `<root>/.aioson/briefings/<slug>/.aioson/context` must resolve back to
 * `<root>`, not to the parasite's own parent.
 *
 * @param {string} dir Absolute or relative directory path.
 * @returns {string} Absolute path outside any `.aioson/` tree.
 */
function escapeDataTree(dir) {
  const resolved = path.resolve(dir || '.');
  const parts = resolved.split(path.sep);
  const idx = parts.indexOf(PROJECT_MARKER);
  if (idx <= 0) return resolved;
  return parts.slice(0, idx).join(path.sep) || path.parse(resolved).root;
}

/**
 * True when `dir` is an AIOSON PROJECT root: it holds a `.aioson/` directory
 * that carries at least one project-only entry, and is not itself inside some
 * other `.aioson/` tree. The operator store returns false.
 *
 * @param {string} dir Absolute or relative directory path.
 * @returns {boolean}
 */
function isProjectRoot(dir) {
  if (!dir) return false;
  if (escapeDataTree(dir) !== path.resolve(dir)) return false;
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
  const resolved = escapeDataTree(startDir);
  return resolveProjectRoot(resolved) || resolved;
}

/**
 * The project directory a CLI command operates on: its positional path
 * argument, defaulting to the working directory.
 *
 * Scaffolding a NEW project is legitimate intent here, so an ordinary path is
 * returned untouched — no walk, no surprise. The one correction applied is the
 * containment invariant: a path inside a `.aioson/` tree is storage, and the
 * command is redirected to the project that owns it. Running `aioson <cmd>`
 * from inside `.aioson/briefings/<slug>/` is the shape this exists for.
 *
 * @param {string[]|string|undefined} argOrArgs Command args, or a single path.
 * @param {string} [cwd] Base directory (defaults to `process.cwd()`).
 * @returns {string} Absolute project directory.
 */
function resolveTargetDir(argOrArgs, cwd) {
  const raw = Array.isArray(argOrArgs) ? argOrArgs[0] : argOrArgs;
  const base = cwd === undefined ? process.cwd() : cwd;
  const resolved = path.resolve(base, raw || '.');
  const escaped = escapeDataTree(resolved);
  if (escaped === resolved) return resolved;
  return resolveProjectRoot(escaped) || escaped;
}

/**
 * A user-supplied path operand (`--file`, `--dir`) resolved against the
 * project directory, falling back to the invocation cwd.
 *
 * `resolveTargetDir` can redirect a command from inside a `.aioson/` tree up
 * to the project that owns it. The operand the caller typed was relative to
 * where they actually stood, so resolving it only against the corrected target
 * would silently lose the file they meant.
 *
 * @param {string} targetDir Resolved project directory.
 * @param {string|null|undefined} operand Path as typed.
 * @param {string} [cwd] Invocation directory (defaults to `process.cwd()`).
 * @returns {string|null|undefined} Absolute path, or the operand when empty.
 */
function resolveOperandPath(targetDir, operand, cwd) {
  if (!operand) return operand;
  const raw = String(operand);
  if (path.isAbsolute(raw)) return raw;
  const primary = path.resolve(targetDir, raw);
  if (fs.existsSync(primary)) return primary;
  const base = cwd === undefined ? process.cwd() : cwd;
  const fallback = path.resolve(base, raw);
  return fs.existsSync(fallback) ? fallback : primary;
}

module.exports = {
  resolveProjectRoot,
  resolveProjectRootOrSelf,
  resolveTargetDir,
  resolveOperandPath,
  escapeDataTree,
  isProjectRoot,
  PROJECT_MARKER
};
