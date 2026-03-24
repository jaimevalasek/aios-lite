---
name: squad-skills
description: Router and index for squad creation skills — domain knowledge, format templates, patterns, and references
version: 1.0.0
---

# Squad Skills Router

This directory contains knowledge that enriches the `@squad` agent during squad creation.

## Directory structure

```
skills/squad/
├── SKILL.md           ← you are here (router)
├── domains/           ← domain-specific knowledge (e.g., youtube-content.md)
├── formats/           ← content format templates (e.g., instagram-feed.md)
├── patterns/          ← reusable structural patterns (e.g., review-loop-pattern.md)
└── references/        ← reference materials (e.g., executor-archetypes.md)
```

## Loading strategy

When creating a squad:

1. **Read this file** to understand what's available
2. **Check `domains/`** for a skill matching the squad's domain
   - Exact match → load it
   - Similar match → load and adapt
   - No match → proceed with LLM knowledge
3. **Check `patterns/`** for relevant structural patterns
   - Review loops needed → load `review-loop-pattern.md`
   - Multi-platform squad → load `multi-platform-pattern.md`
   - Persona-driven squad → load `persona-based-pattern.md`
   - Pipeline between squads → load `pipeline-pattern.md`
4. **Check `formats/`** for content format templates
   - Load only formats relevant to the squad's target platforms
5. **Check `references/`** for supporting material
   - Executor inspiration → `executor-archetypes.md`
   - Quality gates → `checklist-templates.md`
   - Workflow ideas → `workflow-templates.md`

## NEVER load everything at once

Only load skills that are directly relevant to the current squad.
A software squad doesn't need instagram-feed.md.
A YouTube squad doesn't need legal-consulting.md.

## Adding new skills

Anyone can add skills to enrich future squad creations:

- **Domain skill:** Create `domains/{domain-name}.md` with recommended executors, anti-patterns, quality benchmarks, and structural patterns for that domain.
- **Format template:** Create `formats/{format-name}.md` with content structure, sections, and block types.
- **Pattern:** Create `patterns/{pattern-name}.md` with a reusable structural pattern.
- **Reference:** Create `references/{reference-name}.md` with supporting material.

The `@orache` investigator can suggest creating domain skills after completing an investigation.
