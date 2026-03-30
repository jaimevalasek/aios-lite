# Crossover Protocol — design-hybrid-forge

Load when running Phase 2 (Identity Synthesis) and Phase 3 (Crossover Spec).

This is the methodological core of the forge. Follow it in order. Do not skip to generation.

---

## Phase 2 — Identity Synthesis

Before writing a single file, answer all six questions. If you cannot answer them, you are not ready to generate.

### 2.1 Name the creative tension

Write one sentence naming what the two skills pull against each other.

Example:
> "cognitive-core-ui pulls toward dense operational precision and solid surfaces; glassmorphism-ui pulls toward fluid depth through transparency. The hybrid resolves this by making the command structure live inside a glass aurora — precision without opacity."

If the sentence feels like a compromise ("both are dark and professional"), the pair is too similar. Pick a different pair or articulate a sharper tension.

### 2.2 Decide the substrate winner

The background system of the hybrid belongs to exactly ONE parent. Never split this 50/50.

Ask: which parent's background model is more distinctive and harder to achieve without the other?
- If parent A uses a gradient substrate (glassmorphism, premium-command) and parent B uses solid backgrounds → gradient substrate wins.
- If both use solid backgrounds → the one with the stronger depth model wins.
- If both use gradient substrates → this pair may be too similar (check anti-pairs).

Document the substrate winner and the exact CSS value.

### 2.3 Decide the structure winner

The layout architecture and information density rules belong to exactly ONE parent.

Ask: which parent has a more opinionated information structure?
- mono rails → cognitive-core wins
- editorial sections → bold-editorial wins
- raw grid → neo-brutalist wins
- balanced/neutral → the other parent's structure can fill in

Document the structure winner and what it contributes concretely (layout, rhythm, navigation pattern, density scale).

### 2.4 Design the accent fusion

The hybrid's accent must be genuinely new. Rules:
- NOT parent A's accent color
- NOT parent B's accent color
- Usually a gradient pair where each endpoint references one parent
- Sometimes a completely new color at the midpoint between the two parent accents
- The gradient pair is the hybrid's strongest visual signature

Document the primary accent, secondary accent, gradient, and at least one glow/shadow value derived from it.

**Method — midpoint derivation:**
1. Get parent A's accent in HSL
2. Get parent B's accent in HSL
3. The hybrid's primary can be the H/S/L midpoint, or a deliberate shift toward the more distinctive one
4. The gradient goes from primary → secondary (A-derived → B-derived)

**Example (cognitive-core × glassmorphism):**
- cognitive-core accent: `#22D3EE` (teal, H=190)
- glassmorphism accent: `#7C3AED` (violet, H=263)
- midpoint H ≈ 226 (blue) — but this is bland
- chosen: shift toward teal → `#00C8E8` (electric teal) + keep violet as gradient endpoint
- result: `linear-gradient(135deg, #00C8E8, #7C3AED)` — teal-electric × violet

### 2.5 Name the hybrid

Requirements:
- 2–3 word compound noun or adjective + noun
- Must NOT be a concatenation of parent names (not "glass-core" or "warm-brutalist")
- Must evoke the resolved tension — what the interface *feels like*, not what it's made of
- Should be memorable and suggest a specific vibe

**Naming patterns:**
| Pattern | Example |
|---|---|
| Material + Role | `aurora-command`, `crystal-forge`, `void-craft` |
| Texture + Purpose | `warm-terminal`, `raw-glass`, `cold-editorial` |
| Atmosphere + Function | `dusk-ops`, `ember-dashboard`, `frost-bureau` |
| Poetic compound | `eclipse-ui`, `obsidian-core`, `solar-canvas` |

After naming: confirm it is not in `naming-registry.md`. If taken, iterate.

### 2.6 Write the three pillars

Every AIOSON design skill defines its identity through three pillars. Write them for the hybrid now, before generating any file.

Each pillar is a short paragraph (3–5 sentences) describing one non-negotiable visual principle. The three must be distinct and together tell the full story of the hybrid.

Structure:
```
1. [Substrate + surface model] — how depth is created
2. [Structure + rhythm model] — how information is organized
3. [Accent + signature model] — what the eye remembers
```

