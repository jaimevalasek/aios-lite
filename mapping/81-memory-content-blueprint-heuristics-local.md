# Memoria local - heuristicas de contentBlueprints

Data: 2026-03-07

## Objetivo desta rodada

Melhorar o `@squad` para escolher `layoutType`, `sections` e `blockTypes` de forma mais consciente e menos arbitraria.

## Heuristicas registradas

### Escolha de `layoutType`

- `document`: entrega longa e linear
- `tabs`: varias saidas irmas no mesmo pacote
- `accordion`: alternativas, comparacoes, FAQs ou grupos expansivos
- `stack`: blocos independentes em leitura vertical
- `mixed`: pacote rico com hero + secoes + tabs/accordion

### Desenho de `contentBlueprints`

- `sections` devem nascer do objetivo real da squad
- usar vocabulario do dominio do usuario quando fizer sentido
- aproveitar skills e docs locais que ja indiquem entregaveis recorrentes
- preferir 1 blueprint principal forte antes de criar varios superficiais
- escolher `blockTypes` pelo padrao de leitura esperado, nao por efeito visual

## Estado atual

- `@squad` ja carrega essas heuristicas no prompt base e em `pt-BR`
- doc PT-BR de squad/genoma ja explica isso
- teste do contrato do `@squad` ja protege essa heuristica

## Proximo passo natural

Levar essas heuristicas para um fluxo mais operacional no futuro:

- inferencia semi-estruturada de blueprint a partir do pedido do usuario
- validacao mais forte do `content.json` produzido pelos squads
- possivel skill especifica para ajudar squads de conteudo a desenhar blueprints melhores
