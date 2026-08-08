'use strict';

const path = require('node:path');
const {
  discoverBriefingSourcePacks,
  inspectBriefingSourcePack
} = require('../lib/briefing-source-pack');

function translated(t, key, values, fallback) {
  if (typeof t !== 'function') return fallback;
  const value = t(key, values);
  return value === key ? fallback : value;
}

async function runBriefingSources({ args, options = {}, logger, t }) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = String(options.slug || '').trim();
  const result = slug
    ? await inspectBriefingSourcePack(projectDir, slug)
    : await discoverBriefingSourcePacks(projectDir);

  if (!result.ok) {
    logger.error(translated(
      t,
      'cli.briefing_sources.error',
      { error: result.error, slug: slug || '-' },
      `briefing:sources failed (${result.error})${slug ? ` for ${slug}` : ''}.`
    ));
    return result;
  }

  if (slug) {
    logger.log(translated(
      t,
      'cli.briefing_sources.inspected',
      {
        slug: result.slug,
        files: result.file_count,
        sql: result.has_sql ? 'yes' : 'no',
        blocked: result.logical_groups.blocked.length
      },
      `Source pack ${result.slug}: ${result.file_count} file(s), SQL=${result.has_sql ? 'yes' : 'no'}, blocked=${result.logical_groups.blocked.length}.`
    ));
    for (const file of result.files) {
      logger.log(`  ${file.role.padEnd(13)} ${file.kind.padEnd(18)} ${file.load_policy.padEnd(13)} ${file.path}`);
    }
    return result;
  }

  if (result.packs.length === 0 && result.loose_files.length === 0) {
    logger.log(translated(
      t,
      'cli.briefing_sources.none',
      {},
      'No Briefing source packs were found under plans/.'
    ));
    return result;
  }
  logger.log(translated(
    t,
    'cli.briefing_sources.discovered',
    { packs: result.packs.length, loose: result.loose_files.length },
    `Discovered ${result.packs.length} source pack(s) and ${result.loose_files.length} loose source file(s).`
  ));
  for (const pack of result.packs) {
    logger.log(`  ${pack.path} — ${pack.file_count} file(s), SQL=${pack.has_sql ? 'yes' : 'no'}, mixed=${pack.mixed ? 'yes' : 'no'}`);
  }
  for (const file of result.loose_files) logger.log(`  ${file.path} — ${file.kind}`);
  return result;
}

module.exports = {
  runBriefingSources
};
