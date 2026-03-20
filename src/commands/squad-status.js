'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { flattenGenomeBindings, mergeGenomeBindings } = require('../genomes/bindings');

const SQUADS_DIR = '.aioson/squads';
const AGENTS_ROOT = 'agents';
const OUTPUT_ROOT = 'output';
const LOGS_ROOT = 'aioson-logs';
const SKIP_FILES = new Set(['memory.md', '.gitkeep']);
const SESSION_HTML_RE = /\.html?$/i;

function extractField(content, ...labels) {
  for (const label of labels) {
    const regex = new RegExp(`^(?:${label}):\\s*(.+)$`, 'im');
    const match = String(content || '').match(regex);
    if (match) return String(match[1]).trim();
  }
  return null;
}

function parseListSection(content, heading) {
  const lines = String(content || '').split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === `${heading}:`);
  if (startIndex === -1) return [];

  const values = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S.+:$/.test(line.trim())) break;
    const match = line.match(/^\s*-\s+(.+?)\s*$/);
    if (match) values.push(match[1].trim());
  }
  return values;
}

function normalizeRel(relPath) {
  return String(relPath || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readDirNames(targetPath) {
  try {
    return await fs.readdir(targetPath);
  } catch {
    return [];
  }
}

async function getLatestHtml(outputDirAbs) {
  const latestAlias = path.join(outputDirAbs, 'latest.html');
  if (await pathExists(latestAlias)) {
    const stat = await fs.stat(latestAlias).catch(() => null);
    return { absPath: latestAlias, mtime: stat?.mtime || null };
  }

  const sessionEntries = await readDirNames(outputDirAbs);
  const candidates = [];

  for (const file of sessionEntries) {
    if (file === 'latest.html') continue;
    if (!SESSION_HTML_RE.test(file)) continue;
    const absPath = path.join(outputDirAbs, file);
    const stat = await fs.stat(absPath).catch(() => null);
    if (!stat?.isFile()) continue;
    candidates.push({ absPath, mtime: stat.mtime });
  }

  const legacySession = path.join(outputDirAbs, 'session.html');
  if (await pathExists(legacySession)) {
    const stat = await fs.stat(legacySession).catch(() => null);
    candidates.push({ absPath: legacySession, mtime: stat?.mtime || null });
  }

  candidates.sort((a, b) => {
    if (!a.mtime) return 1;
    if (!b.mtime) return -1;
    return b.mtime - a.mtime;
  });

  return candidates[0] || null;
}

async function collectDirStats(targetDir, relDir, options = {}) {
  const normalized = normalizeRel(relDir);
  if (!normalized) {
    return { relDir: normalized, absDir: null, exists: false, entries: [] };
  }

  const absDir = path.join(targetDir, normalized);
  const entries = await readDirNames(absDir);
  const files = [];

  for (const entry of entries) {
    if (SKIP_FILES.has(entry)) continue;
    const absPath = path.join(absDir, entry);
    const stat = await fs.stat(absPath).catch(() => null);
    if (!stat) continue;
    const match = typeof options.filter === 'function' ? options.filter(entry, stat) : true;
    if (!match) continue;
    files.push({ name: entry, absPath, stat });
  }

  return {
    relDir: normalized,
    absDir,
    exists: files.length > 0 || (await pathExists(absDir)),
    entries: files
  };
}

async function buildSquadRecordFromMetadata(targetDir, file) {
  const squadsDir = path.join(targetDir, SQUADS_DIR);
  const filePath = path.join(squadsDir, file);
  const content = await fs.readFile(filePath, 'utf8').catch(() => null);
  if (!content) return null;

  const trimmed = content.trim();
  if (!trimmed || trimmed.startsWith('<!--')) return null;

  const slug = file.replace(/\.md$/, '');
  const squadName =
    extractField(content, 'Squad', 'Squad Ativo', 'Squad Activo', 'Squad Actif') || slug;
  const mode = extractField(content, 'Mode', 'Modo') || '—';
  const goal = extractField(content, 'Goal', 'Objetivo', 'Objectif') || '—';
  const agentsDir = normalizeRel(extractField(content, 'Agents', 'AgentsDir') || `${AGENTS_ROOT}/${slug}`);
  const outputDir = normalizeRel(extractField(content, 'Output', 'OutputDir') || `${OUTPUT_ROOT}/${slug}`);
  const logsDir = normalizeRel(
    extractField(content, 'Logs', 'LogsDir') || `${normalizeRel(LOGS_ROOT)}/${slug}`
  );
  const genomes = parseListSection(content, 'Genomes');
  const agentGenomes = parseListSection(content, 'AgentGenomes');
  const latestSession = normalizeRel(
    extractField(content, 'LatestSession', 'Latest Session', 'UltimaSessao', 'DerniereSession')
  );

  const agents = await collectDirStats(targetDir, agentsDir, {
    filter: (entry, stat) => stat.isFile() && entry.endsWith('.md')
  });
  const specialists = agents.entries.filter((entry) => entry.name !== 'orquestrador.md');

  const sessions = await collectDirStats(targetDir, outputDir, {
    filter: (entry, stat) => stat.isFile() && SESSION_HTML_RE.test(entry) && entry !== 'latest.html'
  });
  const logs = await collectDirStats(targetDir, logsDir, {
    filter: (entry, stat) => stat.isFile()
  });
  const outputExists = await pathExists(path.join(targetDir, outputDir));
  const latestHtml = latestSession
    ? {
        absPath: path.join(targetDir, latestSession),
        mtime: (await fs.stat(path.join(targetDir, latestSession)).catch(() => null))?.mtime || null
      }
    : await getLatestHtml(path.join(targetDir, outputDir));

  const metaStat = await fs.stat(filePath).catch(() => null);

  return {
    slug,
    file,
    metadataPath: filePath,
    squadName,
    mode,
    goal,
    agentsDir,
    outputDir,
    logsDir,
    genomes,
    agentGenomes,
    latestSession,
    agentCount: agents.entries.length,
    specialistCount: specialists.length,
    sessionCount: sessions.entries.length,
    logCount: logs.entries.length,
    latestHtml: latestHtml
      ? normalizeRel(path.relative(targetDir, latestHtml.absPath))
      : outputExists && (await pathExists(path.join(targetDir, outputDir, 'session.html')))
        ? normalizeRel(path.join(outputDir, 'session.html'))
        : '—',
    mtime: latestHtml?.mtime || metaStat?.mtime || null
  };
}

async function buildSquadRecordFromPackageDir(targetDir, slug) {
  const packageDir = path.join(targetDir, SQUADS_DIR, slug);
  const manifestPath = path.join(packageDir, 'squad.manifest.json');
  const summaryPath = path.join(packageDir, 'squad.md');
  const manifestRaw = await fs.readFile(manifestPath, 'utf8').catch(() => null);
  if (!manifestRaw) return null;

  let manifest = null;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    manifest = null;
  }
  if (!manifest || typeof manifest !== 'object') return null;

  const summaryContent = await fs.readFile(summaryPath, 'utf8').catch(() => null);
  const rules = manifest.rules && typeof manifest.rules === 'object' ? manifest.rules : {};
  const packageInfo = manifest.package && typeof manifest.package === 'object' ? manifest.package : {};
  const agentsDir = normalizeRel(packageInfo.agentsDir || path.join(SQUADS_DIR, slug, 'agents'));
  const outputDir = normalizeRel(rules.outputsDir || `${OUTPUT_ROOT}/${slug}`);
  const logsDir = normalizeRel(rules.logsDir || `${normalizeRel(LOGS_ROOT)}/${slug}`);
  const latestSession = normalizeRel(
    extractField(summaryContent || '', 'LatestSession', 'Latest Session', 'UltimaSessao', 'DerniereSession') ||
      `${OUTPUT_ROOT}/${slug}/latest.html`
  );
  const genomeBindings = mergeGenomeBindings({
    blueprintBindings: manifest.genomeBindings,
    manifestBindings: manifest.genomeBindings || manifest.genomes,
    legacyExecutors: manifest.executors
  });
  const flattenedBindings = flattenGenomeBindings(genomeBindings);
  const genomes = flattenedBindings
    .filter((item) => item.scope === 'squad')
    .map((item) => item.slug);
  const agentGenomes = flattenedBindings
    .filter((item) => item.scope !== 'squad' && item.agentSlug)
    .map((item) => `${item.agentSlug}: ${item.slug}`);
  const fallbackGenomes = genomes.length > 0 ? genomes : parseListSection(summaryContent || '', 'Genomes');
  const fallbackAgentGenomes =
    agentGenomes.length > 0 ? agentGenomes : parseListSection(summaryContent || '', 'AgentGenomes');

  const agents = await collectDirStats(targetDir, agentsDir, {
    filter: (entry, stat) => stat.isFile() && entry.endsWith('.md')
  });
  const specialists = agents.entries.filter(
    (entry) => entry.name !== 'orquestrador.md' && entry.name !== 'agents.md'
  );

  const sessions = await collectDirStats(targetDir, outputDir, {
    filter: (entry, stat) => stat.isFile() && SESSION_HTML_RE.test(entry) && entry !== 'latest.html'
  });
  const logs = await collectDirStats(targetDir, logsDir, {
    filter: (entry, stat) => stat.isFile()
  });
  const outputExists = await pathExists(path.join(targetDir, outputDir));
  const latestHtml = latestSession
    ? {
        absPath: path.join(targetDir, latestSession),
        mtime: (await fs.stat(path.join(targetDir, latestSession)).catch(() => null))?.mtime || null
      }
    : await getLatestHtml(path.join(targetDir, outputDir));
  const manifestStat = await fs.stat(manifestPath).catch(() => null);

  return {
    slug,
    file: `${slug}/squad.manifest.json`,
    metadataPath: manifestPath,
    squadName: String(manifest.name || slug),
    mode: String(manifest.mode || 'content'),
    goal: String(manifest.goal || '—'),
    agentsDir,
    outputDir,
    logsDir,
    genomes: fallbackGenomes,
    agentGenomes: fallbackAgentGenomes,
    latestSession,
    agentCount: agents.entries.length,
    specialistCount: specialists.length,
    sessionCount: sessions.entries.length,
    logCount: logs.entries.length,
    latestHtml: latestHtml
      ? normalizeRel(path.relative(targetDir, latestHtml.absPath))
      : outputExists && (await pathExists(path.join(targetDir, outputDir, 'session.html')))
        ? normalizeRel(path.join(outputDir, 'session.html'))
        : '—',
    mtime: latestHtml?.mtime || manifestStat?.mtime || null
  };
}

async function buildFallbackSquadRecords(targetDir, metadataSlugs) {
  const agentsRootAbs = path.join(targetDir, AGENTS_ROOT);
  const entries = await readDirNames(agentsRootAbs);
  const squads = [];

  for (const entry of entries) {
    if (metadataSlugs.has(entry)) continue;
    const absDir = path.join(agentsRootAbs, entry);
    const stat = await fs.stat(absDir).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const agents = await collectDirStats(targetDir, path.join(AGENTS_ROOT, entry), {
      filter: (name, itemStat) => itemStat.isFile() && name.endsWith('.md')
    });
    if (agents.entries.length === 0) continue;

    const sessions = await collectDirStats(targetDir, path.join(OUTPUT_ROOT, entry), {
      filter: (name, itemStat) => itemStat.isFile() && SESSION_HTML_RE.test(name) && name !== 'latest.html'
    });
    const logs = await collectDirStats(targetDir, path.join(LOGS_ROOT, entry), {
      filter: (name, itemStat) => itemStat.isFile()
    });
    const latestHtml = await getLatestHtml(path.join(targetDir, OUTPUT_ROOT, entry));

    squads.push({
      slug: entry,
      file: `${entry}.md`,
      metadataPath: path.join(targetDir, SQUADS_DIR, `${entry}.md`),
      squadName: entry,
      mode: '—',
      goal: '—',
      agentsDir: `${AGENTS_ROOT}/${entry}`,
      outputDir: `${OUTPUT_ROOT}/${entry}`,
      logsDir: `${normalizeRel(LOGS_ROOT)}/${entry}`,
      genomes: [],
      agentGenomes: [],
      latestSession: latestHtml ? normalizeRel(path.relative(targetDir, latestHtml.absPath)) : '—',
      agentCount: agents.entries.length,
      specialistCount: agents.entries.filter((item) => item.name !== 'orquestrador.md').length,
      sessionCount: sessions.entries.length,
      logCount: logs.entries.length,
      latestHtml: latestHtml ? normalizeRel(path.relative(targetDir, latestHtml.absPath)) : '—',
      mtime: latestHtml?.mtime || stat.mtime
    });
  }

  return squads;
}

async function runSquadStatus({ args, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const squadsDir = path.join(targetDir, SQUADS_DIR);
  const metadataEntries = await fs.readdir(squadsDir, { withFileTypes: true }).catch(() => []);
  const packageDirs = metadataEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(Boolean);
  const mdFiles = metadataEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((file) => file.endsWith('.md') && !SKIP_FILES.has(file));

  const squads = [];
  for (const slug of packageDirs) {
    const squad = await buildSquadRecordFromPackageDir(targetDir, slug);
    if (squad) squads.push(squad);
  }

  for (const file of mdFiles) {
    if (packageDirs.includes(file.replace(/\.md$/, ''))) continue;
    const squad = await buildSquadRecordFromMetadata(targetDir, file);
    if (squad) squads.push(squad);
  }

  const fallbackSquads = await buildFallbackSquadRecords(
    targetDir,
    new Set(squads.map((item) => item.slug))
  );
  squads.push(...fallbackSquads);

  if (squads.length === 0) {
    logger.log(t('squad_status.no_squad'));
    logger.log(t('squad_status.hint'));
    return { ok: true, active: false, squads: [] };
  }

  squads.sort((a, b) => {
    if (!a.mtime) return 1;
    if (!b.mtime) return -1;
    return b.mtime - a.mtime;
  });

  logger.log(t('squad_status.squads_found', { count: squads.length }));
  logger.log('');

  for (let i = 0; i < squads.length; i++) {
    const squad = squads[i];
    const marker = i === 0 ? ` ${t('squad_status.most_recent')}` : '';
    logger.log(t('squad_status.squad_item', { file: squad.file, marker }));
    logger.log(t('squad_status.name', { value: squad.squadName }));
    logger.log(t('squad_status.mode', { value: squad.mode }));
    logger.log(t('squad_status.goal', { value: squad.goal }));
    logger.log(
      t('squad_status.agents', {
        specialists: squad.specialistCount,
        total: squad.agentCount,
        path: squad.agentsDir
      })
    );
    logger.log(
      t('squad_status.sessions', {
        count: squad.sessionCount,
        path: squad.outputDir
      })
    );
    logger.log(t('squad_status.latest_html', { value: squad.latestHtml }));
    logger.log(
      t('squad_status.logs', {
        count: squad.logCount,
        path: squad.logsDir
      })
    );
    logger.log(
      t('squad_status.genomes', {
        count: squad.genomes.length,
        agent_count: squad.agentGenomes.length
      })
    );
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
