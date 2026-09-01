# A telemetria de roteamento era escrita e nunca lida — e o corpus só media metade da prova

**Data:** 2026-09-01 · **Src:** AIOSON supervised session: meditação sobre um relatório estratégico de engenharia com IA e três transcrições de aula, cruzadas com o estado real do framework

## O que aconteceu

Três fontes independentes sobre "como trabalhar com IA" repetiam o mesmo trio: observabilidade por etapa (sem leitor, a IA é caixa-preta), evals com casos negativos (precisão, não só recall) e segredo nunca vai para log. Cruzado com o código: os eventos `brief_built`/`*_loaded` da onda anterior tinham escritor e nenhum leitor; o corpus de trigger-evals tinha 169 `expect` e 24 `absent` — cobertura 100% e precisão sem lastro; e o stream geral de `execution_events` gravava o que recebesse, verbatim (só o stream orquestrado sanitizava).

## O que a medição achou ao construir

- **Cinco disparos indevidos em três rules shipped**, na primeira rodada dos negativos: `column`/`coluna` (kanban) casava com coluna de banco; `prints` (screenshot em pt-BR) casava com "prints the version"; `reporting`/`relatório`/`Report` (widgets da home) casava com exportação CSV e gerador de PDF. Cobertura 100% nunca veria isso — só um `absent` vê.
- **`paths: ['**']` numa rule é guard em todo arquivo**: a regra de idioma de identificadores injetava em qualquer `.md` que falasse de função ou naming convention (aconteceu ao vivo ao escrever este learning). Guard só em globs de código; no brief ela continua lei (`load_tier: always`).
- **`agent:done` standalone não grava `agent_done`**: grava `start` + `finished`; o evento `agent_done` só existe no caminho live. Um leitor que filtre só por `agent_done` conta zero sessões encerradas.
- **Nome de agente tem duas grafias na telemetria**: `dev` nas linhas do brief, `@dev` nas linhas de run. Todo agregador precisa normalizar antes de cruzar.

## A receita

1. Escritor sem leitor é dívida: todo evento novo nasce com a consulta que o lê (`context:usage`) e com o flag determinístico que ele sustenta (`loaded_never_selected`, `done_without_brief`, `skills_never_selected`).
2. Trajetória se lê do contrato, não de lista: o kernel que diz `context:brief` prometeu consultar; o `agent:done` cobra a promessa lendo o próprio arquivo do agente — um agente do consumidor que adote a linha é medido igual.
3. Negativo é metade da prova: tarefa neutra e realista (typo no README, bump de versão, migration) contra os artefatos de trigger mais largo; o `absent` que falha nomeia o trigger nu que precisa virar frase do domínio (`kanban column`, `prints de tela`).
4. Redação no ponto único de INSERT, não em cada escritor: padrões de valor (chaves de provedor, bloco de chave privada) somem onde aparecerem; atribuições mantêm a chave e perdem o valor, em texto e dentro de JSON (que continua parseável).

## O que ficou de fora, de propósito

Vetores/embeddings, gateway de modelos, LLM-juiz dentro do CLI e cache semântico: o CLI é build-free e model-agnostic, os agentes são o LLM. Contrato de teste por feature (seed data nomeado, pré-requisitos de runtime por feature) fica como follow-up: o PRD já carrega a coluna `Evidence` por AC e o relatório de QA o smoke de produção; um artefato novo teria raio de explosão nos contratos pinados. Sobreposição semântica em `should_load` por palavras genéricas (`table`, `index`, `order`, `query`) é folga de recall conhecida, não lei.
