'use strict';

const path = require('node:path');
const { detectExistingInstall, installTemplate, readInstallProfile } = require('./installer');

async function updateInstallation(targetDir, options = {}) {
  const installed = await detectExistingInstall(targetDir);
  if (!installed) {
    return {
      ok: false,
      reason: 'not-installed',
      message: `No AIOSON installation found in ${path.resolve(targetDir)}.`
    };
  }

  const savedProfile = await readInstallProfile(targetDir);

  // Default: only update files already present in the target (selective update).
  // With --all: install every file from the template, including new ones not yet installed.
  const result = await installTemplate(targetDir, {
    overwrite: true,
    dryRun: Boolean(options.dryRun),
    mode: 'update',
    backupOnOverwrite: true,
    frameworkDetection: options.frameworkDetection || null,
    installProfile: null,
    selectiveUpdate: !options.all
  });

  return {
    ok: true,
    ...result,
    savedProfile
  };
}

module.exports = {
  updateInstallation
};
