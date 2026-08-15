# @benchmark — Construção autônoma para benchmark

> **Para quem é:** quem quer comparar modelos, harnesses ou versões do framework construindo a mesma coisa em condições idênticas.

## Para que serve

`@benchmark` pega **um prompt congelado** — possivelmente simples — e entrega o app ou jogo mais completo, rodável e polido que couber nos limites da chamada. Ele expande a intenção sozinho, pesquisa evidência atual, implementa a experiência real e **prova o que funciona**.

Ele é a inteligência de construção de **uma** execução. Nunca é a Arena, a conta, o modelo, o custo, o histórico ou o orquestrador da comparação.

## A postura que o define: zero perguntas

Este é o único agente do AIOSON que **não pergunta nada**. Perguntar destruiria o benchmark — a resposta do humano vazaria para dentro de uma execução e não da outra.

No lugar da pergunta:

- resolve produto, design, conteúdo e engenharia a partir do prompt, do repositório, das convenções atuais, de pesquisa dirigida e de defaults fortes de domínio;
- registra as suposições consequentes em `benchmark-result.json` e as explica no `report.md`;
- prefere escolha reversível quando a evidência é fraca;
- trata limite de tempo, token, tecnologia ou permissão como **teto, nunca como motivo de follow-up**.

E não transforma ambiguidade em demo minúscula: infere a menor vertical ambiciosa que pareça intencionalmente completa, e **termina** antes de adicionar largura.

## Isolamento e justiça

São regras bloqueantes, não recomendações:

- o prompt original fica congelado em texto e sentido;
- nunca inspeciona execuções irmãs — nem fonte, relatório, screenshot, score, transcrição ou comparação;
- nunca orquestra outros modelos, harnesses ou contas; roda exatamente uma vez, como o participante atual;
- nunca escreve fora do run root atribuído;
- nunca inventa duração, tokens, preço ou custo — essa provenance é do orquestrador externo;
- nunca commita, publica, faz deploy ou muta estado de workflow.

## Quando invocar

- Comparar modelos ou harnesses no mesmo desafio.
- Medir o efeito de uma mudança do framework sobre a qualidade de entrega.
- Produzir uma execução isolada de referência a partir de um prompt fixo.

Não invoque para construir uma feature do seu produto — para isso existe a [esteira](../1-entender/mapa-do-ecossistema.md#a-esteira-principal).

## O que ele entrega

No run root atribuído:

| Artefato | O que é |
|---|---|
| o app/jogo rodável | sob o delivery root, na estrutura de fonte normal do stack — nunca um HTML gigante forçado |
| `benchmark-result.json` | resultado legível por máquina, schema v1 |
| `report.md` | evidência humana: interpretação, suposições, pesquisa aplicada, arquitetura, como rodar, validação, limitações |
| screenshots/assets | opcionais, por caminho relativo — só se houver ferramenta real; nunca fabricados |

## A regra anti-fraude do resultado

O `benchmark-result.json` tem uma restrição que impede a métrica de mentir:

> **Toda entrada de `features[]` precisa de pelo menos uma linha em `validation[]`.** Uma feature sem validação vai para `known_limitations` antes de `completed` ser permitido.

É a forma determinística de "não rotule como passou um check que você pulou". Somado a isso:

- `status` é `completed` só quando a experiência principal roda pelo entrypoint normal e o caminho central funciona;
- `partial` quando existe resultado útil mas uma promessa ou validação ficou aberta;
- `validation[].status` é `passed`, `failed` ou `not_run` — um `FAIL` honesto é evidência legítima;
- campos de duração, token, provider, modelo, conta, preço ou score são **proibidos** no arquivo.

## Gate determinístico

```bash
aioson verify:artifact . --kind=benchmark-result --file=benchmark-result.json --advisory
```

Prova o parse, os enums, o formato das linhas, a existência e contenção dos caminhos, ausência dos campos de provenance proibidos e a cobertura de validação exigida pelo `completed`. Sem CLI disponível, o agente roda o mesmo checklist à mão — a execução nunca depende do CLI.

## Autoridade visual

Lê `design_skill` só do contexto do projeto e carrega exatamente um pacote contido. Esse é o sistema visual único; identidade, componentes e prompt apenas o parametrizam. Se estiver em branco, usa os componentes do repositório mais o brain de qualidade visual e registra a declaração ausente — **nunca auto-seleciona, nunca mistura skills, nunca pergunta durante a execução**.

O passe anti-slop também roda aqui: teste de substituibilidade (se a UI continua funcionando com o produto trocado, falta o gesto assinatura do domínio) e cadência de travessão reescrita.

## Handoff típico

- **Vem de:** o orquestrador externo do benchmark, ou uma chamada direta com prompt congelado.
- **Vai para:** de volta ao chamador, com status e caminhos de artefato. **Nunca ativa outro agente AIOSON.**

## Veja também

- [Ficha do @dev](./dev.md) — a construção dentro da esteira, com PRD e plano
- [Mapa do ecossistema](../1-entender/mapa-do-ecossistema.md#a-esteira-principal) — por que benchmark fica fora da esteira
