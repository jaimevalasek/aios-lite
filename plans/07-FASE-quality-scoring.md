# Fase 7 — Squad Quality Scoring Avançado

> **Prioridade:** P2
> **Depende de:** Fase 2 (review loops) + Fase 4 (task decomposition)
> **Estimativa de arquivos:** 1 novo, 4 editados

## Conceito

Hoje o AIOSON tem um "coverage score" básico (5 checkboxes: executors typed, workflow defined, checklists present, tasks defined, workers present). Isso mede **completude**, não **qualidade**.

O que queremos é um scoring que mede:
1. **Completude** — o squad tem todos os componentes? (o que já existe)
2. **Profundidade** — os executores são rasos ou substantivos?
3. **Qualidade estrutural** — o squad segue as melhores práticas?
4. **Potencial de resultado** — o squad está preparado para produzir output excepcional?

### Filosofia: não medir para encher checkbox — medir para produzir resultados excepcionais

O score não é burocracia. É um indicador de que o squad está pronto para produzir output que é **melhor do que o LLM faria sozinho**. Se o score é baixo, significa que o squad não está agregando valor suficiente sobre pedir direto ao ChatGPT.

## O que é JS vs. LLM

**JS (100% deterministico — pode ser script):**
- Contagem de componentes (executors, tasks, workflows, checklists)
- Verificação de preenchimento de campos obrigatórios
- Cálculo de ratio (tasks per executor, criteria per checklist)
- Detecção de campos vazios ou placeholder
- Score final como número
- Comparação com benchmarks

**LLM (requer julgamento):**
- Avaliar se o conteúdo dos executores é substantivo ou raso
- Avaliar se as quality criteria são verificáveis ou vagas
- Avaliar se o squad tem coerência interna (executores se complementam)

**Decisão:** O scoring básico é 100% JS (deterministico, zero LLM, pode rodar no CI). O scoring avançado (qualidade do conteúdo) precisa de LLM e roda sob demanda via `@squad analyze`.

## Scoring System

### Dimensão 1: Completude (0-25 pontos) — JS

| Componente | Pontos | Critério |
|-----------|--------|----------|
| Executors tipados | 5 | Todos têm `type` explícito |
| Workflow definido | 5 | Pelo menos 1 workflow com 2+ phases |
| Checklists presentes | 3 | Pelo menos 1 checklist |
| Tasks decompostas | 5 | Pelo menos 1 executor com tasks |
| Workers presentes | 2 | Pelo menos 1 worker (zero LLM) |
| Investigation report | 3 | Squad tem investigação @orache |
| Model tiering | 2 | Todos executors têm modelTier |

### Dimensão 2: Profundidade (0-25 pontos) — JS

| Critério | Pontos | Medição |
|----------|--------|---------|
| Executor focus areas | 5 | Média de focus bullets por executor ≥ 3 |
| Task quality criteria | 5 | Média de criteria por task ≥ 3 |
| Veto conditions | 5 | Pelo menos 1 executor ou workflow phase com veto |
| Content blueprints | 5 | Pelo menos 1 blueprint com 3+ sections |
| Skills declaradas | 5 | Pelo menos 2 skills com description |

### Dimensão 3: Qualidade Estrutural (0-25 pontos) — JS

| Critério | Pontos | Medição |
|----------|--------|---------|
| Review loops | 5 | Pelo menos 1 workflow phase com review |
| Human gates | 5 | Pelo menos 1 human gate (ou justificativa de não necessidade) |
| Cross-squad awareness | 3 | Orchestrator menciona cross-squad |
| Output strategy definida | 4 | outputStrategy configurado (não default) |
| Genome bindings | 3 | Pelo menos 1 genome aplicado |
| Format references | 5 | Pelo menos 1 format para squads content-oriented |

### Dimensão 4: Potencial de Resultado (0-25 pontos) — Misto (JS + LLM)

