# 21 - Agent Locale Packs (es/fr)

Date: 2026-03-01

## Scope completed
- Added localized agent pack templates for:
  - `es`
  - `fr`
- Extended agent locale resolution:
  - `es-*` -> `es`
  - `fr-*` -> `fr`
- Updated managed template file registry to include new locale files.
- Updated CLI help text in all dictionaries to show `--lang=en|pt-BR|es|fr`.
- Updated contract tests and locale copy tests for the new agent locales.

## Why this change
- i18n had CLI dictionary support for `es`/`fr`, but active agent prompts were limited to `en`/`pt-BR`.
- This closes the gap so user-agent interaction can stay in the selected language end-to-end.

## Validation target
- `npm run ci`
