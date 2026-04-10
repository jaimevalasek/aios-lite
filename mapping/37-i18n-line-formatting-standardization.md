# Mapping 37 - i18n line formatting standardization for command listings

Date: 2026-03-01

## Scope
Standardize remaining human-readable listing line formats that still used inline template literals.

## Commands updated
- `agents`
- `locale:apply`
- `workflow:plan`
- `parallel:init`

## Code changes
- `src/commands/agents.js`
  - Replaced inline listing/field lines with i18n keys:
    - `agents.agent_line`
    - `agents.path_line`
    - `agents.active_path_line`
    - `agents.depends_line`
    - `agents.output_line`
- `src/commands/locale-apply.js`
  - Replaced copy mapping line with i18n key:
    - `locale_apply.copy_line`
- `src/commands/workflow-plan.js`
  - Replaced command and note lines with i18n keys:
    - `workflow_plan.command_line`
    - `workflow_plan.note_line`
- `src/commands/parallel-init.js`
  - Replaced generated file list line with i18n key:
    - `parallel_init.file_line`

## i18n keys added
In all locale dictionaries (`en`, `pt-BR`, `es`, `fr`):
- `agents.agent_line`
- `agents.path_line`
- `agents.active_path_line`
- `agents.depends_line`
- `agents.output_line`
- `locale_apply.copy_line`
- `workflow_plan.command_line`
- `workflow_plan.note_line`
- `parallel_init.file_line`

## Tests
- Added `tests/agents-command.test.js`
  - verifies PT-BR formatted lines for agents list output.
- Added `tests/locale-apply-command.test.js`
  - verifies PT-BR formatted copy lines for locale apply output.
- Updated `tests/workflow-plan.test.js`
  - verifies PT-BR command/note line formatting.
- Updated `tests/parallel-init.test.js`
  - verifies PT-BR file listing line formatting.

## Validation
- `npm run ci` passed (28/28).
