# GSD Analysis — Padrões de Orquestração e Execução

> Fonte: agents/, workflows/, sdk/src/
> Data: 2026-03-29
> **ALTA RELEVÂNCIA para AIOSON**

## 1. Wave-based Parallelization

O Planner pré-computa wave assignments:
- Tarefas independentes → `wave: 1`
- Dependentes → `wave: 2`, etc.
- Execute-phase spawna `Task()` por wave com `run_in_background: true`

## 2. Fresh Context Windows (anti-context rot)

- Orchestrator usa 10-15% do contexto de 200k
- Cada subagente recebe 100% de alocação fresca
- Subagentes recebem **file paths**, não conteúdo de arquivo inline

## 3. Subagent Spawning Pattern

```
Task(subagent_type="gsd-executor", prompt=..., run_in_background=true)
```

Validação via spot-checks (SUMMARY.md existe + commits encontrados), não apenas pelo return signal.

## 4. Continuation Protocol

Quando checkpoint é atingido no meio da execução:
1. Escreve HANDOFF.json
2. Spawna agente de continuação fresco com estado explícito
3. NUNCA retoma via reuso de sessão

## 5. Context Engine (SDK)

`ContextEngine` resolve manifests de arquivo por fase:
- Execute phase: contexto mínimo (STATE.md + config)
- Plan phase: contexto abrangente (todos os arquivos primários + opcionais)
- Impede carregamento de arquivos irrelevantes em budgets de contexto apertados

## 6. Gap Closure Loop

```
Verify → encontrar gaps → spawn planner (gap_closure mode)
→ spawn executor (--gaps-only) → re-verify
```
Limitado a 3 iterações.

## 7. Auto-advance com Smart Discuss

Com flag `--auto`, orchestrators encadeiam fases via `Skill()` (não nesting profundo), prevenindo acúmulo de contexto entre fases.

Para modo autônomo, gera "gray area proposal tables" inline (3-4 áreas, uma de cada vez) ao invés de spawnar discuss-phase completo.

## 8. Cross-AI Review

`/gsd:review` detecta CLIs disponíveis (Gemini, Claude, Codex) via `command -v`, exclui o runtime atual, envia prompts idênticos para todos, sintetiza em REVIEWS.md com extração de consenso.

## PLAN.md — Estrutura XML

```xml
---
phase: 02-api
plan: 1
type: execute  # ou: tdd
wave: 1
depends_on: []
autonomous: true
requirements: [REQ-API-1, REQ-API-2]
must_haves:
  truths: ["User can POST /auth/login and receive JWT"]
  artifacts: ["src/routes/auth.ts (>50 lines, exports router)"]
  key_links: ["auth router registered in src/app.ts"]
---

<objective>...</objective>
<context>
  @.planning/PROJECT.md
  @.planning/phases/02-api/CONTEXT.md
</context>
<tasks>
  <task type="auto">
    <name>Create auth router</name>
    <files>src/routes/auth.ts</files>
    <read_first>src/app.ts, src/middleware/</read_first>
    <action>...</action>
    <verify>grep -n "export.*router" src/routes/auth.ts</verify>
    <acceptance_criteria>...</acceptance_criteria>
    <done>Auth router created and exported</done>
  </task>
  <task type="checkpoint:human-verify">
    <name>Verify token flow</name>
    <action>Test login at http://localhost:3000</action>
  </task>
</tasks>
<success_criteria>...</success_criteria>
```

## SUMMARY.md — Frontmatter machine-readable

```yaml
---
dependency_graph:
  requires: [PROJECT.md, CONTEXT.md]
  provides: [auth-router, jwt-middleware]
  affects: [src/routes/, src/middleware/]
requirements: [REQ-API-1, REQ-API-2]
tech_stack: [express, jose, typescript]
file_manifest: [src/routes/auth.ts, src/middleware/auth.ts]
---
```

Habilita montagem eficiente de contexto sem ler arquivos inteiros.

## SDK — Classes principais

- `PhaseRunner` — state machine: discuss → research → plan → plan-check → execute → verify → advance
- `ContextEngine` — resolução de file manifests por fase
- `GSDEventStream` — 28+ variantes de eventos discriminados
- `CostTracker` — isolamento de custo por sessão + agregação cumulativa
- `MilestoneRunner` — orquestração multi-fase com callbacks

Human gate callbacks: `onBlockerDecision`, `onVerificationReview` — default auto-approve quando ausentes.
