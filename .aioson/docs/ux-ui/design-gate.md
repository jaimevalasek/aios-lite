---
description: "UI/UX design gate — context repair, the one design engine, isolation rules, and style ambiguity handling before visual direction is chosen."
agents: [ux-ui]
modes: [planning, executing]
task_types: [ui-design, visual-direction]
load_tier: trigger
triggers: [design skill, visual direction, style ambiguity, project_type site, project_type web_app]
---

# UX/UI Design Gate

Load this module before any operation that creates or revises visual direction.

## Step 0 — Design engine gate

Read `.aioson/context/project.context.md` before deciding direction, theme, or density.

Rules:
- if `project.context.md` contains stale or inconsistent metadata that affects visual work, repair the objectively inferable fields before continuing
- resolve the design skill without asking: blank or `interface-design` → load `.aioson/skills/design/interface-design/SKILL.md`, the one design engine; a project-forged name → load that skill instead (`.aioson/skills/design/{design_skill}/SKILL.md` or `.aioson/installed-skills/{design_skill}/SKILL.md`)
- there is no menu: never ask which design skill to use, never ask to confirm the engine, never list installed skills as a choice
- treat the resolved skill as the single source of truth for visual language, typography, component rhythm, and page composition
- if `identity.md` exists (feature-owned or project-wide), load it as the input that parameterizes that one skill — it is never a second visual system
- never silently invent, swap, or mix design skills
- never use context inconsistency as a reason to leave the workflow
- do not load, reference, or apply visual rules from another design package

Once the gate is resolved:
- if the user gave an explicit theme or style preference, obey it
- otherwise infer the direction from product context, `identity.md` when present, and the resolved design skill
- ask at most one short style question only when the ambiguity is material
