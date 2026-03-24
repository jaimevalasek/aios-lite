# Squad Creation Rules

Rules in this directory are automatically loaded by the `@squad` agent during squad creation.

## How it works

1. Create a `.md` file in this directory
2. Add YAML frontmatter with `name`, `description`, and optional `applies_to` / `domains` fields
3. The `@squad` agent reads matching rules before creating any squad

## Frontmatter format

```yaml
---
name: my-rule-name
description: One-line description of what this rule enforces
applies_to: [content]          # optional: content, software, research, mixed
domains: [youtube, instagram]  # optional: restrict to specific domains
priority: 10                   # optional: higher = loaded first
version: 1.0.0
---
```

## Field reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Unique identifier for the rule |
| `description` | yes | What the rule enforces |
| `applies_to` | no | Squad modes this rule applies to. If absent, applies to all. |
| `domains` | no | Specific domains. If absent, applies to all domains within `applies_to`. |
| `priority` | no | Loading order (higher first). Default: 0 |
| `version` | no | Semantic version for tracking changes |

## Example

```markdown
---
name: content-review-policy
description: All content squads must include a review step in their workflow
applies_to: [content]
priority: 5
version: 1.0.0
---

# Content Review Policy

Every content squad MUST include at least one review step in its workflow.
The review step MUST be assigned to a different executor than the one who produced the content.
```
