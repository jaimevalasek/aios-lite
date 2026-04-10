# Mapping 35 - i18n parse reason localization for context:validate

Date: 2026-03-01

## Scope
Improve `context:validate` human output by translating frontmatter parser reason codes into user-friendly localized text.

## Changes
- `src/commands/context-validate.js`
  - Added `localizeParseReason(reason, t)` helper.
  - Mapped known parser codes to locale keys:
    - `missing_frontmatter`
    - `unclosed_frontmatter`
    - `invalid_frontmatter_line`
  - Kept graceful fallback for unknown values.
  - `runContextValidate` now uses localized parse reason before rendering.

## i18n keys added
Under `context_validate` in all locales:
- `parse_reason_missing_frontmatter`
- `parse_reason_unclosed_frontmatter`
- `parse_reason_invalid_frontmatter_line`

## Tests added/updated
- New file: `tests/context-validate-command.test.js`
  - unit checks for `localizeParseReason` in pt-BR
  - command output check for localized parse reason line
- Updated: `tests/i18n.test.js`
  - dictionary presence/consistency check for parse reason keys

## Validation
- `npm run ci` passed (26/26).
