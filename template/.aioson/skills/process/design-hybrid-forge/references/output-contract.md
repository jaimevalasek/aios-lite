# Output Contract — design-hybrid-forge

Load when running Phases 4 and 5 (skill generation + preview generation).

Defines exactly what each file must contain and the minimum quality bar.

---

## File generation order

Write in this order — each file informs the next:

1. `SKILL.md` — identity + rules (uses crossover spec from phase 3)
2. `references/design-tokens.md` — all CSS variables (uses accent + substrate from phase 2)
3. `references/art-direction.md` — expression modes + signature library (uses pillars from phase 2)
4. `references/components.md` — component library (uses tokens + art direction)
5. `references/patterns.md` — page layouts (uses components)
6. `references/dashboards.md` — dashboard presets (uses patterns + tokens)
7. `references/websites.md` — landing patterns (uses components + art direction)
8. `references/motion.md` — animations (uses tokens + components)
9. `docs/design-previews/{name}.html` — dashboard preview (uses all above)
10. `docs/design-previews/{name}-website.html` — landing preview (uses all above)
11. `docs/design-previews/index.html` — add gallery card

---

## File-by-file requirements

### SKILL.md

Required sections (must all be present):
- Frontmatter: `name`, `description` (includes activation keywords)
- One-paragraph system description
- `## Package structure` (directory tree)
- `## Activation rules` (when to load / when not to)
- `## Responsibility boundary` (defines / does not decide)
- `## Loading guide` (table: task → which references to load)
- `## Visual signature — three pillars` (the three from phase 2)
- `## Hybrid DNA` (from A / from B / new in hybrid — explicit)
- `## Theme system` (default theme + optional, HTML data-theme snippet)
- `## Visual DNA` (complete CSS color specs for dark + light, including hex values)
- `## Layout structure` (ASCII diagram of the main app shell)
- `## Signature details` (list of specific CSS rules for the signature moves)
- `## Application rules` (7–10 binding rules)
- `## Intent before visuals` (3 questions + bad/good examples)
- `## Workflow discipline` (7-step checklist)
- `## Non-negotiable quality gates` (8–12 gates)
- `## Positioning vs parent skills` (comparison table vs both parents)
- `## Delivery modes` (greenfield + brownfield)

### references/design-tokens.md

Required content:
- Typography strategy (system vs Google Fonts decision)
- Complete `:root` block: typography tokens, spacing (4px rhythm), radius, transitions, z-index
- `[data-theme="dark"]` block: ALL color tokens
- `[data-theme="light"]` block: ALL color tokens
- **Hybrid glass/surface tokens** (unique to this hybrid — the new surface system)
- Shadow tokens (tinted with hybrid accent — never plain black)
- Layout tokens (sidebar width, nav height, content widths)
- Breakpoints
- Interaction guardrails (at least 4 rules)
- Token scope guardrails (rule 1–4 with safe/unsafe examples)
- Admin compact density scale (if structure parent = cognitive-core or clean-saas)

Minimum: dark theme has at least 8 bg/surface tokens, 6 accent tokens, 6 semantic tokens, 4 shadow tokens.

### references/art-direction.md

Required content:
- Core rule ("same system, different expressions")
- Mandatory pre-build outputs (7 items)
- **5 expression modes** — each with: for/feel/composition/visual cues/signature ideas
- Signature library (table with ≥10 reusable details)
- Anti-generic tests (≥4 tests, at least one unique to this hybrid)
- What makes each mode distinct (table contrasting the 5 modes)

### references/components.md

Required: ≥20 named components, each with:
- Name and purpose
- Key CSS properties (using tokens, never hardcoded values)
- Hover/active/focus states
- The hybrid-specific surface treatment (glass/texture/depth)

Must include: top bar, sidebar, stat card, section header, data table, badge/chip, modal, button variants (primary gradient + secondary + ghost), form input, dropdown, at least one hybrid-specific component that doesn't exist in either parent.

### references/patterns.md

