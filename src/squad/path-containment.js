'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function isContainedPath(rootDir, candidatePath) {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  return relative === ''
    || (relative !== '..'
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative));
}

async function resolveRealContainedPath(rootDir, candidatePath) {
  try {
    const [root, candidate] = await Promise.all([
      fs.realpath(rootDir),
      fs.realpath(candidatePath)
    ]);
    return isContainedPath(root, candidate) ? candidate : null;
  } catch {
    return null;
  }
}

module.exports = {
  isContainedPath,
  resolveRealContainedPath
};
