# Fase 04 — Dashboard / Artisan para incubação de Genoma

## Objetivo
Adicionar suporte a incubação de genoma no `/artisan`, reaproveitando o fluxo atual de chat e geração de relatório final, sem quebrar a incubação existente de squads.

## Repo alvo
`aios-lite-dashboard`

## Pré-requisitos
- `00-MASTER.md`
- `01-aios-lite-genoma-core.md`
- `02-aios-lite-genoma-binding-squad.md`
- `03-aios-lite-migration-compat.md`

## Regra desta fase
**100% aditivo. NÃO deletar nada.**

Esta fase deve preservar integralmente:
- a listagem atual de ideias em `/artisan`
- o chat atual em `/artisan/[id]`
- a geração atual de PRD para squads
- a persistência atual em SQLite e fallback local

Tudo que for adicionado para genoma deve coexistir com o fluxo atual de squad.

---

## Escopo

Esta fase implementa:
1. Suporte a dois tipos de incubação no Artisan: `squad` e `genome`
2. UI de criação de nova ideia com escolha explícita do tipo
3. Ajuste da listagem de `/artisan` para mostrar o tipo da ideia
4. Ajuste do chat em `/artisan/[id]` para trocar placeholder, CTA e geração final conforme o tipo
5. Endpoint novo para gerar `Genome Brief`
6. Persistência de `genome_brief_markdown` sem quebrar `prd_markdown`
7. Fallback local-first para salvar o brief em `.aios-lite/genomas/.artisan/{id}.md`

---

## Fora de escopo

Esta fase **não** implementa:
- criação final do genoma no core do `aios-lite`
- binding genoma ↔ squad no dashboard
- edição visual de genomas em pipelines
- aplicação de genoma em squads existentes
- execução automática de pipelines

Esses pontos entram em fases posteriores.

---

## Impacto arquitetural

Após esta fase:
- `/artisan` vira uma incubadora universal de ideias, com dois modos: squad e genoma
- o fluxo de squad continua igual, apenas ganhando um discriminador de tipo
- o fluxo de genoma reutiliza a mesma experiência de chat, mas gera `Genome Brief` em vez de PRD
- o banco passa a suportar `genome_brief_markdown` e `artifact_type`
- o dashboard continua local-first, salvando no SQLite e espelhando um fallback em arquivo local

---

## Risco de regressão

### Invariantes que precisam continuar verdadeiros
- Ideias antigas de squad devem continuar abrindo normalmente
- `prd_markdown` deve continuar funcionando para squads
- O botão de geração final de squad deve continuar gerando o PRD atual
- O fluxo de mensagens em `/api/artisan/:id/messages` não deve mudar contrato
- O chat deve continuar funcionando com os providers atuais

### Estratégia de proteção
- manter leitura tolerante: registros antigos sem `artifact_type` devem ser tratados como `squad`
- adicionar colunas novas sem remover ou renomear colunas antigas
- criar endpoint novo para genoma, sem mexer no endpoint atual de PRD
- só trocar labels e placeholders por tipo; não reescrever o fluxo base de mensagens

---

## Convenções específicas desta fase

### Tipos aceitos
Usar estes tipos no dashboard:
- `artifact_type = "squad"`
- `artifact_type = "genome"`

### Compatibilidade
Se o banco ainda não tiver `artifact_type`, inferir:
- `squad` por padrão

### Documento final por tipo
- `squad` → `prd_markdown`
- `genome` → `genome_brief_markdown`

### Fallback local-first
- squad → `.aios-lite/squads/.artisan/{id}.md`
- genome → `.aios-lite/genomas/.artisan/{id}.md`

---

# Entregáveis

## 4.1 — Atualizar o schema do runtime SQLite do Artisan para suportar genoma

### Arquivo
`lib/dashboard-data.ts`

### Tipo
**EDITAR**

### Objetivo
Garantir que a tabela `artisan_squads` suporte incubação de genoma sem quebrar dados já existentes.

### Implementação
Adicionar uma rotina de migração aditiva no bootstrap do banco para criar as colunas novas quando não existirem.

Usar a seguinte implementação utilitária:

