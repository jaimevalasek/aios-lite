---
name: simplify
description: Three-agent parallel code review for reuse, quality, and efficiency. Run after implementation and tests pass, before commit. Spawns three independent subagents simultaneously — each with a single focus — then aggregates and applies approved fixes.
activation: |
  You are now running the /simplify review process. Identify the scope of changed files, then spawn three parallel review agents (reuse, quality, efficiency). Aggregate their findings, filter false positives, present the report, and apply approved fixes.
---

# Skill: /simplify

> Process skill. Three-agent parallel code review.
> Run after `@dev` completes a phase and all tests pass. Before committing.

## Workflow position

```
@dev implements → tests pass → /simplify → review diff → commit
```

NEVER run /simplify during implementation — only after tests pass.

## Step 1 — Identify scope

List all files changed during the current implementation session.

If the list is larger than 15 files: ask the user to narrow the scope or confirm full review before proceeding.

## Step 2 — Spawn three parallel review agents

Spawn all three simultaneously. Each receives the same file list but different review instructions.

**Critical:** Each agent is stateless — pass a complete, self-contained brief with file paths, review objective, what NOT to do, and output format. Do not reference conversation history.

---

### Agent A — Code Reuse Agent

Brief template:
```
You are reviewing the following files for code duplication and reuse opportunities:
[file list with paths]

Your ONLY task: find duplicated logic, copy-paste patterns, and opportunities to
extract shared utilities or abstractions that would reduce code.

Rules:
- Report only real duplications, not stylistic similarities
- For each finding: exact file + line range + what to extract + where to put it
- Do NOT comment on naming, performance, security, or architecture
- Do NOT fix anything — report only
- Skip findings where extraction would require more code than the duplication saves

Output format per finding:
### Reuse finding: [short name]
Files: [file A: lines X-Y, file B: lines X-Y]
Pattern: [what is duplicated]
Suggested extraction: [function/class name + target file]
Confidence: high | medium (skip low-confidence findings)
```

---

### Agent B — Code Quality Agent

Brief template:
```
You are reviewing the following files for code quality issues:
[file list with paths]

Also read: [CLAUDE.md path], [.aioson/rules/ path — list relevant rules]

Your ONLY task: naming issues, structural problems, violations of explicit project
conventions, and clear code smells.

Rules:
- Flag ONLY violations of explicit project rules or well-known anti-patterns
- Do NOT flag stylistic preferences — only violations of stated conventions
- If CLAUDE.md and .aioson/rules/ are absent, use only universal anti-patterns
- For each finding: exact file + line + what the issue is + how to fix it
- Do NOT comment on performance or duplication

Output format per finding:
### Quality finding: [short name]
File: [path:line]
Issue: [what is wrong]
Fix: [exact change — 1-3 lines]
Convention violated: [which rule, or "anti-pattern: [name]"]
```

**IMPORTANT:** NEVER spawn Agent B without reading CLAUDE.md first (Agent B needs project conventions to be accurate — without them it will hallucinate rules).

---

### Agent C — Efficiency Agent

Brief template:
```
You are reviewing the following files for performance and efficiency issues:
[file list with paths]

Your ONLY task: N+1 queries, unnecessary re-renders, expensive operations in loops,
missing lazy loading, concurrency issues, unnecessary allocations.

Rules:
- Report only measurable inefficiencies, not theoretical ones
- For each finding: exact file + line + what the issue is + cost estimate + fix
- Do NOT comment on naming or code structure

Output format per finding:
### Efficiency finding: [short name]
File: [path:line]
Issue: [what is inefficient]
Cost: [why it matters — "O(N) queries per page load", "re-render per keystroke", etc]
Fix: [exact change]
```

---

## Step 3 — Aggregate results

Collect all three agents' outputs.

**Deduplication:** if two agents flag the same file+line for different reasons, merge into one finding with both concerns listed.

**False positive filter — silently skip any finding where:**
- Agent A says "confidence: medium" AND the extraction would add more complexity than it removes
- Agent B flags a "violation" of a convention that doesn't exist in the project's CLAUDE.md or rules (hallucinated rule)
- Agent C flags a theoretical inefficiency with no concrete cost estimate
- The fix would require architectural changes outside the current implementation scope

## Step 4 — Present aggregated report

```
## /simplify Report — [date]

### Reuse (Agent A): N findings
- [finding name] — [file:line] — [1-line summary]

### Quality (Agent B): N findings
- [finding name] — [file:line] — [1-line summary]

### Efficiency (Agent C): N findings
- [finding name] — [file:line] — [1-line summary]

### Auto-applicable (no review needed): N
[findings that are low-risk, high-confidence, and contained — list them]

### Requires review: N
[findings where impact is broader or confidence is medium — list them]

Total: N findings across 3 agents. N auto-applicable, N require review.
```

Ask the user: "Apply auto-applicable fixes? (Y/n) | Apply all? | Select specific findings?"

## Step 5 — Apply approved fixes

For each approved fix:
- Apply the exact change described in the finding
- Do NOT refactor beyond the specific fix
- Do NOT add comments, docstrings, or type annotations
- Do NOT rename things not mentioned in the finding

After all fixes: re-run the test suite to confirm no regression.
If any test breaks: revert only the breaking fix and report to the user.

## Hard constraints

- NEVER fix more than what is described in a specific finding
- NEVER apply a "requires review" fix without explicit user approval
- NEVER run /simplify during implementation — only after tests pass
- NEVER spawn Agent B without reading CLAUDE.md first
- NEVER report a finding without a concrete file + line reference
- For MICRO projects: /simplify is optional — suggest but do not require
