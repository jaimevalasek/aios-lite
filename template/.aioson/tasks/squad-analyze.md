# Task: Squad Analyze

> Diagnostica um squad existente: cobertura, redundâncias, gaps, oportunidades.

## Quando usar
- `@squad analyze <slug>`
- Quando o usuário quer melhorar um squad existente

## Entrada
- slug do squad existente

## Processo

### Passo 1 — Inventário de componentes
Leia o squad.manifest.json e o filesystem real. Monte um inventário:
- Executores: quantos, quais, com/sem skills, com/sem genomes
- Skills: declaradas vs. instaladas em skills/
- Content blueprints: quantos, com/sem sections
- Templates: existem em templates/?
- Docs: design-doc.md existe? readiness.md existe?
- Output: há sessões HTML geradas?

### Passo 2 — Métricas de cobertura
Calcule:
- % de executores com skills declaradas
- % de executores com genomes
- % de content blueprints com sections completas
- % de docs presentes (design-doc, readiness)
- Consistency score: manifest vs filesystem (arquivos referenciados que existem)

### Passo 3 — Diagnóstico de problemas
Identifique:
- Sobreposição de responsabilidades entre executores (roles muito parecidos)
- Skills faltantes (executor sem nenhuma skill)
- Blueprints genéricos demais (sem sections ou com sections vazias)
- Readiness fraco (dimensões blocked ou partial)
- Excesso de complexidade (mais de 6 executores sem justificativa)
- Arquivos órfãos (existem no filesystem mas não no manifesto)
- Referências quebradas (no manifesto mas não no filesystem)

### Passo 4 — Sugestões priorizadas
Gere sugestões com prioridade (high/medium/low):
- high: referências quebradas, manifest inconsistente, executor sem role
- medium: skills faltantes, blueprints incompletos, docs ausentes
- low: readiness parcial, genomes não aplicados, output vazio

### Passo 5 — Relatório
Apresente com este formato:

```
═══ Squad Analysis: <slug> ═══

Overview
  Name: <name>  |  Mode: <mode>  |  Version: <version>

Components
  Executors:   <n> (<n> with skills, <n> with genomes)
  Skills:      <n> declared, <n> installed
  Blueprints:  <n> (<n> complete)
  Docs:        <status>

Coverage
  Skills:    ████░░░░░░ 40%
  Genomes:   ██████░░░░ 60%
  Docs:      ████████░░ 80%
  Manifest:  ██████████ 100%

Suggestions (<n>)
  🔴 <high priority item>
  🟡 <medium priority item>
  🟢 <low priority item>

Next: @squad extend <slug> to address suggestions
```

## Saída
- Relatório no chat
- Se --format markdown: salvar em .aioson/squads/<slug>/docs/ANALYSIS.md
- Se --format json: saída JSON parseable

## Regras
- NÃO modifique nada — apenas diagnostique e recomende
- SEMPRE sugira o próximo comando concreto para cada problema
