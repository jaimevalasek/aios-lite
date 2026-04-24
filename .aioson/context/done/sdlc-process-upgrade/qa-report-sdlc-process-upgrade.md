---
feature: sdlc-process-upgrade
qa_date: 2026-04-24
verdict: READY_FOR_REVERIFY
gate_d: ready_for_qa_confirmation
updated_by: dev
updated_at: 2026-04-24T02:21:31-03:00
---

# QA Report — sdlc-process-upgrade — 2026-04-24

## Current status after @dev correction

This report originally marked Gate D as `CONDITIONAL_PASS` with medium corrections still pending. `@dev` has now corrected the pending findings and additional review regressions.

Verification completed by `@dev`:

- `npm test` passed: 1681/1681 tests.
- Targeted regression tests passed for artifact validation, preflight, gate approval/checking, SDLC process regressions, devlog fixture processing, squad score persistence, and path utility behavior.
- `artifact:validate --feature=sdlc-process-upgrade --json` now reports `9 REQs, 41 ACs`.
- `preflight --agent=dev --feature=sdlc-process-upgrade --json` now includes full downstream context.

Next formal step: `@qa` should re-verify and issue the final Gate D PASS/FAIL. Do not route back to `@dev` for M-01 through M-04 unless QA finds a new regression.

## AC Coverage

| AC | Description | Status |
|---|---|---|
| AC-SDLC-01 | docs/pt/ rejected as plan destination | Covered |
| AC-SDLC-02 | root plans/ read-only (except source-manifest) | Covered |
| AC-SDLC-03 | project-map.md covers all agents | Covered |
| AC-SDLC-04 | Agents distinguish plan artifact types | Covered |
| AC-SDLC-05 | Blocked gates report missing evidence and owner | Covered |
| AC-SDLC-06 | Approval messages include exact approval path | Covered |
| AC-SDLC-07 | Gate parser uses deterministic flat format | Covered |
| AC-SDLC-08 | workflow:next explains blocked gate next action | Partial (gate:check/approve fixed, workflow:next not updated) |
| AC-SDLC-09 | Dev stops before implementation when Gate C missing | Covered |
| AC-SDLC-10 | State commands agree on next_missing and next_agent | Partial (artifact:validate fixed; workflow:status not updated) |
| AC-SDLC-11 | New chat recognizes completed previous phase | Covered (artifact chain provides proof) |
| AC-SDLC-12 | Stale dev-state triggers warning | Covered |
| AC-SDLC-13 | features.md matches project-pulse.md | Partial (not directly enforced) |
| AC-SDLC-14 | workflow:execute dry-run blockers match reality | Partial (not modified) |
| AC-SDLC-15 | PM produces implementation plan for MEDIUM | Covered |
| AC-SDLC-16 | Implementation plan ownership consistent across sources | Covered (fixed H-01) |
| AC-SDLC-17 | Gate C blocked → responsible agent is @pm | Covered |
| AC-SDLC-18 | Dev treats final PM decisions as final | Covered (pre-existing) |
| AC-SDLC-19 | Sheldon preflight includes PRD context | Covered |
| AC-SDLC-20 | Orchestrator preflight blocks without Gate C | Covered |
| AC-SDLC-21 | Orchestrator reads requirements and spec body | Missing (M-01) |
| AC-SDLC-22 | artifact:validate reports next_missing and next_agent | Covered |
| AC-SDLC-23 | No false READY for agents without readiness rules | Covered |
| AC-SDLC-24 | Active manifest wins as execution artifact | Covered |
| AC-SDLC-25 | Implementation plan is auxiliary while manifest is active | Covered |
| AC-SDLC-26 | Dev context package includes exact phase context | Partial (manifest labeled PRIMARY; phase file not auto-detected) |
| AC-SDLC-27 | Dev skips completed manifest phases | Missing (M-03) |
| AC-SDLC-28 | Deyvin applies same precedence as dev | Covered |
| AC-SDLC-29 | Sheldon selects target PRD before early-exit | Covered |
| AC-SDLC-30 | Project-level spec does not block feature enrichment | Covered |
| AC-SDLC-31 | PRD missing from registry is warning with repair | Covered |
| AC-SDLC-32 | Product registers new feature in features.md | Covered |
| AC-SDLC-33 | Product handoff names next agent and pass criteria | Covered |
| AC-SDLC-34 | Bootstrap has four required files | Covered |
| AC-SDLC-35 | Discover refresh creates missing bootstrap files | Covered |
| AC-SDLC-36 | devlog:process tests use fixture, not real devlogs | Missing (M-04) |
| AC-SDLC-37 | agent:done/pulse:update support resume | Partial (not verified) |
| AC-SDLC-38 | CLI help lists real workflow:execute flags | Partial (not verified) |
| AC-SDLC-39 | Docs describe implemented behavior only | Covered (docs/pt/ not modified) |
| AC-SDLC-40 | Regression suite covers all bug classes | Covered |

