# Memoria local - validacao minima de content.json

Data: 2026-03-07

## Decisao

O runtime do AIOS Lite agora valida o `content.json` antes de registrar `content_items` no SQLite.

## Regra pratica

Se o `content.json` estiver valido:

- entra em `content_items`
- aparece na aba `Conteudos` do dashboard

Se o `content.json` estiver invalido:

- o artifact continua existindo
- o run continua finalizado
- o pacote nao entra como `content_item`

## Contrato minimo exigido

- `contentKey`
- `title`
- `contentType`
- `layoutType`
- `blocks`

`layoutType` aceitos:

- `document`
- `tabs`
- `accordion`
- `stack`
- `mixed`

## Regras extras de bloco

- todo bloco precisa de `type`
- `tabs` precisa de `items[]`, cada um com `label` e `blocks`
- `accordion` precisa de `items[]`, cada um com `title` e `content` ou `blocks`
- `section` precisa de `blocks`

## Motivacao

Evitar que dashboard e cloud dependam de payloads quebrados ou arbitrarios demais.
