---
description: AIOSON canonical feature lifecycle, Autopilot boundaries, handoff rules, and tracked external-client operations
task_types: [workflow-routing, autopilot, tracked-session, handoff]
triggers: [feature workflow, workflow next, auto, step, external client, live session]
---

# Gateway Workflow and Runtime

## Authority

After the current request has been bound to the active feature, `aioson workflow:next --expect-feature=<slug>` owns routing, state, and event emission. A persisted workflow does not establish that binding by itself. Outside that confirmed envelope:

- Apply the Concrete implementation lane gate first.
- Preserve an unrelated active workflow unchanged; Simple Plan runs directly in Dev and never calls `workflow:next`.
- Canonical feature route: Product → Sheldon → Planner → Dev → QA.
- When the user starts from raw feature sources, use the pre-product route `plans/{slug}/ → Briefing → Briefing Refiner → user approval`; visual/rich surfaces require the feature-owned prototype to be approved before Product.
- Product, Sheldon, Planner, Dev, and QA stay in workflow. Other specialists run only for a concrete unresolved decision or enabled/risk-triggered review.
- Simple Plan goes directly to Dev and ends there.
- Repair objectively inferable stale/inconsistent context in workflow; unresolved project-context uncertainty routes to Setup.

Never bypass a required stage because of urgency or complexity.

## Handoffs and Autopilot

Between manual handoffs, output only the next agent and why; do not start its work.

Autopilot is enabled for the current chain when the activation explicitly includes `--auto`, project `auto_handoff` is true, or `.aioson/context/workflow-execute.json` enables agentic policy. `--step` wins for that activation without rewriting the persisted preference.

The automatic chain is Product → Sheldon → Planner → Dev → QA. Sheldon must promote a current hash-bound PASS over the final PRD and hard authorities before Planner. Dev may dispatch explicitly enabled host/model development lanes but remains integration owner. Unavailable execution pauses unless the manifest declares an applicable fallback.

Tester, Pentester, and Validator are disabled by default and run only when enabled and concretely triggered. They never grant Gate D. The chain stops for a genuinely user-owned decision and never closes/publishes a feature.

## Feature gates

- Product scope/readiness: one PRD with concrete ACs, complete `PROM-*` source coverage when a briefing source map exists, and approved scope/readiness.
- Sheldon readiness: `sheldon_review: approved` plus a current hash-bound Sheldon PASS after the final PRD edit.
- Gate C: one approved implementation plan with vertical production-path stages.
- Gate D: QA PASS with concrete evidence for every required CAP/AC and a reproducible normal production-path causal chain.
- QA FAIL allows one bounded Dev correction and one final independent QA pass unless the manifest explicitly changes the finite limit.

No requirements/spec/design/readiness/conformance/harness document is an extra canonical prerequisite.

## Tracked external clients

Use the current tool name (`codex`, `claude`, or supported equivalent):

```bash
aioson workflow:next . --expect-feature=<slug> --tool=<tool>
aioson agent:prompt <agent> . --tool=<tool>
aioson live:start . --tool=<tool> --agent=deyvin --no-launch
```

Inside a live session:

```bash
aioson runtime:emit . --agent=<agent> --type=<event> --summary="..."
aioson runtime:emit . --agent=<agent> --type=plan_checkpoint --plan-step=<step>
aioson live:handoff . --agent=<agent> --to=<next-agent> --reason="..."
aioson live:status . --agent=<agent> --watch=2
aioson live:close . --agent=<agent> --summary="..."
```

Runtime telemetry belongs to the gateway. Do not synthesize dashboard records with ad-hoc `runtime-log` snippets or open a parallel runtime session inside an active live envelope. Plain natural-language activation may execute an agent but does not guarantee dashboard tracking.

## Human terminal gate

QA PASS stops with a recommendation for the human to run `aioson feature:close`; neither workflow nor Autopilot runs close/publish automatically.
