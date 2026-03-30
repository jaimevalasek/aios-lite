# AIOSON

AI operating framework for hyper-personalized software.

## Requirements

**Core**

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 18.0.0 | Required by the CLI itself |
| An AI CLI tool | — | At least one: [Claude Code](https://claude.ai/code), [Codex CLI](https://github.com/openai/codex), [Gemini CLI](https://github.com/google-gemini/gemini-cli), or [OpenCode](https://opencode.ai) |

**Optional — by feature**

| Feature | Extra requirement |
|---------|-------------------|
| `scan:project` (brownfield scanner) | `aioson-models.json` with a cheap LLM API key (DeepSeek, OpenAI, Gemini, Groq, Together, Mistral, or Anthropic) |
| `qa:run` / `qa:scan` (browser QA) | Playwright + Chromium: `npm install -g playwright && npx playwright install chromium` |
| `mcp:init` / `mcp:doctor` | MCP-compatible tool (Claude Code, Gemini CLI, OpenCode, or Codex CLI with MCP support) |
| Web3 support | Project must use a supported chain toolchain (Hardhat, Foundry, Anchor, etc.) |

## Install

```bash
npm install -g @jaimevalasek/aioson
# then use:
aioson init my-project

# one-off execution without global install
npx @jaimevalasek/aioson init my-project
# or
npx @jaimevalasek/aioson install
```

## Legacy projects and custom stacks
You can run AIOSON on existing/legacy projects (not only new projects).

```bash
# inside an existing project
npx @jaimevalasek/aioson install .
aioson setup:context . --defaults --framework="CodeIgniter 3" --backend="CodeIgniter 3" --database="MySQL"

# generate discovery.md + skeleton-system.md using a cheap LLM (saves tokens in your AI session)
# requires aioson-models.json with your API key
aioson scan:project
```

If your stack is not listed in menus, use free-text values via `--framework`, `--backend`, `--frontend`, `--database`, `--auth`, and `--uiux`.

The npm package is scoped as `@jaimevalasek/aioson`, but the installed CLI commands remain `aioson` and `aios`.

## Commands

**Setup and install**
- [`aioson init`](docs/en/cli-reference.md#init) `<project-name> [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode]`
- [`aioson install`](docs/en/cli-reference.md#install) `[path] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode]`
- [`aioson update`](docs/en/cli-reference.md#update) `[path] [--lang=en|pt-BR|es|fr]`
- [`aioson info`](docs/en/cli-reference.md#info) `[path] [--json]`
- [`aioson doctor`](docs/en/cli-reference.md#doctor) `[path] [--fix] [--dry-run] [--json]`
- [`aioson setup:context`](docs/en/cli-reference.md#setupcontext) `[path] [--defaults] [--framework=<name>] [--lang=en|pt-BR|es|fr]`
- [`aioson context:validate`](docs/en/cli-reference.md#contextvalidate) `[path] [--json]`
- [`aioson scan:project`](docs/en/cli-reference.md#scanproject) `[path] [--provider=<name>] [--dry-run] [--json]`

**Agents**
- [`aioson agents`](docs/en/cli-reference.md#agents)
- [`aioson agent:prompt`](docs/en/cli-reference.md#agentprompt) `<agent> [--tool=codex|claude|gemini|opencode]`
- [`aioson workflow:plan`](docs/en/cli-reference.md#workflowplan) `[path] [--classification=MICRO|SMALL|MEDIUM] [--json]`

**Tracked live sessions for external AI clients**
- `aioson live:start [path] --tool=codex|claude|gemini|opencode --agent=<agent> [--plan=<file>] [--no-launch]`
- `aioson runtime:emit [path] --agent=<agent> --type=task_started|task_completed|milestone|correction|block|plan_checkpoint --summary="..."`
- `aioson live:handoff [path] --agent=<agent> --to=<next-agent> --reason="..."`
- `aioson live:status [path] [--agent=<agent>] [--watch=2] [--json]`
- `aioson live:close [path] [--agent=<agent>] [--status=completed|failed] --summary="..."`

**Locale**
- [`aioson i18n:add`](docs/en/i18n.md#create-a-locale-scaffold) `<locale>`
- [`aioson locale:apply`](docs/en/i18n.md#apply-localized-agent-prompts) `[path] [--lang=en|pt-BR|es|fr]`

**Parallel orchestration**
- [`aioson parallel:init`](docs/en/parallel.md) `[path] [--workers=2..6] [--force] [--dry-run] [--json]`
- [`aioson parallel:assign`](docs/en/parallel.md#scope-assignment) `[path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json]`
- [`aioson parallel:status`](docs/en/parallel.md#status-overview) `[path] [--json]`
- [`aioson parallel:doctor`](docs/en/parallel.md#diagnose-and-repair) `[path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json]`

**MCP**
- [`aioson mcp:init`](docs/en/mcp.md#mcpinit) `[path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json]`
- [`aioson mcp:doctor`](docs/en/mcp.md#mcpdoctor) `[path] [--strict-env] [--json]`

**Browser QA (Playwright)**
- [`aioson qa:init`](docs/en/qa-browser.md#qainit) `[path] [--url=<app-url>] [--dry-run] [--json]`
- [`aioson qa:doctor`](docs/en/qa-browser.md#qadoctor) `[path] [--json]`
- [`aioson qa:run`](docs/en/qa-browser.md#qarun) `[path] [--url=<app-url>] [--persona=naive|hacker|power|mobile] [--headed] [--html] [--json]`
- [`aioson qa:scan`](docs/en/qa-browser.md#qascan) `[path] [--url=<app-url>] [--depth=3] [--max-pages=50] [--headed] [--html] [--json]`
- [`aioson qa:report`](docs/en/qa-browser.md#qareport) `[path] [--html] [--json]`

**Testing and validation (CI / contributors)**
- [`aioson test:smoke`](docs/en/cli-reference.md#testsmoke) `[workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed|parallel] [--keep] [--json]`
- [`aioson test:package`](docs/en/cli-reference.md#testpackage) `[source-path] [--keep] [--dry-run] [--json]`

## Agent usage helper

If your AI CLI does not show a visual agent picker, these commands let you interact with agents directly from the terminal. See the [CLI reference](docs/en/cli-reference.md) for full docs on each.

**Discover agents**
- [`aioson agents`](docs/en/cli-reference.md#agents) — list all agents and their paths
- [`aioson agent:prompt setup --tool=codex`](docs/en/cli-reference.md#agentprompt) — get activation prompt for any agent
- [`aioson workflow:plan --classification=SMALL`](docs/en/cli-reference.md#workflowplan) — see the recommended agent sequence

**Tracked live session flow**
- `aioson live:start . --tool=codex --agent=deyvin --plan=plan.md --no-launch` — open a tracked session envelope before the AI client starts working
- `aioson runtime:emit . --agent=deyvin --type=task_started --title="Fix stock modal"` — mark the start of a visible work slice
- `aioson runtime:emit . --agent=deyvin --type=task_completed --summary="Stock modal fixed" --refs="src/app.js,src/styles.css"` — register a completed slice
- `aioson live:handoff . --agent=deyvin --to=product --reason="Scope needs product decision"` — keep the same live session and switch active AIOSON agent
- `aioson live:status . --agent=product --watch=2` — monitor status, active agent, plan progress, and process liveness
- `aioson live:close . --agent=product --summary="Session closed"` — finish the session and generate `summary.md`

**Setup and locale**
- [`aioson init my-project --lang=pt-BR --tool=codex`](docs/en/cli-reference.md#init)
- [`aioson install --lang=es --tool=claude`](docs/en/cli-reference.md#install)
- [`aioson update --lang=fr`](docs/en/cli-reference.md#update)
- [`aioson locale:apply --lang=pt-BR`](docs/en/i18n.md#apply-localized-agent-prompts)

**Maintenance**
- [`aioson doctor --fix`](docs/en/cli-reference.md#doctor) — restore any missing managed files

**Parallel orchestration**
- [`aioson parallel:init --workers=3`](docs/en/parallel.md)
- [`aioson parallel:assign --source=architecture --workers=3`](docs/en/parallel.md#scope-assignment)
- [`aioson parallel:status`](docs/en/parallel.md#status-overview)
- [`aioson parallel:doctor --fix --dry-run`](docs/en/parallel.md#diagnose-and-repair)

**MCP**
- [`aioson mcp:init --dry-run`](docs/en/mcp.md#mcpinit)
- [`aioson mcp:doctor --strict-env`](docs/en/mcp.md#mcpdoctor)

**Browser QA**
- [`aioson qa:init --url=http://localhost:3000`](docs/en/qa-browser.md#qainit)
- [`aioson qa:doctor`](docs/en/qa-browser.md#qadoctor)
- [`aioson qa:run --persona=hacker`](docs/en/qa-browser.md#qarun)
- [`aioson qa:run --html`](docs/en/qa-browser.md#html-reports) — visual HTML report in `reports/`
- [`aioson qa:scan --depth=2 --max-pages=30`](docs/en/qa-browser.md#qascan)
- [`aioson qa:report --html`](docs/en/qa-browser.md#html-reports) — retroactive HTML from last run
- [`aioson qa:report`](docs/en/qa-browser.md#qareport)

**Integration tests (CI)**
- [`aioson test:smoke --lang=pt-BR`](docs/en/cli-reference.md#testsmoke)
- [`aioson test:smoke --web3=ethereum`](docs/en/cli-reference.md#testsmoke)
- [`aioson test:smoke --profile=parallel`](docs/en/cli-reference.md#testsmoke)
- [`aioson test:package --dry-run`](docs/en/cli-reference.md#testpackage)

Default planning includes `@product` → UI/UX (`@ux-ui`) for SMALL/MEDIUM projects.

## JSON output for CI
Use `--json` on selected commands. See [JSON schemas](docs/en/json-schemas.md) for output contracts.
- `aioson init <project-name> --json`
- `aioson install [path] --json`
- `aioson update [path] --json`
- `aioson agents [path] --json`
- `aioson agent:prompt <agent> [path] --json`
- `aioson locale:apply [path] --json`
- `aioson setup:context [path] --defaults --json`
- `aioson i18n:add <locale> --dry-run --json`
- `aioson info --json`
- `aioson doctor --json`
- `aioson context:validate --json`
- `aioson test:smoke --json`
- `aioson parallel:init --json`
- `aioson parallel:assign --json`
- `aioson parallel:status --json`
- `aioson parallel:doctor --json`
- `aioson mcp:doctor --json`
- `aioson qa:run --json`
- `aioson qa:scan --json`
- `aioson qa:doctor --json`
- `aioson qa:report --json`
- `aioson scan:project --json`

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
aioson i18n:add fr
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
- [AI clients guide (PT-BR)](docs/pt/clientes-ai.md) — tracked usage with Codex, Claude, Gemini, and OpenCode
- [Runtime observability (PT-BR)](docs/pt/runtime-observability.md) — `live:start`, `runtime:emit`, `live:handoff`, `live:status`, `live:close`, and dashboard projections
- [Squad Dashboard](docs/en/squad-dashboard.md) — `squad:dashboard`, real-time monitoring of agents, context, tokens, logs and metrics
- [Session recovery (PT-BR)](docs/pt/recuperacao-de-sessao.md) — `recovery:generate`, `recovery:show`, restore context after compaction
- [Context monitor (PT-BR)](docs/pt/monitor-de-contexto.md) — `context:monitor`, usage bars and warning levels per agent
- [Context search (PT-BR)](docs/pt/busca-de-contexto.md) — `context:search`, `context:search:index`, FTS5 full-text search
- [Context cache (PT-BR)](docs/pt/cache-de-contexto.md) — `context:cache`, save and restore session snapshots
- [Sandbox executor (PT-BR)](docs/pt/sandbox.md) — `sandbox:exec`, safe execution with secret redaction and timeout
- [Agent sharding (PT-BR)](docs/pt/agent-sharding.md) — `agent:load`, `agent:shard:index`, load only relevant agent instruction sections

**Release (internal)**
- [Release guide](docs/en/release.md)
- [Release flow](docs/en/release-flow.md)
- [Release notes template](docs/en/release-notes-template.md)

**Portuguese guides**
- [Início rápido](docs/pt/inicio-rapido.md)
- [Guia de agentes](docs/pt/agentes.md)
- [Squad e Genome](docs/pt/squad-genome.md)
- [Cenários de uso](docs/pt/cenarios.md)
- [Clientes AI](docs/pt/clientes-ai.md)
- [Guia do engenheiro](docs/pt/guia-engineer.md)
- [Squad Dashboard](docs/pt/squad-dashboard.md) — monitoramento em tempo real de agentes, contexto, tokens, logs e métricas

## MCP bootstrap
Generate a local MCP server recommendation file from `project.context.md`:

```bash
aioson mcp:init
aioson mcp:init --dry-run
aioson mcp:init --tool=codex
aioson mcp:doctor
aioson mcp:doctor --strict-env
```

`mcp:init` generates:
- `.aioson/mcp/servers.local.json` (project MCP plan)
- `.aioson/mcp/presets/<tool>.json` (tool-specific preset templates)
- Context7/Database presets in remote-endpoint mode (`mcp-remote`) using:
  - `CONTEXT7_MCP_URL`
  - `DATABASE_MCP_URL` (when database MCP is enabled)

`mcp:doctor` validates:
- core MCP servers (`filesystem`, `context7`)
- preset coverage
- required env vars from enabled servers
- context compatibility for database and Web3 (`chain-rpc`)

## License
GNU Affero General Public License v3.0 (`AGPL-3.0-only`)
