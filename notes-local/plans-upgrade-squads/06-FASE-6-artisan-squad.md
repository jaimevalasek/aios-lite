# Fase 6 — Artisan Squad: Incubador de Ideias (P1-P2)

> **Objetivo:** Chat inteligente no dashboard para lapidar ideias de squad antes de criá-las
> **Pré-requisito:** Fase 1 completa (blueprint e manifest schemas existem)
> **Repositórios envolvidos:**
> - `aios-lite` (runtime-store, agent squad.md) — tabelas SQLite, integração com @squad
> - `aios-lite-dashboard` (interface) — chat, CRUD, relatórios, API

> ⚠️ **IMPORTANTE:** 100% aditivo em ambos os repositórios. NÃO delete nada. Leia `00-MASTER.md`.

---

## Conceito

O **Artisan Squad** é um incubador de ideias que vive no dashboard. O cliente conversa com um agente inteligente (via API da Anthropic) que faz o papel de um "product thinker" especializado em squads — inspirado no `@product` agent. O resultado é um PRD de squad amadurecido, salvo no SQLite, que pode ser refinado ao longo do tempo.

Quando a ideia estiver madura, o cliente clica "Prompt Id", copia um comando, e cola no terminal. O `@squad` lê o PRD do artisan e usa como input para gerar o squad de verdade.

**Fluxo completo:**
```
Dashboard: /artisan → "Nova Ideia" → Chat com Artisan → PRD gerado → Amadurecer → "Prompt Id"
Terminal:  @squad → cola o prompt → @squad lê artisan PRD → design → create → validate
```

---

## Visão geral dos entregáveis

```
6.1  Tabelas SQLite: artisan_squads + artisan_messages (aios-lite)
6.2  Funções CRUD no runtime-store.js (aios-lite)
6.3  Configuração de API key (aios-lite-dashboard)
6.4  API route /api/artisan/chat (aios-lite-dashboard)
6.5  API routes CRUD /api/artisan (aios-lite-dashboard)
6.6  Página /artisan — listagem (aios-lite-dashboard)
6.7  Página /artisan/new — novo chat (aios-lite-dashboard)
6.8  Página /artisan/[id] — chat + edição (aios-lite-dashboard)
6.9  Página /artisan/[id]/report — relatório visual (aios-lite-dashboard)
6.10 System prompt do Artisan Agent
6.11 Integração com @squad via Prompt Id (aios-lite)
6.12 Navegação do dashboard
```

---

## Contexto técnico do dashboard (referência rápida)

Detalhes completos estão na Fase 5. Resumo:
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, better-sqlite3, zod
- **Data layer:** `lib/dashboard-data.ts` com `openRuntimeDb(projectRoot)` — precisa exportar
- **Design system:** CSS vars (--background, --panel, --accent, etc.), dark/light themes
- **Primitivas:** `SurfacePanel`, `MetricTile`, `StatusBadge`, `SectionHeading`
- **Patterns:** Server Components por default, `"use client"` só quando precisa
- **Validação:** zod schemas
- **API routes:** `NextResponse.json()`, `export const dynamic = "force-dynamic"`
- **Nav:** array `primaryNav` em `components/shell/app-shell.tsx`
- **Registry:** `lib/project-registry.ts` — usa `data/projects.json`, schema com zod

---

## 6.1 — Tabelas SQLite

**Repo:** aios-lite
**Arquivo:** `src/runtime-store.js` (EDITAR — adicionar tabelas, NÃO deletar nada)

```javascript
// Artisan Squads — incubador de ideias de squad
db.exec(`
  CREATE TABLE IF NOT EXISTS artisan_squads (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'refining', 'ready', 'created', 'archived')),
    domain TEXT,
    goal TEXT,
    mode TEXT DEFAULT 'content',
    prd_markdown TEXT,
    summary TEXT,
    confidence REAL DEFAULT 0,
    tags_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// Artisan Messages — histórico do chat
db.exec(`
  CREATE TABLE IF NOT EXISTS artisan_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artisan_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (artisan_id) REFERENCES artisan_squads(id)
  )
`);
```

**Status lifecycle:**
```
draft → refining → ready → created → archived
         ↑    ↓
         └────┘  (pode voltar a refinar)
