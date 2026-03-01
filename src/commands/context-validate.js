'use strict';

const path = require('node:path');
const { validateProjectContextFile } = require('../context');
const { localizeContextParseReason } = require('../context-parse-reason');

async function runContextValidate({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const jsonMode = Boolean(options.json);
  const result = await validateProjectContextFile(targetDir);

  const base = {
    targetDir
  };

  if (!result.exists) {
    const output = {
      ok: false,
      reason: 'missing_file',
      ...base,
      ...result
    };
    if (jsonMode) {
      return output;
    }
    logger.log(t('context_validate.missing_file', { path: result.filePath }));
    logger.log(t('context_validate.hint_setup'));
    return output;
  }

  if (!result.parsed) {
    const output = {
      ok: false,
      reason: 'invalid_frontmatter',
      ...base,
      ...result
    };
    if (jsonMode) {
      return output;
    }
    logger.log(t('context_validate.invalid_frontmatter'));
    logger.log(t('context_validate.file_path', { path: result.filePath }));
    logger.log(
      t('context_validate.parse_reason', {
        reason: localizeContextParseReason(result.parseError, t)
      })
    );
    logger.log(t('context_validate.hint_fix_frontmatter'));
    return output;
  }

  if (!result.valid) {
    const output = {
      ok: false,
      reason: 'invalid_fields',
      ...base,
      ...result
    };
    if (jsonMode) {
      return output;
    }
    logger.log(t('context_validate.invalid_fields'));
    logger.log(t('context_validate.file_path', { path: result.filePath }));
    for (const issue of result.issues) {
      logger.log(
        t('context_validate.issue_line', {
          issue: t(issue.key, issue.params || {})
        })
      );
    }
    return output;
  }

  const output = {
    ok: true,
    reason: 'valid',
    ...base,
    ...result
  };
  if (jsonMode) {
    return output;
  }
  logger.log(t('context_validate.valid'));
  logger.log(t('context_validate.file_path', { path: result.filePath }));
  return output;
}

module.exports = {
  runContextValidate,
  localizeParseReason: localizeContextParseReason
};
