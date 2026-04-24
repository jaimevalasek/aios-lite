---
feature: cypher-agent
status: done
created_at: "2026-04-10"
briefing_source: null
sources: []
---

# PRD — @cypher Agent

## Vision
`@cypher` é a camada de pré-produção do AIOSON que transforma sketches brutos de `plans/` em briefings estruturados e aprovados — criando o espaço de discussão que hoje não existe entre "ideia bruta" e "PRD comprometido com implementação".

## Problem
Hoje o workflow AIOSON não tem camada intermediária entre planos descartáveis (`plans/*.md`) e PRDs de implementação. Quando `@product` é ativado sobre um plan, o pipeline se abre diretamente — não há espaço para enriquecimento, revisão em equipe, ou aprovação formal da ideia antes de virar compromisso técnico. O resultado: ou o usuário compromete cedo demais, ou evita usar o `@product` por medo de travar a implementação.

## Users
- **Desenvolvedor / product owner**: quer explorar e validar ideias sem abrir o pipeline de implementação. Usa `@cypher` para estruturar e enriquecer planos, discutir com a equipe, e só então aprovar.
- **`@product`**: consome briefings aprovados. Se há briefing `approved` e não implementado, pergunta proativamente se o usuário quer seguir com ele.
- **`@sheldon`**: ciente de que o PRD foi gerado a partir de briefings — lê os briefings de origem para contexto profundo de enriquecimento.
- **`@analyst`** _(sheldon)_: acessa briefings como camada adicional de validação — verifica coerência entre o briefing original e o PRD gerado antes de iniciar o mapeamento de requisitos.

## MVP scope

### Must-have 🔴
- **Leitura de plans**: @cypher lê todos os arquivos `plans/*.md` indicados pelo usuário (um ou vários) e carrega o contexto completo como insumo
- **Enriquecimento via skills**: pesquisa web (`web-research-cache.md`), identificação de gaps (`hardening-lane.md`), levantamento de riscos — reutiliza skills existentes, cria novas específicas junto com a implementação se necessário. O agente é enxuto: o comportamento de enriquecimento vive nas skills, não no prompt
- **Formato interno de `briefings.md`** _(sheldon)_: seções obrigatórias em todo briefing:
  - `## Contexto` — situação atual e motivação do plano
  - `## Problema` — dor específica identificada nos plans
  - `## Solução proposta` — direção sugerida, ainda não comprometida
  - `## Temas` — divisão por assuntos/categorias detectados nos plans
  - `## Riscos` — o que pode dar errado na abordagem proposta
  - `## Gaps identificados` — o que falta nos plans para tomar uma decisão segura
  - `## Fontes` — URLs e referências consultadas durante o enriquecimento
  - `## Questões abertas` — decisões que precisam de resposta antes da aprovação
- **Criação de briefings**: gera `.aioson/briefings/{slug}/briefings.md`. Pode criar arquivos adicionais dentro da pasta slug quando um tema justificar arquivo próprio
- **Config global**: `.aioson/briefings/config.md` com frontmatter YAML (legível por agentes campo-a-campo) e tabela narrativa abaixo (legível por humanos). O CLI lê o frontmatter para `briefing:approve` e `briefing:unapprove` _(sheldon)_
- **Detecção ao ativar**: ao ser ativado, @cypher detecta briefings existentes em `.aioson/briefings/` e oferece: continuar/modificar um existente ou criar novo — nunca sobrescreve sem perguntar
- **Modo conversacional** _(sheldon)_: se `plans/` estiver vazia ou sem arquivos relevantes, @cypher oferece planejar a ideia diretamente com o usuário via conversa — fazendo perguntas para construir o briefing em tempo real, sem exigir arquivos prévios
- **Slug confirmado com o usuário**: @cypher propõe o slug da pasta a partir do conteúdo dos plans e confirma antes de criar

### Should-have 🟡
- **`aioson briefing:approve`**: comando CLI com seleção interativa. Lista briefings com status `draft`. Marca o selecionado como `approved` no `config.md` com `approved_at`
- **`aioson briefing:unapprove`** _(sheldon)_: comando CLI com checkbox list dos briefings `approved` não implementados. Usuário pode desselecionar um ou mais para retorná-los ao status `draft`. Util para revisão antes de chamar `@product`
- **@product briefing-aware**: ao ser ativado, @product verifica se `.aioson/briefings/` existe → se sim, lê `config.md` → se há briefing `approved` não implementado, lista todos e pergunta: "Encontrei briefings aprovados. Quer seguir com um deles?"
- **@sheldon briefing-aware**: ao receber PRD com `briefing_source` no frontmatter, @sheldon lê os briefings de origem para enriquecimento mais profundo
- **@analyst briefing-aware** _(sheldon)_: ao receber PRD com `briefing_source`, @analyst lê o briefing de origem como contexto de validação — verifica se o PRD está coerente com a intenção original do briefing antes de mapear requisitos
- **Locales**: `@cypher` deve ter arquivo de agente em `en` e `pt-BR` dentro de `.aioson/locales/`

