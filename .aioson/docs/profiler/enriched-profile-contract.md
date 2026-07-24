---
description: Profiler Enricher artifact schema, verification, evidence coverage, and Forge handoff
agents: [profiler-enricher]
task_types: [profile-output, artifact-validation, profiler-handoff]
triggers: [write enriched profile, verify enriched profile, hand off to profiler forge]
paths: [.aioson/profiler-reports/*/enriched-profile.md]
---

# Enriched Profile Contract

Write `.aioson/profiler-reports/{slug}/enriched-profile.md` incrementally. Keep every required heading even when evidence is insufficient; the content must state the exact gap rather than use a placeholder.

## Frontmatter

```yaml
---
target: "<Full Name>"
slug: "<kebab-case>"
domain_focus: "<focus>"
profile_date: "<YYYY-MM-DD>"
language: "<lang>"
research_sources: 0
user_materials: 0
evidence_points: 0
status: enriched-profile
confidence: low
disc: "insufficient-evidence"
enneagram: "insufficient-evidence"
mbti: "insufficient-evidence"
hexaco_h: "insufficient-evidence"
mpd_patterns: 0
---
```

Replace values only when evidence supports them. Counts are numeric and reflect the evidence actually used.

## Body

```markdown
# Enriched Profile: <Full Name>

## Executive Summary
- identity/domain context
- strongest supported cognitive and operational signals
- overall confidence rationale and key limitations

## Evidence Base
- source inventory and quality distribution
- user-provided material
- strongest clusters, contradictions, and weak areas

## Psychometric Profile
### Behavioral dimensions
### DISC
### Enneagram
### Big Five
### MBTI
### HEXACO-H

## Decision Frameworks
### Framework: <Name>

## Communication Style
### Linguistic Analysis
### Persuasion Pattern
### Signature Expressions
### Communication Under Pressure

## Values and Principles

## Expertise and Operating Context

## Operational Method
### Procedure
### Output Structure
### Style Metrics
### Prohibitions
### Delivery Checklist

## Biases and Blind Spots

## Scientific Complements

## Trait Interactions (MPD)

## Evidence Map
| Claim | Source IDs | Confidence | Contradiction / limitation |
|---|---|---|---|

## Generation Handoff
- compiler-ready method/restriction/checklist/style/output consequences
- advisor behavior and challenge modes
- unsupported claims that Forge must not encode
- research gaps that block requested fidelity
```

## Confidence summary

The document-level confidence is not a personality-certainty score. Explain:

- primary versus secondary/user-only coverage;
- number and diversity of contexts;
- contradiction handling;
- operational-method completeness;
- fields intentionally left unsupported.

## Verification

Run:

```bash
aioson verify:artifact . --kind=enriched-profile --slug=<slug>
```

Fix structural failures and template tokens. If the verifier passes but evidence remains weak, keep the lower confidence. Verification proves artifact shape, not psychological truth.

## Handoff

Return:

- exact artifact path;
- sources/evidence points used;
- confidence rationale;
- strongest operational method and decision framework;
- contradiction and gap summary;
- whether Forge may proceed at the requested fidelity.

Next is `@profiler-forge` when evidence is sufficient. Otherwise hand the exact source gaps to `@profiler-researcher`.
