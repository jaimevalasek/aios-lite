# Hardening Lane — From Exploration to Reliable Execution

> Use when input is vague, exploratory, or "vibe-style" and needs to be converted into a spec pack before implementation.

## Two lanes

### Lane 1 — Exploration / Vibe
- Goal: discover value, direction, and feasibility
- Tolerates: back-and-forth, open questions, incomplete scope
- Good for: MVPs, ideas, experiments, early discovery
- Output: notes, rough PRD, conversation log

### Lane 2 — Spec Hardening
- Goal: convert exploration into reliable, maintainable execution
- Requires: requirements, design decisions, checkpoints, and tests
- Good for: code that will survive, grow, and be maintained
- Output: spec pack (PRD + requirements + architecture + implementation plan)

**AIOSON's identity is Lane 2.** It does not compete with vibe coding — it is the hardening layer that converts exploration into software that works in production.

## When to harden

Harden before coding when ANY of these are true:
- The feature involves new entities or database changes
- The feature integrates with an external service
- Multiple user types are involved
- The behavior in error or edge cases matters for production quality
- Another developer (or AI session) will need to continue this work later

Skip hardening (go direct from PRD to @dev) ONLY when:
- Classification is confirmed MICRO
- No new entities, no integrations, pure UI/CRUD
- The full spec can fit in one session context without losing state

## Signals that input is in vibe mode (not yet hardenable)

- "I want something like X" without defining what X actually does
- Requirements expressed as UI descriptions ("there should be a button that does Y")
- No mention of what happens when things go wrong
- No mention of who can do what (permissions, roles)
- Scope keeps expanding during the conversation

## What to do when input is in vibe mode

Do not start implementation. Instead:
1. Acknowledge: "This is still in exploration mode — let's harden it before coding."
2. Route to @product if no PRD exists yet.
3. Route to @sheldon if PRD exists but has gaps.
4. Only proceed to @analyst / @architect / @dev after Gate A is passed.
