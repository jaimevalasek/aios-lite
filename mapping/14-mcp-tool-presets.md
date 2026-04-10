# 14 - MCP Tool Presets

Date: 2026-03-01

## Scope completed
- Extended `mcp:init` to generate tool-specific preset templates.
- New output files under `.aios-lite/mcp/presets/`:
  - `claude.json`
  - `codex.json`
  - `gemini.json`
  - `opencode.json`
- Added optional filter:
  - `aios-lite mcp:init --tool=claude|codex|gemini|opencode`
- Preset payload includes:
  - `suggested_target_file`
  - required env keys
  - MCP server placeholders (`mcpServers`)

## Validation
- `npm run ci` passed.
- Manual run validated:
  - `node bin/aios-lite.js mcp:init --tool=codex --json`
