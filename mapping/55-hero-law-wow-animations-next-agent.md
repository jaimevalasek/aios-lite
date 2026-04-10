# 55 - Hero Law, Mandatory Wow Animations, Next-Agent Guidance

Date: 2026-03-03

## Scope
Fix three root causes identified by comparing the AI-generated landing page against premium ThemeForest/Webflow templates.

---

## Root causes identified (deep analysis)

### Problem 1: Hero was a card grid
The agent was generating the hero section as a numbered steps panel + text column.
Result: looked like a dashboard, not a landing page.
**Fix:** Added "Hero Law" as Section 0 of `static-html-patterns.md` — explicit, bold, placed before everything else.

### Problem 2: Background was static
The mesh gradient was a beautiful static gradient. Premium pages have animated backgrounds.
**Fix:** Added `@keyframes meshDrift 20s ease infinite alternate` — gradient position drifts slowly.

### Problem 3: Animations were generic
fadeUp reveal is the minimum. Three techniques that actually create "wow":
1. Animated gradient text on h1 key phrase — most noticed single premium detail
2. 3D card tilt on hover — makes cards feel physical
3. Animated mesh background — page feels alive

### Problem 4: Step 0 was skippable
The visual style question ("Clean & Luminous" or "Bold & Cinematic") existed but was not marked as blocking.
The agent could read context, start designing, and only ask the style question incidentally.
**Fix:** Added "⚠ HARD STOP — blocking gate" — agent cannot proceed at all until user answers.

### Problem 5: Setup didn't tell user what to do next
After setup completed, the user had to know from memory to run `@ux-ui` next.
If the user didn't type `@ux-ui` explicitly, the agent never got triggered.
**Fix:** Added Step 3 to Post-setup action: table of project_type + classification → next @agent.
Using `@name` format so Codex/Claude Code/Gemini can trigger it directly from the output.

---

## What was implemented

### static-html-patterns.md
- **Section 0 (new)**: Hero Law — full text with the exact constraint
- **Section 2a-extra (new)**: Three mandatory wow techniques with full CSS + JS code:
  - `@keyframes meshDrift`: 4-keyframe drift on `background-position`
  - `.gradient-text--animated`: `background-size: 300%` + `@keyframes textGradient`
  - `initCardTilt()`: mousemove handler + mouseleave smooth reset + hover:none guard

### @ux-ui agent (base + en/pt-BR/es/fr locales)
- Step 0: Upgraded to HARD STOP blocking gate
- Landing page mode: Added Hero Law + Mandatory Wow Techniques section
- es/fr locales: Full rewrite (were on old version without Step 0 or landing page mode)

### @setup agent (base + en/pt-BR/es/fr locales)
- Post-setup Step 3: Table of project_type × classification → next @agent
- Closing message pattern with `@agent` syntax
- Spec.md skip hint for project_type=site + MICRO

---

## Key decisions

1. **Hero Law placed as Section 0** — before anything else in the skill. Most important constraint must be most visible.

2. **Mandatory vs optional** — the three wow techniques are in a "required" section, not an optional patterns section. LLMs need explicit "you must" to override their defaults.

3. **Step 0 as hard stop** — blocking language ("do not read files, do not write HTML") is necessary because LLMs will skip ahead without it. The question must come before any other action.

4. **`@name` in setup closing** — using the exact @agent syntax ensures the AI client can pick it up as an agent trigger, not just a file path reference.

5. **meshDrift uses `alternate`** — `animation: meshDrift 20s ease infinite alternate` reverses direction each cycle, creating organic non-repeating motion vs jarring jump back to start.

---

## Files changed
- `template/.aios-lite/skills/static/static-html-patterns.md` — Section 0 + Section 2a-extra
- `template/.aios-lite/agents/ux-ui.md` — Step 0 hard stop + hero law + wow techniques
- `template/.aios-lite/locales/{en,pt-BR,es,fr}/agents/ux-ui.md` — same (es/fr full rewrite)
- `template/.aios-lite/agents/setup.md` + all 4 locales — Step 3 next-agent guidance
- `package.json` — bumped to 0.1.17
- `CHANGELOG.md` — 0.1.17 entry

---

## Version
0.1.17
