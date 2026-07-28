'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { getCliVersionSync } = require('./version');

const INSTALL_RELATIVE_PATH = '.aioson/install.json';

function parseSemver(value) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;
  return match.slice(1).map(Number);
}

function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

async function inspectTemplateVersion(targetDir, options = {}) {
  const cliVersion = String(options.cliVersion || getCliVersionSync()).trim();
  const installPath = path.join(targetDir, INSTALL_RELATIVE_PATH);
  let install;
  try {
    install = JSON.parse(await fs.readFile(installPath, 'utf8'));
  } catch (error) {
    const missing = error && error.code === 'ENOENT';
    return {
      status: missing ? 'missing' : 'invalid',
      outdated: false,
      cli_version: cliVersion,
      template_version: null,
      path: INSTALL_RELATIVE_PATH,
      warning: missing
        ? null
        : `[AIOSON template warning] ${INSTALL_RELATIVE_PATH} is invalid; run \`aioson update .\` before relying on workflow routing.`
    };
  }

  const templateVersion = String(install.template_version || '').trim() || null;
  const comparison = compareSemver(templateVersion, cliVersion);
  if (comparison === null) {
    return {
      status: 'unknown',
      outdated: false,
      cli_version: cliVersion,
      template_version: templateVersion,
      path: INSTALL_RELATIVE_PATH,
      warning: `[AIOSON template warning] Cannot compare installed template ${templateVersion || '(missing)'} with CLI ${cliVersion}; run \`aioson update .\` before relying on workflow routing.`
    };
  }

  const outdated = comparison < 0;
  return {
    status: outdated ? 'outdated' : comparison > 0 ? 'ahead' : 'current',
    outdated,
    cli_version: cliVersion,
    template_version: templateVersion,
    path: INSTALL_RELATIVE_PATH,
    warning: outdated
      ? `[AIOSON template warning] Project routing template ${templateVersion} is older than CLI ${cliVersion}. Run \`aioson update .\`; until then, do not bind a new request to the active workflow without \`--expect-feature=<slug>\`.`
      : null
  };
}

module.exports = {
  INSTALL_RELATIVE_PATH,
  parseSemver,
  compareSemver,
  inspectTemplateVersion
};
