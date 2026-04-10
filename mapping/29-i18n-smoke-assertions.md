# 29 - i18n Smoke Internal Assertions

Date: 2026-03-01

## Scope completed
- Localized internal assertion failures in `test:smoke` command.
- Removed hardcoded English failure strings from smoke command runtime checks.

## Implementation details
- `src/commands/smoke.js`
  - `assertStep` now receives translation key and params.
  - all failure points now throw localized `smoke.*` messages.
- Added assertion message keys to all locale dictionaries:
  - `src/i18n/messages/en.js`
  - `src/i18n/messages/pt-BR.js`
  - `src/i18n/messages/es.js`
  - `src/i18n/messages/fr.js`

## Validation target
- `npm run ci`
