'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { localizeContextParseReason } = require('../src/context-parse-reason');

describe('context-parse-reason.js — localizeContextParseReason', () => {
  const mockT = (key) => `[${key}]`;

  it('returns localized string for missing_frontmatter', () => {
    const result = localizeContextParseReason('missing_frontmatter', mockT);
    assert.equal(result, '[context_validate.parse_reason_missing_frontmatter]');
  });

  it('returns localized string for unclosed_frontmatter', () => {
    const result = localizeContextParseReason('unclosed_frontmatter', mockT);
    assert.equal(result, '[context_validate.parse_reason_unclosed_frontmatter]');
  });

  it('returns localized string for invalid_frontmatter_line', () => {
    const result = localizeContextParseReason('invalid_frontmatter_line', mockT);
    assert.equal(result, '[context_validate.parse_reason_invalid_frontmatter_line]');
  });

  it('returns normalized reason for unknown reason', () => {
    const result = localizeContextParseReason('custom_error', mockT);
    assert.equal(result, 'custom_error');
  });

  it('returns unknown localization for empty reason', () => {
    const result = localizeContextParseReason('', mockT);
    assert.equal(result, '[context_validate.parse_reason_unknown]');
  });

  it('returns unknown localization for null/undefined reason', () => {
    assert.equal(localizeContextParseReason(null, mockT), '[context_validate.parse_reason_unknown]');
    assert.equal(localizeContextParseReason(undefined, mockT), '[context_validate.parse_reason_unknown]');
  });

  it('normalizes reason case and whitespace', () => {
    const result = localizeContextParseReason('  MISSING_FRONTMATTER  ', mockT);
    assert.equal(result, '[context_validate.parse_reason_missing_frontmatter]');
  });
});