```

---

## 6.2 — Funções CRUD no runtime-store

**Repo:** aios-lite
**Arquivo:** `src/runtime-store.js` (EDITAR — adicionar e exportar funções)

```javascript
function createArtisanSquad(db, options) {
  const now = nowIso();
  const id = options.id || `artisan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = options.slug || id;

  db.prepare(`
    INSERT INTO artisan_squads (id, slug, title, status, domain, goal, mode, prd_markdown, summary, confidence, tags_json, created_at, updated_at)
    VALUES (@id, @slug, @title, @status, @domain, @goal, @mode, @prd_markdown, @summary, @confidence, @tags_json, @created_at, @updated_at)
  `).run({
    id, slug,
    title: options.title || 'Nova ideia',
    status: 'draft',
    domain: options.domain || null,
    goal: options.goal || null,
    mode: options.mode || 'content',
    prd_markdown: options.prdMarkdown || null,
    summary: options.summary || null,
    confidence: options.confidence || 0,
    tags_json: JSON.stringify(options.tags || []),
    created_at: now, updated_at: now,
  });
  return id;
}

function updateArtisanSquad(db, id, updates) { /* UPDATE artisan_squads SET ... WHERE id */ }
function getArtisanSquad(db, id) { /* SELECT * FROM artisan_squads WHERE id */ }
function listArtisanSquads(db) { /* SELECT * ORDER BY updated_at DESC */ }
function deleteArtisanSquad(db, id) { /* DELETE artisan_messages + artisan_squads */ }
function addArtisanMessage(db, artisanId, role, content) { /* INSERT artisan_messages */ }
function getArtisanMessages(db, artisanId) { /* SELECT * ORDER BY created_at ASC */ }
```

Exporte todas no `module.exports`.

---

## 6.3 — Configuração de API key

**Repo:** aios-lite-dashboard

O chat precisa chamar a API da Anthropic. A API key será configurada via variável de ambiente.

**Arquivo:** `.env.local` (NOVO — git-ignored)
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Arquivo:** `app/settings/page.tsx` (EDITAR — adicionar seção)

Adicione um bloco na página de Settings para configurar a API key:
```typescript
<RevealPanel
  eyebrow="Inteligência"
  title="Chave da API Anthropic"
  description="Necessária para o Artisan Squad. A chave é salva apenas no .env.local do dashboard."
  actionLabel="Salvar"
>
  <form action={saveApiKeyAction}>
    <input name="apiKey" type="password" placeholder="sk-ant-..." ... />
    <button type="submit">Salvar</button>
  </form>
</RevealPanel>
```

**Arquivo:** `app/actions/settings-actions.ts` (NOVO)
```typescript
"use server";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function saveApiKeyAction(formData: FormData) {
  const apiKey = formData.get("apiKey") as string;
  const envPath = path.join(process.cwd(), ".env.local");
  // Read existing, update ANTHROPIC_API_KEY line, write back
  // Redirect to /settings?settings_status=success&settings_message=API key saved
}
```

**Alternativa mais simples:** Se não quiser editar settings, pode usar apenas `.env.local` manual. O dashboard lê `process.env.ANTHROPIC_API_KEY` no server-side.

---

## 6.4 — API route /api/artisan/chat

**Repo:** aios-lite-dashboard
**Arquivo:** `app/api/artisan/chat/route.ts` (NOVO)

Este é o endpoint principal do chat. Recebe mensagem do usuário, envia para a API da Anthropic com o system prompt do Artisan, e retorna a resposta via streaming.

```typescript
import { NextRequest } from "next/server";
import { getCurrentProject } from "@/lib/project-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const project = await getCurrentProject();
  if (!project) {
    return Response.json({ error: "No active project" }, { status: 400 });
  }

  const { artisanId, messages } = await req.json();

  // Build messages array with system prompt
  const systemPrompt = buildArtisanSystemPrompt(); // see section 6.10

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
  });

  // Stream the response back to the client
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Nota sobre streaming:** A resposta da Anthropic é SSE (Server-Sent Events). O frontend faz `fetch` e processa os chunks com `ReadableStream`. Alternativa não-streaming: aguardar a resposta completa e retornar `Response.json({ content })`.

**Persistência das mensagens:** Após cada troca, o frontend faz um POST para `/api/artisan/messages` salvando no SQLite. Ou o backend pode salvar diretamente no handler.

---

## 6.5 — API routes CRUD

**Repo:** aios-lite-dashboard

### `app/api/artisan/route.ts` (NOVO)
```typescript
// GET — lista todos os artisan squads
// POST — cria um novo artisan squad (retorna id)
```

### `app/api/artisan/[id]/route.ts` (NOVO)
```typescript
// GET — retorna artisan squad com mensagens
// PUT — atualiza (title, status, prd_markdown, etc.)
// DELETE — remove artisan squad e mensagens
```

### `app/api/artisan/[id]/messages/route.ts` (NOVO)
```typescript
// GET — retorna histórico de mensagens
// POST — salva nova mensagem (user ou assistant)
```

### `app/api/artisan/[id]/generate-prd/route.ts` (NOVO)
```typescript
// POST — pega o histórico de mensagens, envia para a API com prompt de extração,
//         gera o PRD markdown, salva no artisan_squads.prd_markdown
//         Retorna o PRD gerado
```

Todas as routes abrem o SQLite via `openRuntimeDb(project.rootPath)` (exportar de `dashboard-data.ts` se ainda não exportou na Fase 5).

---

## 6.6 — Página /artisan (listagem)

**Repo:** aios-lite-dashboard
**Arquivo:** `app/artisan/page.tsx` (NOVO)

Server component. Lista todos os artisan squads como cards.

```typescript
import { AppShell } from "@/components/shell/app-shell";
import { getDashboardContext } from "@/lib/dashboard-data";
import Link from "next/link";

export default async function ArtisanPage() {
  const { currentProject, projects, data } = await getDashboardContext();

  // Buscar artisan squads do SQLite (via nova função em dashboard-data.ts ou API)

  return (
    <AppShell
      activeHref="/artisan"
      eyebrow="Artisan Squad"
      heading="Incube suas ideias antes de criar"
      description="Converse com o Artisan para lapidar a ideia do seu squad. Quando estiver pronta, gere o Prompt Id e crie o squad no terminal."
      projects={projects}
      currentProject={currentProject}
    >
      {/* Botão "Nova Ideia" → /artisan/new */}
      {/* Grid de cards com artisan squads */}
      {/* Cada card mostra: title, domain, status badge, confidence bar, data, botões */}
      {/* Botão "Prompt Id" em cada card com status "ready" */}
    </AppShell>
  );
}
```

**Design dos cards:**
```
┌─────────────────────────────────────────────────┐
│  CONTENT                            ● ready     │
│  Squad para YouTube sobre culinária             │
│                                                 │
│  Domínio: YouTube • Culinária                   │
│  Confidence: ████████░░ 80%                     │
│  Criado: 10/03/2026                             │
│                                                 │
│  [Continuar chat]  [Relatório]  [📋 Prompt Id]  │
└─────────────────────────────────────────────────┘
```

O botão **"📋 Prompt Id"** copia para a área de transferência:
```
@squad create --from-artisan artisan-1710000000-abc123
```

Implementar com `navigator.clipboard.writeText()` em um client component pequeno (tipo `CopyPromptButton`).

---

## 6.7 — Página /artisan/new (novo chat)

**Repo:** aios-lite-dashboard
**Arquivo:** `app/artisan/new/page.tsx` (NOVO)

Cria um artisan squad no SQLite com status `draft` e redireciona para `/artisan/[id]`.

Pode ser um server action simples:
```typescript
import { redirect } from "next/navigation";

// Server action que cria o registro e redireciona
async function createAndRedirect() {
  "use server";
  // POST /api/artisan → { id }
  // redirect(`/artisan/${id}`)
}
```

---

## 6.8 — Página /artisan/[id] (chat)

**Repo:** aios-lite-dashboard
**Arquivo:** `app/artisan/[id]/page.tsx` (NOVO)

Esta é a página principal do chat — **client component** (`"use client"`).

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│  AppShell header                                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Chat area (scrollable) ──────────────────────────────┐  │
│  │  🤖 Artisan: Me conta sobre a ideia do squad...       │  │
│  │  👤 Eu: Quero criar um squad para YouTube...          │  │
│  │  🤖 Artisan: Entendi. Deixa eu entender melhor...     │  │
│  │  ...                                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Input area ──────────────────────────────────────────┐  │
│  │  [                          ] [Enviar]                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Sidebar direita (resumo) ────────────────────────────┐  │
│  │  Status: refining                                      │  │
│  │  Domínio: YouTube                                      │  │
│  │  Confidence: 60%                                       │  │
│  │  [Gerar PRD]  [Ver Relatório]  [📋 Prompt Id]         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Implementação do chat

```typescript
"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function ArtisanChat({ artisanId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Salvar mensagem do usuário
    await fetch(`/api/artisan/${artisanId}/messages`, {
      method: "POST",
      body: JSON.stringify(userMessage),
    });

    // Chamar o chat
    const response = await fetch("/api/artisan/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artisanId, messages: updatedMessages }),
    });

    // Para resposta não-streaming (simples):
    const data = await response.json();
    const assistantContent = data.content?.[0]?.text || "Erro na resposta";
    const assistantMessage: Message = { role: "assistant", content: assistantContent };

    setMessages([...updatedMessages, assistantMessage]);

    // Salvar resposta do assistente
    await fetch(`/api/artisan/${artisanId}/messages`, {
      method: "POST",
      body: JSON.stringify(assistantMessage),
    });

    setIsLoading(false);
  }

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (/* UI do chat */);
}
```

### Estilo das mensagens
- Mensagem do usuário: alinhada à direita, `bg-[var(--accent-soft)]`, `rounded-[20px]`
- Mensagem do assistente: alinhada à esquerda, `bg-[var(--panel-elevated)]`, `rounded-[20px]`
- Área de input: `rounded-[24px] border border-[var(--border)] bg-[var(--panel-elevated)]`
- Botão enviar: `bg-[var(--accent)]` com ícone de seta

### Botão "Gerar PRD"
Ao clicar, POST para `/api/artisan/[id]/generate-prd`. O backend envia todo o histórico de mensagens para a API com um prompt de extração (ver 6.10) e salva o PRD no banco. O status muda para `ready`.

---

## 6.9 — Página /artisan/[id]/report (relatório visual)

**Repo:** aios-lite-dashboard
**Arquivo:** `app/artisan/[id]/report/page.tsx` (NOVO)

Server component. Renderiza o PRD de forma bonita e navegável.

```typescript
import { AppShell } from "@/components/shell/app-shell";
import { SectionHeading, StatusBadge, SurfacePanel, MetricTile } from "@/components/dashboard/premium-primitives";

