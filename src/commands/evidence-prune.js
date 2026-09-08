'use strict';

/**
 * aioson evidence:prune — remove the regenerable by-products of the visual
 * and browser gates (runtime captures under `visual-screenshots/`, per-step
 * snapshots and screenshots under `browser/{script}/`), never the reports
 * beside them.
 *
 * Default scope: orphans — files the latest report no longer references
 * (a failure snapshot of a step that passes now, a capture of a route since
 * renamed). `--all` removes every artifact file; every report carries the
 * line that regenerates its folder (`Replay:` in a walkthrough report,
 * `verify:artifact --kind=visual --runtime --screenshots` for captures).
 *
 * Usage:
 *   aioson evidence:prune . --dry-run
 *   aioson evidence:prune . --slug=checkout
 *   aioson evidence:prune . --all
 */

const { resolveTargetDir } = require('../lib/project-root');
const { pruneEvidenceArtifacts, formatBytes } = require('../lib/evidence-artifacts');

const REGENERATE_HINT = 'Reports stay in place; a walkthrough report\'s Replay line rewrites its folder, and `aioson verify:artifact . --kind=visual --slug=<feature> --advisory --runtime --screenshots` rewrites the captures.';

async function runEvidencePrune({ args = [], options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const dryRun = Boolean(options['dry-run'] || options.dryRun);
  const all = Boolean(options.all);
  const slug = options.slug ? String(options.slug) : (options.feature ? String(options.feature) : null);
  const jsonOut = Boolean(options.json);

  const result = pruneEvidenceArtifacts(targetDir, { all, slug, dryRun });
  // Housekeeping never fails a shell: the CLI wrapper honors an explicit
  // exitCode before it looks at `ok`.
  const payload = { ok: true, exitCode: 0, targetDir, ...result, hint: REGENERATE_HINT };
  if (jsonOut) return payload;

  const log = (line = '') => { if (logger) logger.log(line); };
  const verb = dryRun ? 'would remove' : 'removed';
  const scope = `${all ? 'every artifact file' : 'orphans only'}${slug ? ` · slug ${slug}` : ''}`;
  log(`evidence:prune — ${verb} ${result.total.files} file(s), ${formatBytes(result.total.bytes)} (${scope})`);
  const touched = result.entries.filter((entry) => entry.removed_files > 0 || entry.files > 0);
  if (touched.length === 0) {
    log('  no evidence artifact folders found — nothing to prune');
  }
  for (const entry of touched) {
    const reference = entry.report ? `report ${entry.report}` : 'no report references this folder';
    log(`  ${entry.path}: ${verb} ${entry.removed_files}/${entry.files} file(s), ${formatBytes(entry.removed_bytes)} — ${entry.kind.replace(/_/g, ' ')} — ${reference}`);
  }
  if (!all && result.entries.some((entry) => entry.kept_files > 0)) {
    log('  kept: the files the latest report still references (pass --all to remove them too)');
  }
  log(`  ${REGENERATE_HINT}`);
  return payload;
}

module.exports = { runEvidencePrune, REGENERATE_HINT };
