'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { ensureDir, exists, nowStamp, toRelativeSafe } = require('../utils');
const { openRuntimeDb, upsertSquadManifest } = require('../runtime-store');
const {
  attachBindingsToExecutors,
  flattenGenomeBindings,
  mergeGenomeBindings,
  normalizeBinding,
  normalizeGenomeBindings,
  resolveExecutorGenomes
} = require('../genomes/bindings');

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
  return path.join(projectDir, '.aioson', 'cloud-imports');
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

function localSquadPackageDir(projectDir, slug) {
  return path.join(projectDir, '.aioson', 'squads', sanitizeSegment(slug, 'squad'));
}

function localSquadSummaryPath(projectDir, slug) {
  return path.join(localSquadPackageDir(projectDir, slug), 'squad.md');
}

function localLegacySquadMetadataPath(projectDir, slug) {
  return path.join(projectDir, '.aioson', 'squads', `${sanitizeSegment(slug, 'squad')}.md`);
}

function localSquadAgentsDir(projectDir, slug) {
  return path.join(localSquadPackageDir(projectDir, slug), 'agents');
}

function localSquadSkillsDir(projectDir, slug) {
  return path.join(localSquadPackageDir(projectDir, slug), 'skills');
}

function localSquadTemplatesDir(projectDir, slug) {
  return path.join(localSquadPackageDir(projectDir, slug), 'templates');
}

function localSquadDocsDir(projectDir, slug) {
  return path.join(localSquadPackageDir(projectDir, slug), 'docs');
}

function localLegacySquadAgentsDir(projectDir, slug) {
  return path.join(projectDir, 'agents', sanitizeSegment(slug, 'squad'));
}

function localSquadOutputDir(projectDir, slug) {
  return path.join(projectDir, 'output', sanitizeSegment(slug, 'squad'));
}

function localSquadLogsDir(projectDir, slug) {
  return path.join(projectDir, 'aios-logs', sanitizeSegment(slug, 'squad'));
}

function localSquadMediaDir(projectDir, slug) {
  return path.join(projectDir, 'media', sanitizeSegment(slug, 'squad'));
}

function localSquadTextManifestPath(projectDir, slug) {
  return path.join(localSquadAgentsDir(projectDir, slug), 'agents.md');
}

function localSquadJsonManifestPath(projectDir, slug) {
  return path.join(localSquadPackageDir(projectDir, slug), 'squad.manifest.json');
}

function localSquadDesignDocPath(projectDir, slug) {
  return path.join(localSquadDocsDir(projectDir, slug), 'design-doc.md');
}

function localSquadReadinessPath(projectDir, slug) {
  return path.join(localSquadDocsDir(projectDir, slug), 'readiness.md');
}

function localSquadRulesDocPath(projectDir, slug) {
  return path.join(localSquadDocsDir(projectDir, slug), 'squad-rules.md');
}

function localSquadOutputContractsPath(projectDir, slug) {
  return path.join(localSquadDocsDir(projectDir, slug), 'output-contracts.md');
}

function localLegacySquadTextManifestPath(projectDir, slug) {
  return path.join(localLegacySquadAgentsDir(projectDir, slug), 'agents.md');
}

function localLegacySquadJsonManifestPath(projectDir, slug) {
  return path.join(localLegacySquadAgentsDir(projectDir, slug), 'squad.manifest.json');
}

function localLegacySquadDesignDocPath(projectDir, slug) {
  return path.join(localLegacySquadAgentsDir(projectDir, slug), 'design-doc.md');
}

function localLegacySquadReadinessPath(projectDir, slug) {
  return path.join(localLegacySquadAgentsDir(projectDir, slug), 'readiness.md');
}

