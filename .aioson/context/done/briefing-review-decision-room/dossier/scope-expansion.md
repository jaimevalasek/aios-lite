# Scope Expansion - Briefing Review Decision Room

## Inputs

- PRD/briefing source: operator-approved recommendation from the 2026-07-26 review of the generated `project-squad-runtime/review.html`
- Prior expansion artifacts: `researchs/open-design-briefing-refiner-2026/summary.md`
- User approval mode: recommended

## Scope Buckets

| Bucket | Items | Why | Approval needed |
|---|---|---|---|
| Core | Guided decision queue; visible alternatives; progress; approved decision/source authority; document fallback; existing autosave/export | Turns the review from a raw editor into a decision surface without losing the current contract | no |
| Recommended MVP | Rendered Markdown; explicit edit mode; single/multiple choice cards; evidence disclosure; responsive/accessibility states; final decision summary | Makes long briefings scannable and decisions trustworthy | no — explicitly approved |
| Optional V1 | Keyboard shortcuts; lightweight inline diagram supplied by a finding | Helpful only when it improves a real decision | yes |
| Delight | Animated transitions; theme variations | Does not close a product gap | yes |
| V2 / Later | Live agent chat, collaborative comments, point-and-comment regeneration, Open Design daemon integration | Changes runtime, security and collaboration boundaries | yes, future |
| Cut List | External UI dependencies; design-system marketplace; mandatory thumbnails for nonvisual decisions; treating pending suggestions as approved | Expands scope or weakens authority | no |

## Operational Surface Map

| Object | Parent / owner | Lifecycle states | Required actions | Management surface | Empty / error states | PRD destination |
|---|---|---|---|---|---|---|
| Review session | selected briefing / operator | generated, in-review, ready, blocked, applied, declined, stale | open, resume, inspect progress, save/export, discard local draft | `review.html` shell and summary | no decisions, stale source, local storage unavailable, direct save unavailable | CAP-BRDR-01, CAP-BRDR-02, CAP-BRDR-05 |
| Decision item | audit finding / operator | pending, selected, approved, rejected, deferred, blocked | inspect evidence, choose one/many, explain, revise choice | guided decision card | malformed options, missing required selection, blocking item unresolved | CAP-BRDR-01, CAP-BRDR-03 |
| Document section | briefing / operator | unchanged, edited, accepted, remove-requested, blocked | read rendered content, enter edit mode, edit text, add note, set state | Document tab / section panel | Markdown fallback, invalid edit, blocked section | CAP-BRDR-02 |
| Evidence reference | decision item / source artifact | available, unavailable, stale | reveal, copy/read reference, trace into approved decision | collapsible evidence panel | missing reference is visible and cannot silently become authority | CAP-BRDR-03, CAP-BRDR-04 |
| Approved review authority | confirmed apply / workflow | pending, applied, superseded | record accepted selections and sources, expose to downstream agents, preserve nonbinding states | refinement report plus applied feedback archive | hash/round mismatch, pending/rejected/deferred decision | CAP-BRDR-03, CAP-BRDR-04 |

## Core Capability Closure

- Complete: current self-contained HTML, section editing, findings, local autosave, direct-save/download/copy fallback, stale feedback validation.
- Missing / needs implementation: guided decision cards, rendered/read mode, structured alternatives, approved source trace, explicit downstream consumption.
- Explicitly deferred: live collaboration, external design runtime, generalization to every AIOSON review surface.

## Recommended Product Shape

- Include in PRD: all Core and Recommended MVP items.
- Keep as optional: only decision-specific diagrams and keyboard shortcuts.
- Explicitly defer: external runtime, marketplace, live agent regeneration, visual variants unrelated to the decision.

## Risks And Classification

- Scope risk: controlled by preserving one static HTML generator and one feedback artifact family.
- Delivery risk: compatibility across schema 1.0/1.1 and the new decision fields; approval semantics must fail closed.
- Classification impact: SMALL — one enriched review boundary plus cumulative authority use across the canonical agents.

## Cheap / Native Implementation Ideas

- Use native radio/checkbox inputs styled as full-card controls.
- Keep vanilla JavaScript, localStorage and File System Access fallbacks.
- Render the supported Markdown subset locally and keep plain-text edit mode as the canonical editable value.
- Extend existing findings and report structures instead of introducing a second workflow motor.
