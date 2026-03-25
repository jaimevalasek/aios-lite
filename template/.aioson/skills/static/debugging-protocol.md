# Debugging Protocol

> Load this when a bug cannot be resolved in one direct attempt.

## Iron law
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.
A fix without root cause understanding is a guess. Guesses fail.

## Phase 1 — Root Cause Investigation (before any fix)
1. Read the full error message — completely, not a summary
2. Reproduce consistently: if you cannot reproduce, you cannot fix
3. Review recent changes: what changed before this broke?
4. Add instrumentation at every system boundary to locate where it fails
5. Document: what exactly breaks, where, and under what conditions

## Phase 2 — Pattern Analysis
1. Find similar code that works correctly
2. Compare implementations completely — not just the broken line
3. Identify every difference (types, order, configuration)
4. Understand dependencies the broken code relies on

## Phase 3 — Hypothesis and Testing
1. Form one hypothesis: "The bug is X because Y"
2. Test only that hypothesis — one variable at a time
3. No stacked changes: never change A and B simultaneously hoping one works
4. If hypothesis fails: form a new one. Never abandon hypothesis testing for random attempts.

## Phase 4 — Fix
1. Write a failing test that reproduces the bug (this is the RED)
2. Apply one focused fix
3. Verify with full test run (not just the new test)
4. If still failing after 3 focused attempts: escalate to architecture review

## Defense-in-Depth (after fixing)
When a bug is found, do not just fix the symptom. Add protection at every layer:
- **Entry point**: reject invalid input at the API/form boundary
- **Business logic**: validate that the operation makes sense for the domain
- **Data layer**: DB constraints match application rules
- **Instrumentation**: add logging that would catch this class of bug in future

Single validation: "We fixed the bug."
Multiple layers: "We made the bug impossible."
