---
description: Orache seven-dimension investigation playbook and evidence-to-squad synthesis
agents: [orache]
task_types: [investigation-dimensions, evidence-synthesis]
triggers: [D1, D2, D3, D4, D5, D6, D7, synthesize investigation]
---

# Orache Dimensions and Synthesis

Every finding ends with `**Evidence:** <state>`, `**Source:** <consulted source or explicit model baseline>`, and `**Squad impact:** <behavioral consequence>`.

## D1: Domain Frameworks

Ask which mental/process/decision models working practitioners actually use and when. Prefer methods that change execution rather than textbook taxonomies.

```markdown
### Framework: {name}
- **What it is:**
- **When experts use it:**
- **Evidence:**
- **Source:**
- **Squad impact:**
```

## D2: Anti-patterns

Find domain-specific quality killers, why they appear reasonable, and the corrective behavior. Convert material anti-patterns into executor constraints, checklist items, or veto conditions.

```markdown
### Anti-pattern: {name}
- **What happens:**
- **Why it seems right:**
- **What to do instead:**
- **Evidence:**
- **Source:**
- **Squad impact:**
```

## D3: Quality Benchmarks

Find professional standards, rubrics, association guidance, acceptance thresholds, or award/editorial criteria. Separate measurable thresholds from qualitative judgment.

```markdown
### Benchmark: {name}
- **Measures / standard:**
- **Used by:**
- **Evidence:**
- **Source:**
- **Squad impact:**
```

## D4: Reference Voices

Find practitioners/publications that define the field through a distinctive contribution. Use them for calibration, never imitation.

```markdown
### Voice: {name}
- **Known for / style signature:**
- **Evidence:**
- **Source:**
- **Squad impact:**
```

When one person is central to the squad's identity, add a non-executing profiling recommendation with person, reason, and `high | medium | low` value. Orache never starts profiling.

## D5: Domain Vocabulary

Capture precise insider terms that affect reasoning or output quality, including misuse that would reveal shallow work.

```markdown
### Term: {term}
- **Meaning / professional usage:**
- **Common misuse:**
- **Evidence:**
- **Source:**
- **Squad impact:**
```

## D6: Competitive Landscape

Map real tools, services, creators, agencies, or frameworks serving the same goal. Separate observed product facts from inferred gaps/opportunities.

```markdown
### Reference: {name}
- **Observed approach / strength:**
- **Observed or inferred gap:**
- **Evidence:**
- **Source:**
- **Squad impact:**
```

## D7: Structural Patterns

Find recurring formats, sequences, layouts, or templates in strong real-world outputs. Explain the principle and how it changes `contentBlueprints`.

```markdown
### Pattern: {name}
- **Structure / why it works:**
- **Example:**
- **Evidence:**
- **Source:**
- **Squad impact:**
```

## Synthesis filter

Keep a finding only if it changes at least one of:

- executor responsibility or decision process;
- skill/genome need;
- checklist, evidence requirement, quality bar, or veto condition;
- content blueprint, output schema, or operational breadth;
- domain vocabulary injected into prompts;
- risk, limitation, or human gate.

Discard generic advice. Preserve contradictory credible findings as a named tension. Mark `model-baseline` when a useful organizing hypothesis was not externally verified. For an investigated dimension with no novel evidence, write `No novel externally verified finding` and record the attempted venue/query in Gaps rather than inventing substance.

## Mode omissions

The report retains all D1–D7 headings. For dimensions excluded by Targeted/Quick mode, write exactly:

`Not investigated in this mode.`

Do not attach a source or count the section under `Dimensions investigated`.
