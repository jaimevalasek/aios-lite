---
description: "Feature dossier schema (canônico v1.0). Lido por src/dossier/schema.js — toda mudança aqui exige bump de schema_version."
---

# Feature Dossier — Schema canônico

## Path

`.aioson/context/features/{slug}/dossier.md`

Onde `{slug}` é kebab-case: `^[a-z0-9][a-z0-9-]*$`.

## Estrutura geral

```markdown
---
<frontmatter YAML — ver § Frontmatter>
---

## Why
<extraído de prd-{slug}.md, ou prompt interativo>

## What
<extraído de prd-{slug}.md § Escopo do MVP, ou prompt interativo>

## Code Map

```yaml
files: []
modules: []
patterns: []
```

## Rules & Design-Docs aplicáveis

(vazio na Phase 1 — populado a partir da Phase 2 via `dossier:link-rule`)

## Agent Trail

(vazio na Phase 1 — populado a partir da Phase 2 via `dossier:add-finding`)

## Revision Requests

(vazio na Phase 1 — populado a partir da Phase 2 via `revision:open`)
```

## Frontmatter (v1.0)

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `feature_slug` | string | sim | kebab-case; deve bater com o nome do diretório pai |
| `schema_version` | string | sim | `"1.0"` em Phase 1 |
| `created_by` | string | sim | id de agente canônico OU `dossier-init` |
| `created_at` | string | sim | ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ` ou `YYYY-MM-DDTHH:mm:ss.sssZ`) |
| `status` | string | sim | `active` \| `completed` |
| `classification` | string | sim | `MICRO` \| `SMALL` \| `MEDIUM` |
| `last_updated_by` | string | sim | id de agente canônico OU `dossier-init` |
| `last_updated_at` | string | sim | ISO 8601 |

## IDs de agentes canônicos (v1.0)

Fonte de verdade: `.aioson/agents/*.md`. A lista abaixo deve estar sincronizada com `src/dossier/schema.js#CANONICAL_AGENT_IDS`.

```
analyst, architect, committer, copywriter, cypher, design-hybrid-forge,
dev, deyvin, discover, discovery-design-doc, genome, neo, orache, orchestrator,
pair, pentester, pm, product, profiler-enricher, profiler-forge, profiler-researcher,
qa, setup, sheldon, site-forge, squad, tester, ux-ui, validator
```

Pseudo-id permitido em `created_by` / `last_updated_by` apenas: `dossier-init` (origem CLI).

## Seções obrigatórias

Em ordem (parser tolera ordem mas writers devem manter):

1. `## Why`
2. `## What`
3. `## Code Map`
4. `## Rules & Design-Docs aplicáveis`
5. `## Agent Trail`
6. `## Revision Requests`

## Roadmap de schema

- **v1.0** (Phase 1): este documento.
- **v1.1** (Phase 3): adiciona `code_map.schema_version`, `linked_artifacts.{name}.{path,synced_at,mtime_at_sync,size_at_sync}` no frontmatter, e role enum estendida em entradas do `Code Map`. Forward-compat reader bidirecional. Migração opt-in via `aioson dossier:migrate {slug} --to=1.1`.
