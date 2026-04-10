# 22 - Smoke Locale Application (es/fr)

Date: 2026-03-01

## Scope completed
- Extended `tests/smoke.test.js` with end-to-end checks for:
  - `--lang=es`
  - `--lang=fr`
- Validates that active agent prompt file:
  - `.aios-lite/agents/setup.md`
  is actually replaced with localized content markers after smoke flow.

## Why this matters
- Confirms end-to-end i18n behavior for agent prompts, not only CLI message dictionaries.

## Validation target
- `npm run ci`
