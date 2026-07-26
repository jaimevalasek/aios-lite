---
name: clean-saas-ui
description: >-
  Clean SaaS UI defines professional, neutral B2B interfaces optimized for clarity, consistency, and efficient repeated use. Use only when `design_skill: clean-saas-ui` is set or the user explicitly requests clean SaaS, enterprise dashboard, business app, admin panel, CRM, ERP, internal tool, neutral UI, or no-frills professional styling.
---

# Clean SaaS UI

Prioritize task efficiency, predictable hierarchy, and systematic consistency. Personality comes from excellent product decisions, not decorative novelty. Never combine it with another design skill.

## Workflow

1. Confirm explicit selection; do not infer from “dashboard” alone.
2. Load `references/art-direction.md` and select the appropriate density/expression.
3. Load `references/design-tokens.md` for every task.
4. Load only the relevant task references.
5. Implement in the active stack with semantic tables/forms, keyboard access, visible focus, responsive priorities, loading/empty/error states, and accessible contrast.
6. Validate high-frequency workflows before handoff.

## Reference routing

| Scope | Additional references |
|---|---|
| Components, forms, tables | `references/components.md` |
| App shell, detail, settings, auth, list/detail | `references/components.md` + `references/patterns.md` |
| Dashboard or operations | `references/components.md` + `references/patterns.md` + `references/dashboards.md` |
| Marketing site | `references/components.md` + `references/websites.md` |
| Functional motion | `references/motion.md` |

Load all seven references only for a complete product system.

## Non-negotiable signature

- Use a restrained neutral palette, one primary accent, and semantic status colors.
- Keep information hierarchy obvious through alignment, spacing, typography, and grouping.
- Design tables, filters, bulk actions, forms, and validation for repeated use.
- Keep density proportional: compact for operations, more spacious for onboarding/marketing.
- Make every state explicit: default, hover, focus, selected, disabled, loading, empty, error, success.
- Support dark mode only from shared tokens, never as an unrelated palette.

## Quality gate

Reject the result if it is a generic card wall, visual polish hides weak workflows, tables are not responsive, actions move unpredictably, forms lack validation, status depends on color alone, loading/empty/error states are missing, or decorative effects consume task space.
