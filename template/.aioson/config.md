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

Optional test engineering (activate after @dev when coverage is insufficient):
- `@tester` — systematic test engineering for implemented apps. Activate when: (1) app was built without adequate tests, (2) @qa identifies coverage gaps in 3+ modules, or (3) working on a legacy/brownfield project.

## Official classification
Score (0-6):
- User types: 1=0, 2=1, 3+=2
- External integrations: 0=0, 1-2=1, 3+=2
- Non-obvious rules: none=0, some=1, complex=2

Ranges:
- 0-1: MICRO
- 2-3: SMALL
- 4-6: MEDIUM

## Context budget warning

Configuração: `context_warning_threshold` (padrão: 65%)

| Classificação | Threshold recomendado |
|---------------|-----------------------|
| MICRO | 75% (fases curtas, ok chegar mais alto) |
| SMALL | 65% (padrão) |
| MEDIUM | 55% (fases longas, aviso mais cedo) |

Quando o agente perceber que está próximo do threshold:
1. Escrever todos os artefatos em progresso (disk‑first)
2. Emitir aviso: "⚠ Contexto em {X}% — recomendo `/clear` antes da próxima fase"
3. Incluir no `last_checkpoint` o que estava sendo feito

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

Optional testing fields:
- `test_runner` (for example `pest`, `jest`, `vitest`, `pytest`, `rspec`, `foundry`)

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

## On-demand context layers

AIOSON uses three on-demand context layers that any agent can load automatically. Each layer is optional — if the directory is empty or absent, agents skip it silently.

### Rules (`.aioson/rules/`)

Project-specific rules that override agent defaults. Each file must have YAML frontmatter:

```markdown
---
agents: [dev, architect]   # empty [] = universal rule loaded by all agents
---

# Database conventions
- Always use soft deletes
- Never use raw SQL — use the ORM query builder
```

**When to use:** coding standards, naming conventions, architecture constraints, security policies, team agreements.

### Docs (`.aioson/docs/`)

Persistent documentation loaded on-demand based on relevance. Each file must have YAML frontmatter:

```markdown
---
description: "Auth module refactoring plan — migration from JWT to sessions"
---

# Refactoring Plan — Auth Module
...
```

Agents load a doc only when its `description` matches the current task or when a loaded rule references it.

**When to use:**
- Refactoring plans that span multiple sessions
- Integration guides (Stripe, external APIs)
- Domain knowledge the LLM needs but cannot infer from code
- Migration strategies and rollback procedures
- Performance benchmarks and constraints

**Key principle:** docs persist across sessions. A refactoring plan saved here will be available to any future agent that works on the same area — no need to re-explain context.

### Design docs (`.aioson/context/design-doc.md`)

Living decision documents that bridge discovery and implementation. Produced by `@discovery-design-doc`.

```markdown
---
description: "Billing module — Stripe integration with metered pricing"
scope: "billing"
agents: [dev, architect]   # empty [] = all agents load it
---
```

**Design-doc vs PRD — when to use each:**

| | PRD (`prd.md`) | Design doc (`design-doc.md`) |
|---|---|---|
| **Produced by** | `@product` | `@discovery-design-doc` |
| **Focus** | What and why — vision, users, problem, features | How — technical flows, decisions, risks, slices |
| **Audience** | All agents | Technical agents (dev, architect, qa) |
| **Lifecycle** | Written once, enhanced by @pm | Living document, updated as decisions are made |
| **When to create** | Every project/feature | Complex features needing technical clarity |

A project can have both: the PRD defines the product; the design-doc defines the approach. For simple features (MICRO), only the PRD may be needed.

## Skills

AIOSON ships three types of skills in `.aioson/skills/`:

| Type | Directory | How agents load them |
|---|---|---|
| **Design skills** | `.aioson/skills/design/` | Explicit — via `design_skill` in project.context.md. Only ONE can be active. |
| **Static skills** | `.aioson/skills/static/` | Automatic — agents match by `framework` in project.context.md |
| **Dynamic skills** | `.aioson/skills/dynamic/` | Automatic — agents load when task references external services |

### Installed skills (`.aioson/installed-skills/`)

Third-party or custom skills installed via CLI:

```bash
aioson skill:install --slug=my-skill --from=./path/to/SKILL.md
aioson skill:install --slug=my-skill --from=npm
aioson skill:install --slug=my-skill --from=cloud
```

After installation, skills are distributed to editor directories (`.claude/skills/`, `.cursor/skills/`, `.windsurf/skills/`) and become available as slash commands in supported editors.

### Listing available skills

```bash
aioson skill:list              # show installed skills
aioson skill:remove --slug=x   # remove an installed skill
```

**Note:** Source skills in `.aioson/skills/` are loaded automatically by agents — they do not need installation. Only third-party skills require `skill:install`.

## Session handoff

When a workflow stage completes or an agent finishes via `runtime-log --finish`, AIOSON generates `.aioson/context/last-handoff.json` with:

- What was done in the last session
- What comes next
- Which agent should be activated
- Open decisions pending

Agents can read this file on activation to resume work without losing context between sessions.

## Agent locale packs
- Localized agent prompts are stored in `.aioson/locales/<locale>/agents/`.
- Active runtime prompts are in `.aioson/agents/`.
- Built-in locale packs: `en`, `pt-BR`, `es`, `fr`.
- Apply locale pack using:
  - `aioson locale:apply` (reads `conversation_language` from context)
  - `aioson locale:apply --lang=pt-BR` (manual override, also accepts `en`, `es`, `fr`)
