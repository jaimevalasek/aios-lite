# GSD Analysis — Context Management: Deep Dive

> Data: 2026-03-29
> Fonte: execute-phase.md, new-project.md, settings.md, state.md template, continuation-format.md

## Como o GSD gerencia contexto

### 1. Static file loading por fase (não um ContextEngine dinâmico)

Não existe classe ContextEngine. Cada workflow tem blocos `<files_to_read>` estáticos declarados no próprio arquivo de workflow.

Para `execute-phase`, cada subagente carrega apenas:
- `{phase_dir}/{plan_file}` — o plano específico
- `.planning/PROJECT.md` — visão e requisitos
- `.planning/STATE.md` — posição atual
- `.planning/config.json` — config
- `./CLAUDE.md` — regras do projeto
- `.claude/skills/` — apenas os `SKILL.md` índices (~130 linhas cada)

**Regra explícita:** "Do NOT load full AGENTS.md files (100KB+ context cost)"

### 2. Context warning toggle (65%)

Settings pergunta 10/12:

```
"Enable context window warnings? (injects advisory messages when context is getting full)"
Options:
  - Yes (Recommended) — Warn when context usage exceeds 65%
  - No — Disable warnings
```

Quando ativado: o modelo injeta mensagem advisory quando detecta 65% de uso.
**Não é monitoramento programático** — é o próprio Claude que se auto-reporta.

### 3. Princípio "disk first"

Declarado explicitamente em `new-project.md`:

> "Write files first, then return. This ensures artifacts persist even if context is lost."

**Disco é source of truth. Contexto é stateless consumer.**

### 4. Continuation format + /clear (manual)

```
---
## ▶ Next Up
`/gsd:execute-phase 2`
<sub>`/clear` first → fresh context window</sub>
---
```

O `/clear` é instrução pedagógica para o usuário. Manual — o usuário deve executar antes do próximo comando.

### 5. STATE.md como memória externa

O que sobrevive ao `/clear`:
- Fase/plano atual (Phase: X of Y)
- Status e data da última atividade
- Velocity metrics (planos concluídos, duração média)
- Log de decisões
- Todos pendentes (referências)
- Blockers
- Pointer para arquivo de resume

O que é perdido ao `/clear`:
- Threads de conversa de questioning sessions
- Decisões intermediárias não escritas em PROJECT.md
- Outputs de pesquisa antes da síntese

### 6. Estratégia por tamanho de modelo

Documentado em `execute-phase.md`:
- **200k models**: orquestrador em 10-15% de uso; subagentes com janelas frescas; passar apenas file paths
- **1M+ models** (Opus 4.6, Sonnet 4.6): contexto mais rico pode ser passado inline; recomendações de /clear relaxadas

### 7. Anti-pattern guard contra analysis loops

Se um agente fizer 5+ chamadas de Read/Grep/Glob seguidas sem Edit/Write/Bash → deve parar e explicar por que não agiu. Previne ciclos de análise que consomem contexto sem produzir.

## O que o GSD NÃO tem

- Indicador visual de progresso de contexto em tempo real
- Token counter
- O termo "Smart Zone" não existe no repo (0 ocorrências)
- Warnings automáticos sem intervenção do modelo

## Como AIOSON pode fazer MELHOR

### Melhoria 1: Context budget guidance nos agentes
Adicionar aos agentes o princípio de "disk first" explicitamente:
- "Escreva o arquivo antes de retornar — se a sessão cair, o trabalho persiste"
- Frase que explica POR QUÊ salvar incrementalmente

### Melhoria 2: Context warning level configurável
O GSD fixa em 65%. AIOSON poderia:
- Avisar em 60% para projetos MEDIUM (mais complexidade por fase)
- Avisar em 75% para projetos MICRO (fases mais curtas)

### Melhoria 3: Anti-pattern guard no @dev e @deyvin
Implementar a regra "5 reads sem write = parar e reportar" — previne loops de análise.

### Melhoria 4: AIOSON context file loading matrix
Criar uma tabela explícita em cada agente:
"Ler quando: [lista mínima] | Não carregar: [lista proibida para este agente]"
Mais granular que o GSD, que tem isso implícito nos workflows.
