# Domain: CRM Operational

> Category: deliverable (software/mixed squads)
> Version: 1.0.0
> Updated: 2026-08-12

Squads that build professional CRM surfaces: pipeline, contact, and activity
tooling where operators live all day. This is a deliverable domain — the squad
ships working operational screens, not content into a folder.

## Domain signature

What separates a professional CRM from a generic admin template:

- **The pipeline is the product** — deal stages, ownership, and movement are
  the core loop; everything else supports the decision "what moves today".
- **Entities with real relationships** — lead, contact, company, deal,
  activity; every screen answers which entity it serves and what changes it.
- **Operator-speed interactions** — recurring transitions are direct
  manipulation; confirmation guards the destructive and the irreversible.
- **Data density with hierarchy** — tables and boards carry many records
  without becoming walls; one focal decision per screen.

## Binding interaction contracts

These project rules are delivery criteria, not suggestions, for any CRM
surface (see `.aioson/rules/` and the design/visual-quality brain):

- structured fields ship with masks and validation that reject what the
  contract rejects (`form-fields-masks-and-validation.md`);
- status changes confirm with a design-system modal and a real cancel path
  (`status-change-confirmation.md`);
- drag-and-drop stage movement persists past a reload — DOM-only movement is a
  defect (`status-flow-drag-and-drop.md`);
- the home is widget-led, 3–6 prioritized widgets reflecting live data
  (`management-home-widgets.md`).

## Executor implications

- a **domain modeler** (entities, stages, permissions — the schema authority)
- an **operational UI builder** (board, tables, forms, states)
- a **workflow owner** (automation, follow-ups, notifications)
- an independent **quality reviewer** (contracts above + data integrity)

## Quality bar

- Every promised interaction proven on the real surface: drag persists, masks
  reject, confirms cancel cleanly, widgets reflect data changes.
- Loading, empty, error, and success states designed for every operational
  screen.
- Passes the replaceability test: the domain's vocabulary and stage names are
  in the UI, not "Item 1 / Item 2".

## Anti-patterns

- Card-wall dashboard of equal-weight tiles with seed numbers.
- Click-only kanban, or drag that mutates the DOM and loses on reload.
- Unmasked phone/document/currency fields in a professional tool.
- A dozen half-screens instead of one finished operational vertical.

## Pilot flagship

One working pipeline board screen with persistent drag-and-drop between stages,
one masked and validated entity form, one confirmed status transition with a
cancel path, and a widget-led summary strip fed by the board's data (local
persistence is enough; integration is out of pilot scope). Entrypoint:
`output/{slug}/pilot/index.html`.

## Reuse before inventing

The `interface-design` engine (`.aioson/skills/design/interface-design/`) with
the project's `identity.md` — or a project-forged skill `design_skill` names —
carries the visual system; the squad parameterizes it rather than inventing one.
