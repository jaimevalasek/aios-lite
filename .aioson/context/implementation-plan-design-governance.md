---
project: "aioson"
scope: "feature"
feature_slug: "design-governance"
created: "2026-04-12"
status: "approved"
classification: "SMALL"
source_artifacts:
  - prd.md
  - requirements-design-governance.md
  - spec-design-governance.md
  - discovery.md
  - project.context.md
---

# Implementation Plan — design-governance

> Gerado por @pm após consolidação de todos os artefatos de spec.
> Aprovado pelo usuário antes de qualquer implementação.
> Status: draft → approved → in_progress → completed

## Pre-flight check

### Artefatos lidos
- [x] `project.context.md` — ok
- [x] `prd.md` — ok (visão + escopo)
- [x] `requirements-design-governance.md` — ok (5 REQs, 6 ACs)
- [x] `spec-design-governance.md` — ok (phase_gates.requirements: approved)
- [x] `discovery.md` — ok (estrutura de módulos mapeada)
- [ ] `architecture.md` — ausente (SMALL sem @architect — WARN aceitável)
- [ ] `design-doc.md` — ausente intencionalmente (criado por esta feature — INFO)

### Consistency check
- **INFO**: Modo feature sem `prd-design-governance.md` — usando `prd.md` + `requirements-design-governance.md` como base. Sem inconsistências.
- **INFO**: Inception mode — mudanças em `template/.aioson/agents/` devem ser propagadas para `.aioson/agents/` via `npm run sync:agents`.
- **WARN**: `architecture.md` ausente — sequência de fases derivada diretamente de `requirements-design-governance.md`. Sem risco real pois a feature não tem dependências de dados.

### Readiness verdict
**READY_WITH_ASSUMPTIONS** — assumptions: (1) sync de agents funciona via `npm run sync:agents`; (2) não há dependência entre os 3 agentes modificados (podem ser editados em qualquer ordem dentro da fase).

---

## Execution Strategy

### Fase 1 — Criar template de design-doc base
**Features:** [design-governance]
**Executor:** @dev

**O que:**
- Criar arquivo `template/.aioson/context/design-doc.md` com todas as 5 seções obrigatórias preenchidas com defaults do framework AIOSON.
- Seções obrigatórias:
  1. `## Organização de pastas` — regra de hierarquia semântica, singular/plural, kebab-case, no máximo 3 níveis de profundidade antes de reavaliar
  2. `## Componentização` — quando extrair (responsabilidade única, >50 linhas de lógica pura), quando manter inline
  3. `## Reuso` — verificar módulos existentes antes de criar novo; preferir composição sobre duplicação
  4. `## Tamanho de arquivo` — alvo 300 linhas, aceitável até 500, acima de 500 → alerta obrigatório com proposta de split
  5. `## Nomeclatura` — convenções por camada (commands/, lib/, squad/, runner/, etc.)

**Depende de:** nada

**Artefatos de entrada:**
- `project.context.md` (stack: Node.js, convenções camelCase/kebab-case)
- `requirements-design-governance.md` §Novos artefatos introduzidos
- `discovery.md` §Módulos-chave (para exemplificar com estrutura real do AIOSON)

**Critério de done:** `template/.aioson/context/design-doc.md` existe com as 5 seções preenchidas, sem seções "A definir".

**Checkpoint:** `ls template/.aioson/context/design-doc.md` retorna o arquivo; abrir e confirmar as 5 seções.

---

### Fase 2 — Atualizar @discovery-design-doc (missão + gate pré-dev)
**Features:** [design-governance]
**Executor:** @dev

**O que:**
- Editar `template/.aioson/agents/discovery-design-doc.md`
- Adicionar/atualizar as seguintes responsabilidades no agent:
  1. **Missão redefinida**: gerador de plano técnico concreto por feature — posicionado entre @architect e @dev no workflow SMALL/MEDIUM
  2. **Entrada obrigatória**: ler `design-doc.md` (base) + `prd-{slug}.md` + `requirements-{slug}.md` (+ `architecture.md` se existir)
  3. **Output obrigatório**: plano técnico com (a) lista de arquivos a criar com paths exatos relativos à raiz do projeto, (b) arquivos existentes a modificar + o que muda, (c) componentes/módulos existentes a reusar, (d) novos módulos pequenos a criar (com responsabilidade única declarada)
  4. **Gate behavior**: se `design-doc.md` ausente → criá-lo a partir do template antes de gerar o plano técnico
  5. **Mensagem de abertura atualizada**: mencionar explicitamente que o agente lê o design-doc base

