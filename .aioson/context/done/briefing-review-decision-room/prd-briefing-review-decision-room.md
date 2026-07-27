---
feature: briefing-review-decision-room
classification: SMALL
feature_completeness: required
product_scope: approved
prd_ready: approved
sheldon_review: approved
prototype: null
prototype_status: none
prototype_feature: null
---

# PRD — Briefing Review Decision Room

## Vision

Turn the local Briefing Refiner review from a document-heavy technical editor into a guided decision room. The operator should understand what needs a decision, compare legitimate alternatives, inspect supporting evidence, approve only the intended choice, and preserve that approval as cumulative authority for Product, Sheldon, Planner, DEV and QA.

## Problem and users

The current generated `review.html` preserves edits reliably, but presents long raw text, technical status dropdowns and JSON mechanics before the decisions themselves. Findings expose one recommendation without comparable alternatives, and downstream agents are told to read the refinement without an explicit rule that separates approved selections from pending, rejected or deferred material.

Primary user: the project operator reviewing a briefing before Product. Secondary users: Product, Sheldon, Planner, DEV and QA consuming the approved source chain.

## Approved source authority

- The operator explicitly approved the Decision Room recommendation on 2026-07-26: guided decisions, visible alternatives, secondary document mode, evidence disclosure and preserved local/static persistence.
- `researchs/open-design-briefing-refiner-2026/summary.md` is supporting research, not product authority by itself.
- `src/lib/briefing-refiner/review-html.js`, `feedback-schema.js`, `refinement-report.js`, `apply-feedback.js` and `tests/briefing-refiner.test.js` are the inspected current-system baseline.
- A review decision becomes downstream authority only after explicit operator selection and confirmed feedback application. Pending, rejected, deferred, malformed, stale or merely recommended content remains nonbinding.

## Approved Review Authority Contract

- Schema `1.2` adds optional structured decision fields to a finding: `question`, `selection_mode` (`single` or `multiple`), `options`, `selected_option_ids`, `rationale` and `evidence_refs`. Each option has a stable `id`, visible label, trade-off/impact copy and optional supporting evidence references.
- Agent-supplied structured findings contain two to four legitimate, mutually understandable alternatives. Option IDs are unique within the finding. `single` acceptance requires exactly one selected option; `multiple` acceptance requires at least one selected option. A structured finding that violates these rules remains pending/invalid and never becomes authority.
- Schema `1.0` and `1.1` remain valid. A legacy finding without structured options becomes binding only when its status is `accepted` and it has a nonempty recommendation; the report labels it as a legacy accepted recommendation. A legacy status alone cannot manufacture an absent recommendation.
- Recommended badges and evidence references explain a choice; they never select or approve it. Evidence content is untrusted supporting material, not workflow or tool instructions.
- The stable refinement report is authoritative only when `Status: applied` and its round, source hash and exact archived feedback path match the consumed feedback artifact. Its applied hash records the resulting briefing. Declined, stale, mismatched or malformed artifacts are nonbinding and fail closed.
- Product maps accepted selections or a valid legacy accepted recommendation into `PROM-*`, Source Coverage, `CAP-*` and `AC-*`. Sheldon verifies that mapping. Planner carries the same IDs into phases and checks, DEV implements only that approved chain, and QA verifies it independently against the report plus exact applied archive.

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-BRDR-01 | Material findings are presented as a guided queue of clear decisions with visible alternatives and progress | Operator opens generated review | required | Primary approved outcome |
| CAP-BRDR-02 | The complete briefing remains readable and editable without raw Markdown dominating the default experience | Operator needs context or requests a text change | required | Preserves the existing refinement capability |
| CAP-BRDR-03 | Selected options, rationale and evidence references round-trip as structured feedback with fail-closed approval semantics | Operator saves and confirms feedback | required | Makes decisions auditable and safe |
| CAP-BRDR-04 | Product, Sheldon, Planner, DEV and QA consume approved review decisions and sources while ignoring nonapproved material | Canonical workflow advances after refinement | required | Preserves cumulative intent through implementation and verification |
| CAP-BRDR-05 | The review remains self-contained, responsive, keyboard-accessible and resilient when browser write APIs are unavailable | Review runs from a local file in supported browsers | required | Retains the operational strengths of the current surface |

