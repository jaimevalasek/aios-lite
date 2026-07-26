---
description: "Temporary physical continuity record for material feature context that could be lost across compaction or an agent/session boundary."
task_types: [feature-lifecycle, handoff, compaction]
triggers: [compact, clear, cross-session handoff, long feature workflow]
---

# Feature Continuity Mapping

Use `mappings/{slug}/continuity.md` only when a long feature session, `/compact`, `/clear`, or an agent boundary could lose material information that is not yet present in a canonical artifact.

## Authority boundary

The mapping is temporary, noncanonical memory. It:

- never replaces or overrides `plans/{slug}/`, the approved briefing/refinement, prototype and manifest, PRD, Sheldon review, implementation plan, repository, Dev evidence, or QA report;
- never creates scope, grants approval, satisfies a workflow gate, or proves implementation;
- must point to canonical paths and fingerprints instead of copying entire source files;
- must not contain secrets, credentials, private tokens, or unnecessary raw user data.

When the mapping conflicts with a canonical artifact, the canonical artifact wins and the mapping must be corrected.

## When to write

Write or update the same file before a context boundary only when at least one material item would otherwise exist solely in conversation memory, such as:

- a decision and its reason that has not yet reached the owning artifact;
- exact evidence already gathered but not yet recorded by the current stage;
- an open contradiction, failed hypothesis, or next diagnostic action;
- the current `PROM-*`/`CAP-*`/`AC-*`/phase coverage position.

Do not create it for trivial routing or as a second PRD/plan.

## Format

```markdown
---
feature: {slug}
updated_at: 2026-01-01T00:00:00Z
temporary: true
---

# Feature continuity — {slug}

## Canonical authority pointers
- Raw sources: `plans/{slug}/...` — SHA-256: ...
- Briefing/refinement: `.aioson/briefings/{slug}/...`
- Prototype binding: current/none — owner/path/manifest fingerprint
- PRD and Sheldon review: paths and current fingerprints
- Plan/implementation/QA: current paths

## Coverage position
| PROM | Product decision | CAP / AC | Phase | Current state | Canonical evidence |
|---|---|---|---|---|---|

## Decisions not yet persisted
- Decision — reason — owning artifact that must receive it next

## Open gaps and rejected hypotheses
- Gap/hypothesis — evidence — next bounded check

## Current implementation and verification
- Paths changed:
- Commands/results:
- Production-path evidence:

## Next action
- Owner:
- Exact action:
- Stop condition:
```

Keep entries compact and factual. Update in place rather than creating competing mapping files.

## Reading and cleanup

After loading canonical authorities, the next agent may read this mapping to recover continuity. It must independently verify pointers and stale fingerprints before relying on them.

The mapping may remain during the active feature. It is not automatically promoted at close; delete or archive it only through an explicit project/user cleanup policy after all material information is present in canonical artifacts.
