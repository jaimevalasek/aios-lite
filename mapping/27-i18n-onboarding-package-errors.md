# 27 - i18n Onboarding Notes + Package Test Errors

Date: 2026-03-01

## Scope completed
- Localized `setup:context` notes generated from onboarding flows.
- Localized `test:package` runtime failure messages.

## Implementation details
- `src/commands/setup-context.js`
  - added note localization layer (`localizeSetupNote` / `localizeProfileNotes`)
  - maps legacy onboarding English notes to localized dictionary keys
  - localizes developer/team/beginner notes in both interactive and `--defaults` flows
- `src/commands/package-e2e.js`
  - replaced hardcoded error strings with i18n keys under `package_test.*`
  - added normalized command failure detail extraction helper

## i18n updates
- Added keys to `setup_context` and `package_test` sections in:
  - `src/i18n/messages/en.js`
  - `src/i18n/messages/pt-BR.js`
  - `src/i18n/messages/es.js`
  - `src/i18n/messages/fr.js`

## Test coverage
- Updated `tests/setup-context.test.js` with locale assertion for localized onboarding notes.

## Validation target
- `npm run ci`
