'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(filePath) {
  if (!(await exists(filePath))) return null;
  return fs.readFile(filePath, 'utf8');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyFileWithDir(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

function nowStamp() {
  const d = new Date();
  return d.toISOString().replace(/[:]/g, '-');
}

function toRelativeSafe(baseDir, absolutePath) {
  const rel = path.relative(baseDir, absolutePath);
  if (rel.startsWith('..')) {
    throw new Error(`Path traversal detected: "${absolutePath}" escapes base "${baseDir}"`);
  }
  return rel.split(path.sep).join('/');
}

module.exports = {
  exists,
  readTextIfExists,
  ensureDir,
  copyFileWithDir,
  nowStamp,
  toRelativeSafe
};
