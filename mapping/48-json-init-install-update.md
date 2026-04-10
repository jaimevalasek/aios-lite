# 48 - JSON Output for init/install/update

Date: 2026-03-01

## Scope
Enable machine-readable automation for project bootstrap/update commands.

## Changes
- Added `init`, `install`, and `update` to JSON-supported command set in CLI.
- Introduced silent logger path for JSON-enabled commands to avoid mixing human output with JSON payloads.
- CLI now passes silent logger in JSON mode for supported commands.

## Validation
- Extended `tests/json-output.test.js` with e2e checks for:
  - `init --json`
  - `install --json`
  - `update --json`
- `npm run ci` passed.