| Critério | Pontos | Tipo | Medição |
|----------|--------|------|---------|
| Anti-pattern guards | 5 | JS | Veto conditions baseadas em anti-patterns do domínio |
| Domain vocabulary | 5 | JS | Investigation report tem D5 coberto |
| Structural patterns | 5 | JS | Content blueprints derivados de D7 |
| Executor coherence | 5 | LLM | Executores se complementam sem overlap |
| Output realism | 5 | LLM | Output examples são realistas e substantivos |

## Implementação: `squad-score.js`

```javascript
// Novo comando CLI: aioson squad:score <slug>
//
// Output:
// Squad: youtube-viral-scripts-ai
//
// ┌─────────────────────────┬────────┬─────┐
// │ Dimensão                │ Score  │ Max │
// ├─────────────────────────┼────────┼─────┤
// │ Completude              │ 20     │ 25  │
// │ Profundidade            │ 18     │ 25  │
// │ Qualidade Estrutural    │ 15     │ 25  │
// │ Potencial de Resultado  │ 10*    │ 25  │
// ├─────────────────────────┼────────┼─────┤
// │ TOTAL                   │ 63     │ 100 │
// └─────────────────────────┴────────┴─────┘
//
// * Dimensão 4 parcial (sem LLM assessment — use @squad analyze para score completo)
//
// Grade: B (Good)
// Missing for A: review loops, task decomposition, 1+ worker
//
// Quick wins:
// 1. Add review loop to "create-content" phase → +5 pts
// 2. Decompose copywriter into tasks → +5 pts
// 3. Add a format reference → +5 pts

// Grades:
// 90-100: S (Exceptional)
// 80-89:  A (Excellent)
// 70-79:  B (Good)
// 50-69:  C (Adequate)
// <50:    D (Needs work)
```

**Toda a Dimensão 1-3 e parte da Dimensão 4 são JS puro.** O score pode rodar sem LLM e ser usado em CI/CD ou pre-commit hooks.

## Integração com squad creation

### No `squad.md`, substituir a seção "Coverage score" atual por:

```markdown
**Quality score (show after classification validation):**

After creating the squad, run the quality scoring (read the logic from squad-score):

```
Squad quality score: {total}/100 — Grade: {grade}

Completude:              {n}/25
Profundidade:            {n}/25
Qualidade Estrutural:    {n}/25
Potencial de Resultado:  {n}/25 (JS-only, partial)

Quick wins for next grade:
1. {suggestion} → +{n} pts
2. {suggestion} → +{n} pts
```

If the score is below 50 (Grade D):
- Warn the user that the squad is minimal and may produce generic results
- Suggest the top 3 quick wins

If the score is above 80 (Grade A or S):
- Congratulate: "This squad is well-equipped to produce exceptional results."
```

## Integração com `squad-doctor.js`

Adicionar o quality score como um check no doctor:

```javascript
// Na seção de checks do squad-doctor:
// - Quality score: {N}/100 (Grade {grade})
// - If < 50: warning "Squad quality is minimal"
// - If < 30: error "Squad quality is critically low"
```

## Nova tabela SQLite

```sql
CREATE TABLE IF NOT EXISTS squad_scores (
  squad_slug TEXT NOT NULL,
  dimension TEXT NOT NULL,          -- completude | profundidade | qualidade | potencial
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  details_json TEXT,                -- breakdown of individual criteria
  scored_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (squad_slug, dimension, scored_at)
);
```

Isso permite rastrear a evolução do score ao longo do tempo (cada vez que o squad é atualizado).

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `src/commands/squad-score.js` | CRIAR | CLI para quality scoring (100% JS) |
| `tests/squad-score.test.js` | CRIAR | Testes do scoring |
| `template/.aioson/agents/squad.md` | EDITAR | Substituir coverage score por quality score |
| `src/commands/squad-doctor.js` | EDITAR | Incluir quality score como check |
| `src/runtime-store.js` | EDITAR | Tabela squad_scores |
| `src/cli.js` | EDITAR | Registrar comando squad:score |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
