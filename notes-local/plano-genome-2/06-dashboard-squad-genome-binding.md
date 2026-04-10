# Fase 06 — Dashboard / Binding de Genoma em Squad

## Objetivo
Adicionar no dashboard a capacidade de aplicar e remover genomas em squads, tanto em nível de squad quanto em nível de executor, preservando o fluxo atual e refletindo os bindings do Genoma 2.0.

## Repo alvo
`aios-lite-dashboard`

## Pré-requisitos
- `00-MASTER.md`
- `01-aios-lite-genoma-core.md`
- `02-aios-lite-genoma-binding-squad.md`
- `05-dashboard-genomes-catalog.md`

## Regra desta fase
**100% aditivo.** Não remover a visualização atual de squads nem alterar os fluxos atuais sem fallback.

## Escopo
- Mostrar genomas aplicados em cada squad.
- Permitir adicionar genoma a uma squad.
- Permitir aplicar genoma a executor específico.
- Permitir remover binding.
- Persistir e auditar bindings no SQLite.

## Fora de escopo
- Edição completa do manifesto da squad em tela.
- Pipeline visual com bindings editáveis diretamente no canvas.

## Impacto arquitetural
Esta fase conecta o catálogo de genomas ao catálogo de squads, tornando o binding um recurso operacional do dashboard.

## Risco de regressão
- Assumir que toda squad já possui campo `genomes`.
- Duplicar bindings ao aplicar repetidamente o mesmo genoma.
- Quebrar a página `/squads` ao enriquecer o payload.

---

## Entregáveis

### 6.1 — Criar endpoint para listar bindings de uma squad
- **Arquivo**: `app/api/squads/[slug]/genomes/route.ts`
- **Tipo**: NOVO

```ts
import { NextResponse } from 'next/server';
import { listSquadGenomeBindings } from '@/lib/squads/genome-bindings';

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const bindings = await listSquadGenomeBindings(params.slug);
  return NextResponse.json({ bindings });
}
```

### 6.2 — Criar endpoint para aplicar binding
- **Arquivo**: `app/api/squads/[slug]/genomes/apply/route.ts`
- **Tipo**: NOVO

```ts
import { NextResponse } from 'next/server';
import { applyGenomeBindingToSquad } from '@/lib/squads/genome-bindings';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const body = await request.json();

  const result = await applyGenomeBindingToSquad({
    squadSlug: params.slug,
    genomeSlug: body.genomeSlug,
    scope: body.scope ?? 'squad',
    executorSlug: body.executorSlug,
    mode: body.mode ?? 'persistent',
  });

  return NextResponse.json({ ok: true, result });
}
```

### 6.3 — Criar endpoint para remover binding
- **Arquivo**: `app/api/squads/[slug]/genomes/remove/route.ts`
- **Tipo**: NOVO

```ts
import { NextResponse } from 'next/server';
import { removeGenomeBindingFromSquad } from '@/lib/squads/genome-bindings';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const body = await request.json();

  await removeGenomeBindingFromSquad({
    squadSlug: params.slug,
    genomeSlug: body.genomeSlug,
    scope: body.scope ?? 'squad',
    executorSlug: body.executorSlug,
  });

  return NextResponse.json({ ok: true });
}
```

### 6.4 — Criar helper de bindings de genoma em squad
- **Arquivo**: `lib/squads/genome-bindings.ts`
- **Tipo**: NOVO

Responsabilidades:
- listar bindings da squad;
- aplicar binding sem duplicar;
- remover binding;
- refletir mudanças na persistência local;
- registrar auditoria no SQLite.

Interface sugerida:

```ts
export type ApplyGenomeBindingInput = {
  squadSlug: string;
  genomeSlug: string;
  scope: 'squad' | 'executor';
  executorSlug?: string;
  mode: 'persistent' | 'runtime-only';
};

export async function listSquadGenomeBindings(squadSlug: string) {
  return [];
}

export async function applyGenomeBindingToSquad(input: ApplyGenomeBindingInput) {
  return { changed: true };
}

export async function removeGenomeBindingFromSquad(input: {
  squadSlug: string;
  genomeSlug: string;
  scope: 'squad' | 'executor';
  executorSlug?: string;
}) {
  return { changed: true };
}
```

### 6.5 — Enriquecer a página de squads
- **Arquivo**: `app/squads/page.tsx`
- **Tipo**: EDITAR

Adicionar ao card/lista de squads:
- contagem de genomas;
- ação “Manage genomes”.

### 6.6 — Criar modal ou painel de binding
- **Arquivo**: `components/squads/manage-genomes-dialog.tsx`
- **Tipo**: NOVO

Funcionalidades:
- buscar genomas disponíveis;
- mostrar genomas já aplicados;
- escolher escopo `squad` ou `executor`;
- escolher executor quando necessário;
- aplicar/remover binding.

Estrutura sugerida:

```tsx
'use client';

export function ManageGenomesDialog({ squadSlug }: { squadSlug: string }) {
  return null;
}
```

Implementar com fetch para as rotas criadas acima e estado local simples.

### 6.7 — Criar componente de badges de genoma da squad
- **Arquivo**: `components/squads/squad-genome-badges.tsx`
- **Tipo**: NOVO

```tsx
export function SquadGenomeBadges({ bindings }: { bindings: Array<{ genomeSlug: string; scope: string }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {bindings.map((binding) => (
        <span key={`${binding.genomeSlug}:${binding.scope}`} className="rounded-full border px-2 py-1 text-xs">
          {binding.genomeSlug}
        </span>
      ))}
    </div>
  );
}
```

### 6.8 — Criar tabela de auditoria de operações de binding
- **Arquivo**: `lib/db/migrations/00xy_genome_binding_audit.sql`
- **Tipo**: NOVO

```sql
CREATE TABLE IF NOT EXISTS genome_binding_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_slug TEXT NOT NULL,
  genome_slug TEXT NOT NULL,
  executor_slug TEXT,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json TEXT
);
```

---

## Testes

### Teste do helper de binding
- **Arquivo**: `tests/lib/squads.genome-bindings.test.ts`
- **Tipo**: NOVO

Validar:
- aplica binding sem duplicar;
- remove binding corretamente;
- lista bindings de squad;
- suporta escopo `executor`.

### Teste de API de apply/remove
- **Arquivo**: `tests/api/squads.genomes.apply-remove.test.ts`
- **Tipo**: NOVO

Validar 200, payload mínimo e operações idempotentes.

---

## Validação manual
- [ ] Catálogo de squads continua abrindo.
- [ ] É possível abrir “Manage genomes”.
- [ ] É possível aplicar genoma no escopo de squad.
- [ ] É possível aplicar genoma no escopo de executor.
- [ ] É possível remover binding sem erro.
- [ ] Badges aparecem na squad após o binding.

## Checklist de conclusão
- [ ] APIs de list/apply/remove implementadas.
- [ ] Helper de bindings criado.
- [ ] UI de gerenciamento de genomas criada.
- [ ] Badges de genoma adicionadas à squad.
- [ ] Auditoria mínima persistida em SQLite.
- [ ] Testes cobrindo fluxo básico.

## Commit sugerido
```bash
feat(dashboard): add genome bindings management to squads
```
