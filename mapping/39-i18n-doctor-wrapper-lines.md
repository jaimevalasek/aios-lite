# Mapping 39 - i18n wrapper lines for doctor command output

Date: 2026-03-01

## Scope
Localize remaining output wrapper formats in `doctor` command human output.

## Changes
- `src/commands/doctor.js`
  - Replaced inline check line formatting with `doctor.check_line`.
  - Replaced inline hint wrapper with `doctor.hint_line`.
  - Replaced inline fix action wrapper with `doctor.fix_action_line`.
  - Replaced inline detail wrappers with `doctor.detail_line`.
  - Removed newline-prefixed diagnosis line formatting; now explicit blank line + localized text.

## i18n keys added
In all locales (`en`, `pt-BR`, `es`, `fr`):
- `doctor.check_line`
- `doctor.hint_line`
- `doctor.fix_action_line`
- `doctor.detail_line`

## Tests
- Added `tests/doctor-command.test.js`
  - verifies localized wrappers for checks/hints in pt-BR
  - verifies localized wrappers for fix action/details in pt-BR
- Updated `tests/i18n.test.js`
  - key/value checks for `doctor.fix_action_line` across locales

## Validation
- `npm run ci` passed (29/29).
