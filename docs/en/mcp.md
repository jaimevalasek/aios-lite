# MCP Guide

AIOS Lite provides lightweight MCP planning and validation for multi-tool usage.

## Commands

### `mcp:init`
Generate a local MCP plan and tool presets:

```bash
aios-lite mcp:init
aios-lite mcp:init --dry-run
aios-lite mcp:init --tool=codex
```

Outputs:
- `.aios-lite/mcp/servers.local.json`
- `.aios-lite/mcp/presets/<tool>.json`

### `mcp:doctor`
Validate MCP readiness:

```bash
aios-lite mcp:doctor
aios-lite mcp:doctor --strict-env
aios-lite mcp:doctor --json
```

Checks include:
- `servers.local.json` existence and JSON validity
- Core server baseline (`filesystem`, `context7`)
- Preset coverage (`claude`, `codex`, `gemini`, `opencode`)
- Required environment variables from enabled servers
- Context compatibility for database and Web3 (`chain-rpc`)

## Strict environment mode
- Default mode reports missing env vars as warnings.
- `--strict-env` upgrades missing env vars to failures.

Use strict mode in CI when you want runtime-ready MCP validation gates.
