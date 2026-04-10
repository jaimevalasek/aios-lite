# 28 - i18n Parallel Doctor Checks

Date: 2026-03-01

## Scope completed
- Localized `parallel:doctor` check/hint messages in all supported CLI locales.
- Localized severity labels in text output (`OK/WARN/FAIL` equivalents by locale).

## Implementation details
- `src/commands/parallel-doctor.js`
  - `buildChecks` now receives translator and builds localized messages/hints
  - `formatCheckPrefix` now resolves prefix labels from i18n
- Added new `parallel_doctor` keys to:
  - `src/i18n/messages/en.js`
  - `src/i18n/messages/pt-BR.js`
  - `src/i18n/messages/es.js`
  - `src/i18n/messages/fr.js`

## Test coverage
- `tests/parallel-doctor.test.js`
  - new assertion: check message localization with `pt-BR` translator.

## Validation target
- `npm run ci`