```ts
function ensureArtisanGenomeColumns(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(artisan_squads)`).all() as Array<{ name: string }>;
  const names = new Set(columns.map((c) => c.name));

  if (!names.has("artifact_type")) {
    db.exec(`ALTER TABLE artisan_squads ADD COLUMN artifact_type TEXT DEFAULT 'squad'`);
  }

  if (!names.has("genome_brief_markdown")) {
    db.exec(`ALTER TABLE artisan_squads ADD COLUMN genome_brief_markdown TEXT`);
  }

  if (!names.has("source_mode")) {
    db.exec(`ALTER TABLE artisan_squads ADD COLUMN source_mode TEXT DEFAULT 'dashboard'`);
  }
}
```

Chamar essa função no mesmo ponto em que o runtime DB já garante suas tabelas base.

### Regras
- Não renomear `artisan_squads`
- Não remover `mode`, `prd_markdown`, `status`, `confidence`
- Não mudar registros antigos

---

## 4.2 — Criar helper de domínio para Artisan por tipo

### Arquivo
`lib/artisan/artifact-types.ts`

### Tipo
**NOVO**

### Implementação

```ts
export type ArtisanArtifactType = "squad" | "genome";

export function normalizeArtisanArtifactType(value: unknown): ArtisanArtifactType {
  return value === "genome" ? "genome" : "squad";
}

export function getArtisanArtifactLabel(type: ArtisanArtifactType): string {
  return type === "genome" ? "Genoma" : "Squad";
}

export function getArtisanFinalDocumentLabel(type: ArtisanArtifactType): string {
  return type === "genome" ? "Genome Brief" : "PRD";
}

export function getArtisanEmptyStatePrompt(type: ArtisanArtifactType): string {
  if (type === "genome") {
    return "Me conta sobre a ideia do genoma — qual domínio, perfil cognitivo ou especialização você quer construir?";
  }

  return "Me conta sobre a ideia do squad — que problema ele resolve e para quem?";
}

export function getArtisanGenerateActionLabel(type: ArtisanArtifactType): string {
  return type === "genome" ? "Gerar Genome Brief" : "Gerar PRD";
}
```

---

## 4.3 — Ajustar a criação de nova ideia para escolher tipo

### Arquivo
`app/artisan/new/page.tsx`

### Tipo
**EDITAR**

### Objetivo
Permitir que o usuário escolha se a ideia nova é de `squad` ou `genome`.

### Implementação
Substituir a tela simples atual por um formulário com:
- título
- domínio opcional
- objetivo opcional
- tipo da ideia (`squad` | `genome`)

#### Código sugerido

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ArtisanArtifactType } from "@/lib/artisan/artifact-types";

export default function NewArtisanIdeaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");
  const [goal, setGoal] = useState("");
  const [artifactType, setArtifactType] = useState<ArtisanArtifactType>("squad");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/artisan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          domain: domain.trim() || null,
          goal: goal.trim() || null,
          artifactType,
        }),
      });

      const data = await response.json();
      if (data?.artisan?.id) {
        router.push(`/artisan/${data.artisan.id}`);
        return;
      }

      throw new Error(data?.error || "Falha ao criar ideia");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/artisan" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Artisan
      </Link>

      <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold tracking-tight">Nova ideia</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Incube uma nova ideia de squad ou genoma antes de gerar o artefato final.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tipo</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setArtifactType("squad")}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition",
                  artifactType === "squad"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--panel-elevated)] hover:border-[var(--accent)]",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">Squad</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Para incubar uma unidade executora que depois será criada no AIOS Lite.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setArtifactType("genome")}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition",
                  artifactType === "genome"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--panel-elevated)] hover:border-[var(--accent)]",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">Genoma</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Para incubar uma camada cognitiva, domínio, função ou persona especializada.
                </div>
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={artifactType === "genome" ? "Ex.: Genoma de Storytelling para YouTube" : "Ex.: Squad de roteiros para YouTube"}
              className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-4 outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Domínio</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={artifactType === "genome" ? "Ex.: creator economy, branding, storytelling" : "Ex.: conteúdo, growth, criativos"}
              className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-4 outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Objetivo inicial</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={5}
              placeholder={artifactType === "genome"
                ? "Quero um genoma que pense como um estrategista de conteúdo multiplataforma..."
                : "Quero uma squad que gere roteiro, copy e assets..."}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-4 py-3 outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/artisan"
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar ideia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 4.4 — Criar endpoint de criação de ideia com `artifact_type`

### Arquivo
`app/api/artisan/route.ts`

### Tipo
**NOVO**

### Objetivo
Criar registros do Artisan com tipo explícito.

### Implementação

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDashboardContext, openRuntimeDb } from "@/lib/dashboard-data";
import { normalizeArtisanArtifactType } from "@/lib/artisan/artifact-types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const title = String(body?.title || "").trim();
  const domain = body?.domain ? String(body.domain).trim() : null;
  const goal = body?.goal ? String(body.goal).trim() : null;
  const artifactType = normalizeArtisanArtifactType(body?.artifactType);

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { currentProject } = await getDashboardContext();
  if (!currentProject) {
    return NextResponse.json({ error: "No project selected" }, { status: 400 });
  }

  const db = openRuntimeDb(currentProject.rootPath);
  if (!db) {
    return NextResponse.json({ error: "Runtime DB unavailable" }, { status: 500 });
  }

  try {
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO artisan_squads (
        id, title, domain, goal, status, confidence, mode, artifact_type, source_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', 0, 'content', ?, 'dashboard', ?, ?)
    `).run(crypto.randomUUID(), title, domain, goal, artifactType, now, now);

    const created = db.prepare(`SELECT * FROM artisan_squads WHERE rowid = ?`).get(result.lastInsertRowid);
    return NextResponse.json({ artisan: created });
  } finally {
    db.close();
  }
}
```

### Observação
Se o projeto já tiver um endpoint `app/api/artisan/route.ts`, editar o existente em vez de duplicar. O comportamento deve continuar aceitando criação de ideia de squad por padrão.

---

## 4.5 — Ajustar listagem de `/artisan` para mostrar tipo e documento final por tipo

### Arquivo
`app/artisan/page.tsx`

### Tipo
**EDITAR**

### Implementação
Adicionar import dos helpers:

```tsx
import { getArtisanArtifactLabel, normalizeArtisanArtifactType } from "@/lib/artisan/artifact-types";
```

No map de cards, normalizar o tipo:

```tsx
const artifactType = normalizeArtisanArtifactType(artisan.artifact_type ?? artisan.mode ?? "squad");
const artifactLabel = getArtisanArtifactLabel(artifactType);
const hasFinalReport = artifactType === "genome"
  ? Boolean(artisan.genome_brief_markdown)
  : Boolean(artisan.prd_markdown);
