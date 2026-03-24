# Fase 4 — Task Decomposition por Executor

> **Prioridade:** P1
> **Depende de:** Fase 1 ou 2 (qualquer uma)
> **Estimativa de arquivos:** 2 novos, 3 editados

## Conceito

No OpenSquad, cada agent pode ter `tasks/` decompostas — arquivos individuais com:
- Process (steps)
- Output format (schema)
- Output example (15+ lines)
- Quality criteria
- Veto conditions

Isso é poderoso porque:
1. Um executor com 3 tasks é muito mais previsível que um executor com um prompt genérico
2. Tasks podem ser executadas sequencialmente dentro de um step do pipeline
3. Cada task tem seus próprios quality criteria (não precisa ser genérico)
4. Tasks são reutilizáveis — um novo squad pode importar tasks de outro

O AIOSON já tem `tasks/` no nível do framework (squad-create, squad-design, etc.), mas NÃO tem tasks dentro de cada executor do squad.

## O que é JS vs. LLM

**JS (deterministico):**
- Validação de que executor tasks existem no filesystem
- Contagem de tasks por executor
- Verificação de sequência (order field)
- Registro de tasks no manifest

**LLM (requer inteligência):**
- Decidir quais tasks um executor precisa (durante squad creation)
- Gerar o conteúdo de cada task (process, examples, criteria)
- Executar tasks em sequência durante uma session

**O que pode virar script:** A execução sequencial de tasks pode ser parcialmente orquestrada via JS — o CLI lê o manifest, descobre as tasks do executor, e apresenta ao LLM uma de cada vez em ordem. Mas o conteúdo de cada task é LLM-only.

## Estrutura de tasks por executor

```
.aioson/squads/{squad-slug}/
├── agents/
│   ├── copywriter.md              # Agent file (identidade + references)
│   └── copywriter/
│       └── tasks/
│           ├── research-brief.md   # Task 1: absorver o brief
│           ├── draft-content.md    # Task 2: gerar o draft
│           └── optimize-hooks.md   # Task 3: otimizar hooks e CTA
```

### Task file format:

```markdown
# Task: {task-name}

> Order: {1, 2, 3...}
> Executor: @{executor-slug}
> Input: {what this task receives}
> Output: {what this task produces}

## Process
1. {Step 1 — concrete action}
2. {Step 2 — concrete action}
3. {Step 3 — concrete action}

## Output Format
```yaml
# Schema do output esperado
field_1: string       # description
field_2: list         # description
field_3: object       # description
```

## Output Example
{15+ lines of realistic output example}

## Quality Criteria
1. {Measurable criterion}
2. {Measurable criterion}
3. {Measurable criterion}

## Veto Conditions
1. {Hard block — output CANNOT have this}
2. {Hard block — output CANNOT have this}
```

## Mudanças no schema

### `squad-manifest.schema.json` — Adicionar ao executor:

```json
"tasks": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["slug", "title", "order"],
    "properties": {
      "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
      "title": { "type": "string" },
      "order": { "type": "integer", "minimum": 1 },
      "file": { "type": "string", "description": "Path to the task .md file" },
      "input": { "type": "string", "description": "What this task receives" },
      "output": { "type": "string", "description": "What this task produces" }
    }
  },
  "description": "Granular tasks within this executor, executed in order"
}
```

## Heurística para o `squad.md`

### Quando decompor um executor em tasks

```markdown
## Task decomposition (when an executor has a multi-step process)

Not every executor needs tasks. Use this decision tree:

```
EXECUTOR
  ├── Does it do ONE thing well? (reviewer, validator, formatter)
  │   └── NO tasks — the agent file is sufficient
  │
  ├── Does it have a repeatable multi-step process?
  │   ├── 2 steps → probably no tasks (keep it simple)
  │   ├── 3+ steps with distinct outputs → YES, decompose into tasks
  │   └── 3+ steps but all internal → NO tasks (steps go in the agent)
  │
  ├── Will the tasks be reused by other executors or squads?
  │   └── YES → decompose into tasks (reusability)
  │
  └── Is quality critical and each step needs its own criteria?
      └── YES → decompose into tasks (granular quality control)
```

When decomposing:
- Keep the agent file focused on identity (mission, focus, constraints)
- Move process details to task files
- Each task should be independently evaluable
- Tasks execute sequentially — output of task N is input of task N+1
- Add quality criteria per task, not just per executor

When generating a squad, evaluate each executor for task decomposition.
Show the decision in the classification:

```
Task decomposition review:
- copywriter → 3 tasks (research-brief → draft-content → optimize-hooks)
- researcher → no tasks (single-purpose: find and organize sources)
- orquestrador → no tasks (coordination is reactive, not sequential)
- editor → 2 tasks (structural-review → copy-edit)
```
```

## Quando tasks são auto-geradas

A decomposição acontece durante o `@squad create`:
- O @squad avalia cada executor
- Se o executor merece tasks, gera os arquivos
- Registra no manifest

A decomposição NÃO acontece retroativamente em squads existentes (a menos que o usuário peça via `@squad extend`).

## Mudanças na validação

No `squad-validate.js`:
1. Se executor tem `tasks` no manifest, verificar que os arquivos existem
2. Verificar que `order` é sequencial e sem gaps
3. Warning se um executor com 3+ focus bullets não tem tasks decompostas

## Coverage score update

Atualizar o coverage score (Step 5 do squad.md):

```
✓ Tasks defined         ({n} executors with {m} total tasks)
```

Threshold: pelo menos 1 executor com tasks = checkbox marcado.

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `template/.aioson/tasks/squad-task-decompose.md` | CRIAR | Guia de decomposição |
| `tests/squad-task-decomposition.test.js` | CRIAR | Validação de task files |
| `template/.aioson/schemas/squad-manifest.schema.json` | EDITAR | Campo tasks no executor |
| `template/.aioson/agents/squad.md` | EDITAR | Heurística de decomposição + coverage score |
| `src/commands/squad-validate.js` | EDITAR | Validação de task files |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
