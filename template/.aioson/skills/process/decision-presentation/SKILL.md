---
name: decision-presentation
description: Profile-aware contract for necessary user decisions, localized language, and bounded question cadence
activation: Read profile from project.context.md; creator is the fallback for absent, empty, auto, or legacy beginner.
agents: [product, planner, briefing, refiner, setup]
task_types: [user-decision, approval]
triggers: [user decision, trade-off, approval choice, present options, decisao do usuario, apresentar opcoes]
---

# Skill: decision-presentation

Load before the first real user-facing decision. Do not load merely to produce an informational response.

## Profile contract

| profile | questions | jargon | extras |
|---|---|---|---|
| `creator` or absent/empty/`auto`/legacy `beginner` | one per turn | translate | recommended first option and pause option |
| `developer` | up to five numbered questions per batch | allowed | recommendation optional |
| `team` | same as developer | allowed | also write the executive summary at `agent:done`: `aioson feature:summary . --feature={slug} --write` (→ `.aioson/context/executive-summary-{slug}.md`, jargon translated per `interaction_language`); the owner records `aioson feature:acknowledge` |

## Core rules

### Rule 1 — Structured decisions in creator mode

Use `AskUserQuestion` with 2–4 options. Do not ask a free-form open question; free-form input is allowed only through the client-provided Other option.

### Rule 2 — Recommend first

The first option has a localized recommendation marker such as `(Recommended)` and a one-sentence plain-language description of why and the operational trade-off.

### Rule 3 — One question per turn

In creator mode, emit at most one `AskUserQuestion`; stage independent decisions across turns.

### Rule 4 — Translate framework jargon

Immediately before emitting a framework term in creator mode, load exactly one matching `references/jargon-map.{interaction_language}.yaml`; support `en` and `pt-BR`, fallback to `en`. Replace case-sensitive whole terms only, never substrings. Developer/team may keep jargon; team executive summaries use translations.

### Rule 5 — Pause remains available

Include a localized, non-default pause option explaining that work can resume from recorded state.

### Rule 6 — Five or more alternatives

Present the three strongest options plus the client-provided Other path. If Other is selected, interpret the answer against the known alternatives without forcing a false match.

### Rule 7 — No question without a blocked decision

Never ask because an agent activated. A question is justified only by a real fork that prevents safe progress. With no stated task or required continuation, provide a brief evidence-based status/recommendation and stop.

## Output contract

A creator-mode decision contains one structured question, 2–4 mutually exclusive options, recommended first option with plain-language why, localized pause, translated jargon, and no second open question. Developer/team mode may batch at most five numbered questions.

## Loading

1. Read the effective profile.
2. Continue without a question when reasonable evidence supports a safe default.
3. If a blocking decision remains, apply Rules 1–7.
4. Load one jargon map only when a framework term will be shown.

Load `references/compatibility-and-doctor.md` only when diagnosing compliance, migration, task-profile override, or historical V1 behavior.
