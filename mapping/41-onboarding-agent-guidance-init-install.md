# 41 - Onboarding Agent Guidance in init/install

Date: 2026-03-01

## Scope
Improve first-run UX after `init` and `install` to reduce confusion when AI CLI does not expose a visual agent picker.

## Changes
- Added `src/prompt-tool.js` with safe tool resolver:
  - supports: `codex`, `claude`, `gemini`, `opencode`
  - fallback: `codex`
- `init` command now prints explicit onboarding hints:
  - list agents (`aios-lite agents`)
  - generate setup prompt (`aios-lite agent:prompt setup --tool=<tool>`)
- `install` command now prints explicit onboarding hints:
  - run `setup:context --defaults`
  - list agents
  - generate setup prompt for selected tool
- Added optional `--tool` guidance to help/usage strings for `init` and `install`.
- Updated README command signatures for `init` and `install`.

## i18n
Added guidance keys in all built-in locales (`en`, `pt-BR`, `es`, `fr`) under `init` and `install` dictionaries.

## Validation
- Added tests:
  - `tests/prompt-tool.test.js`
  - `tests/init-install-guidance.test.js`
- Extended `tests/i18n.test.js` for new onboarding i18n keys.
- `npm run ci` passed.