## Out of scope
- Criar PRDs — responsabilidade do `@product`
- Implementar código — responsabilidade do `@dev`
- Modificar ou deletar arquivos em `plans/` — são descartáveis e pertencem ao usuário
- Interface visual ou dashboard para briefings
- Aprovação automática sem ação explícita do usuário
- **`@dev` não deve acessar `.aioson/briefings/`** _(sheldon)_: briefings são pré-produção. @dev recebe o PRD já construído — ler briefings criaria confusão e acesso a arquivos irrelevantes para implementação

## User flows

### Novo briefing (com plans disponíveis)
1. Usuário ativa `@cypher`
2. @cypher detecta que não há briefings existentes (ou oferece criar novo)
3. @cypher pergunta: quais arquivos de `plans/` usar? (usuário lista ou diz "todos")
4. @cypher lê todos os plans indicados, carrega contexto do projeto (project.context.md, PRDs existentes)
5. @cypher enriquece: pesquisa web, gaps, riscos via skills
6. @cypher propõe slug para a pasta a partir do conteúdo dos plans
7. Usuário confirma slug
8. @cypher escreve `.aioson/briefings/{slug}/briefings.md` com todas as seções obrigatórias
9. @cypher registra no `config.md`: slug, status=draft, source plans, data
10. @cypher informa: "Briefing criado em `.aioson/briefings/{slug}/`. Para aprovar: `aioson briefing:approve`"

### Modo conversacional — sem plans _(sheldon)_
1. Usuário ativa `@cypher`
2. @cypher detecta que `plans/` está vazia ou sem arquivos relevantes
3. @cypher oferece: "Não encontrei rascunhos em `plans/`. Quer planejar a ideia comigo? Vou fazer perguntas e construir o briefing com base nas suas respostas."
4. @cypher conduz conversa estruturada: contexto → problema → solução → riscos → gaps
5. Ao final, gera o briefing a partir da conversa (mesmo formato que o fluxo normal)
6. Pergunta slug e registra normalmente

### Continuar / modificar briefing existente
1. Usuário ativa `@cypher`
2. @cypher detecta briefings existentes → lista com status (draft / approved / implemented)
3. Usuário seleciona qual continuar
4. @cypher lê o briefing existente, identifica o que está incompleto ou desatualizado
5. @cypher pergunta o que modificar e aplica as alterações
6. Config atualizado com `updated_at`

### Aprovação via CLI
1. Usuário roda `aioson briefing:approve`
2. CLI lista todos os briefings com status `draft` com seleção interativa
3. Usuário seleciona
4. CLI atualiza `config.md`: status → `approved`, `approved_at`
5. Confirmação: "Briefing `{slug}` aprovado. Ative `@product` para seguir com o PRD."

### Desaprovação via CLI _(sheldon)_
1. Usuário roda `aioson briefing:unapprove`
2. CLI lista briefings `approved` não implementados com checkboxes marcados
3. Usuário desmarca os que quer retornar para `draft`
4. CLI atualiza `config.md`: status → `draft`, `approved_at` → null
5. Confirmação: "Briefing `{slug}` retornado para draft."

### @product detecta briefing aprovado
1. Usuário ativa `@product`
2. @product verifica se `.aioson/briefings/` existe — se não existe, segue normalmente sem menção
3. Se existe: lê `config.md` → detecta briefings `approved` não implementados
4. Lista todos os aprovados: "Encontrei briefings aprovados: [lista]. Quer seguir com um deles?"
5. Se usuário confirma: @product lê os briefings da pasta escolhida e gera o PRD a partir deles
6. PRD gerado recebe `briefing_source: {slug}` no frontmatter
7. Config atualizado: `prd_generated: prd-{slug}.md`, status → `implemented`

### @analyst valida coerência com briefing _(sheldon)_
1. @analyst recebe PRD com `briefing_source` no frontmatter
2. @analyst lê `.aioson/briefings/{slug}/briefings.md`
3. Compara intenção original (briefing) com PRD gerado — valida coerência
4. Se detectar divergência, sinaliza antes de mapear requisitos

## Estrutura de arquivos

```
.aioson/
  briefings/
    config.md                    ← registro global (YAML frontmatter + tabela narrativa)
    {slug}/
      briefings.md               ← briefing principal com todas as seções obrigatórias
      {tema-especifico}.md       ← arquivo por tema quando justificar (opcional)
```

