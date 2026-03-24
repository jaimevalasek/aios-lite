# Arquitetura: Squad Leve com Rules + Skills Extensíveis

> **Data:** 2026-03-23
> **Status:** Decisão arquitetural que afeta TODAS as fases do plano
> **Leia este arquivo ANTES de implementar qualquer fase**

## Problema

O agente `squad.md` atual tem ~1330 linhas. Ele carrega tudo dentro de si: heurísticas de domínio, regras de formato, decisões de estrutura, etc. Isso cria 3 problemas:

1. **Agente pesado** — consome tokens mesmo quando 80% do conteúdo não é relevante para o squad atual
2. **Não extensível** — para adicionar conhecimento novo, tem que editar o agent file (só dev pode)
3. **Outputs enterrados** — investigações ficam dentro de `.aioson/squads/.investigations/`, difícil de achar e reutilizar

## Solução: 3 mudanças arquiteturais

### Mudança 1: Outputs e pesquisas na raiz do projeto

**Antes:**
```
.aioson/squads/.investigations/{slug}.md    # enterrado
output/{squad-slug}/                         # ← este já está na raiz, ok
```

**Depois:**
```
squad-searches/                              # NOVO — raiz do projeto
├── {squad-slug}/                            # pesquisas vinculadas a um squad
│   ├── investigation-{date}.md
│   ├── format-research-{date}.md
│   └── profiling-{person}-{date}.md
├── standalone/                              # pesquisas sem squad (reutilizáveis)
│   ├── domain-youtube-{date}.md
│   ├── domain-gastronomia-{date}.md
│   └── domain-tax-law-{date}.md
└── .gitkeep
```

**Por quê:**
- Visibilidade — o usuário vê as pesquisas no nível do projeto
- Reutilização — uma pesquisa standalone pode alimentar múltiplos squads
- Separação — pesquisas são assets do projeto, não do squad individual
- O diretório `output/` continua na raiz como está (não muda)

**Impacto nos planos:**
- Fase 1 (@orache): salvar relatórios em `squad-searches/` em vez de `.aioson/squads/.investigations/`
- `squad-investigate.js`: referenciar `squad-searches/` como diretório base
- `squad.manifest.json`: campo `investigationPath` aponta para `squad-searches/{squad}/`

---

### Mudança 2: Rules para criação de squads

**Padrão existente no AIOSON:**
```
.aioson/rules/                  # Rules carregadas por todos os agents
  ├── alguma-rule-universal.md  # agents: (ausente) → todos carregam
  ├── rule-dev.md               # agents: [dev] → só o /dev carrega
  └── .gitkeep
```

Cada agent (dev, architect, qa) já faz:
> "Check `.aioson/rules/`. Read YAML frontmatter. Load if `agents:` includes me."

**Novo: rules específicas para o criador de squad:**
```
.aioson/rules/
├── squad/                                    # NOVO — rules do agente @squad
│   ├── content-squad-standards.md            # Regras para squads de conteúdo
│   ├── software-squad-standards.md           # Regras para squads de software
│   ├── social-media-best-practices.md        # Regras para squads de redes sociais
│   ├── review-policy-default.md              # Política de review padrão
│   ├── naming-conventions.md                 # Convenções de nomes para executores
│   └── quality-minimums.md                   # Score mínimo para aprovar um squad
└── ...
```

**Como funciona:**

O `squad.md` ganha uma seção que diz:

```markdown
## Squad creation rules (extensible)

Before creating any squad, check `.aioson/rules/squad/` for `.md` files.

For each file found:
1. Read YAML frontmatter
2. Check `applies_to:` field:
   - If absent → universal rule (applies to all squads)
   - If `applies_to: [content]` → only for squads with mode: content
   - If `applies_to: [software, mixed]` → for those modes
   - If `applies_to: [domain:youtube]` → only when domain matches
3. Load matching rules into your context
4. Follow them during squad creation

Rules override defaults. If a rule says "minimum 5 executors", follow it
even if the heuristic would suggest 3.
```

**Formato de uma rule file:**

