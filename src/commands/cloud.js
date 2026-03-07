'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { ensureDir, exists, nowStamp, toRelativeSafe } = require('../utils');

function sanitizeSegment(value, fallback) {
  const normalized = String(value || fallback || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return normalized || fallback;
}

function cloudImportsRoot(projectDir) {
  return path.join(projectDir, '.aios-lite', 'cloud-imports');
}

function squadImportFilePath(projectDir, slug, versionNumber) {
  const safeSlug = sanitizeSegment(slug, 'squad');
  const safeVersion = sanitizeSegment(versionNumber, 'latest');
  return path.join(cloudImportsRoot(projectDir), 'squads', safeSlug, `${safeVersion}.json`);
}

function genomeImportFilePath(projectDir, slug, versionNumber) {
  const safeSlug = sanitizeSegment(slug, 'genoma');
  const safeVersion = sanitizeSegment(versionNumber, 'latest');
  return path.join(cloudImportsRoot(projectDir), 'genomes', safeSlug, `${safeVersion}.json`);
}

function historyImportFilePath(projectDir, slug, versionNumber) {
  const safeSlug = sanitizeSegment(slug, 'squad');
  const safeVersion = sanitizeSegment(versionNumber, 'latest');
  return path.join(
    cloudImportsRoot(projectDir),
    'history',
    'squads',
    safeSlug,
    `${safeVersion}--${nowStamp()}.json`
  );
}

function genomeHistoryImportFilePath(projectDir, slug, versionNumber) {
  const safeSlug = sanitizeSegment(slug, 'genoma');
  const safeVersion = sanitizeSegment(versionNumber, 'latest');
  return path.join(
    cloudImportsRoot(projectDir),
    'history',
    'genomes',
    safeSlug,
    `${safeVersion}--${nowStamp()}.json`
  );
}

function installedRoot(projectDir) {
  return path.join(cloudImportsRoot(projectDir), 'installed');
}

function installedManifestPath(projectDir, slug) {
  return path.join(installedRoot(projectDir), 'squads', sanitizeSegment(slug, 'squad'), 'manifest.json');
}

function installedGenomeManifestPath(projectDir, slug) {
  return path.join(installedRoot(projectDir), 'genomes', sanitizeSegment(slug, 'genoma'), 'manifest.json');
}

function localSquadMetadataPath(projectDir, slug) {
  return path.join(projectDir, '.aios-lite', 'squads', `${sanitizeSegment(slug, 'squad')}.md`);
}

function localSquadAgentsDir(projectDir, slug) {
  return path.join(projectDir, 'agents', sanitizeSegment(slug, 'squad'));
}

function localSquadOutputDir(projectDir, slug) {
  return path.join(projectDir, 'output', sanitizeSegment(slug, 'squad'));
}

function localSquadLogsDir(projectDir, slug) {
  return path.join(projectDir, 'aios-logs', sanitizeSegment(slug, 'squad'));
}

function localGenomeFilePath(projectDir, slug) {
  return path.join(projectDir, '.aios-lite', 'genomas', `${sanitizeSegment(slug, 'genoma')}.md`);
}

function findPrimaryHeading(markdown, fallback) {
  const match = String(markdown || '').match(/^#\s+(.+)$/m);
  return match ? String(match[1]).trim() : fallback;
}

function firstParagraph(markdown) {
  const blocks = String(markdown || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    if (block.startsWith('#')) continue;
    return block.replace(/\n+/g, ' ').trim();
  }

  return null;
}

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
  for (let i = startIndex + 1; i < lines.length; i += 1) {
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

function parseAgentGenomeEntry(entry) {
  const text = String(entry || '').trim();
  const index = text.indexOf(':');
  if (index === -1) return null;
  return {
    agentSlug: normalizeAgentSlug(text.slice(0, index).trim()),
    genomePath: text.slice(index + 1).trim()
  };
}

function guessAgentBody(agent) {
  return (
    agent.promptText ||
    agent.prompt ||
    agent.content ||
    agent.markdown ||
    agent.body ||
    agent.fileContent ||
    null
  );
}

function normalizeAgentSlug(value) {
  return sanitizeSegment(String(value || '').replace(/^@/, ''), 'agent');
}

function normalizeAgentsManifest(agentsManifestJson) {
  if (!agentsManifestJson) return [];

  const source =
    Array.isArray(agentsManifestJson)
      ? agentsManifestJson
      : Array.isArray(agentsManifestJson.agents)
        ? agentsManifestJson.agents
        : typeof agentsManifestJson === 'object'
          ? Object.entries(agentsManifestJson).map(([key, value]) => ({
              slug: key,
              ...(value && typeof value === 'object' ? value : { content: value })
            }))
          : [];

  return source
    .map((agent, index) => {
      const slug = normalizeAgentSlug(agent.slug || agent.name || agent.id || `agent-${index + 1}`);
      const title = agent.name || agent.title || agent.roleTitle || slug;
      const description = agent.description || agent.summary || agent.role || null;
      const body = guessAgentBody(agent);
      return {
        slug,
        title: String(title),
        description: description ? String(description) : null,
        body: body ? String(body) : null
      };
    })
    .filter((agent) => Boolean(agent.slug));
}

function buildAgentStub(snapshot, agent) {
  const lines = [
    `# ${agent.title}`,
    '',
    '> Imported from AIOS Lite Cloud.',
    '',
    '## Origin',
    '',
    `- Squad: ${snapshot.squad.name}`,
    `- Slug: ${snapshot.squad.slug}`,
    `- Version: ${snapshot.version.versionNumber}`,
    `- Owner: ${snapshot.squad.ownerUsername}`
  ];

  if (agent.description) {
    lines.push('', '## Role', '', agent.description);
  }

  lines.push(
    '',
    '## Import Notice',
    '',
    'The cloud snapshot did not include a full prompt body for this agent.',
    'Regenerate or enrich this agent locally before using it as a production specialist.'
  );

  return `${lines.join('\n')}\n`;
}

function buildSquadMetadata(snapshot, options = {}) {
  const slug = sanitizeSegment(snapshot.squad.slug, 'squad');
  const installedAt = new Date().toISOString();
  const lines = [
    `Squad: ${snapshot.squad.name}`,
    'Mode: CloudImport',
    `Goal: ${snapshot.squad.goal || snapshot.squad.description || 'Imported from AIOS Lite Cloud'}`,
    `Agents: agents/${slug}/`,
    `Output: output/${slug}/`,
    `Logs: aios-logs/${slug}/`,
    `LatestSession: output/${slug}/latest.html`,
    `SourceUrl: ${options.sourceUrl || '—'}`,
    `SourceVersion: ${snapshot.version.versionNumber}`,
    `ImportedAt: ${installedAt}`,
    '',
    'Genomes:'
  ];

  if (Array.isArray(snapshot.appliedGenomes) && snapshot.appliedGenomes.length > 0) {
    for (const genome of snapshot.appliedGenomes) {
      lines.push(`- .aios-lite/genomas/${sanitizeSegment(genome.genome.slug, 'genoma')}.md`);
    }
  }

  lines.push('', 'AgentGenomes:');
  const scoped = Array.isArray(snapshot.appliedGenomes)
    ? snapshot.appliedGenomes.filter((item) => item.scopeType === 'AGENT' && item.agentSlug)
    : [];

  for (const genome of scoped) {
    lines.push(
      `- ${normalizeAgentSlug(genome.agentSlug)}: .aios-lite/genomas/${sanitizeSegment(genome.genome.slug, 'genoma')}.md`
    );
  }

  return `${lines.join('\n')}\n`;
}

function buildInstalledManifest(snapshot, sourceUrl, agents) {
  return {
    kind: 'aioslite.local-installed-squad',
    installVersion: 1,
    installedAt: new Date().toISOString(),
    sourceUrl,
    squad: snapshot.squad,
    version: {
      versionNumber: snapshot.version.versionNumber,
      compatibilityMin: snapshot.version.compatibilityMin,
      compatibilityMax: snapshot.version.compatibilityMax,
      schemaVersion: snapshot.version.schemaVersion
    },
    agents: agents.map((agent) => ({
      slug: agent.slug,
      title: agent.title,
      hasBody: Boolean(agent.body)
    })),
    appliedGenomes: snapshot.appliedGenomes || []
  };
}

async function materializeImportedSquad(projectDir, payload, sourceUrl, force) {
  const slug = sanitizeSegment(payload.squad.slug, 'squad');
  const agents = normalizeAgentsManifest(payload.version.agentsManifestJson);
  const metadataPath = localSquadMetadataPath(projectDir, slug);
  const agentsDir = localSquadAgentsDir(projectDir, slug);
  const outputDir = localSquadOutputDir(projectDir, slug);
  const logsDir = localSquadLogsDir(projectDir, slug);
  const manifestPath = installedManifestPath(projectDir, slug);

  if (!force && (await exists(metadataPath))) {
    throw new Error(`Imported squad already materialized: ${metadataPath}`);
  }

  await ensureDir(path.dirname(metadataPath));
  await ensureDir(agentsDir);
  await ensureDir(outputDir);
  await ensureDir(logsDir);
  await ensureDir(path.dirname(manifestPath));

  const metadata = buildSquadMetadata(payload, { sourceUrl });
  await fs.writeFile(metadataPath, metadata, 'utf8');
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(buildInstalledManifest(payload, sourceUrl, agents), null, 2)}\n`,
    'utf8'
  );

  const writtenAgents = [];
  for (const agent of agents) {
    const filePath = path.join(agentsDir, `${agent.slug}.md`);
    const body = agent.body || buildAgentStub(payload, agent);
    await fs.writeFile(filePath, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
    writtenAgents.push(filePath);
  }

  const writtenGenomes = [];
  for (const genome of payload.appliedGenomes || []) {
    const genomePath = localGenomeFilePath(projectDir, genome.genome.slug);
    if (!force && (await exists(genomePath))) continue;
    await ensureDir(path.dirname(genomePath));
    const content = genome.version.contentMarkdown
      ? String(genome.version.contentMarkdown)
      : [
          `# ${genome.genome.name}`,
          '',
          '> Imported from AIOS Lite Cloud.',
          '',
          `Version: ${genome.version.versionNumber}`,
          `Scope: ${genome.scopeType}`,
          genome.agentSlug ? `Agent: ${normalizeAgentSlug(genome.agentSlug)}` : null
        ]
          .filter(Boolean)
          .join('\n');
    await fs.writeFile(genomePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
    writtenGenomes.push(genomePath);
  }

  return {
    metadataPath,
    manifestPath,
    agentsDir,
    outputDir,
    logsDir,
    writtenAgents,
    writtenGenomes
  };
}

async function ensureProjectDir(targetDir, t) {
  const absolute = path.resolve(process.cwd(), targetDir || '.');
  const stat = await fs.stat(absolute).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(t('cloud.project_missing', { path: absolute }));
  }
  return absolute;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json'
    }
  });

  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const detail =
      parsed && typeof parsed === 'object' && parsed.error ? String(parsed.error) : `${response.status} ${response.statusText}`;
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON response.');
  }

  return parsed;
}

