'use strict';

function localizeContextParseReason(reason, t) {
  const normalized = String(reason || '')
    .trim()
    .toLowerCase();
  if (!normalized) return t('context_validate.parse_reason_unknown');
  if (normalized === 'missing_frontmatter') {
    return t('context_validate.parse_reason_missing_frontmatter');
  }
  if (normalized === 'unclosed_frontmatter') {
    return t('context_validate.parse_reason_unclosed_frontmatter');
  }
  if (normalized === 'invalid_frontmatter_line') {
    return t('context_validate.parse_reason_invalid_frontmatter_line');
  }
  return normalized;
}

module.exports = {
  localizeContextParseReason
};
