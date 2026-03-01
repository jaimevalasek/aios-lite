'use strict';

const path = require('node:path');
const { detectFramework } = require('../detector');
const { updateInstallation } = require('../updater');
const { validateProjectContextFile } = require('../context');
const { applyAgentLocale } = require('../locales');

async function runUpdate({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run']);

  const detection = await detectFramework(targetDir);
  const result = await updateInstallation(targetDir, {
    dryRun,
    frameworkDetection: detection.framework
  });

  if (!result.ok) {
    throw new Error(t('update.not_installed', { targetDir }));
  }

  let localeSync = null;
  if (!dryRun) {
    const context = await validateProjectContextFile(targetDir);
    const language =
      context.parsed && context.data && context.data.conversation_language
        ? context.data.conversation_language
        : 'en';
    localeSync = await applyAgentLocale(targetDir, language, { dryRun: false });
  }

  logger.log(t('update.done_at', { targetDir }));
  logger.log(t('update.files_updated', { count: result.copied.length }));
  logger.log(t('update.backups_created', { count: result.backedUp.length }));

  return {
    ...result,
    localeSync
  };
}

module.exports = {
  runUpdate
};
