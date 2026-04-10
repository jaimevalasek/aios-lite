# Phantom — Self-Evolution Engine (Análise Profunda)

**Fonte:** https://github.com/ghostwright/phantom
**Data:** 2026-03-30
**Módulo:** `src/evolution/`

---

## O que é

Pipeline de 6 etapas que roda **após cada sessão do agente** e refina automaticamente os arquivos de configuração do próprio agente. Nenhuma intervenção humana necessária.

---

## Arquitetura do Pipeline

### Passo 1 — Extração de Observações (`reflection.ts`)
- Chama Claude Sonnet via LLM judge para extrair da transcrição da sessão:
  - Correções do usuário
  - Preferências
  - Fatos de domínio
  - Erros cometidos pelo agente
  - Padrões de uso de ferramentas
- **Fallback:** regex heurístico via `src/shared/patterns.ts` quando LLM indisponível

### Passo 2 — Self-Critique (`reflection.ts: buildCritiqueFromObservations()`)
- Constrói um `CritiqueResult` separado da extração
- Usa prompt dedicado `buildReflectionPrompt()` para **evitar self-serving bias**
- Referência: pesquisa "Multi-Agent Reflexion" (citada no código)

### Passo 3 — Geração de Deltas (`reflection.ts: generateDeltas()`)
- Converte sugestões da crítica em objetos `ConfigDelta`:
  ```typescript
  { file, type: "append"|"replace"|"remove", content, target, rationale, tier }
  ```

### Passo 4 — Validação com 5 Gates (`validation.ts`)
Todos os 5 gates precisam passar para um delta ser aprovado:

| Gate | Estratégia LLM | O que verifica |
|------|---------------|----------------|
| Constitution | Triple Sonnet, minority veto | Princípios imutáveis |
| Safety | Triple Sonnet, minority veto | Conteúdo perigoso (auto-preservação, expansão de permissões) |
| Regression | Cascaded Haiku→Sonnet | Contradições com golden suite |
| Size | Heurístico | Limite de 200 linhas |
| Drift | Cosine similarity (Jaccard fallback) | Threshold 0.7 |

**Nota:** Gates safety-critical falham fechados (fail-closed) em caso de erro.

### Passo 5 — Aplicação (`application.ts: applyApproved()`)
- Escreve deltas aprovados em `phantom-config/`
- Bump de versão em `version.json`
- Appenda em `evolution-log.jsonl`
- Sessões bem-sucedidas de correção são promovidas para o golden suite

### Passo 6 — Consolidação Periódica (`consolidation.ts`)
- Roda a cada N sessões (default: 10)
- Clustera correções/preferências repetidas por sobreposição de palavras
- Extrai princípios para `memory/principles.md`
- Poda o log de sessões
- Comprime arquivos grandes (mantém header + entradas mais recentes)

---

## Sistema de Tiers de Configuração

```
ConfigTier = "immutable" | "constrained" | "free"
```

Arquivos em `phantom-config/`:
- `constitution.md` — **Imutável**, nunca tocado pela evolution engine
- `persona.md` — Estilo de comunicação do agente
- `user-profile.md` — Preferências e correções do usuário (alvo principal)
- `domain-knowledge.md` — Expertise acumulada
- `strategies/task-patterns.md`, `tool-preferences.md`, `error-recovery.md` — Estratégias aprendidas

---

## 6 LLM Judges

| Judge | Modelo | Estratégia | Propósito |
|-------|--------|-----------|-----------|
| observation-judge | Sonnet | Single | Extrai observações da sessão |
| safety-judge | Sonnet | Triple, minority veto | Bloqueia mudanças inseguras |
| constitution-judge | Sonnet | Triple, minority veto | Enforça princípios imutáveis |
| regression-judge | Haiku→Sonnet | Cascaded | Verifica golden suite |
| consolidation-judge | Sonnet | Single | Comprime observações em princípios |
| quality-judge | Sonnet | Single | Avalia qualidade da sessão, detecta regressões |

---

## Auto-Rollback

- Após cada evolução, métricas são verificadas
- Se taxa de sucesso cair mais de 10% numa janela de 5 sessões → rollback automático
- Configurável via `config/evolution.yaml`

---

## Relevância para AIOSON

### Mapeamento direto
- **Squad learning adaptativo** (já no roadmap `project_implementation_plan_and_learning.md`):
  - Passo 1-3 do pipeline = como agentes AIOSON aprenderiam com sessões
  - O tier system (immutable/constrained/free) se mapeia bem para `.aioson/agents/*.md` (imutável) vs configs por projeto (livre)
- **Verification gate** (gap identificado no `project_superpowers_analysis.md`):
  - O gate de validação 5-step é exatamente o padrão que falta no AIOSON

### O que adaptar
1. **Simplificar para o contexto AIOSON:**
   - AIOSON não tem sessões persistentes longas como Phantom
   - Os "deltas" seriam aplicados a arquivos `.aioson/context/` ou configs de squad
   - Não precisa de Qdrant — file-based já funciona para o tier 1

2. **O conceito de golden suite** é especialmente valioso:
   - AIOSON poderia manter `searchings/golden-cases.jsonl` com exemplos validados por projeto
   - Agentes que contradizem casos validados são bloqueados

3. **Constitution imutável:**
   - Equivalente: `.aioson/agents/*.md` não deve ser modificado por evolução
   - Apenas `.aioson/context/` e configs de squad são "free tier"

### Arquivos chave para referência
- `src/evolution/engine.ts` — orquestração do pipeline
- `src/evolution/validation.ts` — os 5 gates
- `src/evolution/types.ts` — tipos base (ConfigDelta, SessionObservation, etc.)
- `config/evolution.yaml` — configuração runtime
