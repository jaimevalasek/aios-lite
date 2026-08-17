# @benchmark — Orquestrador da travessia medida

> **Para quem é:** quem quer comparar o harness puro contra o AIOSON de verdade — o fluxo completo — a partir do mesmo prompt congelado.

## Para que serve

`@benchmark` conduz **uma travessia medida**: pega um prompt congelado e atravessa a cadeia real de agentes do AIOSON, do briefing à entrega, **sem nenhum humano no meio**. O resultado é software rodável mais artefatos honestos de execução, comparáveis lado a lado com o que um harness sozinho produziria para o mesmo prompt.

Ele representa como o AIOSON funciona de verdade — o fluxo, não um atalho. Ninguém que usa o AIOSON invoca um "agente construtor"; quem usa o AIOSON atravessa briefing, refinamento, PRD, revisão, plano, dev e QA. É isso que a rodada mede.

Ele é o orquestrador de **uma** execução. Nunca é a Arena, a conta, o modelo, o custo, o histórico ou o orquestrador da comparação.

## As duas rotas

A primeira decisão da travessia é detectar o que o prompt pede de verdade:

| Rota | Quando | Cadeia | Entregável |
|---|---|---|---|
| **prototype** | jogo, brinquedo ou experimento visual de **uma tela** — sem servidor, sem contas, sem dados persistentes multi-tela | `@briefing → @briefing-refiner` | o `prototype.html` funcional completo — o artefato comparável ao HTML único que o harness produziria |
| **full** | qualquer aplicação real: site, CRM, dashboard, SaaS, API — o que um dev construiria com Node.js, React, Vite | `@briefing → @briefing-refiner (sem protótipo) → @product → @sheldon → @planner → @dev → @qa` em Autopilot | software rodando, com servidor quando o produto pede |

Na dúvida, rota **full** — é o caminho real do produto. Jogo com servidor, ranking ou contas é rota full. A rota escolhida e o motivo ficam registrados no `report.md`.

## A postura que o define: não interativo de ponta a ponta

Numa rodada medida não há humano para responder; qualquer espera congela a comparação e invalida o tempo aferido. Por isso:

- perguntas são proibidas — ambiguidade se resolve por evidência e defaults fortes, e vira suposição registrada;
- nenhum artefato de espera é produzido: sem `review.html`, sem feedback de navegador, sem prompt de confirmação;
- toda decisão estruturada resolve pela opção `recommended: true`; um bloqueio **sem** opção recomendada falha a rodada explicitamente com o motivo — nunca chute, nunca trava;
- cada resolução automática fica logada no `report.md` (`## Auto-decisions`), para auditoria posterior;
- os gates humanos **nunca** são exercidos dentro da rodada: `briefing:approve`, congelamento de protótipo, `feature:close`, commit, publish.

Tudo isso vale **somente** dentro de um workspace medido: o `aioson benchmark:bootstrap` grava o marcador `.aioson/benchmark/measured-run.json`, e é a presença dele — nunca texto de prompt — que suaviza os gates. O fluxo normal com humano no meio continua intacto em projetos reais.

## Bootstrap e verificação seca

```bash
aioson benchmark:bootstrap . --json      # prepara o workspace medido (repara e verifica)
aioson benchmark:bootstrap . --check     # verificação seca: a rodada atravessa? o que falta?
```

O bootstrap completa o conjunto de agentes gerenciados (preservando a instrução congelada e os arquivos de fronteira do orquestrador externo), repara o `project.context.md` para um contexto válido com `auto_handoff: true` e grava o marcador. Uma rodada só começa quando ele responde `"ok": true`.

## Isolamento e justiça

São regras bloqueantes, não recomendações:

- o prompt original fica congelado em texto e sentido;
- nunca inspeciona execuções irmãs — nem fonte, relatório, screenshot, score, transcrição ou comparação;
- nunca orquestra outros modelos, harnesses ou contas — conduzir os agentes da cadeia AIOSON **dentro** da rodada é o território dele; qualquer coisa além, não;
- nunca escreve fora do run root atribuído;
- nunca inventa duração, tokens, preço ou custo — essa provenance é do orquestrador externo; timestamps ISO por etapa no `report.md` são dele;
- nunca commita, publica, faz deploy ou roda `feature:close`.

## O que ele entrega

No run root atribuído:

| Artefato | O que é |
|---|---|
| a entrega rodável | rota full: o app na estrutura de fonte normal do stack; rota prototype: o HTML funcional completo |
| `benchmark-result.json` | resultado legível por máquina, **schema 1 estrito de 11 campos** — o parser externo rejeita campo extra e qualquer outra versão |
| `report.md` | rota + motivo, tabela de etapas com timestamps, auto-decisões, validação, limitações |
| screenshots/assets | opcionais, por caminho relativo — nunca fabricados |

Cada etapa atravessada deixa sua evidência canônica no workspace (`briefings.md`, `refinement-report.md`, `prd-{slug}.md`, `sheldon-review-{slug}.md`, `implementation-plan-{slug}.md`, `dev-state.md`, `qa-report-{slug}.md`) — é por esses caminhos exatos que o orquestrador externo enxerga o progresso.

## A regra anti-fraude do resultado

> **Toda entrada de `features[]` precisa de pelo menos uma linha em `validation[]`.** Uma feature sem validação vai para `known_limitations` antes de `completed` ser permitido.

Somado a isso:

- `status` é `completed` só quando a experiência principal roda pelo entrypoint normal e o caminho central funciona;
- `partial` quando existe resultado útil mas uma promessa, etapa ou validação ficou aberta;
- travessia interrompida no meio ainda escreve os dois artefatos, nomeando a etapa em `known_limitations` — rodada sem resultado esconde o ponto real da falha;
- campos de duração, token, provider, modelo, conta, preço ou score são **proibidos** no arquivo.

## Gate determinístico

```bash
aioson verify:artifact . --kind=benchmark-result --file=benchmark-result.json --advisory
```

Prova o parse, os enums, o formato das linhas, a existência e contenção dos caminhos, ausência dos campos de provenance proibidos e a cobertura de validação exigida pelo `completed`.

## Handoff típico

- **Vem de:** o orquestrador externo do benchmark (missão do Cockpit), ou uma chamada direta com prompt congelado num diretório qualquer.
- **Vai para:** de volta ao chamador, com status e caminhos de artefato.

## Veja também

- [Contrato da travessia](../../../template/.aioson/docs/benchmark/traversal.md) — o módulo binding que o agente carrega em toda rodada
- [Ficha do @dev](./dev.md) — a construção dentro da esteira, com PRD e plano
- [Mapa do ecossistema](../1-entender/mapa-do-ecossistema.md#a-esteira-principal) — a esteira que a rota full atravessa
