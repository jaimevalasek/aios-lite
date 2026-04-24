---
feature: sdlc-process-upgrade
classification: MEDIUM
source_analysis:
  - plans/analise-gap-handoff-orchestrator-artefatos.md
  - plans/analise-gap-aprovacao-gates-sdd.md
  - plans/analise-dev-precedencia-manifest-implementation-plan.md
  - plans/analise-bug-sheldon-parada-anticipada.md
  - plans/analise-bootstrap-memoria-projeto.md
  - plans/analise-devlogs-memoria-sessoes.md
  - plans/analise-sistema-brains-memoria-procedural.md
created_at: "2026-04-24T00:25:28-03:00"
---

# PRD — SDLC Process Upgrade

## Vision
Transformar o workflow AIOSON em um pipeline de desenvolvimento previsivel, retomavel e verificavel, onde agentes, CLI, gates, artefatos e memorias compartilham os mesmos contratos.

## Problem
O processo atual ja tem muitas pecas fortes, mas elas ainda nao formam um sistema fechado. Os desencontros aparecem quando um agente gera um artefato que outro nao le, quando um gate fica pronto mas nao existe aprovacao clara, quando memorias existem mas nao sao consumidas, ou quando a documentacao descreve comandos/fluxos que ainda nao batem 100% com a CLI.

Isso afeta principalmente o usuario/desenvolvedor que usa AIOSON para tocar features MEDIUM sem perder continuidade entre `@product`, `@sheldon`, `@analyst`, `@architect`, `@pm`, `@orchestrator`, `@dev` e `@qa`.

## Users
- Desenvolvedor AIOSON: precisa saber exatamente qual agente vem depois, qual comando roda, qual gate falta e qual artefato e a fonte de verdade.
- Agente de workflow: precisa carregar o minimo contexto correto sem ignorar artefatos tecnicos essenciais.
- Mantenedor do framework: precisa de contratos testaveis para evoluir prompts, CLI, runtime e memoria sem regressao silenciosa.

## MVP scope
### Must-have
- Contrato unico de artefatos por fase, cobrindo `prd`, `sheldon-enrichment`, `requirements`, `spec`, `architecture`, `ui-spec`, `implementation-plan`, `manifest`, `project-pulse` e runtime.
- Comando ou fluxo deterministico de aprovacao de gates A/B/C/D, eliminando edicao manual de YAML como caminho principal.
- Handoff corrigido para `@orchestrator`, incluindo leitura de `requirements-{slug}.md`, corpo de `spec-{slug}.md` e artefatos auxiliares de UX quando existirem.
- Regra explicita de precedencia para `@dev` e `@deyvin` quando `implementation-plan-{slug}.md` e `.aioson/plans/{slug}/manifest.md` coexistirem.
- RF-01 do `@sheldon` refeito para detectar PRDs antes de aplicar early-exit, evitando bloqueio global por `features.md` ou `spec.md` de outra feature.
- Bootstrap semantico completado com os 4 arquivos esperados e refresh tolerante a frontmatter legado.
- Observabilidade de sessao padronizada para agentes principais via `agent:done`, `pulse:update` e fallback de devlog quando necessario.
- Reconciliacao entre documentacao e CLI para comandos ja existentes, inexistentes ou parcialmente implementados.

### Should-have
- `artifact:validate` ampliado para explicar a proxima acao recomendada por agente, nao apenas listar ausencias.
- `preflight` usado como primeira leitura padrao por agentes que hoje rederivam estado lendo muitos arquivos.
- Manifesto/index de devlogs para leitura rapida por LLM.
- Ponte entre learnings e brains para evitar memorias procedurais orfas.
- Testes de fluxo simulando handoffs completos e cenarios de retomada.

## Out of scope
- Reescrever o motor inteiro de workflow.
- Criar uma segunda orquestracao paralela ao `workflow:next` / `workflow:execute`.
- Implementar isolamento real de worktrees por lane nesta iniciativa.
- Trocar o formato completo dos artefatos existentes sem migracao incremental.
- Corrigir UI/dashboard; esta iniciativa foca no core CLI e contratos de agentes.

## User flows
### Abrir feature MEDIUM sem desencontro
Usuario cria PRD com `@product` -> sistema registra `features.md` e `project-pulse.md` -> `@sheldon` identifica o PRD alvo corretamente -> `@analyst` gera requirements e spec -> gate A e aprovado por comando -> `@architect` gera design/architecture -> gate B e aprovado -> `@pm` ou agente definido gera implementation-plan -> gate C e aprovado -> `@orchestrator` consome todos os artefatos relevantes -> `@dev` executa o plano correto -> `@qa` fecha Gate D.

### Retomar uma feature interrompida
Usuario pede continuidade -> `preflight` mostra feature ativa, gates, artefatos presentes e proximo agente -> agente le `project-pulse`, `dev-state` ou `spec-{slug}` -> segue o artefato de execucao ativo conforme precedencia -> registra checkpoint ao final.

### Corrigir gate bloqueado
Usuario roda `gate:check` -> sistema retorna blockers e evidencias -> usuario aprova via comando oficial quando os artefatos estiverem prontos -> `workflow:next` pode avancar sem edicao manual de frontmatter.

### Consumir memoria sem redescobrir o projeto
Agente inicia sessao -> bootstrap completo explica identidade, capacidades, arquitetura e estado -> session memory/devlogs explicam o que aconteceu recentemente -> brains fornecem padroes reutilizaveis quando aplicaveis.

## Success metrics
- Handoff completeness: `artifact:validate` passa para uma feature MEDIUM fixture cobrindo PRD -> QA.
- Gate clarity: nenhum gate A/B/C exige edicao manual de YAML no caminho feliz.
- Recovery speed: um agente consegue retomar uma feature ativa lendo no maximo `preflight`, `project-pulse` e o pacote indicado.
- Prompt/runtime alignment: comandos documentados em `docs/pt/comandos-cli.md` existem na CLI ou estao marcados como planejados.
- Regression safety: testes cobrem `gate:approve`, RF-01 do `@sheldon`, precedencia `manifest` vs `implementation-plan`, handoff do `@orchestrator` e bootstrap incompleto.

## Open questions
- O dono canonico de `implementation-plan-{slug}.md` deve ser `@pm`, `@architect` ou um comando CLI assistido por agente?
- `gate:approve` deve aprovar automaticamente apos `gate:check PASS` ou exigir confirmacao explicita do usuario?
- Brains devem continuar em `.brain.json`, migrar para Markdown estruturado, ou manter ambos com ponte oficial?
- `project-pulse.md` deve ser atualizado apenas por `pulse:update` ou tambem por `agent:done` de forma automatica?
- O bootstrap deve ser obrigatorio apos `@setup` ou apenas fortemente recomendado por `preflight`?

## Specify depth
Feature classificada como MEDIUM. Requer `@sheldon` em validacao completa, `@analyst` com IDs de requisitos e criterios de aceite, `@architect` com contrato de design/artefatos, plano de implementacao aprovado antes de `@dev`, e `@qa` com Gate D. Gates A, B e C sao bloqueantes.
