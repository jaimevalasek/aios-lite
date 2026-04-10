# 54 - UX/UI Agent: Landing Page Mode + Premium Template Patterns

Date: 2026-03-03

## Scope
Elevate the `@ux-ui` agent from generic UI spec generator to a full landing page production tool,
capable of generating complete `index.html` files with real content, modern CSS, and premium visual patterns.

---

## What was implemented

### @setup agent — onboarding UX overhaul (all locales: base, en, pt-BR, es, fr)

**Problem:** Agent was responding in English even for pt-BR projects (chicken-and-egg: locale:apply runs after setup).
**Fix:** Added `## Language detection` at the very top of the base `setup.md` — the LLM detects the user's first message language and self-redirects to the appropriate locale file before doing any setup work.

**Problem:** `aios-lite locale:apply` CLI command failing because global CLI may not be installed.
**Fix:** Replaced CLI invocation with direct file copy instructions the AI agent executes natively:
> "Copiar todos os arquivos de `.aios-lite/locales/pt-BR/agents/` para `.aios-lite/agents/`"

**Problem:** `spec.md` offer confusing for non-technical users ("Would you like to generate a spec.md?").
**Fix:** Added one-sentence contextual explanation before the question.

**Problem:** Form-style onboarding was mechanical and poor UX.
**Fix:** Replaced with description-first conversational flow:
- Step 1: ONE open question ("Descreva o projeto em uma ou duas frases")
- Step 2: LLM infers `project_type` + `profile` + stack → proposes complete stack in one message for confirmation
- Step 3: Classification with point scoring explained
- Step 4: Services (optional, once, with descriptions)
- Added tech reference section: backend/auth/UI options with descriptions + documentation links

**Smart defaults by project_type:**
- `site` → no backend, no DB, no auth. Ask: hosting, CMS if applicable.
- `script` → runtime only, skip frontend/auth.
- `api` → backend + DB + auth. Skip frontend/UI.
- `web_app` → full stack.
- `dapp` → see Web3 section.

### @ux-ui agent — Visual style intake + Landing page mode (base + pt-BR locale)

**Visual style intake (Step 0):**
ONE question with two clear options before any design work:
- **A — Clean & Luminous**: Apple / Linear / Stripe style — white bg, single accent, subtle animations
- **B — Bold & Cinematic**: Framer / Vercel / Awwwards style — dark hero, gradient overlays, scroll reveals

**Landing page mode (project_type=site):**
Full production guide activated when `project_type=site`:
- Real copy crafting (no placeholders): hero, 3 feature sections, social proof, final CTA
- Unsplash image sourcing with curated IDs by domain + search query
- Modern CSS arsenal (two complete systems: Clean & Luminous + Bold & Cinematic)
- Required reading: `interface-design.md` + `static-html-patterns.md` (new skill)

**Output contract updated:**
- `project_type=site` → `landing-preview.html` + `ui-spec.md`
- `project_type≠site` → `ui-spec.md` only

**Quality checks added:**
- Swap test, Squint test, Signature test
- **"Wow" test** (landing pages only): would someone screenshot and share this?

### New skill: static-html-patterns.md

Full production guide for landing pages. 14 sections, ~1790 lines:

| Section | Content |
|---|---|
| 1 | Semantic HTML shell with full accessibility attributes |
| 2a | Bold & Cinematic CSS system (full :root token block, glassmorphism, orbs, glow buttons, shimmer cards, angular clip-path) |
| 2b | Clean & Luminous CSS system (shadow-based, accent rule, soft alternation) |
| 3 | Performance patterns (preconnect, fetchpriority, lazy, preload CSS, async scripts) |
| 4 | Minimal JS (scroll header, mobile menu toggle, IntersectionObserver reveal, counter animation) |
| 5 | BEM-lite naming convention |
| 6 | Responsive strategy (clamp() typography, hide decorative on mobile, grid collapse) |
| 7 | Accessibility checklist (10 items, non-negotiable) |
| 8 | Curated Unsplash image IDs by domain (Tech/Business/Creative/Wellness/Food/Architecture/Nature/People/Avatars) |
| 9 | GSAP animations: revealOnScroll, heroIntroTimeline, cardsStaggerIn, parallaxLight, animateCounters, initGlowCards + prefers-reduced-motion guard |
| 10 | Swiper patterns: CDN, HTML structure, universal data-attribute init, CLS fix |
| 11 | SCSS architecture (base/tokens/layout/components/sections) |
| 12 | Full section checklist (13 sections for AI/SaaS, 6 for MICRO) |
| 13 | Pre-delivery checklist (14 items) |
| 14 | Premium template patterns (see below) |

