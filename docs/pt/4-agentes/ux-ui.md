# @ux-ui — Consultoria de interface

> **Para quem é:** quem tem uma dúvida de interação concreta que o protótipo aprovado não resolveu.

> ⚠️ **Não é uma etapa da esteira.** O visual da feature é decidido antes, no protótipo navegável que você aprova no `@briefing-refiner`. O `@ux-ui` é um desvio opt-in para uma pergunta nomeada. Ver [a esteira principal](../1-entender/mapa-do-ecossistema.md#a-esteira-principal).

## Onde mora a autoridade visual

O `@dev` resolve a direção visual nesta ordem, parando no primeiro acerto:

1. a identidade vinculada no PRD (`identity` / `identity_status`);
2. o protótipo aprovado (`prototype_status: current`) e sua `## Visual direction`;
3. a `design_skill` selecionada do projeto;
4. a linguagem de componentes que já existe no repositório.

Se depois disso a direção continuar sem resolução, isso é **pergunta de produto** — volta para o `@product`. Nem o `@dev` nem o `@deyvin` encaminham automaticamente para o `@ux-ui`.

## Para que serve

`@ux-ui` transforma uma decisão de experiência ainda em aberto em fluxo, componente, estado, token e critério que Product, Planner e DEV podem usar. Ele respeita a identidade e o design skill configurados e não inventa outro sistema visual.

É consultivo em qualquer classificação. MEDIUM não o ativa automaticamente.

## Quando invocar

- Uma interação, estado ou comportamento de acessibilidade ficou genuinamente indefinido depois do protótipo aprovado.
- Você quer explicitamente o entregável de spec de UI (`ui-spec` só existe quando você o pede).
- Você quer auditar uma UI existente (`@ux-ui audit`).
- Você quer o contrato de tokens ou o mapa de componentes de uma UI já construída.

Não invoque para backend puro, nem quando protótipo, identidade e design skill já deixam a implementação clara — nesse caso o `@dev` implementa direto.

## Saídas possíveis

- `design-doc-{slug}.md`;
- `ui-spec.md`;
- atualização de ACs no PRD;
- decisões de componentes incorporadas ao plano.

Esses artefatos enriquecem a feature e não se tornam gates canônicos por simples existência ou ausência.

## Handoff típico

- **Vem de:** usuário, Product, Sheldon, Planner ou DEV por pedido explícito.
- **Vai para:** Product/PRD, Planner/plano ou DEV, conforme a decisão.

## Veja também

- [Ficha do @planner](./planner.md)
- [Decisões iniciais: design system](../2-comecar/decisoes-iniciais.md#escolhendo-o-design-system)
- [Glossário: Design Skill](../1-entender/glossario.md#design-skill)
