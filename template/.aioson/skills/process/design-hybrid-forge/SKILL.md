---
name: design-hybrid-forge
description: Create one project-local design skill from exactly two primary design parents and bounded optional modifiers
agents: [design-hybrid-forge]
task_types: [design-skill-generation]
triggers: [hybrid design skill, design parents, forge design skill, fundir design]
---

# Design Hybrid Forge

Use to create or validate a hybrid design skill, not to apply an existing design skill.

## Inputs

- Exactly two primary parents: project-forged design skills (site-forge or hybrid output) or normalized external DESIGN.md sources — never the `interface-design` engine
- Zero to two modifiers by default; three only in explicitly enabled advanced mode
- Optional variation overlay, target domain, name suggestion, author, and generator model

Ask for missing parents first. Establish creative tension, substrate owner, structure owner, and a genuinely new accent before generation.

## Phases and selective references

Complete in order and load only the current reference:

1. Pair selection: `references/pair-compatibility.md`
2. External parent normalization when needed: `references/external-source-ingestion.md`
3. Identity and explicit DNA crossover: `references/crossover-protocol.md`
4. Optional anti-sameness overlay: `references/variation-library.md`
5. Name/conflict check: `references/naming-registry.md`
6. Package and two previews: `references/output-contract.md`
7. Validation/distribution: `references/quality-gates.md`

Never preload every reference.

## Default output

Generate `.aioson/installed-skills/{hybrid-name}/` with:

- `SKILL.md`, `.skill-meta.json`
- seven references: art direction, tokens, components, patterns, dashboards, websites, motion
- dashboard and landing HTML previews

Mirror to existing tool-native skill directories only after the project-local package passes. Core/gallery/marketplace promotion is a separate explicit step from an already-generated local skill.

## Non-negotiable identity

- Two and only two co-equal parents; never two near-identical family members.
- One parent owns substrate and one owns structure. Modifiers own neither and do not own tokens.
- The result is a third identity, not one parent with the other's colors.
- Accent differs from both parents; `## Hybrid DNA` names contributions and new elements.
- At least five expression modes, twenty components, complete metadata, and both previews.
- Temporary variation presets are archived or removed from active context after success.
- `threejs-spatial` is modifier-only: CSS still owns base/layout, parent accents drive WebGL, and CDN delivery is the supported mode.
- External sources retain provenance but never transfer brand, logo, trademark, exact palette, or source name into the hybrid.

## Completion

Ship only after every quality gate passes and generated files have no placeholders. Project-local generation never edits core registries; promotion may do so only when explicitly requested in the core repository.
