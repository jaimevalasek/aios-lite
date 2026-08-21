'use strict';

/**
 * Locate Playwright for a project the way `aioson doctor` promises it: from the
 * project under inspection first, then from the CLI's own tree.
 *
 * A CLI installed globally or `npm link`ed shares no `node_modules` with the
 * project it inspects. A bare `require('playwright')` beside the CLI then
 * reports "not installed" against a project that did install it — and every
 * browser gate (`verify:artifact --runtime`, `qa:run`, `qa:scan`) silently
 * never runs while the doctor keeps saying it can. One resolver, one answer.
 *
 * Never throws: an absent browser is a reported state, not an error.
 */

/**
 * @param {Array<string|null|undefined>} projectDirs directories to probe first, in order
 * @returns {string|null} the resolved module path, or null when nothing provides it
 */
function resolvePlaywright(projectDirs = []) {
  const dirs = (Array.isArray(projectDirs) ? projectDirs : [projectDirs]).filter((dir) => typeof dir === 'string' && dir);
  for (const paths of [...dirs.map((dir) => [dir]), null]) {
    try {
      return require.resolve('playwright', paths ? { paths } : undefined);
    } catch { /* keep probing */ }
  }
  return null;
}

/**
 * @param {Array<string|null|undefined>} projectDirs directories to probe first, in order
 * @returns {object|null} the Playwright module, or null when nothing provides it
 */
function loadPlaywright(projectDirs = []) {
  const resolved = resolvePlaywright(projectDirs);
  if (!resolved) return null;
  try { return require(resolved); } catch { return null; }
}

module.exports = { loadPlaywright, resolvePlaywright };