```

Substituir a badge atual por:

```tsx
<span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--muted)]">
  {artifactLabel}
</span>
```

Substituir o trecho do botão de relatório por:

```tsx
{hasFinalReport && <Link href={`/artisan/${id}?tab=report`}>Relatório</Link>}
```

### Regras
- manter status atual
- manter confidence atual
- não quebrar cards existentes

---

## 4.6 — Criar system prompt específico para incubação de genoma

### Arquivo
`lib/artisan/prompts.ts`

### Tipo
**NOVO**

### Implementação

```ts
export function buildSquadArtisanSystemPrompt(): string {
  return [
    "Você é um estrategista de descoberta de squads do AIOS Lite.",
    "Seu papel é ajudar o usuário a amadurecer a ideia até ela virar um PRD claro e acionável.",
    "Faça perguntas curtas, estratégicas e progressivas.",
    "Evite respostas genéricas.",
    "Ajude a esclarecer objetivo, público, outputs, inputs, diferenciais, contexto operacional e sinais de sucesso.",
  ].join(" ");
}

export function buildGenomeArtisanSystemPrompt(): string {
  return [
    "Você é um estrategista de descoberta de genomas do AIOS Lite.",
    "Seu papel é absorver profundamente a ideia do usuário até ela virar um Genome Brief claro, rico e aplicável.",
    "Faça perguntas curtas e progressivas para entender: domínio, função, persona, profundidade desejada, evidence mode, filosofias, modelos mentais, heurísticas, frameworks, metodologias, mentes, skills, blind spots e aplicação futura em squads.",
    "Evite respostas genéricas.",
    "Sempre ajude a lapidar a intenção antes de consolidar o documento final.",
  ].join(" ");
}
```

---

## 4.7 — Ajustar o chat do Artisan para reagir ao tipo

### Arquivo
`app/artisan/[id]/page.tsx`

### Tipo
**EDITAR**

### Objetivo
Trocar labels, CTA e geração final conforme o tipo do artefato incubado.

### Implementação

Adicionar imports:

```tsx
import {
  getArtisanEmptyStatePrompt,
  getArtisanGenerateActionLabel,
  normalizeArtisanArtifactType,
} from "@/lib/artisan/artifact-types";
```

Expandir o tipo local do registro:

```tsx
type ArtisanRecord = {
  id: string;
  title: string;
  status: string;
  domain: string | null;
  confidence: number;
  prd_markdown: string | null;
  genome_brief_markdown?: string | null;
  artifact_type?: "squad" | "genome" | null;
};
```

Normalizar o tipo dentro do componente:

```tsx
const artifactType = normalizeArtisanArtifactType(artisan?.artifact_type);
const generateLabel = getArtisanGenerateActionLabel(artifactType);
const emptyPrompt = getArtisanEmptyStatePrompt(artifactType);
```

Substituir empty state:

```tsx
<p className="text-sm text-[var(--muted)]">{emptyPrompt}</p>
```

Adicionar função de geração por tipo:

```tsx
async function generateFinalDocument() {
  setIsGeneratingPrd(true);
  try {
    const endpoint = artifactType === "genome"
      ? `/api/artisan/${artisanId}/generate-genome-brief`
      : `/api/artisan/${artisanId}/generate-prd`;

    const response = await fetch(endpoint, { method: "POST" });
    const data = await response.json();

    if (data.code === "LLM_NOT_CONFIGURED" || (response.status === 503 && data.error)) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${data.error}` }]);
      return;
    }

    if (data.usage) {
      setTotalTokens(prev => ({
        input: prev.input + (data.usage?.inputTokens ?? 0),
        output: prev.output + (data.usage?.outputTokens ?? 0),
      }));
    }

    setArtisan(prev => prev ? {
      ...prev,
      status: "ready",
      confidence: data.confidence || 0,
      prd_markdown: data.prdMarkdown ?? prev.prd_markdown ?? null,
      genome_brief_markdown: data.genomeBriefMarkdown ?? prev.genome_brief_markdown ?? null,
    } : prev);
  } finally {
    setIsGeneratingPrd(false);
  }
}
```

Substituir o botão atual por:

```tsx
<button
  onClick={generateFinalDocument}
  disabled={isGeneratingPrd}
  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
>
  {isGeneratingPrd ? "Gerando..." : generateLabel}
</button>
```

### Regras
- não remover seletor de provider
- não remover contagem de tokens
- não alterar contrato do endpoint `/api/artisan/chat`

---

## 4.8 — Criar endpoint de geração de Genome Brief

### Arquivo
`app/api/artisan/[id]/generate-genome-brief/route.ts`

### Tipo
**NOVO**

### Implementação

```ts
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { getDashboardContext, openRuntimeDb } from "@/lib/dashboard-data";
import { callLlmForArtisanGenomeBrief } from "@/lib/artisan/runtime";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { currentProject } = await getDashboardContext();

  if (!currentProject) {
    return NextResponse.json({ error: "No project selected" }, { status: 400 });
  }

  const db = openRuntimeDb(currentProject.rootPath);
  if (!db) {
    return NextResponse.json({ error: "Runtime DB unavailable" }, { status: 500 });
  }

  try {
    const artisan = db.prepare(`SELECT * FROM artisan_squads WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!artisan) {
      return NextResponse.json({ error: "Artisan idea not found" }, { status: 404 });
    }

    const messages = db.prepare(`
      SELECT role, content
      FROM artisan_messages
      WHERE artisan_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(id) as Array<{ role: "user" | "assistant"; content: string }>;

    const result = await callLlmForArtisanGenomeBrief({ artisan, messages });

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE artisan_squads
      SET genome_brief_markdown = ?, status = 'ready', confidence = ?, updated_at = ?
      WHERE id = ?
    `).run(result.genomeBriefMarkdown, result.confidence, now, id);

    const artisanDir = path.join(currentProject.rootPath, ".aios-lite", "genomas", ".artisan");
    await fs.mkdir(artisanDir, { recursive: true });
    await fs.writeFile(path.join(artisanDir, `${id}.md`), result.genomeBriefMarkdown, "utf8");

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate Genome Brief" },
      { status: 500 },
    );
  } finally {
    db.close();
  }
}
```

---

## 4.9 — Criar runtime utilitário para geração de Genome Brief

### Arquivo
`lib/artisan/runtime.ts`

### Tipo
**NOVO** ou **EDITAR**, se já existir arquivo de runtime parecido

### Implementação

```ts
import { getDefaultLlmClient } from "@/lib/llm-client";
import { buildGenomeArtisanSystemPrompt } from "@/lib/artisan/prompts";

