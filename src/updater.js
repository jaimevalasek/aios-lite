'use strict';

const path = require('node:path');
const {
  detectExistingInstall,
  installTemplate,
  readInstallProfile,
  readInstalledTemplateVersion
} = require('./installer');
const { getCliVersion } = require('./version');
const { migrateProfileRename } = require('./migrations/profile-rename');
const { migrateAgentRename } = require('./migrations/agent-rename');

// Numeric x.y.z compare; returns negative/0/positive, or null when either
// side is unparseable (null disables the downgrade guard rather than guessing).
function compareTemplateVersions(a, b) {
  const parse = (v) => String(v).trim().split('.').map((n) => Number.parseInt(n, 10));
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (Number.isNaN(da) || Number.isNaN(db)) return null;
    if (da !== db) return da - db;
  }
  return 0;
}

async function updateInstallation(targetDir, options = {}) {
  const installed = await detectExistingInstall(targetDir);
  if (!installed) {
    return {
      ok: false,
      reason: 'not-installed',
      message: `No AIOSON installation found in ${path.resolve(targetDir)}.`
    };
  }

  // Downgrade guard — the template copy comes from the installed CLI's own
  // bundle, so a stale global CLI running `update` on a newer project would
  // mass-downgrade every managed file (the "old CLI trap"). Block it and
  // point at the fix; --allow-downgrade is the deliberate escape hatch.
  const cliVersion = await getCliVersion();
  const projectVersion = await readInstalledTemplateVersion(targetDir);
  if (projectVersion && !options.allowDowngrade) {
    const cmp = compareTemplateVersions(cliVersion, projectVersion);
    if (cmp !== null && cmp < 0) {
      return {
        ok: false,
        reason: 'downgrade-blocked',
        cliVersion,
        projectVersion
      };
    }
  }

  const savedProfile = await readInstallProfile(targetDir);

  // Default: sync everything from the template, including files added by the
  // release that aren't yet in the target. Pre-1.9.2 this defaulted to
  // selective and silently dropped new agents/slash commands between versions.
  // `--selective` restores the legacy conservative mode; `--all` is accepted
  // as a backwards-compat no-op since "all" is now the default.
  const selective = Boolean(options.selective) && !options.all;
  const result = await installTemplate(targetDir, {
    overwrite: true,
    dryRun: Boolean(options.dryRun),
    mode: 'update',
    backupOnOverwrite: true,
    frameworkDetection: options.frameworkDetection || null,
    installProfile: savedProfile,
    selectiveUpdate: selective
  });

  // Post-install migrations. Best-effort: a migration failure must not break
  // the update flow. Skip migrations in dry-run mode.
  let profileMigration = { changed: false, file: null };
  let agentRenameMigration = { changed: false, removed: [] };
  if (!options.dryRun) {
    try {
      profileMigration = await migrateProfileRename(targetDir);
    } catch {
      // swallow — migrations are advisory
    }
    try {
      agentRenameMigration = await migrateAgentRename(targetDir);
    } catch {
      // swallow — migrations are advisory
    }
  }

  return {
    ok: true,
    ...result,
    savedProfile,
    migrations: { profileRename: profileMigration, agentRename: agentRenameMigration }
  };
}

module.exports = {
  updateInstallation,
  compareTemplateVersions
};
