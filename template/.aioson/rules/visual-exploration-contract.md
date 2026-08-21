---
name: visual-exploration-contract
description: Keeps pre-briefing visual explorations isolated, attributable, reviewable, and non-canonical until human selection and Briefing promotion
agents: [briefing, refiner, product, planner, dev]
priority: 85
version: 1.0.0
modes: [planning, executing]
task_types: [visual-exploration, redesign, screenshot-reference, multi-model-design]
load_tier: trigger
triggers: [visual exploration, design arena, screenshots, prints, compare models, pre-briefing prototype]
aliases: [A/B design, visual redesign, design benchmark]
entities: [Exploration, Prototype, Briefing]
retrieval_intents: [planning, feature, design]
paths: [.aioson/explorations/**, .aioson/briefings/**]
---

# Visual Exploration Contract

- Treat `.aioson/explorations/{slug}/exploration-manifest.json` as the structured exploration state. Markdown and HTML surfaces are derived views.
- An exploration is non-canonical. Product, Planner, Dev, and QA must ignore it unless `plans/{briefing-slug}/visual-exploration.md` was prepared, Briefing incorporated it, and Refiner later created the canonical feature-owned prototype.
- Never overwrite a run. Each model or material restart receives a new `runs/variant-*/` directory.
- Preserve requested and resolved host/model provenance. Never substitute a benchmark model silently.
- Preserve reusable prompts in every run report. Do not delete rejected-run reports.
- Keep benchmark inputs isolated; cumulative learning requires an explicit cumulative policy and parent run.
- Workers may not write project state. They return artifacts; the parent CLI persists only inside the assigned run directory.
- Copy or fingerprint supplied references. A temporary external path alone is not durable evidence.
- Separate screenshot observations, repository facts, inference, and proposals.
- Selection is not Briefing approval. Promotion prepares a source pack; it never creates, approves, or bypasses a Briefing.