export async function callLlmForArtisanGenomeBrief(input: {
  artisan: Record<string, unknown>;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{
  genomeBriefMarkdown: string;
  confidence: number;
  usage?: { inputTokens: number; outputTokens: number };
}> {
  const client = getDefaultLlmClient();

  const title = String(input.artisan.title || "Novo Genoma");
  const domain = input.artisan.domain ? String(input.artisan.domain) : "";
  const goal = input.artisan.goal ? String(input.artisan.goal) : "";

  const transcript = input.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = [
    buildGenomeArtisanSystemPrompt(),
    "Gere um documento final em markdown chamado Genome Brief.",
    "Estruture o brief com: visão geral, tipo do genoma, domínio, objetivo, evidence mode sugerido, filosofias, modelos mentais, heurísticas, frameworks, metodologias, mentes, skills, blind spots, aplicações em squads, perguntas em aberto e nível de confiança.",
    `Título: ${title}`,
    domain ? `Domínio: ${domain}` : "",
    goal ? `Objetivo inicial: ${goal}` : "",
    "Histórico da conversa:",
    transcript,
  ].filter(Boolean).join("\n\n");

  const response = await client.generateText({
    system: buildGenomeArtisanSystemPrompt(),
    prompt,
    temperature: 0.4,
  });

  const text = response.content?.[0]?.text?.trim() || "# Genome Brief\n\nFalha ao gerar conteúdo.";

  return {
    genomeBriefMarkdown: text,
    confidence: 84,
    usage: response.usage,
  };
}
```

### Regras
- reutilizar o client atual do dashboard
- não mudar o contrato do provider picker
- não inventar client paralelo

---

## 4.10 — Ajustar endpoint de leitura do Artisan para incluir `artifact_type` e `genome_brief_markdown`

### Arquivo
`app/api/artisan/[id]/route.ts`

### Tipo
**EDITAR**

### Objetivo
Garantir que o front receba os campos novos sem quebrar o contrato atual.

### Implementação
Se o endpoint já retorna `artisan` completo da tabela, manter isso. Se houver seleção manual de colunas, incluir:
- `artifact_type`
- `genome_brief_markdown`

Garantir fallback:

```ts
const artisan = row
  ? {
      ...row,
      artifact_type: row.artifact_type ?? "squad",
      genome_brief_markdown: row.genome_brief_markdown ?? null,
    }
  : null;
```

---

## 4.11 — Ajustar renderer do relatório final no chat

### Arquivo
`app/artisan/[id]/page.tsx`

### Tipo
**EDITAR**

### Objetivo
Exibir o documento final correto por tipo, sem duplicar a tela.

### Implementação
No local em que a UI mostra o relatório final, usar:

```tsx
const finalMarkdown = artifactType === "genome"
  ? artisan?.genome_brief_markdown
  : artisan?.prd_markdown;
```

E o título:

```tsx
const reportTitle = artifactType === "genome" ? "Genome Brief" : "PRD";
```

---

## 4.12 — Adicionar suporte de prompt no chat server-side

### Arquivo
`app/api/artisan/chat/route.ts`

### Tipo
**EDITAR**

### Objetivo
Garantir que a incubação de genoma use um system prompt diferente da incubação de squad.

### Implementação
Ler o `artifact_type` da ideia e selecionar o prompt correto.

#### Trecho sugerido

```ts
import {
  buildGenomeArtisanSystemPrompt,
  buildSquadArtisanSystemPrompt,
} from "@/lib/artisan/prompts";
import { normalizeArtisanArtifactType } from "@/lib/artisan/artifact-types";

const artifactType = normalizeArtisanArtifactType(artisan?.artifact_type);
const system = artifactType === "genome"
  ? buildGenomeArtisanSystemPrompt()
  : buildSquadArtisanSystemPrompt();
```

### Regra
O contrato do endpoint não muda. Só muda o prompt usado internamente.

---

# Testes

## 4.T1 — Teste de normalização de tipo

### Arquivo
`tests/dashboard/artisan-artifact-types.test.ts`

### Tipo
**NOVO**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeArtisanArtifactType,
  getArtisanGenerateActionLabel,
} from "../../lib/artisan/artifact-types";

test("normalizeArtisanArtifactType mantém genome", () => {
  assert.equal(normalizeArtisanArtifactType("genome"), "genome");
});

test("normalizeArtisanArtifactType cai para squad por padrão", () => {
  assert.equal(normalizeArtisanArtifactType(undefined), "squad");
  assert.equal(normalizeArtisanArtifactType("content"), "squad");
});

test("label de ação final muda por tipo", () => {
  assert.equal(getArtisanGenerateActionLabel("squad"), "Gerar PRD");
  assert.equal(getArtisanGenerateActionLabel("genome"), "Gerar Genome Brief");
});
```

---

## 4.T2 — Teste de migração aditiva do SQLite

### Arquivo
`tests/dashboard/artisan-schema-migration.test.ts`

### Tipo
**NOVO**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ensureArtisanGenomeColumns } from "../../lib/dashboard-data";

test("ensureArtisanGenomeColumns adiciona colunas sem quebrar tabela existente", () => {
  const db = new Database(":memory:");

  db.exec(`
    CREATE TABLE artisan_squads (
      id TEXT PRIMARY KEY,
      title TEXT,
      prd_markdown TEXT
    )
  `);

  ensureArtisanGenomeColumns(db);

  const columns = db.prepare(`PRAGMA table_info(artisan_squads)`).all() as Array<{ name: string }>;
  const names = columns.map((c) => c.name);

  assert.ok(names.includes("artifact_type"));
  assert.ok(names.includes("genome_brief_markdown"));
  assert.ok(names.includes("prd_markdown"));
});
```

> Se `ensureArtisanGenomeColumns` não puder ser exportada do arquivo principal, criar um helper pequeno em `lib/artisan/schema.ts` e testar esse helper.

---

## 4.T3 — Teste do endpoint de criação de ideia com tipo genome

### Arquivo
`tests/dashboard/artisan-create-genome-route.test.ts`

### Tipo
**NOVO**

### Estratégia
Mockar contexto do dashboard e runtime DB. Verificar se a resposta retorna `artifact_type = genome`.

Se o projeto ainda não tiver harness HTTP para rotas do App Router, pelo menos testar a função utilitária que insere o registro no banco.

---

# Validação manual

- [ ] A rota `/artisan/new` permite escolher entre Squad e Genoma
- [ ] Criar ideia de tipo Genoma redireciona corretamente para `/artisan/[id]`
- [ ] `/artisan` lista a ideia com badge “Genoma”
- [ ] O chat de genoma mostra placeholder voltado para camada cognitiva/especialização
- [ ] O botão final do chat mostra “Gerar Genome Brief” para ideias de genoma
- [ ] O endpoint novo gera `genome_brief_markdown`
- [ ] O arquivo `.aios-lite/genomas/.artisan/{id}.md` é criado no projeto atual
- [ ] Ideias antigas de squad continuam funcionando sem precisar migrar manualmente
- [ ] O fluxo de geração de PRD para squad continua intacto

---

# Checklist de conclusão

- [ ] Banco suporta `artifact_type`
- [ ] Banco suporta `genome_brief_markdown`
- [ ] Nova ideia suporta tipo `genome`
- [ ] `/artisan` mostra tipo corretamente
- [ ] `/artisan/[id]` troca labels conforme o tipo
- [ ] Prompt do chat muda para genoma quando aplicável
- [ ] Existe endpoint aditivo `generate-genome-brief`
- [ ] Existe fallback local-first para `.aios-lite/genomas/.artisan`
- [ ] Testes adicionados
- [ ] Fluxo antigo de squad não foi quebrado

---

# Commit sugerido

```bash
feat(dashboard): add genome incubation flow to artisan
```

---

# Observações finais para o agente de código

1. Não reestruture o Artisan inteiro.
2. Não transforme genoma em rota paralela separada nesta fase.
3. Não remova `mode`; adicione `artifact_type`.
4. Não substitua `prd_markdown`; adicione `genome_brief_markdown`.
5. Priorize compatibilidade: registros antigos devem abrir como `squad`.
6. Reaproveite ao máximo os componentes e endpoints existentes.
