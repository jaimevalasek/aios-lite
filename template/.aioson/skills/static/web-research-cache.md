# Skill: Web Research Cache

> Load this file when you are about to run a web search.
> Check the cache first. Save results after. Never search twice for the same thing.

## Cache location

```
researchs/                        ← project root (alongside plans/, prds/)
└── {slug}/
    ├── summary.md                ← frontmatter + consolidated findings
    └── files/
        └── {source-slug}.md     ← raw content from each consulted URL
```

The `slug` identifies the topic searched (e.g., `stripe-api-2026`, `nextjs-app-router`, `jwt-vs-session`). Use kebab-case, include the year when the decision may age.

## Step 1 — Check cache before searching

Before running any WebSearch:

1. Derive the slug from the topic you are about to search
2. Check if `researchs/{slug}/summary.md` exists
3. Read `searched_at` from its frontmatter
4. If `searched_at` is within the last **7 days** → use the cached result, do not search again
5. If older than 7 days or missing → proceed to search

## Step 2 — Run the search

- Formulate the query including the **current year** so results are fresh
- Maximum **4 queries per session** — focus on the decisions with highest risk of being outdated
- If WebSearch fails for a query: record the error in `summary.md` and continue — do not block

## Step 3 — Save results

After searching, always save before using the results:

**`researchs/{slug}/summary.md`:**
```markdown
---
searched_at: {ISO-date}
agent: {agent-name}
prd: {prd-slug or null}
query: "{query used}"
verdict: confirmed | has-alternatives | outdated | deprecated
---

# Research: {topic title}

## Verdict
[One line with the verdict and justification]

## Findings
[Consolidated summary — maximum 5 bullets]

## Sources consulted
- [URL] — [what it contributed]
```

**`researchs/{slug}/files/{source-slug}.md`:** raw content from each URL consulted.

## Step 4 — Surface only what is actionable

Show the user **only** findings with verdict `has-alternatives`, `outdated`, or `deprecated`:

```
🔍 Web Intelligence — {current date}

**[decision or technology]** — {verdict}
→ {finding in 1–2 lines}
→ Alternative: {recommended alternative, if any}
→ Source: [URL]

Want to incorporate this update?
```

If all findings are `confirmed`:
> "✓ Decisions validated against recent research. No updates needed."

`confirmed` findings are **never shown** — they are noise.

## Verdicts

| Verdict | Meaning |
|---|---|
| `confirmed` | Still the best choice — no action needed |
| `has-alternatives` | Valid but better options now exist |
| `outdated` | Superseded by a newer approach |
| `deprecated` | Officially discontinued or abandoned |

## Rules

- **Never search without saving** — unsaved results are lost after the session
- **Never block on search failure** — record the error and continue
- **Never show `confirmed` findings** — they add noise without value
- **Never modify the PRD/plan without user confirmation** — surface findings, let the user decide
- **Cache is shared across all agents** — if another agent already searched the same topic this week, use their result
- The user decides whether to act on findings. Agents surface, humans decide.
