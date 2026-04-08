'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { loadCompatibleGenome } = require('../lib/genomes/compat');

const INSTALLED_SKILLS_DIR = '.aioson/installed-skills';
const BUILTIN_SKILLS_DIR = '.aioson/skills';
const GENOMES_DIR = '.aioson/genomes';

/**
 * Walk up the directory tree from startDir looking for a dir that contains .aioson/.
 * Falls back to process.cwd() if not found.
 */
async function findProjectRoot(startDir) {
  let current = startDir;
  for (let i = 0; i < 10; i++) {
    try {
      await fs.access(path.join(current, '.aioson'));
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return process.cwd();
}

/**
 * Check whether a skill slug is available in the project.
 * Checks installed skills AND built-in skills directories.
 */
async function isSkillAvailable(projectRoot, slug) {
  const installedPath = path.join(projectRoot, INSTALLED_SKILLS_DIR, slug, 'SKILL.md');
  const builtinExact = path.join(projectRoot, BUILTIN_SKILLS_DIR, slug, 'SKILL.md');
  // Also check as a flat dir (some skills live directly under .aioson/skills/{slug}/)
  const builtinDir = path.join(projectRoot, BUILTIN_SKILLS_DIR, slug);

  for (const candidate of [installedPath, builtinExact]) {
    try {
      await fs.access(candidate);
      return { found: true, path: path.relative(projectRoot, path.dirname(candidate)) };
    } catch { /* not found */ }
  }

  try {
    const stat = await fs.stat(builtinDir);
    if (stat.isDirectory()) {
      return { found: true, path: path.relative(projectRoot, builtinDir) };
    }
  } catch { /* not found */ }

  return { found: false };
}

/**
 * Check whether a genome slug is available in the project.
 */
async function isGenomeAvailable(projectRoot, slug) {
  const genomePath = path.join(projectRoot, GENOMES_DIR, `${slug}.md`);
  try {
    await fs.access(genomePath);
    return { found: true, path: path.relative(projectRoot, genomePath) };
  } catch {
    return { found: false };
  }
}

/**
 * Read and parse the .meta.json companion file for a genome .md.
 * Returns null if absent or invalid JSON.
 */
async function readGenomeMeta(mdFilePath) {
  const slug = path.basename(mdFilePath, '.md');
  const metaPath = path.join(path.dirname(mdFilePath), `${slug}.meta.json`);
  try {
    const raw = await fs.readFile(metaPath, 'utf8');
    return { meta: JSON.parse(raw), metaPath };
  } catch {
    return { meta: null, metaPath };
  }
}

async function runGenomeDoctor({ args, options = {}, logger }) {
  const target = args[0];
  if (!target) {
    throw new Error('Usage: aioson genome:doctor <file>');
  }

  const filePath = path.resolve(process.cwd(), target);
  const raw = await fs.readFile(filePath, 'utf8');
  const loaded = loadCompatibleGenome(raw, { filePath });

  const result = {
    ok: true,
    file: filePath,
    detectedFormat: loaded.format,
    migrated: loaded.migrated,
    slug: loaded.document.slug,
    type: loaded.document.type,
    depth: loaded.document.depth,
    evidenceMode: loaded.document.evidenceMode,
    dependencies: {
      skills: [],
      genomes: [],
      missing: { skills: [], genomes: [] }
    }
  };

  // Check for .meta.json companion
  const { meta, metaPath } = await readGenomeMeta(filePath);
  const hasMeta = Boolean(meta);
  result.hasMeta = hasMeta;

  if (!options.json) {
    logger.log(`Genome file: ${filePath}`);
    logger.log(`Format: ${result.detectedFormat}`);
    logger.log(`Migrated internally: ${result.migrated ? 'yes' : 'no'}`);
    logger.log(`Slug: ${result.slug}`);
    logger.log(`Type: ${result.type}`);
    logger.log(`Depth: ${result.depth}`);
    logger.log(`Evidence mode: ${result.evidenceMode}`);
    logger.log(`Meta file: ${hasMeta ? path.relative(process.cwd(), metaPath) : 'not found'}`);
  }

  // Dependency check — requires meta.json with dependencies field
  const deps = hasMeta && meta.dependencies
    ? {
        skills: Array.isArray(meta.dependencies.skills) ? meta.dependencies.skills : [],
        genomes: Array.isArray(meta.dependencies.genomes) ? meta.dependencies.genomes : []
      }
    : { skills: [], genomes: [] };

  result.dependencies.skills = deps.skills;
  result.dependencies.genomes = deps.genomes;

  if (deps.skills.length === 0 && deps.genomes.length === 0) {
    if (!options.json) logger.log('\nDependencies: none declared');
    return result;
  }

  const projectRoot = await findProjectRoot(path.dirname(filePath));
  const missingSkills = [];
  const missingGenomes = [];

  if (!options.json) logger.log('\nChecking dependencies...');

  for (const slug of deps.skills) {
    const check = await isSkillAvailable(projectRoot, slug);
    if (check.found) {
      if (!options.json) logger.log(`  skill "${slug}": OK (${check.path})`);
    } else {
      missingSkills.push(slug);
      if (!options.json) logger.log(`  skill "${slug}": MISSING`);
    }
  }

  for (const slug of deps.genomes) {
    const check = await isGenomeAvailable(projectRoot, slug);
    if (check.found) {
      if (!options.json) logger.log(`  genome "${slug}": OK (${check.path})`);
    } else {
      missingGenomes.push(slug);
      if (!options.json) logger.log(`  genome "${slug}": MISSING`);
    }
  }

  result.dependencies.missing = { skills: missingSkills, genomes: missingGenomes };

  const hasMissing = missingSkills.length > 0 || missingGenomes.length > 0;
  if (hasMissing) {
    result.ok = false;
    if (!options.json) {
      logger.log('\nMissing dependencies detected.');
      if (missingSkills.length > 0) {
        logger.log('Install missing skills:');
        for (const slug of missingSkills) {
          logger.log(`  aioson skill:install --slug=${slug}`);
        }
      }
      if (missingGenomes.length > 0) {
        logger.log('Install missing genomes:');
        for (const slug of missingGenomes) {
          logger.log(`  aioson genome:install --slug=${slug}`);
        }
      }
    }
  } else if (!options.json) {
    logger.log('\nAll dependencies satisfied.');
  }

  return result;
}

module.exports = {
  runGenomeDoctor
};
