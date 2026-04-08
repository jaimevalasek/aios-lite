'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists } = require('../utils');
const { readConfig } = require('./config');
const { readWorkspace, findProjectRoot } = require('./workspace');
const { scanPackage, formatScanReport } = require('../lib/store/security-scan');

const DEFAULT_BASE_URL = 'https://aioson.com';
const GENOMES_DIR = '.aioson/genomes';

function resolveBaseUrl(config) {
  return String(config.aiosonBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function requireToken(config, t) {
  const token = config.aiosonToken;
  if (!token) throw new Error(t('store.error_not_authenticated'));
  return token;
}

async function storeGet(url, token) {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json'
    },
    signal: AbortSignal.timeout(15000)
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* */ }
  if (!response.ok) {
    const detail = (parsed && parsed.error) ? String(parsed.error) : `${response.status} ${response.statusText}`;
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }
  return parsed;
}

async function storePost(url, payload, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });

  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* */ }

  if (!response.ok) {
    const detail = (parsed && parsed.error) ? String(parsed.error) : `${response.status} ${response.statusText}`;
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  return parsed;
}

async function collectRefs(refsDir) {
  const refs = {};
  if (!(await exists(refsDir))) return refs;
  const entries = await fs.readdir(refsDir);
  for (const entry of entries) {
    try {
      refs[entry] = await fs.readFile(path.join(refsDir, entry), 'utf8');
    } catch { /* */ }
  }
  return refs;
}

// ── genome:publish ──────────────────────────────────────────────────────────

async function runGenomePublish({ args, options, logger, t }) {
  const config = await readConfig();
  const token = requireToken(config, t);
  const projectDir = await findProjectRoot(path.resolve(process.cwd(), args[0] || '.'));
  const slug = String(options.slug || '').trim();
  if (!slug) throw new Error(t('store.error_missing_slug'));

  const genomePath = path.join(projectDir, GENOMES_DIR, `${slug}.md`);
  const metaPath = path.join(projectDir, GENOMES_DIR, `${slug}.meta.json`);
  const refsDir = path.join(projectDir, GENOMES_DIR, `${slug}.refs`);

  if (!(await exists(genomePath))) {
    throw new Error(t('store.error_genome_not_found', { slug, path: genomePath }));
  }

  logger.log(t('store.publish_genome_validating'));
  const content = await fs.readFile(genomePath, 'utf8');

  let meta = {};
  if (await exists(metaPath)) {
    try { meta = JSON.parse(await fs.readFile(metaPath, 'utf8')); } catch { /* */ }
  }

  const refs = await collectRefs(refsDir);

  // Security scan
  const allFiles = { [`${slug}.md`]: content };
  if (meta) allFiles[`${slug}.meta.json`] = JSON.stringify(meta);
  for (const [k, v] of Object.entries(refs)) allFiles[`refs/${k}`] = v;

  const scan = scanPackage(allFiles, 'genome');
  formatScanReport(scan, logger);
  if (!scan.ok) throw new Error(t('store.error_scan_failed'));
  if (scan.warnings.length > 0 && !options.force) {
    throw new Error(t('store.error_scan_warnings', { count: scan.warnings.length }));
  }

  const ws = await readWorkspace(projectDir);
  const visibility = options.private ? 'private' : 'public';
  const paid = Boolean(options.paid);

  if (options['dry-run']) {
    logger.log(t('store.publish_dry_run', { type: 'genome', slug, visibility }));
    logger.log(t('store.publish_scan_ok', { hash: scan.hash.slice(0, 12) }));
    return { ok: true, dryRun: true, slug, visibility, paid, hash: scan.hash };
  }

  logger.log(t('store.publish_scan_ok', { hash: scan.hash.slice(0, 12) }));
  logger.log(t('store.publish_genome_sending'));
  const baseUrl = resolveBaseUrl(config);
  const response = await storePost(`${baseUrl}/api/store/genomes/publish`, {
    kind: 'aioson.store.genome',
    slug,
    content,
    meta,
    refs,
    visibility,
    paid,
    hash: scan.hash,
    workspaceSlug: ws?.slug || null
  }, token);

  logger.log(t('store.publish_genome_done', { slug, url: `${baseUrl}/store/genomes/${slug}` }));
  return { ok: true, slug, visibility, paid, response };
}

// ── genome:install (store) ──────────────────────────────────────────────────

