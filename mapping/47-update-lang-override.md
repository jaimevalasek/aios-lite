# 47 - update --lang Locale Override

Date: 2026-03-01

## Scope
Make update language behavior symmetric with init/install by allowing explicit locale override at update time.

## Changes
- `src/commands/update.js` now supports:
  - `--lang=<locale>`
  - `--language=<locale>`
- Behavior:
  - Without override: keeps existing context-driven locale sync behavior.
  - With override: applies selected locale during update.
  - With `--dry-run` + override: plans locale sync without mutating files.
- CLI help/i18n updated (`help_update`) across `en`, `pt-BR`, `es`, `fr`.
- README command signature/examples updated for update command.

## Validation
- Added tests in `tests/update.test.js` for:
  - explicit language override (`--lang=fr`)
  - dry-run locale sync planning without file mutation
- `npm run ci` passed.
