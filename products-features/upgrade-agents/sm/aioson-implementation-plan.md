# AIOSON-native `@sm` — Implementation Plan

## Missao

Criar um agente oficial `@sm` no AIOSON com foco em **execution readiness**, transformando PRD, requirements, spec e architecture em lotes claros de implementacao para `@dev`, `@orchestrator` e squads, sem tornar story files o centro do framework.

## Problema que este agente resolve

Hoje o AIOSON ja tem:

- descoberta e PRD com `@product`
- requisitos e entendimento tecnico com `@analyst`
- arquitetura com `@architect`
- priorizacao e acceptance clarity com `@pm`
- paralelismo em `MEDIUM` com `@orchestrator`

Mas ainda falta uma camada explicita para responder:

- qual o proximo bloco implementavel?
- o que depende de que?
- o que ja esta pronto para `@dev` agora?
- como quebrar uma feature/projeto em ondas de execucao e de correcao?

Esse e o espaco do `@sm`.

---

## Papel proposto

`@sm` nao sera:

- dono do PRD
- dono da arquitetura
- substituto de `@pm`
- substituto de `@orchestrator`
- agente de daily/retro como prioridade inicial

`@sm` sera:

- coordenador de readiness para execucao
- quebrador de lotes e dependencias
- preparador de handoff para `@dev`
- sequenciador de ondas de implementacao e correcao
- apoio para trabalho multi-agente, squads e paralelismo

---

## Quando usar

### Uso recomendado

- feature `SMALL` ou `MEDIUM` com varias partes interdependentes
- projeto `SMALL` ou `MEDIUM` com mais de um modulo ou frente
- workstream executado por multiplos agentes
- squad ou conjunto de squads gerados
- rodada grande de correcao depois de `@qa`
- brownfield com risco alto de ordem errada de implementacao

### Uso desnecessario

- projeto `MICRO`
- feature `MICRO`
- ajuste simples onde `@dev` consegue executar diretamente do contexto

---

## Posicionamento no workflow

## Regra principal

`@sm` entra **imediatamente antes da primeira etapa de execucao real**.

Isso significa:

- depois dos artefatos de planejamento relevantes
- antes de `@dev`
- e antes de `@orchestrator` quando a intencao for alimentar execucao paralela

## Posicionamento sugerido por fluxo

### Projeto `SMALL`

Fluxo atual:

```text
@setup -> @product -> @analyst -> @architect -> @dev -> @qa
```

Fluxo com `@sm`:

```text
@setup -> @product -> @analyst -> @architect -> @sm -> @dev -> @qa
```

### Projeto `MEDIUM`

Fluxo atual:

```text
@setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa
```

Fluxo recomendado:

```text
@setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @sm -> @orchestrator -> @dev -> @qa
```

Racional:

- `@pm` decide prioridade e acceptance
- `@sm` quebra em batches e ownership
- `@orchestrator` usa isso para lanes paralelas

### Feature `SMALL` / `MEDIUM`

Fluxo atual:

```text
@product -> @analyst -> @dev -> @qa
```

Fluxo recomendado em modo opcional:

```text
@product -> @analyst -> @sm -> @dev -> @qa
```

Se houver detour por `@pm`, o `@sm` entra depois dele.

## Estrategia de adocao

Nao colocar `@sm` no workflow padrao logo de inicio.
Primeiro, entrar como:

- agente oficial opcional
- detour permitido no `workflow-next`
- recomendado apenas em `SMALL` / `MEDIUM`

Depois, com uso validado, decidir se vira etapa padrao em alguns fluxos.

---

## Entradas prioritarias

1. `.aioson/context/project.context.md`
2. `.aioson/context/prd.md` ou `prd-{slug}.md`
3. `.aioson/context/requirements-{slug}.md` quando existir
4. `.aioson/context/spec.md` ou `spec-{slug}.md`
5. `.aioson/context/discovery.md` para brownfield
6. `.aioson/context/architecture.md` quando existir
7. `.aioson/context/ui-spec.md` quando existir
8. `.aioson/context/features.md` em modo feature
9. `.aioson/context/workflow.state.json` quando existir
10. artefatos de `@qa` quando o alvo for uma onda de correcao

---

## Output principal sugerido

## MVP artifact

Criar um artefato dedicado:

- projeto: `.aioson/context/execution-plan.md`
- feature: `.aioson/context/execution-{slug}.md`

## Estrutura sugerida

```markdown
# Execution Plan — [project or feature]

## Objective
[qual entrega este plano destrava]

## Active context
- mode: project|feature
- classification: SMALL|MEDIUM
- source docs: [PRD/spec/architecture/etc]

## Execution batches
### Batch 1 — [name]
- goal:
- scope:
- done when:
- owner lane:
- blockers:

### Batch 2 — [name]
- goal:
- scope:
- done when:
- depends on:

## Dependency order
1. [o que vem primeiro]
2. [o que destrava o seguinte]

## Ready for dev checklist
- context sufficient
- acceptance clear
- contract dependencies identified
- risky assumptions called out

## QA checkpoints
- what QA should verify after batch 1
- what can wait for final QA

## Open blockers
- [blocker]

## Next handoff
- activate `@dev` for Batch 1
- or activate `@orchestrator` for parallel lanes
```

## Regra de ouro do output

O artefato deve ser:

- curto
- sequenciavel
- acionavel
- sem duplicar PRD/architecture

Ele existe para traduzir contexto em execucao, nao para reescrever o projeto.

---

