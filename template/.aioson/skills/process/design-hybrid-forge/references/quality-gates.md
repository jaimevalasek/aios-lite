# Quality Gates — design-hybrid-forge

Load when validating a hybrid before shipping (Phase 6).

Run all gates in order. A hybrid that fails any gate is not done — return to the phase indicated.

---

## Gate A — Identity clarity

**Question:** Can you describe this hybrid in one sentence without naming its parents?

Pass: The sentence names a specific vibe, specific user, specific use case.
> "A dark glass command center where operational precision lives inside an aurora gradient — for teams running security operations or AI platforms."

Fail: The sentence is vague, generic, or only makes sense by referencing the parents.
> "It combines dark dashboard style with glass effects."

**If fail:** Return to Phase 2 (crossover spec) — the identity is not clear enough.

---

## Gate B — The third thing test

**Question:** Name 3 elements in the hybrid that exist in NEITHER parent.

Pass: You can name 3 specific CSS values, interaction patterns, or composition rules that are genuinely new.

Fail: Every element in the hybrid can be traced back to parent A or parent B — the hybrid is a mashup, not a synthesis.

**If fail:** Return to Phase 3 — identify at minimum 3 new elements before writing files.

---

## Gate C — Accent fusion test

**Question:** Is the accent gradient a genuine fusion, or is it just parent A's color + parent B's color next to each other?

Run this test: Cover the gradient label. Show only the gradient swatch to someone who knows both parents. Would they say "oh, that's just A and B stacked"?

Pass: The gradient produces a new color perception. The transition between the two endpoints creates a third color that is the hybrid's identity.

Fail: The gradient is jarring or reads as "two separate accents." No new color emerges.

**If fail:** Adjust the gradient angle, midpoint color, or one endpoint. The goal is a gradient that reads as one accent, not two.

---

## Gate D — Substrate visibility test

**Question:** Is the substrate visible through the glass/surface panels?

Test procedure:
1. Open the dashboard preview.
2. Look at the glass stat cards. Can you see the background gradient through them?
3. Look at the sidebar. Can you see the gradient?

Pass: The aurora/gradient is clearly visible through at least 60% of glass surfaces. The interface "lives inside" the background.

Fail: The glass panels are too opaque — the background looks like a solid dark or light color behind the panels, not a visible gradient.

**If fail:** Reduce glass surface opacity. For dark glass: stay at or below `rgba(r,g,b,0.75)`. For white glass: stay at or below `rgba(255,255,255,0.70)`. Do not "solidify" the panels.

---

## Gate E — Structure legibility test

**Question:** Does the command/layout structure read clearly, or does the aesthetic overwhelm the hierarchy?

Test procedure:
1. Open the dashboard preview.
2. Blur your eyes. Can you still see: top bar / sidebar / content area / section headers?
3. Without reading text, can you identify which element is the stat number vs body copy vs section label?

Pass: The layout structure is clear at a glance, even through the glass/aesthetic treatment.

Fail: The blur/gradient/texture treatment makes sections bleed into each other. Hierarchy is lost.

**If fail:** Increase contrast between structure-defining elements (top bar, sidebar, section headers) and content areas. The glass treatment must respect structure, not obscure it.

---

## Gate F — Sameness test

**Question:** Could this hybrid be mistaken for a default AI dashboard, a Tailwind UI starter, or a generic dark theme?

Test procedure:
1. Remove all brand names from the preview.
2. Show it alongside 3 other dark UI screenshots.
3. Does it have at least one immediately distinctive visual element?

Pass: There is one element that could not exist in a generic dashboard — something that is clearly the result of this specific hybrid pairing.

Fail: The design looks like "dark + blur" with no further identity.

**If fail:** Identify the signature move and amplify it. Make it appear in at least 5 places. The signature should be the first thing you notice.

---

## Gate G — Parent distinction test

**Question:** Is the hybrid visually distinct from BOTH parents?

Test procedure:
1. Open the dashboard preview alongside `cognitive-core-ui.html` and `glassmorphism-ui.html` (or the two actual parents).
2. Does the hybrid look like parent A? If yes — the aesthetic from parent B was not applied strongly enough.
3. Does the hybrid look like parent B? If yes — the structure from parent A was not applied strongly enough.

Pass: Looking at all three side by side, the hybrid is clearly different from both parents while sharing DNA with each.

Fail: The hybrid looks like a minor variant of one parent.

**If fail:** Identify which parent is dominant and push the contribution from the other parent harder. Usually this means making the new elements (Gate B) more prominent.

---

## Gate H — Preview completeness

**Question:** Do both HTML previews satisfy all requirements from `output-contract.md`?

Checklist (dashboard preview):
- [ ] Substrate background visible through glass panels
- [ ] Command strip or equivalent live indicator (if structure parent warrants it)
- [ ] Top bar + sidebar + stat row + chart + feed/alert + data table
- [ ] Hybrid accent gradient on ≥3 visible elements
- [ ] `::before` reflection on glass cards
- [ ] AIOSON badge with hybrid accent

Checklist (landing preview):
- [ ] Full-page substrate background
- [ ] Glass navigation bar
- [ ] Hero section (not a generic centered CTA)
- [ ] Atmospheric element (orb, gradient blob)
- [ ] Proof rail + feature grid + pricing (3 tiers, featured card distinct)
- [ ] Footer with glass treatment
- [ ] AIOSON badge

Pass: All items checked.
Fail: Return to Phase 5 and complete the missing elements.

---

## Gate I — Metadata integrity

**Question:** Does `.skill-meta.json` accurately describe the hybrid?

Checklist:
- [ ] `source` is `generated`
- [ ] `generation_mode` is `project-local`
- [ ] `parents.primary` contains exactly 2 skills
- [ ] `parents.modifiers` contains at most 2 skills by default, or at most 3 only when advanced mode was explicitly enabled
- [ ] `author.name` is filled when the user provided it
- [ ] `generator.skill` is `design-hybrid-forge`
- [ ] `generator.model` is recorded when the runtime exposed it
- [ ] `variation_profile.modifier_policy` matches the generation mode when a preset was used

Pass: The metadata is present and matches the generated skill.
Fail: Return to Phase 4 and fix the metadata before distribution.

---

## Final ship checklist — project-local mode

Before marking the project-local hybrid as done:

- [ ] All 8 skill files written (SKILL.md + 7 references)
- [ ] `.skill-meta.json` written
- [ ] Both HTML previews written inside `previews/`
- [ ] Variation overlay reflected in previews and metadata when one was selected
- [ ] Active preset removed or archived from `.aioson/context/design-variation-preset.md` after successful generation
- [ ] History snapshot preserved in `.aioson/context/history/design-variation-presets/`
- [ ] `AGENTS.md` updated when it exists
- [ ] Tool-native mirrors updated if the directories exist
- [ ] All quality gates A through I passed

When all are checked: the project-local hybrid is shipped.

## Final ship checklist — core-promotion mode

Only for explicit promotion back to AIOSON core:

- [ ] Project-local checklist already passed
- [ ] `.aioson/skills/design/{slug}/` prepared in the core repo
- [ ] `docs/design-previews/index.html` updated with `✦ Hybrid` badge
- [ ] `naming-registry.md` updated with the new hybrid entry
- [ ] `pair-compatibility.md` updated (add pair to completed list)

When all are checked: the hybrid is ready for PR / marketplace curation.
