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

let fallbackTranslator = null;
function resolveTranslator(t) {
  if (typeof t === 'function') return t;
  if (!fallbackTranslator) {
    const { createTranslator } = require('../i18n');
    fallbackTranslator = createTranslator('en');
  }
  return fallbackTranslator;
}

/**
 * The one human sentence for a parity report, localized. Shared with the
 * `agent:done` epilogue line so the two surfaces never drift. The JSON
 * `reason` field stays canonical English — this is the rendering, not the
 * measurement.
 */
function parityLine(report, t) {
  const tr = resolveTranslator(t);
  if (report.tier === 'clean') return tr('delivery_parity.clean');
  if (report.tier === 'skipped') {
    const detail = report.reason === 'not_a_git_repository'
      ? tr('delivery_parity.not_a_git_repository')
      : tr('delivery_parity.git_status_unavailable');
    return tr('delivery_parity.skipped', { detail });
  }
  const listed = (report.areas || []).slice(0, 3).map((area) => `${area.area} (${area.count})`).join(', ');
  const more = (report.areas || []).length > 3 ? ` +${report.areas.length - 3}` : '';
  const params = {
    authored: report.authored,
    runtime: report.runtime,
    threshold: report.threshold,
    areas: `${listed}${more}`
  };
  if (report.tier === 'runtime_only') return tr('delivery_parity.runtime_only', params);
  if (report.tier === 'noted') return tr('delivery_parity.noted', params);
  return tr('delivery_parity.advisory', params);
}

async function runDeliveryParity({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const tr = resolveTranslator(t);
  const report = await measureDeliveryParity({
    targetDir,
    threshold: options.threshold || options.max
  });

  if (!options.json) {
    logger.log(parityLine(report, tr));
    if (!['skipped', 'clean'].includes(report.tier)) {
      if (report.areas && report.areas.length > 0) {
        logger.log('');
        logger.log(tr('delivery_parity.by_area'));
        for (const area of report.areas) {
          logger.log(`  ${String(area.count).padStart(4)}  ${area.area}`);
        }
      }
      logger.log('');
      logger.log(`  ${tr('delivery_parity.counts', { staged: report.staged, unstaged: report.unstaged, untracked: report.untracked })}`);
    }
  }

  return { ...report, exitCode: 0 };
}

module.exports = { runDeliveryParity, parityLine };
