'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { readTextIfExists, exists } = require('../utils');
const { resolveTargetDir } = require('../lib/project-root');
const { summarizeProbes } = require('../lib/qa-probe-results');

async function runQaReport({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const mdPath = path.join(targetDir, 'aios-qa-report.md');
  const jsonPath = path.join(targetDir, 'aios-qa-report.json');

  if (options.json) {
    if (!(await exists(jsonPath))) {
      return { ok: false, error: 'report_not_found', path: jsonPath };
    }
    try {
      const raw = await fs.readFile(jsonPath, 'utf8');
      return { ok: true, ...JSON.parse(raw) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  if (options.html) {
    if (!(await exists(jsonPath))) {
      logger.error(t('qa_report.not_found'));
      process.exitCode = 1;
      return { ok: false, error: 'report_not_found' };
    }
    try {
      const raw = await fs.readFile(jsonPath, 'utf8');
      const data = JSON.parse(raw);
      const { writeHtmlReport } = require('../qa-html-report');
      const screenshotsDir = path.join(targetDir, 'aios-qa-screenshots');
      const result = await writeHtmlReport(
        targetDir, data.project || 'Project', data.url || '',
        data.findings || [], data.ac_coverage || [], data.performance || null,
        data.mode || 'run', screenshotsDir, {
          routes: Array.isArray(data.routes_scanned) ? data.routes_scanned : [],
          execution: Array.isArray(data.probe_results) ? summarizeProbes(data.probe_results) : undefined
        }
      );
      logger.log(t('qa_report.html_report_written', { path: result.htmlPath }));
      return { ok: true, htmlPath: result.htmlPath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  const content = await readTextIfExists(mdPath);
  if (!content) {
    logger.error(t('qa_report.not_found'));
    process.exitCode = 1;
    return { ok: false, error: 'report_not_found' };
  }

  logger.log(content);
  return { ok: true, path: mdPath };
}

module.exports = { runQaReport };
