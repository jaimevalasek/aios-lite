# AIOS Lite

Lightweight AI agent framework for software projects.

## Install

```bash
npx aios-lite init my-project
# or
npx aios-lite install
```

## Commands
- `aios-lite init <project-name>`
- `aios-lite install [path]`
- `aios-lite update [path]`
- `aios-lite info [path] [--json]`
- `aios-lite doctor [path] [--fix] [--dry-run] [--json]`
- `aios-lite i18n:add <locale>`
- `aios-lite setup:context [path]`
- `aios-lite agents`
- `aios-lite agent:prompt <agent> [--tool=codex|claude|gemini|opencode]`
- `aios-lite context:validate [path] [--json]`
- `aios-lite locale:apply [path] [--lang=en|pt-BR|es|fr]`
- `aios-lite test:smoke [workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed] [--keep] [--json]`
- `aios-lite test:package [source-path] [--keep] [--dry-run] [--json]`
- `aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json]`
- `aios-lite parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json]`
- `aios-lite parallel:assign [path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json]`
- `aios-lite parallel:doctor [path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json]`
- `aios-lite mcp:init [path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json]`
- `aios-lite mcp:doctor [path] [--strict-env] [--json]`

## Agent usage helper
If your AI CLI does not show a visual agent picker, use:

```bash
aios-lite agents
aios-lite agent:prompt setup --tool=codex
aios-lite locale:apply --lang=pt-BR
aios-lite doctor --fix
aios-lite test:smoke --lang=pt-BR
aios-lite test:smoke --web3=ethereum
aios-lite test:smoke --profile=mixed
aios-lite test:package --dry-run
aios-lite workflow:plan --classification=SMALL
aios-lite parallel:init --workers=3
aios-lite parallel:assign --source=architecture --workers=3
aios-lite parallel:doctor --fix --dry-run
aios-lite mcp:init --dry-run
aios-lite mcp:doctor --strict-env
```

## JSON output for CI
Use `--json` on selected commands:
- `aios-lite info --json`
- `aios-lite doctor --json`
- `aios-lite context:validate --json`
- `aios-lite test:smoke --json`
- `aios-lite parallel:init --json`
- `aios-lite parallel:assign --json`
- `aios-lite parallel:doctor --json`
- `aios-lite mcp:doctor --json`

## i18n
CLI localization is supported with:
- `--locale=<code>`
- `AIOS_LITE_LOCALE=<code>`

Built-in locales: `en`, `pt-BR`, `es`, `fr`.
Default locale is `en`.
`pt`, `pt_br`, and `pt-BR` resolve to the same Portuguese dictionary.
`es-*` resolves to `es`, and `fr-*` resolves to `fr`.
Localized agent packs are built-in for `en`, `pt-BR`, `es`, and `fr`.

Generate a new locale scaffold:

```bash
aios-lite i18n:add fr
```

## Multi-IDE support
- Claude Code (`CLAUDE.md`)
- Codex CLI (`AGENTS.md`)
- Gemini CLI (`.gemini/GEMINI.md`)
- OpenCode (`OPENCODE.md`)

## Web3 support
- `project_type=dapp` is supported in context validation and setup.
- Framework detection now includes:
  - Ethereum: `Hardhat`, `Foundry`, `Truffle`
  - Solana: `Anchor`, `Solana Web3`
  - Cardano: `Cardano` (Aiken/Cardano SDK signals)
- `setup:context` supports Web3 fields:
  - `--web3-enabled=true|false`
  - `--web3-networks=ethereum,solana`
  - `--contract-framework=Hardhat`
  - `--wallet-provider=wagmi`
  - `--indexer=The Graph`
  - `--rpc-provider=Alchemy`

## Docs
- i18n guide: `docs/en/i18n.md`
- JSON schemas: `docs/en/json-schemas.md`
- parallel guide: `docs/en/parallel.md`
- MCP guide: `docs/en/mcp.md`
- web3 guide: `docs/en/web3.md`
- release guide: `docs/en/release.md`
- release flow: `docs/en/release-flow.md`
- release notes template: `docs/en/release-notes-template.md`

## MCP bootstrap
Generate a local MCP server recommendation file from `project.context.md`:

```bash
aios-lite mcp:init
aios-lite mcp:init --dry-run
aios-lite mcp:init --tool=codex
aios-lite mcp:doctor
aios-lite mcp:doctor --strict-env
```

`mcp:init` generates:
- `.aios-lite/mcp/servers.local.json` (project MCP plan)
- `.aios-lite/mcp/presets/<tool>.json` (tool-specific preset templates)
- Context7/Database presets in remote-endpoint mode (`mcp-remote`) using:
  - `CONTEXT7_MCP_URL`
  - `DATABASE_MCP_URL` (when database MCP is enabled)

`mcp:doctor` validates:
- core MCP servers (`filesystem`, `context7`)
- preset coverage
- required env vars from enabled servers
- context compatibility for database and Web3 (`chain-rpc`)

## License
MIT