Required: ≥6 page layout patterns, each with:
- ASCII diagram of the layout
- CSS skeleton (grid/flex, sizing, overflow)
- Fallback rules
- Use case (when to choose this pattern)

Must include: main app shell, dashboard shell (≥1 operational variant), auth page, settings page.

### references/dashboards.md

Required:
- General rules section (≥6 rules)
- Chart color palette (CSS variables)
- Chart rendering rules (one per chart type)
- **5 dashboard presets**, each with:
  - Expression mode
  - Feel (concrete words)
  - Domain vocabulary
  - Full layout description (stat row + main panels + table/feed)
  - Signature move

### references/websites.md

Required:
- General rules section
- Page shell CSS
- ≥2 hero variants (at least one split layout, one centered/atmospheric)
- ≥4 section patterns (feature grid, proof rail, pricing, testimonials/CTA)
- Footer pattern
- Anti-patterns list (≥5)

### references/motion.md

Required:
- Timing philosophy (3–4 sentences)
- Core easing functions (CSS custom properties)
- ≥8 named animations, each with CSS keyframes + usage context
- Reduced motion block (`@media (prefers-reduced-motion: reduce)`)
- Performance rules (≥4)

---

## Preview requirements

### Dashboard preview (`{name}.html`)

Must show:
- The aurora/substrate background visible through glass panels
- Command strip with live dots (if structure parent = cognitive-core)
- Top bar with logo + tab nav + actions
- Sidebar with section labels + nav items
- Stat row (4 cards minimum)
- At least one chart (can be SVG simulation)
- At least one feed or alert panel
- Full data table (with header + 3–5 rows)
- All glass surfaces with `::before` reflection
- Hybrid accent gradient on at least 3 visible elements
- AIOSON badge (fixed, top-right)
- Must render correctly with no external dependencies beyond Google Fonts

### Landing page preview (`{name}-website.html`)

Must show:
- Full-page substrate background (fixed, aurora gradient or equivalent)
- Glass navigation bar (fixed, scroll-opaque behavior via CSS class)
- Hero section (split or centered — not a plain two-column with no visual punch)
- At least one decorative atmosphere element (orb, gradient blob, etc.)
- Proof rail / social proof strip
- Feature cards section (≥6 cards, 3-column grid)
- Pricing section (3 tiers, featured card visually distinct with gradient border)
- Footer with glass treatment
- Hybrid accent gradient on hero heading or CTA
- AIOSON badge

### Technical requirements (both previews)

- Single `.html` file (no external CSS or JS files)
- Google Fonts loaded via `<link>` (Inter + JetBrains Mono)
- All CSS in `<style>` tag in `<head>`
- All design tokens as CSS custom properties in `:root`
- Glass elements use `@supports (backdrop-filter: blur(1px))` fallback or document that they don't need it
- No JavaScript required for visual display (JS only for optional interactions)
- Renders at 1440px wide (the preview standard)

---

## Gallery card requirements

When adding to `index.html`:

```html
<!-- Hybrid card structure -->
<div class="skill-card">
  <div class="preview-thumb thumb-{name}">
    <span class="preview-label">{3-word vibe description}</span>
  </div>
  <div class="card-body">
    <div class="card-header">
      <span class="card-name accent-{name}">{Display Name}</span>
      <span class="hybrid-badge">✦ Hybrid</span>    <!-- REQUIRED for hybrids -->
    </div>
    <p class="card-description">
      {Parent A} × {Parent B}. {2–3 sentence description of the hybrid identity.}
    </p>
    <div class="card-meta">
      <!-- 4 use case pills -->
    </div>
    <div class="card-links">
      <a href="{name}.html">Dashboard</a>
      <a href="{name}-website.html">Landing page</a>
    </div>
  </div>
</div>
```

Thumbnail CSS must:
- Use the hybrid's substrate as background
- Include a `::before` pseudo-element showing the glass surface treatment
- Include an atmospheric `::after` showing the accent glow
- Be visually distinct from both parent thumbnails in the gallery

Update the skill count in `hero-meta` and `footer`.
