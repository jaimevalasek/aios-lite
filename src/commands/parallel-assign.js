'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { validateProjectContextFile } = require('../context');
const { exists, toRelativeSafe } = require('../utils');
const { parseWorkers, normalizeClassification } = require('./parallel-init');
const { recordRuntimeOperation } = require('../execution-gateway');
const {
  WORKSPACE_MANIFEST_RELATIVE_PATH,
  OWNERSHIP_MAP_RELATIVE_PATH,
  MERGE_PLAN_RELATIVE_PATH,
  buildLaneOwnershipEntries,
  buildWorkspaceManifest,
  buildOwnershipMap,
  buildMergePlan,
  extractStatusDependencyItems,
  extractStatusWritePathItems,
  extractStatusMergeRank,
  replaceSection,
  replaceMetadataLine
} = require('../parallel-workspace');

const SOURCE_ALIAS = {
  prd: '.aioson/context/prd.md',
  architecture: '.aioson/context/architecture.md',
  discovery: '.aioson/context/discovery.md'
};

const AUTO_SOURCE_ORDER = ['prd', 'architecture', 'discovery'];
const MAX_SCOPES = 24;

function parseLaneIndex(fileName) {
  const match = String(fileName || '').match(/^agent-(\d+)\.status\.md$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

function sanitizeScopeLabel(value) {
  return String(value || '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[:.;]+$/, '');
}

function shouldSkipScope(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;

  const ignored = [
    'overview',
    'notes',
    'out of scope',
    'classification',
    'risks',
    'references',
    'decision log',
    'protocol',
    'metadata',
    'session',
    'scope',
    'dependencies',
    'deliverables',
    'blockers'
  ];

  return ignored.some((token) => text === token || text.includes(token));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractScopesFromContent(content) {
  const text = String(content || '');
  const lines = text.split(/\r?\n/);
  const headings = [];

  for (const line of lines) {
    const match = line.match(/^#{2,3}\s+(.+)$/);
    if (!match) continue;
    const label = sanitizeScopeLabel(match[1]);
    if (label.length < 3) continue;
    if (shouldSkipScope(label)) continue;
    headings.push(label);
  }

  const headingScopes = unique(headings).slice(0, MAX_SCOPES);
  if (headingScopes.length > 0) {
    return {
      scopes: headingScopes,
      method: 'headings',
      fallbackUsed: false
    };
  }

  const bullets = [];
  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/);
    if (!match) continue;
    const label = sanitizeScopeLabel(match[1]);
    if (label.length < 3) continue;
    if (shouldSkipScope(label)) continue;
    bullets.push(label);
  }

  const bulletScopes = unique(bullets).slice(0, MAX_SCOPES);
  if (bulletScopes.length > 0) {
    return {
      scopes: bulletScopes,
      method: 'bullets',
      fallbackUsed: false
    };
  }

  return {
    scopes: ['Core implementation lane'],
    method: 'fallback',
    fallbackUsed: true
  };
}

async function resolveSourceFile(targetDir, sourceOption) {
  const source = String(sourceOption || 'auto').trim().toLowerCase();
  if (!source || source === 'auto') {
    for (const alias of AUTO_SOURCE_ORDER) {
      const rel = SOURCE_ALIAS[alias];
      const abs = path.join(targetDir, rel);
      if (await exists(abs)) {
        return {
          id: alias,
          relPath: rel,
          absPath: abs
        };
      }
    }
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(SOURCE_ALIAS, source)) {
    const rel = SOURCE_ALIAS[source];
    return {
      id: source,
      relPath: rel,
      absPath: path.join(targetDir, rel)
    };
  }

  const absPath = path.isAbsolute(sourceOption)
    ? sourceOption
    : path.resolve(targetDir, String(sourceOption || '').trim());
  return {
    id: 'custom',
    relPath: toRelativeSafe(targetDir, absPath),
    absPath
  };
}

function distributeScopes(scopes, workers) {
  const lanes = [];
  for (let i = 1; i <= workers; i += 1) {
    lanes.push({
      lane: i,
      items: []
    });
  }

  for (let i = 0; i < scopes.length; i += 1) {
    const lane = lanes[i % workers];
    lane.items.push(scopes[i]);
  }

  return lanes;
}

function replaceScopeSection(content, items) {
  return replaceSection(
    content,
    'Scope',
    items.length > 0 ? items.map((item) => `- ${item}`) : ['- [unassigned]']
  );
}

function updateTimestamp(content, generatedAt) {
  const text = String(content || '');
  if (text.includes('- updated_at:')) {
    return text.replace(/^- updated_at:\s*.*$/m, `- updated_at: ${generatedAt}`);
  }
  return text;
}

function extractMetadata(content, key, fallback = '') {
  const regex = new RegExp(`^-\\s*${key}:\\s*(.*)$`, 'im');
  const match = String(content || '').match(regex);
  if (!match) return fallback;
  return String(match[1] || '').trim() || fallback;
}

function appendSharedDecision(content, generatedAt, sourcePath, workers, scopeCount) {
  const row =
    `| ${generatedAt} | Scope assignment initialized | ` +
    `Source: ${sourcePath} | workers=${workers}, scopes=${scopeCount} |`;
  const text = String(content || '');

  if (!text.includes('| time | decision | rationale | impact |')) {
    const suffix = text.endsWith('\n') ? '' : '\n';
    return `${text}${suffix}\n## Decision Log\n| time | decision | rationale | impact |\n|------|----------|-----------|--------|\n${row}\n`;
  }

  return `${text.replace(/\n*$/, '\n')}${row}\n`;
}

async function runParallelAssign({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run']);
  const force = Boolean(options.force);
  const workersOptionRaw = options.workers;
  const workersOption = workersOptionRaw !== undefined ? parseWorkers(workersOptionRaw) : null;
  if (workersOptionRaw !== undefined && workersOption === null) {
    throw new Error(
      t('parallel_assign.invalid_workers', {
        min: 2,
        max: 6
      })
    );
  }

  const context = await validateProjectContextFile(targetDir);
  const contextPath = path.join(targetDir, '.aioson/context/project.context.md');
  if (!context.exists) {
    throw new Error(t('parallel_assign.context_missing', { path: contextPath }));
  }
  if (!context.parsed) {
    throw new Error(t('parallel_assign.context_invalid', { path: contextPath }));
  }

  const classification = normalizeClassification(context.data && context.data.classification);
  if (classification !== 'MEDIUM' && !force) {
    throw new Error(
      t('parallel_assign.requires_medium', {
        classification: classification || t('parallel_assign.classification_unknown')
      })
    );
  }

  const parallelDir = path.join(targetDir, '.aioson/context/parallel');
  if (!(await exists(parallelDir))) {
    throw new Error(
      t('parallel_assign.parallel_missing', {
        path: parallelDir
      })
    );
  }

  const entries = await fs.readdir(parallelDir);
  const laneIndices = entries
    .map(parseLaneIndex)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  if (laneIndices.length === 0) {
    throw new Error(t('parallel_assign.no_lanes'));
  }

  const workers = workersOption || Math.max(...laneIndices);
  const expectedIndices = [];
  for (let i = 1; i <= workers; i += 1) expectedIndices.push(i);
  const missingLaneIndices = expectedIndices.filter((index) => !laneIndices.includes(index));
  if (missingLaneIndices.length > 0) {
    throw new Error(
      t('parallel_assign.missing_lanes', {
        lanes: missingLaneIndices.join(', ')
      })
    );
  }

  const sourceFile = await resolveSourceFile(targetDir, options.source);
  if (!sourceFile || !(await exists(sourceFile.absPath))) {
    throw new Error(
      t('parallel_assign.source_missing', {
        source: String(options.source || 'auto')
      })
    );
  }

  const sourceContent = await fs.readFile(sourceFile.absPath, 'utf8');
  const extracted = extractScopesFromContent(sourceContent);
  const assignments = distributeScopes(extracted.scopes, workers);
  const generatedAt = new Date().toISOString();
  const filesUpdated = [];
  const projectName =
    String((context.data && context.data.project_name) || '').trim() || path.basename(targetDir) || 'project';
  const laneStatusByIndex = new Map();
  const enrichedAssignments = [];

  for (const lane of assignments) {
    const rel = `.aioson/context/parallel/agent-${lane.lane}.status.md`;
    const lanePath = path.join(targetDir, rel);
    const current = await fs.readFile(lanePath, 'utf8');
    laneStatusByIndex.set(lane.lane, current);
    enrichedAssignments.push({
      ...lane,
      owner: extractMetadata(current, 'owner', `lane-${lane.lane}`),
      dependsOn: extractStatusDependencyItems(current),
      writePaths: extractStatusWritePathItems(current),
      mergeRank: extractStatusMergeRank(current, lane.lane)
    });
  }

  const laneEntries = buildLaneOwnershipEntries(enrichedAssignments);

  for (const lane of assignments) {
    const rel = `.aioson/context/parallel/agent-${lane.lane}.status.md`;
    const lanePath = path.join(targetDir, rel);
    const current = laneStatusByIndex.get(lane.lane);
    const laneEntry = laneEntries.find((item) => item.lane === lane.lane);
    let next = replaceScopeSection(current, lane.items);
    next = updateTimestamp(next, generatedAt);
    next = replaceMetadataLine(next, 'owner', laneEntry.owner);
    next = replaceSection(next, 'Ownership', [
      `- lane_key: ${laneEntry.lane_key}`,
      `- scope_keys: ${laneEntry.scope_keys.length > 0 ? laneEntry.scope_keys.join(', ') : '[unassigned]'}`,
      `- write_scope: ${laneEntry.scope_labels.length > 0 ? laneEntry.scope_labels.join(' | ') : '[unassigned]'}`,
      `- write_paths: ${laneEntry.write_paths.length > 0 ? laneEntry.write_paths.join(', ') : '[unassigned]'}`
    ]);
    next = replaceSection(next, 'Merge', [
      `- merge_rank: ${laneEntry.merge_rank}`,
      '- merge_strategy: lane-index-asc'
    ]);
    if (!dryRun) {
      await fs.writeFile(lanePath, next, 'utf8');
    }
    filesUpdated.push(rel);
  }

  const workspaceManifest = buildWorkspaceManifest({
    projectName,
    classification: classification || 'MEDIUM',
    workers,
    generatedAt,
    lanes: laneEntries,
    sourceFile: sourceFile.relPath
  });
  const ownershipMap = buildOwnershipMap({
    generatedAt,
    lanes: laneEntries
  });
  const mergePlan = buildMergePlan({
    generatedAt,
    lanes: laneEntries,
    sourceFile: sourceFile.relPath
  });
  const machineFiles = [
    {
      rel: WORKSPACE_MANIFEST_RELATIVE_PATH,
      payload: workspaceManifest
    },
    {
      rel: OWNERSHIP_MAP_RELATIVE_PATH,
      payload: ownershipMap
    },
    {
      rel: MERGE_PLAN_RELATIVE_PATH,
      payload: mergePlan
    }
  ];

  for (const file of machineFiles) {
    if (!dryRun) {
      await fs.writeFile(path.join(targetDir, file.rel), `${JSON.stringify(file.payload, null, 2)}\n`, 'utf8');
    }
    filesUpdated.push(file.rel);
  }

  const sharedPath = path.join(parallelDir, 'shared-decisions.md');
  if (await exists(sharedPath)) {
    const sharedContent = await fs.readFile(sharedPath, 'utf8');
    const nextShared = appendSharedDecision(
      sharedContent,
      generatedAt,
      sourceFile.relPath,
      workers,
      extracted.scopes.length
    );
    if (!dryRun) {
      await fs.writeFile(sharedPath, nextShared, 'utf8');
    }
    filesUpdated.push('.aioson/context/parallel/shared-decisions.md');
  }

  const output = {
    ok: true,
    targetDir,
    classification: classification || 'MEDIUM',
    workers,
    dryRun,
    force,
    generatedAt,
    source: sourceFile.id,
    sourceFile: sourceFile.relPath,
    extractionMethod: extracted.method,
    fallbackUsed: extracted.fallbackUsed,
    scopeCount: extracted.scopes.length,
    assignments: assignments.map((item) => ({
      lane: item.lane,
      file: `.aioson/context/parallel/agent-${item.lane}.status.md`,
      items: item.items,
      writePaths: (laneEntries.find((laneEntry) => laneEntry.lane === item.lane) || {}).write_paths || []
    })),
    filesUpdated,
    machineFiles: {
      workspaceManifest: WORKSPACE_MANIFEST_RELATIVE_PATH,
      ownershipMap: OWNERSHIP_MAP_RELATIVE_PATH,
      mergePlan: MERGE_PLAN_RELATIVE_PATH
    }
  };

  if (!dryRun) {
    output.runtime = await recordRuntimeOperation(targetDir, {
      agentName: 'orchestrator',
      source: 'orchestration',
      sessionKey: 'parallel:workspace',
      title: 'Parallel orchestration workspace',
      goal: 'Prepare and manage parallel development lanes',
      runTitle: 'parallel:assign',
      message: 'Parallel scope assignment started',
      summary: `Parallel scope assignment updated ${output.scopeCount} scopes across ${workers} lanes`,
      eventType: 'parallel.assigned',
      phase: 'parallel',
      payload: {
        command: 'parallel:assign',
        classification: output.classification,
        workers,
        source: output.source,
        sourceFile: output.sourceFile,
        extractionMethod: output.extractionMethod,
        fallbackUsed: output.fallbackUsed,
        scopeCount: output.scopeCount,
        filesUpdated,
        machineFiles: output.machineFiles
      }
    });
  }

  if (options.json) {
    return output;
  }

  logger.log(
    dryRun
      ? t('parallel_assign.dry_run_applied', { count: output.scopeCount })
      : t('parallel_assign.applied', { count: output.scopeCount })
  );
  logger.log(
    t('parallel_assign.source_info', {
      source: output.sourceFile
    })
  );
  logger.log(t('parallel_assign.workers_count', { count: workers }));
  logger.log(t('parallel_assign.files_count', { count: filesUpdated.length }));
  for (const assignment of output.assignments) {
    logger.log(
      t('parallel_assign.lane_scope_line', {
        lane: assignment.lane,
        count: assignment.items.length
      })
    );
  }

  return output;
}

module.exports = {
  runParallelAssign,
  extractScopesFromContent,
  parseLaneIndex,
  distributeScopes,
  resolveSourceFile
};
