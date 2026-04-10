# Project Brief — makopy.com

> Community genome library + skill registry for the Squad Genome System
> Status: planned — architecture defined, implementation post-Sprint 1

---

## O que é

Um site/plataforma onde a comunidade publica, descobre e importa **genomas** (perfis de domínio
gerados via LLM) e **skills** (fragmentos de contexto especializados) para uso com o
aios-lite Squad Genome System.

**Proposta de valor em uma frase:**
> "Encontre um squad pronto para qualquer domínio — gastronômico, jurídico, musical,
> técnico — e importe em segundos para sua sessão de IA."

---

## Problema que resolve

O @genoma gera perfis de domínio via LLM na hora — mas se alguém já gerou um genoma
excelente para "direito trabalhista brasileiro" ou "sommelier de vinhos naturais",
por que regenerar? O makopy.com é o repositório compartilhado desses genomas.

---

## Para quem

1. **Criadores de conteúdo com IA** — precisam de perspectivas especializadas para
   escrever sobre culinária, moda, esporte, etc.

2. **Desenvolvedores usando aios-lite** — querem squads pré-validados para domínios
   técnicos (segurança, acessibilidade, performance).

3. **Times de produto** — precisam de squads para pesquisa de usuário, copywriting,
   análise de mercado.

4. **Pesquisadores e educadores** — exploram domínios interdisciplinares com perspectivas
   múltiplas geradas por LLM.

---

## Como funciona (fluxo do usuário)

```
1. @genoma gera genoma para "Sommelier de vinhos naturais"
2. Usuário escolhe: [salvar local] [publicar no makopy.com] [só sessão]
3. Se publicar → envia para makopy.com via API (MAKOPY_KEY obrigatória)
4. Outro usuário executa: aios-lite genoma:search "vinho natural"
5. makopy.com retorna lista de genomas disponíveis
6. Usuário importa: aios-lite genoma:import sommelier-vinhos-naturais
7. @squad usa o genoma importado para montar o squad
```

---

## Stack

```
Runtime:    Node.js 20+
Linguagem:  TypeScript (strict)
HTTP:       Fastify
ORM:        Prisma
Banco:      PostgreSQL
Cache:      Redis — TTL 1h para buscas, genomas cached por slug
Pacotes:    pnpm
Deploy:     Railway
Frontend:   Next.js (App Router) + Tailwind CSS
Auth:       Clerk (ou Auth.js)
```

---

## Entidades principais

```
User        — id, email, username, plan (FREE/PRO), createdAt
ApiKey      — id, key ("mk_live_xxx"), userId, active, lastUsedAt
Genome      — id, slug, domain, description, mentes (JSON), skills (JSON[]),
              authorId, language (en|pt-BR|es|fr), downloads, createdAt
Skill       — id, slug, title, content (markdown), tags, authorId, createdAt
Tag         — id, name, category (domain|technique|language)
```

---

## API (v1)

```
POST /v1/genomes          — publicar genoma (requer MAKOPY_KEY)
GET  /v1/genomes?q=       — buscar genomas por domínio/tags
GET  /v1/genomes/:slug    — importar genoma específico
POST /v1/skills           — publicar skill
GET  /v1/skills?q=        — buscar skills
GET  /v1/skills/:slug     — importar skill
GET  /v1/health           — health check público
```

### Autenticação
- Header: `Authorization: Bearer mk_live_xxx`
- Rate limiting: 100 req/min (FREE), 1000 req/min (PRO)

---

## Integração com aios-lite (comandos futuros — fase 2)

```bash
aios-lite config set MAKOPY_KEY=mk_live_xxx
aios-lite genoma:search "sommelier de vinhos"
aios-lite genoma:import sommelier-vinhos-naturais
aios-lite genoma:publish --from=.aios-lite/genomas/meu-genoma.md
```

---

## CLI integration (Sprint 1 — já implementado)

O comando `aios-lite config set MAKOPY_KEY=<key>` já está disponível.
O @genoma verifica `MAKOPY_KEY` via MCP. Se não configurada, oferece salvar local.

---

## Modelo de negócio

| Plano | Preço | Limites |
|-------|-------|---------|
| FREE  | gratuito | 10 genomas publicados, busca pública ilimitada |
| PRO   | $9/mês | genomas ilimitados, analytics, acesso prioritário |
| TEAM  | $29/mês | múltiplos membros, namespace privado, SLA |

---

## Fases de implementação

### Fase 1 — MVP (após makopy-receita)
- [ ] Auth + API keys
- [ ] Publicar + buscar genomas (API)
- [ ] Página pública de descoberta (Next.js)
- [ ] CLI: `genoma:search`, `genoma:import`, `genoma:publish`

### Fase 2 — Comunidade
- [ ] Perfis públicos de criadores
- [ ] Sistema de tags e curadoria
- [ ] Skills registry (separado de genomas)
- [ ] CLI: `skill:search`, `skill:import`

### Fase 3 — MCP Server
- [ ] `@modelcontextprotocol/sdk` server para makopy.com
- [ ] Integração direta via MCP no Claude Desktop

---

## Dependências externas

- **MAKOPY_KEY**: gerada no makopy.com, configurada via `aios-lite config set`
- **@genoma**: agente que publica/importa genomas (aios-lite)
- **makopy-receita**: infraestrutura compartilhada (Railway, PostgreSQL, Redis)

---

## O que NÃO é o makopy.com

- Não é um modelo de IA (não roda LLMs)
- Não substitui o @genoma (que gera via LLM local)
- Não é obrigatório — aios-lite funciona 100% offline sem MAKOPY_KEY
