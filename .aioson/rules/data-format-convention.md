---
name: data-format-convention
description: Which file format to use when producing or consuming structured data — YAML for agent-readable reference data, Markdown for narrative, JSON for machine-consumed data
priority: 8
version: 1.0.0
---

# Data Format Convention

Use the right format for the right consumer. The same data structure reads very differently depending on who (or what) will consume it next.

## The three formats and their consumers

### YAML — structured data consumed by agents

Use `.yaml` when the output is structured reference data that **another agent or squad executor will read field-by-field** to make decisions or produce content.

LLMs read YAML more accurately than JSON for structured reference data because YAML allows comments, avoids excessive punctuation, and mirrors natural document structure.

**Use YAML for:**
- ICP definitions, persona profiles, audience segments
- Offer sheets, product definitions, pricing structures
- Brand guidelines (structured parts: tone, values, vocabulary, positioning)
- Competitive analysis snapshots (structured fields)
- Briefing data that a copy squad or design squad will consume
- Entity catalogs referenced across multiple sessions

**Naming:** `{slug}.yaml` in the relevant squad output or context directory.

**Example — ICP profile (`icp-primary.yaml`):**
```yaml
# ICP — Primary Audience
# Created by: @research-squad | Updated: 2026-04-02

profile:
  name: "Empreendedor Refém"
  description: "Dono de negócio que depende de agências ou devs externos"

pain_points:
  - Perda de controle sobre o produto
  - Atrasos e custos imprevisíveis
  - Não consegue validar qualidade do que recebe

desired_outcome: "Autonomia e velocidade — entregar sem depender de terceiros"

buying_trigger: "Prazo vencendo ou fatura chegando de dev que atrasou"

messaging:
  primary: "Retome o controle do seu produto"
  objection_1: "Não preciso saber programar?"
  objection_1_answer: "Não. Você vai orquestrar, não digitar código."

channels: [instagram, linkedin, youtube]
```

---

### Markdown — narrative content consumed by humans and agents linearly

Use `.md` when the output is narrative — content that flows as text and benefits from headers, lists, and prose.

**Use Markdown for:**
- Reports, analyses, article drafts
- Scripts, hooks, copy blocks
- Agent instructions and rules (this file is an example)
- Specs, PRDs, discovery documents
- Any output meant to be read from top to bottom

**Never use YAML or JSON for:** articles, scripts, agent instructions, PRDs, analysis narratives, README files.

---

### JSON — structured data consumed by machines

Use `.json` when the output is consumed by code — CLIs, APIs, webhooks, dashboards, or configuration parsers.

**Use JSON for:**
- `squad.manifest.json` — consumed by the AIOSON CLI and dashboard
- `content.json` — consumed by the webhook server and dashboard
- API payloads and webhook responses
- CLI configuration files
- Any file that `JSON.parse()` will read programmatically

**Never change to YAML:** `squad.manifest.json`, `content.json`, `squad.json`, `aioson-models.json`. These are machine-consumed and must stay JSON for CLI compatibility.

---

## Decision rule (apply in this order)

```
Will a machine (CLI, API, webhook, dashboard) consume this file?
  YES → JSON

Will a human or agent read this top-to-bottom as narrative?
  YES → Markdown

Will an agent reference specific fields to make decisions or produce content?
  YES → YAML
```

If uncertain: prefer Markdown. Only use YAML when the structured fields are the point — not the prose.

---

## Squad executor guidance

When a squad executor produces output, choose the format based on what happens next:

| Output type | Format | Example |
|---|---|---|
| Report, article, script | `.md` | `output/content-squad/ep-001/script.md` |
| ICP, persona, audience profile | `.yaml` | `output/research-squad/icp-primary.yaml` |
| Brand data, offer sheet | `.yaml` | `output/brand-squad/offer-advanced.yaml` |
| Competitive analysis (structured) | `.yaml` | `output/research-squad/competitors.yaml` |
| Competitive analysis (narrative) | `.md` | `output/research-squad/market-report.md` |
| Webhook payload, API response | `.json` | handled by `content.json` convention |
| Squad manifest, config | `.json` | `squad.manifest.json` (do not change) |

**Cross-squad consumption:** when Squad A produces data that Squad B will consume, prefer YAML for structured reference data. The receiving squad's executor can reference `output/squad-a/{file}.yaml` directly and access fields with precision — more reliable than parsing a Markdown table.

---

## What NOT to change

- Files with `.json` extension consumed by the AIOSON CLI or dashboard
- Agent instruction files (`agents/*.md`) — narrative, not data
- Existing specs and context files (`spec-*.md`, `discovery.md`, `architecture.md`) — mixed narrative + structure, Markdown is correct
- YAML frontmatter inside `.md` files — this is already the right pattern for metadata

---

## Why this matters

The same structured content stored as JSON or Markdown loses precision when an agent reads it. A JSON blob requires the agent to mentally parse brackets and quotes while tracking field relationships. A Markdown table requires the agent to infer column semantics from headers. A YAML document makes field names, nesting, and relationships immediately legible — the LLM spends its attention on the content, not the syntax.

For squads that pass structured data between executors across sessions, this compounds: each session starts fresh, and a YAML profile loads faster and more accurately into working context than an equivalent JSON or Markdown representation.
