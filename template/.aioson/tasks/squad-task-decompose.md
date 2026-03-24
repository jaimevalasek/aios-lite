# Task: Squad Task Decomposition

> Guia de decomposição de executores em tasks granulares.

## Quando usar
- Durante `@squad create`, ao avaliar cada executor
- `@squad extend` quando o usuário pede task decomposition retroativa

## Formato de um task file

Salvar em `.aioson/squads/{squad-slug}/agents/{executor-slug}/tasks/{task-slug}.md`:

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
{Schema or description of expected output}

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

## Árvore de decisão

```
EXECUTOR
  ├── Faz UMA coisa bem? (reviewer, validator, formatter)
  │   └── SEM tasks — o agent file é suficiente
  │
  ├── Tem processo multi-step repetível?
  │   ├── 2 steps → provavelmente sem tasks (mantenha simples)
  │   ├── 3+ steps com outputs distintos → SIM, decompor em tasks
  │   └── 3+ steps internos → SEM tasks (steps no agent file)
  │
  ├── As tasks serão reutilizadas?
  │   └── SIM → decompor (reusabilidade)
  │
  └── Qualidade é crítica e cada step precisa de seus critérios?
      └── SIM → decompor (controle granular de qualidade)
```

## Regras
- Manter o agent file focado na identidade (missão, foco, restrições)
- Mover detalhes de processo para task files
- Cada task deve ser independentemente avaliável
- Tasks executam sequencialmente — output da task N é input da task N+1
- Adicionar quality criteria por task, não só por executor
