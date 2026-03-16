# Websites - Commercial and Marketing Patterns

Read after `references/foundations.md`, `references/components.md`, and `references/patterns.md`.

This module adapts Cognitive UI for landing pages, commercial websites, and product marketing surfaces.

## Core rule

A commercial page using `cognitive-ui` should feel premium and technical, but it must still behave like a website.
It cannot look like an admin dashboard with the word "site" pasted on top.

## Website stance

Use these traits:
- stronger narrative hierarchy
- more whitespace between sections
- fewer panels above the fold
- larger display headings
- mono labels only as supporting spice
- one strong accent family carried through the whole page

Avoid these traits:
- persistent sidebars
- operational rails
- dense status grids above the fold
- five cards competing with the main message
- dashboard feeds on marketing pages unless the brand truly requires that look

## Preset 1: Product Landing

**Best for:** SaaS products, tools, digital platforms, premium software.

**Composition:**

```text
HEADER: logo + compact nav + primary CTA
HERO: mono eyebrow (optional) + strong headline + proof/support copy + CTA cluster + product visual
PROOF BAR: logos, metrics, or trust markers
FEATURE STORY: 2-4 sections with alternating media/text rhythm
WORKFLOW / HOW IT WORKS: step sequence or visual path
SOCIAL PROOF or USE CASES
FINAL CTA
FOOTER
```

**Guardrail:**
- The hero must have one dominant message.
- Do not replace the hero with a grid of equal-weight feature cards.

## Preset 2: Commercial Service Site

**Best for:** studios, agencies, consulting firms, productized services.

**Composition:**

```text
HEADER
HERO
SERVICES GRID
PROCESS / DELIVERY MODEL
CASE STUDIES OR RESULTS
FAQ
FINAL CTA
FOOTER
```

**Guardrail:**
- Lead with authority and clarity, not dashboard chrome.
- Use strong typographic rhythm and restrained panels.

## Preset 3: Feature Campaign Page

**Best for:** launch pages, new module announcements, high-focus commercial pages.

**Composition:**

```text
MINIMAL HEADER
CINEMATIC HERO
PROBLEM / SHIFT SECTION
FEATURE DEEP-DIVE
UI SHOWCASE
CTA BAND
```

## Typography guidance for websites

- Use `--font-display` for headings and `--font-body` for reading text.
- Keep body copy comfortable; avoid tiny helper text.
- Use mono for micro labels, feature IDs, small proof tags, or product metadata only.
- If system fonts already look clean and premium, keep them.

## Website anti-patterns

1. Do not use a dashboard shell for a landing page.
2. Do not place four stat cards before the main value proposition unless the proof is the product.
3. Do not overuse cyan glow; websites need calm areas.
4. Do not use uppercase mono for entire paragraphs, nav groups, or section copy.
5. Do not make every section a bordered card.

## Agent decision rule

If the request is a landing page, commercial site, or product website, load this file and deliberately leave `dashboards.md` out of context.
