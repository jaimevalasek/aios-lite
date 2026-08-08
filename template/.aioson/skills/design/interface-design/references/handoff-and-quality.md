# Handoff and Quality — Interface Design

The shared visual-quality criteria live in one place — the `design/visual-quality` brain — so they cannot drift between the skills and agents that apply them:

```bash
aioson brain:query . --tags=visual-quality --min-quality=4 --format=compact 2>/dev/null || true
```

The checks below are this skill's craft-level tests. Where they overlap a brain node, the node is the canonical statement: the swap test below is the same criterion as `vq-002` (replaceability). A project rule under `.aioson/rules/` outranks both — a client with its own design system is conforming to it, not defaulting.

---

## Quality checks (run before delivering)

### Swap test
Would swapping the typeface or layout make the design look like a different product?
If yes — good. If no — the design has no identity.

### Squint test
Blur your eyes (or the screenshot). Does the visual hierarchy still read clearly?
If not — the hierarchy is too weak.

### Signature test
Can you point to five specific decisions where your craft appears?
If you cannot name five — you defaulted somewhere.

### Token test
Do your CSS variable names sound like they belong to THIS product?
Generic: `--color-primary`. Specific: `--slot-available`, `--urgency-amber`.

### Asset test
Does the first viewport show a real product, place, person, object, UI state, generated bitmap, photo, or video when the surface is a website or landing page?
If not, the page is probably decoration plus copy, not a visual experience.

### Responsive fit test
Do all labels, buttons, counters, cards, tables, media, and headings fit at mobile and desktop widths without overlap, clipping, or layout shift?
If not, add explicit constraints: grid `minmax()`, `aspect-ratio`, fixed control heights, line wrapping, overflow rules, and stable media dimensions.

### Font delivery test
Are the named fonts actually loaded through the stack's supported mechanism?
If not, declare a credible fallback stack and preserve the intended contrast with weight, scale, and line-height instead of pretending the unavailable font exists.

### Motion test
Does motion communicate feedback, state, navigation, or reveal?
If not, remove it. If yes, include a `prefers-reduced-motion` fallback.

### Browser inspection test
If a runnable UI exists, inspect it in a browser at one mobile and one desktop viewport before delivery.
Screenshots beat imagination: fix blank renders, overflow, text collision, illegible contrast, missing assets, and awkward crop/framing before handoff.

---

## Self-critique before delivery

Walk through each section before handing off:

1. **Composition** — Does the layout have rhythm? Are proportions intentional? Is there one clear focal point?
2. **Craft** — Is every spacing value on-grid? Does typography use weight + line-height + size (not size alone)? Do surfaces carry hierarchy without thick borders or dramatic shadows?
3. **Content** — Does the spec tell one coherent story? Could a real person at a real company act on this?
4. **Structure** — Are there any hacks? Negative-margin workarounds? Arbitrary pixel values? Fix them.

**Ask yourself: "If a design lead reviewed this, what would they call out?" Fix that thing. Then ask again.**

---

## Closing the visual contract

This skill is normally loaded by the agent doing the implementation, not handed across an agent boundary. Resolve the same contract either way — as a written spec when another agent will build, or as the checklist you satisfy in code when you are building now:

- Explicit visual direction and anti-goals, inherited from the prototype manifest in conformance mode
- Design token block (fonts, colors, spacing, radius, depth strategy, motion posture)
- Per-screen layout notes with each region mapped to a **real component in this project's library** — reuse before adding; a new component needs a named reason
- Full state matrix (default / hover / focus / active / disabled / loading / empty / error / success)
- Responsive rules (mobile breakpoints, collapse behavior)
- Accessibility checklist items
- Any signature visual moves with implementation notes
- Anti-patterns to avoid

Produce a separate `ui-spec.md` only when a different agent will implement it. When you implement directly, the code and the design memory below are the record — do not manufacture a spec artifact nobody will read.

---

## Update design memory

Visual continuity has exactly one canonical home: the identity record. When the work introduces or changes reusable, project-wide design decisions, update `.aioson/context/identity.md` (scope `brand`) with the final direction and anti-goals, the token block, component pattern notes, and any new exception or constraint. Keep feature-specific decisions in that feature's `.aioson/briefings/{slug}/identity.md`.

Then re-verify the record:

```bash
aioson verify:artifact . --kind=identity --file=<path> --advisory 2>/dev/null || true
```

Never create a parallel design-memory file outside `.aioson/`. Two continuity layers drift, and the one the workflow binds is the one under `.aioson/`.

---

## Quality bar

1. The result must not look generic.
2. Repeated elements must share spacing, radius, and depth logic.
3. Typography hierarchy must be legible without decorative tricks.
4. The screen must communicate purpose before style.
5. The delivered UI must survive real viewport inspection: no overlap, clipped text, missing states, broken font loading, unsupported assets, or default-template composition.