```markdown
---
name: social-media-best-practices
description: Rules for creating social media content squads
applies_to: [content]
domains: [instagram, youtube, tiktok, linkedin, twitter]
priority: 10
version: 1.0.0
---

# Social Media Squad Rules

## Executor requirements
- Every social media squad MUST have a `trend-analyst` executor
- Every social media squad MUST have a `platform-specialist` executor per target platform
- The orchestrator MUST check platform algorithm updates before each session

## Content requirements
- All content MUST include platform-specific hooks (first 3 seconds / first line)
- All content MUST include a CTA appropriate to the platform
- Hashtag strategy MUST be platform-specific (not copy-paste across platforms)

## Quality gates
- Every post/video script MUST pass through a review loop
- Engagement prediction score MUST be included in output
- Content calendar alignment MUST be verified

## Anti-patterns to block
- NEVER use the same content across platforms without adaptation
- NEVER ignore platform character/duration limits
- NEVER publish without thumbnail/cover image consideration
```

**Quem pode criar rules:**
- Desenvolvedores do projeto
- Gerentes de produto
- O próprio usuário
- Até o @orache pode sugerir rules baseado em investigação

**O poder disso:** Um gerente de marketing pode adicionar uma rule que diz "todo squad de conteúdo deve ter um executor de compliance" e, na próxima vez que alguém criar um squad de conteúdo, o @squad vai incluir automaticamente.

---

### Mudança 3: Skills para o agente criador de squad

**Padrão existente:**
```
.aioson/skills/
├── design/              # Skills de design (usadas por /ux-ui, /dev)
├── design-system/       # Design system (usada por /ux-ui)
├── static/              # Convenções de frameworks (usadas por /dev)
├── dynamic/             # Docs externos (usadas por /dev)
└── references/          # Referências visuais
```

Os agents principais carregam skills sob demanda: o /dev carrega skills de framework, o /ux-ui carrega skills de design.

**Novo: skills do agente squad:**
```
.aioson/skills/
├── squad/                                    # NOVO — skills do agente @squad
│   ├── SKILL.md                              # Router/índice das skills de squad
│   ├── domains/                              # Knowledge por domínio
│   │   ├── youtube-content.md                # Como criar squads para YouTube
│   │   ├── instagram-marketing.md            # Como criar squads para Instagram
│   │   ├── saas-product.md                   # Como criar squads para SaaS
│   │   ├── legal-consulting.md               # Como criar squads para consultoria jurídica
│   │   ├── gastronomy.md                     # Como criar squads para gastronomia
│   │   ├── education.md                      # Como criar squads para educação
│   │   └── ecommerce.md                      # Como criar squads para e-commerce
│   ├── formats/                              # Format templates (antes era uma pasta separada)
│   │   ├── catalog.json
│   │   ├── instagram-feed.md
│   │   ├── youtube-long.md
│   │   ├── blog-post.md
│   │   └── ...
│   ├── patterns/                             # Patterns reutilizáveis
│   │   ├── review-loop-pattern.md            # Como configurar review loops
│   │   ├── multi-platform-pattern.md         # Como criar squads multi-plataforma
│   │   ├── persona-based-pattern.md          # Como criar squads baseados em persona
│   │   └── pipeline-pattern.md               # Como configurar pipelines entre squads
│   └── references/                           # Material de referência
│       ├── executor-archetypes.md            # Arquetipos de executores comuns
│       ├── checklist-templates.md            # Templates de checklists por domínio
│       └── workflow-templates.md             # Templates de workflows por tipo de squad
└── ...
```

**Como funciona:**

O `squad.md` ganha:

