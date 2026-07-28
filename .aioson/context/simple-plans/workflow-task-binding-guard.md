---
slug: workflow-task-binding-guard
status: done
owner: dev
created_at: 2026-07-28
updated_at: 2026-07-28
classification: MICRO
risk: medium
source: direct-user-request
---

# Simple Plan - Workflow task binding guard

## Scope

Prevent a new bounded request from being routed through an unrelated active feature workflow, while surfacing stale installed templates and preserving valid workflow continuation.

## Context selected

- Gateway contracts: `.aioson/docs/gateway/agent-routing.md` and `.aioson/docs/gateway/workflow-runtime.md`.
- Rules: Simple Plan lane, disk-first artifacts, context boundary, canonical paths, structural contract, and output brevity.
- Existing pattern: `loadOrCreateState()` already reconciles persisted workflow state with `features.md`; the new guard adds caller intent without replacing that reconciliation.
- Incident evidence: an active `play-service-distribution` workflow captured an unrelated harness-extension request before the Simple Plan gate ran.

## Implementation intelligence

- Framework leverage: reuse the generic CLI option parser and existing workflow state rather than adding semantic classification to the deterministic CLI.
- Structure: the gateway owns semantic task-to-feature binding; `workflow:next` only verifies the caller-provided expected feature before activation or event emission.
- Version detection: isolate installed-template comparison in a focused module reused by `preflight` and `workflow:next`.
- Cross-harness parity: update canonical template gateways first, then mirror them to workspace entrypoints.

## Done criteria

- Gateway instructions require the Concrete implementation lane gate and task-to-workflow relevance check before `workflow:next` for an unbound request.
- An unrelated expected feature causes `workflow:next` to abort before agent activation and preserves the existing workflow state.
- Valid matching feature and project-mode expectations continue normally.
- `preflight` and `workflow:next` report an installed-template version older than the running CLI.
- Regression tests reproduce the original MEDIUM-workflow/Simple-Plan incident and prove that Product, Sheldon, and Briefing Refiner are not selected for the new request.

## Useful options considered

- Include now: prompt precedence, `--expect-feature`, template-version warning, focused regression and integration simulation.
- Defer: deterministic natural-language classification inside the CLI; the gateway model already owns semantic classification.
- Escalate: none.

## Out of scope

- Replacing `workflow:next` with an LLM router.
- Automatically updating project templates.
- Changing canonical Product → Sheldon → Planner → Dev → QA behavior for requests already bound to the active feature.

## Expected files

- Behavior: `template/.aioson/docs/gateway/agent-routing.md`
- Behavior: `src/commands/workflow-next.js`
- Behavior: `src/commands/preflight.js`
- Behavior: `src/template-version-status.js`
- Support: `.aioson/docs/gateway/agent-routing.md`
- Support: `template/.aioson/docs/gateway/workflow-runtime.md`, `.aioson/docs/gateway/workflow-runtime.md`
- Support: `template/AGENTS.md`, `template/CLAUDE.md`, `template/OPENCODE.md`
- Support: `AGENTS.md`, `CLAUDE.md`, `OPENCODE.md`
- Support: `src/commands/workflow-status.js`, `src/i18n/messages/en.js`, `src/i18n/messages/pt-BR.js`
- Support: `tests/gateway-kernels.test.js`, `tests/workflow-next.test.js`, `tests/workflow-status.test.js`, `tests/preflight-command.test.js`, `tests/template-version-status.test.js`, `tests/parser-core.test.js`, `tests/json-output.test.js`

The path count exceeds the default review budget only because three host gateways and their managed workspace mirrors must remain equivalent. It is still one routing outcome with three behavior modules and no new product or architecture boundary.

## Verification

- `npm run check:syntax` — 480 JavaScript files checked.
- Focused routing suite — 75 passed, 0 failed.
- `node --test tests/json-output.test.js` — 41 passed, including an isolated two-branch CLI simulation.
- CLI mismatch branch — exit 1, no workflow event or last handoff, and identical workflow-state SHA-256.
- CLI matching branch — exit 0, continued to Sheldon for `play-service-distribution`, with outdated-template status exposed.
- `npm test` — 4,025 passed, 0 failed, 1 skipped across 4,026 tests.

## Session state

Completed. No remaining implementation or verification step.