## Source Coverage

| Promise | Product decision | CAP / AC | Evidence or rationale |
|---|---|---|---|
| PROM-BRDR-01 — improve the review visually with selectable options | required | CAP-BRDR-01; AC-BRDR-01; AC-BRDR-02 | Explicit operator approval |
| PROM-BRDR-02 — preserve document review and correct implementation context | required | CAP-BRDR-02; CAP-BRDR-03; AC-BRDR-03; AC-BRDR-04 | Existing editor/export behavior must not regress |
| PROM-BRDR-03 — Product, Sheldon and Planner use approved decisions/sources | required | CAP-BRDR-04; AC-BRDR-06 | Explicit operator approval |
| PROM-BRDR-04 — DEV sees the same authority and QA reviews against it | required | CAP-BRDR-04; AC-BRDR-07; AC-BRDR-08 | Explicit operator approval |
| PROM-BRDR-05 — sources are binding only when approved | required | CAP-BRDR-03; CAP-BRDR-04; AC-BRDR-05 | Explicit operator constraint |

## Current System Fit

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-BRDR-01 | `src/lib/briefing-refiner/review-html.js` renders sections and findings with status dropdowns; `tests/briefing-refiner.test.js` verifies findings and filters | replace | Make guided decisions and visible choices the default while retaining all findings |
| CAP-BRDR-02 | `review-html.js` exposes every section as plain-text `contenteditable`; Markdown structure is not rendered | extend | Add rendered reading mode and explicit editing without changing canonical text round-trip |
| CAP-BRDR-03 | `feedback-schema.js` supports schema 1.0/1.1, findings and a legacy decisions array; `apply-feedback.js` validates hash and confirmation | extend | Add structured alternatives/selections/evidence and explicit approval rules with legacy compatibility |
| CAP-BRDR-04 | The five canonical agent prompts already read approved briefing/refinement and source coverage, but do not distinguish accepted option evidence from nonbinding review content | extend | Add one shared authority contract to workspace/template prompts and require trace into PRD, plan, implementation and QA evidence |
| CAP-BRDR-05 | `review-html.js` is self-contained and includes localStorage, File System Access, download and copy fallbacks; current tests assert these properties | extend | Preserve the fallbacks while adding responsive, accessible visible controls and focused-browser verification |

## MVP scope

- Default guided view with review purpose, pending/blocking counts and decision progress.
- One decision card per material finding.
- Native single-choice cards for mutually exclusive alternatives and multiple-choice cards only for independent options.
- Recommendation badge, impact/trade-off copy, selected state, rationale/note and collapsible evidence.
- Visible compact actions for accept/request change/defer when a legacy finding has no structured alternatives.
- Secondary Document view with rendered Markdown and explicit plain-text edit mode.
- Final review summary listing selected, unresolved and blocking decisions before save/export.
- Backward-compatible structured feedback and confirmed-apply behavior.
- Stable approved-decision/source summary in the refinement report and exact applied feedback archive trace.
- Shared authority instructions for Product, Sheldon, Planner, DEV and QA in source and template copies.

## Out of scope

- Live chat or model calls inside `review.html`.
- Open Design/Claude Design runtime, daemon, marketplace, cloud assets or external dependencies.
- Collaborative multi-user comments.
- Generalizing Decision Room to Sheldon/QA `review-intelligence` reports in this feature.
- Mandatory illustrations or thumbnails for nonvisual choices.
- Changes to the separate AIOSON Cockpit repository.

## User flows

### Guided decision

1. Briefing Refiner generates the existing local artifact family.
2. The review opens on a summary and the first pending decision.
3. The operator compares two to four legitimate alternatives, reveals evidence when needed, selects the valid option and adds rationale when useful.
4. Progress and blocking state update immediately and autosave locally.
5. The operator reviews the final decision summary, then saves, downloads or copies the JSON.

### Document refinement

1. The operator switches to Document.
2. Sections render with headings, lists, tables and inline emphasis for reading.
3. Explicit Edit mode exposes the existing plain-text canonical value.
4. Section status and notes remain available without obscuring the default reading experience.

### Approved authority propagation

