# Mapping 38 - i18n diagnostic line wrappers and issue row formatting

Date: 2026-03-01

## Scope
Localize remaining diagnostic line wrappers that were still hardcoded in command output.

## Commands updated
- `mcp:doctor`
- `parallel:doctor`
- `context:validate`

## Code changes
- `src/commands/mcp-doctor.js`
  - Replaced hardcoded check line wrapper with `mcp_doctor.check_line`.
  - Replaced hardcoded hint wrapper with `mcp_doctor.hint_line`.
- `src/commands/parallel-doctor.js`
  - Replaced hardcoded check line wrapper with `parallel_doctor.check_line`.
  - Replaced hardcoded hint wrapper with `parallel_doctor.hint_line`.
- `src/commands/context-validate.js`
  - Replaced hardcoded invalid-field bullet line with `context_validate.issue_line`.

## i18n keys added
In all locales (`en`, `pt-BR`, `es`, `fr`):
- `mcp_doctor.check_line`
- `mcp_doctor.hint_line`
- `parallel_doctor.check_line`
- `parallel_doctor.hint_line`
- `context_validate.issue_line`

## Tests
- `tests/mcp-doctor.test.js`
  - Added assertion for localized hint wrapper (`Dica:`) in pt-BR output.
- `tests/parallel-doctor.test.js`
  - Added collector logger and assertion for localized hint wrapper (`Dica:`) in pt-BR output.
- `tests/context-validate-command.test.js`
  - Added invalid-fields case asserting localized issue line rendering.
- `tests/i18n.test.js`
  - Added key presence/value checks for new diagnostic wrapper keys.

## Validation
- `npm run ci` passed (28/28).
