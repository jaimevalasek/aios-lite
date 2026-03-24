---
name: pipeline-pattern
description: How to configure pipelines between squads for multi-stage workflows
version: 1.0.0
---

# Pipeline Pattern

A pipeline connects two or more squads so that the output of one becomes the
input of the next. This pattern enables complex multi-stage workflows where
each squad has a distinct responsibility.

## When to use

- Content pipeline: research squad → writing squad → publishing squad
- Software pipeline: design squad → implementation squad → QA squad
- Data pipeline: collection squad → analysis squad → reporting squad
- Any workflow where stages have fundamentally different skill requirements

## Structure

### Ports (input/output contract)

Each squad in a pipeline declares its ports:

```json
{
  "ports": {
    "inputs": [
      { "key": "research-brief", "from": "research-squad", "format": "markdown" }
    ],
    "outputs": [
      { "key": "draft-content", "to": "publishing-squad", "format": "content.json" }
    ]
  }
}
```

### Pipeline definition

```json
{
  "pipeline": {
    "stages": [
      { "squad": "research-squad", "output": "research-brief" },
      { "squad": "writing-squad", "input": "research-brief", "output": "draft-content" },
      { "squad": "publishing-squad", "input": "draft-content" }
    ],
    "trigger": "manual",
    "errorStrategy": "stop-on-failure"
  }
}
```

## Key decisions

### Trigger modes

| Mode | Behavior |
|---|---|
| `manual` | User explicitly starts each stage |
| `on-complete` | Next stage starts automatically when previous completes |
| `scheduled` | Stages run on a schedule (e.g., research Monday, writing Wednesday) |

### Error handling

| Strategy | Behavior |
|---|---|
| `stop-on-failure` | Pipeline halts, user intervenes |
| `retry` | Failed stage retries N times before halting |
| `skip` | Failed stage is skipped, next stage gets partial input |

### Data handoff format

Squads should agree on a data contract. Recommended formats:

- `content.json` — for structured content packages
- Markdown files — for research reports, briefs, analysis
- JSON files — for structured data, configurations
- File references — for media assets

## Executor design for pipelines

Pipeline squads tend to be more focused than standalone squads:

| Squad in pipeline | Typical executors |
|---|---|
| Research stage | researcher, analyst, fact-checker |
| Creation stage | writer, designer, reviewer |
| Publishing stage | formatter, publisher, distributor |

Each squad should have clear input expectations and output guarantees.

## Anti-patterns

- **Monolith squad:** If a squad has 8+ executors covering research, creation, and distribution, consider splitting into a pipeline.
- **Implicit contracts:** Squads in a pipeline must agree on data format. Don't assume.
- **Tight coupling:** Each squad should be independently testable and runnable.
- **Missing error handling:** Always define what happens when a stage fails.

## Cross-squad awareness

Squads with ports contribute to the Quality Structural scoring dimension:
- +3 pts for having ports defined (inputs or outputs)

The squad:doctor also checks for port consistency across connected squads.
