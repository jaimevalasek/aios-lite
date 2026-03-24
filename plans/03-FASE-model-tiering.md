# Fase 3 — Model Tiering por Executor

> **Prioridade:** P1
> **Depende de:** Fase 1 ou 2 (qualquer uma)
> **Estimativa de arquivos:** 0 novos, 4 editados

## Conceito

O OpenSquad atribui "tiers" de modelo (powerful/fast) a diferentes roles. Isso é inteligente porque:
- O orquestrador e o escritor precisam do melhor modelo (qualidade do output)
- O pesquisador pode usar um modelo rápido/barato (volume de busca)
- Workers determinísticos não usam LLM nenhum (custo zero)

O AIOSON já tem o campo `usesLLM: boolean` nos executors, mas não tem **tiering**. Vamos adicionar.

## O que é JS vs. LLM

**JS (deterministico):**
- Validação do schema (modelTier é um valor válido)
- Cálculo de custo estimado do squad por run (baseado em tier assignments)
- Exibição do custo estimado no `squad-status`

**LLM (requer inteligência):**
- Decisão de qual tier atribuir a cada executor (durante squad creation)
- A atribuição é feita pelo @squad no momento de gerar executores

**Script potencial (JS sem LLM):**
O cálculo de custo estimado é 100% deterministico e pode ser um utility:

```javascript
function estimateRunCost(manifest) {
  const tierCosts = {
    powerful: { inputPer1k: 0.015, outputPer1k: 0.075 },
    balanced: { inputPer1k: 0.003, outputPer1k: 0.015 },
    fast: { inputPer1k: 0.0008, outputPer1k: 0.004 },
    none: { inputPer1k: 0, outputPer1k: 0 }
  };

  return manifest.executors.reduce((total, ex) => {
    const tier = ex.modelTier || (ex.usesLLM === false ? 'none' : 'balanced');
    const cost = tierCosts[tier];
    // Estimate ~2k input + ~1k output tokens per executor per run
    return total + (cost.inputPer1k * 2) + (cost.outputPer1k * 1);
  }, 0);
}
```

## Mudanças no schema

### `squad-manifest.schema.json` — Adicionar ao executor:

```json
"modelTier": {
  "type": "string",
  "enum": ["powerful", "balanced", "fast", "none"],
  "default": "balanced",
  "description": "Model tier for this executor. powerful: best model (Opus/o3). balanced: good model (Sonnet/GPT-4o). fast: cheap model (Haiku/Flash). none: no LLM (workers)."
}
```

### Heurística de atribuição para o `squad.md`:

```markdown
## Model tiering (mandatory for every executor)

Assign a modelTier to each executor using this decision tree:

```
EXECUTOR
  ├── usesLLM: false (worker, deterministic)
  │   └── tier: none (zero cost)
  │
  ├── Role is creative/generative (writer, copywriter, scriptwriter, designer)
  │   └── tier: powerful (quality is the product)
  │
  ├── Role is orchestration/synthesis (orquestrador, reviewer, editor)
  │   └── tier: powerful (judgment quality matters)
  │
  ├── Role is research/analysis (researcher, analyst, data-gatherer)
  │   └── tier: fast (volume > depth per query)
  │
  ├── Role is formatting/structuring (formatter, template-filler, publisher)
  │   └── tier: fast (mostly mechanical)
  │
  └── Other or mixed
      └── tier: balanced (default)
```

Show the tier assignment in the executor classification validation:

```
Executor classification review:
- copywriter → type: agent, tier: powerful ✓ (creative output, quality critical)
- researcher → type: agent, tier: fast ✓ (search volume, not depth)
- formatter → type: worker, tier: none ✓ (deterministic, no LLM)
- orquestrador → type: agent, tier: powerful ✓ (synthesis and judgment)

Estimated cost per run: ~$0.18 (vs. ~$0.45 if all powerful)
Savings: 60%
```
```

### `squad-blueprint.schema.json` — Adicionar ao executor:

```json
"modelTier": {
  "type": "string",
  "enum": ["powerful", "balanced", "fast", "none"]
}
```

## Mudanças no `squad-status.js`

Adicionar ao output do `squad-status`:
- `Model tiers:` — lista de executors com seus tiers
- `Estimated cost/run:` — custo estimado

## Mudanças na validação

No `squad-validate.js`, adicionar check semântico:
- Se `usesLLM: false` mas `modelTier != "none"` → warning
- Se `type: "worker"` mas `modelTier != "none"` → warning
- Se nenhum executor tem tier atribuído → info (considerar adicionar)

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `template/.aioson/schemas/squad-manifest.schema.json` | EDITAR | Campo modelTier no executor |
| `template/.aioson/schemas/squad-blueprint.schema.json` | EDITAR | Campo modelTier no executor |
| `template/.aioson/agents/squad.md` | EDITAR | Seção model tiering + heurística |
| `src/commands/squad-validate.js` | EDITAR | Checks de consistência tier vs type |
| `src/commands/squad-status.js` | EDITAR | Exibir tiers e custo estimado |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