```markdown
## Squad skills (on-demand loading)

Before defining executors and structure, check `.aioson/skills/squad/` for
relevant knowledge.

### Loading strategy
1. Read `.aioson/skills/squad/SKILL.md` (router) — understand what's available
2. Based on the squad domain/mode, load matching domain skills:
   - If creating a YouTube squad → load `domains/youtube-content.md`
   - If creating a SaaS squad → load `domains/saas-product.md`
   - If no exact match → check if a similar domain exists, or proceed with LLM knowledge
3. Based on squad needs, load matching patterns:
   - If squad needs review loops → load `patterns/review-loop-pattern.md`
   - If squad targets multiple platforms → load `patterns/multi-platform-pattern.md`
4. Based on content format needs, load matching formats:
   - Check `formats/catalog.json` for platform-specific formats
   - Load only the formats relevant to the squad's target platforms
5. Use reference materials when needed:
   - `references/executor-archetypes.md` for role inspiration
   - `references/checklist-templates.md` for quality gates

### NEVER load everything at once
Only load skills that are directly relevant. A software squad doesn't need
instagram-feed.md. A YouTube squad doesn't need legal-consulting.md.
```

**Exemplo de um domain skill:**

```markdown
---
name: youtube-content
description: Knowledge for creating YouTube content creation squads
domain: youtube
mode: content
version: 1.0.0
---

# YouTube Content Squad Skill

## Recommended executors
- **scriptwriter** — Writes video scripts with retention hooks
- **title-generator** — Creates clickbait-proof, algorithm-friendly titles
- **thumbnail-strategist** — Designs thumbnail concepts with CTR psychology
- **trend-analyst** — Monitors trends, suggests topics, analyzes competition
- **seo-specialist** — Optimizes descriptions, tags, end screens, cards

## YouTube-specific structural patterns
### Video script structure
1. Hook (0-3s): Pattern interrupt, curiosity gap, or bold claim
2. Context bridge (3-15s): Why the viewer should stay
3. Value delivery (main body): Chapters with mini-hooks at transitions
4. CTA: Subscribe, like, comment prompt integrated naturally
5. End screen: Teaser for next video

### Thumbnail principles
- One focal point (face with exaggerated expression OR bold object)
- Max 3-4 words of text
- High contrast, saturated colors
- Must be readable at 120px width (mobile)

## Anti-patterns
- Scripts that start with "Hey guys, welcome back..." (instant viewer drop)
- Titles with ALL CAPS abuse or misleading claims
- Thumbnails that look like every other creator in the niche
- Ignoring retention curve data from previous videos

## Quality benchmarks
- Script hook test: would you keep watching after 3 seconds?
- Title test: does it create curiosity without being clickbait?
- Thumbnail test: would you click this among 20 other thumbnails?
- Expected CTR: >5% for established channels, >8% for viral attempts

## Content blueprints suggestion
```json
{
  "slug": "youtube-video-package",
  "contentType": "video-package",
  "layoutType": "tabs",
  "sections": [
    { "key": "script", "label": "Video Script", "blockTypes": ["rich-text"] },
    { "key": "title-options", "label": "Title Options", "blockTypes": ["bullet-list"] },
    { "key": "description", "label": "Description", "blockTypes": ["rich-text", "tags"] },
    { "key": "thumbnail-brief", "label": "Thumbnail Brief", "blockTypes": ["rich-text"] },
    { "key": "tags", "label": "Tags", "blockTypes": ["tags"] },
    { "key": "chapters", "label": "Chapters", "blockTypes": ["numbered-list"] }
  ]
}
```

## Recommended workflow
```
Research (trend-analyst) → Script (scriptwriter) → Review (orquestrador)
→ Titles + Description (title-generator + seo-specialist) → Thumbnail (thumbnail-strategist)
→ Final Review → Publish Package
```
```

**O poder disso:**
- Um dev ou gerente pode adicionar `domains/real-estate.md` e na próxima criação de squad de imobiliária, o @squad já sabe os executores recomendados, anti-patterns do domínio, e workflows sugeridos
- O @orache pode até sugerir a criação de uma nova skill após uma investigação: "Essa investigação revelou patterns úteis para o domínio X. Quer que eu salve como skill em `.aioson/skills/squad/domains/X.md`?"
- Os formats ficam DENTRO das skills do squad (não em pasta separada) — é tudo conhecimento do criador de squad

---

## Como isso muda cada fase do plano

### Fase 1 (@orache)
- Relatórios vão para `squad-searches/` na raiz (não `.aioson/squads/.investigations/`)
- @orache pode sugerir criação de domain skill após investigação
- @orache pode sugerir criação de rules após descobrir anti-patterns

