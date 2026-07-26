---
name: simplify
description: Deprecated compatibility process for reviewing already-tested changes for concrete reuse, quality, and efficiency issues. Use only on explicit legacy `/simplify` invocation. Prefer `quality:audit` plus one bounded review-intelligence pass.
---

# Simplify (deprecated)

Do not auto-trigger this skill. Use the registered replacement when available: run `quality:audit`, then apply review-intelligence to the changed artifact with one matching reference.

## Compatibility workflow

1. Require implementation and relevant tests to be complete.
2. Identify the changed files. If scope exceeds 15 files, narrow it or obtain explicit full-review approval.
3. Read project instructions and relevant `.aioson/rules/` before judging conventions.
4. Review three independent lenses:
   - reuse: real duplicated logic where extraction removes more code/complexity than it adds;
   - quality: explicit project-rule violations or universal anti-patterns, never stylistic preference;
   - efficiency: measurable cost such as N+1 work, repeated allocation, unnecessary render, or missing bounded concurrency.
5. Each finding must include exact file/line evidence, impact, a contained fix, and confidence. Omit low-confidence findings.
6. Merge duplicates and discard theoretical, out-of-scope, or rule-inventing findings.
7. Present auto-applicable findings separately from broader changes.
8. Apply only fixes the user authorized; rerun relevant tests and undo only a fix that causes a regression.

Parallel reviewers are optional and permitted only when the active environment and operator policy authorize delegation. Otherwise perform the three lenses sequentially.

## Output

```markdown
## Simplify report
### Reuse
- {finding — file:line — impact — fix}
### Quality
- {finding — file:line — violated rule/anti-pattern — fix}
### Efficiency
- {finding — file:line — measurable cost — fix}
### Auto-applicable
- {contained high-confidence fix}
### Requires approval
- {broader or medium-confidence fix}
```

## Hard constraints

- Never run during implementation or before tests pass.
- Never invent a convention, cost, or line reference.
- Never broaden a fix beyond its finding.
- Never apply a broader change without explicit approval.
- For MICRO work, keep the review optional and proportional.