### Section 14 — Premium template patterns (Aigocy-style)

Extracted from ThemeForest #61450410 (Aigocy — AI Agency HTML template).
User provided the full source HTML of the about.html page.

| Pattern | Description |
|---|---|
| 14a. effectFade fadeRotateX | 3D perspective entrance: `rotateX(25deg)` + `translateY` → 0 with `transform-origin: 50% 0%`. `data-delay` per element for precise stagger |
| 14b. Infinite logo marquee | CSS `@keyframes infiniteSlide` at `-50%` on a `width: max-content` track. Auto-clone JS. Hover-pause. `prefers-reduced-motion` disables. |
| 14c. SVG animated paths | SMIL `<animateMotion>` + `<mpath>` for dots traveling along SVG paths. Hub-and-spoke diagram connecting tool icons to center product image. |
| 14d. Scroll-to-top ring | `stroke-dashoffset` circular progress updated by `scroll` JS. Shows/hides after 300px scroll. |
| 14e. Split Swiper | Two Swiper instances: text (left, with controls) + image (right, `allowTouchMove: false`, `effect: 'fade'`). `slideChange` event binds them via `slideTo(realIndex)`. |
| 14f. Swiper progress bar | Thin fill bar (`width` updated in `on.slideChange`) replacing dots navigation. |
| 14g. Section alternation | `box-black`/`box-white` pattern. CSS `::before`/`::after` radial gradient replaces decorative PNG light images. |
| 14h. Accordion FAQ | Native `<details>`/`<summary>` — no Bootstrap or JS dependency. Icon `+` rotates to `×` via `details[open] .faq__icon { transform: rotate(45deg) }`. |
| 14i. Watermark footer | `position: absolute` brand name in `font-size: clamp(80px, 15vw, 160px)`, `opacity: 0.04` behind 3-column grid footer. |
| 14j. Canvas cursor trail | `canvas` on `position: fixed; inset: 0; pointer-events: none`. Fading dot array on `mousemove`. Skipped on `hover: none` (touch) and `prefers-reduced-motion`. |

---

## Key decisions

1. **Language detection before onboarding** — base `setup.md` now self-redirects at the very start, solving the chicken-and-egg problem without requiring the CLI to be installed.

2. **Two-style visual selection** — rather than letting the LLM choose freely (which leads to generic output), forcing a conscious choice between Clean & Luminous and Bold & Cinematic ensures intentional design direction. No mixing allowed.

3. **Real copy, real images** — the landing page mode enforces "no placeholders" as a hard constraint. This is the single biggest quality differentiator from generic AI output.

4. **CSS-only marquee preferred over library** — `infiniteSlide` pattern works without infinityslide.js dependency, reducing external deps.

5. **Section 14 patterns are optional enrichments** — the agent reads the skill and selects applicable patterns based on project domain and chosen visual direction. Not all 10 patterns are used in every project.

6. **`prefers-reduced-motion` is mandatory for every animation** — treated as accessibility requirement, not optional.

---

## Files changed

- `template/.aios-lite/agents/setup.md` — language detection + description-first onboarding
- `template/.aios-lite/locales/{en,pt-BR,es,fr}/agents/setup.md` — translated equivalents
- `template/.aios-lite/agents/ux-ui.md` — Step 0 (visual intake) + landing page mode + output contract
- `template/.aios-lite/locales/pt-BR/agents/ux-ui.md` — Portuguese equivalent
- `template/.aios-lite/skills/static/static-html-patterns.md` — NEW skill, 1790 lines
- `package.json` — bumped to 0.1.16
- `CHANGELOG.md` — 0.1.16 entry added

---

## Version
0.1.16