### Fase 2 (Review Loops)
- O pattern de review loop vira uma skill: `skills/squad/patterns/review-loop-pattern.md`
- Rules podem definir políticas de review obrigatórias: `rules/squad/review-policy-default.md`

### Fase 3 (Model Tiering)
- Heurística de tiering pode virar uma rule (não precisa estar no agent file)
- `rules/squad/model-tiering-policy.md`

### Fase 4 (Task Decomposition)
- Pattern de decomposição vira skill: `skills/squad/patterns/task-decomposition-pattern.md`
- References de archetypes já sugerem quando decompor

### Fase 5 (Format Templates)
- **Muda completamente:** Formatos NÃO ficam em pasta separada `formats/`
- Ficam dentro de `skills/squad/formats/` — são knowledge do agente squad
- O squad.md fica menor porque não precisa carregar a seção de formatos

### Fase 6 (Profiler Integration)
- Pattern vira skill: `skills/squad/patterns/persona-based-pattern.md`
- Rules podem exigir profiling para certos domínios

### Fase 7 (Quality Scoring)
- Thresholds mínimos podem ser rules: `rules/squad/quality-minimums.md`
- Archetypes de referência ficam em skills

## Impacto no `squad.md`

O `squad.md` DIMINUI de tamanho. Em vez de carregar todas as heurísticas, ele:
1. Lê rules de `rules/squad/` → sabe as restrições
2. Lê skills de `skills/squad/` → sabe como proceder por domínio
3. Lê formats de `skills/squad/formats/` → sabe os formatos
4. Faz o que o LLM faz de melhor: **julgar, decidir, criar** — não memorizar regras

As seções que SAEM do squad.md:
- Heurísticas de layoutType (vira skill reference)
- Exemplos de role sets por domínio (vira domain skills)
- Detalhes de format injection (vira o SKILL.md router)
- Coverage score details (vira rule + JS)

As seções que FICAM:
- Mission, entry, subcommand routing
- Core creation flow (design → create → validate)
- Agent generation template
- Orchestrator generation template
- Hard constraints
- Output contract

**Resultado:** squad.md de ~1330 linhas → ~700-800 linhas, e cada nova skill/rule que alguém adiciona enriquece o squad sem tocar no agent file.

## Compatibilidade retroativa

- Squads já criados continuam funcionando (nada muda na estrutura dos squads gerados)
- `output/{squad-slug}/` continua na raiz como está
- `aioson-logs/{squad-slug}/` continua como está
- `media/{squad-slug}/` continua como está
- O que muda é: investigações vão para `squad-searches/` e o @squad carrega rules/skills

## Template delivery

No `template/.aioson/` que o aioson distribui para projetos novos:

```
template/.aioson/
├── rules/
│   ├── squad/                    # NOVO — rules iniciais (opcionais, educativas)
│   │   ├── README.md             # Explica como criar rules
│   │   └── .gitkeep
│   └── .gitkeep
├── skills/
│   ├── squad/                    # NOVO — skills do criador de squad
│   │   ├── SKILL.md              # Router
│   │   ├── domains/
│   │   │   └── .gitkeep          # Usuário adiciona domain skills
│   │   ├── formats/
│   │   │   ├── catalog.json
│   │   │   └── ... (10 formatos iniciais)
│   │   ├── patterns/
│   │   │   ├── review-loop-pattern.md
│   │   │   ├── multi-platform-pattern.md
│   │   │   ├── persona-based-pattern.md
│   │   │   └── pipeline-pattern.md
│   │   └── references/
│   │       ├── executor-archetypes.md
│   │       ├── checklist-templates.md
│   │       └── workflow-templates.md
│   ├── design/                   # (existente, não tocar)
│   ├── design-system/            # (existente, não tocar)
│   ├── static/                   # (existente, não tocar)
│   └── dynamic/                  # (existente, não tocar)
```

O aioson pode vir com 0 domain skills (o usuário adiciona) ou com 3-5 exemplos educativos para mostrar o formato.
