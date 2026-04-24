---
generated_by: product
generated_at: "2026-04-24T00:25:28-03:00"
confidence: medium
---

# What It Does

AIOSON is a Node.js CLI framework for spec-driven development with specialized agents, workflow routing, deterministic gates, runtime telemetry, context artifacts and recovery support.

## Active capabilities

- Creates and routes official agents through `.aioson/agents/`.
- Stores project and feature artifacts in `.aioson/context/`.
- Supports SDD flows with PRDs, requirements, specs, architecture, implementation plans and QA reports.
- Provides deterministic CLI helpers such as `preflight`, `gate:check`, `artifact:validate`, `workflow:next`, `workflow:execute`, `pulse:update`, `agent:done`, `verify:gate` and runtime/live session commands.
- Maintains runtime telemetry in `.aioson/runtime/aios.sqlite`.
- Supports project memory layers including bootstrap context, project pulse, devlogs, research cache and brains.

## Current improvement focus

Feature `sdlc-process-upgrade` is open to correct process-level misalignments found in the development workflow:

- gate approval ergonomics
- handoff contract completeness
- `implementation-plan` ownership
- precedence between Sheldon manifests and implementation plans
- Sheldon PRD target detection
- bootstrap/session/brain memory integration
- observability for primary workflow agents

## Business rules and constraints

- AIOSON should keep one workflow motor centered on `workflow:next` and `workflow:execute`.
- For MEDIUM work, gates A, B and C are blocking before implementation.
- Agents should write durable artifacts to disk instead of delivering only in chat.
- CLI/runtime should own deterministic state transitions; prompts should not rederive mechanical state when a command can provide it.
