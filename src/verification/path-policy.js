'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function validateFeatureSlug(slug) {
  const value = String(slug || '').trim();
  if (!value) {
    return { ok: false, reason: 'missing_feature' };
  }
  if (!SLUG_RE.test(value)) {
    return { ok: false, reason: 'invalid_feature_slug', feature_slug: value };
  }
  return { ok: true, feature_slug: value };
}

function isInsideRoot(rootDir, candidatePath) {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveProjectRoot(cwd, targetArg) {
  return path.resolve(cwd || process.cwd(), targetArg || '.');
}

function resolveInsideRoot(rootDir, inputPath) {
  if (!inputPath) {
    return { ok: false, reason: 'missing_path' };
  }
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, String(inputPath));
  if (!isInsideRoot(root, resolved)) {
    return {
      ok: false,
      reason: 'path_outside_root',
      path: String(inputPath)
    };
  }
  return {
    ok: true,
    path: resolved,
    relative_path: toPosixPath(path.relative(root, resolved))
  };
}

async function resolveExistingInsideRoot(rootDir, inputPath) {
  const lexical = resolveInsideRoot(rootDir, inputPath);
  if (!lexical.ok) return lexical;

  try {
    const [rootRealPath, candidateRealPath] = await Promise.all([
      fs.realpath(path.resolve(rootDir)),
      fs.realpath(lexical.path)
    ]);
    if (!isInsideRoot(rootRealPath, candidateRealPath)) {
      return {
        ok: false,
        reason: 'path_outside_root',
        path: String(inputPath)
      };
    }
    return {
      ...lexical,
      real_path: candidateRealPath
    };
  } catch (error) {
    return {
      ok: false,
      reason: error && error.code === 'ENOENT' ? 'path_missing' : 'path_unresolvable',
      path: String(inputPath)
    };
  }
}

function relativeFromRoot(rootDir, absolutePath) {
  return toPosixPath(path.relative(path.resolve(rootDir), path.resolve(absolutePath)));
}

function featureContextDir(rootDir, slug) {
  return path.join(path.resolve(rootDir), '.aioson', 'context', 'features', slug);
}

function verificationRunsDir(rootDir, slug) {
  return path.join(featureContextDir(rootDir, slug), 'verification-runs');
}

module.exports = {
  validateFeatureSlug,
  resolveProjectRoot,
  resolveInsideRoot,
  resolveExistingInsideRoot,
  relativeFromRoot,
  featureContextDir,
  verificationRunsDir,
  isInsideRoot,
  toPosixPath
};
