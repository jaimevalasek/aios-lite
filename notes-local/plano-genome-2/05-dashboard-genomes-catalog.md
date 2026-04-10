# Fase 05 — Dashboard / Catálogo Genoma 2.0

## Objetivo
Evoluir a tela `/genomes` para suportar o catálogo completo do Genoma 2.0, mostrando metadados, origem, bindings e ações de aplicação sem quebrar a listagem atual.

## Repo alvo
`aios-lite-dashboard`

## Pré-requisitos
- `00-MASTER.md`
- `01-aios-lite-genoma-core.md`
- `04-dashboard-artisan-genoma.md`

## Regra desta fase
**100% aditivo.** Não remover a página `/genomes` existente nem reduzir a funcionalidade atual.

## Escopo
- Enriquecer o catálogo `/genomes`.
- Adicionar leitura dos metadados do Genoma 2.0.
- Exibir tipo, profundidade, evidence mode, origem e bindings.
- Adicionar ações para aplicar genoma em squad.

## Fora de escopo
- Edição completa de genoma em tela.
- Execução de pipeline com genoma.
- Visualização gráfica avançada de relações entre genomas.

## Impacto arquitetural
Esta fase transforma `/genomes` em catálogo operacional real, preparando o dashboard para o binding de genoma ↔ squad na fase seguinte.

## Risco de regressão
- Quebrar listagem de genomas antigos sem metadados novos.
- Assumir que todo genoma já tem `.meta.json`.
- Remover campos ou colunas esperadas pela UI atual.

---

## Entregáveis

### 5.1 — Criar endpoint de listagem enriquecida de genomas
- **Arquivo**: `app/api/genomes/route.ts`
- **Tipo**: EDITAR ou NOVO, conforme estrutura atual

Implementar endpoint que retorne um catálogo enriquecido:

```ts
import { NextResponse } from 'next/server';
import { listGenomesCatalog } from '@/lib/genomes/catalog';

export async function GET() {
  const genomes = await listGenomesCatalog();
  return NextResponse.json({ genomes });
}
```

### 5.2 — Criar helper de catálogo de genomas
- **Arquivo**: `lib/genomes/catalog.ts`
- **Tipo**: NOVO

Implementar função que combine:
- genoma markdown
- `.meta.json` quando existir
- dados de bindings quando existirem
- fallback seguro para genomas antigos

```ts
export type GenomeCatalogItem = {
  slug: string;
  title: string;
  type: 'domain' | 'function' | 'persona' | 'hybrid' | 'unknown';
  depth: 'lite' | 'standard' | 'deep' | 'unknown';
  evidenceMode: 'inferred' | 'evidenced' | 'hybrid' | 'unknown';
  generatedAt?: string;
  sourceCount: number;
  origin: 'local' | 'artisan' | 'imported' | 'unknown';
  bindingsCount: number;
  squadsCount: number;
  executorsCount: number;
  summary?: string;
};

export async function listGenomesCatalog(): Promise<GenomeCatalogItem[]> {
  // Ler diretório local de genomas.
  // Carregar metadados quando houver.
  // Contar bindings consultando SQLite.
  // Retornar itens ordenados por updated/generated.
  return [];
}
```

### 5.3 — Adicionar tabela de bindings de genoma no dashboard
- **Arquivo**: `lib/db/migrations/00xx_genome_bindings.sql`
- **Tipo**: NOVO

Criar tabela para auditoria mínima de bindings visíveis no catálogo:

```sql
CREATE TABLE IF NOT EXISTS genome_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  genome_slug TEXT NOT NULL,
  squad_slug TEXT NOT NULL,
  executor_slug TEXT,
  scope TEXT NOT NULL DEFAULT 'squad',
  mode TEXT NOT NULL DEFAULT 'persistent',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_genome_bindings_genome_slug
  ON genome_bindings(genome_slug);

CREATE INDEX IF NOT EXISTS idx_genome_bindings_squad_slug
  ON genome_bindings(squad_slug);
```

### 5.4 — Enriquecer a página `/genomes`
- **Arquivo**: `app/genomes/page.tsx`
- **Tipo**: EDITAR

