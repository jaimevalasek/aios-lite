---
description: Setup entry repair, first-time onboarding, classification, service intake, and profile-specific questioning
agents: [setup]
task_types: [project-setup, context-repair, onboarding]
triggers: [missing project context, stale setup context, update project setup, classify project]
paths: [.aioson/context/project.context.md]
---

# Setup Onboarding and Repair Flow

Load this module only when project context is missing, invalid, stale, or explicitly being updated.

## Returning-project repair

For inconsistent context, repair before showing a menu:

1. Inspect manifests, framework files, existing code, and current context.
2. Infer objective corrections for `project_type`, `framework`, `framework_installed`, `classification`, language aliases, and `design_skill`.
3. For deeper brownfield ambiguity, inspect code or run:

```bash
aioson scan:project . --folder=src
```

4. Write only objectively inferable corrections.
5. Explain the corrected fields briefly and ask one question only if a required value remains ambiguous.

Do not rerun full onboarding unless the user requests it or the remaining ambiguity genuinely requires it.

For a valid returning project, the kernel's short path applies. If the CLI is available, `aioson memory:summary . --last=5` may add one concise latest-state sentence.

## First-time sequence

Before the first question, load `.aioson/skills/process/decision-presentation/SKILL.md`.

### 0. Detect defaults

Run:

```bash
aioson setup:context . --defaults --json
```

Present one confirmation block containing inferred name, framework plus installed status, type, classification, and language. Ask the user to confirm or state corrections. Apply corrections as explicit `--option=value` flags in the final command.

If the CLI is unavailable, inspect the same facts manually and continue. If an earlier `aioson setup .` already wrote context, treat this as confirmation/repair rather than restarting onboarding.

### 1. Understand the project

Ask one open question:

> Describe the project in one or two sentences — what does it do and who is it for?

Infer:

| Description signals | `project_type` |
|---|---|
| landing page, portfolio, blog, institutional site | `site` |
| REST API, GraphQL, microservice, backend-only service | `api` |
| accounts, dashboard, SaaS, e-commerce | `web_app` |
| CLI, automation, data pipeline, batch job | `script` |
| blockchain, smart contracts, DeFi, NFT, DAO | `dapp` |
| Electron, Tauri, native desktop client, tray/menu-bar utility | `desktop_app` |

Infer `profile` as `developer` for an individual technical owner, `team` for established team/company conventions, and `creator` when the description is non-technical or asks the agent to choose. Present inferences for confirmation; they are not silent defaults.

### 2. Confirm one complete proposal

Propose the relevant stack in one message: project type, profile, classification, backend/runtime, frontend, database, auth, UI, and services. Omit fields irrelevant to the project type:

- `site`: no backend/database/auth by default; resolve hosting and optional CMS only when needed;
- `script`: runtime first; database only when the use case requires it;
- `api`: backend, database, auth; no frontend/UI questionnaire;
- `web_app`: full stack;
- `dapp`: contract framework, networks, wallet, indexer, RPC, and any application layer.

Treat an explicit yes/ok/correct/confirm as confirmation. If the user changes fields, update only those fields and reconfirm once. Load `stack-and-design-reference.md` only when explanation or a framework-specific caveat is material.

### 3. Classify only unresolved complexity

Infer from the description and repository first. Ask only the unclear dimensions:

| Dimension | 0 points | 1 point | 2 points |
|---|---|---|---|
| User roles | one/public | two | three or more |
| External integrations | none | one or two | three or more |
| Business rules | CRUD/standard | some conditions | complex multi-step rules/state machines |

Total: `0–1 = MICRO`, `2–3 = SMALL`, `4–6 = MEDIUM`.

Classification describes the minimum confirmed project scope. Do not inflate it with optional future ideas.

### 4. Resolve optional services

Only for `web_app` and `api`, ask once whether the project needs queues, file storage, WebSockets, transactional email, payments, cache, or search. Default is none only after the user confirms none/not now or the confirmed description objectively excludes them.

### 5. Resolve the visual system

Only for `site` and `web_app`, inspect folder names in `.aioson/skills/design/`; do not read every skill.

Recommend `interface-design` plus the user's reference images, extracted once into per-briefing `.aioson/briefings/{slug}/identity.md` or project-wide `.aioson/context/identity.md`. The framework ships no fixed presets; a project-forged skill (site-forge or hybrid output) is the only alternative, and only when the user names it.

- Never auto-select the recommendation or a forged skill.
- If forged skills exist, list their folder names and ask for one choice.
- If none exist or the user defers, persist `design_skill: ""` and state that Product or UX/UI must resolve it before UI design.
- For `api`, `script`, and non-UI-first work, keep the field empty unless explicitly requested.

Load `stack-and-design-reference.md` for the choice details and `.aioson/docs/reference-identity.md` only if reference-image identity extraction is selected.

## Profile adjustments

- `creator`: prefer managed services and minimal setup; explain each proposal in plain language; ask one decision at a time.
- `team`: record established choices as-is and preserve conventions; do not suggest replacement without a stated problem.
- `developer`: be concise and surface only material tradeoffs.

## Exit

When all required decisions are explicit, load `context-and-handoff.md`. Do not keep asking optional questions, reopen confirmed choices, or begin implementation.
