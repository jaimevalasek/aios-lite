# 26 - i18n Hardening (Workflow + MCP Doctor)

Date: 2026-03-01

## Scope completed
- Removed remaining hardcoded user-facing English in:
  - `workflow:plan`
  - `mcp:doctor`
- Added localized error for invalid `mcp:init --tool`.

## Implementation details
- `src/commands/workflow-plan.js`
  - notes are now generated from `noteKeys` and translated through i18n dictionaries.
- `src/commands/mcp-doctor.js`
  - all report/check/hint/summary messages now use i18n keys (`mcp_doctor.*`).
- `src/commands/mcp-init.js`
  - invalid `--tool` now uses i18n key (`mcp_init.invalid_tool`).

## i18n updates
- Added/updated keys in all dictionaries:
  - `src/i18n/messages/en.js`
  - `src/i18n/messages/pt-BR.js`
  - `src/i18n/messages/es.js`
  - `src/i18n/messages/fr.js`

## Test coverage
- Updated `tests/mcp-doctor.test.js` to pass translator in direct command execution.
- Added `mcp:init` invalid-tool assertion in `tests/mcp-init.test.js`.

## Validation target
- `npm run ci`
