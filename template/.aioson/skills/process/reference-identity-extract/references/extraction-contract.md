---
description: Evidence separation and one-pass extraction rules for visual reference identities
agents: [briefing-refiner, setup]
task_types: [reference-image-extraction]
triggers: [identity images, structure screenshots]
---

# Reference Identity Extraction Contract

Read identity and structure sets once.

Identity evidence yields palette, foreground/background/border/brand/semantic roles, type families and scale, spacing/grid/breakpoints, radius, one depth strategy, motion, signature moves, pillars, and anti-goals.

Structure evidence yields one component block per image:

- regions and anatomy
- empty, loading, error, populated, permission-denied states
- relevant add/move/edit/archive and navigation interactions

Apply identity to structure; never inherit the structure screenshot's brand. With no structure images, use `None — identity-only`.

Use real hex/RGBA values, named font stacks, numeric scales, and explicit motion/reduced-motion rules. Choose exactly one: `borders-only`, `subtle-shadows`, or `layered-surfaces`.

Provenance states counts and generic types only, such as “3 identity images; 1 board screenshot.” Never name an external product, brand, site, or tool.

Confidence reflects how directly the references determine the tokens. Conflicting evidence lowers confidence and must be resolved in the written record rather than left as two systems.
