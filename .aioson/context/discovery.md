# Discovery — AIOSON

_Gerado por @analyst — 2026-04-12_
_Baseado em: prd.md + scan-index.md + scan-src.md + scan-folders.md + scan-aioson.md_

---

## O que estamos construindo

AIOSON é um framework operacional de IA publicado no npm como CLI Node.js. Ele orquestra agentes especializados (product, analyst, architect, dev, deyvin, qa, etc.) via um pipeline SDD (Spec-Driven Development) para transformar ideias em software — com telemetria SQLite e suporte a múltiplos editores (Claude Code, Cursor, Windsurf, Gemini CLI). Opera em "inception mode": o próprio AIOSON é construído usando seus agentes e metodologia.

---

## Tipos de usuário e permissões

| Tipo | Descrição | Permissões |
|------|-----------|-----------|
| Developer | Único tipo de usuário. Executa o CLI para orquestrar agentes no seu projeto | Leitura/escrita total sobre `.aioson/`, contexto, artefatos, telemetria |

---

## Escopo do MVP

### Funcionalidades existentes (em produção)
- `aioson setup .` — onboarding de projeto (instala template, detecta stack)
- `aioson workflow:next` — avança o pipeline SDD com gates de classificação
- `aioson agent:done` — registra conclusão de agente no SQLite
- `aioson live:start / live:close / live:handoff` — sessões rastreadas por agente
- `aioson runtime:emit` — emite eventos de milestone no dashboard
- `aioson scan:project` — gera artefatos de memória brownfield
- `aioson squad:*` — gerenciamento de squads paralelos
- `aioson genome:*` — sistema de personalidade por domínio
- `aioson skill:*` — instalação/listagem de skills
- `aioson locale:apply` — troca de locale de agentes (en, pt-BR, es, fr)
- Telemetria SQLite via better-sqlite3 (`.aioson/runtime/aios.sqlite`)
- Template AIOSON distribuído via `aioson setup .`

### Feature central deste ciclo — Design Governance
- **Design-doc base permanente**: `.aioson/context/design-doc.md` — arquivo fixo por projeto que define regras de organização de código (estrutura de pastas, nomeclatura semântica, componentização, reuso, guideline de tamanho)
- **`@discovery-design-doc` como gate obrigatório**: entra no workflow SMALL e MEDIUM antes de `@dev` — lê design-doc base + PRD + artefatos do `@architect` e gera plano técnico concreto da feature
- **Carregamento obrigatório de design-doc**: `@dev` e `@deyvin` leem `.aioson/context/design-doc.md` antes de qualquer implementação
- **Alerta de tamanho de arquivo**: quando agente detecta que arquivo ultrapassará 500 linhas → emite alerta + proposta concreta de split sem quebrar o sistema (guideline: 300–500 linhas)

---

## Módulos-chave (estrutura atual)

AIOSON é um CLI — não usa DB de aplicação. Os "módulos" são as unidades lógicas do sistema.

### `src/commands/` — 100+ comandos CLI
Cada arquivo implementa um comando `aioson <namespace>:<action>`.

| Subgrupo | Exemplos | Responsabilidade |
|----------|----------|-----------------|
| workflow | `workflow-next.js`, `workflow-plan.js`, `workflow-execute.js` | Pipeline SDD, sequência de agentes |
| agent | `agents.js`, `agent-loader.js`, `agent-audit.js` | Carregamento e auditoria de agentes |
| runtime | `runtime.js` | Telemetria SQLite |
| squad | `squad-*.js` (25+ arquivos) | Gestão de squads paralelos |
| context | `context-*.js` (8 arquivos) | Cache, compactação, validação de contexto |
| qa | `qa-*.js` | Geração e execução de testes |
| spec | `spec-*.js` | Checkpoint, status e sync de spec |
| live | `live.js` | Sessões rastreadas por agente |
| scan | `scan-project.js` | Scanner de projeto brownfield |
| runner | `runner-*.js` | Executor de planos de implementação |
| genome | `genome-*.js` | Migração e médico de genomas |
| store | `store-*.js` | CLI do marketplace |

