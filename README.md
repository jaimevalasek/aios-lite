# AIOS Lite

Lightweight AI agent framework for software projects.

## Install

```bash
npx aios-lite init my-project
# or
npx aios-lite install
```

## Legacy projects and custom stacks
You can run AIOS Lite on existing/legacy projects (not only new projects).

```bash
# inside an existing project
npx aios-lite install .
aios-lite setup:context . --defaults --framework="CodeIgniter 3" --backend="CodeIgniter 3" --database="MySQL"

# generate discovery.md + skeleton-system.md using a cheap LLM (saves tokens in your AI session)
# requires aios-lite-models.json with your API key
aios-lite scan:project
```

If your stack is not listed in menus, use free-text values via `--framework`, `--backend`, `--frontend`, `--database`, `--auth`, and `--uiux`.

## Commands

**Setup and install**
- [`aios-lite init`](docs/en/cli-reference.md#init) `<project-name> [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode]`
- [`aios-lite install`](docs/en/cli-reference.md#install) `[path] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode]`
- [`aios-lite update`](docs/en/cli-reference.md#update) `[path] [--lang=en|pt-BR|es|fr]`
- [`aios-lite info`](docs/en/cli-reference.md#info) `[path] [--json]`
- [`aios-lite doctor`](docs/en/cli-reference.md#doctor) `[path] [--fix] [--dry-run] [--json]`
- [`aios-lite setup:context`](docs/en/cli-reference.md#setupcontext) `[path] [--defaults] [--framework=<name>] [--lang=en|pt-BR|es|fr]`
- [`aios-lite context:validate`](docs/en/cli-reference.md#contextvalidate) `[path] [--json]`
- [`aios-lite scan:project`](docs/en/cli-reference.md#scanproject) `[path] [--provider=<name>] [--dry-run] [--json]`

**Agents**
- [`aios-lite agents`](docs/en/cli-reference.md#agents)
- [`aios-lite agent:prompt`](docs/en/cli-reference.md#agentprompt) `<agent> [--tool=codex|claude|gemini|opencode]`
- [`aios-lite workflow:plan`](docs/en/cli-reference.md#workflowplan) `[path] [--classification=MICRO|SMALL|MEDIUM] [--json]`

**Locale**
- [`aios-lite i18n:add`](docs/en/i18n.md#create-a-locale-scaffold) `<locale>`
- [`aios-lite locale:apply`](docs/en/i18n.md#apply-localized-agent-prompts) `[path] [--lang=en|pt-BR|es|fr]`

**Parallel orchestration**
- [`aios-lite parallel:init`](docs/en/parallel.md) `[path] [--workers=2..6] [--force] [--dry-run] [--json]`
- [`aios-lite parallel:assign`](docs/en/parallel.md#scope-assignment) `[path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json]`
- [`aios-lite parallel:status`](docs/en/parallel.md#status-overview) `[path] [--json]`
- [`aios-lite parallel:doctor`](docs/en/parallel.md#diagnose-and-repair) `[path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json]`

**MCP**
- [`aios-lite mcp:init`](docs/en/mcp.md#mcpinit) `[path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json]`
- [`aios-lite mcp:doctor`](docs/en/mcp.md#mcpdoctor) `[path] [--strict-env] [--json]`

**Browser QA (Playwright)**
- [`aios-lite qa:init`](docs/en/qa-browser.md#qainit) `[path] [--url=<app-url>] [--dry-run] [--json]`
- [`aios-lite qa:doctor`](docs/en/qa-browser.md#qadoctor) `[path] [--json]`
- [`aios-lite qa:run`](docs/en/qa-browser.md#qarun) `[path] [--url=<app-url>] [--persona=naive|hacker|power|mobile] [--headed] [--html] [--json]`
- [`aios-lite qa:scan`](docs/en/qa-browser.md#qascan) `[path] [--url=<app-url>] [--depth=3] [--max-pages=50] [--headed] [--html] [--json]`
- [`aios-lite qa:report`](docs/en/qa-browser.md#qareport) `[path] [--html] [--json]`

**Testing and validation (CI / contributors)**
- [`aios-lite test:smoke`](docs/en/cli-reference.md#testsmoke) `[workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed|parallel] [--keep] [--json]`
- [`aios-lite test:package`](docs/en/cli-reference.md#testpackage) `[source-path] [--keep] [--dry-run] [--json]`

## Agent usage helper

If your AI CLI does not show a visual agent picker, these commands let you interact with agents directly from the terminal. See the [CLI reference](docs/en/cli-reference.md) for full docs on each.

**Discover agents**
- [`aios-lite agents`](docs/en/cli-reference.md#agents) — list all agents and their paths
- [`aios-lite agent:prompt setup --tool=codex`](docs/en/cli-reference.md#agentprompt) — get activation prompt for any agent
- [`aios-lite workflow:plan --classification=SMALL`](docs/en/cli-reference.md#workflowplan) — see the recommended agent sequence

**Setup and locale**
- [`aios-lite init my-project --lang=pt-BR --tool=codex`](docs/en/cli-reference.md#init)
- [`aios-lite install --lang=es --tool=claude`](docs/en/cli-reference.md#install)
- [`aios-lite update --lang=fr`](docs/en/cli-reference.md#update)
- [`aios-lite locale:apply --lang=pt-BR`](docs/en/i18n.md#apply-localized-agent-prompts)

**Maintenance**
- [`aios-lite doctor --fix`](docs/en/cli-reference.md#doctor) — restore any missing managed files

**Parallel orchestration**
- [`aios-lite parallel:init --workers=3`](docs/en/parallel.md)
- [`aios-lite parallel:assign --source=architecture --workers=3`](docs/en/parallel.md#scope-assignment)
- [`aios-lite parallel:status`](docs/en/parallel.md#status-overview)
- [`aios-lite parallel:doctor --fix --dry-run`](docs/en/parallel.md#diagnose-and-repair)

**MCP**
- [`aios-lite mcp:init --dry-run`](docs/en/mcp.md#mcpinit)
- [`aios-lite mcp:doctor --strict-env`](docs/en/mcp.md#mcpdoctor)

**Browser QA**
- [`aios-lite qa:init --url=http://localhost:3000`](docs/en/qa-browser.md#qainit)
- [`aios-lite qa:doctor`](docs/en/qa-browser.md#qadoctor)
- [`aios-lite qa:run --persona=hacker`](docs/en/qa-browser.md#qarun)
- [`aios-lite qa:run --html`](docs/en/qa-browser.md#html-reports) — visual HTML report in `reports/`
- [`aios-lite qa:scan --depth=2 --max-pages=30`](docs/en/qa-browser.md#qascan)
- [`aios-lite qa:report --html`](docs/en/qa-browser.md#html-reports) — retroactive HTML from last run
- [`aios-lite qa:report`](docs/en/qa-browser.md#qareport)

**Integration tests (CI)**
- [`aios-lite test:smoke --lang=pt-BR`](docs/en/cli-reference.md#testsmoke)
- [`aios-lite test:smoke --web3=ethereum`](docs/en/cli-reference.md#testsmoke)
- [`aios-lite test:smoke --profile=parallel`](docs/en/cli-reference.md#testsmoke)
- [`aios-lite test:package --dry-run`](docs/en/cli-reference.md#testpackage)

Default planning includes `@product` → `@ux-ui` for SMALL/MEDIUM projects.

## JSON output for CI
Use `--json` on selected commands. See [JSON schemas](docs/en/json-schemas.md) for output contracts.
- `aios-lite init <project-name> --json`
- `aios-lite install [path] --json`
- `aios-lite update [path] --json`
- `aios-lite agents [path] --json`
- `aios-lite agent:prompt <agent> [path] --json`
- `aios-lite locale:apply [path] --json`
- `aios-lite setup:context [path] --defaults --json`
- `aios-lite i18n:add <locale> --dry-run --json`
- `aios-lite info --json`
- `aios-lite doctor --json`
- `aios-lite context:validate --json`
- `aios-lite test:smoke --json`
- `aios-lite parallel:init --json`
- `aios-lite parallel:assign --json`
- `aios-lite parallel:status --json`
- `aios-lite parallel:doctor --json`
- `aios-lite mcp:doctor --json`
- `aios-lite qa:run --json`
- `aios-lite qa:scan --json`
- `aios-lite qa:doctor --json`
- `aios-lite qa:report --json`
- `aios-lite scan:project --json`

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
See the [Web3 guide](docs/en/web3.md) for the full reference.
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

**CLI reference**
- [CLI reference](docs/en/cli-reference.md) — `init`, `install`, `update`, `info`, `doctor`, `setup:context`, `context:validate`, `agents`, `agent:prompt`, `workflow:plan`, `test:smoke`, `test:package`

**Feature guides**
- [i18n guide](docs/en/i18n.md) — `i18n:add`, `locale:apply`, locale resolution
- [Parallel orchestration](docs/en/parallel.md) — `parallel:init`, `parallel:assign`, `parallel:status`, `parallel:doctor`
- [MCP guide](docs/en/mcp.md) — `mcp:init`, `mcp:doctor`
- [Browser QA guide](docs/en/qa-browser.md) — `qa:init`, `qa:doctor`, `qa:run`, `qa:scan`, `qa:report`
- [Web3 guide](docs/en/web3.md) — `project_type=dapp`, framework detection, Web3 context fields
- [JSON schemas](docs/en/json-schemas.md) — `--json` output contracts for all commands

**Release (internal)**
- [Release guide](docs/en/release.md)
- [Release flow](docs/en/release-flow.md)
- [Release notes template](docs/en/release-notes-template.md)

**Portuguese guides**
- [Início rápido](docs/pt/inicio-rapido.md)
- [Guia de agentes](docs/pt/agentes.md)
- [Cenários de uso](docs/pt/cenarios.md)
- [Clientes AI](docs/pt/clientes-ai.md)
- [Guia do engenheiro](docs/pt/guia-engineer.md)

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
