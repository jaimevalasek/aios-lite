'use strict';

const path = require('node:path');
const { applyAgentLocale, normalizeInteractionLanguage } = require('../locales');
const { validateProjectContextFile, getInteractionLanguage } = require('../context');

async function runLocaleApply({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run']);

  let requestedLanguage = options.language || options.lang || '';
  if (!requestedLanguage) {
    const context = await validateProjectContextFile(targetDir);
    if (context.parsed && context.data) {
      requestedLanguage = getInteractionLanguage(context.data, 'en');
    }
  }

  const result = await applyAgentLocale(
    targetDir,
    normalizeInteractionLanguage(requestedLanguage || 'en'),
    { dryRun }
  );

  logger.log(
    dryRun
      ? t('locale_apply.dry_run_applied', { locale: result.locale })
      : t('locale_apply.applied', { locale: result.locale })
  );
  logger.log(t('locale_apply.copied_count', { count: result.copied.length }));

  if (result.missing.length > 0) {
    logger.log(t('locale_apply.missing_count', { count: result.missing.length }));
  }

  for (const item of result.copied) {
    logger.log(
      t('locale_apply.copy_line', {
        source: item.source,
        target: item.target
      })
    );
  }

  return {
    ok: true,
    targetDir,
    ...result
  };
}

module.exports = {
  runLocaleApply
};
