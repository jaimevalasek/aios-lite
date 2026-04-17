'use strict';

const path = require('node:path');

const PARALLEL_RELATIVE_DIR = '.aioson/context/parallel';
const WORKSPACE_MANIFEST_RELATIVE_PATH = `${PARALLEL_RELATIVE_DIR}/workspace.manifest.json`;
const OWNERSHIP_MAP_RELATIVE_PATH = `${PARALLEL_RELATIVE_DIR}/ownership-map.json`;
const MERGE_PLAN_RELATIVE_PATH = `${PARALLEL_RELATIVE_DIR}/merge-plan.json`;

function buildLaneKey(index) {
  return `lane-${index}`;
}

function sanitizeScopeLabel(value) {
  return String(value || '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[:.;]+$/, '');
}

function buildScopeKey(value) {
  return sanitizeScopeLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeProjectRelativePath(value) {
  const text = String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
  if (!text) return null;
  if (text === '..' || text.startsWith('../')) return null;
  if (text === '[unassigned]') return null;
  if (text.includes('[assign')) return null;
  if (text.includes('assign file paths')) return null;
  if (text.endsWith('/**')) {
    const base = text.slice(0, -3).replace(/\/+$/g, '');
    return base ? `${base}/**` : null;
  }
  return text.replace(/\/+$/g, '') || null;
}

function parseWritePathPattern(value) {
  const normalized = normalizeProjectRelativePath(value);
  if (!normalized) {
    return null;
  }

  if (normalized.includes('*') && !normalized.endsWith('/**')) {
    return {
      value: normalized,
      valid: false,
      type: 'unsupported_glob'
    };
  }

  if (normalized.includes('**') && !normalized.endsWith('/**')) {
    return {
      value: normalized,
      valid: false,
      type: 'unsupported_glob'
    };
  }

  if (normalized.endsWith('/**')) {
    const base = normalized.slice(0, -3);
    if (!base) {
      return {
        value: normalized,
        valid: false,
        type: 'invalid_prefix'
      };
    }
    return {
      value: normalized,
      valid: true,
      type: 'prefix',
      base
    };
  }

  return {
    value: normalized,
    valid: true,
    type: 'exact',
    base: normalized
  };
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function buildLaneOwnershipEntries(assignments) {
  return (assignments || []).map((assignment) => {
    const scopeLabels = unique((assignment.items || []).map(sanitizeScopeLabel));
    const writePaths = unique(
      (assignment.writePaths || [])
        .map((item) => parseWritePathPattern(item))
        .filter((item) => item && item.valid)
        .map((item) => item.value)
    );
    const laneKey = buildLaneKey(assignment.lane);
    return {
      lane: assignment.lane,
      lane_key: laneKey,
      owner: String(assignment.owner || laneKey).trim() || laneKey,
      scope_labels: scopeLabels,
      scope_keys: unique(scopeLabels.map(buildScopeKey)),
      write_paths: writePaths,
      write_scope: scopeLabels.map((label) => ({
        type: 'scope_label',
        value: label
      })).concat(
        writePaths.map((value) => ({
          type: 'path_pattern',
          value
        }))
      ),
      depends_on: unique((assignment.dependsOn || []).map(normalizeDependencyRef)),
      merge_rank: normalizeMergeRank(assignment.mergeRank, assignment.lane)
    };
  });
}

function buildWorkspaceManifest({ projectName, classification, workers, generatedAt, lanes = [], sourceFile = null }) {
  return {
    version: 1,
    generated_at: generatedAt,
    project_name: projectName,
    classification,
    workers,
    lane_strategy: 'isolated-lanes',
    merge_strategy: 'lane-index-asc',
    source_file: sourceFile,
    lanes: lanes.map((lane) => ({
      lane: lane.lane,
      lane_key: lane.lane_key,
      owner: lane.owner,
      status_file: `${PARALLEL_RELATIVE_DIR}/${buildLaneKey(lane.lane)}.status.md`,
      scope_keys: lane.scope_keys || [],
      write_paths: lane.write_paths || [],
      merge_rank: lane.merge_rank,
      depends_on: lane.depends_on || []
    }))
  };
}

function buildOwnershipMap({ generatedAt, lanes = [] }) {
  return {
    version: 1,
    generated_at: generatedAt,
    lanes: lanes.map((lane) => ({
      lane: lane.lane,
      lane_key: lane.lane_key,
      owner: lane.owner,
      scope_labels: lane.scope_labels || [],
      scope_keys: lane.scope_keys || [],
      write_paths: lane.write_paths || [],
      write_scope: lane.write_scope || [],
      depends_on: lane.depends_on || []
    }))
  };
}

function buildMergePlan({ generatedAt, lanes = [], sourceFile = null }) {
  return {
    version: 1,
    generated_at: generatedAt,
    source_file: sourceFile,
    strategy: 'lane-index-asc',
    conflict_policy: 'shared-decisions-first',
    order: lanes
      .slice()
      .sort((a, b) => Number(a.merge_rank || a.lane) - Number(b.merge_rank || b.lane))
      .map((lane) => lane.lane),
    lanes: lanes.map((lane) => ({
      lane: lane.lane,
      lane_key: lane.lane_key,
      merge_rank: lane.merge_rank,
      scope_keys: lane.scope_keys || [],
      depends_on: lane.depends_on || []
    }))
  };
}

function collectOwnershipConflicts(ownershipMap) {
  if (!ownershipMap || !Array.isArray(ownershipMap.lanes)) return [];

  const seen = new Map();
  for (const lane of ownershipMap.lanes) {
    for (const key of lane.scope_keys || []) {
      if (!key) continue;
      const current = seen.get(key) || [];
      current.push(lane.lane);
      seen.set(key, current);
    }
  }

  return Array.from(seen.entries())
    .filter(([, lanes]) => lanes.length > 1)
    .map(([scope_key, lanes]) => ({ scope_key, lanes }));
}

function normalizeMergeRank(value, fallback) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) return Math.floor(num);
  const fallbackNum = Number(fallback);
  if (Number.isFinite(fallbackNum) && fallbackNum > 0) return Math.floor(fallbackNum);
  return 1;
}

function normalizeDependencyRef(value) {
  const text = sanitizeScopeLabel(value)
    .replace(/[\[\]]/g, '')
    .toLowerCase();
  if (!text) return null;
  if (
    text === 'list dependencies on other lanes or shared decisions' ||
    text === 'list dependencies such as lane-1 or shared-decisions'
  ) {
    return null;
  }

  const laneMatch = text.match(/^(?:lane|agent)[\s-]+(\d+)$/);
  if (laneMatch) {
    return buildLaneKey(Number(laneMatch[1]));
  }

  if (
    text === 'shared decisions' ||
    text === 'shared decision' ||
    text === 'shared-decisions' ||
    text === 'shared-decision'
  ) {
    return 'shared-decisions';
  }

  return buildScopeKey(text) || null;
}

function extractSectionBullets(content, title) {
  const lines = String(content || '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${title}`);
  if (start === -1) return [];

  const items = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    const match = line.match(/^\s*-\s+(.*)$/);
    if (!match) continue;
    items.push(String(match[1] || '').trim());
  }
  return items;
}

function extractStatusScopeItems(content) {
  return extractSectionBullets(content, 'Scope').filter((item) => {
    const value = String(item || '').trim().toLowerCase();
    return value && value !== '[define module or feature boundary]' && value !== '[unassigned]';
  });
}

function extractStatusDependencyItems(content) {
  return unique(extractSectionBullets(content, 'Dependencies').map(normalizeDependencyRef));
}

function extractStatusWritePathItems(content) {
  const ownershipItems = extractSectionBullets(content, 'Ownership');
  const values = [];
  for (const item of ownershipItems) {
    const match = String(item || '').match(/^write_paths?:\s*(.*)$/i);
    if (!match) continue;
    const raw = String(match[1] || '').trim();
    if (!raw) continue;
    for (const part of raw.split(/\s*(?:,|\|)\s*/)) {
      const parsed = parseWritePathPattern(part);
      if (parsed && parsed.value) {
        values.push(parsed.value);
      }
    }
  }
  return unique(values);
}

function extractStatusMergeRank(content, fallback = null) {
  const items = extractSectionBullets(content, 'Merge');
  for (const item of items) {
    const match = String(item || '').match(/^merge_rank:\s*(\d+)$/i);
    if (match) {
      return normalizeMergeRank(match[1], fallback);
    }
  }
  return normalizeMergeRank(fallback, 1);
}

function sortByLane(a, b) {
  return Number(a.lane) - Number(b.lane);
}

function sortStrings(values) {
  return (values || [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .sort();
}

function normalizeComparableLaneEntry(lane) {
  if (!lane || !Number.isFinite(Number(lane.lane))) return null;
  const laneNumber = normalizeMergeRank(lane.lane, 1);
  const laneKey = String(lane.lane_key || buildLaneKey(laneNumber)).trim() || buildLaneKey(laneNumber);
  return {
    lane: laneNumber,
    lane_key: laneKey,
    owner: String(lane.owner || laneKey).trim() || laneKey,
    scope_keys: sortStrings(lane.scope_keys || []),
    write_paths: sortStrings(lane.write_paths || []),
    depends_on: sortStrings((lane.depends_on || []).map(normalizeDependencyRef)),
    merge_rank: normalizeMergeRank(lane.merge_rank, laneNumber)
  };
}

function normalizeWorkspaceManifestForComparison(manifest) {
  if (!manifest || !Array.isArray(manifest.lanes)) return null;
  return {
    workers: normalizeMergeRank(manifest.workers || manifest.lanes.length, manifest.lanes.length),
    lane_strategy: String(manifest.lane_strategy || '').trim() || 'isolated-lanes',
    merge_strategy: String(manifest.merge_strategy || '').trim() || 'lane-index-asc',
    lanes: manifest.lanes
      .map(normalizeComparableLaneEntry)
      .filter(Boolean)
      .sort(sortByLane)
  };
}

function normalizeOwnershipMapForComparison(ownershipMap) {
  if (!ownershipMap || !Array.isArray(ownershipMap.lanes)) return null;
  return {
    lanes: ownershipMap.lanes
      .map(normalizeComparableLaneEntry)
      .filter(Boolean)
      .sort(sortByLane)
  };
}

function normalizeMergePlanForComparison(mergePlan) {
  if (!mergePlan || !Array.isArray(mergePlan.lanes)) return null;
  return {
    strategy: String(mergePlan.strategy || '').trim() || 'lane-index-asc',
    conflict_policy: String(mergePlan.conflict_policy || '').trim() || 'shared-decisions-first',
    order: (mergePlan.order || []).map((value) => normalizeMergeRank(value, 1)),
    lanes: mergePlan.lanes
      .map(normalizeComparableLaneEntry)
      .filter(Boolean)
      .sort(sortByLane)
  };
}

function buildMachineSyncReport({ laneEntries = [], workspaceManifest = null, ownershipMap = null, mergePlan = null }) {
  const expectedWorkspaceManifest = normalizeWorkspaceManifestForComparison(
    buildWorkspaceManifest({
      projectName: 'project',
      classification: 'MEDIUM',
      workers: laneEntries.length,
      generatedAt: '1970-01-01T00:00:00.000Z',
      lanes: laneEntries
    })
  );
  const expectedOwnershipMap = normalizeOwnershipMapForComparison(
    buildOwnershipMap({
      generatedAt: '1970-01-01T00:00:00.000Z',
      lanes: laneEntries
    })
  );
  const expectedMergePlan = normalizeMergePlanForComparison(
    buildMergePlan({
      generatedAt: '1970-01-01T00:00:00.000Z',
      lanes: laneEntries
    })
  );

  const workspaceManifestInSync =
    JSON.stringify(normalizeWorkspaceManifestForComparison(workspaceManifest)) ===
    JSON.stringify(expectedWorkspaceManifest);
  const ownershipMapInSync =
    JSON.stringify(normalizeOwnershipMapForComparison(ownershipMap)) ===
    JSON.stringify(expectedOwnershipMap);
  const mergePlanInSync =
    JSON.stringify(normalizeMergePlanForComparison(mergePlan)) ===
    JSON.stringify(expectedMergePlan);

  const staleFiles = [];
  if (!workspaceManifestInSync) staleFiles.push('workspace.manifest.json');
  if (!ownershipMapInSync) staleFiles.push('ownership-map.json');
  if (!mergePlanInSync) staleFiles.push('merge-plan.json');

  return {
    workspaceManifestInSync,
    ownershipMapInSync,
    mergePlanInSync,
    staleFiles
  };
}

function collectDependencyIssues({ lanes = [], mergeOrder = [] }) {
  const laneMap = new Map();
  const orderMap = new Map();
  const invalid = [];
  const blocked = [];
  const orderViolations = [];
  let declaredCount = 0;

  for (const lane of lanes) {
    laneMap.set(Number(lane.lane), lane);
  }

  (mergeOrder || []).forEach((lane, index) => {
    orderMap.set(Number(lane), index);
  });

  for (const lane of lanes) {
    const laneNumber = Number(lane.lane);
    const status = String(lane.status || '').trim().toLowerCase();
    const dependencies = unique((lane.dependencyItems || lane.depends_on || []).map(normalizeDependencyRef));
    declaredCount += dependencies.length;

    for (const dependency of dependencies) {
      const match = String(dependency || '').match(/^lane-(\d+)$/);
      if (!match) continue;

      const dependencyLane = Number(match[1]);
      const dependencyState = laneMap.get(dependencyLane);
      if (!dependencyState) {
        invalid.push({
          lane: laneNumber,
          dependency
        });
        continue;
      }

      const dependencyStatus = String(dependencyState.status || '').trim().toLowerCase();
      if (status && status !== 'pending' && dependencyStatus !== 'completed' && dependencyStatus !== 'merged') {
        blocked.push({
          lane: laneNumber,
          dependency,
          dependencyStatus: String(dependencyState.status || 'pending').trim() || 'pending'
        });
      }

      if (orderMap.has(laneNumber) && orderMap.has(dependencyLane) && orderMap.get(dependencyLane) > orderMap.get(laneNumber)) {
        orderViolations.push({
          lane: laneNumber,
          dependency
        });
      }
    }
  }

  return {
    declaredCount,
    invalidCount: invalid.length,
    blockedCount: blocked.length,
    orderViolationCount: orderViolations.length,
    invalid,
    blocked,
    orderViolations
  };
}

function buildMergeExecutionReport({ lanes = [], mergeOrder = [] }) {
  const laneMap = new Map();
  const normalizedOrder = Array.isArray(mergeOrder) && mergeOrder.length > 0
    ? mergeOrder.map((value) => normalizeMergeRank(value, 1))
    : lanes
        .slice()
        .sort((a, b) => normalizeMergeRank(a.mergeRank, a.lane) - normalizeMergeRank(b.mergeRank, b.lane))
        .map((lane) => Number(lane.lane));

  for (const lane of lanes) {
    laneMap.set(Number(lane.lane), lane);
  }

  const mergedStatuses = new Set(['merged']);
  const readyStatuses = new Set(['completed']);
  const appliedOrExisting = new Set();
  const plan = [];
  const blocked = [];
  let allReady = true;

  for (let index = 0; index < normalizedOrder.length; index += 1) {
    const laneNumber = Number(normalizedOrder[index]);
    const lane = laneMap.get(laneNumber);
    if (!lane) {
      allReady = false;
      blocked.push({
        lane: laneNumber,
        reason: 'missing_lane'
      });
      plan.push({
        lane: laneNumber,
        action: 'blocked',
        reason: 'missing_lane'
      });
      continue;
    }

    const status = String(lane.status || '').trim().toLowerCase();
    const dependencies = unique((lane.dependencyItems || lane.depends_on || []).map(normalizeDependencyRef));
    const unresolvedDependencies = [];
    for (const dependency of dependencies) {
      const match = String(dependency || '').match(/^lane-(\d+)$/);
      if (!match) continue;
      const dependencyLane = Number(match[1]);
      const dependencyState = laneMap.get(dependencyLane);
      const dependencyStatus = String(dependencyState && dependencyState.status ? dependencyState.status : '').trim().toLowerCase();
      if (!dependencyState) {
        unresolvedDependencies.push({
          dependency,
          reason: 'missing_lane'
        });
        continue;
      }
      if (!appliedOrExisting.has(dependencyLane) && !mergedStatuses.has(dependencyStatus)) {
        unresolvedDependencies.push({
          dependency,
          reason: `dependency_status_${dependencyStatus || 'pending'}`
        });
      }
    }

    if (mergedStatuses.has(status)) {
      appliedOrExisting.add(laneNumber);
      plan.push({
        lane: laneNumber,
        status,
        action: 'already_merged',
        mergeRank: normalizeMergeRank(lane.mergeRank, laneNumber),
        dependencies
      });
      continue;
    }

    if (!readyStatuses.has(status)) {
      allReady = false;
      blocked.push({
        lane: laneNumber,
        reason: `status_${status || 'unknown'}`
      });
      plan.push({
        lane: laneNumber,
        status,
        action: 'blocked',
        reason: `status_${status || 'unknown'}`,
        mergeRank: normalizeMergeRank(lane.mergeRank, laneNumber),
        dependencies
      });
      continue;
    }

    if (unresolvedDependencies.length > 0) {
      allReady = false;
      blocked.push({
        lane: laneNumber,
        reason: 'dependency_unresolved',
        dependencies: unresolvedDependencies
      });
      plan.push({
        lane: laneNumber,
        status,
        action: 'blocked',
        reason: 'dependency_unresolved',
        unresolvedDependencies,
        mergeRank: normalizeMergeRank(lane.mergeRank, laneNumber),
        dependencies
      });
      continue;
    }

    appliedOrExisting.add(laneNumber);
    plan.push({
      lane: laneNumber,
      status,
      action: 'merge',
      mergeRank: normalizeMergeRank(lane.mergeRank, laneNumber),
      dependencies
    });
  }

  return {
    order: normalizedOrder,
    plan,
    blocked,
    readyToApply: allReady,
    readyLaneCount: plan.filter((item) => item.action === 'merge').length,
    alreadyMergedCount: plan.filter((item) => item.action === 'already_merged').length,
    blockedCount: plan.filter((item) => item.action === 'blocked').length
  };
}

function matchWritePathPattern(candidatePath, pattern) {
  const candidate = normalizeProjectRelativePath(candidatePath);
  const parsed = parseWritePathPattern(pattern);
  if (!candidate || !parsed || !parsed.valid) return false;
  if (parsed.type === 'exact') {
    return candidate === parsed.base;
  }
  return candidate === parsed.base || candidate.startsWith(`${parsed.base}/`);
}

function patternsOverlap(left, right) {
  const a = parseWritePathPattern(left);
  const b = parseWritePathPattern(right);
  if (!a || !b || !a.valid || !b.valid) return false;
  if (a.type === 'exact' && b.type === 'exact') {
    return a.base === b.base;
  }
  if (a.type === 'prefix' && b.type === 'prefix') {
    return (
      a.base === b.base ||
      a.base.startsWith(`${b.base}/`) ||
      b.base.startsWith(`${a.base}/`)
    );
  }
  if (a.type === 'prefix') {
    return b.base === a.base || b.base.startsWith(`${a.base}/`);
  }
  return a.base === b.base || a.base.startsWith(`${b.base}/`);
}

function collectWritePathConflicts(lanes = []) {
  const normalizedLanes = (lanes || []).map((lane) => ({
    lane: Number(lane.lane),
    write_paths: unique(
      (lane.write_paths || lane.writePathItems || [])
        .map((item) => parseWritePathPattern(item))
        .filter((item) => item && item.value)
        .map((item) => item.value)
    )
  }));

  const invalid = [];
  for (const lane of lanes || []) {
    for (const item of lane.write_paths || lane.writePathItems || []) {
      const parsed = parseWritePathPattern(item);
      if (parsed && !parsed.valid) {
        invalid.push({
          lane: Number(lane.lane),
          value: parsed.value,
          type: parsed.type
        });
      }
    }
  }

  const conflicts = [];
  for (let i = 0; i < normalizedLanes.length; i += 1) {
    const left = normalizedLanes[i];
    for (let j = i + 1; j < normalizedLanes.length; j += 1) {
      const right = normalizedLanes[j];
      const overlaps = [];
      for (const leftPattern of left.write_paths) {
        for (const rightPattern of right.write_paths) {
          if (patternsOverlap(leftPattern, rightPattern)) {
            overlaps.push([leftPattern, rightPattern]);
          }
        }
      }
      if (overlaps.length > 0) {
        conflicts.push({
          lanes: [left.lane, right.lane],
          overlaps: unique(overlaps.map((item) => item.join(' :: ')))
        });
      }
    }
  }

  return {
    invalid,
    invalidPatterns: invalid,
    invalidPatternCount: invalid.length,
    invalidCount: invalid.length,
    conflicts,
    conflictCount: conflicts.length
  };
}

function replaceSection(content, title, items) {
  const text = String(content || '');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${title}`);
  const nextItems = Array.isArray(items) && items.length > 0 ? items : ['- [unassigned]'];

  if (start === -1) {
    const suffix = lines.length > 0 && lines[lines.length - 1] === '' ? '' : '\n';
    return `${text}${suffix}\n## ${title}\n${nextItems.join('\n')}\n`;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }

  return `${[
    ...lines.slice(0, start + 1),
    ...nextItems,
    ...lines.slice(end)
  ].join('\n').replace(/\n*$/, '\n')}`;
}

function replaceMetadataLine(content, key, value) {
  const text = String(content || '');
  const pattern = new RegExp(`^-\\s*${key}:\\s*.*$`, 'm');
  if (pattern.test(text)) {
    return text.replace(pattern, `- ${key}: ${value}`);
  }
  return text;
}

module.exports = {
  PARALLEL_RELATIVE_DIR,
  WORKSPACE_MANIFEST_RELATIVE_PATH,
  OWNERSHIP_MAP_RELATIVE_PATH,
  MERGE_PLAN_RELATIVE_PATH,
  buildLaneKey,
  sanitizeScopeLabel,
  buildScopeKey,
  normalizeProjectRelativePath,
  parseWritePathPattern,
  buildLaneOwnershipEntries,
  buildWorkspaceManifest,
  buildOwnershipMap,
  buildMergePlan,
  collectOwnershipConflicts,
  collectWritePathConflicts,
  normalizeDependencyRef,
  extractStatusDependencyItems,
  extractStatusWritePathItems,
  extractStatusMergeRank,
  buildMachineSyncReport,
  collectDependencyIssues,
  buildMergeExecutionReport,
  matchWritePathPattern,
  extractStatusScopeItems,
  replaceSection,
  replaceMetadataLine
};
