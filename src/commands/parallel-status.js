'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists } = require('../utils');
const { recordRuntimeOperation } = require('../execution-gateway');
const {
  WORKSPACE_MANIFEST_RELATIVE_PATH,
  OWNERSHIP_MAP_RELATIVE_PATH,
  MERGE_PLAN_RELATIVE_PATH,
  buildLaneOwnershipEntries,
  collectOwnershipConflicts,
  collectWritePathConflicts,
  extractStatusDependencyItems,
  extractStatusMergeRank,
  extractStatusWritePathItems,
  buildMachineSyncReport,
  collectDependencyIssues
} = require('../parallel-workspace');

const KNOWN_STATUSES = ['pending', 'in_progress', 'completed', 'merged', 'blocked'];

function parseLaneIndex(fileName) {
  const match = String(fileName || '').match(/^agent-(\d+)\.status\.md$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

function extractMetadata(content, key, fallback = '') {
  const regex = new RegExp(`^-\\s*${key}:\\s*(.*)$`, 'im');
  const match = String(content || '').match(regex);
  if (!match) return fallback;
  return String(match[1] || '').trim();
}

function extractSectionLines(content, title) {
  const lines = String(content || '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${title}`);
  if (start === -1) return [];

  const output = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    output.push(line);
  }
  return output;
}

function extractSectionBullets(content, title) {
  const lines = extractSectionLines(content, title);
  const items = [];
  for (const line of lines) {
    const match = line.match(/^\s*-\s+(.*)$/);
    if (!match) continue;
    items.push(String(match[1] || '').trim());
  }
  return items;
}

function parseDeliverables(content) {
  const lines = extractSectionLines(content, 'Deliverables');
  let total = 0;
  let completed = 0;
  for (const line of lines) {
    const match = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)$/);
    if (!match) continue;
    total += 1;
    if (match[1].toLowerCase() === 'x') completed += 1;
  }
  return { completed, total };
}

function normalizeStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (KNOWN_STATUSES.includes(normalized)) return normalized;
  return normalized || 'other';
}

function sanitizeScopeItems(items) {
  return (items || []).filter((item) => {
    const value = String(item || '').trim().toLowerCase();
    if (!value) return false;
    if (value === '[define module or feature boundary]') return false;
    if (value === '[unassigned]') return false;
    return true;
  });
}

function sanitizeBlockerItems(items) {
  return (items || []).filter((item) => {
    const value = String(item || '').trim().toLowerCase();
    if (!value) return false;
    if (value === '[none]') return false;
    return true;
  });
}

function countDecisionRows(content) {
  const lines = String(content || '').split(/\r?\n/);
  return lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) return false;
    if (trimmed.includes('| time | decision | rationale | impact |')) return false;
    if (/^\|\-+\|/.test(trimmed)) return false;
    return true;
  }).length;
}

function createStatusCounts() {
  return {
    pending: 0,
    in_progress: 0,
    completed: 0,
    merged: 0,
    blocked: 0,
    other: 0
  };
}

function formatStatusLabel(status, t) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  if (normalized === 'pending') return t('parallel_status.status_pending');
  if (normalized === 'in_progress') return t('parallel_status.status_in_progress');
  if (normalized === 'completed') return t('parallel_status.status_completed');
  if (normalized === 'merged') return t('parallel_status.status_merged');
  if (normalized === 'blocked') return t('parallel_status.status_blocked');
  return t('parallel_status.status_other');
}

async function parseLaneFile(parallelDir, index) {
  const fileName = `agent-${index}.status.md`;
  const absPath = path.join(parallelDir, fileName);
  const content = await fs.readFile(absPath, 'utf8');
  const status = normalizeStatus(extractMetadata(content, 'status', 'pending'));
  const owner = extractMetadata(content, 'owner', '[unassigned]');
  const priority = extractMetadata(content, 'priority', 'medium');
  const updatedAt = extractMetadata(content, 'updated_at', '');
  const scopeItems = sanitizeScopeItems(extractSectionBullets(content, 'Scope'));
  const blockerItems = sanitizeBlockerItems(extractSectionBullets(content, 'Blockers'));
  const deliverables = parseDeliverables(content);
  const dependencyItems = extractStatusDependencyItems(content);
  const mergeRank = extractStatusMergeRank(content, index);
  const writePathItems = extractStatusWritePathItems(content);

  return {
    lane: index,
    file: path.join('.aioson/context/parallel', fileName).replace(/\\/g, '/'),
    status,
    owner,
    priority,
    updatedAt,
    scopeCount: scopeItems.length,
    dependencyCount: dependencyItems.length,
    blockerCount: blockerItems.length,
    deliverables,
    scopeItems,
    blockerItems,
    dependencyItems,
    mergeRank,
    writePathItems,
    writePathCount: writePathItems.length
  };
}

