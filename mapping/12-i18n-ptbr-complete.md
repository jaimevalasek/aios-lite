# 12 - i18n Completion (EN + PT-BR)

Date: 2026-03-01

## Scope completed
- Added full CLI dictionary for `pt-BR` (`src/i18n/messages/pt-BR.js`).
- Improved locale resolver in `src/i18n/index.js`.
- Added canonical fallback behavior:
  - `pt-BR` -> `pt-br`
  - `pt_br` -> `pt-br`
  - `pt` -> `pt-br`
  - unknown locales -> `en`
- Added CLI-level locale tests and translator tests.

## Validation
- `npm run ci` passed.
