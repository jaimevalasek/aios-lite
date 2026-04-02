# SDLC Genius — Evaluation Rubric

> Created: 2026-04-02
> Purpose: Measure pilot PR reviews against consistent criteria
> Use: Fill one row per tested PR in `sdlc-genius-review-samples.md`

---

## Evaluation Axes

For each PR where SDLC Genius commented, score each axis from 0 to 3:

| Axis | 0 | 1 | 2 | 3 |
|------|---|---|---|---|
| **Relevance** | Comments are unrelated to the change | Partially related | Mostly related | Directly addresses the actual change |
| **Signal** | No real bugs/risks caught | Low-value noise | Caught something worth reviewing | Caught a real bug or risk not found elsewhere |
| **Duplication** | Repeats exactly what AIOSON/QA already enforced | Significant overlap | Some overlap | Adds information not in AIOSON artifacts |
| **Actionability** | Developer cannot act without research | Possible but unclear | Actionable with context | Developer can act immediately |
| **Traceability** | Cannot link to spec or requirements | Vague connection | Connects to requirements | Explicitly references behavior in spec |
| **Noise risk** | Too many low-value comments per PR | Several noise comments | Occasional noise | Clean, focused output |

**Score range per PR:** 0–18

---

## Score Interpretation

| Total | Interpretation |
|-------|---------------|
| 15–18 | Excellent — strong signal, low noise, high actionability |
| 10–14 | Good — useful but with improvements needed |
| 5–9 | Marginal — some value but noise outweighs it in current state |
| 0–4 | Poor — does not improve on AIOSON-only workflow |

---

## Comparison Against AIOSON Artifacts

For each scored PR, also answer:

| Question | Yes / Partial / No |
|----------|-------------------|
| Did SDLC Genius comment on something already in `requirements-{slug}.md`? | |
| Did SDLC Genius comment on something already in `spec-{slug}.md`? | |
| Did SDLC Genius catch something AIOSON artifacts missed? | |
| Did SDLC Genius suggest a change that contradicts a spec decision? | |

---

## Noise Threshold

If more than 30% of comments per PR are scored 0–1 on Relevance or Actionability, the PR is flagged as **noise-dominated**.

A pilot with more than 2 noise-dominated PRs out of 5 tested = Outcome C (reject) unless tuning options exist and reduce noise significantly.

---

## Pilot Conclusion Criteria

| Condition | Suggested Outcome |
|-----------|------------------|
| Average score ≥ 12 across 5+ PRs, no spec contradictions | Outcome A — Adopt |
| Average score 7–11, useful in narrow scope (e.g., code quality only) | Outcome B — Limited use |
| Average score < 7, OR repeated spec contradictions, OR noise-dominated | Outcome C — Reject |
| Permissions too broad and cannot be scoped | Outcome C — Reject regardless of score |

---

## How to Use This Matrix

1. Run the pilot PR (see Phase 2 of Plan 70)
2. For each PR where SDLC Genius commented, score each axis
3. Record in `sdlc-genius-review-samples.md` with the score, evidence, and comparison against AIOSON artifacts
4. After 5+ PRs, sum up and apply the conclusion criteria above
5. Write outcome in `plans/70.1-RESULT-sdlc-genius-pilot.md`