### `src/squad/` — Inteligência de squad
| Arquivo | Responsabilidade |
|---------|-----------------|
| `task-decomposer.js` | Quebra tarefas em sub-tarefas para squads |
| `state-manager.js` | Estado persistido do squad |
| `learning-extractor.js` | Extrai learnings de devlogs |
| `pattern-detector.js` | Detecta padrões recorrentes |
| `verify-gate.js` | Gate de verificação de entregas |
| `context-compactor.js` | Compactação de contexto entre sessões |
| `recovery-context.js` | Recuperação de sessão interrompida |

### `src/runner/` — Executor de planos
| Arquivo | Responsabilidade |
|---------|-----------------|
| `cascade.js` | Execução em cascata de tasks |
| `queue-store.js` | Fila persistida de execução |
| `plan-importer.js` | Importa planos para a fila |
| `cli-launcher.js` | Lança CLI para cada task |

### `src/squad-dashboard/` — Dashboard bridge
| Arquivo | Responsabilidade |
|---------|-----------------|
| `server.js` | Servidor do dashboard local |
| `api.js` | Endpoints REST do dashboard |
| `renderer.js` | Renderização de UI |
| `metrics.js` | Métricas de sessão |
| `token-tracker.js` | Rastreamento de uso de tokens |

### `src/` root — Utilidades centrais
| Arquivo | Responsabilidade |
|---------|-----------------|
| `cli.js` | Entry point, registro de comandos |
| `installer.js` | Instalação do template AIOSON |
| `context.js` | Leitura/escrita de contexto |
| `context-writer.js` | Escrita estruturada de artefatos |
| `runtime-store.js` | Abstração SQLite para telemetria |
| `agent-loader.js` | Carrega prompts de agentes do disco |
| `parser.js` | Parser de frontmatter e markdown |
| `utils.js` | Utilitários compartilhados |

---

## Regras de negócio críticas

### REQ-DISC-01 — Classificação SDD obrigatória
Todo projeto recebe um score 0–6 (user types + integrations + business rules). A classificação determina quais agentes são obrigatórios no pipeline. Nunca pode ser pulada.

### REQ-DISC-02 — Gate de sincronização de artefatos
Antes de `@analyst` produzir `requirements-{slug}.md`, deve comparar a data do PRD com a do requirements existente. Se o PRD for mais recente → Modo Sincronização (não Modo Feature novo).

### REQ-DISC-03 — Design-doc base obrigatório antes de implementação (NOVO)
Para qualquer projeto com classificação SMALL ou MEDIUM, deve existir `.aioson/context/design-doc.md`. Se ausente no momento em que `@discovery-design-doc` é invocado, ele deve criá-lo antes de gerar o plano técnico da feature.

### REQ-DISC-04 — `@discovery-design-doc` como gate pré-dev (NOVO)
No workflow SMALL e MEDIUM, `@discovery-design-doc` deve ser invocado **entre `@architect` e `@dev`**. `@dev` e `@deyvin` não podem iniciar implementação sem existência de `design-doc.md` no contexto ativo.

### REQ-DISC-05 — Alerta de tamanho de arquivo (NOVO)
Quando `@dev` ou `@deyvin` detectam que um arquivo vai ultrapassar 500 linhas → emitem alerta explícito no output → propõem alternativas concretas (extração de módulo, componente separado, helper isolado) → aguardam confirmação antes de continuar. Arquivos entre 300–500 linhas são aceitáveis. Abaixo de 300 é ideal.

### REQ-DISC-06 — Nomeclatura semântica de pastas (NOVO)
Toda estrutura de pastas gerada por agentes deve seguir: singular para entidades de domínio (ex: `component/`, `service/`, `hook/`), plural para coleções (ex: `components/`, `services/`, `hooks/`). Kebab-case para todos os nomes.

