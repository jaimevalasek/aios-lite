'use strict';

/**
 * `aioson delivery:parity` — report outstanding work that has not reached git.
 *
 * The same measurement `agent:done` auto-fires, exposed as a command so
 * @committer can open a session with the real shape of the outstanding work
 * (how much, and which areas it splits into) instead of a flat `git status`
 * dump, and so an operator can ask the question directly.
 *
 * Advisory by contract: it always returns `ok: true` with an explicit
 * `exitCode: 0`. `src/cli.js` fails the process on any `ok: false`, so a
 * warn-only command that reported a dirty tree as a failure would break every
 * script that called it.
 */

const { resolveTargetDir } = require('../lib/project-root');
const { measureDeliveryParity } = require('../lib/delivery-parity');

async function runDeliveryParity({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const report = await measureDeliveryParity({
    targetDir,
    threshold: options.threshold || options.max
  });

  if (!options.json) {
    if (report.tier === 'skipped') {
      logger.log(`delivery:parity — skipped (${report.reason})`);
    } else if (report.tier === 'clean') {
      logger.log('delivery:parity — clean: every change is committed.');
    } else {
      const marker = report.tier === 'advisory' ? 'ADVISORY' : report.tier === 'noted' ? 'noted' : 'runtime-only';
      logger.log(`delivery:parity — ${marker}: ${report.reason}`);
      if (report.areas && report.areas.length > 0) {
        logger.log('');
        logger.log('Outstanding by area (the natural commit slices):');
        for (const area of report.areas) {
          logger.log(`  ${String(area.count).padStart(4)}  ${area.area}`);
        }
      }
      logger.log('');
      logger.log(`  staged ${report.staged} · unstaged ${report.unstaged} · untracked ${report.untracked}`);
    }
  }

  return { ...report, exitCode: 0 };
}

module.exports = { runDeliveryParity };
