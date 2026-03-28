# Art Direction — Neo-Brutalist UI

Read this file for any page-level work where expression and differentiation matter: apps, dashboards, landing pages, and personal sites.

This file exists to stop Neo-Brutalist UI from collapsing into the same yellow-bordered card layout every time.

The tokens stay consistent. The expression must shift with the product's personality and audience.

---

## Core Rule

**Same structure, different character.**

Keep the Neo-Brutalist DNA:
- thick borders on everything interactive
- hard shadows (zero blur, solid offset)
- monospace type for all data and labels
- push mechanic on all clickable elements
- flat, saturated colors — no gradients, no blur

But do **not** keep the same composition, tone, or layout from project to project. Choose one expression mode and commit to it.

---

## Mandatory Pre-Build Outputs

Before designing a full page, produce all of these:

1. **Human**
   The real person arriving at this page right now — their mindset, context, what they just came from.
   *Bad: "developer". Good: "indie hacker who just launched their first paid product and is checking if anyone signed up overnight."*

2. **Main action**
   The single thing this interface must make easy. One sentence.
   *Bad: "see dashboard". Good: "spot the one stat that changed since yesterday without clicking anything."*

3. **Felt quality**
   Three concrete words for how the interface should feel — not generic design adjectives.
   *Bad: "clean, modern, bold". Good: "unapologetic, hand-built, fast."*

4. **Domain vocabulary**
   5–7 words from this product's world that should shape copy, labels, and navigation structure.
   *Example for a deploy tool: deploy, pipeline, rollback, diff, canary, staging, prod.*

5. **Material world**
   One physical object or environment this UI draws from — gives the expression mode a sensory anchor.
   *Examples: a zine printed on a Risograph, a terminal running in a dark room, a protest poster on a wall.*

6. **Defaults to avoid**
   One specific pattern common in similar products that this UI must not do.
   *Examples: "don't use a sidebar with gray nav items", "don't use a hero with a screenshot to the right", "don't use subtle card shadows."*

7. **Signature move**
   One interaction or visual pattern that appears on every page and defines the product's personality.
   *Examples: sticker badges on every new feature, push mechanic on all CTAs, mono timestamps on every event.*

---

## Expression Modes

### Mode 1 — Indie Product

**For:** side projects, open source tools, small SaaS, personal dashboards, bootstrapped products
**Feel:** honest, fun, confident, approachable-but-different
**Material world:** a hand-made product page printed at a copy shop

**Visual cues:**
- 2px black borders on everything
- Hard shadow 4px offset on cards and buttons — the defining texture
- Accent yellow on CTAs and active states
- Mono text for labels, metadata, IDs, timestamps
- Layout grid is clean despite the raw aesthetic

**Signature moves:**
- Cards appear "stacked" with shadow offset — hover makes the shadow grow (shadow-md → shadow-lg)
- Buttons "push" on click: shadow disappears + `translate(4px, 4px)` — physical, satisfying
- Badges with border + subtle rotate (`-1deg` to `2deg`) — sticker energy
- Sticker badge "[BETA]" or "[v1.2]" on release-focused features

**What to avoid:**
- Shadows with blur (not indie — corporate)
- Cards without visible borders (loses the raw structure)
- More than 2 accent colors per page (playful ≠ chaotic)

---

### Mode 2 — Devtool

**For:** CLIs with UI, developer dashboards, API explorers, code tools, debug panels, package managers
**Feel:** technical, efficient, hackable, transparent
**Material world:** a terminal running on a dark monitor in a quiet room at 2am

