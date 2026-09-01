'use strict';

/**
 * Delivery→git parity (advisory measurement).
 *
 * Every done-gate in this framework measures the CONTENT of what an agent
 * produced — the `verify:artifact` kinds, the SG-* static criteria, the
 * contract-integrity gate. None of them measured whether the delivery ever
 * reached git. A session could end with the artifact proven complete and the
 * entire change set still sitting in the working tree, and every gate stayed
 * green: @committer knows exactly how to commit safely, but nothing ever
 * summoned it, and the committer gate in `workflow:next` only fires once a
 * human has already routed there. The result is a class of failure where
 * "done" and "delivered" silently diverge, and the operator is the only
 * detector — having to ask for the commit, every time.
 *
 * This module is the missing number. It is deliberately dumb and
 * deterministic: count what `git status --porcelain` reports, separate
 * authored work from the framework's own runtime churn, group the rest by
 * area so the warning is directed instead of nagging, and let `agent:done`
 * surface it once per session end.
 *
 * Advisory in every tier, by design. A dirty tree at a session end is often
 * legitimate work in flight; a gate that blocked on it would be wrong most of
 * the time and would get switched off — and a gate that is switched off
 * measures nothing. What it must not do is stay silent when a whole wave of
 * work has accumulated unclaimed.
 *
 * Relationship to `harness/git-baseline.js`: that module computes a
 * changed-SET against a recorded baseline for the self-loop guardrails, and
 * collapses the porcelain XY columns into a single status. Parity needs those
 * two columns kept apart to tell staged from unstaged, and needs no baseline.
 */

const path = require('node:path');
const { execFile } = require('node:child_process');

/**
 * Framework-written state. These paths change as a side effect of running the
 * agents themselves (commit-prep.json, verify-artifact-*.json, project-pulse,
 * runtime db). Counting them as authored work would make the advisory fire on
 * every session in every project — the exact false-positive class that gets a
 * gate ignored. They are still reported, just not charged.
 */
const RUNTIME_CHURN_PREFIXES = [
  '.aioson/context/',
  '.aioson/runtime/',
  '.aioson/state/',
  '.aioson/plans/'
];

/**
 * Spec artifacts that live inside `.aioson/context/` are authored work — the
 * PRD, the implementation plan, the feature ledger, the project contract, a
 * feature dossier. They are exactly the deliverables this gate exists to
 * catch, so they are charged even though the directory around them is
 * framework churn.
 */
const AUTHORED_CONTEXT_PATTERNS = [
  /^\.aioson\/context\/prd-[^/]+\.md$/i,
  /^\.aioson\/context\/implementation-plan-[^/]+\.md$/i,
  /^\.aioson\/context\/features\.md$/i,
  /^\.aioson\/context\/project\.context\.md$/i,
  /^\.aioson\/context\/features\/[^/]+\/dossier\.md$/i
];

/** Areas worth naming as their own slice rather than collapsing to the root. */
const CONTAINER_SEGMENTS = new Set(['src', 'template', 'tests', '.aioson', 'bin', 'docs', 'lib', 'app']);

const DEFAULT_THRESHOLD = 10;

function runGit(targetDir, gitArgs, timeoutMs = 15000) {
  return new Promise((resolve) => {
    execFile(
      'git',
      gitArgs,
      { cwd: targetDir, encoding: 'utf8', maxBuffer: 1024 * 1024 * 16, timeout: timeoutMs, windowsHide: true },
      (error, stdout) => {
        if (error) return resolve({ ok: false, stdout: '' });
        resolve({ ok: true, stdout: String(stdout || '') });
      }
    );
  });
}

