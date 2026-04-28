'use strict';

/**
 * aioson dossier:init / dossier:show — Phase 1 (read-only path).
 *
 * Usage:
 *   aioson dossier:init . --slug=feature-x [--classification=MEDIUM] [--json]
 *   aioson dossier:show . --slug=feature-x [--json]
 *
 * Aliases: --feature is accepted as a synonym of --slug for ergonomic parity
 * with feature:close / feature:archive.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const store = require('../dossier/store');
const { ALLOWED_CLASSIFICATIONS, isValidSlug } = require('../dossier/schema');

function resolveContextDir(targetDir) {
  return path.join(path.resolve(process.cwd(), targetDir || '.'), '.aioson', 'context');
}

function pickSlug(options) {
  const raw = options.slug || options.feature;
  return raw ? String(raw) : null;
}

async function readProjectClassification(ctxDir) {
  const ctxPath = path.join(ctxDir, 'project.context.md');
  try {
    const raw = await fs.readFile(ctxPath, 'utf8');
    const match = raw.match(/^classification:\s*"?([A-Z]+)"?\s*$/m);
    if (match && ALLOWED_CLASSIFICATIONS.has(match[1])) {
      return match[1];
    }
  } catch {
    // ignored — caller falls back
  }
  return null;
}

async function runDossierInit({ args = [], options = {}, logger } = {}) {
  const targetDir = args[0] || '.';
  const slug = pickSlug(options);
  const jsonOut = Boolean(options.json);
  const log = (msg) => { if (logger && !jsonOut) logger.log(msg); };

  if (!slug) {
    if (jsonOut) return { ok: false, reason: 'missing_slug' };
    log('--slug=<feature-slug> is required.');
    return { ok: false };
  }
  if (!isValidSlug(slug)) {
    if (jsonOut) return { ok: false, reason: 'invalid_slug', slug };
    log(`Invalid slug "${slug}" — must be kebab-case (lowercase, digits and hyphens).`);
    return { ok: false };
  }

  const ctxDir = resolveContextDir(targetDir);
  let classification = options.classification ? String(options.classification).toUpperCase() : null;
  if (classification && !ALLOWED_CLASSIFICATIONS.has(classification)) {
    if (jsonOut) return { ok: false, reason: 'invalid_classification', classification };
    log(`Invalid classification "${classification}" — use MICRO | SMALL | MEDIUM.`);
    return { ok: false };
  }
  if (!classification) {
    classification = (await readProjectClassification(ctxDir)) || 'MEDIUM';
  }

  try {
    const result = await store.init({
      slug,
      contextDir: ctxDir,
      classification
    });
    if (jsonOut) {
      return { ok: true, slug, path: result.path, dir: result.dir, classification };
    }
    log(`Dossier created: ${result.path}`);
    log(`  classification: ${classification}`);
    log(`  status: active   schema: 1.0`);
    return { ok: true, path: result.path };
  } catch (err) {
    if (err && err.code === 'EDOSSIEREXISTS') {
      if (jsonOut) return { ok: false, reason: 'already_exists', slug, path: err.path };
      log(`Dossier already exists at ${err.path}. Aborting (atomic init, no --force).`);
      return { ok: false };
    }
    if (err && err.code === 'EDOSSIERSCHEMA') {
      if (jsonOut) return { ok: false, reason: 'schema_violation', errors: err.errors };
      log(`Dossier schema violation: ${err.errors.join('; ')}`);
      return { ok: false };
    }
    if (err && err.code === 'EDOSSIERSLUG') {
      if (jsonOut) return { ok: false, reason: 'invalid_slug', slug };
      log(err.message);
      return { ok: false };
    }
    throw err;
  }
}

async function runDossierShow({ args = [], options = {}, logger } = {}) {
  const targetDir = args[0] || '.';
  const slug = pickSlug(options);
  const jsonOut = Boolean(options.json);
  const log = (msg) => { if (logger && !jsonOut) logger.log(msg); };

  if (!slug) {
    if (jsonOut) return { ok: false, reason: 'missing_slug' };
    log('--slug=<feature-slug> is required.');
    return { ok: false };
  }
  if (!isValidSlug(slug)) {
    if (jsonOut) return { ok: false, reason: 'invalid_slug', slug };
    log(`Invalid slug "${slug}" — must be kebab-case.`);
    return { ok: false };
  }

  const ctxDir = resolveContextDir(targetDir);
  try {
    const result = await store.show({ slug, contextDir: ctxDir });
    if (jsonOut) {
      return {
        ok: true,
        slug,
        path: result.path,
        frontmatter: result.frontmatter,
        sections: Object.keys(result.sections)
      };
    }
    log(result.header);
    log(result.raw);
    return { ok: true, path: result.path };
  } catch (err) {
    if (err && err.code === 'EDOSSIERMISSING') {
      if (jsonOut) return { ok: false, reason: 'not_found', slug, path: err.path };
      log(`Dossier not found for slug "${slug}" (expected at ${err.path}).`);
      return { ok: false };
    }
    if (err && (err.code === 'EDOSSIERPARSE' || err.code === 'EDOSSIERSCHEMA')) {
      if (jsonOut) return { ok: false, reason: err.code, errors: err.errors, message: err.message };
      log(`Cannot read dossier: ${err.message}`);
      return { ok: false };
    }
    throw err;
  }
}

module.exports = { runDossierInit, runDossierShow };
