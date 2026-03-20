# AIOSON Config

## Principles
- Less is more: complexity must match problem size.
- Single source of truth: rules live in `.aioson/agents/`.
- Never assume stack: detect first, then ask.
- For `project_type=site` and `project_type=web_app`, visual system choice is explicit workflow data. Record it in `design_skill` or leave it blank on purpose; never auto-pick a design skill silently.

## Project sizes
- MICRO: `@setup -> @product (optional) -> @dev`
- SMALL: `@setup -> @product -> @analyst -> @architect -> @dev -> @qa`
- MEDIUM: `@setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa`

## Official classification
Score (0-6):
- User types: 1=0, 2=1, 3+=2
- External integrations: 0=0, 1-2=1, 3+=2
- Non-obvious rules: none=0, some=1, complex=2

Ranges:
- 0-1: MICRO
- 2-3: SMALL
- 4-6: MEDIUM

## Context contract
`project.context.md` must contain YAML frontmatter with:
- `project_name`
- `project_type`
- `profile`
- `framework`
- `framework_installed` (boolean) — `true` means the framework was detected in the workspace; downstream agents skip installation commands. `false` means it was not detected; agents must include installation steps before any implementation.
- `classification`
- `conversation_language` (BCP-47, for example `en`, `pt-BR`)
- `aioson_version`

Optional UI context fields:
- `design_skill` (for example `cognitive-ui`; keep empty when the visual system is still pending)

Allowed `project_type` values:
- `web_app`
- `api`
- `site`
- `script`
- `dapp`

Optional Web3 context fields (recommended for `project_type=dapp`):
- `web3_enabled` (boolean)
- `web3_networks` (for example `ethereum`, `solana`, `cardano`, `ethereum,solana`)
- `contract_framework` (for example `Hardhat`, `Foundry`, `Anchor`, `Aiken`)
- `wallet_provider` (for example `wagmi`, `RainbowKit`, `Phantom`, `Lace`)
- `indexer` (for example `The Graph`, `Helius`, `Blockfrost`)
- `rpc_provider` (for example `Alchemy`, `Infura`, `QuickNode`)

## Visual system gate
- For `site` and `web_app`, `design_skill` must be chosen explicitly during the workflow or kept explicitly blank.
- `@setup` can register the initial choice.
- `@product` and `@ux-ui` can confirm or update that choice when it is still blank.
- `@dev` must consume the chosen `design_skill`; it must never auto-select one.

## Runtime lifecycle

When AIOSON manages the session via `aioson workflow:next`, ALL orchestration is handled by the CLI:
- Workflow state (which agent is next, what was completed)
- Event emission to `.aioson/runtime/aios.sqlite` (read by the AIOSON Dashboard at /tasks and /logs)
- Sequence enforcement and required-agent checks

The agent `.md` files define WHAT each agent does. The CLI defines HOW the session is orchestrated.

**Agents should call these commands to keep the dashboard in sync (skip if `aioson` CLI is not installed):**

| Moment | Command |
|---|---|
| On activation | `aioson runtime-log . --agent=@{agent} --title="..." --message="Starting {agent}"` |
| After each step | `aioson runtime-log . --agent=@{agent} --message="<what was done>"` |
| On completion | `aioson runtime-log . --agent=@{agent} --finish --status=completed --summary="..."` |
| Advance workflow | `aioson workflow:next . --complete` |

These commands are injected into the agent prompt automatically by `aioson workflow:next`.
In direct mode (LLM without CLI), agents call them manually following the rules in CLAUDE.md / AGENTS.md.

## Devlog (direct LLM mode without CLI)

When the `aioson` CLI is **not available**, agents must write a devlog file at the end of the session (or when the user asks to save progress). This is the only way to preserve session history for the dashboard when the CLI is missing.

**Directory:** `aioson-logs/` (create if absent)
**Filename:** `devlog-{YYYY-MM-DD}T{HH-MM}.md`
**If a devlog from today already exists:** append to it instead of creating a new file.

**Template:**
```markdown
---
agent: "{agent-id}"
session_start: "{ISO 8601}"
session_end: "{ISO 8601}"
status: completed # or partial
summary: "One-line summary of what was accomplished"
---

## Decisions
- {decision} → {why}

## Changes
- {file}: {what changed}

## Next
- {what should happen next session}
```

**Rules:**
- Max 30 lines. This is a decision log, not a transcript.
- Record **why** decisions were made — the "what" is in the git diff.
- Skip the devlog for trivial sessions (quick questions, no code changes).
- When the CLI becomes available, `aioson devlog:sync` will import file-based devlogs into SQLite for the dashboard.

## Agent locale packs
- Localized agent prompts are stored in `.aioson/locales/<locale>/agents/`.
- Active runtime prompts are in `.aioson/agents/`.
- Built-in locale packs: `en`, `pt-BR`, `es`, `fr`.
- Apply locale pack using:
  - `aioson locale:apply` (reads `conversation_language` from context)
  - `aioson locale:apply --lang=pt-BR` (manual override, also accepts `en`, `es`, `fr`)