function unquote(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

/**
 * Parse `git status --porcelain` keeping the index and worktree columns apart.
 * A rename reports the destination path — the side that is actually being
 * delivered. Exported pure so the tier logic is testable without a repo.
 */
function parseParityPorcelain(output) {
  const entries = [];
  for (const rawLine of String(output || '').split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;
    const index = line.charAt(0);
    const worktree = line.charAt(1);
    const rest = line.slice(3);
    const target = rest.includes(' -> ') ? rest.split(' -> ').pop() : rest;
    const filePath = unquote(target).replace(/\\/g, '/');
    if (!filePath) continue;
    entries.push({ path: filePath, index, worktree });
  }
  return entries;
}

function isRuntimeChurn(filePath) {
  if (AUTHORED_CONTEXT_PATTERNS.some((pattern) => pattern.test(filePath))) return false;
  return RUNTIME_CHURN_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

/** Deepest area label worth printing; past this the grouping stops helping. */
const MAX_AREA_DEPTH = 3;

/**
 * Group paths into the coherent slices a commit would follow.
 *
 * One level deep normally, descending while the segment is a pure container
 * that would otherwise swallow unrelated work. `template/` alone says nothing
 * and `template/.aioson` barely more — the real slices under it are
 * `template/.aioson/skills`, `.../docs` and `.../agents`, which are three
 * different commits. The descent is capped so the label stays a slice name
 * rather than turning back into a file list.
 */
function groupByArea(paths) {
  const counts = new Map();
  for (const filePath of paths) {
    const segments = filePath.split('/').filter(Boolean);
    let area;
    if (segments.length <= 1) {
      area = '(root)';
    } else {
      let depth = 1;
      while (
        depth < MAX_AREA_DEPTH &&
        segments.length > depth + 1 &&
        CONTAINER_SEGMENTS.has(segments[depth - 1])
      ) {
        depth += 1;
      }
      area = segments.slice(0, depth).join('/');
    }
    counts.set(area, (counts.get(area) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
}

function resolveThreshold(explicit) {
  const candidates = [explicit, process.env.AIOSON_DELIVERY_PARITY_MAX];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') continue;
    const parsed = Number.parseInt(String(candidate), 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return DEFAULT_THRESHOLD;
}

/**
 * Classify the measurement. `authored` is the charged number: framework
 * runtime churn never raises the tier on its own.
 */
function classify({ authored, runtime, threshold }) {
  if (authored === 0 && runtime === 0) return 'clean';
  if (authored === 0) return 'runtime_only';
  if (authored < threshold) return 'noted';
  return 'advisory';
}

function buildReason({ tier, authored, runtime, areas, threshold }) {
  if (tier === 'clean') return 'working tree clean';
  if (tier === 'runtime_only') return `${runtime} runtime-state file(s) outstanding — framework churn, not authored work`;
  const areaLabel = areas.slice(0, 3).map((a) => `${a.area} (${a.count})`).join(', ');
  const more = areas.length > 3 ? ` +${areas.length - 3} more area(s)` : '';
  const runtimeNote = runtime > 0 ? ` [+${runtime} runtime-state]` : '';
  if (tier === 'noted') {
    return `${authored} authored file(s) outstanding across ${areaLabel}${more}${runtimeNote} — under the ${threshold}-file advisory floor`;
  }
  return `${authored} authored file(s) outstanding across ${areaLabel}${more}${runtimeNote} — this delivery has not reached git; route to @committer (or run \`aioson commit:prepare .\`) before the work grows another wave`;
}

/**
 * Measure delivery→git parity for a directory.
 *
 * Always resolves; never throws. A non-git directory, a missing git binary or
 * a git that times out all return `tier: 'skipped'` — a state, not a finding.
 */
async function measureDeliveryParity({ targetDir, threshold } = {}) {
  const dir = targetDir || process.cwd();
  const limit = resolveThreshold(threshold);

  const inside = await runGit(dir, ['rev-parse', '--is-inside-work-tree']);
  if (!inside.ok || inside.stdout.trim() !== 'true') {
    return { ok: true, git: false, tier: 'skipped', reason: 'not_a_git_repository', threshold: limit };
  }

  // `--untracked-files=all` is load-bearing, not a flourish: plain porcelain
  // collapses a whole new directory into a single `?? src/` entry, so an
  // entire wave of new files would measure as one. Ignored paths stay out
  // either way, so node_modules never enters the count. The `--  .` pathspec
  // scopes the measurement to this project when it lives inside a larger
  // working tree (a monorepo app dir is not charged for its siblings).
  const status = await runGit(dir, ['status', '--porcelain', '--untracked-files=all', '--', '.']);
  if (!status.ok) {
    return { ok: true, git: true, tier: 'skipped', reason: 'git_status_unavailable', threshold: limit };
  }

  // Porcelain paths are repo-root-relative, not cwd-relative. When the
  // project is a subdirectory of the repository, classifying them raw makes
  // `.aioson/context/project-pulse.md` read as `apps/myapp/.aioson/...` —
  // authored, wrongly. Strip the project's own prefix before classifying.
  let projectPrefix = '';
  const top = await runGit(dir, ['rev-parse', '--show-toplevel']);
  if (top.ok && top.stdout.trim()) {
    const rel = path.relative(top.stdout.trim(), path.resolve(dir)).split(path.sep).join('/');
    if (rel && !rel.startsWith('..')) projectPrefix = `${rel}/`;
  }
  const entries = parseParityPorcelain(status.stdout).map((entry) => (
    projectPrefix && entry.path.toLowerCase().startsWith(projectPrefix.toLowerCase())
      ? { ...entry, path: entry.path.slice(projectPrefix.length) }
      : entry
  ));
  const runtimeEntries = entries.filter((e) => isRuntimeChurn(e.path));
  const authoredEntries = entries.filter((e) => !isRuntimeChurn(e.path));

  const staged = entries.filter((e) => e.index !== ' ' && e.index !== '?').length;
  const unstaged = entries.filter((e) => e.worktree !== ' ' && e.worktree !== '?').length;
  const untracked = entries.filter((e) => e.index === '?' && e.worktree === '?').length;

  const areas = groupByArea(authoredEntries.map((e) => e.path));
  const tier = classify({ authored: authoredEntries.length, runtime: runtimeEntries.length, threshold: limit });

  return {
    ok: true,
    git: true,
    tier,
    threshold: limit,
    outstanding: entries.length,
    authored: authoredEntries.length,
    runtime: runtimeEntries.length,
    staged,
    unstaged,
    untracked,
    areas,
    reason: buildReason({ tier, authored: authoredEntries.length, runtime: runtimeEntries.length, areas, threshold: limit })
  };
}

module.exports = {
  measureDeliveryParity,
  parseParityPorcelain,
  groupByArea,
  classify,
  DEFAULT_THRESHOLD,
  RUNTIME_CHURN_PREFIXES
};