**Depende de:** Fase 1 (referencia design-doc.md no agent)

**Artefatos de entrada:**
- `requirements-design-governance.md` §Alterações em artefatos existentes → @discovery-design-doc
- Arquivo atual `template/.aioson/agents/discovery-design-doc.md` (ler antes de editar)

**Critério de done:** agent file atualizado; seção de missão menciona "plano técnico com paths exatos"; seção de gate behavior menciona criação de design-doc se ausente.

**Checkpoint:** ler as primeiras 30 linhas do arquivo atualizado e confirmar a nova missão.

---

### Fase 3 — Atualizar @dev (pre-flight + alerta 500 linhas)
**Features:** [design-governance]
**Executor:** @dev

**O que:**
- Editar `template/.aioson/agents/dev.md`
- Adicionar **seção "Design-doc pre-flight"** logo após a seção "Detecção de plano de implementação":
  - Para SMALL/MEDIUM: verificar se `.aioson/context/design-doc.md` existe
  - Se ausente → emitir aviso: "Design-doc base não encontrado. Recomendo invocar `@discovery-design-doc` antes de implementar. Quer prosseguir mesmo assim?"
  - Se presente → carregar (já estava no pacote de contexto opcional; tornar explícito na lista de entrada)
- Adicionar **protocolo de alerta de tamanho** na seção "Execução atômica" (antes do passo de commit):
  - Ao planejar arquivo que estimativamente terá >500 linhas: PARE, emita alerta, liste 2-3 alternativas concretas de split, aguarde confirmação
  - Ao planejar arquivo 300-500 linhas: continuar sem alerta (guideline implícito)
  - Formato do alerta: `⚠ Estimativa: ~{N} linhas. Sugestões: (1) {alternativa A} (2) {alternativa B}. Prosseguir assim ou prefere o split?`

**Depende de:** nenhuma dependência técnica com Fase 1 ou 2 (pode ser paralela)

**Artefatos de entrada:**
- `requirements-design-governance.md` §Alterações → @dev
- Arquivo atual `template/.aioson/agents/dev.md` (ler antes de editar)

**Critério de done:** duas novas seções adicionadas sem quebrar estrutura existente; seção de pre-flight tem condição SMALL/MEDIUM; protocolo de alerta tem o formato especificado.

**Checkpoint:** buscar "design-doc" e "500" no arquivo atualizado para confirmar ambas as inserções.

---

### Fase 4 — Atualizar @deyvin (mesmo pre-flight + variação pair mode)
**Features:** [design-governance]
**Executor:** @dev

**O que:**
- Editar `template/.aioson/agents/deyvin.md`
- Adicionar as mesmas mudanças da Fase 3 (design-doc pre-flight + protocolo de alerta)
- **Variação de pair mode** para o alerta de 500 linhas: alerta é informativo, não pede confirmação — apresenta alternativas e prossegue após 1 turno se usuário não responder

**Depende de:** nenhuma dependência técnica (pode ser paralela com Fase 3)

**Artefatos de entrada:**
- `requirements-design-governance.md` §Alterações → @deyvin
- Arquivo atual `template/.aioson/agents/deyvin.md` (ler antes de editar)

**Critério de done:** mesmas mudanças da Fase 3 presentes + variação pair mode documentada para o alerta.

**Checkpoint:** confirmar variação "pair mode" no arquivo — deve dizer que não bloqueia, apenas informa.

---

### Fase 5 — Sync template → workspace e verificação final
**Features:** [design-governance]
**Executor:** @dev

