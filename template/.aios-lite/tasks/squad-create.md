# Task: Squad Create

> Fase de criação do lifecycle. Gera o pacote completo a partir de um blueprint.

## Quando usar
- `@squad create <slug>` — invocação direta
- Automaticamente após `@squad design` ser aprovado
- `@squad` fluxo rápido (após design inline ser aprovado)

## Entrada
- Blueprint em `.aios-lite/squads/.designs/<slug>.blueprint.json`
- Se não existe blueprint: instrua o usuário a rodar `@squad design <slug>` primeiro
- OU: se o usuário chamou `@squad` sem subcomando, rode design + create em sequência

## Processo

### Passo 1 — Ler blueprint
Leia `.aios-lite/squads/.designs/<slug>.blueprint.json` e valide que os campos obrigatórios existem (slug, name, problem, goal, mode, executors).

### Passo 2 — Criar estrutura de diretórios
```
.aios-lite/squads/<slug>/
├── agents/
│   ├── agents.md              # Manifesto textual
│   ├── orquestrador.md        # Orquestrador
│   └── <executor-slug>.md     # Um por executor
├── skills/
├── templates/
├── docs/
│   ├── design-doc.md
│   └── readiness.md
└── squad.manifest.json        # Manifesto JSON formal

output/<slug>/                  # Diretório de output
aios-logs/<slug>/               # Diretório de logs
media/<slug>/                   # Diretório de mídia
```

### Passo 3 — Gerar squad.manifest.json
Monte o manifesto a partir do blueprint. O JSON deve seguir o schema `squad-manifest.schema.json`. Copie executors, skills, mcps, genomes, contentBlueprints do blueprint. Adicione package paths e rules.

### Passo 4 — Gerar agents.md (manifesto textual)
Siga o formato existente no squad.md atual:
```markdown
# Squad <name>

## Mission
[do blueprint.mission]

## Does
[derivado do scope]

## Does not do
[derivado do outOfScope]

## Permanent executors
- @orquestrador — [role]
- @<slug> — [role]

## Squad skills
## Squad MCPs
## Subagent policy
## Outputs and review
```

### Passo 5 — Gerar cada executor
Para cada executor no blueprint, crie `.aios-lite/squads/<slug>/agents/<executor-slug>.md` seguindo o template atual do squad.md (seção "Step 2 — Generate each specialist agent"):
- Header com `# Agent @<slug>` + bloco ACTIVATED
- Mission, Quick context, Active genomes, Focus, Response standard, Hard constraints, Output contract

### Passo 6 — Gerar orquestrador
Crie `.aios-lite/squads/<slug>/agents/orquestrador.md` seguindo o template atual (seção "Step 3 — Generate the orchestrator").

### Passo 7 — Gerar docs
- `docs/design-doc.md`: resumo do design derivado do blueprint
- `docs/readiness.md`: estado de readiness derivado do blueprint

### Passo 8 — Registrar nos gateways
Atualize `CLAUDE.md` e `AGENTS.md` no root do projeto conforme as regras existentes no squad.md.

### Passo 9 — Salvar metadata
Salve `.aios-lite/squads/<slug>/squad.md` no formato existente.

### Passo 10 — Rodar validate
Após criar tudo, execute mentalmente a task squad-validate (leia `.aios-lite/tasks/squad-validate.md`) para verificar que o pacote está consistente.

### Passo 11 — Warm-up round
Siga as regras existentes no squad.md: mostre cada especialista com problem reading, initial recommendation, main risk, suggested next step.

## Saída
- Pacote completo em `.aios-lite/squads/<slug>/`
- CLAUDE.md e AGENTS.md atualizados
- Warm-up round executado

## Regras
- SEMPRE leia o blueprint antes de gerar
- SIGA os templates de executor e orquestrador do squad.md original
- MANTENHA o HTML deliverable após cada rodada (regra existente)
- NÃO pule o warm-up — é mandatório