If you can't write three distinct, non-overlapping pillars, the hybrid doesn't have a clear enough identity. Revise the crossover spec before generating.

---

## Phase 3 — Crossover Spec

A crossover spec is a table mapping every design dimension to its source.

### 3.1 Dimension map

Fill in this table for the chosen pair:

| Dimension | Source | Value / Rule |
|---|---|---|
| Background model | A or B | e.g. "gradient substrate from glassmorphism" |
| Surface treatment | A or B or NEW | e.g. "dark-tinted glass from hybrid" |
| Layout system | A or B | e.g. "command shell from cognitive-core" |
| Navigation pattern | A or B | e.g. "topbar + sidebar from cognitive-core" |
| Typography | A or B or NEW | e.g. "Inter + JetBrains Mono from cognitive-core" |
| Heading scale | A or B | e.g. "bold headings from cognitive-core" |
| Accent primary | NEW | e.g. "#00C8E8 teal-electric" |
| Accent secondary | NEW | e.g. "#7C3AED violet" |
| Accent gradient | NEW | e.g. "linear-gradient(135deg, #00C8E8, #7C3AED)" |
| Depth model | A, B, or NEW | e.g. "blur-based layers from glassmorphism" |
| Border style | A or B or NEW | e.g. "luminous rgba white from glassmorphism" |
| Shadow style | NEW | e.g. "teal-electric tinted shadows" |
| Density default | A or B | e.g. "compact from cognitive-core" |
| Border radius | A or B | e.g. "generous (16px+) from glassmorphism" |
| Mono labels | A or B or none | e.g. "section rails only from cognitive-core" |
| New signature | NEW | e.g. "dark glass panels revealing aurora gradient" |

### 3.2 New elements (things neither parent has)

List at least 3 elements that are genuinely new — not in parent A, not in parent B.

These are the hybrid's creative contribution:
- A new surface type, a new interaction pattern, a new composition rule
- Something that only makes sense because BOTH parents are in the mix

Example from aurora-command-ui:
1. **Dark-tinted glass** — glassmorphism's glass is white-transparent; cognitive-core's surfaces are solid dark. The hybrid invents dark-tinted glass (`rgba(10,14,26,0.65)`) that is neither.
2. **Gradient stat numbers** — cognitive-core has plain white stat numbers; glassmorphism puts gradients on hero text. The hybrid puts the teal→violet gradient on operational stat numbers specifically.
3. **Aurora glow shadows** — cognitive-core uses black shadows; glassmorphism uses violet-tinted shadows. The hybrid uses teal-electric shadows, which only makes sense because the teal accent is "operational signal" (from cognitive-core) applied to a glass system (from glassmorphism).

### 3.3 Conflict resolution

When both parents claim the same dimension, use this priority order:
1. **Substrate parent wins background** — no exceptions
2. **Structure parent wins layout and density** — no exceptions
3. **For everything else**: whichever parent has the more distinctive/unusual approach wins. The blend wins only if it creates a new element that didn't exist before.

### 3.4 Anti-blend rules

Never do these:
- Average the two accent colors and use the average → the hybrid looks washed out
- Use both parent layout systems simultaneously → the interface looks confused
- Apply parent A's texture at 50% and parent B's texture at 50% → neither reads clearly
- Keep both parent backgrounds in different sections → the substrate must be unified

---

## Crossover spec output format

After completing phases 2 and 3, produce this summary before writing any file:

```
HYBRID: {name}
PARENTS: {skill_a} × {skill_b}
TENSION: {one sentence}

SUBSTRATE: {parent} — {substrate value}
STRUCTURE: {parent} — {what it contributes}
ACCENT: primary={value}, secondary={value}, gradient={value}

PILLARS:
1. {pillar title}: {3–5 sentences}
2. {pillar title}: {3–5 sentences}
3. {pillar title}: {3–5 sentences}

DIMENSION MAP: (filled table)

NEW ELEMENTS:
- {element 1}
- {element 2}
- {element 3}
```

This summary is NOT a file. It lives in the conversation and guides file generation.
Once the user confirms: proceed to Phase 4 (file generation).
