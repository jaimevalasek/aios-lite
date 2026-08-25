# Agent execution, development lanes, and model resolution

AIOSON uses `.aioson/context/agent-execution-{feature}.json` to run a bounded feature task through a registered CLI host and model. The manifest is runtime configuration, not another specification.

## Defaults

A new manifest enables only:

- `dev`;
- `qa`.

`tester`, `pentester`, `validator`, and all development lanes are disabled. MICRO/SMALL/MEDIUM classification never enables them.

The canonical delivery route remains Product → Sheldon → Planner → DEV → QA. Optional development lanes execute inside DEV; optional reviewers execute after QA only when explicitly enabled and triggered.

## Commands

```bash
aioson agent:execution:init . --feature=my-feature --host=codex
aioson agent:execution:validate . --feature=my-feature --json
aioson agent:execution:show . --feature=my-feature --json
aioson agent:execution:dispatch . --feature=my-feature --agent=qa
aioson agent:execution:dispatch . --feature=my-feature --lane=backend
aioson agent:execution:resume . --feature=my-feature
aioson agent:execution:status . --feature=my-feature --json
```

Initialization is create-once. Later init, resume, and workflow seed operations preserve the developer-owned manifest byte for byte.

## Schema v2 orchestration and Neural Chain

New manifests use version 2 while version 1 remains accepted unchanged. The additive fields are:

- `orchestration.mode`: `autopilot` by default, or `inherit` / `step_by_step` when the developer changes it;
- `orchestration.max_checkpoints`: the effective Autopilot runner budget (default 10);
- `orchestration.stop_conditions`: explicit terminal reasons;
- `chain_work_policy`: kind-to-owner routing, specialist fallback, QA revalidation, and the DEV actionable-work handoff gate.

Test/security items route to Tester/Pentester only when their existing manifest entries are enabled. Otherwise they fall back to DEV. This never enables an optional specialist by classification.

## Development lanes

Use lanes only when the user or approved plan explicitly asks for different execution hosts/models or separately owned scopes.

```json
{
  "development_lanes": {
    "strategy": "split",
    "integration_owner": "dev",
    "lanes": {
      "backend": {
        "enabled": true,
        "host": "codex",
        "mode": "external",
        "model": "gpt-5.6-sol",
        "reasoning_effort": "high",
        "writable_roots": [],
        "prompt": ".aioson/context/execution-prompts/my-feature/backend.md",
        "write_paths": ["src/api/**", "tests/api/**"],
        "fallbacks": [],
        "report": ".aioson/context/reports/my-feature/{run_id}/dev-backend.json"
      },
      "frontend": {
        "enabled": true,
        "host": "opencode",
        "mode": "external",
        "model": "provider/model-id",
        "writable_roots": [],
        "prompt": ".aioson/context/execution-prompts/my-feature/frontend.md",
        "write_paths": ["src/ui/**", "tests/ui/**"],
        "fallbacks": [],
        "report": ".aioson/context/reports/my-feature/{run_id}/dev-frontend.json"
      }
    }
  }
}
```

`host` names a registered CLI adapter; `model` is the model/provider identifier understood by that host. A model such as Grok may be used through a compatible host such as OpenCode; it does not require a canonical `@frontend` or `@backend` agent.

DEV creates the short runtime prompt from the approved PRD and implementation plan, dispatches enabled lanes sequentially in the shared worktree, audits their diffs against `write_paths`, integrates shared boundaries, and runs the full planned verification. Lane reports bind the lane identity and declared paths.

Hosts come from one registry (`src/lib/tool-capabilities.js`, exposed by `aioson tool:capabilities --json`): Claude Code, Codex, OpenCode, Kimi Code and Qwen Code are dispatchable; Grok is known to the interactive surface only until it has a non-interactive adapter. New hosts require a registered adapter so executable resolution, capabilities, arguments, redaction, and telemetry remain fail-closed.

## Host signatures

