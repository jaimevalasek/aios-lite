# Spec-Driven Reference — @analyst

> Router file. Do not duplicate logic from the generic references — load those directly.

## Which references to load for discovery and feature requirements

### Always load when this skill is active

- `classification-map.md` — use during discovery to score complexity and declare MICRO/SMALL/MEDIUM before any other decision
- `artifact-map.md` — use to know exactly what artifacts @analyst owns vs what belongs to @architect or @dev
- `approval-gates.md` — use Gate A criteria to know when requirements are ready to hand off

### Load when input is vague or exploratory

- `hardening-lane.md` — use to detect whether input is still in vibe mode and route accordingly before producing requirements

### Do not load for @analyst

- `maintenance-and-state.md` — this is for execution/continuation sessions, not discovery
- `ui-language.md` — load only when producing a checkpoint or gate status presentation

## Behavioral notes

- Declare classification (MICRO/SMALL/MEDIUM) early — it controls depth of requirements, AC verbosity, and whether Gate A is blocking
- Gate A must be explicitly evaluated before handing off to @architect or @dev
- `requirements-{slug}.md` is @analyst's primary output — see `artifact-map.md` for ownership chain
