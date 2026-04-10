# Memoria local - blueprints dinamicos de conteudo

Data: 2026-03-07

## Decisao principal

O modelo de conteudo do AIOS Lite nao deve fixar campos como `roteiro`, `titulos` ou `descricao`.

O framework fixa apenas a casca:

- `content_key`
- `contentType`
- `layoutType`
- `payload_json`

O dominio interno nasce da squad.

## Contrato recomendado

Cada squad pode declarar `contentBlueprints` em `agents/{squad-slug}/squad.manifest.json`.

Cada blueprint deve descrever:

- `slug`
- `contentType`
- `layoutType`
- `description`
- `sections`

Cada `section` deve ser declarativa:

- `key`
- `label`
- `blockTypes`

## Regra importante

Os nomes das secoes sao dinamicos e dependem do dominio:

- YouTube: `roteiro`, `titulos`, `thumb-prompts`
- Juridico: `parecer`, `riscos`, `clausulas`
- Produto: `prd`, `edge-cases`, `rollout`

## Renderer

O dashboard deve conhecer apenas blocos genericos:

- `hero`
- `section`
- `rich-text`
- `bullet-list`
- `numbered-list`
- `tags`
- `tabs`
- `accordion`
- `callout`
- `copy-block`

## Estado atual

- runtime local ja grava `content_items`
- dashboard local ja possui aba `Conteudos`
- viewer declarativo ja renderiza `content.json`
- `@squad` ja foi instruido a gerar `contentBlueprints` de forma dinamica

## Proximo passo natural

Levar o mesmo contrato de `contentBlueprints` para o `aioslite.com`, para publish/import e storage cloud do manifesto modular.
