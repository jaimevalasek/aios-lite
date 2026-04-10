# 13 - Package E2E Validation

Date: 2026-03-01

## Scope completed
- Added command: `aios-lite test:package [source-path] [--keep] [--dry-run] [--json]`.
- Implemented real package path validation using:
  - `npm pack`
  - `npx --package <tarball> aios-lite init`
  - `npx --package <tarball> aios-lite setup:context --defaults`
  - `npx --package <tarball> aios-lite doctor --json`
  - `npx --package <tarball> aios-lite mcp:init --json`
- Added isolated npm cache for test command to avoid host cache permission issues.
- Added automated tests for parser/dry-run + JSON contract.

## Live verification executed
- Ran `node bin/aios-lite.js test:package --json`.
- Result: `ok=true`, 5 steps validated, `doctorOk=true`, `mcpServerCount=6`.

## Validation
- `npm run ci` passed after implementation.
