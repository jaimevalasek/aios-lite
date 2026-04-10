# 73 — makopy.com: Plataforma + Conexão com aios-lite

> Como genomas E skills se conectam ao makopy.com
> Sessão: 2026-03-05
> Relacionado: mapping/70, 71, 72

---

## O que o makopy.com seria

Uma plataforma com duas bibliotecas públicas:

```
makopy.com/genomas    ← perfis de domínio (o "o que saber")
makopy.com/skills     ← instruções de tarefa (o "como executar")
```

Qualquer usuário da aios-lite pode:
- Buscar genomas e skills de outros usuários
- Publicar os seus próprios
- Dar rating, comentar, fazer fork

---

## Os três canais de conexão

```
                    makopy.com
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   CLI commands    MCP Server      Browser (web)
   (usuário direto) (agentes usam)  (descoberta)
```

### Canal 1 — CLI commands (controle direto do usuário)

```bash
# Buscar
aios-lite genoma:search "facebook ads"
aios-lite skill:search "copywriting hook"

# Importar
aios-lite genoma:import makopy:facebook-ads-copy
aios-lite skill:import makopy:skill-hook-facebook

# Publicar
aios-lite genoma:publish .aios-lite/genomas/facebook-ads-copy.md
aios-lite skill:publish .aios-lite/squads/active/skills/skill-hook.md

# Ver seus publicados
aios-lite makopy:meus-genomas
aios-lite makopy:minhas-skills
```

### Canal 2 — MCP Server (agentes usam direto)

O makopy.com expõe um MCP server.
@genoma e @squad o usam transparentemente — sem o usuário precisar fazer nada.

```
@genoma busca no makopy.com:
→ chama tool: search_genomas(query="facebook ads copywriting")
→ recebe: lista de genomas com rating + autor
→ escolhe o mais relevante
→ chama tool: get_genoma(id="facebook-ads-copy")
→ usa o conteúdo para montar o squad
```

Isso acontece durante a conversa, invisível para o usuário.
O usuário vê só: "✓ Encontrado na biblioteca makopy.com"

### Canal 3 — Browser (descoberta e gestão)

O site makopy.com com galeria visual:
- Navegar genomas por categoria
- Ver exemplos de squads gerados
- Copiar o comando de import
- Gerenciar o que publicou
- Ver analytics (quantos usaram seu genoma)

---

## A Auth — como funciona

### A abordagem mais lite: API Key

Sem OAuth, sem redirect, sem browser no CLI.
Um fluxo simples que funciona em qualquer tool (Claude Code, Codex, Gemini):

**Primeira vez:**
```
$ aios-lite genoma:publish facebook-ads-copy.md

✗ Chave makopy.com não configurada.

Para publicar (gratuito):
1. Acesse makopy.com/cli
2. Crie sua conta ou faça login
3. Copie sua chave de API
4. Execute: aios-lite config set MAKOPY_KEY=sua-chave

Sem chave: você ainda pode IMPORTAR genomas públicos.
Só precisa de chave para PUBLICAR.
```

**Depois de configurado:**
```
$ aios-lite genoma:publish facebook-ads-copy.md
✓ Publicado em makopy.com/genomas/facebook-ads-copy
  URL: https://makopy.com/genomas/@seuusuario/facebook-ads-copy
  Para importar: aios-lite genoma:import makopy:@seuusuario/facebook-ads-copy
```

### Por que API Key e não OAuth

| OAuth                          | API Key                        |
|--------------------------------|--------------------------------|
| Abre browser do CLI            | Usuário faz no site, uma vez   |
| Complexo de implementar        | Simples — HTTP header          |
| Frágil em ambientes headless   | Funciona em qualquer ambiente  |
| Codex/Gemini não tem browser   | Funciona em todos os tools     |

A API Key funciona igual em Claude Code, Codex e Gemini.
OAuth quebraria em ambientes sem browser (servidor, CI, etc.).

### O MCP usa a mesma API Key

