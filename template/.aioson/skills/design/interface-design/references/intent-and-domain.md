# Intent and Domain — Interface Design

> Read this before touching layout, tokens, or components.
> Generic is the enemy. Every spacing value, typeface choice, and depth strategy is a decision. Own every one of them.

---

## The mandate

If another AI, given the same prompt, would produce substantially the same output — you have failed.
Defaults disguise themselves as infrastructure. Craft means owning every decision.

---

## Design memory and continuity

There is exactly one persisted visual source of truth: the identity record. Resolve it as the PRD's `identity` binding, else the active `.aioson/explorations/{slug}/identity.md` (exploration work only), else the active `.aioson/briefings/{slug}/identity.md`, else `.aioson/context/identity.md`. Its frontmatter states `source: references` when distilled from the owner's references, or `source: intent` when it records a system already proven by an approved build. Never infer one source class from the other.

When it exists:
- Load its token sections and `## Component structure notes` before choosing a direction.
- **Apply** them rather than re-deriving a generic direction. It is an input you apply, not a separate design system.
- Respect it unless the user explicitly wants a redesign.
- Update it when you introduce a reusable pattern, token rule, or layout decision.

Never create a second design-memory file outside `.aioson/` — a legacy `.interface-design/system.md` is superseded by the identity record and must not be treated as a competing authority.

If no identity record exists, stay in origination mode; the absent record must not be created early and then cited as authority for its own decisions. Once a build has been inspected and approved, reusable project-wide decisions may be persisted to `.aioson/context/identity.md` with `scope: brand` and `source: intent`:
- Product context and UI intent
- Chosen design direction and anti-goals
- Token decisions (color, type, spacing, radius, depth, motion)
- Core component patterns (navigation, card, table, form, modal, empty state)
- Open constraints or decisions still pending

Until that approval, the feature manifest's Visual direction is the decision record. One product should not look like it was designed from scratch on every screen, but continuity cannot be manufactured by laundering an untested first guess into “identity”.

---

## If the UI already exists

When refining an existing product:
- Identify the current visual direction before proposing a new one.
- Diagnose token drift first: off-grid spacing, repeated hardcoded colors, mixed radii, mixed depth strategies, missing interactive states.
- Improve consistency before re-theming.
- Replace the direction only when the current system blocks the product intent or the user explicitly asked for a redesign.

---

## Phase 0 — Intent first (mandatory, cannot skip)

Before touching layout or tokens, answer three questions with specificity:

1. **Who is this human?** — Actual person, actual context.
   Bad: "a user." Good: "a finance manager reviewing budget reports at 8am before a board meeting."
2. **What must they accomplish?** — A specific verb, not a vague goal.
   Bad: "manage their projects." Good: "approve or reject 15 expense requests before end of day."
3. **What should this feel like?** — Concrete texture, not an adjective.
   Bad: "clean and modern." Good: "a Bloomberg terminal that doesn't exhaust you."

**If you cannot answer all three with specifics — stop. Ask. Do not guess. Do not default.**

---

## Phase 1 — Domain exploration (4 required outputs)

Before proposing any visual direction, produce:

1. **Domain concepts** — 5+ metaphors, patterns, or ideas from the product's world.
   Example (clinic scheduling): appointment slots, patient flow, triage priority, clinical notes, white coat.

2. **Color world** — 5+ colors that exist naturally in that domain.
   Example (clinic): antiseptic white, calm blue (trust, clinical), soft green (go/available), amber (warning/urgent), warm gray (neutral).

3. **Signature element** — One thing that could only belong to THIS product.
   Example: a subtle "pulse" animation on available time slots, echoing a heartbeat.

4. **Defaults to avoid** — 3 obvious, generic choices that must be replaced.
   Example: blue primary button → calm teal; card shadows → border-only depth; the default sans → a delivered grotesque with clinical precision (e.g., Schibsted Grotesk) — never another face from the training-saturated set the telemetry flags.

**The identity test:** Remove the product name. Could someone identify what this is for?