export default async function ArtisanReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Buscar artisan squad do SQLite
  // Parse prd_markdown em seções

  return (
    <AppShell activeHref="/artisan" eyebrow="Artisan Report" heading={artisan.title} ...>
      {/* Hero com título, domínio, status, confidence */}

      {/* Métricas: confidence, mensagens trocadas, tempo de refinamento */}
      <section className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Confidence" value="80%" helper="Score de maturidade da ideia" tone="accent" />
        <MetricTile label="Mensagens" value="24" helper="Trocas no chat" tone="success" />
        <MetricTile label="Status" value="Ready" helper="Pronto para criar squad" tone="violet" />
      </section>

      {/* PRD renderizado em seções bonitas */}
      <SurfacePanel>
        {/* Vision */}
        <SectionHeading eyebrow="Visão" title={vision} />
        {/* Problem */}
        <SectionHeading eyebrow="Problema" title={problem} />
        {/* Users */}
        {/* MVP Scope — must-have vs should-have */}
        {/* Out of scope */}
        {/* Open questions — highlight em amarelo */}
      </SurfacePanel>

      {/* Botões de ação */}
      <div className="flex gap-3">
        <Link href={`/artisan/${id}`}>← Voltar ao chat</Link>
        <CopyPromptButton artisanId={id} />
      </div>
    </AppShell>
  );
}
```

---

## 6.10 — System prompt do Artisan Agent

**Repo:** aios-lite-dashboard
**Arquivo:** `lib/artisan-prompt.ts` (NOVO)

O system prompt é inspirado no `@product` agent mas adaptado para squads:

```typescript
export function buildArtisanSystemPrompt(): string {
  return `You are the Artisan Squad — an intelligent ideation partner that helps users refine ideas for AI agent squads before creating them.

## Your role
You act like a product thinker specialized in squad design. Your job is to understand what the user wants to build, who it's for, what the squad should produce, and what constraints exist. You produce a Squad PRD — a structured document that captures the refined idea.

## Conversation rules (from @product agent methodology)
1. Batch up to 5 questions per message. Always end with: "6 - Finalizar — gerar o PRD agora com o que temos."
2. Always number questions 1 through 5. Option 6 is always last.
3. Reflect before advancing: "Então basicamente X é Y — correto?"
4. Surface what users forget: edge cases, missing roles, output format gaps.
5. Challenge assumptions gently: "O que te faz acreditar que esse é o melhor approach?"
6. Prioritize ruthlessly: "Se só pudesse ter um agente no squad, qual seria?"
7. No filler words. Never open with "Ótimo!", "Perfeito!", etc.
8. First message is a single open question.

## What to extract during conversation
- Domain and topic of the squad
- Main problem being solved
- Goal / desired outcome
- Target audience
- Expected output types (articles, scripts, videos, analysis, code, etc.)
- Roles needed (3-5 specialists)
- Constraints (tone, language, technical level, tools)
- Content blueprints (what deliverables look like)
- Skills the squad might need
- Risks and open questions
- Mode: content | software | research | mixed

## Opening message
"Me conta sobre a ideia do squad — que problema ele resolve e para quem?"

## Finalization
When user says "6", "finalizar", "gerar", or similar:
Generate a Squad PRD in markdown with these sections:

# Squad PRD — [Title]

## Vision
[One sentence]

## Problem
[2-3 lines]

## Target audience
[Who will use this squad]

## Squad mode
[content | software | research | mixed]

## Domain
[Primary domain]

## Proposed executors
- @executor-slug — Role description
- @executor-slug — Role description
- @orquestrador — Coordinates the team

## Expected outputs
[What the squad produces]

## Content blueprints
[If content-oriented: content types, layout types, sections]

## Skills needed
[Reusable capabilities]

## MVP scope
### Must-have
- [Essential capability]

### Should-have
- [Valuable but not blocking]

## Out of scope
- [What is explicitly excluded]

## Risks and open questions
- [Unresolved decisions]

## Confidence
[0-100% — how mature is this idea]

After generating, tell the user: "PRD gerado! Você pode continuar refinando no chat ou ir para o Relatório para revisar. Quando estiver pronto, use o Prompt Id para criar o squad no terminal."

## Language
Detect user language and respond in the same language. Default: Portuguese (Brazil).

## Hard constraints
- NEVER invent domain facts
- If a section wasn't discussed, write "TBD — não discutido"
- Keep the Squad PRD focused on squad composition, not on code or architecture
- You are NOT creating the squad — you are helping the user THINK about the squad`;
}

