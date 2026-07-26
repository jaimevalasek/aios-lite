'use strict';

const { readFileSafe, parseFrontmatter } = require('../preflight-engine');
const { reviewStatus } = require('../review-intelligence/engine');

async function validateCurrentSheldonReview(targetDir, slug, prdPath) {
  const prd = await readFileSafe(prdPath);
  const marker = String(parseFrontmatter(prd || '').sheldon_review || '').toLowerCase();
  if (marker !== 'approved') {
    return {
      ok: false,
      reason: 'sheldon_marker_not_approved',
      message: 'PRD sheldon_review must be approved before Planner.'
    };
  }

  let status;
  try {
    status = await reviewStatus({ rootDir: targetDir, featureSlug: slug });
  } catch (error) {
    return {
      ok: false,
      reason: 'sheldon_review_status_unavailable',
      message: `Cannot validate the hash-bound Sheldon review: ${error.message}`
    };
  }

  const sheldon = (status.agents || []).find((item) => item.agent === 'sheldon');
  if (!status.ok || !sheldon || sheldon.review_status !== 'pass') {
    return {
      ok: false,
      reason: !status.ok ? 'sheldon_review_stale' : 'sheldon_review_not_passed',
      message: !status.ok
        ? 'The Sheldon review is stale or invalid for the current PRD/authorities.'
        : 'A current hash-bound Sheldon PASS review is required before Planner.',
      status
    };
  }

  return {
    ok: true,
    reason: null,
    message: 'Current PRD has a hash-bound Sheldon PASS review.',
    report_path: sheldon.report_path,
    packet_id: sheldon.packet_id,
    status
  };
}

module.exports = {
  validateCurrentSheldonReview
};
