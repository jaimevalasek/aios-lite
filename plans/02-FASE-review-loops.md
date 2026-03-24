# Fase 2 — Review Loops nas Workflows

> **Prioridade:** P0
> **Depende de:** Nada (paralelo com Fase 1)
> **Estimativa de arquivos:** 2 novos, 3 editados

## Conceito

Hoje as workflows do AIOSON são **one-shot**: cada fase executa, produz output, e passa adiante. Se o output não é bom o suficiente, o usuário tem que perceber e pedir manualmente uma reescrita.

O OpenSquad resolve isso com `on_reject: {step-id}` — o reviewer rejeita e o pipeline volta automaticamente ao step do criador com feedback específico. Máximo 2 retries.

O AIOSON já tem `humanGate` nas phases, mas falta:
1. **Review loops automáticos** — um executor reviewer avalia e pode rejeitar
2. **Retry com feedback** — rejeição volta ao executor com motivo específico
3. **Veto conditions** — condições hard que impedem output ruim de seguir
4. **Max retries** — trava para evitar loops infinitos

## O que é JS vs. LLM

**JS (deterministico):**
- Validação do schema (novos campos no manifest)
- Contagem de retries por fase (registrar no SQLite)
- Detecção de loop infinito (max retries exceeded)
- Status tracking da fase (pending → running → review → rejected → retry → accepted)

**LLM (requer inteligência):**
- O ato de revisar o output (julgar qualidade)
- Gerar feedback de rejeição (o que está errado e como corrigir)
- Avaliar veto conditions (interpretar se uma condição é violada)
- Decidir quando aceitar vs. pedir mais uma iteração

**Decisão de design:** O mecanismo de review loop é declarado no manifest JSON e orquestrado pelo LLM (o orchestrator lê as regras e as segue). O CLI pode validar que os loops estão bem configurados e registrar retry counts.

## Mudanças no schema

### `squad-manifest.schema.json` — Adicionar nas phases do workflow:

```json
{
  "id": "create-content",
  "title": "Create Content",
  "executor": "copywriter",
  "executorType": "agent",
  "dependsOn": ["research"],
  "output": "draft content",

  "review": {
    "reviewer": "editor",
    "criteria": [
      "Content matches the target audience tone",
      "All key points from research are addressed",
      "No factual claims without evidence"
    ],
    "onReject": "create-content",
    "maxRetries": 2,
    "retryStrategy": "feedback",
    "escalateOnMaxRetries": "human"
  },

  "vetoConditions": [
    {
      "condition": "Output contains placeholder text or TODO markers",
      "action": "block",
      "message": "Content has unfinished sections"
    },
    {
      "condition": "Output is less than 50% of expected length",
      "action": "reject",
      "message": "Content is too thin — needs more substance"
    }
  ]
}
```

### Novos campos no schema JSON:

```json
"review": {
  "type": "object",
  "properties": {
    "reviewer": {
      "type": "string",
      "description": "Executor slug that reviews this phase's output"
    },
    "criteria": {
      "type": "array",
      "items": { "type": "string" },
      "description": "What the reviewer checks"
    },
    "onReject": {
      "type": "string",
      "description": "Phase ID to return to on rejection"
    },
    "maxRetries": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5,
      "default": 2,
      "description": "Max rejection cycles before escalation"
    },
    "retryStrategy": {
      "type": "string",
      "enum": ["feedback", "fresh", "alternative"],
      "default": "feedback",
      "description": "feedback: send rejection reason back. fresh: restart from scratch. alternative: ask a different executor."
    },
    "escalateOnMaxRetries": {
      "type": "string",
      "enum": ["human", "skip", "fail"],
      "default": "human",
      "description": "What to do when maxRetries exceeded"
    }
  }
},
"vetoConditions": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["condition", "action"],
    "properties": {
      "condition": {
        "type": "string",
        "description": "Natural language condition to check"
      },
      "action": {
        "type": "string",
        "enum": ["reject", "block", "warn"],
        "description": "reject: auto-retry. block: stop pipeline. warn: continue with warning."
      },
      "message": {
        "type": "string",
        "description": "Message to show when condition is triggered"
      }
    }
  }
}
```

## Nova task: `squad-review.md`