async function runParallelStatus({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const parallelDir = path.join(targetDir, '.aioson/context/parallel');

  if (!(await exists(parallelDir))) {
    throw new Error(t('parallel_status.parallel_missing', { path: parallelDir }));
  }

  const entries = await fs.readdir(parallelDir);
  const laneIndices = entries
    .map(parseLaneIndex)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  if (laneIndices.length === 0) {
    throw new Error(t('parallel_status.no_lanes'));
  }

  const lanes = [];
  for (const index of laneIndices) {
    lanes.push(await parseLaneFile(parallelDir, index));
  }

  const statusCounts = createStatusCounts();
  let scopeCount = 0;
  let blockerCount = 0;
  let deliverablesCompleted = 0;
  let deliverablesTotal = 0;

  for (const lane of lanes) {
    const key = Object.prototype.hasOwnProperty.call(statusCounts, lane.status) ? lane.status : 'other';
    statusCounts[key] += 1;
    scopeCount += lane.scopeCount;
    blockerCount += lane.blockerCount;
    deliverablesCompleted += lane.deliverables.completed;
    deliverablesTotal += lane.deliverables.total;
  }

  const sharedPath = path.join(parallelDir, 'shared-decisions.md');
  const sharedExists = await exists(sharedPath);
  const sharedDecisionEntries = sharedExists
    ? countDecisionRows(await fs.readFile(sharedPath, 'utf8'))
    : 0;
  const manifestPath = path.join(targetDir, WORKSPACE_MANIFEST_RELATIVE_PATH);
  const ownershipPath = path.join(targetDir, OWNERSHIP_MAP_RELATIVE_PATH);
  const mergePlanPath = path.join(targetDir, MERGE_PLAN_RELATIVE_PATH);
  const manifestExists = await exists(manifestPath);
  const ownershipExists = await exists(ownershipPath);
  const mergePlanExists = await exists(mergePlanPath);

  let workspaceManifest = null;
  let ownershipMap = null;
  let mergePlan = null;
  try {
    workspaceManifest = manifestExists ? JSON.parse(await fs.readFile(manifestPath, 'utf8')) : null;
  } catch {
    workspaceManifest = null;
  }
  try {
    ownershipMap = ownershipExists ? JSON.parse(await fs.readFile(ownershipPath, 'utf8')) : null;
  } catch {
    ownershipMap = null;
  }
  try {
    mergePlan = mergePlanExists ? JSON.parse(await fs.readFile(mergePlanPath, 'utf8')) : null;
  } catch {
    mergePlan = null;
  }

  const ownershipConflicts = collectOwnershipConflicts(ownershipMap);
  const laneEntries = buildLaneOwnershipEntries(
    lanes.map((lane) => ({
      lane: lane.lane,
      items: lane.scopeItems,
      owner: lane.owner,
      dependsOn: lane.dependencyItems,
      writePaths: lane.writePathItems,
      mergeRank: lane.mergeRank
    }))
  );
  const sync = buildMachineSyncReport({
    laneEntries,
    workspaceManifest,
    ownershipMap,
    mergePlan
  });
  const dependencies = collectDependencyIssues({
    lanes,
    mergeOrder: mergePlan && Array.isArray(mergePlan.order) ? mergePlan.order : []
  });
  const writePaths = collectWritePathConflicts(lanes);
  const assignedPathLaneCount = lanes.filter((lane) => lane.writePathCount > 0).length;
  const uncoveredAssignedLaneCount = lanes.filter((lane) => lane.scopeCount > 0 && lane.writePathCount === 0).length;
  const totalWritePathCount = lanes.reduce((sum, lane) => sum + lane.writePathCount, 0);

  const output = {
    ok: true,
    targetDir,
    parallelDir,
    laneCount: lanes.length,
    statusCounts,
    scopeCount,
    blockerCount,
    deliverables: {
      completed: deliverablesCompleted,
      total: deliverablesTotal
    },
    sharedDecisions: {
      exists: sharedExists,
      entries: sharedDecisionEntries
    },
    machineFiles: {
      workspaceManifest: manifestExists,
      ownershipMap: ownershipExists,
      mergePlan: mergePlanExists
    },
    ownership: {
      assignedScopeCount: ownershipMap && Array.isArray(ownershipMap.lanes)
        ? ownershipMap.lanes.reduce((sum, lane) => sum + (Array.isArray(lane.scope_keys) ? lane.scope_keys.length : 0), 0)
        : 0,
      conflictCount: ownershipConflicts.length,
      conflicts: ownershipConflicts
    },
    writeScope: {
      laneCount: assignedPathLaneCount,
      totalPathCount: totalWritePathCount,
      uncoveredAssignedLaneCount,
      invalidPatternCount: writePaths.invalidCount,
      invalidPatterns: writePaths.invalid,
      conflictCount: writePaths.conflictCount,
      conflicts: writePaths.conflicts
    },
    dependencies,
    merge: {
      strategy: mergePlan && mergePlan.strategy ? mergePlan.strategy : null,
      order: mergePlan && Array.isArray(mergePlan.order) ? mergePlan.order : [],
      laneCount: mergePlan && Array.isArray(mergePlan.lanes) ? mergePlan.lanes.length : 0,
      orderViolationCount: dependencies.orderViolationCount
    },
    sync,
    lanes: lanes.map((lane) => ({
      lane: lane.lane,
      file: lane.file,
      status: lane.status,
      owner: lane.owner,
      priority: lane.priority,
      updatedAt: lane.updatedAt,
      scopeCount: lane.scopeCount,
      dependencyCount: lane.dependencyCount,
      dependencies: lane.dependencyItems,
      mergeRank: lane.mergeRank,
      writePathCount: lane.writePathCount,
      writePaths: lane.writePathItems,
      blockerCount: lane.blockerCount,
      deliverables: lane.deliverables
    }))
  };

  output.runtime = await recordRuntimeOperation(targetDir, {
    agentName: 'orchestrator',
    source: 'orchestration',
    sessionKey: 'parallel:workspace',
    title: 'Parallel orchestration workspace',
    goal: 'Prepare and manage parallel development lanes',
    runTitle: 'parallel:status',
    message: 'Parallel status inspection started',
    summary: `Parallel status inspected for ${output.laneCount} lanes`,
    eventType: 'parallel.status_reported',
    phase: 'parallel',
    payload: {
      command: 'parallel:status',
      laneCount: output.laneCount,
      statusCounts,
      scopeCount,
      blockerCount,
      deliverables: output.deliverables,
      sharedDecisions: output.sharedDecisions,
      machineFiles: output.machineFiles,
      ownership: output.ownership,
      writeScope: output.writeScope,
      dependencies: output.dependencies,
      merge: output.merge,
      sync: output.sync
    }
  });

  if (options.json) {
    return output;
  }

  logger.log(t('parallel_status.title', { path: targetDir }));
  logger.log(t('parallel_status.lanes_count', { count: output.laneCount }));
  logger.log(t('parallel_status.statuses_title'));
  for (const key of Object.keys(statusCounts)) {
    logger.log(
      t('parallel_status.status_line', {
        status: formatStatusLabel(key, t),
        count: statusCounts[key]
      })
    );
  }
  logger.log(t('parallel_status.scopes_count', { count: scopeCount }));
  logger.log(
    t('parallel_status.deliverables_progress', {
      completed: deliverablesCompleted,
      total: deliverablesTotal
    })
  );
  logger.log(t('parallel_status.blockers_count', { count: blockerCount }));
  logger.log(
    t('parallel_status.shared_decisions', {
      count: sharedDecisionEntries
    })
  );
  logger.log(
    t('parallel_status.ownership_conflicts', {
      count: output.ownership.conflictCount
    })
  );
  logger.log(
    t('parallel_status.write_scope_summary', {
      lanes: output.writeScope.laneCount,
      paths: output.writeScope.totalPathCount,
      uncovered: output.writeScope.uncoveredAssignedLaneCount,
      conflicts: output.writeScope.conflictCount,
      invalid: output.writeScope.invalidPatternCount
    })
  );
  logger.log(
    t('parallel_status.dependencies_summary', {
      declared: output.dependencies.declaredCount,
      invalid: output.dependencies.invalidCount,
      blocked: output.dependencies.blockedCount,
      orderViolations: output.dependencies.orderViolationCount
    })
  );
  logger.log(
    t('parallel_status.sync_summary', {
      count: output.sync.staleFiles.length
    })
  );
  for (const file of output.sync.staleFiles) {
    logger.log(t('parallel_status.sync_stale_line', { file }));
  }
  for (const lane of output.lanes) {
    logger.log(
      t('parallel_status.lane_line', {
        lane: lane.lane,
        status: formatStatusLabel(lane.status, t),
        scope: lane.scopeCount,
        blockers: lane.blockerCount
      })
    );
  }

  return output;
}

module.exports = {
  runParallelStatus,
  parseLaneIndex,
  countDecisionRows
};
