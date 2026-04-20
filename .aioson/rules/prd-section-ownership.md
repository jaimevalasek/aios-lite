---
name: prd-section-ownership
description: Define qual agente é dono de cada seção do PRD — outros agentes não podem modificar seções que não são suas
priority: 9
version: 1.0.0
agents: [product, pm, analyst, architect, ux-ui, sheldon]
---

# PRD Section Ownership

`prd.md` and `prd-{slug}.md` are shared documents. Each section has one owner — others may only read or append sub-sections, never replace.

## Ownership table

| PRD Section | Owner | Others may |
|---|---|---|
| `## Objetivo` | `@product` | Read only |
| `## Problema` | `@product` | Read only |
| `## Usuários e Personas` | `@product` | Read only |
| `## Funcionalidades` | `@product` | Read only |
| `## Critérios de Aceite` | `@product` (structure) / `@pm` (enrichment) | `@analyst`, `@architect` add technical sub-items |
| `## Fases de Entrega` | `@pm` | Read only |
| `## Restrições Técnicas` | `@architect` | Read only |
| `## Considerações de UX` | `@ux-ui` | Read only |
| `## Riscos` | `@pm` | `@analyst`, `@architect` add new risks only |
| `## Decisões Registradas` | `@sheldon` (project) / `@pm` (feature) | Read only |

## Modification rule

An agent may only modify sections it owns. Non-owners may only **add** a new sub-section at the end — never replace or rewrite existing content.

## Safe addition pattern

```markdown
## Critérios de Aceite
<!-- @product: owner of this section -->

- CA-01: User can schedule an appointment
- CA-02: System sends confirmation email

### Technical criteria (added by @analyst)
- CA-T01: Scheduling validates availability via DB query before confirming
- CA-T02: Email queue uses BullMQ with 3x retry
```

## On violation detected

1. Do not overwrite the section.
2. Create a sub-section with explicit attribution (`<!-- added by @{agent} -->`), OR create a separate artifact (`requirements-{slug}.md`, `architecture.md`, etc.).
