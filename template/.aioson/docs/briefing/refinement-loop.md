---
description: Deterministic Briefing Refiner audit, browser-review, feedback application, and terminal-state loop
agents: [briefing-refiner]
task_types: [briefing-review, feedback-application]
triggers: [generate briefing review, pending refinement feedback, apply briefing feedback]
---

# Briefing Refinement Loop

Filesystem state chooses the operation. A generated browser review or explicit-confirmation request is a terminal state for the activation; never spin while waiting.

## Generate a review

Use when `refinement-feedback.json` is absent or the user explicitly requests regeneration.

1. Read the current `briefings.md`.
2. Load `.aioson/docs/feature-completeness-contract.md` as a review lens. Challenge ambiguity, redundancy, missing decisions, unclear risks, vague questions, inconsistent terms, vanished promises, happy-path-only behavior, broad nouns/verbs, failure/recovery, and current-system assumptions contradicted by repository evidence. Apply operational CRUD/list/form/filter/pagination lenses only when operational management is relevant.
3. Write `.aioson/briefings/{slug}/refinement-findings.json` as a JSON array:

```json
[
  {
    "section_id": "problem",
    "category": "gap",
    "severity": "high",
    "blocking": true,
    "text": "<specific evidence-backed problem>",
    "recommendation": "<concrete correction>"
  }
]
```

Allowed categories: `ambiguity`, `redundancy`, `gap`, `risk`, `pending-decision`, `scope-suggestion`. Allowed severities: `low`, `medium`, `high`. Use `blocking: true` only when Product cannot responsibly write the PRD without resolution. `section_id` is the section-title kebab case.

For existing-system fit, include observed behavior and exact repository paths in `text`. Routine evidence-backed corrections belong in `recommendation`, not in a new user question.

If a rich operational surface lacks briefing- or project-level `identity.md`, add at most one non-blocking `pending-decision` suggesting the reference-image route. Never force it.

4. If the rich-surface idea is thin or the user asks whether it is worth pursuing, load `.aioson/skills/process/briefing-expansion-scout/SKILL.md`, write/update `.aioson/briefings/{slug}/expansion-scout.md`, and cite it in a finding. Preserve enough accepted evidence for Product's future capability map without assigning `CAP-*`.
5. Generate deterministically:

```bash
aioson briefing:review . --slug={slug} --locale=<interaction_language> --json
```

Fix and rerun `invalid_findings`. On `pending_feedback`, stop and apply it first; pass `--force` only after the user explicitly discards pending feedback.
6. Run the kernel review-intelligence checkpoint, then hand off the browser artifact and stop.

The CLI owns `review.html`; do not hand-write it unless genuinely unavailable.

## Apply pending feedback

Use when `.aioson/briefings/{slug}/refinement-feedback.json` exists.

1. If the user pasted exported JSON, write it verbatim to the canonical feedback path.
2. Incorporate accepted findings and decision-bearing notes into the target section's `current_text`. The CLI writes only `current_text`; notes alone never reach `briefings.md`. When text still equals `original_text`, fold in the decision/rationale, mark a resolved open question, and set the section to `change_requested`. Edit only feedback JSON. Ask instead of guessing an ambiguous note.
3. Dry-run:

```bash
aioson briefing:apply-feedback . --slug={slug} --json
```

Show changed/blocked sections, finding decisions, pending blockers, and every note incorporated into text. A dry-run never writes `briefings.md`. For stale feedback, default to regeneration; offer `--allow-stale` only if the user insists.
4. Stop for explicit confirmation.
5. On confirmation:

```bash
aioson briefing:apply-feedback . --slug={slug} --confirm --json
```

The CLI applies structured JSON, preserves mandatory sections, reverts `approved` to `draft` when needed, archives round inputs, and records `next_action`.
6. On decline:

```bash
aioson briefing:apply-feedback . --slug={slug} --declined --json
```

The briefing stays unchanged; the CLI records skipped changes and archives `refinement-feedback.declined-round{N}.json`.

## Decide after apply

- `next_action: resolve_blockers` or materially changed briefing → create at most one fresh review, then stop for browser feedback.
- No blockers and no substantive open questions → report readiness for user approval and Product.
- Unchanged text with no new evidence → do not regenerate.

Never exit by hand-editing `briefings.md`.

## Round-owned outputs

Generation:

```text
refinement-findings.json
review.html
refinement-feedback.json
refinement-report.md
```

Application may archive:

```text
refinement-feedback.applied-round{N}.json
refinement-findings.applied-round{N}.json
refinement-feedback.declined-round{N}.json
```

All paths are under `.aioson/briefings/{slug}/`.
