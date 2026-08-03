---
name: reference-identity-extract
description: Extract reference images once into a canonical text identity consumed by interface-design and prototypes
---

# Reference Identity Extract

Turn user-provided identity and structure images into one editable `identity.md`. This skill owns extraction and the record; `interface-design` owns the build, and Prototype Forge owns screens/navigation/CRUD/state. The record parameterizes one design engine and never becomes a second design skill.

## Scope

- Visual exploration: `.aioson/explorations/{slug}/identity.md`; imported images under `inputs/references/`
- Briefing: `.aioson/briefings/{slug}/identity.md`; images under `references/identity/` and `references/structure/`
- Project brand: `.aioson/context/identity.md`; images under `brand-references/identity/` and `brand-references/structure/`

Exploration builds resolve exploration identity first. Canonical builds resolve briefing identity, then project identity, then none. Identity images provide visual tokens; structure images provide `## Component structure notes`. Structure-image colors and typography do not override identity.

## Extraction

1. Resolve scope and read project context.
2. Load `references/extraction-contract.md`.
3. Inspect each image once and convert evidence to text.
4. Load `references/identity-schema.md` and write its exact headers with concrete values.
5. Run:

```bash
aioson verify:artifact . --kind=identity --file=<path> --advisory 2>/dev/null || true
```

Fix reported gaps before handoff. Later builds read text, never source images.

The record frontmatter includes `kind: identity`, the resolved `scope: exploration|briefing|brand`, `source: references`, and `generated_by: reference-identity-extract`. An explicitly persisted image-less intent system uses `source: intent`; otherwise write nothing and let interface-design run intent-first.

## Hard boundaries

- One vision pass, real tokens, exactly one depth strategy, specific pillars/signature moves, generic provenance.
- No placeholders, fabricated palette, UI build, briefing edits, or canonical product feedback.
- A vision-less harness may consume or hand-author a validated record but cannot claim to have extracted images.
- Output only the resolved `identity.md`.
