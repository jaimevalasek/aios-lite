'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { MANAGED_FILES } = require('./constants');
const { getCliVersion } = require('./version');
const { exists, ensureDir, copyFileWithDir, nowStamp, toRelativeSafe } = require('./utils');

const ROOT_DIR = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'template');

async function detectExistingInstall(targetDir) {
  return exists(path.join(targetDir, '.aios-lite/config.md'));
}

async function listFilesRecursive(dir) {
  const out = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        out.push(full);
      }
    }
  }

  await walk(dir);
  return out;
}

function shouldSkipTemplatePath(rel) {
  if (rel.startsWith('.aios-lite/context/')) return true;
  if (rel === '.aios-lite/context/.gitkeep') return false;
  return false;
}

async function writeInstallMetadata(targetDir, action, frameworkDetection) {
  const metaPath = path.join(targetDir, '.aios-lite/install.json');
  await ensureDir(path.dirname(metaPath));
  const existing = (await exists(metaPath)) ? JSON.parse(await fs.readFile(metaPath, 'utf8')) : {};

  const version = await getCliVersion();
  const data = {
    ...existing,
    managed_by: 'aios-lite',
    template_version: version,
    last_action: action,
    last_action_at: new Date().toISOString(),
    framework_detected: frameworkDetection || existing.framework_detected || null
  };

  await fs.writeFile(metaPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function backupManagedFile(targetDir, relPath, backupRoot) {
  const source = path.join(targetDir, relPath);
  if (!(await exists(source))) return null;

  const dest = path.join(backupRoot, relPath);
  await copyFileWithDir(source, dest);
  return dest;
}

async function installTemplate(targetDir, options = {}) {
  const {
    overwrite = false,
    dryRun = false,
    mode = 'install',
    backupOnOverwrite = mode === 'update',
    frameworkDetection = null
  } = options;

  await ensureDir(targetDir);
  const existingInstall = await detectExistingInstall(targetDir);

  const templateFiles = await listFilesRecursive(TEMPLATE_DIR);
  const copied = [];
  const skipped = [];
  const backedUp = [];

  let backupRoot = null;
  if (backupOnOverwrite) {
    backupRoot = path.join(targetDir, '.aios-lite/backups', nowStamp());
  }

  for (const absPath of templateFiles) {
    const rel = toRelativeSafe(TEMPLATE_DIR, absPath);
    if (shouldSkipTemplatePath(rel)) {
      skipped.push({ path: rel, reason: 'context-protected' });
      continue;
    }

    const dest = path.join(targetDir, rel);
    const destExists = await exists(dest);

    if (destExists && !overwrite && mode !== 'update') {
      skipped.push({ path: rel, reason: 'already-exists' });
      continue;
    }

    if (destExists && mode === 'update' && backupOnOverwrite && MANAGED_FILES.includes(rel)) {
      if (!dryRun) {
        const backupPath = await backupManagedFile(targetDir, rel, backupRoot);
        if (backupPath) backedUp.push(toRelativeSafe(targetDir, backupPath));
      } else {
        backedUp.push(toRelativeSafe(targetDir, path.join(backupRoot, rel)));
      }
    }

    if (!dryRun) {
      await copyFileWithDir(absPath, dest);
    }

    copied.push(rel);
  }

  if (!dryRun) {
    await ensureDir(path.join(targetDir, '.aios-lite/context/parallel'));
    await ensureDir(path.join(targetDir, '.aios-lite/context'));
    const gitkeep = path.join(targetDir, '.aios-lite/context/.gitkeep');
    if (!(await exists(gitkeep))) {
      await fs.writeFile(gitkeep, '', 'utf8');
    }

    await writeInstallMetadata(targetDir, mode, frameworkDetection);
  }

  return {
    existingInstall,
    copied,
    skipped,
    backedUp,
    dryRun
  };
}

module.exports = {
  TEMPLATE_DIR,
  detectExistingInstall,
  installTemplate,
  listFilesRecursive
};
