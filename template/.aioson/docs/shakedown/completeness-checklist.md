---
description: "Shakedown walkthrough method — surface inventory sources, CRUD/form/error/consistency checklists, classification and lane rules for the spec-independent completeness review."
agents: [shakedown]
task_types: [completeness-walkthrough, punch-list]
triggers: [shakedown, pente fino, completeness walkthrough, punch list, CRUD gaps]
---

# Shakedown Completeness Checklist

The method behind `@shakedown`'s walkthrough. The agent kernel owns the contract
(spec-blind first pass, coverage set-difference, find-don't-fix); this module
owns the per-surface questions. Work the checklist per surface — it exists so
the walkthrough never depends on recall.

## 1. Surface inventory sources (by project_type)

| project_type | Enumerate from |
|---|---|
| web_app | router/pages registry, navigation menus, API route files, background jobs with user-visible effects |
| api | endpoint registrations, OpenAPI/schema files, webhooks, CLI entry points |
| site | page files, nav links, forms, outbound CTAs |
| script | commands/subcommands, flags with behavior, config entry points |
| desktop_app | windows, menu/tray items, shortcuts, IPC handlers with UI effects |
| dapp | routes/pages plus contract entry points reachable from the UI |

Record every surface in the Coverage table before visiting any. Surfaces added
mid-walkthrough (discovered links, modals, admin routes) join the inventory —
they never stay off the books.

## 2. Listing checklist (per entity list)

- Create, detail view, edit, delete each reachable — or their absence is a deliberate, evidenced decision.
- Empty state: designed message and next action, not a blank area or raw "0 results".
- Pagination: page 2+ actually loads; page size sane; total count honest.
- Search/filter/sort present where the sibling listings have them; filters combine and reset.
- Feedback after each action: the list reflects a create/edit/delete without manual refresh.
- Destructive actions confirmed via the project's modal pattern (never native `confirm`), with undo or an explicit consequence statement.

## 3. Form checklist (per form)

- Validation on both sides: client feedback plus server rejection of invalid payloads (test by submitting invalid data, not by reading intentions).
- Required fields marked; error messages name the field and the fix, displayed next to the field.
- Input semantics honor the project's form rules (`type`, `inputmode`, `autocomplete`, `maxlength`, masks) when `.aioson/rules/` interaction contracts exist — those rules are convention evidence for `incomplete` findings.
- Double-submit guard: the submit control disables or the handler is idempotent.
- Success feedback states what happened; failure feedback preserves the user's input.
- Cancel/back path exists; unsaved changes are not silently destroyed.

## 4. Error-path checklist (per mutating surface)

- Invalid input → named rejection, no crash, no silent success.
- Missing record (direct URL/ID access) → designed not-found, not a stack trace.
- Unauthorized access → denied with a designed screen/response, and the action is truly blocked server-side.
- Backend/network failure → user-visible failure state; no infinite spinner; retry or guidance.
- Concurrent edit/stale data → last-write behavior is at least deliberate (evidenced), not accidental.

## 5. Consistency pass (across sibling modules)

- Capability parity: actions, filters, exports present in module A and absent in comparable module B.
- Pattern parity: same layout, naming, confirmation, and feedback patterns for the same kind of operation.
- State parity: loading/empty/error states designed in one module and missing in another.
- Every finding here cites the sibling as evidence: "X does this at <path>; Y does not".

## 6. Runtime walkthrough protocol

- Launch through the normal production entry point (the one `project.context.md` and the repository imply) — never a detached fixture.
- Per surface: one happy path plus one adversarial path (invalid input, missing record, or unauthorized) minimum.
- When the app cannot run after two distinct attempts, switch to `run: static`, apply the same checklist over code, and say so in the report frontmatter — a static run is legitimate, a silently partial one is not.

## 7. Classification and lanes

| Class | Bar | Required evidence |
|---|---|---|
| `bug` | behavior is wrong | exact reproduction: entry → action → expected vs observed |
| `incomplete` | expected-by-convention capability/state is absent | sibling module, project convention, `.aioson/rules/` contract, or checklist item |
| `polish` | works and complete, could be nicer | short rationale; explicitly nice-to-have |

Lane suggestion per finding: `simple-plan` when the fix fits the Simple Plan
budget from `agent-routing.md` (one observable outcome, existing boundaries, up
to 5 behavior files / 8 paths / 2 modules — batch related quick wins into one
lane run); `feature` when it needs product decisions or new boundaries;
`briefing` when the walkthrough exposed product scope nobody framed yet.

## 8. Honesty rules

- `surfaces − visited = 0` or the run is reported partial in `## Not visited` — never call a partial run complete.
- A skipped check is reported as skipped, never as passed.
- The spec-blind pass ends before the PRD/plan/QA report is opened; findings discovered only through the spec are labeled from the second pass.
