---
feature: sdlc-process-upgrade
classification: MEDIUM
generated_by: analyst
generated_at: "2026-04-24T00:58:45-03:00"
sources:
  - .aioson/context/prd-sdlc-process-upgrade.md
  - .aioson/context/sheldon-enrichment-sdlc-process-upgrade.md
  - .aioson/plans/sdlc-process-upgrade/manifest.md
status: gate_a_approved
---

# Requirements — SDLC Process Upgrade

## Feature Summary

Corrigir o fluxo de desenvolvimento do AIOSON para que PRD, enrichment, requirements, architecture, PM plan, orchestrator, dev, QA, gates, preflight, runtime e memoria compartilhem contratos consistentes. O objetivo pratico e impedir que informacoes discutidas no inicio da feature se percam antes da implementacao.

## Classification

MEDIUM.

Score operacional:

| Dimension | Score | Evidence |
|---|---:|---|
| User types | 0 | Desenvolvedor/mantenedor do AIOSON |
| External integrations | 1 | CLI, filesystem, SQLite runtime, agentes externos |
| Business rule complexity | 2 | Gates, handoffs, estado, precedencia de artefatos, workflows multiagente |

Mesmo com score base 3, a feature permanece MEDIUM porque altera contratos transversais usados por agentes oficiais, CLI, runtime e memoria.

## Canonical Artifacts

| Artifact | Canonical path | Owner | Readers | Notes |
|---|---|---|---|---|
| PRD | `.aioson/context/prd-{slug}.md` | `@product` | all downstream | Fonte de produto ativa |
| Sheldon enrichment | `.aioson/context/sheldon-enrichment-{slug}.md` | `@sheldon` | `@analyst`, `@architect`, `@pm`, `@dev`, `@qa` | Enriquecimento validado contra arquivos reais |
| Requirements | `.aioson/context/requirements-{slug}.md` | `@analyst` | `@architect`, `@pm`, `@orchestrator`, `@dev`, `@qa` | Gate A |
| Feature spec | `.aioson/context/spec-{slug}.md` | `@analyst` seeds, downstream updates | all downstream | Memoria viva da feature |
| Architecture | `.aioson/context/architecture.md` and/or design docs | `@architect` | `@pm`, `@orchestrator`, `@dev`, `@qa` | Gate B |
| Implementation plan | `.aioson/context/implementation-plan-{slug}.md` | `@pm` for MEDIUM | `@orchestrator`, `@dev`, `@deyvin`, `@qa` | Gate C |
| Sheldon phased plan | `.aioson/plans/{slug}/manifest.md` + `plan-*.md` | `@sheldon` | downstream as source/phase plan | Active manifest wins during execution while not complete |
| Project pulse | `.aioson/context/project-pulse.md` | every agent at session end | all agents | Crash recovery and next action |
| Root source plans | `plans/*.md` | pre-production source only | `@product`, `@sheldon` | Read-only source area; only `source-manifest.md` may be updated |
| Public docs | `docs/pt/` | documentation maintainers | users | System docs only after behavior is defined/implemented |

## Modified Contracts

### CTX-SDLC-01 — Root `plans/` source contract

`plans/` at repository root is a disposable pre-production source area. Agents may read files from it and may update `plans/source-manifest.md` to record consumption, but must not create executable plans, handoff plans, implementation plans, or system documentation there.

### CTX-SDLC-02 — `.aioson/plans/{slug}/` phased plan contract

`.aioson/plans/{slug}/` is the canonical destination for phased plans created by `@sheldon` after sizing/confirmation. It contains a `manifest.md` and one or more phase files.

### CTX-SDLC-03 — `.aioson/context/implementation-plan-{slug}.md` execution contract

For MEDIUM features, `@pm` owns the initial `implementation-plan-{slug}.md`. `@dev` consumes it and may update execution state, but must not be the primary owner of generating the initial Gate C plan.

### CTX-SDLC-04 — Handoff contract

Every official workflow agent handoff must include:

| Field | Required |
|---|---|
| next_agent | yes |
| why_this_agent | yes |
| produced_artifacts | yes |
| gate_status | yes |
| blocking_missing_artifacts | yes, if any |
| concrete_next_command_or_activation | yes |
| how_to_approve_if_gate_blocks | yes, when approval is mentioned |

### CTX-SDLC-05 — Dev execution context contract

`@dev` and `@deyvin` must start from an explicit active execution artifact:

