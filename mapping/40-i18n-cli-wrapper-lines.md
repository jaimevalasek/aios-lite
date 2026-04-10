# 40 - i18n CLI Wrapper Lines

Date: 2026-03-01

## Scope
- Replace remaining inline string formatting in `src/cli.js` for:
  - help title spacing/newline
  - help command indentation
  - unknown-command stderr newline separation

## Changes
- Added CLI wrapper keys in all dictionaries (`en`, `pt-BR`, `es`, `fr`):
  - `cli.title_line`
  - `cli.help_item_line`
  - `cli.unknown_command_line`
- Updated `printHelp` to use `cli.help_item_line` for each command row.
- Updated unknown command branch to use `cli.unknown_command_line`.
- Added unit coverage in `tests/i18n.test.js` for the new keys.

## Validation
- `npm run ci` passed (`lint` + all tests).

## Notes
- This keeps formatting behavior stable while moving presentation wrappers fully into i18n dictionaries.
