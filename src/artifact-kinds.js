'use strict';

/**
 * Canonical map: which agents produce a `verify:artifact`-checkable artifact at
 * session end, the kind, and how that artifact's path is resolved.
 *
 *   needs: 'none'  — self-resolving (fixed path); the engine can prove it at
 *                    `agent:done` with no extra input.
 *   needs: 'slug'  — path keyed by --slug; the agent threads it into agent:done.
 *   needs: 'file'  — date-stamped / caller-known path, threaded via --file.
 *   needs: 'dir'   — a generated-site root, via --dir (advisory static floor only
 *                    at agent:done; the full `npm run build` stays in the agent's
 *                    explicit Done gate).
 *   featureSlugged — the artifact slug IS the feature slug; when no explicit
 *                    --slug was threaded, fall back to --feature so the gate
 *                    still auto-fires from `agent:done`/`agent:epilogue` calls
 *                    that only carry the feature.
 *
 * This is the bridge that makes the periphery's done-gates AUTO-FIRE: instead of
 * relying on each agent to remember its `## Done gate` line, `agent:done` runs the
 * check itself (advisory, best-effort). Keep in sync with the RULESETS/ADAPTERS
 * registry in commands/verify-artifact.js and the per-agent Done gates — it is one
 * of the workflow agent-enumeration sites.
 */
const AGENT_ARTIFACT_KIND = {
  setup: { kind: 'project-context', needs: 'none' },
  discover: { kind: 'bootstrap', needs: 'none' },
  committer: { kind: 'commit-message', needs: 'none' },
  genome: { kind: 'genome', needs: 'slug' },
  'profiler-forge': { kind: 'genome', needs: 'slug' },
  'profiler-researcher': { kind: 'research-report', needs: 'slug' },
  'profiler-enricher': { kind: 'enriched-profile', needs: 'slug' },
  'design-hybrid-forge': { kind: 'hybrid-skill', needs: 'slug' },
  copywriter: { kind: 'copy', needs: 'slug' },
  orache: { kind: 'orache-report', needs: 'file' },
  'site-forge': { kind: 'site', needs: 'dir', opts: { noBuild: true } },
  // The refiner's session end proves BOTH halves of its output: the review
  // surface AND the prototype's measured craft. `skipIfMissing` keeps the
  // visual gate quiet for genuinely non-visual features (no prototype.html).
  'briefing-refiner': {
    kind: 'review', needs: 'slug', featureSlugged: true,
    also: [{ kind: 'visual', needs: 'slug', featureSlugged: true, skipIfMissing: '.aioson/briefings/{slug}/prototype.html' }]
  },
  briefing: { kind: 'briefing', needs: 'slug', featureSlugged: true },
  tester: { kind: 'test-report', needs: 'slug', featureSlugged: true },
  squad: { kind: 'squad-pilot', needs: 'slug' },
  shakedown: { kind: 'shakedown', needs: 'file' }
};

const NEEDS_FLAG = { slug: '--slug=<slug>', file: '--file=<path>', dir: '--dir=<dir>' };

/** Resolve an agent name (with or without a leading @) to its artifact mapping, or null. */
function resolveAgentArtifact(agent) {
  const name = String(agent || '').trim().replace(/^@/, '');
  return AGENT_ARTIFACT_KIND[name] || null;
}

/**
 * Best-effort advisory `verify:artifact` for the calling agent at `agent:done`.
 *
 * Returns `null` when the agent produces no checkable artifact (the common case —
 * product, dev, qa, …). Otherwise a uniform advisory descriptor:
 *   { kind, ok, skipped, issues?, reason }
 * - self-resolving kinds, or locator-keyed kinds whose locator was threaded into
 *   agent:done, run the real check (advisory — never blocks).
 * - a locator-keyed kind with no locator yields `skipped:true` plus a one-line
 *   hint naming the exact command, so it is surfaced instead of silently missing.
 *
 * Never throws — a failure here must never break the session-end registration.
 */
async function verifyAgentArtifact({ targetDir, agent, options = {} }) {
  const mapping = resolveAgentArtifact(agent);
  if (!mapping) return null;

  const runOne = async (m) => {
    const { kind, needs } = m;
    const feature = options.feature ? String(options.feature).trim() : null;
    const slug = options.slug
      ? String(options.slug).trim()
      : (m.featureSlugged && feature ? feature : null);
    const file = options.file ? String(options.file).trim() : null;
    const dir = options.dir ? String(options.dir).trim() : null;

    const missingLocator =
      (needs === 'slug' && !slug) || (needs === 'file' && !file) || (needs === 'dir' && !dir);
    if (missingLocator) {
      const flag = NEEDS_FLAG[needs];
      return {
        kind,
        ok: true,
        skipped: true,
        reason: `needs ${flag} — run: aioson verify:artifact . --kind=${kind} ${flag} --advisory`
      };
    }

    // A secondary kind may only apply when its artifact exists at all (e.g. the
    // visual gate for a non-visual feature with no prototype) — absence is a
    // legitimate state there, not a failure to nag about.
    if (m.skipIfMissing) {
      const rel = m.skipIfMissing.replace('{slug}', slug || '');
      const fs = require('node:fs');
      const path = require('node:path');
      if (!fs.existsSync(path.resolve(targetDir, rel))) {
        return { kind, ok: true, skipped: true, reason: `${rel} not present — nothing to measure` };
      }
    }

    try {
      const { runVerifyArtifact } = require('./commands/verify-artifact');
      const report = await runVerifyArtifact({
        args: [targetDir],
        options: {
          kind,
          slug,
          file,
          dir,
          advisory: true,
          suppressExitCode: true,
          json: true,
          ...(m.opts && m.opts.noBuild ? { 'no-build': true } : {})
        },
        logger: { log() {}, error() {}, warn() {} }
      });
      if (!report) return null;
      const issues = report.issues || [];
      const head = issues.slice(0, 3).join('; ');
      const more = issues.length > 3 ? ` (+${issues.length - 3} more)` : '';
      return {
        kind,
        ok: Boolean(report.ok),
        skipped: false,
        issues,
        reason: report.ok
          ? null
          : `${head}${more} — advisory; see .aioson/context/verify-artifact-${kind}.json`
      };
    } catch {
      return null;
    }
  };

  const primary = await runOne(mapping);
  if (!primary) return null;
  if (Array.isArray(mapping.also) && mapping.also.length > 0) {
    const secondary = [];
    for (const m of mapping.also) {
      const res = await runOne(m);
      if (res) secondary.push(res);
    }
    if (secondary.length > 0) primary.also = secondary;
  }
  return primary;
}

module.exports = { AGENT_ARTIFACT_KIND, resolveAgentArtifact, verifyAgentArtifact };