1. Briefing Refiner validates the feedback and shows a dry-run.
2. After explicit confirmation, the applied report records the round, source/applied hashes, accepted selections and cited evidence.
3. Product maps only approved selections into Source Coverage, CAPs and ACs.
4. Sheldon independently verifies that mapping and rejects pending/rejected/deferred material as authority.
5. Planner traces approved decisions into phases and verification; DEV implements from that chain; QA independently verifies it.

### Failure and empty states

- No material findings: explain that no guided decisions are pending and offer Document review.
- Required choice missing or malformed: keep the item pending/blocking and prevent it from appearing as approved authority.
- Stale feedback: retain the existing fail-closed regeneration path.
- Direct save unavailable/denied: retain download and copy fallbacks.
- localStorage unavailable: the review remains usable and exportable.

## Success metrics

- Every material finding is reachable from the guided queue and represented in the final summary.
- No hidden dropdown is the only way to understand or choose a material decision.
- Every approved structured choice is traceable from applied feedback/report into PRD and downstream verification.
- No pending, rejected or deferred choice is treated as approved authority.
- Existing legacy feedback fixtures and save/export fallbacks continue to work.

## Prototype contract

- status: none
- feature: briefing-review-decision-room
- prototype: none
- manifest: none
- excluded historical references: none
- implementation baseline: current generated `review.html` plus the approved Decision Room interaction contract and repository behavior cited above

## Visual identity

- Neutral professional workspace with strong information hierarchy, restrained accent color and clear severity states.
- Decision content receives the widest column; technical file/hash/export details move into secondary disclosure.
- Cards use visible selection indicators, recommendation and impact labels; color is never the sole state signal.
- Desktop supports a focused two-pane workspace; narrow viewports collapse to one column without horizontal scrolling.
- Native semantic inputs, visible focus, descriptive labels and keyboard operation are required.

## Open questions

None blocking. Decision-specific diagrams are allowed only when they materially improve comparison and remain self-contained.

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-BRDR-01 | CAP-BRDR-01 | Opening a generated review with findings shows a guided decision queue, pending/blocking progress and one focused decision at a time before the full document | focused generator test + real headless-browser smoke |
| AC-BRDR-02 | CAP-BRDR-01 | Structured mutually exclusive options render as native single-choice cards; independent options render as multiple-choice cards; legacy findings expose visible accept/change/defer actions without a status dropdown as the only control | schema/UI tests + keyboard smoke |
| AC-BRDR-03 | CAP-BRDR-02 | Document mode renders supported Markdown for reading and an explicit edit action returns to the same plain-text canonical section value | round-trip test + browser interaction smoke |
| AC-BRDR-04 | CAP-BRDR-02 | Section edits, notes, blocking states, local draft restore and save/download/copy paths retain their existing observable behavior | existing regression suite + focused browser smoke |
| AC-BRDR-05 | CAP-BRDR-03 | Schema 1.2 structured decision fields validate and round-trip; schema 1.0/1.1 inputs remain accepted; invalid option IDs/cardinality, an accepted legacy finding without a recommendation, stale hash or malformed decision cannot be reported as approved | feedback-schema and apply-feedback tests |
| AC-BRDR-06 | CAP-BRDR-03 | Confirmed application records only valid accepted selections or valid legacy accepted recommendations, rationale, evidence references, exact applied feedback archive, round and hashes in the stable refinement report; recommended-only and all other states are explicitly nonbinding | apply/report integration test |
| AC-BRDR-07 | CAP-BRDR-04 | Product and Sheldon workspace/template instructions require validation of approved review authority and trace accepted selections into PRD Source Coverage/CAP/AC while excluding nonapproved material | agent-contract tests |
| AC-BRDR-08 | CAP-BRDR-04 | Planner, DEV and QA workspace/template instructions consume the same approved authority; the plan traces it, DEV implements it and QA fails missing or contradicted approved decisions/sources | agent-contract tests + plan/QA contract assertions |
| AC-BRDR-09 | CAP-BRDR-05 | Generated HTML remains self-contained, responsive, localized and operable with keyboard-visible native controls without external resources | static assertions + 1440px/900px browser smoke |
| AC-BRDR-10 | CAP-BRDR-05 | Direct-save cancellation, denied/sandboxed save, unavailable localStorage and download/copy fallback do not erase structured selections | existing fallback tests + focused additions |
