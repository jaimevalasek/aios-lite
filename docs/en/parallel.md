# Parallel Orchestration Guide

Use `parallel:init` to bootstrap the parallel context files used by `@orchestrator`.

## Command

```bash
aios-lite parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json]
```

Aliases:
- `aios-lite orchestrator:init`
- `aios-lite parallel-init`

## Behavior
- Requires parseable `.aios-lite/context/project.context.md`.
- Only allows `classification=MEDIUM` by default.
- Use `--force` to initialize for other classifications.
- Generates:
  - `.aios-lite/context/parallel/shared-decisions.md`
  - `.aios-lite/context/parallel/agent-N.status.md`

## Prerequisite checks
The command reports whether these files are present:
- `.aios-lite/context/discovery.md`
- `.aios-lite/context/architecture.md`
- `.aios-lite/context/prd.md`

Missing prerequisites are reported but do not block file generation.

## Scope assignment

```bash
aios-lite parallel:assign
aios-lite parallel:assign --source=architecture --workers=3
aios-lite parallel:assign --source=prd
aios-lite parallel:assign --dry-run
```

Aliases:
- `aios-lite orchestrator:assign`
- `aios-lite parallel-assign`

Behavior:
- Reads scope candidates from `prd`, `architecture`, or `discovery` context docs.
- Distributes scope items across lane files in round-robin mode.
- Updates `## Scope` section and `updated_at` in each lane file.
- Appends a decision-log entry to `shared-decisions.md` when present.

## Diagnose and repair

```bash
aios-lite parallel:doctor
aios-lite parallel:doctor --workers=3
aios-lite parallel:doctor --fix
aios-lite parallel:doctor --fix --dry-run
```

Aliases:
- `aios-lite orchestrator:doctor`
- `aios-lite parallel-doctor`

Notes:
- `--fix` can recreate missing `shared-decisions.md` and missing lane files.
- For non-`MEDIUM` projects, `--fix` requires `--force`.
