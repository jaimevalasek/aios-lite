---
name: aioson-design-system
description: Use when designing or implementing aioson.com UI or anything that must match its visual identity, including the Command Dock topbar, navigation, theme toggle, account dropdown, Aurora Rail, marketing sections, terminal cards, pipelines, gates, pricing, and dark/light variants.
---

# AIOSON Design System

Apply the production identity of aioson.com: Space Grotesk + JetBrains Mono, dark/light themes with the same accent families, a three-zone Command Dock, Aurora Rail, restrained glass, and operational marketing components.

## Workflow

1. Inspect the existing page and reuse its tokens/components before adding variants.
2. Load `references/tokens.md` for every task.
3. Load only the task-specific references below.
4. Implement with semantic HTML, keyboard access, responsive behavior, visible focus, persisted theme preference, and reduced-motion support.
5. Validate both themes and guest/logged account states when the surface includes them.

## Reference routing

| Scope | Load |
|---|---|
| Topbar, navigation, account menu, Aurora Rail | `references/command-dock.md` |
| Theme variables and persistence | `references/theming.md` |
| Hero, tracks, pipeline, gates, terminal, pricing | `references/marketing-components.md` |
| Page and section composition | `references/page-layout.md` |
| Animation, glass, gradients, decorative effects | `references/motion-and-effects.md` |

Load multiple references only when the requested surface crosses those boundaries.

## Non-negotiable rules

- Use `data-theme="dark|light"` on `<html>` and persist the choice; never create light mode by automatic color inversion.
- Keep the Command Dock in three zones: brand, navigation/command, actions/account.
- Treat guest and logged account states as explicit mutually exclusive body states.
- Keep Aurora Rail informative and bounded; it replaces a generic infinite marquee.
- Use established tokens and four accent families. Do not introduce a parallel palette.
- Prevent card-in-card shells and section backgrounds that leak beyond their intended container.
- Keep dropdowns above decorative layers and test clipping/stacking at all breakpoints.
- Use inline SVG or the existing icon system; do not substitute emoji for interface icons.
- Adapt snippets to the active stack rather than copying standalone examples literally.

## Quality gate

Reject the result if the two themes feel unrelated, navigation collapses without an accessible alternative, account states overlap, icons stack, dropdowns clip, decorative SVG crosses text, glass lowers contrast, motion ignores `prefers-reduced-motion`, or a new component duplicates an existing production primitive.