A signature is the machine-level proof that a `(host, model, effort)` combination actually works here — CLI installed, login valid, model id accepted, effort supported — recorded before anything is dispatched instead of discovered as `executable_not_found` / `auth` / `invalid_model` mid-run.

```bash
aioson host:signature . --host=kimi --model=kimi-k3
aioson host:signature . --host=codex --model=gpt-5.6 --effort=high --ttl=24
aioson host:signature . --host=kimi --model=kimi-k3 --status --json
aioson host:signature . --list --json
aioson agent:execution:validate . --feature=my-feature --strict --json
```

The probe builds the exact argv the execution adapter would use (same non-interactive flags, provider read-only mode), runs it in an empty temporary directory with a one-word prompt, and classifies the exit through the adapter's own error normalization. It never reads project context and never writes into a project. Results live in `~/.aioson/hosts/signatures.json` (override: `AIOSON_HOST_SIGNATURES`), keyed by host, model and effort, with a TTL (default 24h).

- Refusals are deterministic from the registry: `unknown_host`, `unsupported_host_execution` (interactive-only host), `effort_unsupported_by_host`, `invalid_reasoning_effort`.
- Probe outcomes: `valid`, or `invalid` with `executable_not_found` (carrying the install command), `auth`, `invalid_model`, `capacity`, `timeout`, `crash`.
- `--status` and `--list` are read-only and always exit 0; their answer is the `state` field (`valid | expired | invalid | missing`).
- `agent:execution:validate --strict` requires a valid, unexpired signature for every **enabled** agent and lane (disabled entries are ignored) and reports unsigned declared fallbacks as warnings. Without `--strict` the manifest keeps its `validated_at_dispatch` contract unchanged.

## Orchestrated execution (roles, offer, compile)

The orchestrated path runs the planner's lanes as parallel external processes, each with the host/model of a **role**. It is unlocked by one project file the supervising desktop client writes after validating the signatures — the framework never writes it and never ships it in `template/`. Absent, disabled or invalid, the option does not exist and the single-DEV route is byte-for-byte what it is today.

```json
// .aioson/config/execution-roles.json
{
  "version": 1,
  "source": "aioson-play",
  "enabled": true,
  "roles": {
    "backend_dev":  { "host": "codex", "model": "gpt-5.6",         "reasoning_effort": "high" },
    "frontend_dev": { "host": "kimi",  "model": "kimi-k3",         "reasoning_effort": null },
    "qa":           { "host": "claude", "model": "claude-sonnet-5", "reasoning_effort": null }
  },
  "parallel": { "max_concurrent_lanes": 2 },
  "on_unavailable": "ask"
}
```

Roles are snake_case: `{lane}_dev` (required per lane), `qa` (the lane-level reviewer, required), `{lane}_qa` (optional override that inherits from `qa`) and `integration_dev` (optional model for the integration pass). Hosts come from the registry (`tool:capabilities`), a reasoning effort is accepted only where the host declares it, secrets are refused.

```bash
aioson execution:offer . --feature=my-feature --json      # available? (roles + signatures; plan tables; compiled state)
aioson execution:compile . --feature=my-feature --json    # tables + roles → execution plan, prompts, manifest lanes
aioson execution:compile . --feature=my-feature --dry-run --json
aioson verify:artifact . --kind=execution-plan --slug=my-feature
```

`execution:offer` answers `available` only when the roles file is present, valid and enabled **and** every declared role carries a valid, unexpired signature on this machine; otherwise `reason` names the first blocker (`roles_file_missing | roles_disabled | roles_invalid | signature_missing | signature_expired | signature_invalid`). It always exits 0 — it is a question, not a gate.

`execution:compile` reads the plan's `## Development execution lanes` and `## Execution Sequence` tables and refuses with named findings, writing nothing:

