'use strict';

const path = require('node:path');
const { createWorktree, mergeWorktree, cleanupWorktree, listWorktrees } = require('../squad/worktree-manager');
const { resolveTargetDir } = require('../lib/project-root');

async function runSquadWorktrees({ args, options, logger }) {
  const projectDir = resolveTargetDir(args);
  const squadSlug = options.squad || args[1];

  if (!squadSlug) {
    logger.error('Squad slug required. Use --squad <slug>');
    return { ok: false };
  }

  // --cleanup [agent]
  if (options.cleanup !== undefined) {
    const agentSlug = typeof options.cleanup === 'string' ? options.cleanup : null;
    if (agentSlug) {
      const result = cleanupWorktree(projectDir, squadSlug, agentSlug, true);
      logger.log(result.ok ? `Worktree for "${agentSlug}" removed.` : `Failed to remove worktree for "${agentSlug}".`);
      return result;
    }
    // cleanup all for squad
    const worktrees = listWorktrees(projectDir, squadSlug);
    if (worktrees.length === 0) {
      logger.log(`No worktrees found for squad "${squadSlug}".`);
      return { ok: true };
    }
    for (const wt of worktrees) {
      const result = cleanupWorktree(projectDir, squadSlug, wt.agentSlug, false);
      logger.log(result.ok ? `  Removed: ${wt.agentSlug}` : `  Failed:  ${wt.agentSlug}`);
    }
    return { ok: true };
  }

  // List
  const worktrees = listWorktrees(projectDir, squadSlug);
  if (worktrees.length === 0) {
    logger.log(`No worktrees found for squad "${squadSlug}".`);
    return { ok: true, worktrees: [] };
  }

  logger.log(`Worktrees for "${squadSlug}" (${worktrees.length}):`);
  for (const wt of worktrees) {
    logger.log(`  ${wt.agentSlug}  branch:${wt.branch}  path:${wt.path}`);
  }
  return { ok: true, worktrees };
}

async function runSquadMerge({ args, options, logger }) {
  const projectDir = resolveTargetDir(args);
  const squadSlug = options.squad || args[1];
  const agentSlug = options.agent || args[2];

  if (!squadSlug || !agentSlug) {
    logger.error('Usage: aioson squad:merge <project> --squad <squad> --agent <agent>');
    return { ok: false };
  }

  const autoMerge = options['no-auto'] !== true;
  const result = mergeWorktree(projectDir, squadSlug, agentSlug, autoMerge);

  if (result.ok) {
    logger.log(`Merged branch ${result.branch} successfully.`);
  } else if (result.reason === 'merge_conflict') {
    logger.error(`Merge conflict on ${result.branch}. Resolve manually.`);
    if (result.detail) logger.error(result.detail);
  } else if (result.reason === 'auto_merge_disabled') {
    logger.log(`Auto-merge disabled. Branch ready: ${result.branch}`);
  }

  return result;
}

module.exports = { runSquadWorktrees, runSquadMerge };