1. Active `.aioson/plans/{slug}/manifest.md` wins while its status is not `complete` or `done`.
2. While a manifest is active, `implementation-plan-{slug}.md` is supporting context.
3. After the manifest is complete, `implementation-plan-{slug}.md` becomes the primary plan if work remains.
4. Completed phases must not be re-executed.

## Business Rules

### REQ-SDLC-01 — Canonical path protection

Agents and CLI validators must distinguish source material, canonical workflow artifacts, public documentation, and runtime state. The system must flag or prevent operational plans in `docs/pt/` and executable plans in root `plans/`.

Acceptance criteria: AC-SDLC-01 through AC-SDLC-04.

### REQ-SDLC-02 — Gate approval UX

When a gate is blocked or requires approval, the user must receive a concrete command or precise fallback. The system must not say only "approve the gate" without explaining how.

Acceptance criteria: AC-SDLC-05 through AC-SDLC-09.

### REQ-SDLC-03 — State continuity and next step recovery

`workflow:status`, `workflow:next`, `workflow:execute --dry-run`, `preflight`, `project-pulse`, `agent:done`, and `spec-{slug}.md` must agree on the current feature, current gate, next agent, and reason. A new chat must be able to resume without asking the user to re-explain previous phases.

Acceptance criteria: AC-SDLC-10 through AC-SDLC-14.

### REQ-SDLC-04 — Implementation plan ownership

For MEDIUM features, `@pm` is the owner of the initial implementation plan and Gate C readiness. Existing contradictory prompt/rule/skill references must be reconciled.

Acceptance criteria: AC-SDLC-15 through AC-SDLC-18.

### REQ-SDLC-05 — Handoff and preflight readiness

`preflight` must not return false READY for agents without enough context. It must include a role-specific context package and classify missing/stale artifacts as blockers or warnings.

Acceptance criteria: AC-SDLC-19 through AC-SDLC-23.

### REQ-SDLC-06 — Dev execution context

`@dev` and `@deyvin` must know which artifact is primary, which files to read for the current phase, and which phases are already complete.

Acceptance criteria: AC-SDLC-24 through AC-SDLC-28.

### REQ-SDLC-07 — Product and Sheldon flow

`@product` must register new features and produce objective handoff. `@sheldon` must select the target PRD before applying early-exit logic, so a stale global `spec.md` or another feature cannot block the selected PRD.

Acceptance criteria: AC-SDLC-29 through AC-SDLC-33.

### REQ-SDLC-08 — Memory, observability, docs, and regression safety

Bootstrap, discover refresh, devlogs, runtime/pulse, help text, docs, and tests must be aligned with real behavior. Docs are updated after CLI/prompts are changed, not before.

Acceptance criteria: AC-SDLC-34 through AC-SDLC-40.

## Acceptance Criteria

### Phase 1 — Canonical Paths and Source Contract

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-01 | Given an agent tries to create an operational plan, when the destination is chosen, then `docs/pt/` is rejected as a plan destination and `.aioson/plans/{slug}/` or `.aioson/context/implementation-plan-{slug}.md` is required. | REQ-SDLC-01 |
| AC-SDLC-02 | Given root `plans/` contains pre-production analysis, when `@product` or `@sheldon` reads it, then the files may be consumed as source and recorded in `plans/source-manifest.md`, but no executable plan is created there. | REQ-SDLC-01 |
| AC-SDLC-03 | Given `project-map.md` path rules are loaded, when product/process agents create artifacts, then `@product`, `@sheldon`, `@pm`, `@orchestrator`, and `@discover` are covered by the same path rules as technical agents. | REQ-SDLC-01 |
| AC-SDLC-04 | Given a user asks "plano", when an agent decides the artifact type, then it distinguishes phased Sheldon plan, PM implementation plan, source plan, and public docs in the response and output path. | REQ-SDLC-01 |

### Phase 2 — Gates and Approval UX

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-05 | Given Gate A/B/C/D is blocked, when `gate:check` or a handoff reports the blocker, then the output includes missing evidence and the responsible next agent. | REQ-SDLC-02 |
| AC-SDLC-06 | Given an agent says a gate needs approval, when the message is shown, then it includes the exact CLI command if available or the exact manual fallback field to update. | REQ-SDLC-02 |
| AC-SDLC-07 | Given gate fields exist in `spec-{slug}.md`, when parsed by CLI, then the parser reads a deterministic machine-readable format and does not depend on accidental prose matches. | REQ-SDLC-02 |
| AC-SDLC-08 | Given `workflow:next` blocks on a gate, when it prints the next action, then the message explains whether the user should invoke `@analyst`, `@architect`, `@pm`, `@dev`, or run a gate command. | REQ-SDLC-02 |
| AC-SDLC-09 | Given Gate C is not approved, when `@dev` is activated for MEDIUM work, then `@dev` stops before implementation and explains how to obtain or approve the implementation plan. | REQ-SDLC-02 |

