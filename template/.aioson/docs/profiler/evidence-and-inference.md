---
description: Profiler Enricher evidence grading and cautious behavioral, psychometric, and multi-trait inference
agents: [profiler-enricher]
task_types: [profile-enrichment, evidence-analysis, psychometric-inference]
triggers: [enrich profile, infer behavioral profile, grade persona evidence, analyze cognitive signals]
paths: [.aioson/profiler-reports/*/research-report.md]
---

# Profiler Evidence and Inference

Load for evidence grading and any behavioral or psychometric inference.

## Evidence grades

- **High:** repeated directly sourced behavior across independent contexts, or an explicit method repeatedly demonstrated in work.
- **Medium:** consistent evidence in a narrow context, one strong primary source, or multiple credible secondary observations.
- **Low:** a single ambiguous example, self-description without observed behavior, user observation without corroboration, or source-quality limitations.
- **Unsupported:** no traceable evidence or material contradiction with no contextual resolution.

Confidence applies per claim, not only to the document. Overall confidence reflects the weakest claims required by the intended genome—not an average that hides a critical gap.

## Evidence ledger

Before inference, map stable source IDs:

| Source ID | Origin | Type | Context/date | Quality | Supports | Limitation |
|---|---|---|---|---|---|---|

For each major conclusion, keep an internal chain:

`source behavior → interpretation → confidence → contradiction/limit → operational consequence`

Quotes stay short and source-linked. A search snippet or unsourced summary is not evidence.

## Behavioral dimensions

Start with behavior before labels:

- assertiveness/control/results focus;
- social persuasion/storytelling;
- steadiness/patience/consistency;
- precision/systems/quality control;
- openness to novelty and abstraction;
- conscientious follow-through;
- social energy;
- cooperation/conflict posture;
- emotional reactivity under pressure;
- sincerity, fairness, modesty, and greed avoidance.

Record `insufficient evidence` instead of assigning a midpoint.

## Interpretive overlays

### DISC

Use observed behavior to estimate D/I/S/C on a 1–10 scale only when at least medium evidence supports differentiation. Include source IDs and per-model confidence.

### Big Five

Estimate Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism as low/medium/high only where evidence exists. Do not infer internal distress from public composure alone.

### HEXACO Honesty–Humility

Analyze Sincerity, Fairness, Modesty, and Greed-avoidance. Public branding, wealth, confidence, or persuasion do not alone prove manipulation, greed, or grandiosity. High-confidence claims require repeated behavioral evidence or credible independent corroboration.

### Enneagram

Treat type, wing, instinct, and integration/disintegration language as a low-to-medium-confidence interpretive hypothesis. It cannot be high confidence from public outputs alone unless the subject explicitly self-identifies and behavior broadly corroborates it; even then, label the model as non-diagnostic.

### MBTI and functions

Treat E/I, S/N, T/F, J/P and function stacks as descriptive hypotheses. Do not infer a function stack solely from profession, writing style, or one interview. Record alternative explanations when material.

## Complementary signals

When supported, estimate linguistic assertiveness, concrete/abstract balance, certainty/doubt markers, Schwartz Values, risk posture, and leadership style. These remain context-bounded.

## Multi-trait pattern detection

Create a trait interaction only when evidence shows an outcome not adequately described by either trait alone:

```text
Trait interaction: [A] × [B]
Pattern: amplification | tension | compensation | paradox
Observed behavior: [...]
Source IDs: [...]
Alternative explanation: [...]
Confidence: low | medium | high
Genome consequence: [...]
```

Useful comparisons may include DISC with Big Five, HEXACO-H with persuasion, or a model hypothesis with observed pressure behavior. There is no quota. If no interaction clears the evidence threshold, write `No evidence-supported cross-trait pattern identified`.

## Contradictions

For each important contradiction:

1. check whether sources describe different dates, roles, incentives, or audiences;
2. preserve both observations;
3. state the most plausible contextual explanation only as inference;
4. lower confidence when context does not resolve it.

Never average incompatible signals into an apparently precise score.
