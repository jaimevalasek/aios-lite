# Fase 08 — Testes de integração ponta a ponta

## Objetivo
Validar o fluxo completo do Genoma 2.0 entre `aios-lite` e `aios-lite-dashboard`, cobrindo criação, binding, visualização e compatibilidade sem regressões.

## Repo alvo
`aios-lite` e `aios-lite-dashboard`

## Pré-requisitos
- `00-MASTER.md`
- `01` até `07`

## Regra desta fase
**100% aditivo.** Não reestruturar a suíte atual; apenas adicionar testes e scripts de verificação.

## Escopo
- Testes do core do genoma.
- Testes do binding em squad.
- Testes do artisan para genoma.
- Testes do catálogo e bindings no dashboard.
- Testes do pipeline com badges de genoma.

## Fora de escopo
- Testes de browser complexos com múltiplos providers reais.
- Performance benchmarking.

## Impacto arquitetural
Essa fase consolida o contrato entre core e dashboard e reduz risco de regressão ao fechar o pacote.

## Risco de regressão
- Cobertura insuficiente em migração.
- Divergência entre formato salvo no core e formato esperado no dashboard.

---

## Entregáveis

### 8.1 — Criar matriz de cenários de teste
- **Arquivo**: `docs/testing/genome-2.0-matrix.md`
- **Tipo**: NOVO

Incluir cenários:
1. Genoma antigo é lido no core.
2. Genoma 2.0 é gerado e salvo.
3. Squad nova recebe genoma.
4. Squad existente recebe binding.
5. Artisan gera `Genome Brief`.
6. `/genomes` lista metadados.
7. `/squads` mostra bindings.
8. `/pipelines` mostra badges.
9. Dados antigos continuam válidos.

### 8.2 — Adicionar script de smoke test para o core
- **Arquivo**: `scripts/smoke/genome-2.0-smoke.js`
- **Tipo**: NOVO

O script deve:
- criar fixture temporária;
- validar leitura antiga;
- validar serialização nova;
- aplicar binding em squad fixture.

### 8.3 — Adicionar teste de integração de binding core ↔ dashboard
- **Arquivo**: `tests/integration/genome-binding-contract.test.ts`
- **Tipo**: NOVO

Validar que o formato persistido no core é interpretável pelo dashboard.

### 8.4 — Adicionar teste de API do Artisan para genome brief
- **Arquivo**: `tests/api/artisan.generate-genome-brief.test.ts`
- **Tipo**: NOVO

Validar:
- request mínima;
- response esperada;
- persistência/fallback.

### 8.5 — Adicionar teste de catálogo + bindings no dashboard
- **Arquivo**: `tests/integration/dashboard.genome-catalog-and-bindings.test.ts`
- **Tipo**: NOVO

Cobrir:
- `/genomes` lista itens;
- binding aparece em squad;
- pipeline enxerga badge via payload.

### 8.6 — Criar fixtures compartilhadas
- **Arquivo**: `tests/fixtures/genomes/` e `tests/fixtures/squads/`
- **Tipo**: NOVO

Criar pelo menos:
- `legacy-genome.md`
- `genome-2.0.md`
- `genome-2.0.meta.json`
- `squad-without-genome/`
- `squad-with-genome/`

### 8.7 — Adicionar checklist manual de regressão
- **Arquivo**: `docs/testing/genome-2.0-manual-regression.md`
- **Tipo**: NOVO

Checklist manual:
- criar genoma no core;
- aplicar em squad;
- abrir dashboard;
- inspecionar catálogo;
- inspecionar squad;
- abrir pipeline.

---

## Código base sugerido para um teste de contrato

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

test('genome binding contract remains readable by dashboard consumers', async () => {
  const persisted = {
    genomes: ['copywriting'],
    genomeBindings: [
      { genomeSlug: 'copywriting', scope: 'squad', mode: 'persistent' },
    ],
  };

  assert.equal(Array.isArray(persisted.genomeBindings), true);
  assert.equal(persisted.genomeBindings[0].genomeSlug, 'copywriting');
});
```

---

## Validação manual
- [ ] Todos os testes novos rodam localmente.
- [ ] Fixtures antigas e novas coexistem.
- [ ] O contrato de binding é estável.
- [ ] Dashboard interpreta o formato novo sem erro.
- [ ] Pipelines continuam abrindo.

## Checklist de conclusão
- [ ] Matriz de testes criada.
- [ ] Smoke test do core criado.
- [ ] Testes de contrato core ↔ dashboard criados.
- [ ] Fixtures compartilhadas criadas.
- [ ] Checklist manual de regressão criado.

## Commit sugerido
```bash
test(integration): add end-to-end coverage for genome 2.0 and dashboard bindings
```
