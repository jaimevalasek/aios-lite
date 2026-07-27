---
feature: briefing-review-decision-room
status: approved
source_prd: .aioson/context/prd-briefing-review-decision-room.md
source_briefing: null
sheldon_review: required
prototype: null
prototype_status: none
prototype_feature: null
---

# Implementation Plan — Briefing Review Decision Room

## Objective

Make `aioson briefing:review` generate a self-contained visual Decision Room whose explicit selections survive save/apply and become fail-closed authority for Product, Sheldon, Planner, DEV and QA.

## Repository evidence

- Production entry points: `src/commands/briefing.js` through `aioson briefing:review` and `aioson briefing:apply-feedback`.
- Existing patterns to reuse: `src/lib/briefing-refiner/review-html.js` owns the offline HTML and browser fallbacks; `feedback-schema.js` normalizes and validates; `apply-feedback.js` writes the briefing/report; `refinement-report.js` renders the stable handoff.
- Distribution pattern: `template/.aioson/agents/*.md` is canonical and `npm run sync:agents` updates `.aioson/agents/*.md`.
- Current size boundary: `review-html.js` is already 550 lines, so the safe Markdown subset belongs in one small adjacent module instead of enlarging the generator further.
- Runtime and test baseline: Node.js 20+, vanilla browser JavaScript, `node:test`; no browser/UI dependency is installed or needed.
- Test runner: `node --test tests/briefing-refiner.test.js tests/agent-contracts.test.js tests/agent-structural-contract.test.js`.

## Engineering Controls

| Concern | Evidence / trigger | Planned control | Verification | Recovery |
|---|---|---|---|---|
| schema compatibility | `feedback-schema.js` accepts 1.0/1.1 and existing feedback may still be pending | Add 1.2 fields additively; retain 1.0/1.1 validation and legacy accepted-recommendation behavior | focused schema/apply tests for all three versions | revert 1.2 generation while leaving old validators intact; no migration |
| input validation | New 1.2 questions, alternatives, rationale and evidence references are agent/operator-controlled text consumed by the CLI and browser | Enforce types, 2–4 options, unique IDs, selection cardinality and explicit limits: question/description/impact/evidence reference ≤500 chars, label ≤120 and rationale ≤2,000; reject overflow/wrong types before generation or apply | negative schema tests for overflow, wrong type, duplicate/unknown IDs and bad cardinality | legacy 1.0/1.1 section text remains compatible; rejected 1.2 input is corrected and regenerated |
| authority integrity | application currently writes the report before the command archives feedback | Derive approved decisions centrally, include only valid accepted selections, then rewrite the stable report with the actual applied archive path; mismatches remain nonbinding | apply/report integration tests assert round, source hash, applied hash, archive and excluded states | preserve the applied briefing but omit approved authority if the archive cannot be proven |
| untrusted Markdown/evidence | section and evidence text can contain HTML-like input and the review opens locally | Escape first, render only a bounded Markdown subset, keep evidence as display-only text and ship no external resources | malicious-input generator test plus self-contained-resource assertion | fall back to escaped preformatted text |
| local persistence and accessibility | current UI depends on localStorage, File System Access, download and clipboard fallbacks | Keep canonical plain text and JSON; native radio/checkbox/buttons; visible focus; collect/restore selections through every fallback | regression tests plus 1440×900 and narrow headless Edge smoke | download/copy remain available when direct save/storage fails |
| template parity | canonical agent prompts live under `template/` and workspace copies are generated | Edit template first, run `npm run sync:agents`, and assert the shared authority contract in all five canonical agents | agent contract/structural tests and byte parity check | template remains source of truth and can resync workspace copies |

Auth, ownership, upload, secret, multi-tenant storage, query construction and server-side URL following are N/A: the artifact is single-operator local HTML/JSON with no account, network request, database or upload boundary. Evidence references remain inert escaped text, including strings that resemble URLs.

## Implementation Delta

