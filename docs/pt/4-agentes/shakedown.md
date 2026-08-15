# @shakedown — Pente-fino pós-entrega

> **Para quem é:** quem já recebeu o PASS do QA e quer saber o que ninguém escreveu em lugar nenhum.

## A frase que define o agente

> **QA verifica a promessa; o shakedown audita o silêncio.**

Todo outro verificador está ancorado num artefato anterior: o QA confere o PRD, o Tester cobre o comportamento aprovado, o Validator checa o contrato. O valor do shakedown é exatamente **não estar ancorado em nada**. Ele caminha pelo sistema entregue como um tech lead caminha por um produto que não conhece — e procura o que falta, não o que foi prometido.

## Diferença para QA, Tester e Pentester

| Agente | Pergunta que ele faz |
|---|---|
| `@qa` | "O que o PRD prometeu está entregue?" |
| `@tester` | "O comportamento aprovado está protegido contra regressão?" |
| `@pentester` | "Dá para quebrar isso de propósito?" |
| `@shakedown` | "O que está faltando que ninguém pensou em pedir?" |

O que ele caça: listagem sem editar/excluir, formulário sem validação, estados de vazio/erro/carregando ausentes, becos sem saída, e **padrão presente num módulo e ausente no módulo irmão**. Bug reproduzível é subproduto bem-vindo; **ausência é o alvo**.

Começa desligado. A classificação nunca o ativa — só pedido explícito ou gatilho concreto pós-entrega.

## A regra que faz o agente funcionar

**A primeira passada é cega para a spec, por contrato.** Ele não abre o PRD, o plano nem o relatório de QA antes de ter inventariado todas as superfícies e passado o checklist em cada uma. Só depois disso lê os artefatos — e aí produz duas listas:

1. o que a spec prometeu e a caminhada não encontrou;
2. o que a caminhada encontrou e a spec nunca mencionou — **esta segunda lista é semente de briefing**.

## Quando invocar

- Depois do PASS do QA, antes de considerar a feature realmente pronta.
- Sobre um app inteiro já entregue (feature fechada ou produto legado).
- Depois de uma entrega pela rota curta (Simple Plan).
- Sobre um alvo nomeado: `@shakedown <módulo/tela/caminho>`.

## Os 4 modos (um método, quatro alvos)

| Modo | Gatilho | Superfícies auditadas |
|---|---|---|
| Post-QA | feature ativa, depois do veredito | as superfícies entregues + seus módulos irmãos |
| Archived | feature fechada ou app inteiro | tudo alcançável a partir do entrypoint de produção |
| Simple Plan | depois de uma entrega curta | as superfícies mudadas + suas irmãs |
| Direct target | `@shakedown <alvo>` | o alvo nomeado + suas irmãs |

## Cobertura é contrato, não amostra

O inventário de superfícies **é** o contrato de cobertura: `superfícies − visitadas` precisa ser zero para a execução se dizer completa. Não existe amostragem. Se o app não roda, a execução vira `static` (checklist aplicado sobre o código) e isso fica carimbado no frontmatter — nunca disfarçado de execução real.

## O relatório

`.aioson/context/shakedown-{slug}.md`, com frontmatter (`target`, `mode`, `run`, `coverage`) e estas seções:

| Seção | O que registra |
|---|---|
| `## Coverage` | uma linha por superfície: visitada? veredito? |
| `## Punch list` | `\| ID \| Class \| Surface \| Finding \| Evidence \| Suggested lane \|` |
| `## Quick wins` | o subconjunto resolvível num único lote de Simple Plan |
| `## Not visited` | precisa estar **vazio** numa execução completa |

`Class` é uma de:

- **`bug`** — exige passos de reprodução exatos (entrypoint → ação → esperado vs observado);
- **`incomplete`** — exige evidência da convenção: o módulo irmão, uma convenção do projeto, um contrato de interação em `.aioson/rules/`, ou o item do checklist;
- **`polish`** — explicitamente nice-to-have.

Nada de achado por gosto pessoal: todo veredito `incomplete` cita a sua evidência.

## Gate determinístico antes do handoff

```bash
aioson verify:artifact . --kind=shakedown --file=.aioson/context/shakedown-{slug}.md --advisory
```

Dispara sozinho no `agent:done`. Prova enums do frontmatter, a aritmética da cobertura, evidência na punch list e consistência do `## Not visited`.

## O que ele nunca faz

- **Nunca corrige.** A punch list é o único artefato. Ele recomenda a lane e para.
- Nunca cria PRD, spec, plano ou readiness.
- Nunca concede nem bloqueia o Gate D.
- Nunca roda `feature:close`, commit ou publish.
- Nunca aciona sozinho o agente que vai corrigir — a decisão de roteamento é sua.

## Handoff típico

- **Vem de:** você, depois do QA ou sobre um app já entregue.
- **Vai para:** `@dev` pela rota curta (quick wins) · `@briefing`/`@product` (lacuna de escopo real) · `@tester` (lacuna de verificação).

Cada achado já vem com a lane sugerida, seguindo o mesmo gate de roteamento do framework: correção bounded cabe no Simple Plan; escopo de produto de verdade volta para o começo da esteira.

## Veja também

- [Ficha do @qa](./qa.md) — o Gate D
- [Ficha do @tester](./tester.md) — cobertura do comportamento aprovado
- [Mapa do ecossistema](../1-entender/mapa-do-ecossistema.md#a-esteira-principal) — onde o shakedown fica em relação à esteira
