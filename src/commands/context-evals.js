'use strict';

const { resolveTargetDir } = require('../lib/project-root');
const { runContextEvals } = require('../lib/context-evals');

// `aioson context:evals [dir] [--json] [--strict] [--filter=<text>] [--no-coverage]`
//
// Advisory by default: a consumer mid-authoring a rule must never have a red
// exit block an unrelated flow. `--strict` is the CI posture — any failed
// check, corpus error, or uncovered artifact fails the process.
async function runContextEvalsCommand({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const report = await runContextEvals(targetDir, {
    filter: options.filter,
    coverage: options.coverage === false || options['no-coverage'] === true ? false : true
  });

  const uncoveredCount = report.coverage ? report.coverage.uncovered.length : 0;
  const strictFailure = options.strict
    && (report.totals.failed > 0 || report.errors.length > 0 || uncoveredCount > 0);
  report.ok = !strictFailure;
  if (strictFailure) report.exitCode = 1;
  else report.exitCode = 0;

  if (options.json) return report;

  if (report.totals.scenarios === 0 && report.errors.length === 0) {
    logger.log('No eval scenarios found under .aioson/evals — nothing to run.');
    logger.log('Author trigger scenarios there to prove your rules, docs, and skills fire on the tasks they claim (see .aioson/evals/README.md).');
    return report;
  }

  logger.log(`Context evals: ${report.totals.scenarios} scenario${report.totals.scenarios === 1 ? '' : 's'}, ${report.totals.checks} checks — ${report.totals.passed} passed, ${report.totals.failed} failed.`);
  logger.log(`Trigger recall (expect): ${(report.totals.positive_pass_rate * 100).toFixed(1)}% · trigger precision (absent): ${(report.totals.negative_pass_rate * 100).toFixed(1)}%.`);

  for (const result of report.results) {
    if (result.passed) continue;
    logger.log(`FAIL ${result.name} [${result.agent}/${result.mode}] (${result.source})`);
    for (const check of result.checks) {
      if (check.passed) continue;
      logger.log(`     - ${check.type} ${check.path} (${check.in})`);
      if (check.diagnosis) {
        if (check.diagnosis.detail) logger.log(`       cause: ${check.diagnosis.cause} — ${check.diagnosis.detail}`);
        else logger.log(`       cause: ${check.diagnosis.cause}`);
        logger.log(`       fix: ${check.diagnosis.suggestion}`);
      }
    }
  }

  for (const error of report.errors) logger.log(`ERROR ${error}`);

  if (report.coverage) {
    logger.log(`Coverage: ${report.coverage.covered}/${report.coverage.universe} routed artifacts named by at least one expect (${(report.coverage.rate * 100).toFixed(1)}%).`);
    for (const item of report.coverage.uncovered.slice(0, 20)) {
      logger.log(`     uncovered: ${item.path} [${item.surface}]`);
    }
    if (report.coverage.uncovered.length > 20) {
      logger.log(`     … and ${report.coverage.uncovered.length - 20} more (use --json for the full list).`);
    }
  }

  return report;
}

module.exports = { runContextEvalsCommand };
