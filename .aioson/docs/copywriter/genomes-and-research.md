---
description: Lazy genome resolution, audience evidence, avatar depth, and bounded copy research
agents: [copywriter]
task_types: [copy-research, genome-selection, audience-diagnosis]
triggers: [concrete copy target, PMS research, master copywriter, brand voice]
---

# Copywriter Genomes and Research

## Genome resolution

For each slug:

1. Prefer `.aioson/genomes/{slug}/SKILL.md`; read its manifest only when fidelity/type affects use, and load only references whose `when` condition matches the task.
2. Otherwise load legacy `.aioson/genomes/{slug}.md` end to end.
3. If both exist, warn once and prefer the folder.
4. If neither exists, continue with baseline copy knowledge.

Load the foundational `copywriting` genome when installed, then project/brand/domain genomes that directly apply.

Use `.aioson/genomes/INDEX.md` for discovery. Its operational sections are binding. Choose at most one applied master per piece; Schwartz may be the foundational layer. Useful audience lean:

- Halbert: market-first direct response and long-form
- Kennedy: premium/direct response
- Brunson: funnels, story, community
- Georgi: research/mechanism/VSL
- Ladeira: Brazilian mainstream/conversational
- Ícaro de Carvalho: Brazilian intellectual/authorial
- Diogo Gomes: Brazilian aspirational/pragmatic

If several installed masters fit equally and the choice would materially change voice, recommend one and ask. Otherwise select from explicit project/index evidence.

## Audience depth

Confirm audience identity, lived problem, desired outcome, decision triggers, objections, vocabulary, and proof threshold. If evidence is shallow, construct a compact working avatar from PRD/discovery/user input and label inferred claims; do not depend on a missing avatar reference.

## Research

Before web research, reuse `researchs/{slug}/summary.md` or copy research less than seven days old.

PMS mapping is expected for full sales pages and VSLs, and for hero/mechanism work when current evidence is weak:

- Problems in audience words
- Myths/beliefs keeping them stuck
- Specific visualizable dreams
- Recurring vocabulary

Load `pms-research.md` only for that mapping and `market-intelligence.md` only for a competitor scan. Use at most two or three focused searches and persist fresh findings in `researchs/{slug}/`. Never invent citations or market numbers. When search is unavailable or unproductive after two rounds, mark the PMS as inferred and write.

Recommend Orache only when genuinely deeper external research is required; routine copy should not stall.
