'use strict';

/**
 * aioson feature:trace — the PROM→CAP→AC→phase→files chain, precomputed.
 *
 * analyzeFeatureCompleteness already derives the full source-lineage, capability,
 * acceptance, delivery and delta structures for its gate findings — but until now
 * only the findings were surfaced, so Planner, Dev and QA each re-read the
 * briefing, PRD and plan to reconstruct the same chain by hand. This command
 * projects the engine's existing structures into one compact traceability
 * payload; it parses nothing itself and adds no new rule. Malformed tables show
 * up as `gaps[]` (the same findings the gates emit), so a partial map is visible
 * rather than silent.
 */

const path = require('node:path');
const { analyzeFeatureCompleteness } = require('../lib/feature-completeness');
const { resolveTargetDir } = require('../lib/project-root');
const { visualEvidenceBlock, formatVisualEvidence } = require('../lib/visual-evidence');

function upper(value) {
  return String(value || '').toUpperCase();
}

async function runFeatureTrace({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const slug = options.feature ? String(options.feature).trim() : null;
  if (!slug) {
    const failure = { ok: false, reason: 'missing_feature' };
    if (options.json) return failure;
    logger.error('Usage: aioson feature:trace [path] --feature=<slug> [--json]');
    return { ...failure, exitCode: 1 };
  }

  let analysis;
  try {
    analysis = await analyzeFeatureCompleteness(targetDir, slug, {});
  } catch (error) {
    const failure = { ok: false, reason: 'analysis_failed', error: error.message };
    if (options.json) return failure;
    logger.error(`feature:trace failed: ${error.message}`);
    return { ...failure, exitCode: 1 };
  }

  const lineage = analysis.source_lineage || {};
  const coverageByProm = new Map((lineage.coverage || []).map((row) => [upper(row.promise), row]));
  const promises = (lineage.promises || []).map((row) => {
    const covered = coverageByProm.get(upper(row.promise)) || null;
    return {
      prom: row.promise,
      sources: row.sources || [],
      intent: row.intent || null,
      state: row.state || null,
      decision: covered ? covered.decision || null : null,
      caps: covered ? covered.caps || [] : [],
      acs: covered ? covered.acs || [] : [],
      rationale: covered ? covered.rationale || null : null,
      covered: Boolean(covered)
    };
  });

  const productRows = (analysis.product_map && analysis.product_map.rows) || [];
  const requiredCaps = new Set(((analysis.product_map && analysis.product_map.requiredCaps) || []).map(upper));
  const capToAcs = (analysis.acceptance_criteria && analysis.acceptance_criteria.capToAcs) || {};
  const acRows = (analysis.acceptance_criteria && analysis.acceptance_criteria.rows) || [];
  const deliveryRows = (analysis.delivery_plan && analysis.delivery_plan.rows) || [];
  const deltaRows = (analysis.implementation_delta && analysis.implementation_delta.rows) || [];

  const acsForCap = (cap) => capToAcs[cap] || capToAcs[cap.toLowerCase()] || capToAcs[upper(cap)] || [];
  const caps = productRows.map((row) => {
    const cap = upper(row.cap);
    return {
      cap: row.cap,
      required: requiredCaps.has(cap),
      decision: row.decision || null,
      outcome: row.outcome || null,
      acs: acsForCap(String(row.cap)),
      delivery: deliveryRows
        .filter((d) => upper(d.cap) === cap)
        .map((d) => ({ phase: d.phase, files: d.files, verification: d.verification })),
      delta: deltaRows
        .filter((d) => (d.caps || []).some((value) => upper(value) === cap))
        .map((d) => ({ concern: d.concern, decision: d.decision, evidence: d.evidence, target: d.target }))
    };
  });

  // The prototype's measured visual evidence (craft floor, generation tells,
  // materials, palette) rides the same chain QA reads, so the reviewer sees
  // the numbers without re-running the measurement — or sees that a visible
  // surface was never measured. Null when the feature has no prototype.
  const visual = visualEvidenceBlock(targetDir, slug);

  const result = {
    ok: true,
    feature: slug,
    classification: analysis.classification,
    applicable: analysis.applicable,
    activation: analysis.activation,
    promises,
    caps,
    acs: acRows.map((row) => ({ ac: row.ac, caps: row.caps || [], behavior: row.behavior || null })),
    gaps: (analysis.findings || []).map((f) => ({ stage: f.stage, check: f.check, message: f.message })),
    visual,
    summary: analysis.summary || null
  };

  if (options.json) return result;

  logger.log(`feature:trace — ${slug} (${result.classification}${result.applicable ? '' : ' — completeness contract not applicable'})`);
  logger.log(`  promises: ${promises.length} (${promises.filter((p) => p.covered).length} covered)`);
  for (const cap of caps) {
    const phases = cap.delivery.map((d) => d.phase).filter(Boolean).join(',') || '—';
    const files = cap.delivery.flatMap((d) => (Array.isArray(d.files) ? d.files : [d.files])).filter(Boolean);
    logger.log(`  ${cap.cap}${cap.required ? ' [required]' : ''} → ACs: ${cap.acs.join(', ') || '—'} | phase ${phases} | ${files.length} file(s)`);
  }
  const visualLine = formatVisualEvidence(visual);
  if (visualLine) logger.log(`  ${visualLine}`);
  if (result.gaps.length > 0) {
    logger.log(`  gaps: ${result.gaps.length}`);
    for (const gap of result.gaps.slice(0, 8)) logger.log(`    [${gap.stage}] ${gap.check}: ${gap.message}`);
    if (result.gaps.length > 8) logger.log(`    … +${result.gaps.length - 8} more (use --json)`);
  }
  return result;
}

module.exports = { runFeatureTrace };