| CAP | Action | Existing evidence | Exact paths | Required change |
|---|---|---|---|---|
| CAP-BRDR-01 | modify | Findings currently render as technical status selects and the refiner emits recommendation-only findings | `src/lib/briefing-refiner/feedback-schema.js`<br>`src/lib/briefing-refiner/review-html.js`<br>`tests/briefing-refiner.test.js`<br>`template/.aioson/agents/briefing-refiner.md`<br>`.aioson/agents/briefing-refiner.md` | Add structured alternatives, guided queue/progress, native single/multiple choice cards and visible legacy actions; require legitimate options from Briefing Refiner |
| CAP-BRDR-02 | modify | `review-html.js` exposes raw plaintext editors for every section | `src/lib/briefing-refiner/review-html.js`<br>`tests/briefing-refiner.test.js` | Make rendered document reading the default and expose explicit edit mode without changing canonical section text |
| CAP-BRDR-02 | create | No safe Markdown renderer exists and the 550-line generator already exceeds the project split guideline | `src/lib/briefing-refiner/safe-markdown.js` | Add one dependency-free escape-first renderer for the supported headings, lists, tables, emphasis and code subset |
| CAP-BRDR-03 | modify | Validation, apply and report boundaries already exist but do not encode selections or final archive identity | `src/lib/briefing-refiner/feedback-schema.js`<br>`src/lib/briefing-refiner/review-html.js`<br>`src/lib/briefing-refiner/refinement-report.js`<br>`src/lib/briefing-refiner/apply-feedback.js`<br>`src/commands/briefing.js`<br>`tests/briefing-refiner.test.js`<br>`template/.aioson/docs/briefing/refinement-loop.md`<br>`.aioson/docs/briefing/refinement-loop.md` | Add schema 1.2 validation/round-trip, fail-closed approved-decision extraction, report decision/source sections and exact post-archive trace |
| CAP-BRDR-04 | create | No shared downstream contract distinguishes applied selections from merely displayed recommendations | `template/.aioson/docs/briefing/review-authority.md`<br>`.aioson/docs/briefing/review-authority.md` | Define report/archive resolution, validity checks, binding states and role-by-role trace rules |
| CAP-BRDR-04 | modify | Canonical prompts read briefings/refinements but lack one exact approved-review algorithm; private template docs ship through `MANAGED_FILES` | `template/.aioson/agents/product.md`<br>`.aioson/agents/product.md`<br>`template/.aioson/agents/sheldon.md`<br>`.aioson/agents/sheldon.md`<br>`template/.aioson/agents/planner.md`<br>`.aioson/agents/planner.md`<br>`template/.aioson/agents/dev.md`<br>`.aioson/agents/dev.md`<br>`template/.aioson/agents/qa.md`<br>`.aioson/agents/qa.md`<br>`src/constants.js`<br>`tests/agent-contracts.test.js` | Require the shared contract, register it for installed projects, and enforce the exact applied archive/accepted-selection trace at Product, Sheldon, plan, implementation and QA boundaries |
| CAP-BRDR-05 | modify | Existing offline save/autosave/download/copy behavior is tested but the current controls are compact selects and desktop-document layout | `src/lib/briefing-refiner/review-html.js`<br>`tests/briefing-refiner.test.js` | Preserve fallbacks while adding responsive two-pane/single-column states, final summary, localized semantic controls and keyboard-visible focus |

## Capability Delivery Plan

| CAP | Phase | Files | Verification |
|---|---|---|---|
| CAP-BRDR-01 | Phase 1 — guided decision to structured feedback | `src/lib/briefing-refiner/feedback-schema.js`<br>`src/lib/briefing-refiner/review-html.js`<br>`tests/briefing-refiner.test.js`<br>`template/.aioson/agents/briefing-refiner.md`<br>`.aioson/agents/briefing-refiner.md` | `node --test tests/briefing-refiner.test.js tests/agent-contracts.test.js` plus generated-review keyboard/selection smoke |
| CAP-BRDR-02 | Phase 2 — readable document with explicit editing | `src/lib/briefing-refiner/review-html.js`<br>`tests/briefing-refiner.test.js`<br>`src/lib/briefing-refiner/safe-markdown.js` | `node --test tests/briefing-refiner.test.js` plus rendered/edit round-trip in headless Edge |
| CAP-BRDR-03 | Phase 1 — guided decision to structured feedback | `src/lib/briefing-refiner/feedback-schema.js`<br>`src/lib/briefing-refiner/review-html.js`<br>`src/lib/briefing-refiner/refinement-report.js`<br>`src/lib/briefing-refiner/apply-feedback.js`<br>`src/commands/briefing.js`<br>`tests/briefing-refiner.test.js`<br>`template/.aioson/docs/briefing/refinement-loop.md`<br>`.aioson/docs/briefing/refinement-loop.md` | `node --test tests/briefing-refiner.test.js` with 1.0/1.1/1.2, invalid-cardinality, apply/archive/report assertions |
| CAP-BRDR-04 | Phase 3 — approved authority through Product-to-QA | `template/.aioson/docs/briefing/review-authority.md`<br>`.aioson/docs/briefing/review-authority.md`<br>`template/.aioson/agents/product.md`<br>`.aioson/agents/product.md`<br>`template/.aioson/agents/sheldon.md`<br>`.aioson/agents/sheldon.md`<br>`template/.aioson/agents/planner.md`<br>`.aioson/agents/planner.md`<br>`template/.aioson/agents/dev.md`<br>`.aioson/agents/dev.md`<br>`template/.aioson/agents/qa.md`<br>`.aioson/agents/qa.md`<br>`src/constants.js`<br>`tests/agent-contracts.test.js` | `npm run sync:agents` then `node --test tests/agent-contracts.test.js tests/agent-structural-contract.test.js` and template/workspace byte parity |
| CAP-BRDR-05 | Phase 2 — readable document with explicit editing | `src/lib/briefing-refiner/review-html.js`<br>`tests/briefing-refiner.test.js` | focused fallback/static tests plus headless Edge screenshots at 1440×900 and 390×844 |

