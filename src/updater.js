'use strict';

const path = require('node:path');
const { detectExistingInstall, installTemplate } = require('./installer');

async function updateInstallation(targetDir, options = {}) {
  const installed = await detectExistingInstall(targetDir);
  if (!installed) {
    return {
      ok: false,
      reason: 'not-installed',
      message: `No AIOSON installation found in ${path.resolve(targetDir)}.`
    };
  }

  const result = await installTemplate(targetDir, {
    overwrite: true,
    dryRun: Boolean(options.dryRun),
    mode: 'update',
    backupOnOverwrite: true,
    frameworkDetection: options.frameworkDetection || null
  });

  return {
    ok: true,
    ...result
  };
}

module.exports = {
  updateInstallation
};
