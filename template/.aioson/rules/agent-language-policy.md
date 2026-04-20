---
name: agent-language-policy
description: Agent files default to English for universal reuse. Locale-specific squads may declare a locale_scope to write agent files in their native language.
priority: 9
version: 1.1.0
agents: [squad, genome, orache, design-hybrid-forge, site-forge]
---

# Agent Language Policy

Agent files are instruction code — default is English (maximizes LLM reasoning, universal reuse). Squads with `locale_scope` declared are the exception.

## Language decision tree

```
Squad novo ou existente
  ├── ephemeral: true → qualquer idioma
  └── ephemeral: false
      ├── locale_scope: "universal" (ou ausente) → agent files em INGLÊS
      └── locale_scope: "{locale}" declarado → agent files no idioma do locale
```

## Declaring locale_scope

In `squad.manifest.json`:

```json
{
  "slug": "atendimento-farmacia",
  "locale_scope": "pt-BR",
  "locale_rationale": "Domínio regulado pela ANVISA — legislação, receituário e interações são exclusivamente brasileiros."
}
```

Valid values: `"universal"` (default) or any BCP-47 code: `"pt-BR"`, `"en-US"`, `"es-MX"`, `"fr-FR"`.

## When locale_scope is legitimate — ALL criteria must be true

| Criterion | Question |
|---|---|
| Local regulation | Legislation governs a specific country? (ANVISA, OAB, NHS, FDA…) |
| Local end user | Users interact exclusively in that language? |
| No portability | Squad never reused in another country without full rewrite? |
| Native domain reasoning | Technical domain richer in native language? |

Justified: farmácia ANVISA, tributário eSocial, jurídico brasileiro, suporte nacional.
Not justified: marketing digital, software dev, YouTube creator, psicologia/coaching.

## Rules by layer

### Universal squad

| Layer | Language |
|---|---|
| Agent slug / name | English |
| Agent file (mission, focus, constraints) | English |
| Source code (vars, functions, classes) | English |
| Agent output to user | `interaction_language` (fallback: `conversation_language`) |
| Content docs (PRD, specs, plans) | Project language |

### Locale-scoped squad

| Layer | Language |
|---|---|
| Agent slug / name | Locale language |
| Agent file (mission, focus, constraints) | Locale language |
| Source code | **English — no exception** |
| Agent output | Locale language |
| Content docs | Locale language |

## Mandatory question during squad creation

Before generating any file:

```
Este squad é para uso em um país/idioma específico ou deve ser universal?

1. Universal (inglês) — reutilizável em qualquer projeto, publicável no aiosforge.com
2. Locale específico — ex: só para o Brasil, só em português
```

If (2): request locale code. If unclear: infer from domain and confirm.

**Auto-inference:**
- Domain with specific country legislation → suggest that country's locale
- Portuguese content with clearly Brazilian audience → suggest `pt-BR`
- Generic domain, no geographic reference → suggest universal

## On file creation

- Universal → write in English, no prompt needed.
- Locale declared → write in locale language, no prompt needed.
- Ambiguous → ask the mandatory question before generating any file.
