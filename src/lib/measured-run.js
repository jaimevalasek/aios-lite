'use strict';

/**
 * Measured-run marker — the deterministic signal that a workspace is a
 * disposable benchmark round root being crossed by the @benchmark traversal
 * orchestrator (Cockpit comparison missions or an equivalent external caller).
 *
 * Every gate relaxation tied to measurement (the `skipped_measured_run`
 * prototype state, the dispensed `briefing:approve`) keys on this file's
 * presence — never on prompt text — so a real interactive project can never
 * inherit the relaxed topology by accident. An unreadable or malformed marker
 * counts as ABSENT: gates stay strict unless the marker proves itself.
 */

const fs = require('node:fs');
const path = require('node:path');

const MEASURED_RUN_MARKER_PATH = '.aioson/benchmark/measured-run.json';
const MEASURED_RUN_MODE = 'measured-run';

// The seven stages the AIOSON side of a measured comparison crosses, in
// order. External observers (the Cockpit) watch one artifact per stage, so
// this list is part of the public traversal contract — keep it in sync with
// `.aioson/docs/benchmark/traversal.md` and the @benchmark kernel.
const TRAVERSAL_CHAIN = Object.freeze([
  'briefing',
  'briefing-refiner',
  'product',
  'sheldon',
  'planner',
  'dev',
  'qa'
]);

/**
 * @param {string} targetDir project/workspace root
 * @returns {{ present: boolean, marker: object|null, path: string, invalid: boolean }}
 */
function readMeasuredRunMarker(targetDir) {
  const markerPath = path.resolve(targetDir, MEASURED_RUN_MARKER_PATH);
  let raw;
  try {
    raw = fs.readFileSync(markerPath, 'utf8');
  } catch {
    return { present: false, marker: null, path: markerPath, invalid: false };
  }
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && !Array.isArray(data) && data.mode === MEASURED_RUN_MODE) {
      return { present: true, marker: data, path: markerPath, invalid: false };
    }
    return { present: false, marker: null, path: markerPath, invalid: true };
  } catch {
    return { present: false, marker: null, path: markerPath, invalid: true };
  }
}

function isMeasuredRun(targetDir) {
  return readMeasuredRunMarker(targetDir).present;
}

module.exports = {
  MEASURED_RUN_MARKER_PATH,
  MEASURED_RUN_MODE,
  TRAVERSAL_CHAIN,
  readMeasuredRunMarker,
  isMeasuredRun
};
