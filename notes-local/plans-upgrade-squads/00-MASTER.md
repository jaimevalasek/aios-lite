# AIOS Lite — Squad Upgrade: Plano de Implementação

> **Para:** Claude Code (Sonnet 4.6)
> **Projeto:** github.com/jaimevalasek/aios-lite
> **Data:** 2026-03-10

## Como usar este plano

Este upgrade está dividido em **5 fases independentes**. Cada fase tem seu próprio arquivo com instruções completas. **Implemente uma fase por vez**, valide, commite, e só então avance para a próxima.

**Sequência obrigatória:**

```
Fase 1 (P0) → Fase 2 (P1) → Fase 3 (P2) → Fase 4 (P2-P3) → Fase 5 (P3)
                  ↘
              Fase 6 (P1-P2) — pode rodar em paralelo após Fase 1
```

## Arquivos de implementação

| Arquivo | Fase | O que implementa | Depende de |
|---------|------|-------------------|------------|
| `01-FASE-1-fundamentos.md` | Fundamentos (P0) | Schemas, blueprint, tasks design/create/validate, refactor do squad.md | Nada |
| `02-FASE-2-robustez.md` | Robustez (P1) | Validação semântica, readiness, templates oficiais, squad-doctor upgrade | Fase 1 |
| `03-FASE-3-analyze-extend.md` | Analyze & Extend (P2) | squad-analyze, squad-extend, export, integração dashboard | Fase 2 |
| `04-FASE-4-repair-genomes.md` | Repair & Genomes (P2-P3) | squad-repair, migração, genomes auditáveis, dry-run | Fase 2 |
| `05-FASE-5-inter-squad.md` | Orquestração Inter-Squad (P3) | Pipeline DAG, registry, meta-orquestrador, dashboard visual | Fases 3+4 |
| `06-FASE-6-artisan-squad.md` | Artisan Squad (P1-P2) | Chat incubador de ideias, PRD de squad, Prompt Id, relatórios | Fase 1 |

## Contexto do codebase (leia antes de começar)

### ⚠️ REGRA CRÍTICA: NÃO DELETAR NADA QUE JÁ EXISTE

Este plano é **100% aditivo**. O projeto já tem dezenas de arquivos e diretórios que NÃO estão listados aqui. A estrutura abaixo mostra APENAS os arquivos relevantes para o upgrade do squad — é um recorte parcial, não a estrutura completa.

**NUNCA:**
- Deletar, mover ou renomear arquivos existentes (exceto edições explícitas indicadas no plano)
- Assumir que a estrutura abaixo é tudo que existe — o projeto tem muito mais
- Sobrescrever arquivos existentes sem instrução explícita (o plano indica claramente quando editar vs. criar)

**SEMPRE:**
- Criar novos arquivos/diretórios conforme indicado
- Ao editar arquivos existentes (como `squad.md`, `cli.js`, `constants.js`): ADICIONAR conteúdo, não substituir
- Preservar toda a lógica, agentes, skills, configs, testes e comandos já existentes

