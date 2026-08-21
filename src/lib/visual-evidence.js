'use strict';

/**
 * The feature's visual evidence slot.
 *
 * `verify:artifact --kind=visual` persists its latest run to
 * `.aioson/context/verify-artifact-visual.json` — one slot per kind, like
 * audit:code, so the refiner's prototype run, a squad's pilot run and a dev's
 * `--dir` run over the shipped front-end all overwrite each other. The numbers
 * a reviewer needs (craft floor, generation tells, materials, palette) were
 * therefore logged once and discarded: nothing downstream ever read them.
 *
 * A feature-owned measurement (pure `--slug` mode) is also written here, under
 * the feature's own directory, where nothing else overwrites it. feature:trace
 * surfaces it to QA and feature:close records it at closure — advisory in both
 * places: the numbers travel with the feature; they never grant or block a gate.
 */

const fs = require('node:fs');
const path = require('node:path');

const VISUAL_EVIDENCE_FILE = 'visual-evidence.json';
// The implementation's measurement (the implementers' session end, held to the
// prototype's floor) — the other half of the feature's visual record.
const VISUAL_IMPLEMENTATION_FILE = 'visual-implementation.json';

function visualEvidencePath(targetDir, slug) {
  return path.join(targetDir, '.aioson', 'context', 'features', slug, VISUAL_EVIDENCE_FILE);
}

function prototypePath(targetDir, slug) {
  return path.join(targetDir, '.aioson', 'briefings', slug, 'prototype.html');
}

function readVisualReport(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && parsed.kind === 'visual' ? parsed : null;
  } catch {
    return null;
  }
}

/** The persisted kind=visual report of a feature's prototype, or null. */
function readVisualEvidence(targetDir, slug) {
  return readVisualReport(visualEvidencePath(targetDir, slug));
}

/** The persisted kind=visual report of a feature's implementation, or null. */
function readVisualImplementation(targetDir, slug) {
  return readVisualReport(path.join(targetDir, '.aioson', 'context', 'features', slug, VISUAL_IMPLEMENTATION_FILE));
}

/** One line of the numbers a reviewer needs — the verdict of the measurement, not its prose. */
function summarizeVisualEvidence(report) {
  const m = (report && report.metrics) || {};
  const parts = [];
  if (m.craft && m.craft.measured) {
    parts.push(`craft ${m.craft.active_levers}/${m.craft.lever_count || 5}`, `materials ${m.craft.material_depth ?? 0}/7`);
  }
  parts.push(`tells ${m.tells ? m.tells.active : 0}`);
  if (m.palette && m.palette.accent_hue != null && m.palette.ground) {
    parts.push(`accent ~${m.palette.accent_hue}° on ${m.palette.ground.pole}`);
  }
  if (m.runtime && m.runtime.available) parts.push('runtime measured');
  parts.push(`${(report.issues || []).length} issue(s)`, `${(report.warnings || []).length} warning(s)`);
  return parts.join(' | ');
}

/**
 * The reviewer-facing visual block for a feature: the persisted measurement,
 * or the named reason none exists. `null` when the feature has no visible
 * surface — the absence of a prototype is a state, not a finding.
 */
function visualEvidenceBlock(targetDir, slug) {
  const proto = prototypePath(targetDir, slug);
  const hasPrototype = fs.existsSync(proto);
  const report = readVisualEvidence(targetDir, slug);
  const implementationReport = readVisualImplementation(targetDir, slug);
  const conformance = (implementationReport && implementationReport.metrics && implementationReport.metrics.conformance) || null;
  const implementation = implementationReport
    ? {
      measured_at: implementationReport.measured_at || null,
      summary: summarizeVisualEvidence(implementationReport),
      regressed: (conformance && conformance.regressed) || [],
      // No regressions on zero compared axes is silence, not a pass. The
      // reviewer line carries which state this actually is.
      conformance_state: (conformance && conformance.state) || 'not-compared',
      not_compared: (conformance && conformance.not_compared) || [],
      conformance_reason: (conformance && conformance.reason) || null,
      evidence: `.aioson/context/features/${slug}/${VISUAL_IMPLEMENTATION_FILE}`
    }
    : null;
  if (!report && !hasPrototype && !implementation) return null;
  if (!report) {
    return {
      measured: false,
      prototype: hasPrototype,
      stale: false,
      reason: hasPrototype
        ? `prototype present but never measured — run: aioson verify:artifact . --kind=visual --slug=${slug} --advisory`
        : 'no prototype recorded for this feature',
      summary: null,
      implementation
    };
  }
  // A prototype edited after its measurement carries numbers for a surface
  // that no longer exists.
  let stale = false;
  if (hasPrototype && report.measured_at) {
    try {
      stale = fs.statSync(proto).mtimeMs > Date.parse(report.measured_at) + 1000;
    } catch {
      stale = false;
    }
  }
  return {
    measured: true,
    prototype: hasPrototype,
    stale,
    measured_at: report.measured_at || null,
    ok: Boolean(report.ok),
    issues: (report.issues || []).length,
    warnings: (report.warnings || []).length,
    summary: summarizeVisualEvidence(report),
    evidence: `.aioson/context/features/${slug}/${VISUAL_EVIDENCE_FILE}`,
    implementation
  };
}

/**
 * What the implementation's comparison to the prototype actually says. An
 * empty `regressed` list on a comparison that never ran is not a floor held —
 * the reviewer reads which of the two it is.
 */
function conformanceVerdict(implementation) {
  if (implementation.regressed.length > 0) return ` — REGRESSED vs prototype: ${implementation.regressed.join(', ')}`;
  if (implementation.conformance_state === 'not-compared') {
    return ` — NOT compared to a prototype floor${implementation.conformance_reason ? `: ${implementation.conformance_reason}` : ''}`;
  }
  if (implementation.not_compared.length > 0) return ` — holds the prototype floor (${implementation.not_compared.join(', ')} not compared)`;
  return '';
}

/** Human line for the block — the same text in feature:trace and feature:close. */
function formatVisualEvidence(block) {
  if (!block) return null;
  const implementation = block.implementation
    ? ` | implementation: ${block.implementation.summary}${conformanceVerdict(block.implementation)}`
    : '';
  if (!block.measured) return `visual evidence: ${block.reason}${implementation}`;
  return `visual evidence: ${block.summary}${block.stale ? ' — STALE: the prototype changed after this measurement; re-run kind=visual' : ''} (${block.evidence})${implementation}`;
}

module.exports = {
  VISUAL_EVIDENCE_FILE,
  VISUAL_IMPLEMENTATION_FILE,
  visualEvidencePath,
  readVisualEvidence,
  readVisualImplementation,
  summarizeVisualEvidence,
  visualEvidenceBlock,
  formatVisualEvidence
};
