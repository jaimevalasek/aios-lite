# Art Direction — Bold Editorial UI

Read this file for any page-level work where differentiation matters: landing pages, apps, dashboards, portfolios, and major marketing flows.

This file exists to stop Bold Editorial from collapsing into the same dark card layout with big white type every time.

The system stays coherent, but the expression must change with the product, the audience, and the dominant message.

---

## Core Rule

**Same drama, different character.**

Keep the Bold Editorial DNA:
- extreme typographic scale as the primary design tool
- cinematic dark/light contrast
- editorial rhythm and intentional grid-breaking
- mono captions as structural connective tissue

But do **not** keep the exact same composition, hero treatment, or typographic moment from project to project.

---

## Mandatory Pre-Build Outputs

Before designing a full page, produce all of these:

1. **Human**
   The real person arriving at this page right now — their mindset, context, what they just came from.

2. **Main action**
   The one impression, decision, or action that must land on this screen.

3. **Felt quality**
   Concrete visceral words: `cinematic`, `authoritative`, `electric`, `precise`, `confident`, `intense`, `premium`, `editorial`, `stark`, `magnetic`.
   Never use empty labels like `bold and modern` or `premium feel`.

4. **Domain vocabulary**
   At least 5 concepts from the product's world.
   Example for a developer tool: `pipeline`, `deploy`, `latency`, `incident`, `artifact`.

5. **Material world**
   At least 5 materials or textures belonging to that product world.
   Example: brushed metal, matte black cardstock, cinema screen, exposed concrete, carbon fiber, architect's blueprint, overexposed film.

6. **Defaults to avoid**
   Name 3 obvious choices that would make this feel like a generic AI-generated dark landing page.

7. **Signature move**
   One memorable typographic or compositional move that appears in at least 5 places on the page.

If you cannot produce these seven, you are not ready to compose the page.

---

## Expression Modes

Choose **one primary mode** per screen. You may borrow a small amount from a secondary mode only after the main expression is established.

### 1. Manifesto

Use for:
- brand pages
- about/mission pages
- vision statements
- advocacy products
- philosophical software (tools that believe in something)

Feel:
- powerful
- intentional
- confident
- philosophical — every word was chosen

Composition:
- typography at extreme scale dominates full sections
- statements as compositional blocks — each section IS a statement
- negative space used as punctuation between ideas
- one color only; images minimal or absent
- reader must scroll through the argument

Visual cues:
- display font at `text-5xl` to `text-6xl`
- zero decorative elements — the typography is decoration
- wide tracking on overlines (`tracking-widest`, mono, uppercase)
- accent used only once per scroll viewport, as a highlight or underline

Signature ideas:
- full-section statement in `text-6xl` that spans 3–4 lines
- scroll-triggered word reveal (each word appears sequentially)
- single accent underline beneath the most important phrase per section
- quote wall: alternating large and small quotes, dark and light backgrounds

---

### 2. Product Theater

Use for:
- SaaS marketing pages
- developer tool launches
- infrastructure products
- API or platform announcements

Feel:
- premium
- technical
- precise
- exciting — something important is happening

Composition:
- hero with oversized product screenshot or terminal output as the visual centerpiece
- headline frames the product, not the other way around
- feature sections use product shots as the primary visual — code blocks as decoration
- dark background makes the product interface feel illuminated

Visual cues:
- dark near-black background with product UI "glowing" on top
- subtle grid lines or dot-grid decorative elements
- badge/chip accents in mono (`[v2.1.0]`, `[BETA]`, `[OPEN SOURCE]`)
- metric counters that animate on scroll entry

Signature ideas:
- floating product frame with 1–2deg tilt and `shadow-glow`
- code block used as a visual element (syntax-highlighted, framed in mono)
- animated counter reveal for key metrics (e.g., "4,000ms → 120ms")
- gradient radial centered on the product visual — subtle spotlight

---

### 3. Gallery Editorial

Use for:
- portfolios
- creative agencies
- fashion or lifestyle brands
- architecture studios
- photography platforms

Feel:
- curated
- sophisticated
- dramatic
- confident silence — the work speaks

Composition:
- images occupy large portions; type acts as editorial annotation
- grid breaks intentionally — asymmetric layouts, deliberate overlaps
- alternating full-bleed and contained sections
- hover reveals editorial metadata (year, category, client)

Visual cues:
- images in high-contrast, possibly treated to black-and-white with accent highlights
- intentional typographic overlaps on images (caption over corner of image)
- mono captions in small size — stark contrast against large imagery
- accent color used only for link underlines or hover-reveal text

Signature ideas:
- image reveal on scroll entry (clip-path wipe from bottom to top, 800ms)
- split-screen project showcase (image left, title + details right)
- hover-tilt media cards with subtle perspective transform
- project number counter in mono (`01 / 08`) as navigation

---

### 4. Data Story

Use for:
- annual reports
- case study pages
- research presentations
- impact pages
- before/after narrative

Feel:
- authoritative
- intelligent
- compelling
- structured — the argument builds section by section

Composition:
- large statistical numbers as heroes for each section
- charts integrated into the narrative (not after it)
- horizontal scroll or sticky-section technique for timelines
- prose and data interleaved — not separate blocks

