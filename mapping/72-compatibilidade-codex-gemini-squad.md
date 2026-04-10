# 72 — Compatibilidade: Codex, Gemini e o Squad System

> Sessão: 2026-03-05
> Relacionado: mapping/70, 71

---

## O que a aios-lite já faz para ser multi-tool

O gateway pattern já resolve isso no core:

```
CLAUDE.md          → Claude Code lê daqui
AGENTS.md          → Codex CLI lê daqui
OPENCODE.md        → OpenCode lê daqui
.gemini/GEMINI.md  → Gemini Code Assist lê daqui

Todos apontam para → .aios-lite/
```

Os agentes (markdown em `.aios-lite/agents/`) são lidos por qualquer LLM.
A compatibilidade está no DNA da aios-lite.

---

## Compatibilidade do Squad System por camada

| Camada              | Claude Code | Codex CLI | Gemini | Motivo |
|---------------------|-------------|-----------|--------|--------|
| @squad agent (.md)  | ✅          | ✅        | ✅     | markdown puro |
| @genoma agent (.md) | ✅          | ✅        | ✅     | markdown puro |
| Skills (.md geradas)| ✅          | ✅        | ✅     | markdown puro |
| Memory (.md)        | ✅          | ✅        | ✅     | markdown puro |
| CLI commands (Node) | ✅          | ✅        | ✅     | tool-agnostic |
| MCP makopy.com      | ✅          | ✅*       | ✅*    | MCP é open standard |
| skill-creator eval  | ✅          | ❌        | ❌     | Claude Code-only |

*MCP foi adotado como padrão aberto. OpenAI e Google já anunciaram suporte.
Na prática hoje (2026): Claude Code tem suporte completo, os outros em adoção.

**Resumo: o sistema funciona em todos. skill-creator é a única exceção.**

---

## skill-creator: instalar ou não?

### A regra simples

O @genoma funciona 100% SEM o skill-creator.
Ele usa o conhecimento da LLM para criar genomas e skills na hora.
Qualidade boa para começar e para a maioria dos casos de uso.

O skill-creator só entra se o usuário quiser **refinar uma skill específica
com benchmarks e comparação de baseline**. Isso é avançado, opcional.

### O que o @squad pergunta quando o assunto surge

```
@squad detecta que usuário quer melhorar uma skill:

"Para refinar esta skill tenho duas opções:

1. Melhoria via LLM (lite, funciona agora)
   → Analiso o feedback que você deu e reescrevo a skill
   → Sem instalação. Sem dependências. Resultado imediato.

2. Melhoria via skill-creator (avançado, Claude Code only)
   → Testa a skill com casos reais e compara métricas
   → Requer: Claude Code + skill-creator instalado + Python
   → Melhor para skills que você vai reutilizar muito

Como prefere?"
```

### Para usuários Codex/Gemini

Nunca mencionar skill-creator como opção.
Usar sempre o caminho 1 (melhoria via LLM).
O resultado é equivalente para 95% dos casos.

---

## Como @genoma se comporta por tool

### Claude Code
Fluxo completo:
```
@genoma cria → busca makopy.com via MCP (quando disponível)
             → gera genoma + mentes + skills
             → opcionalmente usa skill-creator para refinar
```

### Codex CLI
Fluxo equivalente sem MCP-dependente:
```
@genoma cria → gera genoma + mentes + skills via LLM
             → sem busca no makopy.com (MCP em adoção no Codex)
             → sem skill-creator
             → resultado idêntico, apenas sem biblioteca externa
```

### Gemini Code Assist
Mesmo comportamento do Codex — gera localmente, sem dependências externas.

---

## Como implementar a detecção no @squad

O @squad detecta qual tool está sendo usado via contexto e adapta:

```markdown
## Detecção de ambiente (no agent prompt do @squad)

Se estiver no Claude Code: ofereça MCP makopy.com e skill-creator como opções
Se estiver no Codex/Gemini: @genoma funciona em modo local (LLM only)
Se não souber: assume modo local — nunca falha
```

Na prática: o @genoma sempre funciona. As opções extras aparecem só quando disponíveis.

**Princípio:** degradação elegante, não erro.

---

## O que NUNCA fazer

```
❌ Exigir Claude Code para usar o Squad System
❌ Mencionar skill-creator para usuários Codex/Gemini
❌ Falhar silenciosamente quando MCP não está disponível
❌ Criar dependência de infraestrutura externa para o fluxo básico
```

---

## Resumo executivo

```
Squad System core (genoma + mentes + skills + memory):
  → 100% compatível com Claude Code, Codex, Gemini
  → funciona sem internet, sem MCP, sem instalações extras

MCP makopy.com:
  → Claude Code: funciona hoje
  → Codex/Gemini: quando MCP se consolidar como padrão
  → Se não disponível: @genoma cria tudo via LLM, sem degradação

skill-creator Anthropic:
  → Claude Code only
  → Nunca exigido
  → Mencionado apenas quando usuário quer benchmarks avançados
  → Para Codex/Gemini: @genoma refina via LLM (resultado equivalente)
```

---

> Status: compatibilidade definida — Squad System é multi-tool por design
> Nenhuma feature core depende de Claude Code exclusivamente
> Relacionado: mapping/70, 71
