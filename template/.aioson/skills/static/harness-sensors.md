# Harness Sensors — Post-Action Verification

> Load this when you need to verify that agent actions comply with project constraints.
> Sensors run AFTER the action, not before (that's what guides/gates do).

## When to run sensors

| Trigger | Sensor | Agent |
|---------|--------|-------|
| After commit | Rule compliance check | @dev, @deyvin |
| After spec update | Drift detection vs requirements | @dev, @analyst |
| After architecture.md written | Constitution compliance | @architect |
| After feature closure | AC coverage verification | @qa |
| After session end | Context budget report | All agents |

## Sensor 1 — Rule compliance check

After every commit, verify:
1. Read all `.md` files in `.aioson/rules/`
2. For each rule, check if the committed files violate any stated convention
3. If violation found: do not revert — log warning and continue
4. Write violations to `project-pulse.md` under "Blockers" if severity is high

**Implementation:** This sensor is agent-internal (instruction-based), not a CLI hook.
The agent instruction says: "after committing, re-read the rules and verify your commit complies."

## Sensor 2 — Spec drift check

After updating `spec-{slug}.md`:
1. Compare `requirements-{slug}.md` AC list with `spec-{slug}.md` "Edge cases handled" section
2. If ACs exist in requirements that are not mentioned in spec: flag as potential drift
3. Write flagged items to `pending_review` in spec frontmatter

## Sensor 3 — Constitution compliance (architecture)

After writing `architecture.md`:
1. Read `constitution.md`
2. For each article, verify:
   - Article I: Is there a spec artifact that preceded this architecture?
   - Article II: Is the architecture depth proportional to classification?
   - Article VI: Does the architecture introduce unnecessary layers?
3. Self-report: add `## Constitution check` section at end of `architecture.md`

## Sensor 4 — AC coverage verification

After @qa writes its report:
1. Count ACs with status "Covered" vs total ACs
2. Count adversarial probes executed vs minimum required (1)
3. If coverage < 80% or probes < 1: VERDICT cannot be PASS

## Sensor 5 — Context budget report

At session end, before writing project-pulse.md:
1. Estimate how many files were read during the session
2. If > 8 large files: flag context budget concern
3. Write to project-pulse.md: "Last session context: {N} files read, estimated {light|moderate|heavy}"

## How sensors differ from gates

| | Gates (guides) | Sensors (feedback) |
|---|---|---|
| When | Before action | After action |
| Blocking | Yes (MEDIUM) | No — advisory |
| Who triggers | Agent checks before proceeding | Agent checks after completing |
| Response | Stop + ask user | Log + warn + continue |
| Example | Gate A before @architect | Rule compliance after commit |

## Progressive adoption

1. **Phase 1 (current):** All sensors are agent-internal instructions. No CLI hooks.
2. **Phase 2 (future):** Move high-value sensors to `hooks-emit.js` for automated execution.
3. **Phase 3 (future):** Add configurable sensor severity (warn vs block) in project config.

Sensors should be lightweight — a sensor that takes longer than the action it monitors is worse than no sensor.
