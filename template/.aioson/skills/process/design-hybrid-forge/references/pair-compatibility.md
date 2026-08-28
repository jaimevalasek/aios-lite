# Pair Compatibility — design-hybrid-forge

Load when choosing which two parents to combine.

---

## The tension principle

The best hybrid pairs have **creative tension** — they pull in different directions, and the hybrid resolves the tension into something neither parent could be alone.

Two parents that are too similar produce a redundant hybrid. Two parents that are completely incompatible (same aesthetic, same structure, same depth model) produce noise, not synthesis.

**Rule:** choose pairs where one parent is structure-dominant and the other is aesthetic-dominant, OR where they share a dimension but differ radically in another.

---

## Where parents come from

The framework ships no fixed preset catalog. A parent is one of:

- a **project-forged skill** — a site-forge extraction or an earlier hybrid under `.aioson/installed-skills/{name}/` or `.aioson/skills/design/{name}/`, listed by `aioson skill:list . --json`;
- an **external DESIGN.md source**, normalized through `references/external-source-ingestion.md`;
- nothing — then the user wants **from-scratch mode**, not a hybrid.

The `interface-design` engine is never a parent or a modifier: it is a neutral craft package with no DNA pole, and hybrids require distinct poles.

---

## Classify each parent first

Before pairing, write one row per candidate. The columns are the questions; the answers come from the candidate's own `SKILL.md` and `references/design-tokens.md`, never assumed.

| Column | Question | Typical answers |
|---|---|---|
| Role | What does it contribute most strongly? | Structure / Aesthetic / Structure + Aesthetic |
| Structure model | How does it organize a screen? | dense command rails, systematic B2B grid, raw brutal grid, editorial rhythm, breathable serif-led, tri-rail operational |
| Aesthetic model | What are its surfaces and accent? | solid dark + one signal accent, neutral light + blue, hard borders + zero blur, dark cinematic + warm accent, glass layers + gradient substrate, warm solid + earthy accent |
| Default theme | Dark, light, or adaptive? | Dark / Light / Adaptive |
| Family | Which candidates share its substrate AND structure? | list them — same-family pairs are excluded |

A candidate whose role is "neutral / flexible" on every column is not a parent (that is what the engine looks like).

---

## Compatibility rules

`✦` = High tension, strong hybrid potential
`◈` = Medium tension, viable
`○` = Low tension, too similar or too incompatible
`✕` = Avoid, redundant (same family)

| Pair shape | Verdict | Why |
|---|---|---|
| Structure-dominant × Aesthetic-dominant, different default theme | ✦ | Each parent owns one axis outright; the theme clash forces a real substrate decision |
| Structure-dominant × Aesthetic-dominant, same default theme | ✦ / ◈ | Clean ownership; tension must come from material (solid vs glass, hard vs soft) |
| Two Structure-dominant parents with different density baselines | ◈ | Viable when one clearly surrenders layout; otherwise the interface looks confused |
| Two Aesthetic-dominant parents | ◈ | Only when one brings a rhythm the other lacks; the substrate winner must be explicit |
| Structure + Aesthetic × anything sharing its substrate | ○ | The heavier parent swallows the other |
| Same family (shared substrate and structure) | ✕ | Redundant — nothing new can exist |
| Engine × anything | ✕ | No DNA pole to fuse |

---

## Archetype pairs (high tension)

Shapes to look for among the available parents — never names to install:

| Pair shape | Anticipated identity | Best for |
|---|---|---|
| Raw brutal grid × glass-layer aesthetic | Raw structural grid over a frosted aurora — brutal honesty made luminous | Indie dev tools, open-source dashboards |
| Warm serif-led aesthetic × dense command structure | Earthy command center — serifs + mono rails, warm accent against a signal accent | AI agent platforms with human focus, productivity SaaS |
| Raw brutal grid × dense command structure | Cold data brutalism — raw borders, dense mono, no decoration, only signal | Infrastructure monitoring, CLI-adjacent tools |
| Editorial rhythm × glass-layer aesthetic | Dark glass editorial — cinematic depth through transparency, editorial scale | SaaS marketing, product launches, AI platforms |
| Warm solid aesthetic × glass-layer aesthetic | Warm aurora — soft glass over warm gradients, humanized depth | Wellness, productivity, note-taking, B2C SaaS |
| Systematic B2B grid × glass-layer aesthetic | Crystalline enterprise — minimal glass, disciplined structure | B2B SaaS with premium feel, enterprise admin |
| Editorial rhythm × dense command structure | Dark editorial command — large display type + mono rails | Data journalism, analyst tools |
| Raw brutal grid × warm serif-led aesthetic | Crafted brutalism — raw structure + handmade warmth | Artisan dev aesthetic, indie products |
| Systematic B2B grid × editorial rhythm | Enterprise editorial — clean precision + cinematic moments | Corporate storytelling, report surfaces |

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

**Three.js × parent-shape combinations:**

| Primary parent shape | Three.js layer | Result | Best for |
|---|---|---|---|
| Glass-layer aesthetic | Particle aurora backdrop | Frosted 3D glass — glass panels float over real particle scenes | AI tools, crypto, modern SaaS landing |
| Dark command structure with glass | Holographic glass object | Holographic command center — glass panels reveal a 3D object inside | SOC dashboards, security platforms |
| Raw brutal grid | Raw geometry + particles | Particle brutalism — hard geometric forms with particle swarms | Dev tools, indie platforms |
| Editorial rhythm | Scroll-driven 3D parallax | Editorial 3D depth — typography and images move through a 3D scene | Premium marketing, product launches |
| Dense command structure | Floating data cards (3D boxes) | Command 3D — dense data cards as 3D objects floating in space | Monitoring dashboards, metrics platforms |
| Warm solid aesthetic | Organic particle drift | Warm particle field — particles drift like embers or dust motes | Wellness, creative tools, B2C |

**Anti-blend rules for Three.js modifier:**
- Three.js never replaces the CSS/HTML layout — it enhances the background/scene layer only
- No particle count above 8,000 on desktop, 2,000 on mobile
- WebGL support check + CSS fallback is mandatory
- Three.js is never the primary story — the product message comes first

---

## Pair selection questions

Before committing to a pair, answer:

1. **Can you name the creative tension in one sentence?** If not, the pair may be too similar.
2. **Which parent wins the substrate?** One parent's background model must dominate — it cannot be 50/50.
3. **What is genuinely new?** Name one element that exists in neither parent and will only exist in the hybrid.
4. **Who uses this?** If the target user is identical to both parents, the hybrid is redundant.
5. **Does the name suggest a third thing?** The hybrid's name must not sound like "A + B" but like a new concept.

---

## Optional modifier lane

After the core pair is chosen, you may optionally add up to 2 modifier skills. A 3rd modifier is allowed only when the user explicitly enables advanced mode or the active variation preset carries `modifier_policy: "up_to_3_modifiers"`.

Modifier rules:
- Modifiers are optional. The hybrid must still stand on the 2 primary parents alone.
- Modifiers cannot own substrate, layout system, navigation model, or density baseline.
- Modifiers may influence only accent refinement, motion, website narrative patterns, or one small component family.
- If a modifier makes the identity harder to describe in one sentence, remove it.
- The `interface-design` engine is never a modifier: it carries no accent, motion, or pattern DNA to lend.

---

## Anti-pairs

Avoid these regardless of aesthetic appeal:

- Two parents from the same family (shared substrate and structure) — redundant
- Two glass-substrate parents — too similar (both glass + aurora)
- The `interface-design` engine × anything — a neutral craft package, and hybrids require distinct DNA poles
- Any parent with itself — obvious
