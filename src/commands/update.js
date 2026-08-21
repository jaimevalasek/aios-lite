'use strict';

// Namespace require (no destructuring) so tests can stub installDefaultHooks'
// inner runHooksInstall — the real thing mutates machine-global settings.
const hooksInstall = require('./hooks-install');
const { detectFramework } = require('../detector');
const { updateInstallation } = require('../updater');
const { listManagedTrackedIgnoredPaths, formatTrackedIgnoredRemedyOperands } = require('../installer');
const { validateProjectContextFile, getInteractionLanguage } = require('../context');
const { applyAgentLocale } = require('../locales');
const { getCliVersionLabelSync } = require('../version');
const { resolveTargetDir } = require('../lib/project-root');

async function runUpdate({ args, options, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const dryRun = Boolean(options['dry-run']);
  const all = Boolean(options.all);
  const selective = Boolean(options.selective);
  const requestedLanguage = options.lang || options.language;

  const detection = await detectFramework(targetDir);
  const result = await updateInstallation(targetDir, {
    dryRun,
    all,
    selective,
    allowDowngrade: Boolean(options['allow-downgrade']),
    frameworkDetection: detection.framework
  });

  if (!result.ok) {
    if (result.reason === 'downgrade-blocked') {
      throw new Error(t('update.downgrade_blocked', {
        cliVersion: result.cliVersion,
        projectVersion: result.projectVersion
      }));
    }
    throw new Error(t('update.not_installed', { targetDir }));
  }

  let localeSync = null;
  if (!dryRun || requestedLanguage) {
    const context = await validateProjectContextFile(targetDir);
    const language =
      requestedLanguage ||
      (context.parsed && context.data
        ? getInteractionLanguage(context.data, '')
        : null) ||
      (result.savedProfile && result.savedProfile.locale
        ? result.savedProfile.locale
        : 'en');
    localeSync = await applyAgentLocale(targetDir, language, { dryRun, selectiveUpdate: selective && !all });
  }

  logger.log(t('update.done_at', { targetDir }));
  // Surface WHICH template landed — stale-template updates used to be silent
  // (the copy comes from the installed CLI's own bundle, not from npm latest).
  logger.log(t('update.template_version', { version: getCliVersionLabelSync() }));
  logger.log(t('update.files_updated', { count: result.copied.length }));
  logger.log(t('update.backups_created', { count: result.backedUp.length }));
  if (result.migrations && result.migrations.profileRename && result.migrations.profileRename.changed) {
    logger.log('');
    logger.log(t('update.profile_renamed'));
  }
  if (!dryRun) {
    logger.log('');
    logger.log(t('update.reconfigure_hint'));
  }
  const trackedIgnored = listManagedTrackedIgnoredPaths(targetDir);
  if (trackedIgnored.length > 0) {
    logger.log('');
    logger.log(t('update.tracked_ignored_found', { count: trackedIgnored.length }));
    trackedIgnored.slice(0, 10).forEach((relPath) => logger.log(`    - ${relPath}`));
    logger.log(t('update.tracked_ignored_remedy', { paths: formatTrackedIgnoredRemedyOperands(trackedIgnored).join(' ') }));
  }
  if (localeSync) {
    if (dryRun) {
      logger.log(t('locale_apply.dry_run_applied', { locale: localeSync.locale }));
    } else {
      logger.log(t('locale_apply.applied', { locale: localeSync.locale }));
    }
  }

  // Same default as init/install: updating an older project is exactly when
  // the hooks layer is most likely missing. --no-hooks opts out; a failure
  // never fails the update.
  const hooksResult = await hooksInstall.installDefaultHooks({ targetDir, options, logger, t });

  return {
    targetDir,
    ...result,
    localeSync,
    trackedIgnored,
    hooksInstall: hooksResult
  };
}

module.exports = {
  runUpdate
};
