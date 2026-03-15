# Task: Squad Pipeline

> Gerenciamento de pipelines inter-squad. Conecta squads em fluxos de produção autônomos via DAG.

## Quando usar
- `@squad pipeline create <nome>` — cria um novo pipeline
- `@squad pipeline connect <pipeline> <source-squad>:<port> → <target-squad>:<port>` — conecta squads
- `@squad pipeline show <pipeline>` — exibe o DAG com nós, arestas e status
- `@squad pipeline run <pipeline>` — executa o pipeline (aciona handoffs)

## Conceito

Um **pipeline** é um grafo dirigido acíclico (DAG) de squads conectados por ports.
Cada squad declara `ports.inputs` e `ports.outputs` no `squad.manifest.json`.
Uma aresta conecta um output de um squad ao input de outro.

Quando um squad produz um output, cria um **handoff** (tabela `squad_handoffs`) com o payload.
O squad downstream lê os handoffs `pending` com `to_squad = seu slug` e os consome.

## Pré-requisitos

Antes de criar um pipeline, verifique:
1. Os squads participantes existem em `.aioson/squads/`
2. Cada squad tem `squad.manifest.json` com a seção `ports` declarada
3. Os ports de input/output são compatíveis em `dataType`

Se um squad não tem ports declarados, oriente o usuário a:
- Editar `squad.manifest.json` adicionando a seção `ports`
- Ou use `@squad extend <slug>` para adicionar ports interativamente

## Passo 1 — Criar o pipeline

```json
{
  "slug": "<pipeline-slug>",
  "name": "<nome legível>",
  "description": "<descrição opcional>",
  "status": "draft",
  "triggerMode": "manual"
}
```

Registre via `aioson runtime` ou diretamente no SQLite (`squad_pipelines`).

## Passo 2 — Adicionar nós ao pipeline

Para cada squad participante, registre em `pipeline_nodes`:
- `pipelineSlug` — slug do pipeline
- `squadSlug` — slug do squad
- `positionX`, `positionY` — posição no canvas visual (opcional, padrão 0,0)

## Passo 3 — Conectar squads (criar arestas)

Para cada conexão `source:port → target:port`, registre em `pipeline_edges`:
- `pipelineSlug` — slug do pipeline
- `sourceSquad`, `sourcePort` — squad origem e port de output
- `targetSquad`, `targetPort` — squad destino e port de input
- `transform` — transformação de dados opcional (JSON)

Valide:
- Nenhum ciclo no DAG (use ordenação topológica de Kahn)
- Ports existem nos manifests
- DataTypes compatíveis (ou `any`)

## Passo 4 — Exibir o pipeline

Ao mostrar `@squad pipeline show <pipeline>`, exiba:

```
Pipeline: <nome>
Status: draft | active | paused
Trigger: manual | on_output | scheduled

Fluxo:
  [squad-a] --output-key--> [squad-b] --outro-key--> [squad-c]

Ordem topológica: squad-a → squad-b → squad-c

Handoffs pendentes: 0
```

Se detectar ciclo: "⚠️ Ciclo detectado — pipeline inválido. Verifique as conexões."

## Passo 5 — Executar o pipeline (handoff)

Ao executar `@squad pipeline run <pipeline>`:
1. Calcule a ordem topológica
2. Para cada squad na ordem:
   - Leia handoffs `pending` com `to_squad = squad_slug`
   - Crie o contexto de execução com o payload dos handoffs
   - Notifique o usuário: "Ativando @<squad> com input de @<source>"
3. Após cada squad processar seu output:
   - Crie handoffs `pending` para os squads downstream conectados
   - Marque handoffs consumidos como `consumed`

## Formato de handoff

```json
{
  "id": "<uuid>",
  "pipelineSlug": "<pipeline>",
  "fromSquad": "<source>",
  "fromPort": "<output-key>",
  "toSquad": "<target>",
  "toPort": "<input-key>",
  "payload": { "contentKey": "...", "filePath": "..." },
  "status": "pending"
}
```

## Output contract

- Pipeline registrado em SQLite (`squad_pipelines`, `pipeline_nodes`, `pipeline_edges`)
- Handoffs em `squad_handoffs`
- Relatório visual disponível em `/pipelines/<slug>` no dashboard

## Hard constraints

- Nunca criar um pipeline com ciclo — rejeite e explique o problema
- Validar compatibilidade de dataType antes de conectar
- Handoffs são imutáveis após criados — crie novos em vez de editar
- Pipeline em status `active` não pode ter nós removidos sem voltar para `draft`