function localGenomeFilePath(projectDir, slug) {
  return path.join(projectDir, '.aioson', 'genomas', `${sanitizeSegment(slug, 'genoma')}.md`);
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

async function loadLocalSquadManifest(projectDir, slug) {
  const preferredPath = localSquadJsonManifestPath(projectDir, slug);
  const manifestPath = (await exists(preferredPath))
    ? preferredPath
    : localLegacySquadJsonManifestPath(projectDir, slug);
  if (!(await exists(manifestPath))) {
    return null;
  }

  const raw = await fs.readFile(manifestPath, 'utf8').catch(() => null);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function deriveFallbackSkills(snapshot) {
  const domain = String(snapshot?.squad?.name || snapshot?.squad?.slug || 'squad');
  return [
    {
      slug: 'structured-domain-output',
      title: 'Structured domain output',
      description: `Produce structured outputs for ${domain}.`
    },
    {
      slug: 'critical-synthesis',
      title: 'Critical synthesis',
      description: 'Consolidate specialist reasoning into a practical next step.'
    }
  ];
}

function deriveFallbackMcps(snapshot) {
  const items = [{ slug: 'filesystem', required: true, purpose: 'Persist local drafts, manifests, outputs, logs, and media.' }];
  if ((snapshot?.squad?.visibility || '').toUpperCase() === 'FREE') {
    items.push({ slug: 'web-search', required: false, purpose: 'Optional external research when the task requires current references.' });
  }
  return items;
}

function normalizeContentBlueprints(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;

      const slug = sanitizeSegment(item.slug || `blueprint-${index + 1}`, `blueprint-${index + 1}`);
      const contentType = String(item.contentType || 'content').trim() || 'content';
      const layoutType = String(item.layoutType || 'document').trim() || 'document';
      const description = item.description ? String(item.description).trim() : null;
      const sections = Array.isArray(item.sections)
        ? item.sections
            .map((section, sectionIndex) => {
              if (!section || typeof section !== 'object') return null;

              const key = sanitizeSegment(section.key || `section-${sectionIndex + 1}`, `section-${sectionIndex + 1}`);
              const label = String(section.label || section.key || key).trim();
              const blockTypes = Array.isArray(section.blockTypes)
                ? section.blockTypes.map((blockType) => String(blockType).trim()).filter(Boolean)
                : [];

              if (!key || !label) return null;
              return { key, label, blockTypes };
            })
            .filter(Boolean)
        : [];

      return { slug, contentType, layoutType, description, sections };
    })
    .filter(Boolean);
}

function buildBindingsFromAppliedGenomes(appliedGenomes = []) {
  const draft = {
    squad: [],
    executors: {}
  };

  for (const item of appliedGenomes) {
    const binding = normalizeBinding({
      slug: item?.genome?.slug,
      type: item?.genome?.type || item?.version?.manifestJson?.type,
      source: item?.genome?.sourceKind ? String(item.genome.sourceKind).toLowerCase() : 'cloud',
      priority: item?.priority,
      version: item?.version?.versionNumber,
      evidenceMode:
        item?.version?.manifestJson?.evidenceMode ||
        item?.version?.manifestJson?.evidence_mode ||
        item?.genome?.evidenceMode
    });
    if (!binding) continue;

    if (String(item?.scopeType || 'SQUAD').toUpperCase() === 'SQUAD') {
      draft.squad.push(binding);
      continue;
    }

    const executorSlug = normalizeAgentSlug(item?.agentSlug);
    if (!executorSlug) continue;
    draft.executors[executorSlug] = draft.executors[executorSlug] || [];
    draft.executors[executorSlug].push(binding);
  }

  return normalizeGenomeBindings(draft);
}

