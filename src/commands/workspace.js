'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists } = require('../utils');
const { readConfig } = require('./config');

const WORKSPACE_FILE = '.aioson/workspace.json';
const DEFAULT_BASE_URL = 'https://aioson.com';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function findProjectRoot(startDir) {
  let current = path.resolve(startDir || '.');
  for (let i = 0; i < 12; i++) {
    try {
      await fs.access(path.join(current, '.aioson'));
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.resolve(startDir || '.');
}

async function readWorkspace(projectDir) {
  const wsPath = path.join(projectDir, WORKSPACE_FILE);
  if (!(await exists(wsPath))) return null;
  try {
    return JSON.parse(await fs.readFile(wsPath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeWorkspace(projectDir, data) {
  const wsPath = path.join(projectDir, WORKSPACE_FILE);
  await fs.writeFile(wsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return wsPath;
}

async function runWorkspaceInit({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const projectDir = await findProjectRoot(targetDir);
  const wsPath = path.join(projectDir, WORKSPACE_FILE);

  if ((await exists(wsPath)) && !options.force) {
    const ws = JSON.parse(await fs.readFile(wsPath, 'utf8'));
    const config = await readConfig();
    const baseUrl = String(config.aiosonBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    logger.log(t('workspace.already_linked', { slug: ws.slug, url: `${baseUrl}/workspaces/${ws.slug}` }));
    return { ok: true, slug: ws.slug, alreadyExists: true };
  }

  const config = await readConfig();
  const baseUrl = String(config.aiosonBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const username = slugify(config.aiosonUsername || 'local');
  const projectName = slugify(options.name || path.basename(projectDir));
  const baseSlug = `${username}-${projectName}`;
  const token = config.aiosonToken;

  let workspaceId = `wks_local_${Date.now()}`;
  let finalSlug = baseSlug;

  if (token) {
    try {
      logger.log(t('workspace.registering'));
      const response = await fetch(`${baseUrl}/api/workspaces`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({ slug: baseSlug, projectName }),
        signal: AbortSignal.timeout(10000)
      });
      if (response.ok) {
        const data = await response.json();
        // /api/workspaces POST returns { ok, workspace: { id, name, slug } }
        workspaceId = data.workspace?.id || data.workspaceId || workspaceId;
        finalSlug = data.workspace?.slug || data.slug || baseSlug;
      }
    } catch {
      // Offline — use local ID, will sync later
    }
  }

  const wsData = { slug: finalSlug, workspaceId, createdAt: new Date().toISOString() };
  const writtenPath = await writeWorkspace(projectDir, wsData);

  logger.log(t('workspace.init_ok', { slug: finalSlug, path: writtenPath, url: `${baseUrl}/workspaces/${finalSlug}` }));
  return { ok: true, slug: finalSlug, workspaceId, path: writtenPath };
}

async function runWorkspaceStatus({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const projectDir = await findProjectRoot(targetDir);
  const ws = await readWorkspace(projectDir);

  if (!ws) {
    logger.log(t('workspace.not_linked'));
    logger.log(t('workspace.init_hint'));
    return { ok: true, linked: false };
  }

  const config = await readConfig();
  const baseUrl = String(config.aiosonBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');

  logger.log(t('workspace.status_slug', { slug: ws.slug }));
  logger.log(t('workspace.status_id', { id: ws.workspaceId }));
  logger.log(t('workspace.status_url', { url: `${baseUrl}/workspaces/${ws.slug}` }));
  logger.log(t('workspace.status_created', { date: ws.createdAt }));

  return { ok: true, linked: true, ...ws };
}

async function runWorkspaceOpen({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const projectDir = await findProjectRoot(targetDir);
  const ws = await readWorkspace(projectDir);

  if (!ws) {
    logger.log(t('workspace.not_linked'));
    logger.log(t('workspace.init_hint'));
    return { ok: false, error: { code: 'not_linked' } };
  }

  const config = await readConfig();
  const baseUrl = String(config.aiosonBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const url = `${baseUrl}/workspaces/${ws.slug}`;
  logger.log(t('workspace.open_url', { url }));
  return { ok: true, url };
}

module.exports = { runWorkspaceInit, runWorkspaceStatus, runWorkspaceOpen, readWorkspace, findProjectRoot };
