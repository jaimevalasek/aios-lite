'use strict';

const fs = require('node:fs');
const { resolveBriefingPath } = require('./briefing-paths');
const { isMeasuredRun } = require('../measured-run');

// A briefing is explicitly non-visual only when it records the decision as a
// machine-checkable line (frontmatter or body) or inside a Prototype contract
// section. Prose mentions never count — the gate must stay deterministic.
const NON_VISUAL_LINE = /^(?:prototype|prototype_status):\s*(?:not_applicable|not-applicable|none)\s*$/im;
const NON_VISUAL_SECTION = /##\s+Prototype contract[\s\S]*?\bstatus:\s*(?:not_applicable|not-applicable|none)\b/i;

function declaresNonVisual(briefingContent) {
  const text = String(briefingContent || '');
  return NON_VISUAL_LINE.test(text) || NON_VISUAL_SECTION.test(text);
}

// Deterministic prototype state shared by briefing:approve (the gate),
// briefing:apply-feedback (next action), and verify:artifact --kind=briefing
// (early warning):
//   'prototype'            — prototype.html exists; manifest checks happen at approve time
//   'non_visual'           — the briefing explicitly records prototype: not_applicable
//   'skipped_measured_run' — no prototype AND the workspace carries the measured-run
//                            marker: the traversal deliberately skips the prototype
//                            stage without claiming the feature is non-visual
//   'missing'              — neither; briefing:approve refuses with prototype_resolution_missing
function resolvePrototypeState(projectDir, slug, briefingContent) {
  const prototypePath = resolveBriefingPath(projectDir, slug, 'prototype.html');
  if (fs.existsSync(prototypePath)) return { state: 'prototype', prototypePath };
  if (declaresNonVisual(briefingContent)) return { state: 'non_visual', prototypePath };
  if (isMeasuredRun(projectDir)) return { state: 'skipped_measured_run', prototypePath };
  return { state: 'missing', prototypePath };
}

module.exports = { declaresNonVisual, resolvePrototypeState };
