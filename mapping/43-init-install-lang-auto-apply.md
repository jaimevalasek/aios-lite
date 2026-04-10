# 43 - init/install --lang Auto Locale Apply

Date: 2026-03-01

## Scope
Improve i18n onboarding by allowing language selection at bootstrap, without requiring a separate `locale:apply` step.

## Changes
- Added language auto-apply flow in:
  - `src/commands/init.js`
  - `src/commands/install.js`
- New behavior:
  - `--lang=<locale>` (or `--language=<locale>`) triggers localized agent pack activation after template install.
  - Uses existing locale resolver (`resolveAgentLocale`) and apply routine (`applyAgentLocale`).
  - Supports dry-run logging via existing `locale_apply` i18n keys.
- Updated CLI help/usage strings for `init` and `install` in all locales to include `--lang`.
- Updated README command signatures/examples.

## Validation
- Extended tests in `tests/init-install-guidance.test.js` to verify:
  - `runInit(..., { lang: 'es' })` applies Spanish agent prompts
  - `runInstall(..., { lang: 'pt-BR' })` applies pt-BR agent prompts
- `npm run ci` passed.
