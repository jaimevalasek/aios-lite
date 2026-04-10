# 20 - i18n Regional Fallback Tests

Date: 2026-03-01

## Scope completed
- Added explicit fallback coverage for locale variants:
  - `es-*` -> `es`
  - `fr-*` -> `fr`
- Extended unit tests:
  - `tests/i18n.test.js`
- Extended CLI integration tests:
  - `tests/i18n-cli.test.js`
- Updated i18n docs and README fallback notes.

## Validation
- `npm run ci` passed.