function buildLocalSquadManifest(snapshot, agents) {
  const source = snapshot?.version?.manifestJson && typeof snapshot.version.manifestJson === 'object'
    ? snapshot.version.manifestJson
    : {};
  const slug = sanitizeSegment(snapshot.squad.slug, 'squad');
  const explicitMode = typeof source.mode === 'string' ? source.mode : null;
  const mode = String(explicitMode || (source.storagePolicy?.primary === 'files' ? 'builder' : 'content')).trim();
  const sourceContext = source.context && typeof source.context === 'object' ? source.context : {};
  const packageRoot = `.aioson/squads/${slug}`;
  const sourceBindings = mergeGenomeBindings({
    blueprintBindings: source.genomeBindings,
    manifestBindings: source.genomeBindings || source.genomes,
    legacyExecutors: source.executors
  });
  const importedBindings = buildBindingsFromAppliedGenomes(snapshot.appliedGenomes || []);
  const genomeBindings = mergeGenomeBindings({
    blueprintBindings: sourceBindings,
    manifestBindings: importedBindings
  });
  const executorSource = Array.isArray(source.executors) && source.executors.length > 0
    ? source.executors
    : agents.map((agent) => ({
        slug: agent.slug,
        title: agent.title,
        role: agent.description || (agent.slug === 'orquestrador' ? 'Coordinates the squad and publishes the final HTML.' : null),
        file: `${packageRoot}/agents/${agent.slug}.md`,
        skills: agent.slug === 'orquestrador' ? [] : ['structured-domain-output'],
        genomes: resolveExecutorGenomes(agent.slug, genomeBindings)
      }));
  const executors = attachBindingsToExecutors(executorSource, genomeBindings);

  return {
    schemaVersion: String(source.schemaVersion || snapshot?.version?.schemaVersion || '1.0.0'),
    packageVersion: String(source.packageVersion || snapshot?.version?.versionNumber || '1.0.0'),
    slug,
    name: String(source.name || snapshot.squad.name),
    mode,
    mission: String(source.mission || snapshot.squad.description || `Operate the ${snapshot.squad.name} squad.`),
    goal: String(source.goal || snapshot.squad.goal || snapshot.squad.description || 'Imported from AIOSON Cloud'),
    visibility: String(source.visibility || String(snapshot.squad.visibility || 'PRIVATE').toLowerCase()),
    aiosLiteCompatibility: String(
      source.aiosLiteCompatibility ||
        snapshot?.version?.compatibilityMin ||
        '^1.1.0'
    ),
    rules: {
      outputsDir: `output/${slug}`,
      logsDir: `aios-logs/${slug}`,
      mediaDir: `media/${slug}`,
      reviewPolicy: Array.isArray(source?.rules?.reviewPolicy)
        ? source.rules.reviewPolicy
        : ['clarity', 'density', 'consistency', 'next-step']
    },
    storagePolicy:
      source.storagePolicy && typeof source.storagePolicy === 'object'
        ? source.storagePolicy
        : {
            primary: mode === 'builder' ? 'files' : 'sqlite',
            artifacts: mode === 'builder' ? 'files+sqlite' : 'sqlite-json',
            exports: { html: true, markdown: true, json: true }
          },
    package: {
      rootDir: packageRoot,
      agentsDir: `${packageRoot}/agents`,
      skillsDir: `${packageRoot}/skills`,
      templatesDir: `${packageRoot}/templates`,
      docsDir: `${packageRoot}/docs`
    },
    baseRoles: Array.isArray(source.baseRoles) && source.baseRoles.length > 0
      ? source.baseRoles
      : ['orchestrator', 'discovery-lead', 'design-doc-lead', 'planner', 'implementer', 'reviewer', 'docs-maintainer'],
    skills: Array.isArray(source.skills) && source.skills.length > 0 ? source.skills : deriveFallbackSkills(snapshot),
    mcps: Array.isArray(source.mcps) && source.mcps.length > 0 ? source.mcps : deriveFallbackMcps(snapshot),
    subagents: source.subagents && typeof source.subagents === 'object'
      ? source.subagents
      : {
          allowed: true,
          when: ['broad research', 'comparison', 'large-context summarization', 'parallel analysis']
        },
    contentBlueprints: normalizeContentBlueprints(source.contentBlueprints),
    context: {
      mode: String(
        sourceContext.mode ||
          (snapshot?.version?.designDocMarkdown && /feature mode|modo feature/i.test(snapshot.version.designDocMarkdown)
            ? 'feature'
            : 'project')
      ),
      summary: String(
        sourceContext.summary ||
          source.goal ||
          snapshot.squad.goal ||
          snapshot.squad.description ||
          'Imported squad context.'
      ),
      designDocPath: `${packageRoot}/docs/design-doc.md`,
      readinessPath: `${packageRoot}/docs/readiness.md`,
      docsPackage: Array.isArray(sourceContext.docsPackage)
        ? sourceContext.docsPackage
        : ['project.context.md', 'design-doc.md', 'readiness.md'],
      readiness: sourceContext.readiness && typeof sourceContext.readiness === 'object'
        ? sourceContext.readiness
        : null
    },
    executors,
    genomes: genomeBindings,
    genomeBindings
  };
}

function buildSquadTextManifest(snapshot, manifest) {
  const lines = [
    `# Squad ${manifest.name}`,
    '',
    '## Mission',
    manifest.mission,
    '',
    '## Does',
    `- Deliver outputs for the domain: ${snapshot.squad.name}`,
    `- Target goal: ${manifest.goal}`,
    '- Coordinate specialists through the local orchestrator',
    '',
    '## Does not do',
    '- Replace the AIOSON official agents',
    '- Use subagents as a substitute for permanent executors or skills',
    '',
    '## Permanent executors'
  ];

  for (const executor of manifest.executors || []) {
    lines.push(`- @${executor.slug} — ${executor.role || executor.title || 'Specialist executor'}`);
  }

  lines.push('', '## Squad skills');
  for (const skill of manifest.skills || []) {
    lines.push(`- ${skill.slug} — ${skill.description || skill.title || 'Reusable capability'}`);
  }

  lines.push('', '## Squad MCPs');
  for (const mcp of manifest.mcps || []) {
    lines.push(`- ${mcp.slug} — ${mcp.purpose || 'External integration'}`);
  }

  lines.push(
    '',
    '## Subagent policy',
    '- Use subagents only for isolated investigation, broad reading, comparison, or parallel work.',
    '- Do not use subagents as a substitute for permanent executors or reusable skills.',
    '',
    '## Outputs and review',
    `- Drafts: \`output/${manifest.slug}/\``,
    `- Final HTML: \`output/${manifest.slug}/{session-id}.html\``,
    `- Logs: \`aios-logs/${manifest.slug}/\``,
    `- Media: \`media/${manifest.slug}/\``,
    `- Package root: \`.aioson/squads/${manifest.slug}/\``,
    `- Design doc: \`.aioson/squads/${manifest.slug}/docs/design-doc.md\``,
    `- Readiness: \`.aioson/squads/${manifest.slug}/docs/readiness.md\``,
    '- Final outputs should include recommendation, reasoning, tradeoff, and next step.'
  );

  return `${lines.join('\n')}\n`;
}