| Finding | Meaning |
|---|---|
| `lanes_table_missing`, `lanes_table_invalid`, `no_wave_column` | the planner tables are absent or unparseable |
| `lane_write_paths_overlap`, `unsafe_path`, `lane_id_invalid`, `too_many_lanes` | lanes are not disjoint, escape the project or exceed the manifest limit |
| `phase_mixed_ownership` | one phase touches files of two lanes (or a lane plus unowned files) — split it, or move shared files to a later solo wave owned by dev |
| `wave_file_overlap` | two phases of the same wave share a file |
| `integration_before_lanes`, `no_lane_units` | integration work (files outside every lane) is scheduled before the lane waves, or no phase falls in a lane at all |
| `lane_without_role`, `qa_role_missing`, `role_signature_missing|expired|invalid` | the roles file lacks a lane's `{lane}_dev`, lacks a reviewer, or the role is not signed here (each carries the `host:signature` hint) |
| `dev_kernel_missing`, `dev_profile_sections_missing` | the installed `.aioson/agents/dev.md` is absent or lost the sections the lane profile derives from |

On success it writes `.aioson/context/execution-plan-{slug}.json` — units (phase × lane, or integration owned by dev), waves, per-unit capabilities/acceptance criteria/verification commands, the roles per lane and the digests of everything it was compiled from — plus one prompt per lane unit and per lane under `.aioson/context/execution-prompts/{slug}/`, and updates **only** `development_lanes` (strategy `split`, the compiled lanes with their `qa` block, lanes that left the plan disabled) and `orchestration.execution: orchestrated` in the manifest. Everything else in the manifest — session agents, capacity policy, declared fallbacks, custom report paths, an operator's `qa.max_fix_files` — is preserved.

A unit prompt is the **dev-lane profile** (the `## Implementation strategy` and `## Execution invariants` sections extracted from the installed `dev.md`, plus the lane rules: no stage-ownership commands, only the unit's files, real verification, the bound JSON report) followed by the unit contract and the PRD/plan rows of that unit's capabilities — never the whole documents. Warnings (`lane_role_mismatch`, `self_review_same_model`, `cap_without_unit`, `unit_without_cap`, `prd_missing`, `lane_without_units`, `active_run_state`) are recorded in the plan and never block.

`verify:artifact --kind=execution-plan` is the freshness gate: it fails when the plan, the roles file, the manifest lanes, a generated prompt or a host signature no longer match what was compiled (`plan_digest_stale`, `roles_changed`, `manifest_lanes_diverged`, `prompt_stale`, `signature_missing`) and warns when the dev kernel changed since (`dev_profile_stale`). It auto-fires at the planner's `agent:done` and stays silent for features that never compiled a plan.

## Explicit fallback only

Missing CLI, unsupported capability, or unavailable model pauses execution. The active chat must never imitate the requested model.

A fallback runs only when both the entry and the global policy authorize it:

```json
{
  "fallbacks": [
    {
      "host": "codex",
      "model": "configured-default",
      "on": ["unavailable", "capacity"]
    }
  ],
  "capacity_policy": {
    "strategy": "fallback",
    "max_attempts": 2,
    "backoff_ms": 0,
    "allow_cross_host": true
  }
}
```

Without this explicit declaration, execution returns `paused` with a resume command.

## Model and report binding

Codex model names resolve conservatively against the local catalog: exact slug, normalized name, unique alias, then bounded typo correction. Numeric versions never drift. Other hosts accept safe literal IDs when no catalog adapter exists.

State, report, and telemetry keep:

- requested and resolved model;
- resolution strategy;
- reasoning effort when supported;
- host and fallback history;
- feature, run, attempt, agent/lane, writable roots, and declared lane paths.

Reports that do not match the registered attempt are rejected.

## Review policy

`aioson verification:plan . --feature=my-feature --trigger=per-phase` runs no reviewer by default. At `end-of-feature`, QA is the only default reviewer. Tester, Pentester, and Validator run only when their manifest entry is enabled and its trigger applies.