async function runGenomeInstallStore({ args, options, logger, t }) {
  const config = await readConfig();
  const token = requireToken(config, t);
  const projectDir = await findProjectRoot(path.resolve(process.cwd(), args[0] || '.'));
  const baseUrl = resolveBaseUrl(config);

  // Accept: --slug=X or positional code/slug
  const ref = String(options.slug || options.code || args[1] || args[0] || '').trim();
  if (!ref) throw new Error(t('store.error_missing_code_or_slug'));

  const ws = await readWorkspace(projectDir);
  logger.log(t('store.install_genome_fetching', { ref }));

  const response = await storePost(`${baseUrl}/api/store/genomes/install`, {
    ref,
    workspaceSlug: ws?.slug || null
  }, token);

  const slug = response.slug;
  if (!slug || !response.content) {
    throw new Error(t('store.error_invalid_response'));
  }

  const destPath = path.join(projectDir, GENOMES_DIR, `${slug}.md`);
  const metaDestPath = path.join(projectDir, GENOMES_DIR, `${slug}.meta.json`);

  // Backup existing version if present
  if ((await exists(destPath)) && !options.force) {
    const backupPath = path.join(projectDir, GENOMES_DIR, `${slug}.backup.md`);
    logger.log(t('store.install_backing_up', { path: backupPath }));
    await fs.copyFile(destPath, backupPath);
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, response.content, 'utf8');

  if (response.meta) {
    await fs.writeFile(metaDestPath, `${JSON.stringify(response.meta, null, 2)}\n`, 'utf8');
  }

  // Write refs if present
  if (response.refs && typeof response.refs === 'object') {
    const refsDir = path.join(projectDir, GENOMES_DIR, `${slug}.refs`);
    await fs.mkdir(refsDir, { recursive: true });
    for (const [name, content] of Object.entries(response.refs)) {
      await fs.writeFile(path.join(refsDir, name), content, 'utf8');
    }
  }

  logger.log(t('store.install_genome_done', { slug, path: destPath }));
  return { ok: true, slug, path: destPath };
}

// ── genome:install (user-facing alias for genome:install:store) ─────────────

async function runGenomeInstall({ args, options, logger, t }) {
  // Accept: aioson genome:install <code-or-slug> or --slug=X or --code=X
  const ref = String(options.slug || options.code || args[0] || '').trim();
  if (!ref) throw new Error(t('store.error_missing_code_or_slug'));
  return runGenomeInstallStore({ args, options: { ...options, slug: ref }, logger, t });
}

// ── genome:list ─────────────────────────────────────────────────────────────

async function runGenomeList({ args, options, logger, t }) {
  // --remote: list published genomes on aioson.com
  if (options.remote) {
    const config = await readConfig();
    const token = requireToken(config, t);
    const baseUrl = resolveBaseUrl(config);
    logger.log(t('store.list_remote_fetching', { type: 'genomes' }));
    const response = await storeGet(`${baseUrl}/api/store/genomes`, token);
    const genomes = response.genomes || [];
    if (genomes.length === 0) {
      logger.log(t('store.list_remote_empty', { type: 'genomes' }));
    } else {
      logger.log(t('store.list_remote_header', { count: genomes.length, type: 'genomes' }));
      for (const g of genomes) {
        logger.log(t('store.list_remote_item', { slug: g.slug, name: g.name || g.slug, visibility: g.visibility || '?' }));
      }
    }
    return { ok: true, genomes, remote: true };
  }

  // local list
  const projectDir = await findProjectRoot(path.resolve(process.cwd(), args[0] || '.'));
  const genomesDir = path.join(projectDir, GENOMES_DIR);

  if (!(await exists(genomesDir))) {
    logger.log(t('store.list_genome_empty'));
    return { ok: true, genomes: [] };
  }

  const entries = await fs.readdir(genomesDir);
  const genomes = [];

  for (const entry of entries) {
    if (!entry.endsWith('.md') || entry.endsWith('.backup.md')) continue;
    const slug = entry.replace(/\.md$/, '');
    const metaPath = path.join(genomesDir, `${slug}.meta.json`);
    let meta = {};
    try {
      if (await exists(metaPath)) {
        meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      }
    } catch { /* */ }
    genomes.push({ slug, version: meta.version || null, name: meta.name || slug });
  }

  if (genomes.length === 0) {
    logger.log(t('store.list_genome_empty'));
  } else {
    logger.log(t('store.list_genome_header', { count: genomes.length }));
    for (const g of genomes) {
      const ver = g.version ? ` (v${g.version})` : '';
      logger.log(t('store.list_genome_item', { slug: g.slug, name: g.name, version: ver }));
    }
  }

  return { ok: true, genomes };
}

// ── genome:remove ────────────────────────────────────────────────────────────

async function runGenomeRemove({ args, options, logger, t }) {
  const projectDir = await findProjectRoot(path.resolve(process.cwd(), args[0] || '.'));
  const slug = String(options.slug || args[0] || '').trim();
  if (!slug) throw new Error(t('store.error_missing_slug'));

  const genomesDir = path.join(projectDir, GENOMES_DIR);
  const genomePath = path.join(genomesDir, `${slug}.md`);
  const metaPath = path.join(genomesDir, `${slug}.meta.json`);
  const refsDir = path.join(genomesDir, `${slug}.refs`);

  if (!(await exists(genomePath))) {
    throw new Error(t('store.error_genome_not_found', { slug, path: genomePath }));
  }

  if (!options.force) {
    // Backup before removing
    const backupPath = path.join(genomesDir, `${slug}.backup.md`);
    await fs.copyFile(genomePath, backupPath);
    logger.log(t('store.install_backing_up', { path: backupPath }));
  }

  await fs.unlink(genomePath);
  if (await exists(metaPath)) await fs.unlink(metaPath);
  if (await exists(refsDir)) {
    const refs = await fs.readdir(refsDir);
    for (const r of refs) await fs.unlink(path.join(refsDir, r));
    await fs.rmdir(refsDir);
  }

  logger.log(t('store.remove_genome_done', { slug }));
  return { ok: true, slug };
}

module.exports = { runGenomePublish, runGenomeInstallStore, runGenomeInstall, runGenomeList, runGenomeRemove };