export function buildPrdExtractionPrompt(): string {
  return `Based on the entire conversation above, extract and generate a complete Squad PRD in markdown format. Follow the Squad PRD template exactly. For sections not discussed, write "TBD — não discutido". Calculate a confidence score (0-100) based on how many sections are filled vs TBD. Return ONLY the markdown PRD, no preamble.`;
}
```

---

## 6.11 — Integração com @squad via Prompt Id

**Repo:** aios-lite

### O Prompt Id

Quando o usuário clica "📋 Prompt Id" no dashboard, é copiado:
```
@squad create --from-artisan artisan-1710000000-abc123
```

### Atualização do squad.md

**Arquivo:** `template/.aios-lite/agents/squad.md` (EDITAR — adicionar na seção Subcommand routing)

Adicione ao routing:
```markdown
- `@squad create --from-artisan <artisan-id>` → read artisan PRD and use as blueprint source

### Artisan integration
If the user provides `--from-artisan <id>`:
1. Look for the artisan PRD at the project's SQLite database (table: artisan_squads, column: prd_markdown)
2. If SQLite is not accessible, look for `.aios-lite/squads/.artisan/<id>.md` as fallback
3. Read the Squad PRD markdown
4. Use it as input for the design phase — skip the initial questions since the PRD already has them answered
5. Generate the blueprint from the PRD content
6. Proceed with create → validate as normal
7. After successful creation, update the artisan record status to 'created' if possible
```

### Fallback sem SQLite

Como o agente no terminal pode não ter acesso fácil ao SQLite, o dashboard também deve salvar o PRD como arquivo `.md`:

**No endpoint `/api/artisan/[id]/generate-prd`**, além de salvar no SQLite, escreva:
```
{projectRoot}/.aios-lite/squads/.artisan/{artisan-id}.md
```

Assim o `@squad` pode ler o PRD como arquivo .md normal.

### Atualização da task squad-design.md

**Arquivo:** `template/.aios-lite/tasks/squad-design.md` (EDITAR — adicionar passo 0)

```markdown
### Passo 0 — Verificar artisan input
Se o usuário forneceu `--from-artisan <id>`:
1. Procure `.aios-lite/squads/.artisan/<id>.md`
2. Se encontrar, leia o Squad PRD
3. Extraia: domain, goal, mode, executors propostos, skills, constraints, content blueprints
4. Use como base para o blueprint — pule para o Passo 5 (calcular readiness)
5. Mostre ao usuário: "Li o PRD do Artisan. Posso gerar o blueprint com base nele — quer ajustar algo?"
```

---

## 6.12 — Navegação do dashboard

**Repo:** aios-lite-dashboard
**Arquivo:** `components/shell/app-shell.tsx` (EDITAR)

Adicione na lista `primaryNav`, sugestão de posição — APÓS "Squads":
```typescript
{ href: "/artisan", label: "Artisan", description: "Incube ideias antes de criar squads" },
```

---

## Extras recomendados

### CopyPromptButton (client component reutilizável)

**Arquivo:** `components/artisan/copy-prompt-button.tsx` (NOVO)

```typescript
"use client";

