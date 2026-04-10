# Mapping 36 - shared parse reason i18n between context validate and mcp doctor

Date: 2026-03-01

## Scope
Unify localization of context frontmatter parse reason codes across commands.

## Changes
- Added new shared helper:
  - `src/context-parse-reason.js`
  - exposes `localizeContextParseReason(reason, t)`
- Refactored commands to use shared helper:
  - `src/commands/context-validate.js`
  - `src/commands/mcp-doctor.js`
- Kept backward export compatibility in `context-validate`:
  - `localizeParseReason` now aliases shared helper.

## Tests
- Updated `tests/context-validate-command.test.js` to import shared helper directly.
- Added `tests/mcp-doctor.test.js` case asserting localized parse reason text (pt-BR) when context frontmatter is invalid.

## Validation
- `npm run ci` passed (26/26).
