# @briefing — Estrutura ideias brutas antes de virar feature

> **Para quem é:** quem tem anotações, planos soltos, SQL, código ou outros materiais de um sistema e quer transformá-los em algo acionável.
> **Tempo de leitura:** 4 min.
> **O que você vai sair sabendo:**
> - O que é um briefing e por que ele existe antes do PRD.
> - Como o @briefing usa seus planos como matéria-prima.

## Para que serve

Existe um espaço em branco entre "tive uma ideia" e "vou criar uma feature no AIOSON". Esse espaço é onde muitos projetos erram: a ideia vai direto para `@product` sem estruturação, chegando como requisito vago, com gaps e riscos não identificados.

O `@briefing` preenche esse espaço. Ele lê rascunhos avulsos ou pacotes heterogêneos em `plans/{slug}/`, pesquisa o que for necessário, identifica gaps, mapeia riscos, e entrega um documento estruturado — o briefing — que o `@product` (e depois o `@sheldon`) podem usar como ponto de partida qualificado. O usuário não precisa organizar ou criar um manifesto: o CLI gera um inventário e agrupa logicamente as fontes sem mover os originais.

Anteriormente chamado de `@cypher`, foi renomeado e enriquecido com frameworks de discovery em Abr/2026 (commit `0d40a4b`).

## Quando invocar

- Você tem arquivos em `plans/` com ideias, pesquisas, schemas SQL, migrations, contratos ou código auxiliar não formalizado.
- A ideia ainda não está clara o suficiente para virar feature diretamente.
- Você quer validar premissas de mercado ou técnicas antes de comprometer um PRD.
- Equipe debateu uma ideia em reunião e as anotações estão soltas.

## Quando NÃO invocar

- A direção de produto já está clara — vá direto para `@product`.
- A ideia é simples e óbvia (MICRO) — não precisa de briefing.
- Você quer apenas verificar o estado do projeto — use `@neo`.

## Diálogo típico

```
Você > @briefing

@briefing > Encontrei um pacote misto em plans/marketplace-v1/:
             - ideia-marketplace.md              (intenção)
             - schema.sql                        (estado atual)
             - 002_add_payments.sql              (histórico)
             - openapi.yaml                      (contrato)

             Quais devo usar como fonte? (todos ou lista específica)
Você > Todos.

@briefing > Lendo... Pesquisando validação de premissas técnicas...

             Briefing gerado: .aioson/briefings/marketplace-v1/briefings.md

             Resumo:
             - Problema: vendedores sem canal de venda digital
             - Hipóteses validadas: 2/4 (2 precisam de POC técnica)
             - Gaps identificados: modelo de comissão não especificado,
               regras de cancelamento ausentes
             - Riscos: integração com correios pode ter latência alta
             - Próximo passo recomendado: @product com este briefing como input

             O briefing está pronto para aprovação. Deseja ajustar algo?
```

## Saídas em disco

| Arquivo | O que contém |
|---|---|
| `.aioson/briefings/{slug}/briefings.md` | Briefing estruturado: problema, hipóteses, gaps, riscos, recomendações |
| `.aioson/briefings/config.md` | Índice de todos os briefings com status (draft/approved/implemented) |

## Como ele lê seu projeto

1. `.aioson/briefings/config.md` — verifica briefings existentes (evita sobrescrever).
2. `aioson briefing:sources . --json` — descobre pacotes e arquivos avulsos sem carregar conteúdo.
3. `plans/{slug}/` — pacote somente leitura; pode conter Markdown, SQL, contratos, código, exemplos e referências em qualquer organização física.
4. `.aioson/context/project.context.md` — contexto do projeto.
5. `.aioson/context/prd*.md` e `prds/*.md` — evita duplicar trabalho já comprometido.
6. Web search quando há premissas que precisam de validação externa.

Quando o pacote contém SQL, o agente o trata como documentação executável do sistema: reconstrói entidades, relações, constraints e evolução das migrations, mas separa fatos observados, inferências, hipóteses e desconhecidos. O SQL nunca é executado, e dumps com dados permanecem somente como metadados, sem expor ou carregar suas linhas no contexto do agente.

