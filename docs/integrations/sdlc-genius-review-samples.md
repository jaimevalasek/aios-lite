# SDLC Genius — Pilot Evidence Log

> Created: 2026-04-02
> Status: template — fill during pilot
> Purpose: Record concrete PR review samples for final evaluation

---

## How to Use This File

For each PR where SDLC Genius commented during the pilot:

1. Copy one sample block below
2. Fill in the PR details and SDLC Genius output
3. Score each axis using the rubric in `sdlc-genius-eval-matrix.md`
4. Record the comparison against AIOSON artifacts
5. Write a 1-line decision: keep / tune / reject

---

## Sample Block Template

```
### PR #N — [short description of change]

**Date:** YYYY-MM-DD
**Repo:** [repo name]
**Feature slug (if any):** [slug or none]

**Most useful SDLC Genius comment:**
> [paste comment]

**Least useful SDLC Genius comment:**
> [paste comment]

**Total SDLC Genius comments on this PR:** N

**Axis scores (0–3 each):**
- Relevance:
- Signal:
- Duplication:
- Actionability:
- Traceability:
- Noise risk:
- **Total:** /18

**AIOSON comparison:**
- Did requirements-{slug}.md already cover the main SDLC Genius point? Yes / No / Partial
- Did spec-{slug}.md already cover it? Yes / No / Partial
- Did SDLC Genius catch something AIOSON missed? Yes / No
- Did SDLC Genius contradict a spec decision? Yes / No — if yes, describe:

**Decision:** keep / tune / reject
**Reason:** [1 line]
```

---

## PR Samples

_(Empty — fill during pilot)_

---

## Running Totals

| PR | Score | Noise-dominated? | Spec contradiction? |
|----|-------|-----------------|---------------------|
| #1 | /18 | | |
| #2 | /18 | | |
| #3 | /18 | | |
| #4 | /18 | | |
| #5 | /18 | | |
| **Average** | /18 | | |

---

## Preliminary Conclusion

_(Fill after 5+ PRs — apply criteria from `sdlc-genius-eval-matrix.md`)_

- Average score: /18
- Noise-dominated PRs: / tested
- Spec contradictions: 
- Suggested outcome: A / B / C
- Next step: write `plans/70.1-RESULT-sdlc-genius-pilot.md`
