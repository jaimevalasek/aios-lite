'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const CHARS_PER_TOKEN = 4;
const LARGE_SECTION_BULLETS = 20; // warn if a section has more than this many bullet lines

function estimateTokens(content) {
  return Math.ceil(content.length / CHARS_PER_TOKEN);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

async function loadFeatureStatuses(contextDir) {
  const featuresPath = path.join(contextDir, 'features.md');
  try {
    const content = await fs.readFile(featuresPath, 'utf8');
    const done = new Set();
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/[-|]\s*([a-z0-9_-]+)\s*[:|]\s*done/i);
      if (m) done.add(m[1].toLowerCase());
    }
    return done;
  } catch {
    return new Set();
  }
}

function findLargeSections(content, fileName) {
  const sections = [];
  const sectionRe = /^#{2,4}\s+(.+)/gm;
  let match;
  const sectionStarts = [];

  while ((match = sectionRe.exec(content)) !== null) {
    sectionStarts.push({ title: match[1].trim(), start: match.index });
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const { title, start } = sectionStarts[i];
    const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].start : content.length;
    const body = content.slice(start, end);
    const bulletCount = (body.match(/^[-*]\s/gm) || []).length;
    if (bulletCount > LARGE_SECTION_BULLETS) {
      sections.push({
        file: fileName,
        section: title,
        bulletCount,
        sizeBytes: body.length,
        tokens: estimateTokens(body)
      });
    }
  }
  return sections;
}

async function runContextTrim({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const contextDir = path.join(targetDir, '.aioson', 'context');
  const archiveDir = path.join(contextDir, 'archive');
  const dryRun = options['dry-run'] || options.dryRun || false;
  const force = options.force || false;

  let entries;
  try {
    entries = await fs.readdir(contextDir);
  } catch {
    if (!options.json) logger.log('No .aioson/context/ directory found.');
    return { ok: false, reason: 'no_context_dir' };
  }

  const mdFiles = entries.filter((f) => f.endsWith('.md') && f !== 'archive');
  const doneFeatures = await loadFeatureStatuses(contextDir);

  const staleSpecs = [];
  const largeSections = [];

  for (const file of mdFiles) {
    // Identify stale specs
    if (file.startsWith('spec-')) {
      const slug = file.replace(/^spec-/, '').replace(/\.md$/, '');
      if (doneFeatures.has(slug)) {
        const stat = await fs.stat(path.join(contextDir, file)).catch(() => null);
        staleSpecs.push({
          file,
          slug,
          sizeBytes: stat ? stat.size : 0
        });
      }
    }

    // Find large sections in active specs
    if (file.startsWith('spec-') || file === 'spec.md') {
      const content = await fs.readFile(path.join(contextDir, file), 'utf8').catch(() => null);
      if (content) {
        const found = findLargeSections(content, file);
        largeSections.push(...found);
      }
    }
  }

  const totalStaleSaved = staleSpecs.reduce((s, r) => s + r.sizeBytes, 0);

  if (options.json) {
    return {
      ok: true,
      staleSpecs,
      largeSections,
      totalStaleSavedBytes: totalStaleSaved,
      dryRun
    };
  }

  logger.log('Context Trim Analysis');
  logger.log('─'.repeat(50));

  if (staleSpecs.length === 0 && largeSections.length === 0) {
    logger.log('✓ No stale specs or oversized sections found.');
    logger.log('');
    return { ok: true, staleSpecs: [], largeSections: [], totalStaleSavedBytes: 0, dryRun };
  }

  if (staleSpecs.length > 0) {
    logger.log(`Stale specs (feature: done):`);
    for (const s of staleSpecs) {
      logger.log(`  ${s.file.padEnd(30)} — ${s.slug} is done  (${formatBytes(s.sizeBytes)})`);
    }
    if (totalStaleSaved > 0) {
      logger.log(`  → Archiving saves ~${formatBytes(totalStaleSaved)} (~${estimateTokens(totalStaleSaved * CHARS_PER_TOKEN)} tokens) per session`);
    }
    logger.log('');
  }

  if (largeSections.length > 0) {
    logger.log('Large sections in active specs:');
    for (const s of largeSections) {
      logger.log(`  ${s.file} § ${s.section} (${s.bulletCount} entries, ${formatBytes(s.sizeBytes)})`);
      logger.log(`    → Consider trimming to last ${LARGE_SECTION_BULLETS} entries to save ~${formatBytes(s.sizeBytes - Math.floor(s.sizeBytes * LARGE_SECTION_BULLETS / s.bulletCount))}`);
    }
    logger.log('');
  }

  // Archive stale specs
  if (staleSpecs.length > 0) {
    if (force || dryRun) {
      if (!dryRun) {
        await fs.mkdir(archiveDir, { recursive: true });
        for (const s of staleSpecs) {
          const src = path.join(contextDir, s.file);
          const dest = path.join(archiveDir, s.file);
          await fs.rename(src, dest);
          logger.log(`  Archived: ${s.file} → context/archive/${s.file}`);
        }
        logger.log('');
        logger.log(`${staleSpecs.length} spec(s) archived to .aioson/context/archive/`);
      } else {
        logger.log(`[dry-run] Would archive ${staleSpecs.length} stale spec(s) to .aioson/context/archive/`);
      }
    } else {
      logger.log(`Run with --force to archive stale specs, or --dry-run to preview.`);
    }
  }

  return {
    ok: true,
    staleSpecs,
    largeSections,
    totalStaleSavedBytes: totalStaleSaved,
    archived: force && !dryRun ? staleSpecs.length : 0,
    dryRun
  };
}

module.exports = { runContextTrim };
