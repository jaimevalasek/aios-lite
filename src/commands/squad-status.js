'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SQUADS_DIR = '.aios-lite/squads';
const SKIP_FILES = new Set(['memory.md', '.gitkeep']);

function extractField(content, ...labels) {
  for (const label of labels) {
    const regex = new RegExp(`^(?:${label}):\\s*(.+)$`, 'im');
    const match = String(content || '').match(regex);
    if (match) return String(match[1]).trim();
  }
  return null;
}

function countPerspectives(content) {
  const matches = String(content || '').match(/^###\s+.+$/gm);
  return matches ? matches.length : 0;
}

async function runSquadStatus({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const squadsDir = path.join(targetDir, SQUADS_DIR);

  let entries;
  try {
    entries = await fs.readdir(squadsDir);
  } catch {
    logger.log(t('squad_status.no_squad'));
    logger.log(t('squad_status.hint'));
    return { ok: true, active: false, squads: [] };
  }

  const mdFiles = entries.filter(
    (f) => f.endsWith('.md') && !SKIP_FILES.has(f)
  );

  if (mdFiles.length === 0) {
    logger.log(t('squad_status.no_squad'));
    logger.log(t('squad_status.hint'));
    return { ok: true, active: false, squads: [] };
  }

  // Read all squad files and collect metadata
  const squads = [];
  for (const file of mdFiles) {
    const filePath = path.join(squadsDir, file);
    let content;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const trimmed = content.trim();
    if (!trimmed || trimmed.startsWith('<!--')) continue;

    const domain =
      extractField(content, 'Squad', 'Squad Ativo', 'Squad Activo', 'Squad Actif') ||
      file.replace(/\.md$/, '');
    const mode = extractField(content, 'Mode', 'Modo') || '—';
    const goal = extractField(content, 'Goal', 'Objetivo', 'Objectif') || '—';
    const perspectives = countPerspectives(content);

    // Get file mtime for recency
    let mtime = null;
    try {
      const stat = await fs.stat(filePath);
      mtime = stat.mtime;
    } catch { /* ignore */ }

    squads.push({ file, domain, mode, goal, perspectives, path: filePath, mtime });
  }

  if (squads.length === 0) {
    logger.log(t('squad_status.no_squad'));
    logger.log(t('squad_status.hint'));
    return { ok: true, active: false, squads: [] };
  }

  // Sort by mtime descending (most recent first)
  squads.sort((a, b) => {
    if (!a.mtime) return 1;
    if (!b.mtime) return -1;
    return b.mtime - a.mtime;
  });

  logger.log(t('squad_status.squads_found', { count: squads.length }));
  logger.log('');

  for (let i = 0; i < squads.length; i++) {
    const sq = squads[i];
    const marker = i === 0 ? ' (most recent)' : '';
    logger.log(t('squad_status.squad_item', { file: sq.file, marker }));
    logger.log(t('squad_status.domain', { value: sq.domain }));
    logger.log(t('squad_status.mode', { value: sq.mode }));
    logger.log(t('squad_status.perspectives', { count: sq.perspectives }));
    if (i < squads.length - 1) logger.log('');
  }

  return {
    ok: true,
    active: true,
    squads,
    count: squads.length
  };
}

module.exports = { runSquadStatus };
