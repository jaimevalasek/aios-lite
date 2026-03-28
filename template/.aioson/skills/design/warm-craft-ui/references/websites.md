# Website Layouts — Warm Craft UI

Composition guides for landing pages, product pages, and institutional websites. Uses tokens from `design-tokens.md` and components from `components.md`.

---

## General Website Rules

1. **Hero is the first impression.** It must feel crafted, not templated. Never a centered headline + two buttons + stock image.
2. **Editorial pacing.** Alternate between high-impact sections and breathing room. Never repeat the same card grid four times.
3. **Serif drives the narrative.** Headlines, pull quotes, and hero text use `var(--font-display)`. This is what makes it feel warm, not the colors.
4. **Warm backgrounds, not white.** Use `var(--bg-void)` for section alternation, never pure white sections.
5. **One accent, used sparingly.** Terracotta for CTAs and key highlights only. Never accent borders, accent backgrounds on sections, or accent everything.
6. **Illustrations over icons.** Where possible, use warm, hand-drawn-style illustrations. Cold geometric SVG icons are for apps, not marketing pages.
7. **Real copy only.** No Lorem ipsum. Write real headlines, descriptions, and CTAs that sound like a human wrote them.

---

## Hero Patterns

### Pattern A: Split Hero

```
+---------------------------+---------------------------+
|                           |                           |
|  OVERLINE                 |  PRODUCT SHOT or          |
|  (text-sm, accent,       |  ILLUSTRATION             |
|   tracking-wide)          |  (warm tones, soft        |
|                           |   shadow, slight tilt)    |
|  HEADLINE                 |                           |
|  (font-display, text-5xl, |                           |
|   weight-bold, heading)   |                           |
|                           |                           |
|  SUBTITLE                 |                           |
|  (text-lg, secondary,    |                           |
|   max-width 480px)        |                           |
|                           |                           |
|  [CTA Primary] [CTA Sec] |                           |
|                           |                           |
+---------------------------+---------------------------+
```

Use when: product has a strong visual to show. Most common warm hero.

### Pattern B: Editorial Hero

```
+-----------------------------------------------------------+
|  centered, max-width: 720px                                |
|                                                            |
|  OVERLINE (accent badge or small label)                    |
|                                                            |
|  HEADLINE                                                  |
|  (font-display, text-5xl, weight-bold, text-align: center)|
|  letter-spacing: var(--tracking-tight)                     |
|                                                            |
|  SUBTITLE                                                  |
|  (text-xl, secondary, text-align: center, max-width 560px)|
|                                                            |
|  [CTA Primary]                                             |
|                                                            |
|  SOCIAL PROOF LINE                                         |
|  (avatar cluster + "Trusted by 2,000+ teams")             |
|                                                            |
+-----------------------------------------------------------+
```

Use when: message is the product. No visual needed above the fold.

### Pattern C: Immersive Hero

```
+-----------------------------------------------------------+
|  full-width background: warm gradient or warm photography  |
|  (subtle warm overlay if image is cold)                    |
|                                                            |
|  centered content, max-width: 640px                        |
|                                                            |
|  HEADLINE (white or light text if on dark background)      |
|  SUBTITLE                                                  |
|  [CTA on warm background]                                  |
|                                                            |
+-----------------------------------------------------------+
```

Use when: brand-heavy, emotional product, premium feel.

---

## Section Patterns

### Feature Grid

```
SECTION HEADER
  overline: var(--text-sm), var(--accent), var(--tracking-wider), uppercase
  title: var(--font-display), var(--text-3xl), var(--weight-bold)
  subtitle: var(--text-lg), var(--text-secondary), max-width 600px
  text-align: center or left
  margin-bottom: var(--space-12)

GRID
  display: grid
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
  gap: var(--space-6)
  uses: Feature Card component
```

Rules:
- Max 6 features in a grid. If more, group into categories.
- Each feature card should have a warm icon area (not just an icon floating in space).

### Alternating Feature Sections

```
SECTION 1 (image left, text right)
+---------------------------+---------------------------+
|  [Product screenshot      |  OVERLINE                 |
|   or illustration,       |  TITLE (serif, 2xl)       |
|   rounded-2xl,           |  DESCRIPTION              |
|   warm shadow]            |  BULLET POINTS            |
|                           |  [CTA link →]             |
+---------------------------+---------------------------+

SECTION 2 (text left, image right)
+---------------------------+---------------------------+
|  OVERLINE                 |  [Product screenshot      |
|  TITLE                    |   different angle]        |
|  DESCRIPTION              |                           |
+---------------------------+---------------------------+
```

Rules:
- Always alternate sides.
- Images should be real product screenshots with warm treatment (rounded corners, soft shadow, slight warm tint).
- Vertical padding between sections: `var(--space-20)` or `var(--space-24)`.

### Testimonials