async function postJson(url, payload, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const detail =
      parsed && typeof parsed === 'object' && parsed.error ? String(parsed.error) : `${response.status} ${response.statusText}`;
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON response.');
  }

  return parsed;
}

function validateSquadSnapshot(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid squad snapshot payload.');
  }

  if (payload.kind !== 'aioslite.squad') {
    throw new Error('Unsupported snapshot kind.');
  }

  if (payload.exportVersion !== 1) {
    throw new Error('Unsupported snapshot export version.');
  }

  if (!payload.squad || typeof payload.squad !== 'object' || !payload.squad.slug) {
    throw new Error('Snapshot is missing squad metadata.');
  }

  if (!payload.version || typeof payload.version !== 'object' || !payload.version.versionNumber) {
    throw new Error('Snapshot is missing version metadata.');
  }

  return {
    slug: String(payload.squad.slug),
    versionNumber: String(payload.version.versionNumber)
  };
}

function validateGenomeSnapshot(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid genome snapshot payload.');
  }

  if (payload.kind !== 'aioslite.genome') {
    throw new Error('Unsupported genome snapshot kind.');
  }

  if (payload.exportVersion !== 1) {
    throw new Error('Unsupported genome snapshot export version.');
  }

  if (!payload.genome || typeof payload.genome !== 'object' || !payload.genome.slug) {
    throw new Error('Snapshot is missing genome metadata.');
  }

  if (!payload.version || typeof payload.version !== 'object' || !payload.version.versionNumber) {
    throw new Error('Snapshot is missing genome version metadata.');
  }

  return {
    slug: String(payload.genome.slug),
    versionNumber: String(payload.version.versionNumber)
  };
}