> **Fast path de ativação:** ativar `@briefing` "seco", sem nomear plano ou tarefa, carrega **só** o `project.context.md`, o frontmatter do registro e o inventário de nomes/metadados de `plans/` — apresenta o menu e para. O conteúdo entra somente depois que um pacote é selecionado. Veja [Carregamento seletivo de contexto](../5-referencia/memoria-e-contexto.md#carregamento-seletivo-de-contexto-v1290).

## O que o briefing precisa conter

O `briefings.md` é artefato canônico, não rascunho livre. Ele carrega frontmatter (`slug`, `created_at`, `updated_at`, `source_plans`) e oito seções obrigatórias, nesta ordem:

`## Context` · `## Problem` · `## Proposed solution` · `## Themes` · `## Risks` · `## Identified gaps` · `## Sources` · `## Open questions`

Duas convenções sustentam o resto do fluxo:

- **Perguntas em aberto são numeradas e classificadas** com `[research-able]`, `[testable]`, `[decision-required]` ou `[out-of-scope]`. Pergunta sem etiqueta não sobrevive ao gate.
- **Ausência de evidência é escrita**, não omitida: use `TBD — not discussed in this session.` Um `TBD` solto, sem essa forma, vira aviso.

Dentro de `## Sources` nasce a linhagem que o `@sheldon` vai cobrar depois: `### Source Inventory` (uma linha `SRC-*` por arquivo, com caminho relativo e fingerprint `sha256:`) e `### Source Promise Map` (uma linha `PROM-*` por promessa material, citando sua fonte).

## Contratos de qualidade de spec e de interação

Quando a feature tem superfície visível ou operacional rica, o `@briefing` consulta o brain de qualidade visual (`brain:query --agent=briefing --tags=spec-quality`) e trata seus nós e as regras de `.aioson/rules/` que casam como **vinculantes**:

- O **teste de substituibilidade** roda em `## Problem` e `## Proposed solution` — o primeiro lugar onde texto genérico pode entrar. Se o parágrafo continua fazendo sentido depois de trocar o produto, ele não descreve nada.
- Os **contratos de interação** da superfície (máscaras e validação, confirmação de mudança de status, drag-and-drop em fluxo recorrente, widgets de decisão) são registrados como promessa ou como pergunta classificada em aberto.

O ganho é de ordem: o contrato nasce como escopo em vez de ser descoberto como ausência pelo `@briefing-refiner` — ou, pior, pelo `@qa`. Veja [Regras de interação e gate visual](../5-referencia/regras-de-interacao-e-gate-visual.md).

## Gate determinístico antes do handoff

Depois de escrever o `briefings.md`, o agente roda a verificação determinística e conserta tudo que aparecer:

```bash
aioson verify:artifact . --kind=briefing --slug={slug} --advisory
```

Ela prova o que é mecanicamente provável — identidade no frontmatter, as oito seções, classificação das perguntas, disciplina de placeholder, a entrada no registro `config.md` e a linhagem de fontes (fingerprint desatualizado, quebra de `SRC-*`/`PROM-*`). Briefing legado ou conversacional sem inventário não é reprovado: a inaplicabilidade vira aviso.

Antes esse mesmo check só acontecia dois agentes depois, no preflight do `@sheldon`. Agora ele roda onde a linhagem nasce.

O que **não** é verificado por máquina continua sendo julgamento do agente: se cada `PROM-*` representa fielmente a sua fonte, e se a incerteza foi preservada honestamente.

Detalhes de cada checagem: [Comandos do CLI](../5-referencia/comandos-cli.md#verifyartifact---kindbriefing).

## Opção `--help`

Uma ativação com `--help` (`/briefing --help`) imprime um resumo rápido — o que faz, quando usar, chamada típica, o que produz, próximo agente — localizado no seu idioma, e para sem executar nada. Fonte: `.aioson/docs/agent-help.md`.

## Handoff típico

- **Vem de:** você, com arquivos avulsos, um pacote heterogêneo em `plans/{slug}/` ou uma ideia conversacional.
- **Vai para:** [`@briefing-refiner`](./briefing-refiner.md) (opcional — loop de revisão e refino do briefing antes do PRD) ou, após `aioson briefing:approve`, `@product` (que usa o briefing como contexto enriquecido no PRD).

## Modo conversacional

Se não existir pacote ou arquivo utilizável em `plans/`, o `@briefing` entra em modo conversacional — ele te entrevista e constrói o briefing a partir das respostas. Útil quando a ideia ainda está só na sua cabeça.

```
Você > @briefing

@briefing > Não encontrei arquivos em plans/. Quer planejar a ideia comigo
            conversacionalmente? Vou fazer perguntas e montar o briefing.
Você > Sim.
@briefing > Qual o problema que você quer resolver?
```

## Próximo passo

- Entender o fluxo completo → [Mapa do ecossistema](../1-entender/mapa-do-ecossistema.md)
- Revisar e refinar o briefing antes do PRD → [@briefing-refiner](./briefing-refiner.md)
- Após o briefing aprovado → [@product](./product.md) *(ficha em construção)*
- Termos como "gap" e "PRD" → [Glossário](../1-entender/glossario.md)
