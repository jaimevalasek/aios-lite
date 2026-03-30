# Skill: design-hybrid-forge

> Process skill. Creates new hybrid design skills by fusing DNA from two existing AIOSON design skills.
> Load this file first. Then load only the `references/` file you need for your current phase.

## What this skill produces

A complete, production-quality hybrid design skill that can be activated exactly like any native skill:

```
template/.aioson/skills/design/{hybrid-name}/
  SKILL.md
  references/
    art-direction.md
    design-tokens.md
    components.md
    patterns.md
    dashboards.md
    websites.md
    motion.md

docs/design-previews/
  {hybrid-name}.html          ← dashboard preview
  {hybrid-name}-website.html  ← landing page preview
  index.html                  ← updated with new card
```

## When to load

Load this skill when:
- You want to create a new hybrid design skill from two base skills
- You are planning this week's hybrid (pair selection phase)
- You are executing the crossover (generation phase)
- You need to validate a hybrid before shipping

Do NOT load this skill to apply a design skill to a project. Use the target hybrid's own SKILL.md for that.

## Process overview

| Phase | What happens | Produces |
|---|---|---|
| **1. Pair Selection** | Choose two base skills with creative tension | Chosen pair + rationale |
| **2. Identity Synthesis** | Name, 3 pillars, accent fusion, substrate | Hybrid identity doc (in conversation) |
| **3. Crossover Spec** | Define DNA from A, DNA from B, new elements | Crossover map (in conversation) |
| **4. Skill Generation** | Write SKILL.md + 7 reference files | 8 `.md` files |
| **5. Preview Generation** | Write dashboard HTML + landing HTML | 2 `.html` files |
| **6. Gallery Registration** | Add card to index.html + update count | `index.html` updated |

Each phase must complete before the next begins. Do not skip phase 2 and 3 — they are what makes the hybrid coherent rather than a random blend.

## Input contract

```
base_a: {skill-name}          # e.g. "cognitive-core-ui"
base_b: {skill-name}          # e.g. "glassmorphism-ui"
name_suggestion: {optional}   # e.g. "aurora-command-ui" or leave blank
target_domain: {optional}     # e.g. "SOC platform" — narrows expression modes
```

## Output contract

The hybrid must satisfy ALL of the following:
- 8 files (SKILL.md + 7 references) with full content — no placeholders
- 2 HTML previews: dashboard (operational) + landing page (marketing)
- A name that is original and not a concatenation of the parent names
- A new accent that is NOT identical to either parent's accent
- A substrate rule that is clearly stated and non-negotiable
- At minimum 5 expression modes in art-direction.md
- At minimum 20 components in components.md
- A gallery card with a thumbnail that visually communicates the hybrid

## References available

| File | Load when |
|---|---|
| `references/pair-compatibility.md` | Choosing which two skills to combine this week |
| `references/crossover-protocol.md` | Running phases 2 and 3 (identity + crossover spec) |
| `references/output-contract.md` | Running phases 4 and 5 (file generation) |
| `references/naming-registry.md` | Naming the hybrid and checking for conflicts |
| `references/quality-gates.md` | Validating the hybrid before shipping (phase 6) |

## Non-negotiable rules

1. The hybrid must have its own identity — not "A with B colors" but a third thing.
2. The crossover spec must be explicit: what comes from A, what from B, what is new.
3. The accent must be a genuine fusion — not parent A's accent, not parent B's. A new value or gradient pair.
4. The substrate rule is always the first decision. One parent wins the background model.
5. The hybrid's SKILL.md must explicitly name its parents in a `## Hybrid DNA` section.
6. Never combine two skills from the same "family" (e.g. cognitive-core + premium-command = too similar).
7. Every hybrid ships with both previews. No preview = not done.
8. The gallery card thumbnail must visually distinguish the hybrid from both parents.
