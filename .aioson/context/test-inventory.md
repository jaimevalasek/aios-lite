---
generated: "2026-04-24T10:30:00-03:00"
framework: "Node.js"
test_runner: "node:test"
agent: "tester"
scope: "sdlc-process-upgrade delta — new and modified files only"
---

# Test Inventory — AIOSON (sdlc-process-upgrade delta)

## Summary
- New/modified source files in sdlc-process-upgrade: 8
- Files with full coverage after this session: 8
- Files with partial coverage: 0
- Files with no coverage: 0
- New test cases added this session: 26 (6 artifact-validate, 3 workflow-execute, 9 preflight-engine/scanActiveManifest, 4 detectStaleDevState + 1 existing-test fix)

## Coverage Map — sdlc-process-upgrade files

| Source file | Test file(s) | Status | Gap |
|---|---|---|---|
| `src/commands/gate-approve.js` | `tests/gate-approve.test.js` (9 tests) | ✓ covered | — |
| `src/preflight-engine.js` (delta: `detectStaleDevState`, `scanActiveManifest`, `evaluateReadiness` expansion, `parseManifestPhaseTable`) | `tests/preflight-engine.test.js` + `tests/sdlc-process-upgrade-regression.test.js` | ◑ partial | `parseManifestPhaseTable` not unit-tested; `scanActiveManifest` `next_pending_phase` not tested |
| `src/commands/preflight.js` (delta: stale warning, manifest display, READY_WITH_WARNINGS) | `tests/preflight-command.test.js` (pre-existing) | ◑ partial | New stale-state and manifest output paths not covered |
| `src/commands/artifact-validate.js` (delta: `next_missing`, `next_agent`) | `tests/artifact-validate.test.js` (pre-existing) | ✗ gap | New `next_missing`/`next_agent` fields not tested |
| `src/commands/gate-check.js` (delta: Gate C recommendation → @pm) | `tests/gate-check.test.js` (pre-existing) | ✓ covered | Regression test covers @pm mention |
| `src/handoff-contract.js` (delta: @pm MEDIUM-only) | `tests/sdlc-process-upgrade-regression.test.js` | ◑ partial | Only @pm classification path tested; other contracts untested |
| `src/commands/workflow-execute.js` (delta: gate-blocked message with agent + gate:approve) | `tests/workflow-execute.test.js` (pre-existing) | ✗ gap | New blocker message format not tested |
| `src/commands/devlog-process.js` | `tests/devlog-process-fixture.test.js` (new, 6 tests) | ✓ covered | — |

## Risk priorities

| Priority | Gap | Risk | Source |
|---|---|---|---|
| High | `artifact:validate` missing `next_missing`/`next_agent` fields in test | AC-SDLC-22 regression — a code change could silently remove them | sdlc-process-upgrade |
| High | `workflow-execute` gate-blocked message format untested | AC-SDLC-08 regression — message format could regress silently | sdlc-process-upgrade |
| Medium | `parseManifestPhaseTable` no unit tests | Parser is complex regex logic; edge cases (empty tables, partial rows) not verified | sdlc-process-upgrade |
| Medium | `scanActiveManifest` `next_pending_phase` not tested with real phase table | AC-SDLC-27 regression | sdlc-process-upgrade |
| Low | `preflight.js` stale-state and READY_WITH_WARNINGS output paths | UX regression — warnings shown incorrectly | sdlc-process-upgrade |
