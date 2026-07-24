---
description: Read-only Neo activation diagnostics, hygiene interpretation, and Neural Chain blocker policy
agents: [neo]
task_types: [project-orientation, workflow-status, hygiene-triage]
triggers: [neo activation, what next, where did we stop, project status, pending noises]
---

# Neo State Diagnostics

Use this module on activation. All operations are read-only.

## Fast diagnostics

When `aioson` is available, run these in parallel:

- `aioson memory:status .`
- `aioson memory:summary . --last=5`
- `aioson workflow:next . --status`
- `aioson hygiene:scan . --json`

Failure of an optional diagnostic is not a project blocker. Continue from canonical files and disclose the unavailable signal only if it changes confidence.

## Scan order

Stop expanding once the route is supported:

1. `.aioson/config.md` exists; if absent, stop with `needs_setup`.
2. `.aioson/context/project.context.md` exists and required frontmatter is not blank, `null`, or unresolved `auto`; otherwise `needs_setup` or `needs_setup_repair`.
3. `.aioson/context/project-pulse.md` supplies active feature, last agent, gate, blockers, and recommended action.
4. For a concrete bounded implementation request, apply Simple Plan precedence before checking PRD availability.
5. For a tracked feature, inspect only its PRD, implementation plan, `dev-state.md`, QA report, and `workflow.state.json` as needed.
6. Inspect harness progress and brain index only when an enabled harness or procedural-memory question affects the route.

Canonical bare artifact names resolve under `.aioson/context/`.

## Evidence precedence

Prefer, in order:

1. Explicit current blocker or workflow state
2. Current gate artifact and approval/verdict
3. `dev-state.md` with `status: in_progress`
4. Project pulse
5. Host-provided git snapshot

If two authoritative signals conflict, recommend the owner that can repair the state rather than guessing. Objectively inferable stale context may be repaired only by the workflow owner, never by Neo.

## Neural Chain noises

Files under `.aioson/context/noises/*.md` with unchecked `- [ ]` body items are a routing blocker.

- Report each file and pending count.
- Pause recommendations to all agents while pending.
- Offer only: resolve and mark verified items `- [x]`, or explicitly say `skip noises` and reactivate Neo.
- A prior explicit skip applies only to the current routing decision; do not rewrite the noise files.
- Do not treat headings, examples, or already checked items as pending work.

## Hygiene

Summarize only non-zero actionable buckets from `hygiene:scan`:

- pending Neural Chain noises
- completed features pending archive
- stale state
- on-demand review artifacts
- orphan slug artifacts

No hygiene bucket authorizes cleanup. Ask one focused question only when cleanup materially blocks the next route.

## Dashboard evidence

The dashboard must distinguish:

- confirmed state
- inferred state
- unavailable signal

Never turn a clean working tree into proof that implementation or QA is complete. Never turn modified files into proof that implementation is active without feature-state evidence.
