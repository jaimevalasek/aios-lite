# Mapping 31 - i18n hardening for parallel assign lane summary

Date: 2026-03-01

## Scope
Localize remaining hardcoded human-readable lane summary line in `parallel:assign`.

## Changes
- `src/commands/parallel-assign.js`
  - Replaced hardcoded line:
    - `- lane X: N scope item(s)`
  - With i18n key rendering:
    - `parallel_assign.lane_scope_line`

## i18n keys added
- `parallel_assign.lane_scope_line` in:
  - `src/i18n/messages/en.js`
  - `src/i18n/messages/pt-BR.js`
  - `src/i18n/messages/es.js`
  - `src/i18n/messages/fr.js`

## Tests
- `tests/parallel-assign.test.js`
  - Added PT-BR output assertion to verify localized lane scope summary is printed.

## Validation
- `npm run ci` passed (25/25).
