'use strict';

const path = require('node:path');
const { REQUIRED_FILES } = require('./constants');
const { exists } = require('./utils');
const { validateProjectContextFile } = require('./context');

function parseMajor(version) {
  const cleaned = String(version || '').replace(/^v/, '');
  const major = Number(cleaned.split('.')[0]);
  return Number.isFinite(major) ? major : 0;
}

async function runDoctor(targetDir) {
  const checks = [];

  for (const rel of REQUIRED_FILES) {
    const filePath = path.join(targetDir, rel);
    checks.push({
      id: `file:${rel}`,
      key: 'doctor.required_file',
      params: { rel },
      ok: await exists(filePath)
    });
  }

  const contextPath = path.join(targetDir, '.aios-lite/context/project.context.md');
  checks.push({
    id: 'context:project',
    key: 'doctor.context_generated',
    params: {},
    ok: await exists(contextPath),
    hintKey: 'doctor.context_hint'
  });

  const contextValidation = await validateProjectContextFile(targetDir);
  if (contextValidation.exists) {
    checks.push({
      id: 'context:frontmatter',
      key: 'doctor.context_frontmatter_valid',
      params: {},
      ok: contextValidation.parsed,
      hintKey: contextValidation.parsed ? undefined : 'doctor.context_frontmatter_valid_hint'
    });

    for (const issue of contextValidation.issues) {
      checks.push({
        id: issue.id,
        key: issue.key,
        params: issue.params || {},
        ok: false,
        hintKey: issue.hintKey
      });
    }
  }

  const major = parseMajor(process.version);
  checks.push({
    id: 'node:version',
    key: 'doctor.node_version',
    params: { version: process.version },
    ok: major >= 18
  });

  const failed = checks.filter((c) => !c.ok);

  return {
    ok: failed.length === 0,
    checks,
    failedCount: failed.length,
    contextValidation
  };
}

module.exports = {
  runDoctor,
  parseMajor
};
