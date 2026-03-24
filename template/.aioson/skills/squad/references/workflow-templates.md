---
name: workflow-templates
description: Reusable workflow templates for common squad types
version: 1.0.0
---

# Workflow Templates

Starter workflow templates for common squad configurations. Adapt to the
specific domain — these are starting points, not rigid prescriptions.

## Linear content workflow

Best for: single-output content squads (blog post, newsletter, video script).

```json
{
  "slug": "linear-content",
  "phases": [
    { "id": "research", "executor": "researcher" },
    { "id": "draft", "executor": "writer" },
    {
      "id": "review",
      "executor": "editor",
      "review": {
        "reviewer": "editor",
        "criteria": ["clarity", "accuracy", "voice"],
        "onReject": "draft",
        "maxRetries": 2
      }
    },
    { "id": "polish", "executor": "writer" },
    { "id": "publish", "executor": "publisher" }
  ]
}
```

## Parallel content workflow

Best for: multi-format or multi-platform squads producing several pieces simultaneously.

```json
{
  "slug": "parallel-content",
  "phases": [
    { "id": "brief", "executor": "strategist" },
    {
      "id": "create",
      "parallel": true,
      "executors": ["scriptwriter", "copywriter", "designer"]
    },
    {
      "id": "review",
      "executor": "editor",
      "review": {
        "reviewer": "editor",
        "criteria": ["brand-consistency", "platform-fit"],
        "onReject": "create",
        "maxRetries": 1
      }
    },
    { "id": "finalize", "executor": "publisher" }
  ]
}
```

## Research-heavy workflow

Best for: squads where investigation and analysis precede creation.

```json
{
  "slug": "research-heavy",
  "phases": [
    { "id": "scope", "executor": "analyst" },
    { "id": "investigate", "executor": "researcher" },
    { "id": "synthesize", "executor": "analyst" },
    {
      "id": "create",
      "executor": "writer",
      "humanGate": true
    },
    { "id": "review", "executor": "fact-checker" },
    { "id": "publish", "executor": "publisher" }
  ]
}
```

## Software development workflow

Best for: software squads with design-implement-test cycle.

```json
{
  "slug": "software-dev",
  "phases": [
    { "id": "design", "executor": "architect" },
    {
      "id": "implement",
      "executor": "developer",
      "humanGate": true
    },
    { "id": "test", "executor": "qa-engineer" },
    {
      "id": "review",
      "executor": "architect",
      "review": {
        "reviewer": "architect",
        "criteria": ["code-quality", "architecture-fit", "test-coverage"],
        "onReject": "implement",
        "maxRetries": 2
      }
    },
    { "id": "deploy", "executor": "devops" }
  ]
}
```

## Persona-driven workflow

Best for: squads producing content in a specific person's voice.

```json
{
  "slug": "persona-driven",
  "phases": [
    { "id": "research", "executor": "researcher" },
    { "id": "draft", "executor": "ghostwriter", "genome": "{person-slug}" },
    {
      "id": "voice-check",
      "executor": "brand-guardian",
      "genome": "{person-slug}",
      "review": {
        "reviewer": "brand-guardian",
        "criteria": ["voice-fidelity", "methodology-alignment", "authenticity"],
        "onReject": "draft",
        "maxRetries": 2,
        "vetoConditions": ["voice-inconsistency"]
      }
    },
    { "id": "polish", "executor": "ghostwriter", "genome": "{person-slug}" },
    { "id": "approve", "humanGate": true }
  ]
}
```

## Choosing a workflow template

```
What is the squad's primary mode?
├── content
│   ├── Single output → Linear content
│   ├── Multi-platform/format → Parallel content
│   └── Persona-based → Persona-driven
├── research
│   └── → Research-heavy
├── software
│   └── → Software development
└── mixed
    └── Start with Linear content, add parallel phases as needed
```

## Customization guidelines

- **Add phases** for additional quality gates or specialized steps
- **Remove phases** if the squad is lightweight (micro squad)
- **Add review blocks** to any phase that produces user-facing output
- **Add humanGate** to phases with irreversible or high-stakes decisions
- **Add vetoConditions** to review phases in regulated domains