Atualizar a tela para consumir a listagem enriquecida e mostrar:
- tipo
- depth
- evidence mode
- origem
- bindings
- squads impactadas
- ações rápidas

Estrutura sugerida:

```tsx
export default async function GenomesPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/genomes`, {
    cache: 'no-store',
  });

  const data = await res.json();
  const genomes = data.genomes ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Genomes</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de genomas com metadados, origem e vínculos ativos em squads.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {genomes.map((genome: any) => (
          <GenomeCard key={genome.slug} genome={genome} />
        ))}
      </div>
    </div>
  );
}
```

### 5.5 — Criar componente de card de genoma
- **Arquivo**: `components/genomes/genome-card.tsx`
- **Tipo**: NOVO

O card deve mostrar badges e ações:

```tsx
'use client';

type GenomeCardProps = {
  genome: {
    slug: string;
    title: string;
    type: string;
    depth: string;
    evidenceMode: string;
    sourceCount: number;
    squadsCount: number;
    executorsCount: number;
    summary?: string;
  };
};

export function GenomeCard({ genome }: GenomeCardProps) {
  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="space-y-1">
        <h2 className="font-medium">{genome.title}</h2>
        <p className="text-xs text-muted-foreground">{genome.slug}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border px-2 py-1">{genome.type}</span>
        <span className="rounded-full border px-2 py-1">{genome.depth}</span>
        <span className="rounded-full border px-2 py-1">{genome.evidenceMode}</span>
      </div>

      {genome.summary ? (
        <p className="text-sm text-muted-foreground line-clamp-4">{genome.summary}</p>
      ) : null}

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Sources</dt>
          <dd>{genome.sourceCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Squads</dt>
          <dd>{genome.squadsCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Executors</dt>
          <dd>{genome.executorsCount}</dd>
        </div>
      </dl>

      <div className="flex gap-2">
        <button className="rounded-xl border px-3 py-2 text-sm">View</button>
        <button className="rounded-xl border px-3 py-2 text-sm">Apply to squad</button>
      </div>
    </div>
  );
}
```

### 5.6 — Adicionar endpoint de detalhe de genoma
- **Arquivo**: `app/api/genomes/[slug]/route.ts`
- **Tipo**: NOVO

Retornar detalhe com metadados e bindings:

```ts
import { NextResponse } from 'next/server';
import { getGenomeDetail } from '@/lib/genomes/catalog';

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const genome = await getGenomeDetail(params.slug);

  if (!genome) {
    return NextResponse.json({ error: 'Genome not found' }, { status: 404 });
  }

  return NextResponse.json({ genome });
}
```

### 5.7 — Adicionar filtros básicos no catálogo
- **Arquivo**: `components/genomes/genome-filters.tsx`
- **Tipo**: NOVO

Criar filtros por:
- tipo
- profundidade
- evidence mode
- com/sem bindings

A implementação pode ser client-side na primeira versão.

---

## Testes

### Teste do catálogo enriquecido
- **Arquivo**: `tests/lib/genomes.catalog.test.ts`
- **Tipo**: NOVO

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { listGenomesCatalog } from '@/lib/genomes/catalog';

test('listGenomesCatalog tolerates legacy genomes without meta', async () => {
  const genomes = await listGenomesCatalog();
  assert.ok(Array.isArray(genomes));
});
```

### Teste da API `/api/genomes`
- **Arquivo**: `tests/api/genomes.route.test.ts`
- **Tipo**: NOVO

Validar que:
- a rota responde 200;
- retorna `{ genomes: [...] }`;
- suporta catálogo vazio.

---

## Validação manual
- [ ] `/genomes` continua abrindo.
- [ ] Genomas antigos aparecem sem erro.
- [ ] Genomas 2.0 mostram badges corretos.
- [ ] Contagem de bindings aparece quando existir.
- [ ] A ação “Apply to squad” aparece nos cards.

## Checklist de conclusão
- [ ] API de catálogo implementada.
- [ ] Helper de catálogo criado.
- [ ] Tabela de bindings criada.
- [ ] Página `/genomes` enriquecida.
- [ ] Testes cobrindo catálogo e API.

## Commit sugerido
```bash
feat(dashboard): enrich genomes catalog for genome 2.0
```
