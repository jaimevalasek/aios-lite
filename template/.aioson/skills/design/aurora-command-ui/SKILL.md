---
name: aurora-command-ui
description: >-
  Aurora Command UI fuses command-center structure with dark glass over a mandatory aurora gradient. Use only when `design_skill: aurora-command-ui` is set or the user explicitly requests aurora command, dark glass dashboard, glass command center, teal-violet glass, dark frosted panels, or a similar operational interface.
---

# Aurora Command UI

Apply one visual system: dark tinted glass over a fixed aurora substrate, compact command structure, mono metadata rails, dense metrics, and a single teal-to-violet accent family. Never combine it with another design skill.

## Workflow

1. Confirm explicit selection. Do not infer this style merely from “dashboard” or “dark UI”.
2. Load `references/art-direction.md` to select an expression and pass its anti-generic checks.
3. Load `references/design-tokens.md` for every UI task; treat its tokens as authoritative.
4. Load only the task-specific references below.
5. Implement in the active stack with semantic HTML, keyboard access, responsive behavior, and visible focus states.
6. Validate the signature and production gates before handoff.

## Reference routing

| Scope | Load in addition to art direction and tokens |
|---|---|
| Components or forms | `references/components.md` |
| App shell, detail, settings, auth, list/detail | `references/components.md` + `references/patterns.md` |
| Dashboard or admin | `references/components.md` + `references/patterns.md` + `references/dashboards.md` |
| Landing page or website | `references/components.md` + `references/websites.md` |
| Material animation | `references/motion.md` |

Do not load unrelated references. For a full product surface, load all seven reference files.

## Non-negotiable signature

- Keep the aurora gradient as the structural substrate; glass over a solid background is invalid.
- Use dark tinted, translucent surfaces with no more than three nesting levels.
- Use teal `#00C8E8` and violet `#7C3AED` as one accent family; reserve semantic colors for status.
- Use mono uppercase rails only for section labels, stat labels, and metadata.
- Provide `@supports (backdrop-filter: blur(1px))` fallbacks and a usable reduced-transparency result.
- Default operational products to dark. Add a light variant or theme toggle only when product scope supports it.

## Quality gate

Reject the result if the substrate is absent, panels are effectively opaque, accent colors drift, every element glows, mono styling leaks into body copy, glass nesting is excessive, focus/contrast is weak, or reference snippets were copied without adapting them to the stack.
