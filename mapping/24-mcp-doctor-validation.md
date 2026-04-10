# 24 - MCP Doctor Validation Command

Date: 2026-03-01

## Scope completed
- Added command: `aios-lite mcp:doctor [path] [--strict-env] [--json]`.
- Added CLI routing and JSON mode support for:
  - `mcp:doctor`
  - `mcp-doctor`
- Added MCP readiness checks for:
  - plan file existence/parsing (`.aios-lite/mcp/servers.local.json`)
  - core servers enabled (`filesystem`, `context7`)
  - preset coverage (`claude`, `codex`, `gemini`, `opencode`)
  - required env vars from enabled servers
  - stack compatibility (database engine + Web3 `chain-rpc`)

## New docs and contracts
- `docs/en/mcp.md`
- `docs/en/schemas/mcp-doctor.schema.json`
- `docs/en/schemas/index.json` updated with `mcp_doctor`
- `docs/en/json-schemas.md` updated command list

## Test coverage
- New: `tests/mcp-doctor.test.js`
- Updated: `tests/json-output.test.js`
- Updated: `tests/json-schema-files.test.js`

## Validation target
- `npm run ci`
