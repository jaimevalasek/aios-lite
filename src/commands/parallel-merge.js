'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists } = require('../utils');
const { recordRuntimeOperation } = require('../execution-gateway');
const {
  PARALLEL_RELATIVE_DIR,
  WORKSPACE_MANIFEST_RELATIVE_PATH,
  OWNERSHIP_MAP_RELATIVE_PATH,
  MERGE_PLAN_RELATIVE_PATH,
  buildLaneOwnershipEntries,
  collectOwnershipConflicts,
  collectWritePathConflicts,
  extractStatusScopeItems,
  extractStatusDependencyItems,
  extractStatusMergeRank,
  extractStatusWritePathItems,
  buildMachineSyncReport,
  collectDependencyIssues,
  buildMergeExecutionReport,
  replaceSection,
  replaceMetadataLine
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

async function readJsonIfExists(filePath) {
  if (!(await exists(filePath))) return null;
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function readLaneState(parallelDir, index) {
  const relPath = path.join(PARALLEL_RELATIVE_DIR, `agent-${index}.status.md`).replace(/\\/g, '/');
  const absPath = path.join(parallelDir, `agent-${index}.status.md`);
  const content = await fs.readFile(absPath, 'utf8');
  return {
    lane: index,
    file: relPath,
    absPath,
    content,
    status: extractMetadata(content, 'status', 'pending'),
    owner: extractMetadata(content, 'owner', `lane-${index}`),
    scopeItems: extractStatusScopeItems(content),
    dependencyItems: extractStatusDependencyItems(content),
    writePathItems: extractStatusWritePathItems(content),
    mergeRank: extractStatusMergeRank(content, index)
  };
}

function appendDecisionRow(content, generatedAt, laneCount, mergeOrder) {
  const row =
    `| ${generatedAt} | Deterministic merge executed | ` +
    `All lanes merged in declared order | lanes=${laneCount}, order=${mergeOrder.join(', ')} |`;
  const text = String(content || '');

  if (!text.includes('| time | decision | rationale | impact |')) {
    const suffix = text.endsWith('\n') ? '' : '\n';
    return `${text}${suffix}\n## Decision Log\n| time | decision | rationale | impact |\n|------|----------|-----------|--------|\n${row}\n`;
  }

  return `${text.replace(/\n*$/, '\n')}${row}\n`;
}

function buildStructuralSummary({ sharedExists, machineFiles, sync, ownershipConflicts, dependencies, writeScope }) {
  const missingMachineFiles = Object.entries(machineFiles)
    .filter(([, existsFlag]) => !existsFlag)
    .map(([key]) => key);

  return {
    sharedDecisionsExists: sharedExists,
    machineFiles,
    missingMachineFiles,
    sync,
    ownershipConflictCount: ownershipConflicts.length,
    writeScopeConflictCount: writeScope.conflictCount,
    invalidWritePathCount: writeScope.invalidCount,
    invalidDependencyCount: dependencies.invalidCount,
    blockedDependencyCount: dependencies.blockedCount,
    orderViolationCount: dependencies.orderViolationCount
  };
}

async function runParallelMerge({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const apply = Boolean(options.apply);
  const generatedAt = new Date().toISOString();
  const parallelDir = path.join(targetDir, PARALLEL_RELATIVE_DIR);

  if (!(await exists(parallelDir))) {
    throw new Error(t('parallel_merge.parallel_missing', { path: parallelDir }));
  }

  const entries = await fs.readdir(parallelDir);
  const laneIndices = entries
    .map(parseLaneIndex)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  if (laneIndices.length === 0) {
    throw new Error(t('parallel_merge.no_lanes'));
  }

  const lanes = [];
  for (const index of laneIndices) {
    lanes.push(await readLaneState(parallelDir, index));
  }

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

  const sharedPath = path.join(parallelDir, 'shared-decisions.md');
  const sharedExists = await exists(sharedPath);
  const workspaceManifestPath = path.join(targetDir, WORKSPACE_MANIFEST_RELATIVE_PATH);
  const ownershipPath = path.join(targetDir, OWNERSHIP_MAP_RELATIVE_PATH);
  const mergePlanPath = path.join(targetDir, MERGE_PLAN_RELATIVE_PATH);
  const workspaceManifest = await readJsonIfExists(workspaceManifestPath);
  const ownershipMap = await readJsonIfExists(ownershipPath);
  const mergePlan = await readJsonIfExists(mergePlanPath);

  const machineFiles = {
    workspaceManifest: Boolean(workspaceManifest),
    ownershipMap: Boolean(ownershipMap),
    mergePlan: Boolean(mergePlan)
  };
  const sync = buildMachineSyncReport({
    laneEntries,
    workspaceManifest,
    ownershipMap,
    mergePlan
  });
  const ownershipConflicts = collectOwnershipConflicts(ownershipMap);
  const dependencies = collectDependencyIssues({
    lanes,
    mergeOrder: mergePlan && Array.isArray(mergePlan.order) ? mergePlan.order : []
  });
  const writeScope = collectWritePathConflicts(lanes);
  const execution = buildMergeExecutionReport({
    lanes,
    mergeOrder: mergePlan && Array.isArray(mergePlan.order) ? mergePlan.order : []
  });
  const structural = buildStructuralSummary({
    sharedExists,
    machineFiles,
    sync,
    ownershipConflicts,
    dependencies,
    writeScope
  });

  const mergeReady =
    structural.sharedDecisionsExists &&
    structural.missingMachineFiles.length === 0 &&
    structural.sync.staleFiles.length === 0 &&
    structural.ownershipConflictCount === 0 &&
    structural.writeScopeConflictCount === 0 &&
    structural.invalidWritePathCount === 0 &&
    structural.invalidDependencyCount === 0 &&
    structural.orderViolationCount === 0 &&
    execution.readyToApply;

  const filesUpdated = [];
  let sharedDecisionUpdated = false;

  if (apply && mergeReady) {
    for (let index = 0; index < execution.plan.length; index += 1) {
      const item = execution.plan[index];
      if (item.action !== 'merge') continue;

      const lane = lanes.find((candidate) => candidate.lane === item.lane);
      let next = replaceMetadataLine(lane.content, 'status', 'merged');
      next = replaceMetadataLine(next, 'updated_at', generatedAt);
      next = replaceSection(next, 'Merge', [
        `- merge_rank: ${item.mergeRank}`,
        '- merge_strategy: lane-index-asc',
        `- merged_at: ${generatedAt}`,
        `- merged_order: ${index + 1}`
      ]);
      await fs.writeFile(lane.absPath, next, 'utf8');
      filesUpdated.push(lane.file);
    }

    if (sharedExists) {
      const sharedContent = await fs.readFile(sharedPath, 'utf8');
      const nextShared = appendDecisionRow(sharedContent, generatedAt, execution.order.length, execution.order);
      await fs.writeFile(sharedPath, nextShared, 'utf8');
      filesUpdated.push(path.join(PARALLEL_RELATIVE_DIR, 'shared-decisions.md').replace(/\\/g, '/'));
      sharedDecisionUpdated = true;
    }
  }

  const output = {
    ok: mergeReady,
    targetDir,
    apply,
    generatedAt,
    laneCount: lanes.length,
    structural,
    merge: {
      strategy: mergePlan && mergePlan.strategy ? mergePlan.strategy : 'lane-index-asc',
      order: execution.order,
      readyToApply: mergeReady,
      readyLaneCount: execution.readyLaneCount,
      alreadyMergedCount: execution.alreadyMergedCount,
      blockedCount: execution.blockedCount,
      blocked: execution.blocked,
      plan: execution.plan
    },
    filesUpdated,
    sharedDecisionUpdated
  };

  output.runtime = await recordRuntimeOperation(targetDir, {
    agentName: 'orchestrator',
    source: 'orchestration',
    sessionKey: 'parallel:workspace',
    title: 'Parallel orchestration workspace',
    goal: 'Prepare and manage parallel development lanes',
    runTitle: 'parallel:merge',
    message: apply ? 'Parallel deterministic merge requested' : 'Parallel deterministic merge inspected',
    summary: mergeReady
      ? `Parallel merge ready for ${output.laneCount} lanes`
      : `Parallel merge blocked for ${output.merge.blockedCount} lane(s)`,
    eventType: apply && mergeReady ? 'parallel.merged' : 'parallel.merge_checked',
    phase: 'parallel',
    payload: {
      command: 'parallel:merge',
      apply,
      laneCount: output.laneCount,
      structural: output.structural,
      merge: output.merge,
      filesUpdated
    }
  });

  if (options.json) {
    return output;
  }

  logger.log(
    mergeReady
      ? apply
        ? t('parallel_merge.applied', { count: output.merge.readyLaneCount })
        : t('parallel_merge.ready', { count: output.merge.readyLaneCount })
      : t('parallel_merge.blocked', { count: output.merge.blockedCount })
  );
  logger.log(t('parallel_merge.order', { order: output.merge.order.join(', ') }));
  logger.log(
    t('parallel_merge.structural_summary', {
      stale: output.structural.sync.staleFiles.length,
      conflicts: output.structural.ownershipConflictCount,
      writeConflicts: output.structural.writeScopeConflictCount,
      invalidWritePaths: output.structural.invalidWritePathCount,
      invalid: output.structural.invalidDependencyCount,
      blocked: output.structural.blockedDependencyCount,
      orderViolations: output.structural.orderViolationCount
    })
  );
  for (const item of output.merge.plan) {
    logger.log(
      t('parallel_merge.lane_line', {
        lane: item.lane,
        action: item.action,
        status: item.status || 'n/a'
      })
    );
  }

  return output;
}

module.exports = {
  runParallelMerge
};
