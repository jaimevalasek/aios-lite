'use strict';

/**
 * Where is the interface this feature touched?
 *
 * The prototype had an owner and a path (`.aioson/briefings/{slug}/
 * prototype.html`), so its measurement auto-fired. The IMPLEMENTATION had
 * neither: no agent knew which directory to hand `verify:artifact --kind=visual
 * --dir=…`, so the shipped front-end — the thing users actually see — was the
 * one surface nothing measured. This resolves that directory from the feature's
 * delivered change set: the common ancestor of the interface files it changed.
 *
 * Only STRONG interface extensions decide (html, css/scss/sass/less, tsx/jsx,
 * vue/svelte/astro). A `.ts`/`.js` change alone never does — a backend feature
 * that touched `src/services/*.ts` must not trigger a visual measurement of
 * `src/` just because the stylesheet lives there too. Tests, fixtures, build
 * output and framework state are not interface.
 */

const path = require('node:path');
const { deliveredChangeSet } = require('../harness/review-payload');

const STRONG_INTERFACE_EXT = /\.(?:html?|css|scss|sass|less|tsx|jsx|vue|svelte|astro)$/i;
const NOT_INTERFACE_PATH = /(?:^|\/)(?:\.aioson|node_modules|dist|build|out|coverage|\.next|\.nuxt|\.svelte-kit|__tests__|__mocks__|tests?|e2e|cypress|fixtures|storybook-static)\/|\.(?:test|spec|stories)\.[^/]+$/i;

/** Longest common directory prefix of repo-relative paths ('' when none). */
function commonDir(paths) {
  if (paths.length === 0) return '';
  let prefix = paths[0].split('/').slice(0, -1);
  for (const p of paths.slice(1)) {
    const parts = p.split('/').slice(0, -1);
    let i = 0;
    while (i < prefix.length && i < parts.length && prefix[i] === parts[i]) i += 1;
    prefix = prefix.slice(0, i);
    if (prefix.length === 0) break;
  }
  return prefix.join('/');
}

/**
 * @param {string} targetDir
 * @param {{ slug?: string|null }} [options]
 * @returns {{ dir: string|null, files: string[], reason: string|null, base_source: string|null }}
 */
function resolveInterfaceDir(targetDir, { slug = null } = {}) {
  const planDir = path.join(targetDir, '.aioson', 'plans', slug || '');
  const changeSet = deliveredChangeSet(targetDir, planDir, { slug });
  if (!changeSet.ok) {
    return { dir: null, files: [], reason: 'git is unavailable here, so the changed interface files cannot be resolved — pass --dir=<interface root>', base_source: null };
  }
  const files = [
    ...changeSet.changedFiles.filter((f) => f.status !== 'D').map((f) => f.path),
    ...changeSet.untracked
  ].filter((p) => STRONG_INTERFACE_EXT.test(p) && !NOT_INTERFACE_PATH.test(p));
  if (files.length === 0) {
    return { dir: null, files: [], reason: 'no interface sources in the delivered change set — nothing to measure', base_source: changeSet.baseSource };
  }
  const dir = commonDir(files);
  return { dir: dir || '.', files, reason: null, base_source: changeSet.baseSource };
}

module.exports = { resolveInterfaceDir, commonDir, STRONG_INTERFACE_EXT };
