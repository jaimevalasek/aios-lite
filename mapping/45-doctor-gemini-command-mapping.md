# 45 - Doctor Gemini Command Mapping Validation

Date: 2026-03-01

## Scope
Extend multi-IDE doctor hardening to verify `.gemini/commands/aios-*.toml` files still point to the correct shared agent prompts.

## Changes
- `doctor` now validates each Gemini command file mapping:
  - `aios-setup` -> `.aios-lite/agents/setup.md`
  - `aios-analyst` -> `.aios-lite/agents/analyst.md`
  - `aios-architect` -> `.aios-lite/agents/architect.md`
  - `aios-pm` -> `.aios-lite/agents/pm.md`
  - `aios-dev` -> `.aios-lite/agents/dev.md`
  - `aios-qa` -> `.aios-lite/agents/qa.md`
  - `aios-orchestrator` -> `.aios-lite/agents/orchestrator.md`
- Added localized doctor messages/hints in `en`, `pt-BR`, `es`, `fr`.
- Improved doctor hint rendering to support parameterized hints (`hintParams`).

## Validation
- Added/updated tests:
  - `tests/doctor.test.js` (Gemini mapping failure detection)
  - `tests/doctor-command.test.js` (localized hint with file parameter)
  - `tests/i18n.test.js` (new doctor i18n key coverage)
- `npm run ci` passed.