**Visual cues:**
- Mono font dominant — not just for metadata, but for nav items, status text, and some headings
- Terminal-inspired sections: command prompt aesthetic (`> run --watch`), ASCII-art inspired dividers
- Status colors: saturated green (#22C55E), amber (#F59E0B), red (#EF4444) — used directly, not muted
- Code blocks prominent: thick border, colored "tab" header with filename, mono font

**Signature moves:**
- Terminal-style header: `> command_name --flag` as a page subtitle or section label
- Status badges in CLI style: `[OK]`, `[FAIL]`, `[PENDING]`, `[2 errors]`
- Copy button on code blocks that changes text to `Copied!` (mono, brief)
- Full-grid tables with mono data — every cell bordered

**What to avoid:**
- Serif or display fonts (too artsy for a devtool)
- Illustrations or decorative icons (not hackable enough)
- Pastel or muted status colors (defeats the signal function)

---

### Mode 3 — Creative Playground

**For:** design tools, drawing apps, music tools, game editors, educational platforms, creative suites
**Feel:** playful, energetic, experimental, joyful
**Material world:** a Risograph-printed zine with neon spot colors

**Visual cues:**
- Multiple accent colors (3–4 primaries): yellow, red, blue, green — each color-coded to a domain area
- Elements with subtle rotation: `-2deg` to `3deg` on sticker badges, feature highlights
- Star/asterisk decorators (`★`, `✦`) used as dividers or list markers
- Underlines — thick and colored — on section headings
- Pattern backgrounds (dots, lines, checks) in maximum ONE section per page

**Signature moves:**
- Color-coded sections: each feature area has its own accent color
- Sticker badges with rotation: `[NEW]`, `[HOT]`, `[★ PICK]`
- Marquee-style announcement bar at top: scrolling text, bg-accent, mono font
- Mixed border radii on purpose: some elements 0, some pill — creates playful contrast

**What to avoid:**
- Monochrome layouts (all yellow — loses the playground energy)
- Too many rotations (max 3 rotated elements per view)
- Pattern backgrounds in more than 1 section (overwhelming)

---

### Mode 4 — Zine / Manifesto

**For:** personal blogs, opinion pieces, manifestos, about pages, advocacy sites, personal brand sites
**Feel:** opinionated, raw, authentic, loud
**Material world:** the first page of a self-published political zine

**Visual cues:**
- Huge typography: text-4xl to text-5xl for key statements
- Mixed font sizes in the same paragraph or headline: "This is **BIG** and this is small"
- Highlight text: specific words with `background: var(--accent)` inline
- Uppercase headers with wide tracking
- Images with thick black border (like a Polaroid, but brutalist)
- Strikethrough as decoration: crossing out corporate buzzwords

**Signature moves:**
- Inline text highlight: `<mark>` styled with bg-accent, no border-radius, thick padding
- Oversized pull quotes: text-2xl italic in a brutalist card, attribution in mono
- Mixed-weight headline: one word at text-5xl bold, rest at text-xl
- Sticker badge next to image captions: `[CIRCA 2024]` rotated slightly

**What to avoid:**
- More than 2 typefaces (violates typographic honesty)
- Decorative illustrations (should feel like printing press, not illustration blog)
- Centered body text longer than 2 lines (zines are left-aligned)

---

### Mode 5 — Dashboard Punk

**For:** monitoring dashboards, analytics for developers, CI/CD dashboards, infra status, ops tooling
**Feel:** utilitarian, raw-data, no-bullshit, action-oriented
**Material world:** a status board printed on thermal paper in an operations room

**Visual cues:**
- Dense grid layout: maximum data per screen, minimum decoration
- Borders on every cell (full grid, not minimal)
- Large mono numbers: text-3xl or text-4xl, zero serif, zero decoration
- Status colors used at full saturation: green/amber/red — no muted variants
- Empty states: `[NO DATA]` in mono, not an illustration

**Signature moves:**
- Health status board: colored grid squares (green/yellow/red), like a GitHub contribution graph for service uptime
- Uptime counters in mono: `99.97%` at text-3xl
- Build status cards: `[PASS]` / `[FAIL]` badges with colored backgrounds
- Terminal-log style activity feed: mono, timestamped, severity badge

**What to avoid:**
- Decorative charts (every chart must answer a question, not fill space)
- Animations on status indicators (flashing/pulsing is noise, not signal)
- Card shadows in dense data grids (border structure is enough)

---

## Anti-Generic Tests

Run these before delivering any output:

### Brutality Test (unique to this skill)
Remove all thick borders and hard shadows from the layout. If the interface looks "normal" — could pass for clean-saas or any generic Tailwind app — the personality was only in the decoration, not the structure. The layout, typographic scale, and spacing must remain brutalist even in grayscale with no shadows.

### Corporate Test
Would an enterprise product ship this UI? If yes, it's not brutalist enough. Brutalist UI makes a deliberate choice to look like it was built by someone, not a committee.

### Chaos Test
The interface is energetic and personality-driven, but is it still **usable**? Brutalist ≠ chaos. Hard borders create structure. If usability suffered, pull back. Rotate only 1–2 elements, not 10. Keep navigation readable.

### Squint Test
Step back and squint at the layout. Does visual hierarchy hold? Do the thick borders and hard shadows create structure, or noise? If everything has equal visual weight, the hierarchy is broken.

### One-Color Test
Convert the page to grayscale (or imagine it in pure black and white). Does the structure still work? Brutalist UI must function in grayscale because the structure is built from borders and spacing, not color.

---

## Signature Library

Reference moves that can appear in any mode:

| Move | Description | When to use |
|------|-------------|-------------|
| Push mechanic | Shadow disappears + `translate(4px, 4px)` on `:active` | Every interactive card and button |
| Shadow grow | `shadow-md` → `shadow-lg` on hover | Cards, feature tiles |
| Sticker badge | Rotated `[NEW]` / `[BETA]` badge with thick border | New features, promotions, callouts |
| Mono timestamp | `font-mono` for all dates/times: `2024-01-15 09:42` | Activity feeds, tables, logs |
| Full-grid table | Border on every cell — no borderless tables | All data tables |
| Terminal label | `> command --flag` styled text | Devtool mode headings, code-adjacent pages |
| Inline highlight | Background accent on a specific word mid-sentence | Manifesto/zine hero text |
| Pattern accent | Dots or grid pattern on one section background | Landing page hero or CTA section |
| Chunky CTA | Button height 52px, border-thicker, shadow-lg, uppercase, tracking-wide | Primary conversion CTA |
| Color-coded section | Each feature area gets its own accent color | Creative playground mode |
