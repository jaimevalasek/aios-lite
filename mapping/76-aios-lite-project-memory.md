# AIOS Lite Project Memory

## Context
- Projeto: `aios-lite`
- Papel: core local/CLI do ecossistema
- Estado atual: `1.x` com squads, genomas, runtime SQLite, publish/import cloud e integração com dashboard separado

## O que foi consolidado
- `@squad` ficou focado em criar e administrar squads
- `@genoma` ficou separado como camada de conhecimento reutilizável
- squads geram agentes em `agents/{slug}/`
- outputs e logs foram simplificados para:
  - `output/{slug}/`
  - `aios-logs/{slug}/`
- contratos de squad/genoma foram enriquecidos e documentados
- `squad:status` foi alinhado com a estrutura real

## Runtime e observabilidade
- runtime local em SQLite por projeto:
  - `.aios-lite/runtime/aios.sqlite`
- modelo consolidado:
  - `tasks`
  - `agent_runs`
  - `agent_events`
  - `artifacts`
- tarefas agrupam execuções de agentes por solicitação/orquestração
- essa camada passou a servir de ponte para o dashboard

## Cloud
- import local implementado:
  - `cloud:import:squad`
  - `cloud:import:genome`
- publish local implementado:
  - `cloud:publish:squad`
  - `cloud:publish:genome`
- import materializa no projeto local:
  - `.aios-lite/squads/{slug}.md`
  - `.aios-lite/genomas/{slug}.md`
  - `agents/{slug}/`
  - `output/{slug}/`
  - `aios-logs/{slug}/`
  - `.aios-lite/cloud-imports/...`

## Dashboard
- comandos do core já conseguem instalar e abrir o dashboard separado:
  - `dashboard:init`
  - `dashboard:dev`
  - `dashboard:open`
- a estratégia escolhida foi manter o dashboard fora do core para não inflar o CLI

## Direção de produto consolidada
- fluxo principal: `local-first`
- o core continua sendo o lugar principal para:
  - criar squads
  - criar genomas
  - executar trabalho
- cloud e dashboard entram como camadas de:
  - observabilidade
  - versionamento
  - import/export
  - backup textual
  - compartilhamento

## Pendências naturais
- ligar publish/import do core à identidade do usuário autenticado no cloud
- endurecer ainda mais a ativação dos agentes dinâmicos conforme uso real
- continuar refinando o fluxo de outputs HTML e visualização final