```json
// .claude/mcp.json (ou similar no Codex/Gemini)
{
  "makopy": {
    "url": "https://api.makopy.com/mcp",
    "auth": {
      "type": "bearer",
      "token": "${MAKOPY_KEY}"
    }
  }
}
```

A chave configurada no CLI é a mesma usada pelo MCP.
Uma configuração, dois canais.

---

## Fluxo completo: publicar genoma criado pelo @genoma

```
@genoma cria genoma "facebook-ads-copy" durante sessão
         ↓
@squad pergunta: "Salvar este genoma?"
  1. Só localmente
  2. Local + publicar no makopy.com
  3. Não salvar
         ↓
Usuário: 2
         ↓
@genoma verifica: MAKOPY_KEY está configurada?

  SIM → publica via MCP/API
        "✓ Publicado em makopy.com/genomas/facebook-ads-copy"

  NÃO → salva localmente + instrução:
        "Genoma salvo em .aios-lite/genomas/facebook-ads-copy.md
         Para publicar depois: aios-lite genoma:publish facebook-ads-copy.md
         (requer conta gratuita em makopy.com/cli)"
```

---

## O que fica em cada lugar

```
Projeto do usuário (.aios-lite/)
├── genomas/                   ← genomas salvos localmente
│   └── facebook-ads-copy.md
└── squads/active/skills/      ← skills geradas para este squad
    ├── skill-hook-facebook.md
    └── skill-copy-pas.md

makopy.com (publicado)
├── /genomas/@usuario/facebook-ads-copy    ← público, importável
└── /skills/@usuario/skill-hook-facebook   ← público, importável

~/.aios-lite/config.json (global, fora do projeto)
└── MAKOPY_KEY: mk_live_xxx               ← uma vez, vale para todos os projetos
```

---

## O modelo de negócio do makopy.com

```
FREE
- Publicar genomas e skills ilimitados
- Importar qualquer genoma/skill público
- Sem makopy.com/cli login para importar

PRO (R$ 49/mês)
- Genomas e skills privados (só você usa)
- Analytics: quantos usaram, rating, forks
- Prioridade na busca
- Acesso a genomas premium da comunidade

PREMIUM CREATORS
- Monetize seus genomas e skills
- Usuários pagam para usar seus genomas especializados
- Ex: "Genome: Jurídico BR — LGPD + Contratos" por R$ 9,90/mês
```

---

## Comandos completos de configuração

```bash
# Configurar chave (uma vez)
aios-lite config set MAKOPY_KEY=mk_live_xxx

# Ver configuração atual
aios-lite config show

# Genomas
aios-lite genoma:search "copywriting facebook"
aios-lite genoma:import makopy:facebook-ads-copy
aios-lite genoma:import makopy:@mktbrstudio/facebook-ads-v2
aios-lite genoma:publish .aios-lite/genomas/meu-genoma.md
aios-lite genoma:list                   # lista locais
aios-lite makopy:meus-genomas           # lista publicados

# Skills
aios-lite skill:search "hook formula"
aios-lite skill:import makopy:skill-hook-facebook
aios-lite skill:publish .aios-lite/squads/active/skills/skill-hook.md
aios-lite makopy:minhas-skills          # lista publicadas
```

---

## Resumo da arquitetura

```
USUÁRIO
  │
  ├── aios-lite CLI ──────────────────────────── makopy.com API
  │   (comandos diretos)                         (REST + API Key)
  │
  ├── Claude Code / Codex / Gemini
  │     ↓
  │   @squad / @genoma ──────────────────────── makopy.com MCP
  │   (agentes usam transparentemente)          (MCP Server + API Key)
  │
  └── Browser ──────────────────────────────── makopy.com Web
      (descoberta, gestão, analytics)           (login normal)

Uma chave MAKOPY_KEY → funciona nos três canais
```

---

> Status: arquitetura de conexão definida
> API Key como auth (simples, multi-tool, sem OAuth)
> MCP + CLI + Browser como três canais complementares
> makopy.com = biblioteca + plataforma + modelo de receita
> Relacionado: mapping/70, 71, 72
