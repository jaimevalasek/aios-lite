'use strict';

const path = require('node:path');
const { validateProjectContextFile } = require('../context');

async function runContextValidate({ args, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const result = await validateProjectContextFile(targetDir);

  if (!result.exists) {
    logger.log(t('context_validate.missing_file', { path: result.filePath }));
    logger.log(t('context_validate.hint_setup'));
    return {
      ok: false,
      ...result
    };
  }

  if (!result.parsed) {
    logger.log(t('context_validate.invalid_frontmatter'));
    logger.log(t('context_validate.file_path', { path: result.filePath }));
    logger.log(t('context_validate.parse_reason', { reason: result.parseError || 'unknown' }));
    logger.log(t('context_validate.hint_fix_frontmatter'));
    return {
      ok: false,
      ...result
    };
  }

  if (!result.valid) {
    logger.log(t('context_validate.invalid_fields'));
    logger.log(t('context_validate.file_path', { path: result.filePath }));
    for (const issue of result.issues) {
      logger.log(`- ${t(issue.key, issue.params || {})}`);
    }
    return {
      ok: false,
      ...result
    };
  }

  logger.log(t('context_validate.valid'));
  logger.log(t('context_validate.file_path', { path: result.filePath }));
  return {
    ok: true,
    ...result
  };
}

module.exports = {
  runContextValidate
};

