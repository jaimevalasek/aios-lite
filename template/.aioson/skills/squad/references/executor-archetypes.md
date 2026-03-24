---
name: executor-archetypes
description: Common executor roles and their recommended configurations across squad types
version: 1.0.0
---

# Executor Archetypes

Reference catalog of common executor roles. Use as inspiration when designing
squad executors — adapt to the specific domain, don't copy blindly.

## Content squads

### Scriptwriter / Copywriter
- **Type:** agent
- **Model tier:** powerful
- **Focus:** narrative structure, audience engagement, brand voice
- **When to use:** Any squad producing written content
- **Genome:** Apply persona genome if persona-based squad

### Editor / Reviewer
- **Type:** agent
- **Model tier:** balanced
- **Focus:** clarity, grammar, factual accuracy, brand consistency
- **When to use:** Squads with quality review requirements
- **Genome:** Apply persona genome for voice consistency checks

### Researcher / Analyst
- **Type:** agent
- **Model tier:** balanced
- **Focus:** data gathering, trend analysis, competitive intelligence
- **When to use:** Squads that need evidence-based content
- **Genome:** Do not apply persona genome

### SEO Specialist
- **Type:** agent
- **Model tier:** balanced
- **Focus:** keyword research, meta descriptions, search optimization
- **When to use:** Content squads targeting search traffic

### Trend Analyst
- **Type:** agent
- **Model tier:** balanced
- **Focus:** platform trends, competitor analysis, topic suggestions
- **When to use:** Social media and content squads

### Visual Strategist / Thumbnail Designer
- **Type:** agent
- **Model tier:** balanced
- **Focus:** visual concepts, thumbnail psychology, brand visual identity
- **When to use:** Video and social media squads

## Software squads

### Architect
- **Type:** agent
- **Model tier:** powerful
- **Focus:** system design, API contracts, technology decisions
- **When to use:** Software squads building new systems

### Developer
- **Type:** agent
- **Model tier:** powerful
- **Focus:** implementation, code quality, testing
- **When to use:** All software squads

### QA Engineer
- **Type:** agent
- **Model tier:** balanced
- **Focus:** test coverage, edge cases, regression testing
- **When to use:** Software squads with quality requirements

### DevOps / Infrastructure
- **Type:** agent or worker
- **Model tier:** balanced or none
- **Focus:** deployment, CI/CD, monitoring
- **When to use:** Software squads with deployment needs

## Universal roles

### Orchestrator
- **Type:** agent
- **Model tier:** powerful
- **Focus:** coordination, workflow management, conflict resolution
- **When to use:** Every squad with 3+ executors
- **Genome:** Do not apply persona genome
- **Special:** Has access to all executor outputs, manages workflow state

### Worker (deterministic)
- **Type:** worker
- **Model tier:** none
- **usesLLM:** false
- **Focus:** file operations, data transformation, validation, API calls
- **When to use:** Any step that can be done with a script (no judgment needed)
- **Examples:** format validator, image resizer, link checker, data formatter

### Fact-Checker
- **Type:** agent
- **Model tier:** balanced
- **Focus:** source verification, claim validation, accuracy
- **When to use:** Content squads in sensitive domains (health, finance, legal, news)

## Executor classification decision tree

```
Is the task deterministic (same input → same output)?
├── Yes → worker (type: worker, modelTier: none, usesLLM: false)
└── No → agent
    ├── Does it require complex reasoning or creativity?
    │   ├── Yes → modelTier: powerful
    │   └── No → modelTier: balanced
    └── Is it a quick formatting/checking task?
        └── Yes → modelTier: fast
```

## Sizing guidelines

| Squad size | Executors | Orchestrator? |
|---|---|---|
| Micro (1-2 outputs) | 2-3 | Optional |
| Standard (3-5 outputs) | 3-5 | Recommended |
| Large (6+ outputs) | 5-8 | Required |
| Pipeline stage | 2-4 | Optional |