### Arquivos relevantes para o upgrade (recorte parcial — o projeto tem muito mais)
```
aios-lite/
├── src/
│   ├── cli.js                          # CLI principal — EDITAR para adicionar novos comandos
│   ├── constants.js                    # Paths dos templates — EDITAR para adicionar novos paths
│   ├── runtime-store.js                # SQLite — JÁ TEM tabelas squads, squad_executors, etc.
│   ├── ... (vários outros arquivos)    # NÃO TOCAR — preservar tudo
│   └── commands/
│       ├── squad-doctor.js             # Saúde do squad (334 linhas) — EDITAR na Fase 2
│       ├── squad-status.js             # Status dos squads (418 linhas) — NÃO TOCAR
│       └── ... (outros comandos)       # NÃO TOCAR — preservar tudo
├── template/
│   └── .aios-lite/
│       ├── agents/
│       │   ├── squad.md                # Agente principal (760 linhas) — EDITAR (adicionar routing)
│       │   ├── dev.md                  # NÃO TOCAR
│       │   ├── qa.md                   # NÃO TOCAR
│       │   ├── analyst.md              # NÃO TOCAR
│       │   ├── architect.md            # NÃO TOCAR
│       │   ├── genoma.md               # EDITAR apenas na Fase 4 (dry-run de genomes)
│       │   ├── orchestrator.md         # NÃO TOCAR
│       │   └── ... (outros agentes)    # NÃO TOCAR — preservar tudo
│       ├── locales/{pt-BR,en,es,fr}/agents/squad.md  # EDITAR para espelhar mudanças do squad.md
│       ├── squads/.gitkeep             # Onde os squads ficam
│       ├── squads/memory.md            # NÃO TOCAR
│       ├── skills/                     # NÃO TOCAR — skills estáticas e dinâmicas existentes
│       ├── genomas/.gitkeep            # NÃO TOCAR
│       ├── context/                    # NÃO TOCAR
│       ├── mcp/                        # NÃO TOCAR
│       └── config.md                   # NÃO TOCAR
├── tests/
│   ├── squad-doctor.test.js            # Testes existentes — NÃO TOCAR
│   ├── squad-status-command.test.js    # Testes existentes — NÃO TOCAR
│   └── ... (muitos outros testes)      # NÃO TOCAR — preservar tudo
├── docs/                               # NÃO TOCAR
├── mapping/                            # NÃO TOCAR
└── package.json                        # EDITAR apenas se adicionar dependência (improvável)
```

**Novos diretórios/arquivos que este plano CRIA (não existem ainda):**
```
template/.aios-lite/schemas/            # NOVO — JSON Schemas (Fase 1)
template/.aios-lite/tasks/              # NOVO — Task files para o lifecycle (Fase 1)
template/.aios-lite/templates/squads/   # NOVO — Templates oficiais (Fase 2)
src/commands/squad-validate.js          # NOVO — CLI validate (Fase 1)
src/commands/squad-export.js            # NOVO — CLI export (Fase 3)
src/commands/squad-pipeline.js          # NOVO — CLI pipeline (Fase 5)
tests/squad-validate.test.js            # NOVO — Testes validate (Fase 1)
tests/squad-export.test.js              # NOVO — Testes export (Fase 3)
tests/squad-pipeline.test.js            # NOVO — Testes pipeline (Fase 5)
```

**Novos arquivos no dashboard (aios-lite-dashboard):**
```
app/pipelines/                          # NOVO — Pipeline editor (Fase 5)
app/artisan/                            # NOVO — Artisan Squad chat + CRUD (Fase 6)
app/api/pipelines/                      # NOVO — API routes pipelines (Fase 5)
app/api/artisan/                        # NOVO — API routes artisan (Fase 6)
components/pipelines/                   # NOVO — Componentes do pipeline editor (Fase 5)
components/artisan/                     # NOVO — Componentes do artisan (Fase 6)
lib/artisan-prompt.ts                   # NOVO — System prompt do Artisan (Fase 6)
```

### Convenções importantes
- CLI: `node:test` + `node:assert/strict` para testes
- Módulos: `'use strict'` + CommonJS (`require`)
- Paths: sempre relativos ao projeto root
- SQLite: via `better-sqlite3` (já instalado)
- i18n: traduções em `src/i18n/`
- Agent files: começam com `# Agent @nome` + bloco `> ⚡ ACTIVATED`

### SQLite — tabelas que JÁ existem para squads
```sql
squads (squad_slug PK, name, mode, mission, goal, status, visibility, manifest_json, ...)
squad_executors (squad_slug, executor_slug, title, role, file_path, skills_json, genomes_json)
squad_skills (squad_slug, skill_slug, title, description)
squad_mcps (squad_slug, mcp_slug, required, purpose)
squad_genomes (squad_slug, genome_slug, scope_type, agent_slug)
```

A função `upsertSquadManifest(db, options)` em `runtime-store.js` já faz INSERT/UPDATE completo.

### Regra de ouro
- **Estrutura rígida** (schemas, paths, contratos) = código JS/JSON
- **Inteligência flexível** (design, análise, sugestões) = instruções no agente MD para o LLM executar
- Manter o aios-lite LEVE — não criar scripts pesados onde o LLM pode fazer melhor