**O que:**
- Executar `npm run sync:agents` para propagar as mudanças de `template/.aioson/agents/` para `.aioson/agents/`
- Verificar que os 3 arquivos em `.aioson/agents/` refletem as mudanças das Fases 2, 3 e 4
- Atualizar `spec-design-governance.md`: marcar `phase_gates.plan: approved`; preencher seção "O que foi construído"
- Commit final com mensagem semântica: `feat(design-governance): add design-doc base template and update agent protocols`

**Depende de:** Fases 1, 2, 3 e 4 concluídas

**Artefatos de entrada:**
- Resultado das fases anteriores

**Critério de done:** `npm run sync:agents` roda sem erro; `diff template/.aioson/agents/dev.md .aioson/agents/dev.md` retorna vazio (arquivos idênticos); commit feito.

**Checkpoint:** rodar `npm run sync:agents` e confirmar saída sem erros; abrir `.aioson/agents/dev.md` e confirmar seção de pre-flight presente.

---

## Decisões pré-tomadas (NÃO re-discutir)

- Alerta de 500 linhas é **guideline não-bloqueante** — nunca impede implementação, apenas propõe alternativas
- Em pair mode (`@deyvin`), o alerta é **puramente informativo** — prossegue após 1 turno sem resposta
- `@discovery-design-doc` **cria o design-doc base se ausente** — não delega para @setup ou @architect
- design-doc base é **mutável** — agentes podem enriquecê-lo, mas nunca remover seções obrigatórias
- Sem alterações em CLI (`src/commands/`) — feature é puramente de prompts e template
- Inception mode: fonte canônica é `template/.aioson/agents/`; sync propaga para `.aioson/agents/`

## Decisões adiadas (@dev resolve)

- Wording exato da mensagem de alerta de 500 linhas (guideline: claro, concreto, não alarming)
- Se adicionar `note` de design-doc no output de `aioson agent:done` para @discovery-design-doc
- Se `@dev` deve criar o design-doc automaticamente quando ausente (alternativa ao aviso) — decidir durante Fase 3 baseado no que faz mais sentido para o fluxo

---

## Context Package

### Leitura obrigatória para @dev (nesta ordem)
1. `implementation-plan-design-governance.md` ← este arquivo
2. `project.context.md` — stack, convenções
3. `requirements-design-governance.md` — REQs e ACs

### Leitura sob demanda
- `prd.md` — dúvida sobre visão ou escopo
- `discovery.md` — dúvida sobre estrutura de módulos existentes
- `spec-design-governance.md` — decisões já tomadas + atualizar após cada fase

### NÃO re-ler (já sintetizado neste plano)
- `features.md` — estado já conhecido (design-governance in_progress)
- `project-pulse.md` — já atualizado pelo @analyst

---

## Instruções para @dev

> 1. Leia este arquivo PRIMEIRO
> 2. Siga a sequência de fases na ordem (Fase 1 → 2 → 3/4 paralelas → 5)
> 3. Fases 3 e 4 são independentes — podem ser feitas em qualquer ordem
> 4. Após cada fase, atualizar `spec-design-governance.md` com decisões tomadas
> 5. Antes de editar qualquer agent file: ler o arquivo atual completo
> 6. Se encontrar contradição com este plano: PARE e pergunte ao usuário
> 7. Decisões pré-tomadas são finais — não re-discutir
> 8. Ao concluir a Fase 5: marcar feature como `done` em `features.md`

---

## Critérios de aceite (Gate C — SMALL, informativo)

| AC | Descrição |
|----|-----------|
| AC-design-governance-01 | `template/.aioson/context/design-doc.md` existe com 5 seções obrigatórias preenchidas |
| AC-design-governance-02 | `@discovery-design-doc` menciona explicitamente "plano técnico com paths exatos" e gate behavior |
| AC-design-governance-03 | `@dev` tem seção de pre-flight para design-doc em SMALL/MEDIUM |
| AC-design-governance-04 | `@dev` tem protocolo de alerta formatado para arquivos >500 linhas |
| AC-design-governance-05 | `@deyvin` tem as mesmas mudanças com variação pair mode documentada |
| AC-design-governance-06 | `npm run sync:agents` propaga as mudanças sem erro para `.aioson/agents/` |
