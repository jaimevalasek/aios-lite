# Fase 07 — Dashboard / Pipelines só para orquestração de squads

## Objetivo
Preservar `/pipelines` como editor de orquestração exclusivamente entre squads, exibindo genomas apenas como contexto visual e bindings dos nós, sem transformar genoma em nó executável.

## Repo alvo
`aios-lite-dashboard`

## Pré-requisitos
- `00-MASTER.md`
- `02-aios-lite-genoma-binding-squad.md`
- `05-dashboard-genomes-catalog.md`
- `06-dashboard-squad-genome-binding.md`

## Regra desta fase
**100% aditivo.** Não alterar o contrato atual de `pipeline_nodes` e `pipeline_edges` para incluir genoma como nó executável.

## Escopo
- Mostrar badges de genoma nos nós de squad.
- Exibir bindings no inspector da squad dentro do pipeline.
- Manter palette/canvas com squads apenas.
- Adicionar leitura opcional de bindings no payload do pipeline.

## Fora de escopo
- Arrastar genoma para o canvas como nó.
- Criar `pipeline_edges` envolvendo genomas.
- Runtime avançado de binding por pipeline.

## Impacto arquitetural
Esta fase consolida o conceito correto de pipeline no dashboard: squads executam, genomas qualificam a inteligência do nó.

## Risco de regressão
- Quebrar editor atual de pipelines.
- Mudar serialização de nodes/edges.
- Confundir o usuário com genoma como entidade executável no canvas.

---

## Entregáveis

### 7.1 — Enriquecer payload de nodes com bindings de genoma
- **Arquivo**: `app/api/pipelines/[slug]/route.ts`
- **Tipo**: EDITAR

Ao carregar o pipeline, enriquecer os nós com `genomeBindings` vindos das squads referenciadas.

Estrutura sugerida do payload do node:

```ts
{
  id: string,
  squadSlug: string,
  position: { x: number; y: number },
  data: {
    label: string,
    ports: [],
    genomeBindings: [
      { genomeSlug: 'copywriting', scope: 'squad' }
    ]
  }
}
```

### 7.2 — Criar componente visual de badge de genoma no node
- **Arquivo**: `components/pipelines/genome-node-badges.tsx`
- **Tipo**: NOVO

```tsx
export function GenomeNodeBadges({ bindings }: { bindings?: Array<{ genomeSlug: string }> }) {
  if (!bindings?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {bindings.slice(0, 4).map((binding) => (
        <span key={binding.genomeSlug} className="rounded-full border px-2 py-0.5 text-[10px]">
          {binding.genomeSlug}
        </span>
      ))}
    </div>
  );
}
```

### 7.3 — Enriquecer o renderer do node da squad
- **Arquivo**: componente atual de node em `components/pipelines/...`
- **Tipo**: EDITAR

Adicionar badges ao node sem mudar handles/ports.

### 7.4 — Adicionar seção “Genomes” no inspector do node
- **Arquivo**: `app/pipelines/[slug]/page.tsx` ou componente do inspector
- **Tipo**: EDITAR

Ao selecionar um node de squad, mostrar:
- genomas ativos;
- escopo do binding;
- link/ação rápida para “Manage genomes” da squad.

Exemplo de bloco:

```tsx
<section className="space-y-2">
  <h3 className="text-sm font-medium">Genomes</h3>
  {selectedNode?.data?.genomeBindings?.length ? (
    <ul className="space-y-1 text-sm">
      {selectedNode.data.genomeBindings.map((binding: any) => (
        <li key={`${binding.genomeSlug}:${binding.scope}`}>
          {binding.genomeSlug} · {binding.scope}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">No genomes bound to this squad.</p>
  )}
</section>
```

### 7.5 — Garantir que a palette continue trazendo apenas squads
- **Arquivo**: `app/pipelines/[slug]/page.tsx`
- **Tipo**: EDITAR

Adicionar comentário e validação explícita no código para evitar regressão conceitual:

```ts
// Pipeline canvas accepts executable squad nodes only.
// Genomes are displayed as contextual bindings of squad nodes.
```

### 7.6 — Adicionar resumo de genomas no card do pipeline
- **Arquivo**: `app/pipelines/page.tsx`
- **Tipo**: EDITAR

Mostrar no card/lista do pipeline:
- quantidade total de squads com genoma;
- quantidade total de bindings presentes no pipeline.

---

## Testes

### Teste do payload enriquecido do pipeline
- **Arquivo**: `tests/api/pipelines.route.genomes.test.ts`
- **Tipo**: NOVO

Validar que:
- nodes continuam sendo retornados;
- `genomeBindings` é opcional;
- pipelines antigos continuam válidos.

### Teste visual mínimo do node
- **Arquivo**: teste de componente, se houver infraestrutura; senão, checklist manual
- **Tipo**: NOVO ou manual

---

## Validação manual
- [ ] `/pipelines` continua listando pipelines.
- [ ] O editor abre sem erro.
- [ ] Nós continuam sendo apenas squads.
- [ ] Badges de genoma aparecem nos nós corretos.
- [ ] Inspector mostra bindings da squad selecionada.
- [ ] Nenhum fluxo atual de node/edge foi quebrado.

## Checklist de conclusão
- [ ] Payload do pipeline enriquecido com `genomeBindings`.
- [ ] Renderer do node mostra badges.
- [ ] Inspector mostra genomas do node.
- [ ] Listagem de pipelines mostra resumo de bindings.
- [ ] Testes cobrindo compatibilidade do payload.

## Commit sugerido
```bash
feat(dashboard): show genome bindings in squad pipelines without changing pipeline model
```
