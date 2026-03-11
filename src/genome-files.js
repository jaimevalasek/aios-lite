'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  isGenomeV2,
  normalizeGenome,
  normalizeGenomeMeta
} = require('./genomes');
const { parseGenomeMarkdown, serializeGenomeMarkdown } = require('./genome-format');
const { assertValidGenome, assertValidGenomeMeta } = require('./genome-schema');
const { ensureDir, exists } = require('./utils');

function getGenomeDir(projectRoot) {
  return path.join(projectRoot, '.aios-lite', 'genomas');
}

function getGenomeMarkdownPath(projectRoot, slug) {
  return path.join(getGenomeDir(projectRoot), `${slug}.md`);
}

function getGenomeMetaPath(projectRoot, slug) {
  return path.join(getGenomeDir(projectRoot), `${slug}.meta.json`);
}

async function readMetaFile(filePath, slug) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw new Error(`Invalid genome meta JSON for "${slug}" at ${filePath}: ${error.message}`);
  }
}

function mergeGenomeWithMeta(genome, rawMeta, slug) {
  if (!rawMeta) {
    return normalizeGenome({
      ...genome,
      slug: genome.slug || slug
    });
  }

  return normalizeGenome({
    ...genome,
    slug: genome.slug || rawMeta.slug || slug,
    domain: genome.domain || rawMeta.domain,
    type: genome.hasFrontmatter ? genome.type : rawMeta.type,
    language: genome.hasFrontmatter ? genome.language : rawMeta.language,
    depth: genome.hasFrontmatter ? genome.depth : rawMeta.depth,
    evidenceMode: genome.hasFrontmatter ? genome.evidenceMode : rawMeta.evidenceMode,
    sourceCount: genome.hasFrontmatter ? genome.sourceCount : rawMeta.sourceCount
  });
}

async function readGenome(projectRoot, slug) {
  const markdownPath = getGenomeMarkdownPath(projectRoot, slug);
  const metaPath = getGenomeMetaPath(projectRoot, slug);

  if (!(await exists(markdownPath))) {
    throw new Error(`Genome "${slug}" not found at ${markdownPath}`);
  }

  const markdown = await fs.readFile(markdownPath, 'utf8');
  const parsedGenome = parseGenomeMarkdown(markdown);
  const rawMeta = await readMetaFile(metaPath, slug);
  const genome = assertValidGenome(mergeGenomeWithMeta(parsedGenome, rawMeta, slug));

  let meta;
  if (rawMeta) {
    meta = assertValidGenomeMeta({
      ...rawMeta,
      genome,
      compat: {
        ...(rawMeta.compat || {}),
        legacyMarkdownCompatible: true
      }
    });
  } else {
    meta = assertValidGenomeMeta(
      normalizeGenomeMeta({
        genome,
        compat: {
          legacyMarkdownCompatible: true,
          synthesizedFromLegacy: !isGenomeV2(parsedGenome)
        }
      })
    );
  }

  return {
    genome,
    meta,
    paths: {
      markdownPath,
      metaPath
    }
  };
}

async function loadExistingMeta(projectRoot, slug) {
  const metaPath = getGenomeMetaPath(projectRoot, slug);
  const rawMeta = await readMetaFile(metaPath, slug);
  if (!rawMeta) return null;
  try {
    return normalizeGenomeMeta(rawMeta);
  } catch {
    return null;
  }
}

async function writeGenome(projectRoot, genomeInput, metaInput) {
  const normalizedGenome = assertValidGenome(
    normalizeGenome({
      ...genomeInput,
      generated: genomeInput && genomeInput.generated ? genomeInput.generated : new Date().toISOString().slice(0, 10),
      legacyFormat: false,
      hasFrontmatter: true
    })
  );
  const markdownPath = getGenomeMarkdownPath(projectRoot, normalizedGenome.slug);
  const metaPath = getGenomeMetaPath(projectRoot, normalizedGenome.slug);
  const existingMeta = await loadExistingMeta(projectRoot, normalizedGenome.slug);

  const normalizedMeta = assertValidGenomeMeta(
    normalizeGenomeMeta({
      ...(existingMeta || {}),
      ...(metaInput || {}),
      genome: normalizedGenome,
      compat: {
        ...((existingMeta && existingMeta.compat) || {}),
        ...((metaInput && metaInput.compat) || {}),
        legacyMarkdownCompatible: true,
        synthesizedFromLegacy: false
      },
      createdAt:
        (metaInput && metaInput.createdAt) ||
        (existingMeta && existingMeta.createdAt) ||
        `${normalizedGenome.generated}T00:00:00.000Z`,
      updatedAt: new Date().toISOString()
    })
  );

  await ensureDir(getGenomeDir(projectRoot));
  await fs.writeFile(markdownPath, serializeGenomeMarkdown(normalizedGenome), 'utf8');
  await fs.writeFile(metaPath, `${JSON.stringify(normalizedMeta, null, 2)}\n`, 'utf8');

  return {
    genome: normalizedGenome,
    meta: normalizedMeta,
    paths: {
      markdownPath,
      metaPath
    }
  };
}

async function listGenomes(projectRoot) {
  const genomeDir = getGenomeDir(projectRoot);
  try {
    const entries = await fs.readdir(genomeDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.endsWith('.meta.json'))
      .map((entry) => entry.name.slice(0, -3))
      .sort();
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function genomeExists(projectRoot, slug) {
  return exists(getGenomeMarkdownPath(projectRoot, slug));
}

module.exports = {
  getGenomeDir,
  getGenomeMarkdownPath,
  getGenomeMetaPath,
  readGenome,
  writeGenome,
  listGenomes,
  genomeExists
};
