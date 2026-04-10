# 25 - Smoke Parallel Profile

Date: 2026-03-01

## Scope completed
- Added new smoke profile: `parallel`.
- Command now supports:
  - `aios-lite test:smoke --profile=parallel`
- Parallel smoke flow validates in sequence:
  - `parallel:init`
  - `parallel:assign`
  - `parallel:status`
  - `parallel:doctor`

## Implementation details
- `src/commands/smoke.js`
  - added profile routing for `parallel`
  - added minimal context seed (`discovery.md`, `architecture.md`, `prd.md`) to avoid assignment fallbacks
  - added assertions for lane count, scope assignment and doctor summary
- Updated CLI/i18n smoke help and profile validation messages for:
  - `en`, `pt-BR`, `es`, `fr`
- Updated JSON contract:
  - `docs/en/schemas/smoke.schema.json` now accepts `parallel` in `profile` enum.

## Test coverage
- `tests/smoke.test.js`
  - new case: `test:smoke supports parallel orchestration profile`
- `tests/json-output.test.js`
  - new case: `test:smoke --json supports parallel profile`

## Validation target
- `npm run ci`
