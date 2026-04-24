# Requirements — Design Governance

_Gerado por @analyst — 2026-04-12_
_Fonte: prd.md + discovery.md_

---

## Resumo da feature

Inserir uma camada de governança de design no pipeline SDD do AIOSON: um design-doc base permanente por projeto, o agente `@discovery-design-doc` como gate obrigatório em SMALL e MEDIUM antes de `@dev`, e carregamento obrigatório desse documento por `@dev` e `@deyvin` antes de qualquer implementação.

---

## Novos artefatos introduzidos

### `template/.aioson/context/design-doc.md` (novo template)
Arquivo base distribuído pelo `aioson setup .` — define as regras de organização de código para o projeto. Cada projeto instancia sua própria cópia e a personaliza.

**Seções obrigatórias do template:**
- `## Organização de pastas` — hierarquia semântica, singular vs plural, kebab-case
- `## Componentização` — critérios para extrair um componente vs manter inline
- `## Reuso` — como identificar e reutilizar código existente antes de criar novo
- `## Tamanho de arquivo` — guideline 300–500 linhas; protocolo de alerta acima de 500
- `## Nomeclatura` — convenções por camada (service, util, handler, etc.)

---

## Alterações em artefatos existentes

### `.aioson/agents/discovery-design-doc.md`
- **Atual**: agente existe mas está órfão — nunca invocado em nenhum workflow
- **Mudança**: redefinir sua missão como **gerador de plano técnico concreto por feature**
  - Lê: `design-doc.md` (base) + `prd-{slug}.md` + `requirements-{slug}.md` + artefatos do `@architect`
  - Produz: plano técnico com paths exatos dos arquivos a criar/modificar, componentes a reusar, novos componentes a criar
  - Gate: obrigatório em SMALL e MEDIUM, antes de `@dev`

### `.aioson/agents/dev.md`
- **Mudança**: adicionar seção de pré-voo obrigatória — antes de qualquer implementação, ler `design-doc.md` se existir em `.aioson/context/`. Se ausente em SMALL/MEDIUM, emitir aviso e aguardar.
- **Mudança**: adicionar protocolo de alerta de tamanho — ao estimar que arquivo ultrapassará 500 linhas, emitir alerta explícito com alternativas antes de continuar.

### `.aioson/agents/deyvin.md`
- **Mudança**: mesmas mudanças do `dev.md` — carregamento de `design-doc.md` + protocolo de alerta de 500 linhas
- **Diferença em pair mode**: alerta de tamanho é informativo (não bloqueia o usuário); apresenta alternativas mas segue se o usuário confirmar

### `template/.aioson/agents/` (sincronizar via `npm run sync:agents`)
- Os três agentes acima devem ser atualizados no template e depois sincronizados para `.aioson/agents/`

---

## Regras de negócio

### REQ-design-governance-01 — Design-doc base presente antes de @dev em SMALL/MEDIUM
**Condição**: workflow SMALL ou MEDIUM ativo, `@dev` prestes a iniciar.
**Comportamento esperado**: `@dev` verifica existência de `.aioson/context/design-doc.md`. Se ausente → emite aviso: "Design-doc base não encontrado. Para SMALL/MEDIUM, `@discovery-design-doc` deve ser invocado antes." Não bloqueia a implementação se o usuário confirmar explicitamente prosseguir mesmo assim.
**Quem pode disparar**: `@dev` ao iniciar sessão

### REQ-design-governance-02 — @discovery-design-doc gera plano técnico por feature
**Condição**: workflow SMALL ou MEDIUM, após `@architect` (ou após `@analyst` se `@architect` for pulado).
**Comportamento esperado**: `@discovery-design-doc` lê `design-doc.md` + PRD + requirements da feature → produz plano técnico com: (a) lista de arquivos a criar com paths exatos, (b) arquivos existentes a modificar, (c) componentes a reusar, (d) novos componentes pequenos a criar.
**Quem pode disparar**: usuário via `/discovery-design-doc`

### REQ-design-governance-03 — Alerta de tamanho de arquivo acima de 500 linhas
**Condição**: `@dev` ou `@deyvin` estimam que um arquivo vai ultrapassar 500 linhas ao final da implementação de uma tarefa.
**Comportamento esperado**: emitir alerta explícito no output com: (a) estimativa de tamanho, (b) 2–3 alternativas concretas de split ou extração, (c) aguardar confirmação do usuário antes de continuar. Em pair mode (`@deyvin`), o alerta é informativo — prosseguir se usuário não responder.
**Quem pode disparar**: `@dev`, `@deyvin` ao estimar tamanho durante planejamento da task

