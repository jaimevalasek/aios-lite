'use strict';

/**
 * Decide whether the verifier possesses enough evidence to make a visual
 * quality claim. `unverified` is intentionally neither PASS nor FAIL: it keeps
 * truth separate from CLI policy and remains non-blocking unless another
 * concrete issue (or --strict warning promotion) fails the run.
 */
function deriveVisualVerdict({ staticResult, metrics, runtimeRequested = false } = {}) {
  const reasons = [];
  // A hand-authored corpus above the telemetry applicability floor can prove
  // its static axes even when it is intentionally smaller than the 150-rule
  // full-surface craft score. Utility/URL-only corpora are `applicable:false`
  // and therefore need rendered assurance instead of inheriting a green.
  const staticCraftVerified = Boolean(staticResult && staticResult.applicable);
  const runtime = metrics && metrics.runtime;
  const runtimeCraftVerified = Boolean(
    runtime &&
    runtime.available &&
    runtime.assurance &&
    runtime.assurance.craft_verified
  );

  if (runtimeRequested && (!runtime || !runtime.available)) {
    reasons.push((runtime && runtime.reason) || 'rendered runtime assurance was requested but no browser measurement completed');
  }
  if (!staticCraftVerified && !runtimeCraftVerified) {
    const declarations = metrics && Number.isFinite(metrics.declarations) ? metrics.declarations : 0;
    reasons.push(`craft assurance is unavailable: static telemetry measured ${declarations} authored declaration(s), and runtime supplied no verified type, material, motion, media, or chrome evidence`);
  }

  return reasons.length > 0
    ? { verdict: 'unverified', reasons: [...new Set(reasons)], static_craft_verified: staticCraftVerified, runtime_craft_verified: runtimeCraftVerified }
    : { verdict: 'pass', reasons: [], static_craft_verified: staticCraftVerified, runtime_craft_verified: runtimeCraftVerified };
}

module.exports = { deriveVisualVerdict };
