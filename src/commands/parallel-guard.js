'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists } = require('../utils');
const { recordRuntimeOperation } = require('../execution-gateway');
const {
  PARALLEL_RELATIVE_DIR,
  normalizeProjectRelativePath,
  extractStatusWritePathItems,
  matchWritePathPattern,
  collectWritePathConflicts
} = require('../parallel-workspace');

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
  return String(match[1] || '').trim() || fallback;
}

function parseLaneOption(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.floor(num);
}

function parseRequestedPaths(targetDir, value) {
  const items = String(value || '')
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return items.map((item) => {
    const absolute = path.isAbsolute(item) ? item : path.resolve(targetDir, item);
    const relative = path.isAbsolute(item) ? path.relative(targetDir, absolute) : item;
    return {
      raw: item,
      normalized: normalizeProjectRelativePath(relative)
    };
  });
}

async function readLaneState(parallelDir, index) {
  const absPath = path.join(parallelDir, `agent-${index}.status.md`);
  const content = await fs.readFile(absPath, 'utf8');
  return {
    lane: index,
    owner: extractMetadata(content, 'owner', `lane-${index}`),
    status: extractMetadata(content, 'status', 'pending'),
    writePathItems: extractStatusWritePathItems(content)
  };
}

async function runParallelGuard({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const lane = parseLaneOption(options.lane);
  if (lane === null) {
    throw new Error(t('parallel_guard.invalid_lane'));
  }

  const requestedPaths = parseRequestedPaths(targetDir, options.paths);
  if (requestedPaths.length === 0) {
    throw new Error(t('parallel_guard.paths_required'));
  }

  const parallelDir = path.join(targetDir, PARALLEL_RELATIVE_DIR);
  if (!(await exists(parallelDir))) {
    throw new Error(t('parallel_guard.parallel_missing', { path: parallelDir }));
  }

  const entries = await fs.readdir(parallelDir);
  const laneIndices = entries
    .map(parseLaneIndex)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  if (laneIndices.length === 0) {
    throw new Error(t('parallel_guard.no_lanes'));
  }

  if (!laneIndices.includes(lane)) {
    throw new Error(t('parallel_guard.lane_missing', { lane }));
  }

  const lanes = [];
  for (const index of laneIndices) {
    lanes.push(await readLaneState(parallelDir, index));
  }

  const writeScope = collectWritePathConflicts(lanes);
  const targetLane = lanes.find((item) => item.lane === lane);
  const results = requestedPaths.map((item) => {
    if (!item.normalized) {
      return {
        path: item.raw,
        normalizedPath: null,
        ok: false,
        reason: 'invalid_requested_path',
        matchedLanes: []
      };
    }

    const matchedLanes = lanes
      .filter((laneState) =>
        laneState.writePathItems.some((pattern) => matchWritePathPattern(item.normalized, pattern))
      )
      .map((laneState) => laneState.lane);

    if (matchedLanes.length === 0) {
      return {
        path: item.raw,
        normalizedPath: item.normalized,
        ok: false,
        reason: 'unassigned_path',
        matchedLanes
      };
    }

    if (matchedLanes.length > 1) {
      return {
        path: item.raw,
        normalizedPath: item.normalized,
        ok: false,
        reason: 'ambiguous_path_owner',
        matchedLanes
      };
    }

    if (matchedLanes[0] !== lane) {
      return {
        path: item.raw,
        normalizedPath: item.normalized,
        ok: false,
        reason: 'owned_by_other_lane',
        ownerLane: matchedLanes[0],
        matchedLanes
      };
    }

    return {
      path: item.raw,
      normalizedPath: item.normalized,
      ok: true,
      reason: 'allowed',
      ownerLane: lane,
      matchedLanes
    };
  });

  const denied = results.filter((item) => !item.ok);
  const guardReady =
    writeScope.invalidCount === 0 &&
    writeScope.conflictCount === 0 &&
    Array.isArray(targetLane.writePathItems) &&
    targetLane.writePathItems.length > 0;

  const output = {
    ok: guardReady && denied.length === 0,
    targetDir,
    parallelDir,
    lane,
    requestedCount: requestedPaths.length,
    laneWritePathCount: targetLane.writePathItems.length,
    writeScope: {
      laneCount: lanes.filter((item) => item.writePathItems.length > 0).length,
      totalPathCount: lanes.reduce((sum, item) => sum + item.writePathItems.length, 0),
      invalidPatternCount: writeScope.invalidCount,
      invalidPatterns: writeScope.invalidPatterns,
      conflictCount: writeScope.conflictCount,
      conflicts: writeScope.conflicts
    },
    results,
    allowedCount: results.length - denied.length,
    deniedCount: denied.length,
    denied
  };

  output.runtime = await recordRuntimeOperation(targetDir, {
    agentName: 'orchestrator',
    source: 'orchestration',
    sessionKey: 'parallel:workspace',
    title: 'Parallel orchestration workspace',
    goal: 'Prepare and manage parallel development lanes',
    runTitle: 'parallel:guard',
    message: 'Parallel write-scope guard evaluated',
    summary: output.ok
      ? `Lane ${lane} is allowed to write ${output.allowedCount} path(s)`
      : `Lane ${lane} is blocked for ${output.deniedCount} path(s)`,
    eventType: output.ok ? 'parallel.guard_passed' : 'parallel.guard_blocked',
    phase: 'parallel',
    payload: {
      command: 'parallel:guard',
      lane,
      requestedCount: output.requestedCount,
      laneWritePathCount: output.laneWritePathCount,
      writeScope: output.writeScope,
      denied: output.denied
    }
  });

  if (options.json) {
    return output;
  }

  logger.log(
    output.ok
      ? t('parallel_guard.allowed', { lane, count: output.allowedCount })
      : t('parallel_guard.blocked', { lane, count: output.deniedCount })
  );
  logger.log(
    t('parallel_guard.write_scope_summary', {
      paths: output.writeScope.totalPathCount,
      conflicts: output.writeScope.conflictCount,
      invalid: output.writeScope.invalidPatternCount
    })
  );
  for (const result of results) {
    logger.log(
      t('parallel_guard.path_line', {
        path: result.normalizedPath || result.path,
        status: result.ok ? 'allowed' : result.reason,
        owners: result.matchedLanes.join(', ') || '-'
      })
    );
  }

  return output;
}

module.exports = {
  runParallelGuard
};
