---
phase: 2
slug: cli-commands
title: "Fase 2 — CLI Commands + Locales"
depends_on: core-agent
status: pending
---

# Fase 2 — CLI Commands + Locales

## Escopo desta fase
Implementar `aioson briefing:approve` e `aioson briefing:unapprove` em `src/commands/`. Criar arquivos de locale para @cypher em `en` e `pt-BR`.

## Entidades novas ou modificadas
- **`src/commands/briefing.js`** — novo arquivo com os dois subcomandos
- **`src/cli.js`** — registro do novo comando `briefing:*`
- **`.aioson/locales/en/agents/cypher.md`** — locale em inglês
- **`.aioson/locales/pt-BR/agents/cypher.md`** — locale em português
- **`template/.aioson/locales/en/agents/cypher.md`** — sincronizado no template
- **`template/.aioson/locales/pt-BR/agents/cypher.md`** — sincronizado no template

## Fluxos de usuário cobertos
- `aioson briefing:approve`: lista briefings `draft`, usuário seleciona, status → `approved`
- `aioson briefing:unapprove`: lista briefings `approved` não implementados com checkboxes, usuário desmarca, status → `draft`

## Acceptance criteria desta fase

| AC | Descrição |
|---|---|
| AC-11 | `aioson briefing:approve` sem briefings draft → mensagem clara: "Nenhum briefing aguardando aprovação" |
| AC-12 | `aioson briefing:approve` com 1+ briefings draft → lista interativa ou `--slug=nome` → status atualizado para `approved` |
| AC-13 | `aioson briefing:approve` atualiza `approved_at` no YAML frontmatter de `config.md` |
| AC-14 | `aioson briefing:unapprove` sem briefings aprovados → mensagem: "Nenhum briefing aprovado disponível" |
| AC-15 | `aioson briefing:unapprove` com 1+ briefings aprovados → checkbox list → status retorna para `draft`, `approved_at` → null |
| AC-16 | `aioson briefing:unapprove` nunca lista briefings com status `implemented` |
| AC-17 | Locale `en` carregado após `aioson locale:apply --lang=en` |
| AC-18 | Locale `pt-BR` carregado após `aioson locale:apply --lang=pt-BR` |

## Sequência de implementação sugerida
1. @analyst decide a biblioteca de prompt (ver decisão adiada no manifest)
2. Criar `src/commands/briefing.js` com `runBriefingApprove` e `runBriefingUnapprove`
3. Parser de `config.md` YAML frontmatter (pode reutilizar padrão já existente no CLI)
4. Registrar `briefing:approve` e `briefing:unapprove` em `src/cli.js`
5. Criar locales `en` e `pt-BR` para o agente @cypher (copiar base do agent file e adaptar idioma)
6. Testar comandos com config.md real
7. Sincronizar locales para template

## Dependências externas
- Fase 1 concluída (config.md deve existir e ter formato YAML definido)
- Decisão de biblioteca de prompt resolvida por @analyst antes desta fase

## Notas para @dev
- Ver `src/commands/brief-gen.js` como referência de padrão de implementação de comando CLI neste projeto
- O parser YAML do frontmatter de `config.md` deve ser robusto: se o frontmatter falhar, mostrar erro claro ao invés de crashar
- `briefing:unapprove` usa checkboxes → múltipla seleção. `briefing:approve` usa seleção única
- Os locales são cópias do agent file adaptadas para o idioma — não contêm lógica, apenas texto do prompt

## Notas para @qa
- Verificar comportamento quando `config.md` não existe (comando executado antes de qualquer briefing ser criado)
- Verificar que `implemented` briefings nunca aparecem nas listas de approve/unapprove
- Verificar que YAML frontmatter permanece válido após múltiplas aprovações/desaprovações