Visual cues:
- display font for dramatic numbers (metric, counter, percentage)
- mono font for all data labels, axis text, timestamps
- accent color highlights single critical data point per chart
- horizontal dividers as section transitions

Signature ideas:
- animated counter on scroll entry (0 → final value, 1200ms)
- horizontal scroll data story with sticky headline
- infographic section with subtle grid overlay
- pull-out stat in `text-5xl` display font flanked by explanatory body

---

### 5. Cinematic Dark

Use for:
- gaming products
- entertainment platforms
- premium subscriptions
- luxury products
- streaming or media services

Feel:
- immersive
- atmospheric
- intense
- cinematic — like entering a film

Composition:
- full-screen sections, video or image as background with overlay
- minimal UI, maximal atmosphere
- type floats over imagery with gradient masks
- each section a scene, not a content block

Visual cues:
- gradient overlays using near-black (not pure black) — preserves depth in imagery
- grain/noise texture at 3% opacity over everything
- accent as flash or highlight — single word, CTA, one key object
- typography ultra-bold, often all-caps for section titles
- scroll reveals each section as a curtain rising

Signature ideas:
- video hero with text overlay and gradient mask at bottom (text legible, video atmospheric)
- grain texture background applied globally at very low opacity
- cinematic color grade feel — desaturated mid-tones, preserved highlights
- section transitions as hard cuts (instant background swap, no fade)

---

## Signature Move Library

Pick one and commit. Do not apply three weak gestures when one strong one would do.

### Apps
- stat counters in `text-4xl` display font — the number IS the content, not decoration
- mono badge strips along the top of sections (`[LIVE]`, `[v1.0]`, `[2024]`)
- dark command/search bar as primary interaction — keyboard-first, editorial

### Dashboards
- key metric in display font at `text-5xl` — one number that defines the page
- horizontal metric strip with mono labels and no card borders — raw data aesthetic
- accent used only on the single most important chart line or bar

### Landing Pages
- opening section with headline at `text-5xl` or larger, no accompanying image — the type is enough
- alternating dark-and-light sections as cinematic scene cuts
- metric counter strip that animates on scroll — numbers are the proof

### Websites
- quote or statement section in display italic at `text-2xl`+, no decoration needed
- case study cards with image overlay + hover-reveal full title
- footer as minimalist manifesto — a single closing statement in large type, then links

Rule:
- your signature move must appear in at least 5 concrete places, or it is not a real signature.

---

## Anti-Generic Tests

Run these before presenting:

### Swap Test
If you replaced:
- the display font with Inter or Roboto
- the red-orange accent with generic blue
- the near-black backgrounds with dark gray `#1F2937`

and the page still felt mostly the same — the typography is not working hard enough. The font, the scale, and the contrast ARE the differentiator.

### Squint Test
Blur your eyes:
- Is there one unmistakable typographic anchor per section?
- Does the dark/light rhythm feel like a deliberate sequence?
- Does any section feel generic without squinting?

The editorial rhythm must be legible at blurred vision.

### Signature Test
Point to 5 exact places where the chosen signature appears.
If you cannot name them, you do not have a signature.

### Magazine Test (unique to Bold Editorial)
If you printed this page, would it look compelling in a premium print magazine?
- Is the type large and intentional enough?
- Does the layout have editorial pacing — not everything the same size?
- Would a creative director approve it?

If no: the typographic scale is not aggressive enough. Push harder.

### Drift Test
Does any element feel like it belongs to Warm Craft (rounded, warm, soft) or Clean SaaS (neutral, gray, business)?
- Check: rounded corners above `radius-xl` → reduce
- Check: serif headings → replace with display font
- Check: warm beige backgrounds → make them near-black or pure white
- Check: soft blue accents → replace with red-orange

---

## Variation Rules By Surface Type

### Apps
- Dark shell, not warm shell. The app should feel like a professional tool, not a productivity diary.
- Navigation: minimal chrome. Top bar transparent or near-transparent. Sidebar slim and labeled in mono.
- Content area: generous, breathing, but not soft. Sharp edges, dark cards.

### Dashboards
- Stat numbers are the hero — `text-4xl` display font minimum, no decorative frames around them.
- Charts: accent color highlights one line/bar. The rest in muted tones. No rainbow palettes.
- Avoid equal-size KPI card rows — find the hero insight and give it disproportionate size.

### Landing Pages
- The hero headline must be uncomfortable to shrink. If reducing type size feels "fine," it's too small.
- Section rhythm is non-negotiable: dense → white space → impact → pause. Never four identical sections.
- No stock illustrations. No warm hand-drawn graphics. No blue. No rounded pill buttons everywhere.

### Websites
- Not every page needs to be dark. Light sections inside dark pages are the drama.
- Institutional does not mean boring — extreme typography can make a boring subject feel significant.
- Let typography and composition carry authority before reaching for photography or illustrations.

---

## Non-Negotiable Expression Rules

1. One accent color, one expression mode, one signature move per page.
2. Typography must establish hierarchy before layout does — if the type scale is weak, nothing fixes it.
3. Every section must earn its existence: is this denser than the last? More spacious? More intense?
4. The grid can break, but every break must be intentional. Random asymmetry is not editorial.
5. If the design feels "good," push it until it feels "authored." Good is the enemy of editorial.
6. Mono captions are the connective tissue — every overline, label, category, and metadata uses mono.
