# 11 - MCP Init Command

Date: 2026-03-01

## Scope completed
- Added new command: `aios-lite mcp:init [path] [--dry-run] [--json]`.
- Command reads `project.context.md` (when present) and generates:
  - `.aios-lite/mcp/servers.local.json`
- Recommendations include:
  - filesystem
  - context7
  - database (engine-aware)
  - web-search
  - chain-rpc (for dApp projects)
  - makopy (optional)
- Added JSON-mode support in CLI for `mcp:init`.
- Added tests:
  - `tests/mcp-init.test.js`
  - JSON output contract coverage in `tests/json-output.test.js`

## Validation
- `npm run ci` passed after implementation.