function buildAgentStub(snapshot, agent) {
  const lines = [
    `# ${agent.title}`,
    '',
    '> Imported from AIOSON Cloud.',
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
  const packageRoot = `.aioson/squads/${slug}`;
  const lines = [
    `Squad: ${snapshot.squad.name}`,
    `Mode: ${snapshot?.version?.manifestJson?.mode || 'CloudImport'}`,
    `Goal: ${snapshot.squad.goal || snapshot.squad.description || 'Imported from AIOSON Cloud'}`,
    `Package: ${packageRoot}/`,
    `Agents: ${packageRoot}/agents/`,
    `Skills: ${packageRoot}/skills/`,
    `Templates: ${packageRoot}/templates/`,
    `Docs: ${packageRoot}/docs/`,
    `Output: output/${slug}/`,
    `Logs: aios-logs/${slug}/`,
    `Media: media/${slug}/`,
    `DesignDoc: ${packageRoot}/docs/design-doc.md`,
    `Readiness: ${packageRoot}/docs/readiness.md`,
    `LatestSession: output/${slug}/latest.html`,
    `SourceUrl: ${options.sourceUrl || '—'}`,
    `SourceVersion: ${snapshot.version.versionNumber}`,
    `ImportedAt: ${installedAt}`,
    '',
    'Genomes:'
  ];

  const shared = Array.isArray(snapshot.appliedGenomes)
    ? snapshot.appliedGenomes.filter((item) => String(item.scopeType || 'SQUAD').toUpperCase() === 'SQUAD')
    : [];
  for (const genome of shared) {
    lines.push(`- .aioson/genomas/${sanitizeSegment(genome.genome.slug, 'genoma')}.md`);
  }

  lines.push('', 'AgentGenomes:');
  const scoped = Array.isArray(snapshot.appliedGenomes)
    ? snapshot.appliedGenomes.filter(
        (item) => String(item.scopeType || 'SQUAD').toUpperCase() !== 'SQUAD' && item.agentSlug
      )
    : [];

  for (const genome of scoped) {
    lines.push(
      `- ${normalizeAgentSlug(genome.agentSlug)}: .aioson/genomas/${sanitizeSegment(genome.genome.slug, 'genoma')}.md`
    );
  }

  return `${lines.join('\n')}\n`;
}

function buildInstalledManifest(snapshot, sourceUrl, agents) {
  return {
    kind: 'aiosforge.local-installed-squad',
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
    packageRoot: `.aioson/squads/${sanitizeSegment(snapshot.squad.slug, 'squad')}`,
    agents: agents.map((agent) => ({
      slug: agent.slug,
      title: agent.title,
      hasBody: Boolean(agent.body)
    })),
    appliedGenomes: snapshot.appliedGenomes || []
  };
}

function buildSquadDesignDoc(snapshot, manifest) {
  if (snapshot?.version?.designDocMarkdown) {
    const content = String(snapshot.version.designDocMarkdown);
    return content.endsWith('\n') ? content : `${content}\n`;
  }

  return [
    `# Design Doc - ${manifest.name}`,
    '',
    '## Context and motivation',
    snapshot.squad.description || manifest.goal || 'Imported squad context.',
    '',
    '## Objective',
    manifest.goal || 'Operate the imported squad for the target domain.',
    '',
    '## Scope',
    '- Materialize the squad locally with manifest, executors, outputs, logs, and media.',
    '- Preserve the operational and cognitive blueprint published in the cloud.',
    '',
    '## Out of scope',
    '- Rewriting imported executors automatically beyond the published snapshot.',
    '- Inventing undocumented MCPs or genomes.'
  ].join('\n') + '\n';
}

function buildSquadReadiness(snapshot, manifest) {
  if (snapshot?.version?.readinessMarkdown) {
    const content = String(snapshot.version.readinessMarkdown);
    return content.endsWith('\n') ? content : `${content}\n`;
  }

  const readiness = manifest?.context?.readiness && typeof manifest.context.readiness === 'object'
    ? manifest.context.readiness
    : {
        level: 'medium',
        totalScore: 15,
        maxScore: 25
      };

  return [
    `# Readiness - ${manifest.name}`,
    '',
    `- Readiness score total: ${readiness.totalScore ?? 15}`,
    `- Readiness score maximo: ${readiness.maxScore ?? 25}`,
    `- Readiness level: ${readiness.level || 'medium'}`,
    '',
    '## What is already clear',
    '- The squad structure and executors are defined in the imported snapshot.',
    '- Outputs, logs, media, and genomes can be materialized locally.',
    '',
    '## What is still missing',
    '- Local project-specific refinements after import.',
    '- Any additional feature context not present in the published snapshot.'
  ].join('\n') + '\n';
}

function buildSkillMarkdown(skill) {
  const title = String(skill?.title || skill?.slug || 'Skill').trim();
  const description = skill?.description ? String(skill.description).trim() : 'Reusable squad capability.';
  return [`# ${title}`, '', description, ''].join('\n');
}

function buildTemplateJson(type, slug, manifest) {
  if (type === 'discovery') {
    return {
      squad: manifest.slug,
      mode: manifest.mode,
      summary: '',
      goals: [],
      constraints: [],
      references: []
    };
  }

  if (type === 'design-doc') {
    return {
      squad: manifest.slug,
      mode: manifest.mode,
      problem: '',
      scope: [],
      outOfScope: [],
      deliverables: []
    };
  }

  return {
    squad: manifest.slug,
    blueprint: slug,
    contentType: 'content',
    layoutType: 'document',
    title: '',
    blocks: []
  };
}

function buildRulesDoc(manifest) {
  return [
    `# Squad Rules - ${manifest.name}`,
    '',
    '## Mission',
    manifest.mission,
    '',
    '## Operating mode',
    `- Mode: ${manifest.mode}`,
    '- Keep agents light and load skills on demand.',
    '- Use discovery and design doc before implementation or heavy generation.',
    '',
    '## Persistence',
    `- Primary: ${manifest.storagePolicy?.primary || 'sqlite'}`,
    `- Artifacts: ${manifest.storagePolicy?.artifacts || 'sqlite-json'}`,
    ''
  ].join('\n');
}

function buildOutputContractsDoc(manifest) {
  const blueprints = Array.isArray(manifest.contentBlueprints) ? manifest.contentBlueprints : [];
  const lines = [
    `# Output Contracts - ${manifest.name}`,
    '',
    '## Persistence rule',
    `- Mode: ${manifest.mode}`,
    `- Primary storage: ${manifest.storagePolicy?.primary || 'sqlite'}`,
    '',
    '## Blueprints'
  ];

  if (blueprints.length === 0) {
    lines.push('- No explicit content blueprints were declared.');
  } else {
    for (const blueprint of blueprints) {
      lines.push(`- ${blueprint.slug} (${blueprint.contentType} / ${blueprint.layoutType})`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function materializeImportedSquad(projectDir, payload, sourceUrl, force) {
  const slug = sanitizeSegment(payload.squad.slug, 'squad');
  const agents = normalizeAgentsManifest(payload.version.agentsManifestJson);
  const squadManifest = buildLocalSquadManifest(payload, agents);
  const packageDir = localSquadPackageDir(projectDir, slug);
  const metadataPath = localSquadSummaryPath(projectDir, slug);
  const agentsDir = localSquadAgentsDir(projectDir, slug);
  const skillsDir = localSquadSkillsDir(projectDir, slug);
  const templatesDir = localSquadTemplatesDir(projectDir, slug);
  const docsDir = localSquadDocsDir(projectDir, slug);
  const textManifestPath = localSquadTextManifestPath(projectDir, slug);
  const jsonManifestPath = localSquadJsonManifestPath(projectDir, slug);
  const outputDir = localSquadOutputDir(projectDir, slug);
  const logsDir = localSquadLogsDir(projectDir, slug);
  const mediaDir = localSquadMediaDir(projectDir, slug);
  const designDocPath = localSquadDesignDocPath(projectDir, slug);
  const readinessPath = localSquadReadinessPath(projectDir, slug);
  const rulesDocPath = localSquadRulesDocPath(projectDir, slug);
  const outputContractsPath = localSquadOutputContractsPath(projectDir, slug);
  const manifestPath = installedManifestPath(projectDir, slug);

  if (!force && (await exists(metadataPath))) {
    throw new Error(`Imported squad already materialized: ${metadataPath}`);
  }

  await ensureDir(packageDir);
  await ensureDir(agentsDir);
  await ensureDir(skillsDir);
  await ensureDir(templatesDir);
  await ensureDir(docsDir);
  await ensureDir(outputDir);
  await ensureDir(logsDir);
  await ensureDir(mediaDir);
  await ensureDir(path.dirname(manifestPath));

  const metadata = buildSquadMetadata(payload, { sourceUrl });
  await fs.writeFile(metadataPath, metadata, 'utf8');
  await fs.writeFile(textManifestPath, buildSquadTextManifest(payload, squadManifest), 'utf8');
  await fs.writeFile(jsonManifestPath, `${JSON.stringify(squadManifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(designDocPath, buildSquadDesignDoc(payload, squadManifest), 'utf8');
  await fs.writeFile(readinessPath, buildSquadReadiness(payload, squadManifest), 'utf8');
  await fs.writeFile(rulesDocPath, buildRulesDoc(squadManifest), 'utf8');
  await fs.writeFile(outputContractsPath, buildOutputContractsDoc(squadManifest), 'utf8');
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

  const writtenSkills = [];
  for (const skill of squadManifest.skills || []) {
    const filePath = path.join(skillsDir, `${sanitizeSegment(skill.slug, 'skill')}.md`);
    await fs.writeFile(filePath, buildSkillMarkdown(skill), 'utf8');
    writtenSkills.push(filePath);
  }

  const templateEntries = [
    { slug: 'discovery', filePath: path.join(templatesDir, 'discovery.template.json') },
    { slug: 'design-doc', filePath: path.join(templatesDir, 'design-doc.template.json') },
    { slug: 'artifact', filePath: path.join(templatesDir, 'artifact.template.json') }
  ];
  const writtenTemplates = [];
  for (const template of templateEntries) {
    await fs.writeFile(
      template.filePath,
      `${JSON.stringify(buildTemplateJson(template.slug, template.slug, squadManifest), null, 2)}\n`,
      'utf8'
    );
    writtenTemplates.push(template.filePath);
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
          '> Imported from AIOSON Cloud.',
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

  const runtimeHandle = await openRuntimeDb(projectDir);
  try {
    upsertSquadManifest(runtimeHandle.db, {
      slug,
      name: squadManifest.name,
      mode: squadManifest.mode,
      mission: squadManifest.mission,
      goal: squadManifest.goal,
      visibility: squadManifest.visibility,
      status: 'active',
      manifest: squadManifest,
      context: squadManifest.context,
      packageDir: `.aioson/squads/${slug}`,
      agentsDir: `.aioson/squads/${slug}/agents`,
      outputDir: `output/${slug}`,
      logsDir: `aios-logs/${slug}`,
      mediaDir: `media/${slug}`,
      latestSessionPath: `output/${slug}/latest.html`
    });
  } finally {
    runtimeHandle.db.close();
  }

  return {
    metadataPath,
    textManifestPath,
    jsonManifestPath,
    designDocPath,
    readinessPath,
    rulesDocPath,
    outputContractsPath,
    manifestPath,
    packageDir,
    agentsDir,
    skillsDir,
    templatesDir,
    docsDir,
    outputDir,
    logsDir,
    mediaDir,
    writtenAgents,
    writtenSkills,
    writtenTemplates,
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

  if (payload.kind !== 'aiosforge.squad') {
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

  if (payload.kind !== 'aiosforge.genome') {
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
    kind: 'aiosforge.local-installed-genome',
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
        '> Imported from AIOSON Cloud.',
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
    materializedPackageDir: materialized ? toRelativeSafe(projectDir, materialized.packageDir) : null,
    materializedManifestFile: materialized ? toRelativeSafe(projectDir, materialized.manifestPath) : null,
    materializedAgentsDir: materialized ? toRelativeSafe(projectDir, materialized.agentsDir) : null,
    materializedSkillsDir: materialized ? toRelativeSafe(projectDir, materialized.skillsDir) : null,
    materializedTemplatesDir: materialized ? toRelativeSafe(projectDir, materialized.templatesDir) : null,
    materializedDocsDir: materialized ? toRelativeSafe(projectDir, materialized.docsDir) : null,
    materializedOutputDir: materialized ? toRelativeSafe(projectDir, materialized.outputDir) : null,
    materializedLogsDir: materialized ? toRelativeSafe(projectDir, materialized.logsDir) : null,
    materializedDesignDocFile: materialized ? toRelativeSafe(projectDir, materialized.designDocPath) : null,
    materializedReadinessFile: materialized ? toRelativeSafe(projectDir, materialized.readinessPath) : null,
    writtenAgents: materialized ? materialized.writtenAgents.map((file) => toRelativeSafe(projectDir, file)) : [],
    writtenSkills: materialized ? materialized.writtenSkills.map((file) => toRelativeSafe(projectDir, file)) : [],
    writtenTemplates: materialized ? materialized.writtenTemplates.map((file) => toRelativeSafe(projectDir, file)) : [],
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
    kind: 'aiosforge.genome',
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
  const structured = await buildAppliedGenomesFromBindings(
    projectDir,
    options.genomeBindings || options.manifestBindings || options.manifest?.genomes,
    options
  );
  if (structured.length > 0) {
    return structured;
  }

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

async function buildAppliedGenomesFromBindings(projectDir, genomeBindings, options = {}) {
  const linkedVersion = String(options['linked-genome-version'] || options['resource-version'] || '1.0.0').trim();
  const flattened = flattenGenomeBindings(genomeBindings);
  const items = [];

  for (const binding of flattened) {
    const genomeAbsPath = path.join(projectDir, '.aioson', 'genomas', `${binding.slug}.md`);
    const markdown = await fs.readFile(genomeAbsPath, 'utf8').catch(() => null);
    if (!markdown) continue;

    items.push({
      scopeType: binding.scope === 'squad' ? 'SQUAD' : 'AGENT',
      agentSlug: binding.agentSlug || null,
      priority: Number.isFinite(binding.priority) ? binding.priority : 0,
      genome: {
        id: null,
        name: findPrimaryHeading(markdown, binding.slug),
        slug: binding.slug,
        type: binding.type || null,
        visibility: String(options.visibility || 'PRIVATE').toUpperCase(),
        status: 'PUBLISHED',
        sourceKind: String(binding.source || 'LOCAL').toUpperCase()
      },
      version: {
        id: null,
        versionNumber: binding.version || linkedVersion,
        versionCode: 1,
        title: findPrimaryHeading(markdown, binding.slug),
        summary: firstParagraph(markdown),
        schemaVersion: '1',
        contentMarkdown: markdown,
        manifestJson: {
          type: binding.type,
          evidenceMode: binding.evidenceMode
        },
        createdAt: new Date().toISOString()
      }
    });
  }

  return items;
}

async function loadLocalSquadSnapshot(projectDir, slug, options = {}) {
  const packageSummaryPath = localSquadSummaryPath(projectDir, slug);
  const metadataPath = (await exists(packageSummaryPath))
    ? packageSummaryPath
    : localLegacySquadMetadataPath(projectDir, slug);
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
  const packageRootRel = `.aioson/squads/${slug}`;
  const agentsDirRel = normalizeRel(extractField(content, 'Agents') || `${packageRootRel}/agents`);
  const outputDirRel = normalizeRel(extractField(content, 'Output') || `output/${slug}`);
  const logsDirRel = normalizeRel(extractField(content, 'Logs') || `aios-logs/${slug}`);
  const mediaDirRel = normalizeRel(extractField(content, 'Media') || `media/${slug}`);
  const agentsDirAbs = path.join(projectDir, agentsDirRel);
  const localManifest = (await loadLocalSquadManifest(projectDir, slug)) || {};
  const packageDirRel = normalizeRel(localManifest?.package?.rootDir || packageRootRel);
  const textManifestPath = (await exists(localSquadTextManifestPath(projectDir, slug)))
    ? localSquadTextManifestPath(projectDir, slug)
    : localLegacySquadTextManifestPath(projectDir, slug);
  const designDocPath = (await exists(localSquadDesignDocPath(projectDir, slug)))
    ? localSquadDesignDocPath(projectDir, slug)
    : localLegacySquadDesignDocPath(projectDir, slug);
  const readinessPath = (await exists(localSquadReadinessPath(projectDir, slug)))
    ? localSquadReadinessPath(projectDir, slug)
    : localLegacySquadReadinessPath(projectDir, slug);
  const textManifest = (await fs.readFile(textManifestPath, 'utf8').catch(() => null)) || null;
  const designDocMarkdown = (await fs.readFile(designDocPath, 'utf8').catch(() => null)) || null;
  const readinessMarkdown = (await fs.readFile(readinessPath, 'utf8').catch(() => null)) || null;
  const agentFiles = await listAgentFiles(agentsDirAbs);
  const agentsManifestJson = [];

  for (const filePath of agentFiles) {
    const baseName = path.basename(filePath);
    if (
      baseName === 'agents.md' ||
      baseName === 'squad.manifest.json' ||
      baseName === 'design-doc.md' ||
      baseName === 'readiness.md'
    ) continue;
    const markdown = await fs.readFile(filePath, 'utf8');
    const agentSlug = sanitizeSegment(path.basename(filePath, '.md'), 'agent');
    agentsManifestJson.push({
      slug: agentSlug,
      name: findPrimaryHeading(markdown, agentSlug),
      description: firstParagraph(markdown),
      content: markdown
    });
  }

  const manifestBindings = mergeGenomeBindings({
    blueprintBindings: localManifest?.genomeBindings,
    manifestBindings: localManifest?.genomeBindings || localManifest?.genomes,
    legacyExecutors: localManifest?.executors
  });
  const normalizedManifest =
    localManifest && typeof localManifest === 'object'
      ? {
          ...localManifest,
          slug: sanitizeSegment(localManifest.slug || slug, 'squad'),
          name: String(localManifest.name || squadName),
          packageVersion: String(localManifest.packageVersion || versionNumber),
          mode: String(localManifest.mode || 'content'),
          mission: String(localManifest.mission || extractField(content, 'Description', 'Descricao') || goal || squadName),
          goal: String(localManifest.goal || goal || ''),
          visibility: String(localManifest.visibility || options.visibility || 'private').toLowerCase(),
          aiosLiteCompatibility: String(
            localManifest.aiosLiteCompatibility ||
              options['compatibility-min'] ||
              '^1.1.0'
          ),
          rules: {
            ...(localManifest.rules && typeof localManifest.rules === 'object' ? localManifest.rules : {}),
            outputsDir: localManifest?.rules?.outputsDir || outputDirRel,
            logsDir: localManifest?.rules?.logsDir || logsDirRel,
            mediaDir: localManifest?.rules?.mediaDir || mediaDirRel
          },
          storagePolicy:
            localManifest.storagePolicy && typeof localManifest.storagePolicy === 'object'
              ? localManifest.storagePolicy
              : {
                  primary: String(localManifest.mode || 'content') === 'builder' ? 'files' : 'sqlite',
                  artifacts: String(localManifest.mode || 'content') === 'builder' ? 'files+sqlite' : 'sqlite-json',
                  exports: { html: true, markdown: true, json: true }
                },
          package:
            localManifest.package && typeof localManifest.package === 'object'
              ? localManifest.package
              : {
                  rootDir: packageDirRel,
                  agentsDir: `${packageDirRel}/agents`,
                  skillsDir: `${packageDirRel}/skills`,
                  templatesDir: `${packageDirRel}/templates`,
                  docsDir: `${packageDirRel}/docs`
                },
          baseRoles: Array.isArray(localManifest.baseRoles)
            ? localManifest.baseRoles
            : ['orchestrator', 'discovery-lead', 'design-doc-lead', 'planner', 'implementer', 'reviewer', 'docs-maintainer'],
          skills: Array.isArray(localManifest.skills) ? localManifest.skills : [],
          mcps: Array.isArray(localManifest.mcps) ? localManifest.mcps : [],
          subagents:
            localManifest.subagents && typeof localManifest.subagents === 'object'
              ? localManifest.subagents
              : {
                  allowed: true,
                  when: ['broad research', 'comparison', 'large-context summarization', 'parallel analysis']
                },
          contentBlueprints: normalizeContentBlueprints(localManifest.contentBlueprints),
          context:
            localManifest.context && typeof localManifest.context === 'object'
              ? {
                  ...localManifest.context,
                  designDocPath: localManifest.context.designDocPath || `${packageDirRel}/docs/design-doc.md`,
                  readinessPath: localManifest.context.readinessPath || `${packageDirRel}/docs/readiness.md`,
                  docsPackage: Array.isArray(localManifest.context.docsPackage)
                    ? localManifest.context.docsPackage
                    : ['project.context.md', 'design-doc.md', 'readiness.md']
                }
              : {
                  mode: 'project',
                  summary: goal || squadName,
                  designDocPath: `${packageDirRel}/docs/design-doc.md`,
                  readinessPath: `${packageDirRel}/docs/readiness.md`,
                  docsPackage: ['project.context.md', 'design-doc.md', 'readiness.md']
                },
          executors: Array.isArray(localManifest.executors)
            ? attachBindingsToExecutors(localManifest.executors, manifestBindings)
            : agentsManifestJson.map((agent) => ({
                slug: agent.slug,
                title: agent.name,
                role: agent.description,
                file: `${packageDirRel}/agents/${agent.slug}.md`,
                skills: [],
                genomes: []
              })),
          genomes: manifestBindings,
          genomeBindings: manifestBindings
        }
      : null;

  return {
    kind: 'aiosforge.squad',
    exportVersion: 1,
    squad: {
      id: null,
      name: normalizedManifest?.name || squadName,
      slug: sanitizeSegment(slug, 'squad'),
      description: extractField(content, 'Description', 'Descricao') || normalizedManifest?.mission || null,
      goal: normalizedManifest?.goal || goal,
      visibility: String(options.visibility || normalizedManifest?.visibility || 'PRIVATE').toUpperCase(),
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
      designDocMarkdown,
      readinessMarkdown,
      manifestJson:
        normalizedManifest || {
          packageVersion: versionNumber,
          mode: 'content',
          metadataPath: normalizeRel(path.relative(projectDir, metadataPath)),
          textManifestPath: normalizeRel(path.relative(projectDir, textManifestPath)),
          package: {
            rootDir: packageDirRel,
            agentsDir: `${packageDirRel}/agents`,
            skillsDir: `${packageDirRel}/skills`,
            templatesDir: `${packageDirRel}/templates`,
            docsDir: `${packageDirRel}/docs`
          },
          storagePolicy: {
            primary: 'sqlite',
            artifacts: 'sqlite-json',
            exports: { html: true, markdown: true, json: true }
          },
          context: {
            mode: 'project',
            summary: goal || squadName,
            designDocPath: normalizeRel(path.relative(projectDir, designDocPath)),
            readinessPath: normalizeRel(path.relative(projectDir, readinessPath)),
            docsPackage: ['project.context.md', 'design-doc.md', 'readiness.md']
          },
          outputDir: outputDirRel,
          logsDir: logsDirRel,
          mediaDir: mediaDirRel
        },
      agentsManifestJson,
      genomesManifestJson: {
        textManifestPath: textManifest
          ? normalizeRel(path.relative(projectDir, textManifestPath))
          : null,
        genomes: normalizedManifest?.genomes || { squad: [], executors: {} }
      }
    },
    appliedGenomes: await buildAppliedGenomesFromMetadata(projectDir, content, {
      ...options,
      genomeBindings: normalizedManifest?.genomes
    })
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