### REQ-DISC-07 — Inception mode
O AIOSON constrói a si mesmo. Mudanças em agentes feitas no `template/` devem ser sincronizadas para `.aioson/agents/` via `npm run sync:agents`. Agentes leem de `.aioson/agents/`, não de `template/`.

### REQ-DISC-08 — Framework_installed gate
Se `framework_installed=true` no contexto, agentes downstream pulam comandos de instalação. Se `false`, incluem os passos de instalação antes de qualquer implementação.

---

## Relacionamentos entre módulos

```
bin/aioson.js
  └── src/cli.js (registra todos os comandos)
       └── src/commands/*.js (implementações dos comandos)
            ├── usa src/context.js (leitura de contexto)
            ├── usa src/runtime-store.js (telemetria SQLite)
            ├── usa src/agent-loader.js (carrega prompts)
            ├── usa src/squad/* (operações de squad)
            └── usa src/runner/* (execução de planos)

template/ (distribuído via aioson setup .)
  └── .aioson/agents/ (prompts dos agentes)
  └── .aioson/skills/ (design, static, dynamic skills)
  └── .aioson/rules/ (regras de projeto)
  └── .aioson/context/ (artefatos do projeto)

.aioson/runtime/aios.sqlite
  └── lido pelo dashboard externo (app separada)
  └── escrito por runtime-store.js
```

---

## Ordem de changes para a feature Design Governance

1. Criar template de `.aioson/context/design-doc.md` no `template/`
2. Atualizar `.aioson/agents/discovery-design-doc.md` — integrar leitura do design-doc base e geração de plano técnico
3. Atualizar `.aioson/agents/dev.md` — adicionar carregamento obrigatório de `design-doc.md`
4. Atualizar `.aioson/agents/deyvin.md` — idem
5. Atualizar workflow SMALL e MEDIUM para incluir `@discovery-design-doc` como gate
6. Sincronizar template → workspace com `npm run sync:agents`

---

## Riscos identificados

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| `@discovery-design-doc` produz planos genéricos sem contexto suficiente | Alto — @dev implementa errado | Garantir que ele leia PRD + requirements + design-doc base juntos |
| design-doc base desatualizado entre features | Médio — agentes seguem regras obsoletas | Definir se é mutável ou imutável (pergunta em aberto do PRD) |
| Alerta de 500 linhas quebra fluxo em sessões @deyvin | Baixo | Protocolo de alerta deve ser não-bloqueante em pair mode |
| Inception mode: mudança em template não sincronizada | Alto — workspace usa versão antiga | `npm run sync:agents` obrigatório após qualquer mudança de agente |
| `src/commands/` já tem 100+ arquivos flat — problema do próprio gap sendo endereçado | Médio | O design-doc base deve endereçar essa flat structure como exemplo negativo a não repetir |

---

## Resultado da classificação

**Feature: Design Governance**

| Critério | Valor | Score |
|----------|-------|-------|
| Tipos de usuário | 1 (developer) | 0 |
| Integrações externas | 0 (mudanças internas a agentes e workflow) | 0 |
| Regras de negócio | Algumas: gate obrigatório, carregamento de doc, alerta de tamanho, nomeclatura | 1 |
| **Total** | | **1 — SMALL** |

> Classificação **SMALL**: `@product` → `@analyst` → `@dev` → `@qa`
> `@architect` pode ser pulado dado que não há nova arquitetura de sistema — apenas mudanças de agentes e adição de template.

---

## Referências visuais
_N/A — projeto CLI, sem componentes visuais._

---

## Fora do escopo

- Sub-agentes paralelos por pasta/componente
- Limites rígidos de linhas como erro bloqueante (hard constraint)
- Geração automática de scaffold de pastas como comando CLI separado
- Dashboard UI (app externa)
- Alterações na telemetria SQLite para rastrear métricas de tamanho de arquivo