### Phase 3 — State Continuity and Next Step

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-10 | Given a feature has PRD, enrichment, requirements, spec, architecture, and plan states, when `workflow:status`, `workflow:next`, `preflight`, and `artifact:validate` run, then they agree on the next missing artifact and next agent. | REQ-SDLC-03 |
| AC-SDLC-11 | Given a new chat starts after a completed phase, when the next agent reads `project-pulse.md` and `spec-{slug}.md`, then it does not claim the previous phase is missing if the canonical artifact exists. | REQ-SDLC-03 |
| AC-SDLC-12 | Given `agent:done` is run by an official agent, when it completes, then enough state is persisted for the next agent to know the last gate, produced artifacts, and recommended next action. | REQ-SDLC-03 |
| AC-SDLC-13 | Given stale `dev-state.md` belongs to another feature or status `done`, when preflight runs for a new feature, then the stale state appears as warning/context, not active execution state. | REQ-SDLC-03 |
| AC-SDLC-14 | Given `workflow:execute --dry-run --feature=<slug>` is run, when it reports blockers, then blockers match artifact/gate reality and include `--feature` in help/documentation. | REQ-SDLC-03 |

### Phase 4 — Implementation Plan Ownership

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-15 | Given a MEDIUM feature reaches PM phase, when `@pm` completes, then `.aioson/context/implementation-plan-{slug}.md` exists with `status: approved` or explicit blocker reasons. | REQ-SDLC-04 |
| AC-SDLC-16 | Given `.aioson/agents/pm.md`, rules, handoff-contract, artifact-map, and SDD references are compared, when the feature is implemented, then all agree that `@pm` owns the initial implementation plan for MEDIUM. | REQ-SDLC-04 |
| AC-SDLC-17 | Given Gate C is checked, when the implementation plan exists but is draft/blocked, then Gate C remains blocked and the output identifies `@pm` as the responsible agent. | REQ-SDLC-04 |
| AC-SDLC-18 | Given `@dev` starts after Gate C, when it reads the implementation plan, then it treats decisions marked final/pre-taken as final and does not reopen product decisions. | REQ-SDLC-04 |

### Phase 5 — Handoff and Preflight Readiness

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-19 | Given `preflight --agent=sheldon --feature=<slug>` runs, when PRD/enrichment/features artifacts exist, then context_package includes the PRD and relevant enrichment/status files. | REQ-SDLC-05 |
| AC-SDLC-20 | Given `preflight --agent=orchestrator --feature=<slug>` runs before requirements/spec/Gate C are ready, then it returns BLOCKED or READY_WITH_WARNINGS, not READY. | REQ-SDLC-05 |
| AC-SDLC-21 | Given `@orchestrator` runs in feature mode, when it builds worker context, then it reads `requirements-{slug}.md` and the body of `spec-{slug}.md`, not only spec frontmatter. | REQ-SDLC-05 |
| AC-SDLC-22 | Given `artifact:validate --feature=<slug>` finds missing artifacts, when output is produced, then it includes `next_missing` and `next_agent`. | REQ-SDLC-05 |
| AC-SDLC-23 | Given an official agent lacks implemented readiness rules, when preflight runs, then it never defaults to READY with only `project.context.md`; it must return warning/blocker with missing context. | REQ-SDLC-05 |

### Phase 6 — Dev Execution Context

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-24 | Given `.aioson/plans/{slug}/manifest.md` exists and status is not `complete` or `done`, when execution context is computed, then manifest is the active execution artifact. | REQ-SDLC-06 |
| AC-SDLC-25 | Given manifest and implementation plan coexist while manifest is active, when `@dev` starts, then implementation plan is auxiliary context and manifest phase status controls execution. | REQ-SDLC-06 |
| AC-SDLC-26 | Given `@dev` starts a specific manifest phase, when context package is built, then it includes exactly the phase file, manifest, PRD, enrichment, requirements, spec, architecture, and implementation plan when relevant. | REQ-SDLC-06 |
| AC-SDLC-27 | Given a manifest phase is marked done, when `@dev` resumes, then it skips that phase and starts from the next pending phase. | REQ-SDLC-06 |
| AC-SDLC-28 | Given `@deyvin` is used for continuity, when both manifest and implementation plan exist, then it applies the same precedence as `@dev`. | REQ-SDLC-06 |

