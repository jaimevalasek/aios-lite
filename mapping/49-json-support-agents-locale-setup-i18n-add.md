# 49 - JSON Support Expansion (agents/locale/setup/i18n)

Date: 2026-03-01

## Scope
Expand machine-readable CLI automation coverage to additional commands already returning structured payloads.

## Changes
- Added JSON support in CLI for:
  - `agents`
  - `agent:prompt`
  - `locale:apply`
  - `setup:context`
  - `i18n:add`
- Reused existing silent-logger JSON flow to keep stdout pure JSON.

## Validation
- Extended `tests/json-output.test.js` with e2e checks for:
  - `agents --json`
  - `agent:prompt --json`
  - `locale:apply --json`
  - `setup:context --defaults --json`
  - `i18n:add --dry-run --json`
- `npm run ci` passed.