```
Option A — Pull Quote:
  font: var(--font-display), var(--text-2xl), italic
  color: var(--text-heading)
  max-width: 640px
  text-align: center
  warm accent bar on left or oversized opening quote mark

  attribution:
    avatar (48px) + name + title + company
    font: var(--font-body), var(--text-sm)
    margin-top: var(--space-6)

Option B — Card Grid:
  3 columns of testimonial cards
  Each: quote + avatar + name + role
  background: var(--bg-surface)
  border: 1px solid var(--border-subtle)
  border-radius: var(--radius-2xl)
  padding: var(--space-6)
```

Rules:
- Pull quote is preferred for warm aesthetic. Card grid is acceptable for volume.
- Never more than one testimonial section per page.

### Social Proof Strip

```
horizontal row of logos or metrics
  "Trusted by teams at [Logo] [Logo] [Logo] [Logo]"
  logos: grayscale, opacity 0.5, warm-tinted
  hover: opacity 1

  or metrics:
  "10K+ users | 4.9/5 rating | 50+ countries"
  font: var(--font-body), var(--text-lg), var(--weight-semibold)
```

### Pricing Section

```
SECTION HEADER (centered)
  title: "Simple, transparent pricing"
  subtitle: "No hidden fees. Cancel anytime."

PRICING CARDS (2-3 columns, centered)
  each card:
    background: var(--bg-surface)
    border: 1px solid var(--border-subtle)
    border-radius: var(--radius-2xl)
    padding: var(--space-8)

    plan name: var(--text-lg), var(--weight-semibold)
    price: var(--font-display), var(--text-4xl), var(--weight-bold)
    per period: var(--text-sm), var(--text-secondary)
    feature list: checkmarks with var(--semantic-green)
    CTA: Primary or Secondary Button (full width)

  recommended card:
    border: 2px solid var(--accent)
    shadow: var(--shadow-lg)
    "Most Popular" badge above card
```

### CTA Section (before footer)

```
background: var(--bg-void)
border-radius: var(--radius-3xl)
padding: var(--space-16) var(--space-8)
text-align: center
margin: var(--space-16) auto
max-width: var(--content-lg)

title: var(--font-display), var(--text-3xl), var(--weight-bold)
subtitle: var(--text-lg), var(--text-secondary)
[CTA Primary — Large variant] + [CTA Secondary]
```

---

## Footer

```
background: var(--bg-void)
border-top: 1px solid var(--border-subtle)
padding: var(--space-16) var(--space-8) var(--space-8)

LAYOUT (4 columns on desktop, stacked on mobile)
  Column 1: Logo + tagline + social icons
  Columns 2-4: Link groups (Product, Company, Resources)

  link group title:
    font: var(--font-body), var(--text-sm), var(--weight-semibold)
    color: var(--text-heading)
    margin-bottom: var(--space-4)

  links:
    font: var(--text-sm), var(--text-secondary)
    hover: var(--text-heading)
    line-height: 2

BOTTOM BAR
  border-top: 1px solid var(--border-subtle)
  margin-top: var(--space-8)
  padding-top: var(--space-6)
  display: flex; justify-content: space-between
  copyright: var(--text-xs), var(--text-muted)
  legal links: var(--text-xs), var(--text-secondary)
```

---

## Navigation (Websites)

```
STICKY HEADER
  height: 72px
  background: rgba(253, 252, 250, 0.85)  /* bg-base with blur */
  backdrop-filter: blur(12px)
  border-bottom: 1px solid var(--border-subtle)
  position: sticky; top: 0
  z-index: var(--z-sticky)

  logo (left): max-height 32px
  nav links (center): var(--text-sm), var(--weight-medium), var(--text-secondary)
    hover: var(--text-heading)
    active: var(--text-heading) + subtle underline
  CTA (right): Primary Button (compact variant)

MOBILE (< 768px)
  hamburger icon → slide-in drawer from right
  full-height, var(--bg-surface)
  nav items stacked vertically
  CTA at bottom of drawer
```

---

## Anti-Patterns (Never Do This)

1. **Generic hero:** Centered headline, two buttons, abstract gradient background. This is every AI-generated landing page.
2. **Icon grid features:** 6 features as icon + title + one-line description in a 3x2 grid. Lazy and undifferentiated.
3. **Blue accent on warm page:** Blue CTAs or links break the warm system. Use terracotta or sage.
4. **Stock photography without warm treatment:** Raw stock photos feel cold. Apply rounded corners, soft shadow, warm tint overlay if needed.
5. **Testimonials as afterthought:** Generic quote in a gray box at the bottom. Either make it editorial (serif, large) or skip it.
6. **Dense footer:** Footer should breathe like the rest of the page. Generous padding, warm background.
7. **Multiple CTAs competing:** One primary CTA per viewport. Secondary CTAs use Ghost or Secondary button style.
8. **Repeating the same layout:** If sections 2, 3, and 4 all use the same card grid, the page feels generated. Vary the composition.
