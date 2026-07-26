---
description: "Persist material cross-session feature continuity to mappings/{slug}/continuity.md before /compact or /clear without confusing it with raw sources or canonical artifacts."
task_types: [handoff]
triggers: [handoff, session persistence, last handoff, compact, clear]
---

# Handoff Persistence

Load this before a routing recommendation involving `/compact`, `/clear`, a fresh terminal, or another context boundary that may compress or drop material conversation state.

## Storage boundary

- `plans/{slug}/` contains user-provided raw feature sources. Briefing inventories and fingerprints these files; do not write continuity notes there.
- `mappings/{slug}/continuity.md` contains temporary cross-compaction/session continuity.
- `.aioson/briefings/{slug}/`, the PRD, Sheldon review, plan, repository, Dev evidence, and QA report remain canonical for their respective decisions and proof.

`/compact` preserves a summary but can omit low-salience details; `/clear` drops conversation state. A physical mapping helps the next agent resume, but never becomes a specification, approval, gate, or implementation proof.

## Rule

When the next stage needs material facts that exist only in this session, update `mappings/{slug}/continuity.md` according to `.aioson/docs/feature-continuity-mapping.md` before recommending the context boundary. Point to sources and canonical artifacts instead of copying them.

Skip the mapping for trivial routing, same-session continuation with no session-only evidence, or when all relevant information is already in canonical artifacts.

## Handoff message

```text
Next agent: @{agent} — {reason}
Continuity: mappings/{slug}/continuity.md updated; canonical authorities still govern
/compact: recommended for same-feature continuation
/clear: only for a deliberate hard reset, feature switch, polluted context, or security-sensitive reset
```

## Anti-patterns

- Writing agent diagnostics into `plans/{slug}/` and contaminating user sources.
- Treating the mapping as approval or letting it override a stale/missing PRD, review, plan, implementation, or QA report.
- Copying secrets or entire raw sources into the mapping.
- Creating multiple competing continuity files instead of updating the one feature file.
- Claiming `/compact` is lossless. It is not; verify the physical pointers on resume.
