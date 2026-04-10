# Research — CLAUDE.md: Tamanho, Limites e Melhores Práticas

> **Data:** 2026-04-02
> **Origem:** pesquisa web + análise do leak do Claude Code (março 2026)
> **Propósito:** decidir a melhor estratégia para o CLAUDE.md do AIOSON

---

## Existe um limite oficial de tokens para CLAUDE.md?

**Não existe um limite hard enforçado.** As restrições são indiretas:

- **Diretriz oficial da Anthropic**: manter CLAUDE.md abaixo de **200 linhas**. Arquivos acima disso "consomem mais contexto e podem reduzir a aderência."
- **Consenso da comunidade**: < 200 linhas — não porque há um cutoff técnico, mas porque a aderência às instruções degrada além disso.
- **Mecanismo subjacente**: o system prompt built-in do Claude Code já consome ~50 "instruction slots". Um CLAUDE.md de 300+ linhas começa a perder sinal no ruído mesmo que o arquivo carregue tecnicamente.

---

## O "limite de 4000 tokens" — de onde vem?

**Não confirmado por documentação oficial ou pelo código vazado.** Provavelmente originou de:

- **Tradução da regra de 200 linhas para tokens**: 200 linhas de markdown = ~2.000–4.000 tokens dependendo da verbosidade. Alguém converteu a contagem de linhas para tokens e o número circulou como se fosse limite oficial.
- **Confusão com buffer de contexto**: Claude Code reserva ~22,5% da janela de contexto como buffer. CLAUDE.md + system prompt juntos podem atingir uma fração significativa desse buffer, e ~4.000 pode ser uma estimativa arredondada de "quanto do buffer o CLAUDE.md razoavelmente consome."

**Não existe** constante `CLAUDE_MD_MAX_TOKENS = 4000` no código fonte vazado.

---

## O que o leak do Claude Code revelou sobre o processamento do CLAUDE.md

O leak de março 2026 (59,8 MB de source map no pacote npm `@anthropic-ai/claude-code` v2.1.88) confirmou:

1. **CLAUDE.md é first-class, não convenção**: o Claude Code é explicitamente instruído em seu system prompt para localizar e carregar arquivos CLAUDE.md na raiz do projeto e em subdiretórios.

2. **É re-lido a cada turn**: "Live repo context loading happens on every single turn — CLAUDE.md files are reread every query." Isso significa que cada byte no CLAUDE.md é um custo recorrente.

3. **Sem cap hard de tokens**: nenhuma constante enforçando tamanho máximo foi encontrada.

4. **Mecânica de cache é o constraint real**: o leak revelou `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` (dividindo o prompt em uma parte frente cacheada estável e uma parte traseira dinâmica) e `DANGEROUS_uncachedSystemPromptSection()`. O conteúdo do CLAUDE.md cai na zona dinâmica/não-cacheada, significando que **cada linha é cobrada como token fresco a cada turn**. CLAUDE.md longos têm custo desproporcional por turn comparado a seções estáticas cacheadas.

5. **`promptCacheBreakDetection.ts` rastreia 14 vetores de cache break** — mudanças no CLAUDE.md são um deles.

---

## CLAUDE.md suporta sintaxe de import?

**Sim — feature oficial e first-class:**

```markdown
See @README.md for project overview
See @docs/api-patterns.md for API conventions
@~/.claude/my-personal-prefs.md
```

Regras:
- Paths relativos e absolutos são suportados
- Paths relativos resolvem em relação ao arquivo que contém o import, não ao cwd
- Imports recursivos permitidos até **5 hops de profundidade**
- Imports do home directory (`@~/.claude/file.md`) funcionam e são o padrão recomendado para preferências pessoais não comitadas