```markdown
# Task: Squad Review Loop

> Protocolo de review loop dentro de uma workflow phase.

## Quando usar
- Automaticamente pelo @orquestrador quando uma phase tem `review` declarado
- O orquestrador NÃO precisa ser instruído — ele lê o manifest e segue

## Processo

### Passo 1 — Fase produz output
O executor da phase gera seu output normalmente.

### Passo 2 — Checar veto conditions
Antes do review, verificar se alguma veto condition é violada:
- Se `action: block` → parar pipeline, notificar usuário
- Se `action: reject` → auto-rejeitar sem review (economiza uma rodada)
- Se `action: warn` → continuar mas marcar warning

### Passo 3 — Invocar reviewer
O executor definido em `review.reviewer` avalia o output com base nos `criteria`.

O reviewer deve produzir:
```
## Review: {phase-title}

**Verdict:** accepted | rejected
**Score:** {0-10}

### Criteria evaluation
- ✓ {criteria 1}: {assessment}
- ✗ {criteria 2}: {assessment with specific feedback}
- ✓ {criteria 3}: {assessment}

### Feedback (if rejected)
{Specific, actionable feedback for the creator. Not vague — exact issues and suggestions.}

### Veto check
- {veto condition 1}: passed | triggered
```

### Passo 4 — Se aceito
Marcar phase como completed. Seguir para a próxima.

### Passo 5 — Se rejeitado
1. Incrementar retry counter
2. Se retry counter > maxRetries → escalate:
   - `human`: pausar e pedir decisão humana
   - `skip`: pular a fase com warning
   - `fail`: falhar o pipeline
3. Se ainda tem retries:
   - `feedback` strategy: enviar feedback do reviewer ao executor original
   - `fresh` strategy: re-executar sem contexto do attempt anterior
   - `alternative` strategy: pedir a um executor diferente (se disponível)
4. Voltar ao onReject phase ID

## Regras
- NUNCA permitir mais de maxRetries iterações (hard limit)
- SEMPRE incluir o feedback do reviewer no retry
- O reviewer NUNCA deve ser o mesmo executor que criou o output
- Registrar cada retry no log: attempt number, reason, feedback
```

## Mudanças no `squad.md`

### Adicionar na seção "Step 3b — Generate workflow":

```markdown
### Review loops (when quality matters)

For phases that produce critical output, add a review loop.
The reviewer is typically a different executor from the creator.

Decision tree for adding review:
- Is this a final deliverable? → add review
- Is this an intermediate artifact used internally? → skip review
- Is the domain high-stakes (legal, financial, medical)? → add review + veto conditions
- Is the squad running in a repeatable pipeline? → add review

When generating workflows, evaluate each phase and add `review` when appropriate.
Also add `vetoConditions` for phases where certain output qualities are non-negotiable.

Retry strategies:
- `feedback` (default): The reviewer's specific feedback is sent back to the creator.
  Best for creative work where direction matters.
- `fresh`: The creator starts from scratch without seeing the rejected attempt.
  Best when the first attempt went in a wrong direction entirely.
- `alternative`: A different executor (if available) takes over the task.
  Best when the original executor has a blind spot.
```

## Nova tabela SQLite

```sql
CREATE TABLE IF NOT EXISTS workflow_reviews (
  review_id TEXT PRIMARY KEY,
  squad_slug TEXT NOT NULL,
  workflow_slug TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  reviewer_slug TEXT NOT NULL,
  verdict TEXT NOT NULL,           -- accepted | rejected
  score REAL,
  feedback TEXT,
  veto_triggered TEXT,             -- NULL or veto condition message
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Validação no `squad-validate.js`

Adicionar checks na camada semântica:

1. Se uma phase tem `review.reviewer`, verificar que o reviewer executor existe no manifest
2. Se uma phase tem `review.onReject`, verificar que o phase ID alvo existe
3. Se `review.reviewer` == phase executor → warning (reviewer não deve ser o criador)
4. Se `vetoConditions` está vazio mas `review` existe → info (considerar adicionar vetos)

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `template/.aioson/tasks/squad-review.md` | CRIAR | Protocolo de review loop |
| `tests/squad-review-loops.test.js` | CRIAR | Testes de validação de review config |
| `template/.aioson/schemas/squad-manifest.schema.json` | EDITAR | Campos review e vetoConditions nas phases |
| `template/.aioson/agents/squad.md` | EDITAR | Seção review loops na geração de workflows |
| `src/commands/squad-validate.js` | EDITAR | Validação semântica dos review loops |
| `src/runtime-store.js` | EDITAR | Tabela workflow_reviews |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
