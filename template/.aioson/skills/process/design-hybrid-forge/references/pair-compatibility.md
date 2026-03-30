# Pair Compatibility — design-hybrid-forge

Load when choosing which two base skills to combine this week.

---

## The tension principle

The best hybrid pairs have **creative tension** — they pull in different directions, and the hybrid resolves the tension into something neither parent could be alone.

Two skills that are too similar produce a redundant hybrid. Two skills that are completely incompatible (same aesthetic, same structure, same depth model) produce noise, not synthesis.

**Rule:** choose pairs where one skill is structure-dominant and the other is aesthetic-dominant, OR where they share a dimension but differ radically in another.

---

## Skill taxonomy

Each base skill has a primary role:

| Skill | Role | Structure model | Aesthetic model | Default theme |
|---|---|---|---|---|
| `cognitive-core-ui` | Structure | Command center, dense, mono rails | Solid dark surfaces, teal accent | Dark |
| `clean-saas-ui` | Structure | Systematic B2B, medium density | Neutral solid surfaces, blue accent | Light |
| `neo-brutalist-ui` | Structure | Raw grid, brutal honesty | Hard borders, yellow accent, zero blur | Light |
| `bold-editorial-ui` | Structure + Aesthetic | Editorial rhythm, section contrast | Dark cinematic, red-orange accent | Dark |
| `glassmorphism-ui` | Aesthetic | Glass layers, gradient substrate | Transparent surfaces, violet-blue | Light |
| `warm-craft-ui` | Aesthetic | Breathable, serif-driven | Warm solid surfaces, terracotta | Light |
| `premium-command-center-ui` | Structure + Aesthetic | Tri-rail, operational | Aurora-glass, graphite | Dark |
| `interface-design` | Neutral | Flexible | Flexible | Adaptive |

---

## Compatibility matrix

`✦` = High tension, strong hybrid potential
`◈` = Medium tension, viable
`○` = Low tension, too similar or too incompatible
`✕` = Avoid, redundant (same family)

| | cognitive-core | clean-saas | neo-brutalist | bold-editorial | glassmorphism | warm-craft | premium-command | interface-design |
|---|---|---|---|---|---|---|---|---|
| **cognitive-core** | — | ◈ | ✦ | ✦ | ✦ | ✦ | ✕ | ◈ |
| **clean-saas** | ◈ | — | ✦ | ◈ | ✦ | ✦ | ◈ | ○ |
| **neo-brutalist** | ✦ | ✦ | — | ✦ | ✦ | ✦ | ◈ | ◈ |
| **bold-editorial** | ✦ | ◈ | ✦ | — | ✦ | ◈ | ◈ | ◈ |
| **glassmorphism** | ✦ | ✦ | ✦ | ✦ | — | ✦ | ✕ | ◈ |
| **warm-craft** | ✦ | ✦ | ✦ | ◈ | ✦ | — | ◈ | ◈ |
| **premium-command** | ✕ | ◈ | ◈ | ◈ | ✕ | ◈ | — | ○ |
| **interface-design** | ◈ | ○ | ◈ | ◈ | ◈ | ◈ | ○ | — |

---

## Completed hybrids (do not repeat)

| Pair | Hybrid name | Shipped |
|---|---|---|
| cognitive-core-ui × glassmorphism-ui | `aurora-command-ui` | 2026-03-29 |

---

## Recommended next pairs (high tension, not yet done)

**Tier 1 — Maximum tension, clear identity:**

| Pair | Anticipated identity | Best for |
|---|---|---|
| `neo-brutalist-ui` × `glassmorphism-ui` | Raw structural grid over a frosted aurora — brutal honesty made luminous | Indie dev tools, open source dashboards |
| `warm-craft-ui` × `cognitive-core-ui` | Earthy command center — serifs + mono rails, terracotta + teal tension | AI agent platforms with human focus, productivity SaaS |
| `neo-brutalist-ui` × `cognitive-core-ui` | Cold data brutalism — raw borders, dense mono, no decoration, only signal | Infrastructure monitoring, CLI-adjacent tools |
| `bold-editorial-ui` × `glassmorphism-ui` | Dark glass editorial — cinematic depth through transparency, editorial scale | SaaS marketing, product launches, AI platforms |
| `warm-craft-ui` × `glassmorphism-ui` | Warm aurora — soft glass over warm gradients, terracotta glow, humanized depth | Wellness, productivity, note-taking, B2C SaaS |
| `clean-saas-ui` × `glassmorphism-ui` | Crystalline enterprise — minimal glass, disciplined structure, enterprise-grade glass | B2B SaaS with premium feel, enterprise admin |

**Tier 2 — Strong but more constrained:**

| Pair | Anticipated identity |
|---|---|
| `bold-editorial-ui` × `cognitive-core-ui` | Dark editorial command — large display type + mono rails, red-orange × teal tension |
| `neo-brutalist-ui` × `warm-craft-ui` | Crafted brutalism — raw structure + handmade warmth, artisan dev aesthetic |
| `clean-saas-ui` × `bold-editorial-ui` | Enterprise editorial — clean precision + cinematic moments, professional drama |

---

## Pair selection questions

Before committing to a pair, answer:

1. **Can you name the creative tension in one sentence?** If not, the pair may be too similar.
2. **Which skill wins the substrate?** One parent's background model must dominate — it cannot be 50/50.
3. **What is genuinely new?** Name one element that exists in neither parent and will only exist in the hybrid.
4. **Who uses this?** If the target user is identical to both parent skills, the hybrid is redundant.
5. **Does the name suggest a third thing?** The hybrid's name must not sound like "A + B" but like a new concept.

---

## Optional modifier lane

After the core pair is chosen, you may optionally add up to 2 modifier skills. A 3rd modifier is allowed only when the user explicitly enables advanced mode or the active variation preset carries `modifier_policy: "up_to_3_modifiers"`.

Modifier rules:
- Modifiers are optional. The hybrid must still stand on the 2 primary parents alone.
- Modifiers cannot own substrate, layout system, navigation model, or density baseline.
- Modifiers may influence only accent refinement, motion, website narrative patterns, or one small component family.
- If a modifier makes the identity harder to describe in one sentence, remove it.
- `interface-design` is allowed as a modifier, but is too neutral to be a primary parent.

---

## Anti-pairs

Avoid these regardless of aesthetic appeal:

- `cognitive-core-ui` × `premium-command-center-ui` — same domain, same depth model, redundant
- `glassmorphism-ui` × `premium-command-center-ui` — too similar (both glass + aurora)
- `interface-design` × any skill — interface-design is a neutral craft package, hybrids require distinct DNA poles
- Any skill with itself — obvious