async function writeImportSnapshot(projectDir, payload, slug, versionNumber, force) {
  const latestPath = squadImportFilePath(projectDir, slug, versionNumber);
  const archivePath = historyImportFilePath(projectDir, slug, versionNumber);

  if (!force && (await exists(latestPath))) {
    throw new Error(`Snapshot already exists: ${latestPath}`);
  }

  await ensureDir(path.dirname(latestPath));
  await ensureDir(path.dirname(archivePath));
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(latestPath, json, 'utf8');
  await fs.writeFile(archivePath, json, 'utf8');

  return {
    latestPath,
    archivePath
  };
}

async function writeGenomeImportSnapshot(projectDir, payload, slug, versionNumber, force) {
  const latestPath = genomeImportFilePath(projectDir, slug, versionNumber);
  const archivePath = genomeHistoryImportFilePath(projectDir, slug, versionNumber);

  if (!force && (await exists(latestPath))) {
    throw new Error(`Snapshot already exists: ${latestPath}`);
  }

  await ensureDir(path.dirname(latestPath));
  await ensureDir(path.dirname(archivePath));
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(latestPath, json, 'utf8');
  await fs.writeFile(archivePath, json, 'utf8');

  return {
    latestPath,
    archivePath
  };
}

function buildInstalledGenomeManifest(snapshot, sourceUrl) {
  return {
    kind: 'aioslite.local-installed-genome',
    installVersion: 1,
    installedAt: new Date().toISOString(),
    sourceUrl,
    genome: snapshot.genome,
    version: {
      versionNumber: snapshot.version.versionNumber,
      schemaVersion: snapshot.version.schemaVersion
    }
  };
}

