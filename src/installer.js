'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { MANAGED_FILES } = require('./constants');
const { getCliVersion } = require('./version');
const { exists, ensureDir, copyFileWithDir, nowStamp, toRelativeSafe } = require('./utils');
const { ensureProjectRuntime } = require('./execution-gateway');

const ROOT_DIR = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'template');
const PROJECT_LOCAL_FILES = new Set(['aioson-models.json']);
const GITIGNORE_POLICY_LINES = [
  '# AIOSON — keep shared project memory and tool contracts',
  '!AGENTS.md',
  '!CLAUDE.md',
  '!OPENCODE.md',
  '!.claude/',
  '!.claude/**',
  '!.gemini/',
  '!.gemini/**',
  '!.aioson/',
  '!.aioson/**',
  '# AIOSON — local-only artifacts',
  'aioson-models.json',
  '.aioson/backups/',
  '.aioson/cloud-imports/',
  '.aioson/runtime/',
  '.aioson/mcp/presets/',
  '.aioson/install.json',
  '.aioson/mcp/servers.local.json'
];

async function detectExistingInstall(targetDir) {
  return exists(path.join(targetDir, '.aioson/config.md'));
}

async function ensureGitignoreEntry(targetDir, entry) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  let content = '';
  if (await exists(gitignorePath)) {
    content = await fs.readFile(gitignorePath, 'utf8');
  }
  if (content.split('\n').some(line => line.trim() === entry)) return false;
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  await fs.writeFile(gitignorePath, `${content}${separator}${entry}\n`, 'utf8');
  return true;
}

async function ensureGitignoreEntries(targetDir, entries) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  let content = '';
  if (await exists(gitignorePath)) {
    content = await fs.readFile(gitignorePath, 'utf8');
  }

  const existing = new Set(content.split('\n').map((line) => line.trim()));
  const missing = entries.filter((entry) => !existing.has(entry));
  if (missing.length === 0) return 0;

  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  await fs.writeFile(gitignorePath, `${content}${separator}${missing.join('\n')}\n`, 'utf8');
  return missing.length;
}

async function countProjectFiles(targetDir) {
  const SKIP = new Set(['.git', 'node_modules', 'vendor', '.aioson', 'dist', 'build', '__pycache__']);
  let count = 0;
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      if (e.isDirectory()) await walk(path.join(dir, e.name));
      else count++;
    }
  }
  await walk(targetDir);
  return count;
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
  if (rel.startsWith('.aioson/context/')) return true;
  if (rel === '.aioson/context/.gitkeep') return false;
  return false;
}

async function writeInstallMetadata(targetDir, action, frameworkDetection) {
  const metaPath = path.join(targetDir, '.aioson/install.json');
  await ensureDir(path.dirname(metaPath));
  const existing = (await exists(metaPath)) ? JSON.parse(await fs.readFile(metaPath, 'utf8')) : {};

  const version = await getCliVersion();
  const data = {
    ...existing,
    managed_by: 'aioson',
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
  let runtime = null;

  let backupRoot = null;
  if (backupOnOverwrite) {
    backupRoot = path.join(targetDir, '.aioson/backups', nowStamp());
  }

  for (const absPath of templateFiles) {
    const rel = toRelativeSafe(TEMPLATE_DIR, absPath);
    if (shouldSkipTemplatePath(rel)) {
      skipped.push({ path: rel, reason: 'context-protected' });
      continue;
    }

    const dest = path.join(targetDir, rel);
    const destExists = await exists(dest);

    if (destExists && PROJECT_LOCAL_FILES.has(rel)) {
      skipped.push({ path: rel, reason: 'project-local' });
      continue;
    }

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
    await ensureDir(path.join(targetDir, '.aioson/context/parallel'));
    await ensureDir(path.join(targetDir, '.aioson/context'));
    const gitkeep = path.join(targetDir, '.aioson/context/.gitkeep');
    if (!(await exists(gitkeep))) {
      await fs.writeFile(gitkeep, '', 'utf8');
    }

    await writeInstallMetadata(targetDir, mode, frameworkDetection);

    await ensureGitignoreEntries(targetDir, GITIGNORE_POLICY_LINES);

    runtime = await ensureProjectRuntime(targetDir);
  }

  // Detect if this is an existing project with many files
  const projectFileCount = await countProjectFiles(targetDir);
  const isExistingProject = frameworkDetection && projectFileCount > 20;

  return {
    existingInstall,
    copied,
    skipped,
    backedUp,
    runtime,
    dryRun,
    projectFileCount,
    isExistingProject
  };
}

module.exports = {
  TEMPLATE_DIR,
  detectExistingInstall,
  installTemplate,
  listFilesRecursive,
  ensureGitignoreEntry,
  ensureGitignoreEntries,
  countProjectFiles
};