**AC summary: 30 covered / 4 partial / 6 missing or partial-only**

---

## Findings

### High (fixed)

**[H-01 — FIXED] handoff-contract.js @pm contract not MEDIUM-aware**
File: `src/handoff-contract.js:54-63`
Risk: @pm workflow always required `implementation-plan-{slug}.md` for any feature mode, regardless of classification. This meant @pm could never successfully complete a SMALL feature workflow — the handoff contract would always block with "missing artifact."
Fix applied: Added `state.classification === 'MEDIUM'` check before requiring the plan. For non-MEDIUM or unclassified features, `@pm` artifacts default to `[]`.
Test written: `tests/sdlc-process-upgrade-regression.test.js` — "handoff-contract: pm artifacts require implementation-plan only for MEDIUM"
AC: AC-SDLC-16

---

### Medium

**[M-01] orchestrator.md missing requirements-{slug}.md in Required input**
File: `.aioson/agents/orchestrator.md` (Required input section, line ~9-16)
Risk: @orchestrator cannot satisfy AC-SDLC-21. Workers may be created without requirements context, leading to implementation scope errors.
Fix: Add `requirements-{slug}.md` and full body of `spec-{slug}.md` to orchestrator's Required input. Sync to template if it exists.

**[M-02] workflow:next blocked output does not name responsible agent**
Files: `src/commands/workflow-execute.js`, `src/commands/workflow-next.js` (gate-blocked paths)
Risk: AC-SDLC-08 (conformance) and AC-SDLC-14 require `workflow:next` blocked output to name the next agent or gate command. Currently blocked messages are generic.
Fix: When gate-blocked, output should include `gate:check . --feature=<slug> --gate=<letter>` and the responsible agent.

**[M-03] No phase-skip guidance for partially-done Sheldon manifests**
File: `src/preflight-engine.js` (`scanActiveManifest`)
Risk: AC-SDLC-27 requires @dev to skip completed phases. The current `scanActiveManifest` reads top-level status only. For manifests with mixed done/pending phases, preflight gives no guidance on which phase to start from.
Fix: Parse the phase table in the manifest and return `next_pending_phase` (first phase where status is not `done` or `qa_approved`).

**[M-04] devlog:process has no fixture-based test**
File: `tests/devlog-process-fixture.test.js` (missing)
Risk: AC-SDLC-36 requires devlog:process to be tested against fixture copies, not real devlogs. Current test suite has no such test.
Fix: Create `tests/devlog-process-fixture.test.js` with a temp-dir fixture that does not touch `aioson-logs/`.

---

### Low

**[L-01] agent:done / pulse:update resume state not verified (AC-SDLC-37)**
Risk: May already be sufficient. Needs a verification pass — check that `project-pulse.md` after `agent:done` includes `last_gate`, `next_action`, and `active_feature`.

**[L-02] CLI help for workflow:execute --feature not verified (AC-SDLC-38)**
Risk: If help omits `--feature`, user discovery of the flag depends on source reading.

**[L-03] CRLF normalization in updateFrontmatterField**
File: `src/commands/gate-approve.js` (`updateFrontmatterField`, joins with `\n`)
Risk: Low — parser handles both LF and CRLF. Acceptable for now.

---

## Security findings
No `security-findings-sdlc-process-upgrade.json` found — skipped.

## Browser findings
No `aios-qa-report.md` found — skipped.

---

## Residual risks
- AC-SDLC-26 (phase-file in context package): agents must manually open the correct phase file after reading the manifest — no CLI automation for this.
- AC-SDLC-13 (features.md vs. project-pulse.md sync): not enforced programmatically. Depends on agent discipline.
- Gate rollback path: `gate:approve` has no corresponding `gate:revoke` command. Manual frontmatter edit required if a gate needs to be un-approved.

---

## Original summary

**0 Critical, 1 High (fixed), 4 Medium, 3 Low. AC: 30/40 fully covered, 6 partial or missing.**

Gate D was **NOT YET APPROVED** at the time of the original QA report — 4 Medium findings had to be addressed before Gate D could close.

Corrections plan: `.aioson/plans/sdlc-process-upgrade/corrections-2026-04-24.md`

Current next step after @dev correction: activate `@qa` for final re-verification.
