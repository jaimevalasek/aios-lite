# Fase 6 — Profiler Integration no Squad Flow

> **Prioridade:** P2
> **Depende de:** Fase 1 (@orache)
> **Estimativa de arquivos:** 1 novo, 3 editados

## Conceito

O AIOSON já tem um pipeline de profiling poderoso (profiler-researcher → profiler-enricher → profiler-forge). Mas hoje ele é 100% desconectado do squad creation. O usuário precisa:

1. Rodar `@profiler-researcher` manualmente
2. Rodar `@profiler-enricher` manualmente
3. Rodar `@profiler-forge` para gerar o genome
4. Rodar `@genome` para aplicar ao squad
5. O squad não sabe que o genome veio de um profiling

O OpenSquad integra o "Sherlock" diretamente na criação do squad — se o squad é sobre conteúdo de uma pessoa, o Sherlock analisa os perfis sociais dela antes de gerar os agentes.

### O que muda

Conectar o profiler pipeline ao squad flow para que:

1. Se o squad é sobre uma pessoa ou marca específica, o @squad oferece profiling
2. O profiling roda dentro do flow (não como operação separada)
3. O genome resultante é automaticamente aplicado aos executores relevantes
4. O investigation report do @orache pode incluir profiling de referências

## O que é JS vs. LLM

**JS (deterministico):**
- Detectar se o profiler já rodou para uma pessoa (check `.aioson/profiler-reports/`)
- Verificar se genomes persona existem para o domínio
- Registrar a associação profiling → squad no SQLite

**LLM (requer inteligência):**
- Decidir quando profiling é relevante (o squad é sobre uma pessoa?)
- Executar o pipeline de profiling
- Decidir quais executores recebem o genome

## Mudanças no `squad.md`

### Adicionar nova seção "Profiler integration":

```markdown
## Profiler integration (for persona-based squads)

When the squad creation reveals that the domain revolves around a specific
person, brand, or methodology creator, offer profiling:

Detection heuristics:
- User mentions a specific person by name
- The goal includes "in the style of", "like {person}", "based on {person}'s approach"
- The domain is personal branding, content creation for a specific creator, or methodology replication

When detected:
1. Ask: "This squad seems to be about {person}'s approach. Want me to profile
   them for more authentic agents? (adds 5-10 min)"
2. If yes:
   a. Check if `.aioson/profiler-reports/{person-slug}/` already exists
   b. If exists: read the enriched profile and skip to genome application
   c. If not: invoke the profiler pipeline:
      - @profiler-researcher → gather evidence
      - @profiler-enricher → analyze cognitive patterns
      - @profiler-forge → generate genome
   d. Apply the resulting genome to relevant executors
3. If no: continue with standard squad creation

When a profiling genome is applied during squad creation:
- Record in the blueprint: `"profiling": { "person": "{name}", "genomePath": "{path}" }`
- Mark affected executors with `genomeSource` pointing to the genome
- Include the profiling evidence mode in the executor's Active genomes section
- Add a note in the squad docs: "This squad was profiled from {person}'s methodology"

Integration with @orache:
- When @orache investigates reference voices (D4), it can flag candidates for profiling
- @orache does NOT run profiling itself — it recommends that @squad trigger the pipeline
- This keeps separation of concerns: @orache investigates domains, profiler investigates people
```

## Mudanças no `squad-blueprint.schema.json`

```json
"profiling": {
  "type": "object",
  "properties": {
    "person": { "type": "string" },
    "genomePath": { "type": "string" },
    "genomeSlug": { "type": "string" },
    "evidenceMode": { "type": "string", "enum": ["verified", "inferred", "mixed"] },
    "profiledAt": { "type": "string", "format": "date-time" }
  }
}
```

## Mudanças no `orache.md`

Na dimensão D4 (Reference Voices), adicionar:

```markdown
### Profiling recommendation

When a reference voice is particularly central to the squad's identity
(not just a reference — the squad IS about this person's methodology):

Add to the output:
```
## Profiling Recommendation
- **Person:** {name}
- **Reason:** {why they're central, not just a reference}
- **Profiling value:** high | medium | low
- **Suggestion:** "Consider running @profiler-researcher for a deeper
  cognitive genome of {name}'s methodology"
```

This is a recommendation to @squad, not an action @orache takes.
```

## Fluxo completo integrado

```
User → @squad "Create a content squad for YouTube in the style of MrBeast"
         │
         ├── @squad detects persona mention ("MrBeast")
         │
         ├── @squad asks: "Profile MrBeast for authentic agents?"
         │   ├── No → standard creation
         │   └── Yes ↓
         │
         ├── Check .aioson/profiler-reports/mrbeast/
         │   ├── Exists → read enriched profile, skip to genome
         │   └── Not exists ↓
         │
         ├── @profiler-researcher → evidence collection
         ├── @profiler-enricher → cognitive analysis
         ├── @profiler-forge → genome generation
         │
         ├── Genome applied to: scriptwriter, title-generator
         │   (NOT to: researcher, orquestrador — they don't need persona voice)
         │
         ├── @orache investigates YouTube domain (if user wants investigation)
         │
         └── @squad creates squad with:
             - Investigation report enriching executors
             - Persona genome enriching creative executors
             - Both tracked in blueprint and manifest
```

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `template/.aioson/tasks/squad-profile.md` | CRIAR | Task que orquestra profiling dentro do squad flow |
| `template/.aioson/agents/squad.md` | EDITAR | Seção profiler integration |
| `template/.aioson/agents/orache.md` | EDITAR | Profiling recommendation na D4 |
| `template/.aioson/schemas/squad-blueprint.schema.json` | EDITAR | Campo profiling |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