### Phase 7 — Product and Sheldon Flow

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-29 | Given multiple PRDs or stale global specs exist, when `@sheldon` starts, then it lists/selects the target PRD first and only then evaluates completion/early-exit for that selected slug. | REQ-SDLC-07 |
| AC-SDLC-30 | Given project-level `spec.md` exists and may be complete for another scope, when `@sheldon` analyzes `prd-{slug}.md`, then `spec.md` does not block enrichment for the selected feature. | REQ-SDLC-07 |
| AC-SDLC-31 | Given a `prd-{slug}.md` exists but `features.md` lacks the slug, when `@sheldon` runs, then it emits a warning/repair suggestion and continues if the PRD is otherwise valid. | REQ-SDLC-07 |
| AC-SDLC-32 | Given `@product` creates a new PRD, when the session ends, then `features.md` includes the feature with `in_progress` status and started date. | REQ-SDLC-07 |
| AC-SDLC-33 | Given `@product` hands off to the next phase, when the final message is produced, then it states next agent, reason, produced PRD path, and pass criteria for `@sheldon` or `@analyst`. | REQ-SDLC-07 |

### Phase 8 — Memory, Observability, Docs and Regression Tests

| AC | Criterion | Related REQ |
|---|---|---|
| AC-SDLC-34 | Given bootstrap memory exists, when checked after setup/discover refresh, then it contains `what-is.md`, `what-it-does.md`, `how-it-works.md`, and `current-state.md`. | REQ-SDLC-08 |
| AC-SDLC-35 | Given `@discover` refresh mode runs with one or more bootstrap files missing, when it completes, then missing bootstrap files are created instead of assuming cache is complete. | REQ-SDLC-08 |
| AC-SDLC-36 | Given `devlog:process` is tested, when tests run, then they use fixtures/copies and do not modify real project devlogs. | REQ-SDLC-08 |
| AC-SDLC-37 | Given `agent:done` or `pulse:update` completes, when a new agent starts, then project-pulse contains sufficient last_agent, last_gate, active feature, blockers, and next action. | REQ-SDLC-08 |
| AC-SDLC-38 | Given CLI help is displayed, when `workflow:execute` is listed, then required/real flags include `--feature`, `--tool`, `--start-from`, and `--max-checkpoints` if implemented. | REQ-SDLC-08 |
| AC-SDLC-39 | Given docs in `docs/pt/` are updated, when reviewed, then they describe implemented CLI/prompt behavior and not speculative operational plans. | REQ-SDLC-08 |
| AC-SDLC-40 | Given the regression suite runs, when it passes, then it covers path contract, gate approval UX, preflight readiness, Sheldon RF-01, manifest/plan precedence, and PM ownership. | REQ-SDLC-08 |

## Edge Cases and Failure Modes

| Case | Expected behavior |
|---|---|
| `docs/pt/` contains an operational plan | Validator or review flags it as wrong destination; migrate to `.aioson/plans/{slug}/` or `.aioson/context/implementation-plan-{slug}.md` depending on type |
| Root `plans/` analysis is stale | `@product`/`@sheldon` may read it only as source and must validate against current files before creating requirements |
| Gate field uses nested YAML unsupported by parser | Parser/test fails deterministically; templates migrate to flat gate fields or JSON inline |
| `preflight` lacks agent-specific rules | Output is warning/blocker, not READY |
| `dev-state.md` points to another done feature | It is context history only; not active state |
| `implementation-plan` and manifest disagree | Active non-complete manifest wins; disagreement is warning for `@pm`/`@orchestrator` |
| User opens a new chat at any phase | Next agent can recover from `project-pulse`, `spec-{slug}`, and preflight context package |

## Out of Scope

- Rewriting the complete workflow engine.
- Creating a second orchestration system parallel to `workflow:next` / `workflow:execute`.
- Implementing dashboard/UI changes.
- Adding real multi-worktree lane isolation.
- Migrating every historical artifact in this repo.
- Treating root `plans/` source material as permanent documentation.

## Gate A Evaluation

Gate A: approved.

Evidence:

- Objectives are clear and scoped to AIOSON SDLC continuity.
- Behavioral rules are mapped to `REQ-SDLC-*`.
- Acceptance criteria are independently verifiable as `AC-SDLC-*`.
- Constraints and out-of-scope items are explicit.
- Known ambiguities are deferred to `@architect`/`@pm` where they belong.

Next required phase for MEDIUM: `@architect` must define the technical design before `@pm` and `@dev`.
