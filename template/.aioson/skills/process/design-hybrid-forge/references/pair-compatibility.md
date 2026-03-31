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

---

## Three.js Spatial — Modifier (not a primary parent)

`threejs-spatial` is a **special modifier category** — it is not a standalone design skill
and can never be a primary parent. It layers WebGL/Three.js spatial effects on top of any
design skill, adding a 3D scene or particle system as the visual substrate.

**How it works as a modifier:**
- Applied as a modifier (up to 3 modifiers allowed in advanced mode)
- Governs: background scene layer, particle systems, 3D object showcase, holographic effects
- Does NOT govern: tokens, typography, component structure, layout rhythm
- Accent colors from the primary parents MUST flow through the Three.js parameters
- The Three.js scene is always alpha: true — CSS gradient background shows through

**Three.js × Design Skill combinations:**

| Primary parent | Three.js layer | Result | Best for |
|---|---|---|---|
| `glassmorphism-ui` | Particle aurora backdrop | Frosted 3D glass — glass panels float over real particle scenes | AI tools, crypto, modern SaaS landing |
| `aurora-command-ui` | Holographic glass object | Holographic command center — glass panels reveal 3D object inside | SOC dashboards, security platforms |
| `neo-brutalist-ui` | Raw geometry + particles | Particle brutalism — hard geometric forms with particle swarms | Dev tools, indie platforms |
| `bold-editorial-ui` | Scroll-driven 3D parallax | Editorial 3D depth — typography and images move through a 3D scene | Premium marketing, product launches |
| `cognitive-core-ui` | Floating data cards (3D boxes) | Command 3D — dense data cards as 3D objects floating in space | Monitoring dashboards, metrics platforms |
| `warm-craft-ui` | Organic particle drift | Warm particle field — particles drift like embers or dust motes | Wellness, creative tools, B2C |

**Anti-blend rules for Three.js modifier:**
- Three.js never replaces the CSS/HTML layout — it enhances the background/scene layer only
- No particle count above 8,000 on desktop, 2,000 on mobile
- WebGL support check + CSS fallback is mandatory
- Three.js is never the primary story — the product message comes first
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
