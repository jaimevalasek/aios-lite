'use strict';

const path = require('node:path');
const {
  analyzeBriefingLineageMigration,
  applyBriefingLineageMigration,
  publicMigrationPlan
} = require('../lib/briefing-lineage-migration');

function failure(error, logger, t) {
  const code = error && error.code ? error.code : 'migration_failed';
  const message = error && error.message ? error.message : 'Briefing lineage migration failed.';
  logger.error(t('briefing_lineage_migration.error', { code, message }));
  return {
    ok: false,
    error: { code, message }
  };
}

async function runBriefingMigrateLineage({ args, options = {}, logger, t }) {
  if (options.write && options['dry-run']) {
    return failure(
      Object.assign(new Error('--write and --dry-run cannot be used together.'), {
        code: 'conflicting_write_options'
      }),
      logger,
      t
    );
  }

  try {
    const projectDir = path.resolve(process.cwd(), args[0] || '.');
    const plan = await analyzeBriefingLineageMigration({
      projectDir,
      slug: options.slug
    });
    const result = options.write
      ? await applyBriefingLineageMigration(plan)
      : publicMigrationPlan(plan);

    if (result.status === 'migrated') {
      logger.log(t('briefing_lineage_migration.migrated', {
        slug: result.slug,
        report: result.report_path
      }));
    } else if (result.status === 'already_canonical') {
      logger.log(t('briefing_lineage_migration.already_canonical', { slug: result.slug }));
    } else {
      logger.log(t('briefing_lineage_migration.preview', {
        slug: result.slug,
        sources: result.source_rows_migrated,
        promises: result.promise_rows_migrated
      }));
    }
    return result;
  } catch (error) {
    return failure(error, logger, t);
  }
}

module.exports = {
  runBriefingMigrateLineage
};
