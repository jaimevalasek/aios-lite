'use strict';

/**
 * aioson feature:diff — the "delivered diff" resolution, side-effect free.
 *
 * The base-resolution chain (explicit --base → baseline.json → merge-base with
 * main/master → feature-start parent → HEAD) was only reachable through
 * `harness:validate`, which expects a plan dir and updates progress state — so
 * scope-check and other reviewers deduced the delivered diff by hand in three
 * of their four modes. This wrapper calls the same engine read-only and returns
 * base + `base_source` (surprising branch topologies stay visible), the changed
 * file list, untracked files, and diff size. `--paths-only` omits nothing the
 * engine computed — it only signals the caller wants the file list, not the
 * payload text.
 */

const path = require('node:path');
const { buildReviewPayload } = require('../harness/review-payload');
const { resolveTargetDir } = require('../lib/project-root');

async function runFeatureDiff({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const slug = options.feature ? String(options.feature).trim() : null;
  if (!slug) {
    const failure = { ok: false, reason: 'missing_feature' };
    if (options.json) return failure;
    logger.error('Usage: aioson feature:diff [path] --feature=<slug> [--base=<ref>] [--paths-only] [--json]');
    return { ...failure, exitCode: 1 };
  }

  const planDir = path.join(targetDir, '.aioson', 'plans', slug);
  const payload = buildReviewPayload(targetDir, planDir, {
    slug,
    baseRef: options.base ? String(options.base) : undefined,
    maxDiffBytes: options['max-diff-bytes'] ? Number(options['max-diff-bytes']) : undefined
  });

  const gitUnavailable = payload.ok === false || payload.base == null;
  const result = {
    ok: !gitUnavailable,
    ...(gitUnavailable ? { reason: 'git_unavailable' } : {}),
    feature: slug,
    base: payload.base ?? null,
    base_source: payload.baseSource ?? null,
    changed_files: payload.changedFiles,
    untracked: payload.untracked,
    diff_bytes: payload.diffBytes,
    diff_truncated: payload.truncated
  };
  if (options.json) return result;

  logger.log(`feature:diff — ${slug}: base ${result.base || '(unresolved)'} (${result.base_source || 'git unavailable'})`);
  logger.log(`  ${result.changed_files.length} changed file(s), ${result.untracked.length} untracked, diff ${result.diff_bytes} bytes${result.diff_truncated ? ' (truncated)' : ''}`);
  if (!options['paths-only']) {
    for (const file of result.changed_files.slice(0, 40)) logger.log(`  ${file.status}\t${file.path}`);
    if (result.changed_files.length > 40) logger.log(`  … +${result.changed_files.length - 40} more (use --json)`);
  } else {
    for (const file of result.changed_files) logger.log(`  ${file.path}`);
  }
  return result;
}

module.exports = { runFeatureDiff };
