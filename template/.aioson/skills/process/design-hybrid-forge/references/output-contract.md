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
9. `.skill-meta.json` — author, parentage, generator, install/distribution metadata
10. `previews/{name}.html` — dashboard preview (uses all above)
11. `previews/{name}-website.html` — landing preview (uses all above)
12. `AGENTS.md` — register the installed skill section when that file exists

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
- `## Modifier DNA` (only if modifiers were used)
- `## Variation Overlay` (only if a variation preset / overlay was selected)
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

The file must state clearly that the hybrid is selected as one design skill and must not be blended live with other active design skills.

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

If modifiers were used, token changes must stay inside their allowed lane. Example: a motion modifier must not redefine layout width tokens.
If a variation overlay exists, reflect it in tokens only where it changes expression without violating the parent-owned structure/substrate rules.

Minimum: dark theme has at least 8 bg/surface tokens, 6 accent tokens, 6 semantic tokens, 4 shadow tokens.

### references/art-direction.md

Required content:
- Core rule ("same system, different expressions")
- Mandatory pre-build outputs (7 items)
- **5 expression modes** — each with: for/feel/composition/visual cues/signature ideas
- Signature library (table with ≥10 reusable details)
- Anti-generic tests (≥4 tests, at least one unique to this hybrid)
- What makes each mode distinct (table contrasting the 5 modes)

If modifiers exist, call out exactly where they are allowed to appear and where they are forbidden.
If a variation overlay exists, describe how it changes the expression modes without turning them into unrelated themes.

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

### .skill-meta.json

Required content:
- `source: "generated"`
- `generation_mode: "project-local"`
- `installedAt`
- `author.name` when the user provided one
- `generator.skill: "design-hybrid-forge"`
- `generator.model` when the runtime/tool exposes it
- `generator.tool` when known (`claude`, `codex`, etc.)
- `parents.primary` with exactly 2 entries
- `parents.modifiers` with 0–2 entries by default, or 0–3 only when advanced mode was enabled
- `promotion.status` (`local`, `candidate`, `promoted`)
- `variation_profile` when a preset/overlay was selected
- `variation_profile.modifier_policy` when the active preset declared it

Recommended shape:

```json
{
  "source": "generated",
  "generation_mode": "project-local",
  "installedAt": "2026-03-30T00:00:00.000Z",
  "author": {
    "name": "ACME Design Team"
  },
  "generator": {
    "skill": "design-hybrid-forge",
    "tool": "codex",
    "model": "gpt-5.x"
  },
  "parents": {
    "primary": ["cognitive-core-ui", "glassmorphism-ui"],
    "modifiers": ["bold-editorial-ui"]
  },
  "variation_profile": {
    "modifier_policy": "up_to_2_modifiers",
    "style_modes": ["cinematic-immersive"],
    "motion_system": ["scroll-driven-scenes"],
    "advanced_css": ["scroll-driven-animations", "view-transition-api"]
  },
  "promotion": {
    "status": "local"
  }
}
```

### AGENTS.md registration

When `AGENTS.md` exists in the project, update the "Installed skills" section so Codex can invoke the new hybrid via `@{slug}`.

If `.aioson/context/design-variation-preset.md` was consumed for the generation:
- preserve the history snapshot under `.aioson/context/history/design-variation-presets/`
- remove or archive the active preset from `.aioson/context/` after the hybrid files are finished
- do not treat that preset as the permanent visual configuration of the project

Required row format:

```markdown
| @{slug} | `.aioson/installed-skills/{slug}/SKILL.md` | {short description} |
```

---

## Preview requirements

### Dashboard preview (`previews/{name}.html`)

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

### Landing page preview (`previews/{name}-website.html`)

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

## Optional promotion requirements

Only for explicit core-promotion mode:
- prepare a gallery card for `docs/design-previews/index.html`
- prepare the hybrid for `.aioson/skills/design/{name}/`
- update naming/registry files only in the AIOSON core repo

### Gallery card requirements

When adding to `index.html` in core-promotion mode:

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
