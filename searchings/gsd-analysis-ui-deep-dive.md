# GSD Analysis — UI Interativa: Deep Dive

> Data: 2026-03-29
> Fonte: package.json, bin/install.js, ui-brand.md, settings.md, workflows

## Conclusão principal: ZERO bibliotecas TUI

`package.json` tem **zero runtime dependencies**. Nenhum `inquirer`, `blessed`, `ink`, `prompts`, `chalk`, `clack`.

GSD roda *dentro* do Claude Code — não é um CLI que renderiza widgets. É um sistema de meta-prompting que usa o Claude Code como executor.

## Como a interatividade funciona de verdade

### 1. AskUserQuestion — mecanismo primário

Tool nativa do Claude Code. O GSD usa com esta estrutura:

```json
{
  "question": "Enable context window warnings?",
  "header": "Context",
  "multiSelect": false,
  "options": [
    { "label": "Yes (Recommended)", "description": "Warn when context usage exceeds 65%." },
    { "label": "No", "description": "Disable warnings." }
  ]
}
```

**Descobertas importantes:**
- Todos os 12 settings usam `multiSelect: false` — seleção única (= radio button)
- **Nenhum uso de `multiSelect: true`** (checkboxes) em todo o repo
- Renderização visual (radio button UI) é feita pelo Claude Code nativo, não pelo GSD
- Header: limite de 12 caracteres

### 2. Checkpoint boxes — ASCII art no output do modelo

```
╔══════════════════════════════════════════════════════════════╗
║ CHECKPOINT: Verification Required                            ║
╚══════════════════════════════════════════════════════════════╝

{content}

──────────────────────────────────────────────────────────────
→ Type 'approved' or describe issues
──────────────────────────────────────────────────────────────
```

**Não são widgets.** São regras de formatação no ui-brand.md que os agentes devem seguir no output.

Para decisões:
```
→ Select: option-a / option-b
```
Texto separado por `/` — o usuário digita a resposta. Não é AskUserQuestion.

### 3. Stage banners e progress bars — output cosmético

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► EXECUTING WAVE 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

`Progress: ████████░░ 80%` — caracteres Unicode no output do modelo.

## Tabela resumo

| Elemento | Implementação no GSD |
|----------|----------------------|
| Checkboxes | **Não usados** — todo multiSelect: false |
| Radio buttons | AskUserQuestion nativo do Claude Code |
| Decisões | Texto `→ Select: a / b` no output |
| Verificações | Texto `→ Type 'approved'` no output |
| Progress bars | Unicode `████░░` no output |
| Widgets TUI reais | **Nenhum** |

## AIOSON pode fazer MELHOR que o GSD

O GSD nunca usa `multiSelect: true`. O Claude Code suporta checkboxes nativamente.

AIOSON pode usar checkboxes reais via AskUserQuestion para:
- Seleção de múltiplas features para uma sprint
- Checklist de gate approval (marcar quais gates passaram)
- Seleção de skills a instalar no setup
- Seleção de agentes relevantes para um escopo

**Isso seria uma vantagem real sobre o GSD.**
