# Mapping 33 - i18n for mcp:init generated artifacts

Date: 2026-03-01

## Scope
Localize user-visible text embedded in generated MCP artifacts:
- server `reason` fields in `.aios-lite/mcp/servers.local.json`
- preset `notes` in `.aios-lite/mcp/presets/*.json`

## Changes
- `src/commands/mcp-init.js`
  - Added `resolveTranslator(t)` helper with safe EN fallback.
  - Localized server reason generation for:
    - filesystem
    - context7
    - database (enabled/disabled paths)
    - web-search
    - chain-rpc (enabled/disabled paths)
    - makopy
  - Localized preset notes list (3 advisory lines).
  - `buildMcpPlan` now accepts translator and is called with command `t`.
  - Invalid `--tool` fallback path now also uses the shared translator resolver.

## i18n keys added
In all locales (`en`, `pt-BR`, `es`, `fr`):
- `mcp_init.reason_filesystem`
- `mcp_init.reason_context7`
- `mcp_init.reason_database_none`
- `mcp_init.reason_database_enabled`
- `mcp_init.reason_web_search`
- `mcp_init.reason_chain_rpc_disabled`
- `mcp_init.reason_chain_rpc_enabled`
- `mcp_init.reason_makopy`
- `mcp_init.note_workspace_local`
- `mcp_init.note_replace_placeholders`
- `mcp_init.note_keep_secrets_env`

## Tests
- `tests/mcp-init.test.js`
  - Added PT-BR assertion that generated plan reason text is localized.
  - Added PT-BR assertion that preset notes are localized.

## Validation
- `npm run ci` passed (25/25).