## Command pack sugerido

### V1

- `@sm plan`
- `@sm split`
- `@sm ready`
- `@sm unblock`
- `@sm replan`
- `@sm qa-wave`

### Significado de cada comando

- `@sm plan`
  Gera o execution plan inicial com batches, dependencias e handoff.

- `@sm split`
  Requebra uma entrega grande em batches menores ou lanes paralelas.

- `@sm ready`
  Executa o readiness check antes de chamar `@dev`.

- `@sm unblock`
  Replaneja ordem e dependencias quando surgiu um bloqueio.

- `@sm replan`
  Ajusta o plano por mudanca de escopo, atraso ou nova dependencia.

- `@sm qa-wave`
  Organiza uma onda de correcoes apos `@qa`, priorizando o que precisa voltar para `@dev`.

### V2 opcional

- `@sm standup`
- `@sm retro`
- `@sm sprint`

Esses comandos devem ser futuros e opcionais.
Nao sao o centro da primeira versao.

---

## Responsabilidade por fronteira

## `@product`

- define o que construir e por que
- controla ciclo da feature

## `@pm`

- define prioridade, sequencia de entrega e acceptance clarity

## `@sm`

- traduz isso em batches executaveis
- define ordem operacional, blockers e ready-for-dev

## `@orchestrator`

- executa coordenacao paralela para `MEDIUM`
- usa o plano do `@sm` quando houver multiplas lanes

## `@dev`

- implementa o batch ativo

## `@qa`

- valida o batch/feature/projeto
- pode devolver findings que o `@sm` reorganiza em nova onda

---

## Hard constraints

- nunca reescrever PRD, requirements ou architecture
- nunca substituir `@pm` como dono da priorizacao
- nunca virar gatekeeper obrigatorio para `MICRO`
- nunca tornar story file a fonte de verdade do AIOSON
- nunca criar cerimonia pesada por default
- sempre respeitar `conversation_language`
- sempre usar a cadeia de contexto do projeto como base

---

## Fases de implementacao

## Fase 0 — Document-first design

Objetivo:

- validar o papel antes de tocar no core

Entregas:

- benchmark comparativo
- spec do agente
- exemplos de output

Status:

- esta fase fica coberta por esta documentacao

## Fase 1 — Prompt oficial do agente

Adicionar:

- `template/.aioson/agents/sm.md`
- `template/.aioson/locales/pt-BR/agents/sm.md`
- entrada em `docs/pt/agentes.md`

Comportamento minimo:

- ler contexto
- gerar `execution-plan.md` ou `execution-{slug}.md`
- sugerir proximo agente

## Fase 2 — Integracao leve com workflow

Adicionar ao runtime:

- `@sm` como detour permitido no `workflow-next`
- inferencia de conclusao por existencia de `execution-plan.md`
- opcao de ativacao explicita antes de `@dev`

Ainda sem obrigar `@sm` em todos os fluxos.

## Fase 3 — Integracao com `@orchestrator`

Objetivo:

- fazer o `@orchestrator` consumir lotes/lane ownership produzidos por `@sm`

Possiveis entregas:

- secao padrao de lanes no execution plan
- reaproveitamento em `.aioson/context/parallel/`
- ponte explicita entre `execution-plan.md` e `shared-decisions.md`

## Fase 4 — Integracao com `@qa`

Objetivo:

- transformar findings relevantes em nova onda organizada de execucao

Possiveis entregas:

- `@sm qa-wave`
- priorizacao de critical/high findings
- novo handoff para `@dev`

## Fase 5 — Integracao com squads e agentes gerados

Objetivo:

- usar `@sm` como empacotador de trabalho para sistemas multi-agente do AIOSON

Possiveis entregas:

- generation hints para squads
- mapeamento de lane ownership por agente gerado
- readiness pack para execucao paralela

Esta e a fase onde o valor diferencial do AIOSON tende a aparecer mais.

---

## Como `@sm` pode servir squads no AIOSON

Esse e um ponto importante e especificamente nativo do AIOSON.

O `@sm` pode:

- transformar uma feature grande em pacotes para agentes de squad
- definir dependencia entre pacotes
- separar o que pode rodar em paralelo do que precisa ser sequencial
- consolidar uma “onda de execucao” antes do `@orchestrator`

Em outras palavras:

- para agentes oficiais, o `@sm` melhora o handoff
- para squads, o `@sm` melhora a preparacao da orquestracao

---

## Nao-objetivos

- nao criar um modulo full Scrum no AIOSON
- nao obrigar standup/retro
- nao transformar tudo em stories
- nao duplicar `@pm`
- nao deslocar `@orchestrator`
- nao virar agente de Git-first operations

---

## Criterios de sucesso

- `@dev` recebe contexto mais claro e menos ambiguidade de ordem
- `@orchestrator` ganha batches/lane ownership mais claros
- features `SMALL` e `MEDIUM` quebram menos por ordem errada de implementacao
- ondas de correcao pos-`@qa` ficam mais organizadas
- squads/agentes gerados recebem pacotes mais bem definidos

---

## Recomendacao final

Se o AIOSON adicionar um `@sm`, ele deve nascer como um agente de:

- execution readiness
- sequencing
- handoff operacional
- suporte a multi-agente

Nao como um clone de Scrum Master de ferramenta corporativa.

O melhor MVP e simples:

1. agente oficial
2. output `execution-plan.md`
3. entrada opcional no workflow
4. integracao posterior com `@orchestrator`, `@qa` e squads