## Phase 1 — Guided decision to applied authority

- CAP/AC: CAP-BRDR-01, CAP-BRDR-03; AC-BRDR-01, AC-BRDR-02, AC-BRDR-05, AC-BRDR-06.
- User-visible outcome: the normal generated review opens on a decision queue, stores radio/checkbox selections and shows only valid accepted choices as approved after confirmed apply.
- Implementation: normalize and validate schema 1.2; render choices and legacy actions; collect/restore rationale/evidence; centralize approved-decision extraction; finalize the report after archive identity is known.
- Create/modify/reuse/retire: modify only the CAP-BRDR-01 and CAP-BRDR-03 paths listed above; reuse the current CLI, hashing, section serialization and browser fallback boundaries.
- Verification: `node --test tests/briefing-refiner.test.js`; generate via `node bin/aioson.js briefing:review <fixture-project> --slug=idea-one --locale=pt-BR`, interact in a real browser, then run dry-run and confirmed `briefing:apply-feedback`.
- Done when: one selected structured option round-trips to the exact applied archive/report, while pending/recommended-only/invalid choices never appear as approved authority.

## Phase 2 — Readable, resilient review workspace

- CAP/AC: CAP-BRDR-02, CAP-BRDR-05; AC-BRDR-03, AC-BRDR-04, AC-BRDR-09, AC-BRDR-10.
- User-visible outcome: Document mode is readable by default, explicit editing preserves canonical Markdown, and the Decision Room remains usable on desktop/mobile when direct write or localStorage is unavailable.
- Implementation: add the escape-first Markdown renderer; add workspace tabs, final summary, responsive layout and visible focus; keep save/download/copy and draft fallback semantics.
- Create/modify/reuse/retire: create `safe-markdown.js`; modify only the CAP-BRDR-02 and CAP-BRDR-05 paths listed above.
- Verification: focused tests plus Microsoft Edge `--headless=new --window-size=1440,900` and `--window-size=390,844` screenshots of a production-generated local `review.html`.
- Done when: read/edit text round-trips exactly, no external resource is emitted, all material controls are keyboard reachable and fallback failures do not erase selections.

## Phase 3 — Approved authority through Product, Sheldon, Planner, DEV and QA

- CAP/AC: CAP-BRDR-04; AC-BRDR-07, AC-BRDR-08.
- User-visible outcome: every canonical downstream agent sees the same accepted choices and sources, while visibly excluding pending, rejected, deferred, stale or recommendation-only material.
- Implementation: create the shared authority resolution contract in template/workspace docs; update canonical template prompts first; sync agents; lock the behavior with contract tests.
- Create/modify/reuse/retire: create/modify only the CAP-BRDR-04 paths listed above.
- Verification: `npm run sync:agents`; `node --test tests/agent-contracts.test.js tests/agent-structural-contract.test.js`; `npm run check:syntax`.
- Done when: Product maps accepted decisions to Source Coverage/CAP/AC, Sheldon verifies them, Planner traces them, DEV implements them and QA can fail a contradicted or missing approved decision using the same report/archive evidence.

## Final verification

- `node --test tests/briefing-refiner.test.js tests/agent-contracts.test.js tests/agent-structural-contract.test.js`
- `npm run check:syntax`
- `npm test`
- Generate one pt-BR review from the normal CLI, inspect desktop/mobile screenshots, exercise a structured choice, Document read/edit, final summary, local draft restore, download/copy and confirmed apply, then verify the stable report against the exact archived feedback JSON.
