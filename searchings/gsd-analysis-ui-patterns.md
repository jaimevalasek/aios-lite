# GSD Analysis — UI/UX Patterns Interativos

> Fonte: get-shit-done/references/ui-brand.md + workflows/
> Data: 2026-03-29
> **ALTA RELEVÂNCIA para AIOSON**

## Stage Banners (box-drawing, 62 chars)

```
╔══════════════════════════════════════════════════════════════╗
║  GSD ► QUESTIONING                                           ║
╚══════════════════════════════════════════════════════════════╝
```

Usados nas transições de fase: `QUESTIONING`, `RESEARCHING`, `DEFINING REQUIREMENTS`, `PLANNING`, `EXECUTING`, `VERIFYING`.

## Checkpoint Boxes — 3 tipos

- `checkpoint:human-verify` — "Você deveria ver X na URL Y. Confirmar?"
- `checkpoint:decision` — opções numeradas, usuário escolhe por ID
- `checkpoint:human-action` — RARO, só para passos verdadeiramente manuais (2FA, OAuth) — ~1% dos casos

**Regra de ouro:** Claude automatiza tudo que pode. Checkpoints existem para julgamento e gates reais, não para confirmação de rotina.

## Status Symbols

- `✓` completo
- `✗` falhou
- `◆` em progresso
- `○` pendente
- `⚡` auto-aprovado
- `⚠` atenção

## Progress Bars

ASCII de 8 ou 20 chars: `[████░░░░] 50%`

## AskUserQuestion UI — regras

- Headers máximo 12 caracteres
- 2-4 opções concretas por pergunta
- Incluir opção "Let me explain"
- Valores atuais pré-selecionados em settings
- **Freeform rule**: quando usuário escolhe opção open-ended, parar de usar UI estruturada

## Manager Dashboard (terminal grid)

```
Phase 1: Auth    ✓  ✓  ✓
Phase 2: API     ◆  ○  ○
Phase 3: UI      ·  ·  ·
```

- Colunas: D (discuss), P (plan), E (execute)
- Auto-refresh a cada 60 segundos quando agentes estão em background

## Spawning Indicators

```
◆ Spawning researcher 1/4: Stack analysis...
◆ Spawning researcher 2/4: API patterns...
```

## Continuation Format — bloco padronizado ao final de TODA saída major

```
---
## ▶ Next Up
**Phase 2: API Layer** — Build REST endpoints
`/gsd:discuss-phase 2`
<sub>`/clear` first → fresh context window</sub>

Also available: /gsd:stats, /gsd:progress
---
```

**Por que importa:** resolve context drift entre sessões longas. TODO agente termina com este bloco.

## Text Mode

Flag `--text` ou `text_mode: true` → converte todos os menus TUI em listas numeradas plain-text.
Necessário para ambientes não-interativos (CI, remote sessions, Docker).

## Progress Table com emoji

```
✅ Phase 1: Auth — shipped
🚧 Phase 2: API — in progress
📋 Phase 3: UI — planned
```