async function materializeImportedGenome(projectDir, payload, sourceUrl, force) {
  const slug = sanitizeSegment(payload.genome.slug, 'genoma');
  const genomePath = localGenomeFilePath(projectDir, slug);
  const manifestPath = installedGenomeManifestPath(projectDir, slug);

  if (!force && (await exists(genomePath))) {
    throw new Error(`Imported genome already materialized: ${genomePath}`);
  }

  await ensureDir(path.dirname(genomePath));
  await ensureDir(path.dirname(manifestPath));

  const content = payload.version.contentMarkdown
    ? String(payload.version.contentMarkdown)
    : [
        `# ${payload.genome.name}`,
        '',
        '> Imported from AIOS Lite Cloud.',
        '',
        `Version: ${payload.version.versionNumber}`,
        payload.version.summary ? '' : null,
        payload.version.summary || null
      ]
        .filter(Boolean)
        .join('\n');

  await fs.writeFile(genomePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(buildInstalledGenomeManifest(payload, sourceUrl), null, 2)}\n`,
    'utf8'
  );

  return {
    genomePath,
    manifestPath
  };
}

async function runCloudImportSquad({ args, options = {}, logger, t }) {
  const projectDir = await ensureProjectDir(args[0] || '.', t);
  const url = String(options.url || '').trim();
  if (!url) {
    throw new Error(t('cloud.url_required'));
  }

  const dryRun = Boolean(options['dry-run']);
  const force = Boolean(options.force);
  const payload = await fetchJson(url);
  const snapshot = validateSquadSnapshot(payload);

  const planned = {
    ok: true,
    resource: 'squad',
    url,
    dryRun,
    force,
    projectDir,
    slug: snapshot.slug,
    versionNumber: snapshot.versionNumber,
    importDir: path.dirname(squadImportFilePath(projectDir, snapshot.slug, snapshot.versionNumber)),
    latestFile: squadImportFilePath(projectDir, snapshot.slug, snapshot.versionNumber),
    materialized: !Boolean(options['snapshots-only'])
  };

  if (dryRun) {
    logger.log(
      t('cloud.import_squad_dry_run', {
        slug: snapshot.slug,
        version: snapshot.versionNumber
      })
    );
    return planned;
  }

  const written = await writeImportSnapshot(projectDir, payload, snapshot.slug, snapshot.versionNumber, force);
  let materialized = null;
  if (!options['snapshots-only']) {
    materialized = await materializeImportedSquad(projectDir, payload, url, force);
  }
  logger.log(
    t('cloud.import_squad_done', {
      slug: snapshot.slug,
      version: snapshot.versionNumber
    })
  );

  return {
    ...planned,
    latestFile: written.latestPath,
    archiveFile: written.archivePath,
    relativeLatestFile: toRelativeSafe(projectDir, written.latestPath),
    relativeArchiveFile: toRelativeSafe(projectDir, written.archivePath),
    materializedMetadataFile: materialized ? toRelativeSafe(projectDir, materialized.metadataPath) : null,
    materializedManifestFile: materialized ? toRelativeSafe(projectDir, materialized.manifestPath) : null,
    materializedAgentsDir: materialized ? toRelativeSafe(projectDir, materialized.agentsDir) : null,
    materializedOutputDir: materialized ? toRelativeSafe(projectDir, materialized.outputDir) : null,
    materializedLogsDir: materialized ? toRelativeSafe(projectDir, materialized.logsDir) : null,
    writtenAgents: materialized ? materialized.writtenAgents.map((file) => toRelativeSafe(projectDir, file)) : [],
    writtenGenomes: materialized ? materialized.writtenGenomes.map((file) => toRelativeSafe(projectDir, file)) : []
  };
}

async function runCloudImportGenome({ args, options = {}, logger, t }) {
  const projectDir = await ensureProjectDir(args[0] || '.', t);
  const url = String(options.url || '').trim();
  if (!url) {
    throw new Error(t('cloud.url_required'));
  }

  const dryRun = Boolean(options['dry-run']);
  const force = Boolean(options.force);
  const payload = await fetchJson(url);
  const snapshot = validateGenomeSnapshot(payload);

  const planned = {
    ok: true,
    resource: 'genome',
    url,
    dryRun,
    force,
    projectDir,
    slug: snapshot.slug,
    versionNumber: snapshot.versionNumber,
    importDir: path.dirname(genomeImportFilePath(projectDir, snapshot.slug, snapshot.versionNumber)),
    latestFile: genomeImportFilePath(projectDir, snapshot.slug, snapshot.versionNumber),
    materialized: !Boolean(options['snapshots-only'])
  };

  if (dryRun) {
    logger.log(
      t('cloud.import_genome_dry_run', {
        slug: snapshot.slug,
        version: snapshot.versionNumber
      })
    );
    return planned;
  }

  const written = await writeGenomeImportSnapshot(projectDir, payload, snapshot.slug, snapshot.versionNumber, force);
  let materialized = null;
  if (!options['snapshots-only']) {
    materialized = await materializeImportedGenome(projectDir, payload, url, force);
  }

  logger.log(
    t('cloud.import_genome_done', {
      slug: snapshot.slug,
      version: snapshot.versionNumber
    })
  );

  return {
    ...planned,
    latestFile: written.latestPath,
    archiveFile: written.archivePath,
    relativeLatestFile: toRelativeSafe(projectDir, written.latestPath),
    relativeArchiveFile: toRelativeSafe(projectDir, written.archivePath),
    materializedGenomeFile: materialized ? toRelativeSafe(projectDir, materialized.genomePath) : null,
    materializedManifestFile: materialized ? toRelativeSafe(projectDir, materialized.manifestPath) : null
  };
}

async function loadLocalGenomeSnapshot(projectDir, slug, options = {}) {
  const filePath = localGenomeFilePath(projectDir, slug);
  if (!(await exists(filePath))) {
    throw new Error(`Genome file not found: ${filePath}`);
  }

  const markdown = await fs.readFile(filePath, 'utf8');
  const versionNumber = String(options['resource-version'] || '').trim();
  if (!versionNumber) {
    throw new Error('Missing required --resource-version for genome publish.');
  }

  const genomeName = findPrimaryHeading(markdown, slug);
  return {
    kind: 'aioslite.genome',
    exportVersion: 1,
    genome: {
      id: null,
      name: genomeName,
      slug: sanitizeSegment(slug, 'genoma'),
      description: options.description ? String(options.description).trim() : firstParagraph(markdown),
      visibility: String(options.visibility || 'PRIVATE').toUpperCase(),
      status: 'PUBLISHED',
      sourceKind: String(options['source-kind'] || 'LOCAL').toUpperCase(),
      ownerUsername: String(options.owner || 'local')
    },
    version: {
      id: null,
      versionNumber,
      versionCode: 1,
      title: options.title ? String(options.title).trim() : genomeName,
      summary: options.summary ? String(options.summary).trim() : firstParagraph(markdown),
      schemaVersion: options['schema-version'] ? String(options['schema-version']).trim() : '1',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      contentMarkdown: markdown,
      manifestJson: null
    }
  };
}

async function listAgentFiles(agentsDir) {
  const entries = await fs.readdir(agentsDir).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const absPath = path.join(agentsDir, entry);
    const stat = await fs.stat(absPath).catch(() => null);
    if (!stat?.isFile()) continue;
    files.push(absPath);
  }
  files.sort();
  return files;
}

async function buildAppliedGenomesFromMetadata(projectDir, metadataContent, options = {}) {
  const linkedVersion = String(options['linked-genome-version'] || options['resource-version'] || '1.0.0').trim();
  const shared = parseListSection(metadataContent, 'Genomes');
  const scoped = parseListSection(metadataContent, 'AgentGenomes').map(parseAgentGenomeEntry).filter(Boolean);
  const items = [];

  for (const genomeRelPath of shared) {
    const genomeAbsPath = path.join(projectDir, normalizeRel(genomeRelPath));
    const markdown = await fs.readFile(genomeAbsPath, 'utf8').catch(() => null);
    if (!markdown) continue;
    const slug = sanitizeSegment(path.basename(genomeAbsPath, '.md'), 'genoma');
    items.push({
      scopeType: 'SQUAD',
      agentSlug: null,
      priority: 0,
      genome: {
        id: null,
        name: findPrimaryHeading(markdown, slug),
        slug,
        visibility: String(options.visibility || 'PRIVATE').toUpperCase(),
        status: 'PUBLISHED',
        sourceKind: 'LOCAL'
      },
      version: {
        id: null,
        versionNumber: linkedVersion,
        versionCode: 1,
        title: findPrimaryHeading(markdown, slug),
        summary: firstParagraph(markdown),
        schemaVersion: '1',
        contentMarkdown: markdown,
        manifestJson: null,
        createdAt: new Date().toISOString()
      }
    });
  }

  for (const entry of scoped) {
    const genomeAbsPath = path.join(projectDir, normalizeRel(entry.genomePath));
    const markdown = await fs.readFile(genomeAbsPath, 'utf8').catch(() => null);
    if (!markdown) continue;
    const slug = sanitizeSegment(path.basename(genomeAbsPath, '.md'), 'genoma');
    items.push({
      scopeType: 'AGENT',
      agentSlug: entry.agentSlug,
      priority: 0,
      genome: {
        id: null,
        name: findPrimaryHeading(markdown, slug),
        slug,
        visibility: String(options.visibility || 'PRIVATE').toUpperCase(),
        status: 'PUBLISHED',
        sourceKind: 'LOCAL'
      },
      version: {
        id: null,
        versionNumber: linkedVersion,
        versionCode: 1,
        title: findPrimaryHeading(markdown, slug),
        summary: firstParagraph(markdown),
        schemaVersion: '1',
        contentMarkdown: markdown,
        manifestJson: null,
        createdAt: new Date().toISOString()
      }
    });
  }

  return items;
}

async function loadLocalSquadSnapshot(projectDir, slug, options = {}) {
  const metadataPath = localSquadMetadataPath(projectDir, slug);
  if (!(await exists(metadataPath))) {
    throw new Error(`Squad metadata not found: ${metadataPath}`);
  }

  const content = await fs.readFile(metadataPath, 'utf8');
  const versionNumber = String(options['resource-version'] || '').trim();
  if (!versionNumber) {
    throw new Error('Missing required --resource-version for squad publish.');
  }

  const squadName = extractField(content, 'Squad') || slug;
  const goal = extractField(content, 'Goal', 'Objetivo') || firstParagraph(content) || null;
  const agentsDirRel = normalizeRel(extractField(content, 'Agents') || `agents/${slug}`);
  const outputDirRel = normalizeRel(extractField(content, 'Output') || `output/${slug}`);
  const logsDirRel = normalizeRel(extractField(content, 'Logs') || `aios-logs/${slug}`);
  const agentsDirAbs = path.join(projectDir, agentsDirRel);
  const agentFiles = await listAgentFiles(agentsDirAbs);
  const agentsManifestJson = [];

  for (const filePath of agentFiles) {
    const markdown = await fs.readFile(filePath, 'utf8');
    const agentSlug = sanitizeSegment(path.basename(filePath, '.md'), 'agent');
    agentsManifestJson.push({
      slug: agentSlug,
      name: findPrimaryHeading(markdown, agentSlug),
      description: firstParagraph(markdown),
      content: markdown
    });
  }

  return {
    kind: 'aioslite.squad',
    exportVersion: 1,
    squad: {
      id: null,
      name: squadName,
      slug: sanitizeSegment(slug, 'squad'),
      description: extractField(content, 'Description', 'Descricao') || null,
      goal,
      visibility: String(options.visibility || 'PRIVATE').toUpperCase(),
      status: 'PUBLISHED',
      ownerUsername: String(options.owner || 'local'),
      projectName: null
    },
    version: {
      id: null,
      versionNumber,
      versionCode: 1,
      title: options.title ? String(options.title).trim() : squadName,
      summary: options.summary ? String(options.summary).trim() : goal,
      changeLog: options['change-log'] ? String(options['change-log']).trim() : null,
      compatibilityMin: options['compatibility-min'] ? String(options['compatibility-min']).trim() : null,
      compatibilityMax: options['compatibility-max'] ? String(options['compatibility-max']).trim() : null,
      schemaVersion: options['schema-version'] ? String(options['schema-version']).trim() : '1',
      sourceType: 'local_publish',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      manifestJson: {
        metadataPath: normalizeRel(path.relative(projectDir, metadataPath)),
        outputDir: outputDirRel,
        logsDir: logsDirRel
      },
      agentsManifestJson,
      genomesManifestJson: null
    },
    appliedGenomes: await buildAppliedGenomesFromMetadata(projectDir, content, options)
  };
}

function resolvePublishUrl(options, resource) {
  if (options.url) return String(options.url).trim();
  const baseUrl = String(options['base-url'] || '').trim().replace(/\/+$/, '');
  if (!baseUrl) return '';
  return `${baseUrl}/api/publish/${resource}s`;
}

async function runCloudPublishGenome({ args, options = {}, logger, t, dependencies = {} }) {
  const projectDir = await ensureProjectDir(args[0] || '.', t);
  const slug = String(options.slug || '').trim();
  if (!slug) {
    throw new Error('Missing required --slug for genome publish.');
  }
  const url = resolvePublishUrl(options, 'genome');
  if (!url) {
    throw new Error('Provide --url or --base-url for genome publish.');
  }

  const payload = await loadLocalGenomeSnapshot(projectDir, slug, options);
  const dryRun = Boolean(options['dry-run']);
  const planned = {
    ok: true,
    resource: 'genome',
    dryRun,
    url,
    slug: payload.genome.slug,
    versionNumber: payload.version.versionNumber,
    projectDir
  };

  if (dryRun) {
    logger.log(t('cloud.publish_genome_dry_run', { slug: payload.genome.slug, version: payload.version.versionNumber }));
    return planned;
  }

  const response = await postJson(url, payload, dependencies.fetchImpl || fetch);
  logger.log(t('cloud.publish_genome_done', { slug: payload.genome.slug, version: payload.version.versionNumber }));
  return {
    ...planned,
    response
  };
}

async function runCloudPublishSquad({ args, options = {}, logger, t, dependencies = {} }) {
  const projectDir = await ensureProjectDir(args[0] || '.', t);
  const slug = String(options.slug || '').trim();
  if (!slug) {
    throw new Error('Missing required --slug for squad publish.');
  }
  const url = resolvePublishUrl(options, 'squad');
  if (!url) {
    throw new Error('Provide --url or --base-url for squad publish.');
  }

  const payload = await loadLocalSquadSnapshot(projectDir, slug, options);
  const dryRun = Boolean(options['dry-run']);
  const planned = {
    ok: true,
    resource: 'squad',
    dryRun,
    url,
    slug: payload.squad.slug,
    versionNumber: payload.version.versionNumber,
    projectDir,
    agentCount: Array.isArray(payload.version.agentsManifestJson) ? payload.version.agentsManifestJson.length : 0,
    genomeCount: Array.isArray(payload.appliedGenomes) ? payload.appliedGenomes.length : 0
  };

  if (dryRun) {
    logger.log(t('cloud.publish_squad_dry_run', { slug: payload.squad.slug, version: payload.version.versionNumber }));
    return planned;
  }

  const response = await postJson(url, payload, dependencies.fetchImpl || fetch);
  logger.log(t('cloud.publish_squad_done', { slug: payload.squad.slug, version: payload.version.versionNumber }));
  return {
    ...planned,
    response
  };
}

module.exports = {
  runCloudImportSquad,
  runCloudImportGenome,
  runCloudPublishGenome,
  runCloudPublishSquad
};