**`config.md` — formato** _(sheldon: YAML frontmatter para agentes + tabela para humanos)_:
```markdown
---
updated_at: {ISO-date}
briefings:
  - slug: payment-integration
    status: approved
    source_plans: [plans/X.md, plans/Y.md]
    created_at: "2026-04-10"
    approved_at: "2026-04-11"
    prd_generated: null
  - slug: cypher-agent
    status: draft
    source_plans: [plans/Z.md]
    created_at: "2026-04-10"
    approved_at: null
    prd_generated: null
---

# Briefings Registry

| slug | status | source_plans | created | approved | prd |
|------|--------|-------------|---------|----------|-----|
| payment-integration | approved | plans/X.md | 2026-04-10 | 2026-04-11 | — |
| cypher-agent | draft | plans/Z.md | 2026-04-10 | — | — |
```

**Status lifecycle:** `draft` → `approved` → `implemented`

## Distinção com `aioson brief:gen` _(sheldon)_

O CLI já possui `brief:gen` (`src/commands/brief-gen.js`). São sistemas completamente diferentes:

| | `aioson brief:gen` | `@cypher briefings` |
|---|---|---|
| Input | `implementation-plan.md` (pós-@analyst) | `plans/*.md` (pré-produção do usuário) |
| Output | `.aioson/context/briefs/` | `.aioson/briefings/{slug}/` |
| Momento no workflow | Downstream — durante implementação | Upstream — antes do @product |
| Propósito | Brief técnico para workers de squad | Validação de ideia antes de comprometer pipeline |

`@dev` e workers de squad leem `briefs/`. `@product`, `@sheldon`, `@analyst` leem `briefings/`. **Os dois sistemas não se misturam.**

## Success metrics
- Briefings criados sem disparar o pipeline de implementação: funcionalidade central validada na primeira sessão
- `@product` detecta e lista briefings aprovados sem menção do usuário: zero intervenção manual necessária
- `@analyst` detecta divergência entre briefing e PRD antes de iniciar requisitos
- Briefings reutilizados e modificados em sessões futuras sem perda de contexto

## Open questions
- Qual biblioteca de prompt interativo usar para `briefing:approve` e `briefing:unapprove`? O CLI tem apenas `better-sqlite3` hoje. Opções: `@inquirer/select` (nova dep), readline nativo (zero deps, UX menor), ou flag `--slug=nome` sem interatividade. Decisão para @analyst.
- Quando `plans/` tem arquivos mas todos já foram usados em briefings anteriores, @cypher deve oferecer modo conversacional automaticamente ou apenas avisar?

## Specify depth
- Classification: SMALL
- Specify depth applied: standard
- Ambiguidades resolvidas nesta sessão _(sheldon)_:
  - Formato interno de `briefings.md` — seções obrigatórias definidas
  - Config format — YAML frontmatter + tabela narrativa
  - @analyst acessa briefings como validação (não apenas @product e @sheldon)
  - @dev não acessa briefings — explícito no out of scope
  - `briefing:unapprove` — fluxo e UX definidos
  - Modo conversacional — comportamento quando plans/ está vazia
- Ambiguidades para @analyst resolver:
  - Biblioteca de prompt interativo para CLI commands
  - Comportamento quando todos os plans já foram usados

## Delivery plan _(sheldon — score 8 → phased_external)_

Ver `.aioson/plans/cypher-agent/manifest.md` para fases detalhadas.

Resumo das 3 fases:
- **Fase 1**: @cypher agent + estrutura de briefings + config.md + fluxos core (criar, continuar, conversacional)
- **Fase 2**: CLI commands (`briefing:approve`, `briefing:unapprove`) + locales (en, pt-BR)
- **Fase 3**: Integrações (@product briefing-aware, @sheldon briefing-aware, @analyst briefing-aware)

## Fontes de referência (sheldon)
> Documentos e artefatos analisados durante o enriquecimento.

- [Regra] `data-format-convention.md` — determinou formato YAML frontmatter para `config.md`
- [CLI existente] `src/commands/brief-gen.js` — confirmou que `brief:gen` é downstream (workers), não conflita com @cypher
- [Skill] `.aioson/skills/static/web-research-cache.md` — protocolo de pesquisa que @cypher deve reutilizar
- [Skill] `.aioson/skills/process/aioson-spec-driven/references/hardening-lane.md` — skill de identificação de gaps que @cypher deve reutilizar
- [Skill] `.aioson/skills/process/aioson-spec-driven/references/sheldon.md` — padrão de enriquecimento de referência
