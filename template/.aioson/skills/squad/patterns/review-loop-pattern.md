---
name: review-loop-pattern
description: How to configure review loops in squad workflows for quality assurance
version: 1.0.0
---

# Review Loop Pattern

A review loop adds a quality gate within a workflow phase. An executor produces
output, a reviewer evaluates it, and the workflow either advances or retries.

## When to use

- Content squads where quality directly impacts reputation
- Software squads with code review requirements
- Any squad where output goes to external audiences
- Squads with regulatory or compliance constraints

## Structure

```json
{
  "phases": [
    {
      "id": "draft",
      "executor": "scriptwriter",
      "review": {
        "reviewer": "editor",
        "criteria": ["clarity", "brand-voice", "factual-accuracy"],
        "onReject": "revise-draft",
        "maxRetries": 2,
        "retryStrategy": "feedback-only",
        "escalateOnMaxRetries": "human",
        "vetoConditions": ["plagiarism-detected", "factual-error"]
      }
    }
  ]
}
```

## Key decisions

### Who reviews?

| Reviewer type | When to use |
|---|---|
| Peer executor | Same domain, different perspective (e.g., editor reviews writer) |
| QA executor | Dedicated quality role in the squad |
| Orchestrator | Lightweight structural checks |
| Human gate | High-stakes output, legal, compliance |

### Retry strategy

| Strategy | Behavior |
|---|---|
| `feedback-only` | Reviewer sends feedback, creator revises (default) |
| `full-rewrite` | Creator starts from scratch with reviewer notes |
| `escalate` | Move to a more senior executor or human |

### Veto conditions

Veto conditions are hard stops — if triggered, the output is rejected regardless
of other criteria scores. Use for:

- Plagiarism detection
- Factual errors in critical domains (medical, legal, financial)
- Brand safety violations
- Regulatory non-compliance

## Anti-patterns

- **Review everything:** Not all phases need review. Apply to high-impact outputs only.
- **Self-review:** A reviewer should not be the same executor that created the output.
- **Infinite retries:** Always set `maxRetries`. 2-3 is typical. Escalate after that.
- **Vague criteria:** "Make it better" is not a criterion. Use measurable checks.

## Integration with squad scoring

Review loops contribute to the Quality Structural dimension:
- +5 pts for having review loops in at least one workflow phase
- +5 pts for having veto conditions defined