**Bug conhecido** (GitHub issue #8765): imports `@~/.claude/file.md` às vezes não carregam e não aparecem no output de `/context` em "Memory files."

---

## Estratégias para manter CLAUDE.md compacto e efetivo

### a. Regra das 200 linhas
Cada linha: "remover isso causaria um erro?" Se não, cortar.

### b. Split por concern em `.claude/rules/*.md`
Todo `.md` dentro de `.claude/rules/` é auto-loaded junto com CLAUDE.md. Permite modularizar por tópico (`code-style.md`, `testing.md`, `api-conventions.md`) sem inflar o arquivo raiz.

### c. Usar sintaxe `@import`
CLAUDE.md suporta `@path/to/file.md` — o arquivo referenciado é expandido no contexto em load time. Usar para referenciar READMEs, convenções especializadas, etc., em vez de duplicar conteúdo inline.

### d. Separar regras determinísticas para hooks
Se um comportamento DEVE acontecer sempre (rodar linter, checar types), colocar em hook `PostToolUse`, não no CLAUDE.md. Não duplicar entre os dois.

### e. Tratar CLAUDE.md como código
Revisar quando o Claude cometer erros inesperados. Remover regras não mais relevantes. Um arquivo mais enxuto tem valor composto ao longo do tempo.

---

## O que Aider, OpenHands e SWE-agent fazem sobre tamanho do system prompt

Todos convergem para a mesma filosofia: **modular, específico por função, e mínimo**.

**Aider**: system prompt enxuto e determinístico. Não usa arquivo de instrução monolítico grande — convenções são codificadas no formato de edição da ferramenta, não em regras em linguagem natural.

**OpenHands**: arquitetura de system prompt totalmente modular com templates Jinja2 por função (interativo, planejamento, horizonte longo, filosofia técnica). Seções condicionais por modelo (Claude variant, Gemini variant, GPT-5 variant).

**Consenso cross-tool**: arquivos de instrução persistentes (CLAUDE.md / AGENTS.md) devem conter apenas o que não pode ser inferido do código. Regras detalhadas devem viver em arquivos separados carregados lazily, não em bloco a cada turn.

---

## Análise do CLAUDE.md atual do AIOSON

O template em `template/CLAUDE.md` tem **78 linhas** — **já está bem dentro da diretriz de 200 linhas**.

**Seções e tokens estimados:**
- Mandatory first action: ~5 linhas / ~100 tokens
- Agents list: ~23 linhas / ~300 tokens
- Workflow enforcement: ~18 linhas / ~400 tokens
- Tracked execution: ~12 linhas / ~350 tokens
- Shared research cache: ~4 linhas / ~80 tokens
- Local overrides: ~7 linhas / ~120 tokens
- Golden rule: ~1 linha / ~10 tokens

**Total estimado: ~1.360 tokens por turn.** Bem razoável.

**O problema NÃO é o tamanho do CLAUDE.md template** — ele já está otimizado.

**O problema real identificado** (pelo vídeo + leak): a seção "Tracked execution in external clients" com 12 linhas de comandos CLI específicos é a mais redundante quando o usuário não está usando tracked sessions. Isso poderia ser movido para um arquivo importado via `@` para ser carregado apenas quando relevante.

**Recomendação de refinamento** (baixa prioridade dado o tamanho já pequeno):
```markdown
## Tracked execution
See @.aioson/rules/tracked-execution.md for live session protocol.
```

---

## Fontes

- Claude Code Best Practices (code.claude.com/docs/en/best-practices)
- Claude Code Memory (code.claude.com/docs/en/memory)
- Claude Code Context Buffer analysis (claudefa.st)
- Token limits guide (faros.ai)
- CLAUDE.md best practices — UX Planet, DEV Community, Builder.io
- Reference files with @ (mcpcat.io)
- GitHub issues: #990, #6321, #8765 (anthropics/claude-code)
- Claude Code source leak analysis — VentureBeat, Engineers Codex, MindStudio
- OpenHands system prompt PR #7018
- Claude Code Token Limits — The Register (março 2026)
