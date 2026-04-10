# GSD Analysis — Overview & Architecture

> Fonte: https://github.com/gsd-build/get-shit-done
> Data: 2026-03-29
> Status: análise completa

## O que é o GSD

**get-shit-done** é um sistema de meta-prompting spec-driven para desenvolvimento AI-assisted, focado em resolver "context rot" — degradação de qualidade conforme o contexto do AI enche. Suporta Claude Code e 8+ outros runtimes.

- 44.7k stars, 1.413+ commits, v1.30.0
- Install: `npx get-shit-done-cc@latest`

## Estrutura do repo

```
agents/              # 18 agentes especializados (.md)
bin/                 # install.js CLI entry point
commands/gsd/        # 89 arquivos de comando (thin orchestrators)
get-shit-done/
├── references/      # 15 docs de referência (patterns, conventions, git, TDD)
├── templates/       # 31 templates (PROJECT.md, PLAN.md, STATE.md, etc.)
├── workflows/       # 80 arquivos de definição de workflow
└── bin/             # CLI tools
sdk/src/             # TypeScript SDK (41 arquivos) — execução headless programática
scripts/             # utility scripts
hooks/               # git hooks
tests/               # vitest test suite
```

## State files em .planning/ por projeto

- `PROJECT.md` — living vision doc (sempre carregado pelos agentes)
- `REQUIREMENTS.md` — requisitos com REQ-IDs
- `ROADMAP.md` — plano em fases com success criteria
- `STATE.md` — memória de sessão: decisões, blockers, posição, velocity metrics
- `config.json` — 12+ toggles
- `phases/{phase}/` — por fase: CONTEXT.md, RESEARCH.md, PLAN.md(s), SUMMARY.md, VERIFICATION.md
- `todos/pending/` e `todos/done/` — todo files estruturados
- `debug/{slug}.md` — debug sessions persistentes
- `seeds/` — ideias futuras com trigger conditions
- `milestones/` — artifacts arquivados
- `forensics/` — relatórios post-mortem

## Config.json — 12 toggles principais

```json
{
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_checking": true,
    "verification": true,
    "auto_advance": false,
    "nyquist_validation_enabled": true,
    "ui_phase": true,
    "ui_safety_gate": true,
    "discuss_mode": true
  },
  "parallelization": {
    "plan_level": true,
    "task_level": false,
    "max_concurrent": 3
  },
  "gates": {
    "project_init": true,
    "roadmap_approval": true,
    "phase_execution": true,
    "transition": true
  }
}
```

Model profiles: `quality` (Opus everywhere), `balanced` (Opus planejamento / Sonnet execução), `budget`, `inherit`.
