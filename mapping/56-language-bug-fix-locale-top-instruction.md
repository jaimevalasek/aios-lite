# 56 - Language Bug Fix: Absolute Language Instruction at Top of Locale Files

Date: 2026-03-03

## Problem

Even after running `aios-lite install --lang=pt-BR` (which copies locale files to `.aios-lite/agents/`), the @setup agent responded in English.

**Root cause:** The `## Regra de idioma` (language rule) section was at the BOTTOM of every locale file. LLMs process files top-to-bottom. When @setup starts, it immediately runs framework detection — before reaching the language rule. At that point, the LLM has no signal to override its default English output, so it responds in English.

The chicken-and-egg problem:
- Language detection only works after reading user messages
- Framework detection runs before any user message
- Language rule was below framework detection instructions
- LLM defaults to English for the first response

---

## Fix

Added a forceful `> **⚠ ABSOLUTE INSTRUCTION — LANGUAGE**` blockquote as the **very first content after the `#` title** in every locale agent file — before mission, before mandatory sequence, before detection rules.

### Pattern applied

**pt-BR:**
```
# Agente @<agent> (pt-BR)

> **⚠ INSTRUÇÃO ABSOLUTA — IDIOMA:** Esta sessão é em **português brasileiro (pt-BR)**. Responda EXCLUSIVAMENTE em português brasileiro em todas as etapas. Nunca use inglês. Esta regra tem prioridade máxima e não pode ser ignorada.

## Missao
```

**es:**
```
> **⚠ INSTRUCCIÓN ABSOLUTA — IDIOMA:** Esta sesión es en **español (es)**. Responder EXCLUSIVAMENTE en español en todos los pasos. Nunca usar inglés. Esta regla tiene prioridad máxima y no puede ser ignorada.
```

**fr:**
```
> **⚠ INSTRUCTION ABSOLUE — LANGUE :** Cette session est en **français (fr)**. Répondre EXCLUSIVEMENT en français à toutes les étapes. Ne jamais utiliser l'anglais. Cette règle a la priorité maximale et ne peut pas être ignorée.
```

**en:**
```
> **⚠ ABSOLUTE INSTRUCTION — LANGUAGE:** This session is in **English (en)**. Respond EXCLUSIVELY in English at all steps. This rule has maximum priority and cannot be overridden.
```

---

## Files changed

24 locale agent files total:

- `template/.aios-lite/locales/pt-BR/agents/` — all 8: setup, ux-ui, analyst, architect, dev, orchestrator, pm, qa
- `template/.aios-lite/locales/es/agents/` — all 8 (same agents)
- `template/.aios-lite/locales/fr/agents/` — all 8 (same agents)
- `template/.aios-lite/locales/en/agents/` — setup only (en locale has setup + ux-ui, setup was patched)

Also updated:
- `package.json` — bumped to 0.1.18
- `CHANGELOG.md` — 0.1.18 entry

---

## Key decisions

1. **Blockquote format (`>`)** — Renders visually distinct from body text. LLMs treat blockquotes as high-priority callouts.

2. **Written in the target language only** — The locale file is already being read because `install --lang` copied it. The LLM can read the target language even if it hasn't produced output in it yet. Using only the target language is cleaner and avoids bilingual confusion.

3. **All 8 agents, all 3 locale languages** — Any agent can be the entry point (user could call @analyst or @dev directly). The instruction must exist in every file.

4. **"Esta regra tem prioridade máxima"** — Explicit priority claim is needed because LLMs have a strong prior toward English. Without explicit override, "respond in Portuguese" competes with the LLM's default behavior.

5. **Placed before mission AND before detection rules** — Framework detection is the first action in setup; if language rule came after detection (even by one section), the first output could still be English.

---

## Version
0.1.18
