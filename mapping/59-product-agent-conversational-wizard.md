# Iteration 59 — @product agent: conversational product wizard → v0.1.25

## Date
2026-03-04

## Commit
2b65afc — feat(product): add @product conversational product wizard agent

---

## What was requested
Add a new `@product` agent that runs between `@setup` and `@analyst`. Fills the gap where no agent did proactive product thinking through natural conversation. `@pm` is a formatter (post-architecture); `@product` is a product thinker (pre-analysis).

---

## Position in workflow

```
@setup → @product → @analyst → @architect → @dev → @qa
```

- MICRO: `@setup → @product (optional) → @dev`
- SMALL: `@setup → @product → @analyst → @architect → @dev → @qa`
- MEDIUM: `@setup → @product → @analyst → @architect → @ux-ui → @pm → @orchestrator → @dev → @qa`

---

## Files created (6)

| File | Purpose |
|------|---------|
| `template/.aios-lite/agents/product.md` | Base agent (language-neutral) |
| `template/.aios-lite/locales/en/agents/product.md` | English locale with absolute language header |
| `template/.aios-lite/locales/pt-BR/agents/product.md` | Portuguese locale |
| `template/.aios-lite/locales/es/agents/product.md` | Spanish locale |
| `template/.aios-lite/locales/fr/agents/product.md` | French locale |
| `template/.gemini/commands/aios-product.toml` | Gemini CLI command registration |

## Files modified (8)

| File | Change |
|------|--------|
| `template/CLAUDE.md` | Added `/product → .aios-lite/agents/product.md` |
| `template/AGENTS.md` | Added `@product` row to invocation table and file list |
| `template/.aios-lite/config.md` | Updated workflow chains (MICRO/SMALL/MEDIUM) |
| `template/.aios-lite/agents/setup.md` | Routing table updated: points to `@product` instead of `@analyst` |
| `template/.aios-lite/locales/en/agents/setup.md` | Same routing table update |
| `template/.aios-lite/locales/pt-BR/agents/setup.md` | Same |
| `template/.aios-lite/locales/es/agents/setup.md` | Same |
| `template/.aios-lite/locales/fr/agents/setup.md` | Same |
| `src/constants.js` | `MANAGED_FILES` (+6 paths), `AGENT_DEFINITIONS` (+1 entry before @analyst) |
| `package.json` | Version bumped 0.1.24 → 0.1.25 |
| `CHANGELOG.md` | Entry added for 0.1.25 |

---

## Agent design decisions

### Mode detection
- **Creation mode** (no prd.md): starts fresh — "Tell me about the idea."
- **Enrichment mode** (prd.md exists): reads it, names specific gaps — "I read the PRD. I noticed [X]."

### 8 conversation rules
1. One question at a time
2. Never number questions
3. Reflect before advancing ("So basically X — is that right?")
4. Surface what users forget (edge cases, error states, empty states, permissions, notifications)
5. Challenge assumptions gently ("What makes you confident that's the right approach?")
6. Prioritize ruthlessly ("If you could only ship one thing first...")
7. No filler words (never "Great!", "Perfect!")
8. Draft early — offer prd.md after 5–7 exchanges

### Proactive domain triggers
9 specific signal → question pairs (multi-user → admin role, write actions → concurrency, states → transitions, empty data → empty state, money → billing model, UGC → moderation, external service → fallback, notifications → control, team growth → onboarding).

### Output contract (prd.md — 8 sections)
Vision, Problem, Users, MVP scope (🔴 must-have / 🟡 should-have), Out of scope, User flows, Success metrics, Open questions.

### Responsibility boundary
Product thinking only. Explicitly not: entities/schema (@analyst), tech choices (@architect), code (@dev), UI mockups (@ux-ui).

---

## AGENT_DEFINITIONS entry
```javascript
{
  id: 'product',
  command: '@product',
  path: '.aios-lite/agents/product.md',
  dependsOn: [],
  output: '.aios-lite/context/prd.md'
}
```
`dependsOn: []` — can run before or without project.context.md (though it reads it when present).

---

## Test result
178/178 pass (no logic changes, only templates).
