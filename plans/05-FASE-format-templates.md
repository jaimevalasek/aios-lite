# Fase 5 — Format/Platform Templates

> **Prioridade:** P2
> **Depende de:** Fase 4 (task decomposition)
> **Estimativa de arquivos:** 10+ novos, 2 editados

## Conceito

O OpenSquad tem 23 format files com best practices por plataforma (Instagram, YouTube, LinkedIn, etc.). Quando um step do pipeline declara `format: instagram-feed`, o sistema auto-injeta as melhores práticas no contexto do executor.

O AIOSON não tem isso. Os executores recebem instruções genéricas e dependem do LLM saber as regras da plataforma.

### Diferença fundamental da abordagem

O OpenSquad trata formatos como **arquivos estáticos** — cada formato é um `.md` com regras fixas. O problema: plataformas mudam regras frequentemente (Instagram muda algoritmo, YouTube muda limites de título, etc.).

A abordagem AIOSON será:

1. **Format templates como skills** — Cada formato é uma skill do catálogo, não um arquivo solto
2. **Versionados** — Cada formato tem versão e data de atualização
3. **Composáveis** — Um executor pode combinar múltiplos formatos
4. **Investigáveis** — @orache pode atualizar um formato via investigação
5. **Não obrigatórios** — Formatos enriquecem, não restringem

## O que é JS vs. LLM

**JS (deterministico):**
- Catálogo de formatos disponíveis (listagem)
- Injeção automática do formato no contexto do executor (concatenar o .md)
- Validação de que o formato referenciado existe
- Versionamento e update tracking

**LLM (requer inteligência):**
- Conteúdo dos formatos (best practices, limites, estratégias)
- Atualização de formatos via @orache (investigação)
- Decisão de quais formatos aplicar a quais executores

**O que é script puro:** A injeção de formato no contexto é 100% mecânica — ler o .md do formato e incluir no prompt do executor. O `squad-agent-create.js` já faz algo similar com infrastructure stubs.

## Estrutura (dentro de skills/squad/)

> **MUDANÇA ARQUITETURAL:** Formatos NÃO ficam em pasta separada `formats/`.
> Ficam dentro de `.aioson/skills/squad/formats/` — são knowledge do agente squad.
> Veja `09-ARQUITETURA-squad-leve.md` para a justificativa.

```
template/.aioson/skills/squad/formats/
├── catalog.json                    # Índice de todos os formatos
├── social/
│   ├── instagram-feed.md
│   ├── instagram-reels.md
│   ├── instagram-stories.md
│   ├── youtube-long.md
│   ├── youtube-shorts.md
│   ├── tiktok.md
│   ├── linkedin-post.md
│   ├── linkedin-article.md
│   ├── twitter-thread.md
│   └── twitter-single.md
├── content/
│   ├── blog-post.md
│   ├── newsletter.md
│   ├── email-marketing.md
│   ├── press-release.md
│   ├── case-study.md
│   └── whitepaper.md
├── business/
│   ├── pitch-deck.md
│   ├── executive-summary.md
│   ├── proposal.md
│   └── report.md
└── creative/
    ├── podcast-script.md
    ├── video-script.md
    └── presentation.md
```

### Format file structure:

```markdown
# Format: {format-name}

> Platform: {platform or context}
> Version: {semver}
> Updated: {date}
> Category: {social | content | business | creative}

## Specs
- **Max length:** {character/word limit}
- **Ideal length:** {optimal range}
- **Aspect ratio:** {if visual, e.g., 1:1, 9:16}
- **Duration:** {if video/audio}

## Structure
{The recommended structure for this format}

### Hook
{How to open — specific to this platform}

### Body
{How to develop — specific to this format}

### Close
{How to end — CTA, engagement trigger, etc.}

## Best Practices
1. {Practice specific to this platform}
2. {Practice specific to this platform}
3. {Practice specific to this platform}

## Anti-patterns
1. {What destroys performance on this platform}
2. {Common mistake}

## Algorithm Notes
{What the platform algorithm favors — if applicable}

## Examples
{1-2 short structure examples — not full content, just the skeleton}

## Quality Checklist
- [ ] {Platform-specific quality check}
- [ ] {Platform-specific quality check}
- [ ] {Platform-specific quality check}
```

### catalog.json:

```json
{
  "version": "1.0.0",
  "formats": [
    {
      "slug": "instagram-feed",
      "title": "Instagram Feed Post",
      "category": "social",
      "platform": "Instagram",
      "file": "social/instagram-feed.md",
      "version": "1.0.0",
      "updated": "2026-03-23"
    }
  ]
}
```

## Integração com squad creation

### No `squad.md`, adicionar:

```markdown
## Format injection (for content-oriented squads)

When creating a content-oriented squad, check if the output targets a specific platform or format.

If yes:
1. Check `.aioson/skills/squad/formats/catalog.json` for matching formats
2. List available formats to the user
3. Reference selected formats in the executor's `formats` field in the manifest
4. When generating executor agent files, include a reference:
   `## Active formats: {format-slug} (see .aioson/formats/{path})`

The executor should read the format file when producing output for that platform.

Format injection is NOT automatic context stuffing — it's a reference that the
executor follows when relevant. Keep the agent file lean.
```

### No manifest, adicionar ao executor:

```json
"formats": {
  "type": "array",
  "items": { "type": "string" },
  "description": "Format slugs from the format catalog that this executor uses"
}
```

## Versionamento e atualização

Os formatos são **versionados mas não auto-atualizados**. Para atualizar:

1. Manualmente: editar o `.md` e bumpar a versão
2. Via @orache: `@orache investigate-format instagram-feed` — investiga mudanças recentes da plataforma e sugere updates
3. Via CLI: `aioson formats:list` — mostra formatos com datas de última atualização

## Formatos iniciais a criar (10 essenciais)

1. `instagram-feed.md` — Post de feed com carrossel, caption, hashtags
2. `youtube-long.md` — Vídeo longo (10-20min), script, thumbnail, SEO
3. `youtube-shorts.md` — Short vertical (< 60s), hook rápido
4. `linkedin-post.md` — Post profissional, engagement hooks
5. `blog-post.md` — Artigo web, SEO, estrutura, meta tags
6. `newsletter.md` — Email newsletter, subject line, preview text
7. `twitter-thread.md` — Thread de tweets, storytelling em doses
8. `tiktok.md` — Vídeo vertical curto, trends, sounds
9. `podcast-script.md` — Script de episódio, segmentos, sponsors
10. `video-script.md` — Roteiro de vídeo genérico, scenes, shots

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `template/.aioson/skills/squad/formats/catalog.json` | CRIAR | Catálogo de formatos |
| `template/.aioson/skills/squad/formats/social/*.md` | CRIAR | 7+ formatos de redes sociais |
| `template/.aioson/skills/squad/formats/content/*.md` | CRIAR | 5+ formatos de conteúdo |
| `template/.aioson/skills/squad/formats/business/*.md` | CRIAR | 3+ formatos de negócio |
| `template/.aioson/skills/squad/formats/creative/*.md` | CRIAR | 3+ formatos criativos |
| `template/.aioson/schemas/squad-manifest.schema.json` | EDITAR | Campo formats no executor |
| `template/.aioson/agents/squad.md` | EDITAR | Seção format injection (referencia skills/squad/) |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
