'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execSync } = require('node:child_process');

async function runSquadExport({ args = [], options = {}, logger = console } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.squad || args[1];

  if (!slug) {
    logger.error('Usage: aios-lite squad:export [path] --squad=<slug>');
    return { ok: false, error: 'No slug provided' };
  }

  const squadDir = path.join(projectDir, '.aios-lite', 'squads', slug);
  const exportsDir = path.join(projectDir, '.aios-lite', 'squads', 'exports');
  const outputFile = path.join(exportsDir, `${slug}.aios-squad.tar.gz`);

  try {
    await fs.access(squadDir);
  } catch {
    logger.error(`Squad "${slug}" not found at ${squadDir}`);
    return { ok: false, error: `Squad "${slug}" not found` };
  }

  await fs.mkdir(exportsDir, { recursive: true });

  const relPath = path.relative(projectDir, squadDir).replace(/\\/g, '/');

  try {
    execSync(`tar -czf "${outputFile}" -C "${projectDir}" "${relPath}"`, { stdio: 'pipe' });
  } catch (err) {
    logger.error(`Export failed: ${err.message}`);
    return { ok: false, error: err.message };
  }

  const relOutput = path.relative(projectDir, outputFile);
  logger.log('');
  logger.log(`\u2705 Squad "${slug}" exported to: ${relOutput}`);
  logger.log('');

  return { ok: true, slug, outputFile: relOutput };
}

module.exports = { runSquadExport };
