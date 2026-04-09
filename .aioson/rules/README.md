# Agent Rules

Rules in this directory are loaded by agents automatically.
Each rule file uses YAML frontmatter to declare which agents it applies to and when.

Rules **override** agent default conventions. Use them for project-specific standards that must be enforced consistently across all sessions.

---

## Frontmatter Format

```yaml
---
name: rule-name
description: One-line description of what this rule enforces
agents: [dev, architect]   # omit to apply to ALL agents
priority: 10               # optional: higher = loaded first (default: 0)
version: 1.0.0
---
```

---

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Unique identifier for the rule |
| `description` | yes | What the rule enforces — used to decide relevance |
| `agents` | no | List of agent names. If absent → all agents load it |
| `priority` | no | Loading order. Higher = loaded first. Default: 0 |
| `version` | no | Semantic version for tracking changes |

---

## Loading Behavior

- If `agents:` is absent → every agent loads the rule (universal rule)
- If `agents:` lists agent names → only those agents load it
- Loaded rules **override** the agent's built-in defaults
- Rules are loaded silently — agents do not announce which rules were loaded
- An agent named `dev` matches a rule with `agents: [dev]`

---

## When to Create a Rule

Create a rule when:
- A convention must be enforced in every implementation session without re-stating it
- A @dev learning has appeared in 3+ sessions and should be promoted to permanent
- The team has decided on a project standard that differs from agent defaults

Do NOT create a rule for:
- One-time decisions (use `design-doc.md` decisions section instead)
- Feature-scoped behavior (use `spec-{slug}.md` or `requirements-{slug}.md`)
- External API knowledge (use `docs/` instead)

---

## Example

See `example-monetary-values.md` in this directory for a working example.

---

## Squad Rules

Rules specific to squad behavior live in `rules/squad/`.
See `rules/squad/README.md` for the squad rules format.
