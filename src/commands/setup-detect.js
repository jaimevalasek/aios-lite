'use strict';

/**
 * aioson setup:detect — read-only surface over the framework detector.
 *
 * `src/detector.js` (detectFramework + isMonorepoDetection) has always powered
 * `setup:context`, but had no standalone read surface — so the @setup prompt
 * carried its own file-sniffing list and the LLM walked the workspace by hand.
 * One call returns the detected framework, its evidence, confidence, every
 * secondary match, and the monorepo signal. Detection is evidence, not a
 * decision: @setup still confirms the result with the user, and an undetected
 * stack is recorded as the user describes it.
 */

const path = require('node:path');
const { detectFramework, isMonorepoDetection } = require('../detector');

async function runSetupDetect({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  let detection;
  try {
    detection = await detectFramework(targetDir);
  } catch (error) {
    const failure = { ok: false, reason: 'detection_failed', error: error.message };
    if (options.json) return failure;
    logger.error(`setup:detect failed: ${error.message}`);
    return { ...failure, exitCode: 1 };
  }

  const result = {
    ok: true,
    framework: detection.framework,
    installed: detection.installed,
    evidence: detection.evidence,
    confidence: detection.confidence,
    monorepo: isMonorepoDetection(detection),
    matches: detection.matches
  };
  if (options.json) return result;

  if (!detection.framework) {
    logger.log('setup:detect — no framework detected at the project root; record the user-described stack as-is.');
  } else {
    logger.log(`setup:detect — ${detection.framework} (${detection.confidence}; evidence: ${detection.evidence})${result.monorepo ? ' — monorepo signals present' : ''}`);
    for (const match of detection.matches.slice(1)) {
      logger.log(`  also detected: ${match.framework} (${match.confidence}; ${match.evidence})`);
    }
  }
  return result;
}

module.exports = { runSetupDetect };
