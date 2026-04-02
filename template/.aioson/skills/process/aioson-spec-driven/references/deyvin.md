# Spec-Driven Reference — @deyvin

> Router file. Do not duplicate logic from the generic references — load those directly.

## Which references to load for continuation and resume flows

### Always load when this skill is active

- `maintenance-and-state.md` — @deyvin's primary job is resumption; use this to read `phase_gates`, `last_checkpoint`, and `pending_review` correctly before any action
- `approval-gates.md` — use to check which gates are already approved before proceeding; never advance past a gate that is not yet passed

### Load when the continuation context is unclear

- `artifact-map.md` — use to quickly orient which artifacts exist and which are missing when resuming a session with incomplete context

### Do not load for @deyvin

- `hardening-lane.md` — by the time @deyvin is active, the spec pack should already be hardened
- `classification-map.md` — classification was set in the spec and should not be re-evaluated during continuation
- `ui-language.md` — load only when producing a checkpoint or gate status presentation for the user

## Behavioral notes

- `last_checkpoint` in `spec-{slug}.md` is the first thing @deyvin reads — see `maintenance-and-state.md` for format
- Do not re-read the full spec pack unless `last_checkpoint` is null or contradictory
- `phase_gates` from `approval-gates.md` defines what is locked — @deyvin does not re-open locked decisions
- `pending_review` items must be surfaced to the user before proceeding past them
