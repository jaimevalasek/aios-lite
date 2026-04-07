# Task: Squad Create

> Fase de criação do lifecycle. Gera o pacote completo a partir de um blueprint.

## Quando usar
- `@squad create <slug>` — invocação direta
- Automaticamente após `@squad design` ser aprovado
- `@squad` fluxo rápido (após design inline ser aprovado)

## Entrada
- Blueprint em `.aioson/squads/.designs/<slug>.blueprint.json`
- Se não existe blueprint: instrua o usuário a rodar `@squad design <slug>` primeiro
- OU: se o usuário chamou `@squad` sem subcomando, rode design + create em sequência

## Processo

### Passo 1 — Ler blueprint
Leia `.aioson/squads/.designs/<slug>.blueprint.json` e valide que os campos obrigatórios existem (slug, name, problem, goal, mode, executors).

### Passo 2 — Criar estrutura de diretórios
```
.aioson/squads/<slug>/
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
aioson-logs/<slug>/               # Diretório de logs
media/<slug>/                   # Diretório de mídia
```

### Passo 2.5 — Processar UI/UX capability do blueprint

Leia o campo `uiCapability` do blueprint. Se ausente, trate como `mode: none`.

**Se `mode = skills`:**
1. Copie `.aioson/skills/static/landing-page-forge.md` → `.aioson/squads/{slug}/skills/design/landing-page-forge.md`
2. Copie `.aioson/skills/static/ui-ux-modern.md` → `.aioson/squads/{slug}/skills/design/ui-ux-modern.md`
3. Se `design_skill` está em `project.context.md`, copie também esse skill para `skills/design/`
4. Registre as skills no `squad.manifest.json`

**Se `mode = executor`:**
1. Execute os mesmos passos de skills acima (executor depende das skills)
2. Gere o arquivo `.aioson/squads/{slug}/agents/ui-specialist.md` usando o template do agente `@ui-specialist` definido em `squad.md` (seção "Visual & UI capability detection → Option 2")
3. Registre o executor no `squad.manifest.json` com `modelTier: powerful` e `behavioralProfile: compliant-dominant`
4. Adicione ao routing guide do orquestrador: "Visual / UI / layout requests → @ui-specialist"

**Se `mode = external`:** Adicione nota em `docs/design-doc.md` indicando que `@ux-ui` é chamado externamente.

**Se `mode = none`:** Nenhuma ação.

Em todos os casos, salve `uiCapability` no `squad.manifest.json`.

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
Para cada executor no blueprint, crie `.aioson/squads/<slug>/agents/<executor-slug>.md` seguindo o template atual do squad.md (seção "Step 2 — Generate each specialist agent"):
- Header com `# Agent @<slug>` + bloco ACTIVATED
- Mission, Quick context, Active genomes, Focus, Response standard, Hard constraints, Output contract

### Passo 6 — Gerar orquestrador
Crie `.aioson/squads/<slug>/agents/orquestrador.md` seguindo o template atual (seção "Step 3 — Generate the orchestrator").

### Passo 7 — Gerar docs
- `docs/design-doc.md`: resumo do design derivado do blueprint
- `docs/readiness.md`: estado de readiness derivado do blueprint

### Passo 8 — Registrar nos gateways
Atualize `CLAUDE.md` e `AGENTS.md` no root do projeto conforme as regras existentes no squad.md.

### Passo 9 — Salvar metadata
Salve `.aioson/squads/<slug>/squad.md` no formato existente.

### Passo 10 — Rodar validate
Após criar tudo, execute mentalmente a task squad-validate (leia `.aioson/tasks/squad-validate.md`) para verificar que o pacote está consistente.

### Passo 11 — Warm-up round
Siga as regras existentes no squad.md: mostre cada especialista com problem reading, initial recommendation, main risk, suggested next step.

## Saída
- Pacote completo em `.aioson/squads/<slug>/`
- CLAUDE.md e AGENTS.md atualizados
- Warm-up round executado

## Regras
- SEMPRE leia o blueprint antes de gerar
- SIGA os templates de executor e orquestrador do squad.md original
- MANTENHA o HTML deliverable após cada rodada (regra existente)
- NÃO pule o warm-up — é mandatório