import { useState } from "react";

export function CopyPromptButton({ artisanId }: { artisanId: string }) {
  const [copied, setCopied] = useState(false);
  const prompt = `@squad create --from-artisan ${artisanId}`;

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[rgba(109,167,255,0.22)]"
    >
      {copied ? "✓ Copiado!" : "📋 Prompt Id"}
    </button>
  );
}
```

### ArtisanStatusBadge

Usar o `StatusBadge` existente com mapping de cores:
```typescript
const statusTone = {
  draft: "neutral",
  refining: "accent",
  ready: "success",
  created: "violet",
  archived: "warning",
} as const;
```

---

## Checklist de conclusão da Fase 6

### aios-lite
```
[ ] runtime-store.js com tabelas artisan_squads e artisan_messages
[ ] runtime-store.js com funções CRUD exportadas
[ ] squad.md com routing --from-artisan
[ ] squad-design.md com passo 0 de artisan input
[ ] Diretório .aios-lite/squads/.artisan/ como fallback de PRDs
[ ] Commit: "feat(squad): artisan squad integration — read PRD from artisan"
```

### aios-lite-dashboard
```
[ ] lib/artisan-prompt.ts com system prompt e extraction prompt
[ ] app/api/artisan/route.ts (GET, POST)
[ ] app/api/artisan/[id]/route.ts (GET, PUT, DELETE)
[ ] app/api/artisan/[id]/messages/route.ts (GET, POST)
[ ] app/api/artisan/[id]/generate-prd/route.ts (POST)
[ ] app/api/artisan/chat/route.ts (POST — chat com API Anthropic)
[ ] app/artisan/page.tsx (listagem)
[ ] app/artisan/new/page.tsx (criação + redirect)
[ ] app/artisan/[id]/page.tsx (chat interface)
[ ] app/artisan/[id]/report/page.tsx (relatório visual)
[ ] components/artisan/copy-prompt-button.tsx
[ ] components/shell/app-shell.tsx — nav com /artisan
[ ] .env.local com ANTHROPIC_API_KEY (documentar no README)
[ ] Commit: "feat(dashboard): artisan squad — chat ideation and PRD generation"
```
