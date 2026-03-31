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

  // During update, pass null profile so ALL framework files are installed
  // (not just those matching the saved profile).
  // This ensures new framework files from the new version are always installed.
  // Profile-based filtering only applies to init/install.
  const result = await installTemplate(targetDir, {
    overwrite: true,
    dryRun: Boolean(options.dryRun),
    mode: 'update',
    backupOnOverwrite: true,
    frameworkDetection: options.frameworkDetection || null,
    installProfile: null
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