### REQ-design-governance-04 — Guideline de nomeclatura semântica de pastas
**Condição**: qualquer agente que cria pastas ou sugere estrutura de diretórios.
**Comportamento esperado**: seguir convenção — singular para entidade única (`component/`, `service/`), plural para coleções (`components/`, `services/`). Kebab-case para todos os nomes. Sem misturar estilos dentro de um mesmo projeto.
**Quem pode disparar**: `@architect`, `@discovery-design-doc`, `@dev`, `@deyvin`

### REQ-design-governance-05 — Componentização antes de implementação
**Condição**: `@dev` ou `@deyvin` prestes a implementar funcionalidade nova.
**Comportamento esperado**: antes de criar arquivo novo, verificar se existe código reutilizável no projeto (via `design-doc.md` seção Reuso). Se encontrar → reutilizar. Se criar novo componente → manter escopo mínimo (uma responsabilidade por arquivo).
**Quem pode disparar**: `@dev`, `@deyvin`

---

## Critérios de aceite

### AC-design-governance-01
**Dado** que um projeto SMALL tem `design-doc.md` ausente e `@dev` é invocado,
**Quando** `@dev` inicia a sessão,
**Então** ele emite aviso explícito sobre ausência do design-doc e pergunta ao usuário se deseja prosseguir mesmo assim.

### AC-design-governance-02
**Dado** que `@discovery-design-doc` é invocado com `prd-{slug}.md` e `design-doc.md` presentes,
**Quando** ele completa sua sessão,
**Então** o output inclui: lista de arquivos com paths exatos, componentes a reusar e novos componentes a criar — todos alinhados com as regras do `design-doc.md`.

### AC-design-governance-03
**Dado** que `@dev` está implementando uma tarefa,
**Quando** ele estima que o arquivo resultante terá mais de 500 linhas,
**Então** ele emite alerta antes de escrever o arquivo e apresenta pelo menos 2 alternativas concretas de extração ou componentização.

### AC-design-governance-04
**Dado** que `@dev` ou `@deyvin` iniciam sessão em projeto com `design-doc.md` presente,
**Quando** planejam a implementação,
**Então** demonstram que leram as regras do design-doc — referenciando ao menos a estrutura de pastas e guideline de tamanho nas decisões da sessão.

### AC-design-governance-05
**Dado** que `@architect` ou `@discovery-design-doc` propõem estrutura de pastas,
**Quando** o output é gerado,
**Então** todos os nomes de pastas seguem kebab-case e a distinção semântica singular/plural está aplicada corretamente.

### AC-design-governance-06
**Dado** que o template AIOSON é atualizado com o `design-doc.md` base,
**Quando** `aioson setup .` é executado em um novo projeto,
**Então** `.aioson/context/design-doc.md` é criado com todas as seções obrigatórias preenchidas com os defaults do framework.

---

## Casos extremos e modos de falha

- **`design-doc.md` vazio ou incompleto**: `@dev` lê o arquivo mas não encontra seções obrigatórias → emite aviso de design-doc incompleto, lista seções faltando, prossegue com defaults do framework
- **Projeto MICRO invoca `@discovery-design-doc`**: não é um erro — mas o agente deve informar que para MICRO o gate é opcional e prosseguir de forma mais leve
- **Arquivo existente já tem 600 linhas (antes desta feature)**: o alerta é para novos arquivos sendo criados — não é retroativo. Não bloquear edições em arquivos legados.
- **`@deyvin` em pair mode, usuário não responde ao alerta**: após 1 turno de espera, continuar com o arquivo único — silêncio do usuário é interpretado como aprovação implícita. Extração nunca é automática em pair mode (ação não confirmada).
- **`npm run sync:agents` não executado após mudança**: os agentes em `.aioson/agents/` ficam desatualizados em relação ao template. Isso é responsabilidade do desenvolvedor — não é tratado pela feature.

---

## Fora do escopo desta feature

- Hard limit de linhas como erro bloqueante (é guideline, não constraint)
- Sub-agentes paralelos por pasta
- CLI command para gerar scaffold automaticamente
- Rastreamento de tamanho de arquivo na telemetria SQLite
- Retroativo em arquivos existentes com mais de 500 linhas
