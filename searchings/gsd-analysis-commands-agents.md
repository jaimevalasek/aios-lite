# GSD Analysis — Comandos e Agentes

> Fonte: https://github.com/gsd-build/get-shit-done
> Data: 2026-03-29

## 89 Comandos — categorias principais

### Ciclo de projeto
- `/gsd:new-project [--auto @file.md]` — 5 estágios: questioning → research → requirements → roadmap → config
- `/gsd:new-milestone [--reset-phase-numbers]`
- `/gsd:complete-milestone <version>` — archive + evolução do PROJECT.md + git tag
- `/gsd:audit-milestone` — cross-reference de 3 fontes de requisitos

### Loop principal de fase
- `/gsd:discuss-phase [N]` — extração de gray areas → CONTEXT.md
- `/gsd:plan-phase [N] [--research] [--gaps] [--skip-verify] [--prd <file>] [--reviews] [--text]`
- `/gsd:execute-phase [N] [--wave N] [--gaps-only] [--interactive]`
- `/gsd:verify-work [N]` — UAT conversacional com auto-gap-closure
- `/gsd:ship [N]` — pre-flight checks + `gh pr create`
- `/gsd:validate-phase [N]` — Nyquist test coverage audit
- `/gsd:ui-phase [N]` — gera UI-SPEC.md design contract

### Continuidade de sessão
- `/gsd:pause-work` — escreve HANDOFF.json + .continue-here.md
- `/gsd:resume-work` — restaura contexto completo
- `/gsd:session-report` — resumo pós-sessão

### Execução helper
- `/gsd:quick [--discuss] [--research] [--full]` — tarefas ad-hoc
- `/gsd:next` — auto-advance baseado em state detection
- `/gsd:autonomous [--from N]` — loop multi-fase totalmente autônomo
- `/gsd:manager` — terminal dashboard com background agent dispatch
- `/gsd:progress` — relatório de progresso + 6 tipos de roteamento

### Qualidade e diagnóstico
- `/gsd:review [--gemini] [--claude] [--codex] [--all]` — revisão cross-AI
- `/gsd:ui-review [N]` — auditoria visual 6 pilares (score 0-4)
- `/gsd:debug` — debugger com hypothesis-testing científico
- `/gsd:forensics` — investigação post-mortem read-only
- `/gsd:health [--repair]` — validação de integridade do .planning/

### Planning tools
- `/gsd:add-todo`, `/gsd:check-todos`, `/gsd:add-backlog`, `/gsd:review-backlog`
- `/gsd:add-tests` — TDD plan injection
- `/gsd:plant-seed` — ideia futura com trigger condition
- `/gsd:map-codebase` — análise paralela 4 agentes → 7 docs estruturados

### Config
- `/gsd:settings` — config interativa 12-toggle via AskUserQuestion
- `/gsd:set-profile <quality|balanced|budget|inherit>` — troca de model profile
- `/gsd:profile-user [--refresh] [--questionnaire]` — profiling 8 dimensões

## 18 Agentes especializados

| Agente | Função |
|--------|--------|
| `gsd-planner` | Decompõe fases em PLAN.md com wave groups (45k bytes — maior agente) |
| `gsd-executor` | Execução atômica com commits por task |
| `gsd-verifier` | Verificação goal-backward (4 níveis) |
| `gsd-debugger` | Hypothesis-testing científico com debug sessions persistentes |
| `gsd-phase-researcher` | Pesquisa técnica antes do planejamento |
| `gsd-project-researcher` | Pesquisa de domínio no init do projeto |
| `gsd-plan-checker` | Verificação de qualidade do plano pré-execução |
| `gsd-roadmapper` | Plano de execução em fases com 100% de cobertura de requisitos |
| `gsd-codebase-mapper` | Análise paralela → STACK.md, ARCHITECTURE.md, etc. |
| `gsd-integration-checker` | Compatibilidade cross-fase API/exports |
| `gsd-nyquist-auditor` | Análise de gap de cobertura de testes |
| `gsd-ui-researcher` | Geração de design contract |
| `gsd-ui-checker` | Validação de spec UI em 6 dimensões |
| `gsd-ui-auditor` | Auditoria visual retroativa (6 pilares, score 0-4) |
| `gsd-user-profiler` | Profiling comportamental 8 dimensões |
| `gsd-research-synthesizer` | Agrega pesquisa paralela → SUMMARY.md |
| `gsd-assumptions-analyzer` | Extração de assumptions por fase |
| `gsd-advisor-researcher` | Análise de trade-offs para discuss-phase |
