# Task: Squad Validate

> Fase de validação do lifecycle. Verifica consistência do pacote.

## Quando usar
- `@squad validate <slug>` — invocação direta
- Automaticamente após `@squad create`
- Quando o CLI `aioson squad:validate <slug>` é executado

## Entrada
- slug do squad (deve existir em `.aioson/squads/<slug>/`)

## Processo

### Camada 1 — Validação de schema
1. Leia `.aioson/squads/<slug>/squad.manifest.json`
2. Valide contra `.aioson/schemas/squad-manifest.schema.json`
3. Campos obrigatórios: schemaVersion, slug, name, mode, mission, goal
4. Se falhar: ERRO com campo faltante e sugestão

### Camada 2 — Validação estrutural
Verifique que existem:
- `.aioson/squads/<slug>/squad.manifest.json` (obrigatório)
- `.aioson/squads/<slug>/agents/agents.md` (obrigatório)
- `.aioson/squads/<slug>/agents/orquestrador.md` (obrigatório)
- Para cada executor em manifest.executors: o arquivo referenciado existe
- Diretórios: `output/<slug>/`, `aioson-logs/<slug>/`

### Camada 3 — Validação semântica (básica nesta fase, aprofundada na Fase 2)
- Slug do manifesto bate com o nome do diretório
- Executores no manifesto têm arquivo correspondente
- Não há executores duplicados

### Relatório
Classifique cada check como:
- ✅ PASS
- ⚠️ WARNING (não bloqueia, mas recomenda correção)
- ❌ ERROR (bloqueia — squad inválido)

Formato de output:
```
═══ Squad Validation: <slug> ═══

Schema:     ✅ PASS
Structure:  ✅ PASS (7/7 files found)
Semantics:  ⚠️ 1 warning
  - executor "analyst" has no skills declared

Result: VALID (1 warning)
```

## Saída
- Relatório de validação (console)
- Status: VALID | VALID_WITH_WARNINGS | INVALID

## Regras
- NÃO corrija problemas automaticamente — apenas reporte
- SUGIRA o comando de correção quando possível (ex: "run @squad extend to add skills")
