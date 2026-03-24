---
name: persona-based-pattern
description: How to create squads driven by a specific person's voice, methodology, or brand
version: 1.0.0
---

# Persona-Based Pattern

A persona-based squad produces content or work that reflects a specific person's
voice, methodology, or cognitive style. This pattern uses the profiler pipeline
to create a cognitive genome that informs creative executors.

## When to use

- Personal branding squads (content in someone's voice)
- Methodology-based squads (applying a specific expert's framework)
- Ghost-writing or content delegation squads
- Squads where "sounding like the person" is a core requirement

## Detection heuristics

The squad agent should suggest profiling when:

- The user mentions a specific person by name
- The goal includes "in the style of", "like {person}", "based on {person}'s approach"
- The domain is personal branding or creator content
- The user references a specific methodology tied to a person

## Profiler pipeline

```
@profiler-researcher → @profiler-enricher → @profiler-forge
         ↓                     ↓                    ↓
   evidence gathering    pattern analysis      genome generation
```

### Step 1: Check existing profile

Before running the pipeline, check `.aioson/profiler-reports/{person-slug}/`.
If a profile exists, reuse it.

### Step 2: Run profiling (if needed)

1. `@profiler-researcher` — collects public evidence about the person
2. `@profiler-enricher` — analyzes patterns, voice, methodology
3. `@profiler-forge` — generates the cognitive genome

### Step 3: Apply genome selectively

The genome should only be applied to executors that produce voice-sensitive output:

| Executor type | Apply genome? | Reason |
|---|---|---|
| Copywriter/Scriptwriter | Yes | Needs the person's voice |
| Editor/Reviewer | Yes | Needs to judge voice fidelity |
| Researcher/Analyst | No | Research should be objective |
| Orchestrator | No | Coordination doesn't need voice |
| Worker (no LLM) | No | Deterministic, no voice needed |

### Step 4: Register in blueprint

```json
{
  "profiling": {
    "person": "Person Name",
    "genomePath": ".aioson/profiler-reports/person-slug/genome.json",
    "genomeSlug": "person-slug",
    "evidenceMode": "verified",
    "profiledAt": "2026-03-24T00:00:00Z"
  }
}
```

## Executor recommendations

| Role | Type | Model tier | Genome? |
|---|---|---|---|
| researcher | agent | balanced | No |
| scriptwriter | agent | powerful | Yes |
| copywriter | agent | powerful | Yes |
| editor | agent | balanced | Yes |
| brand-guardian | agent | balanced | Yes |
| publisher | worker | none | No |

## Anti-patterns

- **Applying genome to all executors:** Research and orchestration don't need persona voice.
- **Profiling without consent:** Always ask the user before running the profiler pipeline.
- **Stale genome:** If the person's style has evolved, the genome may need refreshing.
- **Over-reliance on genome:** The genome calibrates voice, it doesn't replace creative judgment.
- **Copying vs. calibrating:** The goal is to capture methodology and voice patterns, not to clone or impersonate.

## Quality gates for persona fidelity

- Voice consistency: Does the output sound like the person across all pieces?
- Methodology alignment: Does the approach follow the person's known frameworks?
- Authenticity check: Would the person recognize this as something they might produce?
- Originality: Is it inspired by the person, not a copy of their specific works?
