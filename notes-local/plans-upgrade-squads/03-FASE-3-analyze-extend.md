# Fase 3 — Analyze, Extend e Export (P2)

> **Objetivo:** Diagnóstico de squads existentes, extensão incremental, export portável
> **Pré-requisito:** Fase 2 completa (validação semântica, readiness, templates funcionando)

---

## Visão geral dos entregáveis

```
3.1  Task squad-analyze.md
3.2  Task squad-extend.md
3.3  Task squad-export.md
3.4  CLI squad-export.js
3.5  Integração analyze com dashboard (SQLite)
3.6  Testes
```

---

## 3.1 — Task `squad-analyze.md`

**Arquivo:** `template/.aios-lite/tasks/squad-analyze.md`

```markdown
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
- Se --format markdown: salvar em .aios-lite/squads/<slug>/docs/ANALYSIS.md
- Se --format json: saída JSON parseable

## Regras
- NÃO modifique nada — apenas diagnostique e recomende
- SEMPRE sugira o próximo comando concreto para cada problema
```

---

## 3.2 — Task `squad-extend.md`

**Arquivo:** `template/.aios-lite/tasks/squad-extend.md`

```markdown
# Task: Squad Extend

> Adiciona componentes a um squad existente sem reescrever o pacote.

## Quando usar
- `@squad extend <slug>` — modo interativo
- `@squad extend <slug> --add executor --name <name>` — modo direto
- Após `@squad analyze` recomendar adições

## Entrada
- slug do squad existente
- tipo do componente: executor | skill | template | blueprint | genome | mcp
- detalhes do componente (nome, role, etc.)

## Processo

### Passo 1 — Ler estado atual
Leia squad.manifest.json e inventarie o que já existe.

### Passo 2 — Se modo interativo, perguntar o que adicionar
```
O que deseja adicionar ao squad "<slug>"?
1. Executor — Novo agente especialista
2. Skill — Nova capacidade reutilizável
3. Content Blueprint — Novo tipo de deliverable
4. Genome — Aplicar genome existente
5. MCP — Nova integração externa
```

### Passo 3 — Coletar detalhes do componente
Dependendo do tipo:
- **Executor:** slug, title, role, focus areas, skills. Gerar o arquivo .md.
- **Skill:** slug, title, description. Criar em squads/<slug>/skills/
- **Content Blueprint:** slug, contentType, layoutType, sections.
- **Genome:** slug do genome, scope (squad ou executor específico).
- **MCP:** slug, required, purpose.

### Passo 4 — Mostrar diff antes de persistir
Antes de salvar, mostre exatamente o que será alterado:
```
Changes to apply:

  NEW FILE: .aios-lite/squads/<slug>/agents/<executor>.md
  UPDATED: .aios-lite/squads/<slug>/squad.manifest.json
    + executors[]: { slug: "<executor>", role: "...", file: "..." }
  UPDATED: .aios-lite/squads/<slug>/agents/agents.md
    + @<executor> — <role>
  UPDATED: CLAUDE.md
    + /<executor> -> .aios-lite/squads/<slug>/agents/<executor>.md
  UPDATED: AGENTS.md
    + @<executor> -> .aios-lite/squads/<slug>/agents/<executor>.md

Proceed? [Y/n]
```

### Passo 5 — Persistir alterações
- Criar arquivo(s) novo(s)
- Atualizar squad.manifest.json
- Atualizar agents.md
- Atualizar CLAUDE.md e AGENTS.md (se executor)

### Passo 6 — Validar
Rodar mentalmente a task squad-validate para confirmar que o pacote está consistente.

## Regras
- SEMPRE mostrar diff antes de persistir
- NUNCA deletar componentes existentes — extend é somente aditivo
- Para remoção, oriente o usuário a editar manualmente ou usar repair (Fase 4)
```

---

## 3.3 — Task `squad-export.md`

**Arquivo:** `template/.aios-lite/tasks/squad-export.md`

```markdown
# Task: Squad Export

> Empacota um squad para reutilização em outro projeto.

## Quando usar
- `@squad export <slug>`

## Processo

1. Validar o squad (rodar validate)
2. Se inválido: abortar com sugestão de correção
3. Coletar todos os arquivos do pacote:
   - .aios-lite/squads/<slug>/ (tudo)
   - NÃO incluir: output/, aios-logs/, media/ (são dados de sessão)
4. Gerar archive: `.aios-lite/squads/exports/<slug>.aios-squad.tar.gz`
5. Incluir um `import-instructions.md` no archive

## Saída
- Arquivo .tar.gz portável
- Instruções de import no chat
```

---

## 3.4 — CLI `squad-export.js`

**Arquivo:** `src/commands/squad-export.js`

Segue o padrão do squad-validate.js. Usa `node:child_process` com `tar` ou implementa com módulo `tar` se disponível. Na prática:

```javascript
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execSync } = require('node:child_process');

async function runSquadExport(projectDir, args, options = {}) {
  const logger = options.logger || console;
  const slug = args[0];

  if (!slug) {
    logger.error('Usage: aios-lite squad:export <slug>');
    return;
  }

  const squadDir = path.join(projectDir, '.aios-lite', 'squads', slug);
  const exportsDir = path.join(projectDir, '.aios-lite', 'squads', 'exports');
  const outputFile = path.join(exportsDir, `${slug}.aios-squad.tar.gz`);

  try {
    await fs.access(squadDir);
  } catch {
    logger.error(`Squad "${slug}" not found`);
    return;
  }

  await fs.mkdir(exportsDir, { recursive: true });

  const relPath = path.relative(projectDir, squadDir);
  execSync(`tar -czf "${outputFile}" -C "${projectDir}" "${relPath}"`, { stdio: 'pipe' });

  logger.log(`\n✅ Squad "${slug}" exported to: ${path.relative(projectDir, outputFile)}\n`);
}

module.exports = { runSquadExport };
```

Registre no `cli.js` como `squad:export` / `squad-export`.

---

## 3.5 — Integração analyze com SQLite/dashboard

Quando `squad-analyze` roda via CLI, salve o resultado no SQLite para o dashboard consumir.

**Arquivo:** `src/runtime-store.js` (adicionar)

Adicione uma tabela e função:

```javascript
// No createTables ou migration:
db.exec(`
  CREATE TABLE IF NOT EXISTS squad_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_slug TEXT NOT NULL,
    coverage_json TEXT,
    suggestions_json TEXT,
    metrics_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug)
  )
`);

function insertSquadAnalysis(db, options) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO squad_analyses (squad_slug, coverage_json, suggestions_json, metrics_json, created_at)
    VALUES (@squad_slug, @coverage_json, @suggestions_json, @metrics_json, @created_at)
  `).run({
    squad_slug: options.slug,
    coverage_json: JSON.stringify(options.coverage || {}),
    suggestions_json: JSON.stringify(options.suggestions || []),
    metrics_json: JSON.stringify(options.metrics || {}),
    created_at: now
  });
}
```

---

## 3.6 — Testes

**Arquivo:** `tests/squad-export.test.js`

```javascript
test('exports valid squad to tar.gz', async () => { /* create squad, export, verify file exists */ });
test('fails on nonexistent squad', async () => { /* ... */ });
```

Adicione testes de integração em `tests/squad-validate.test.js` para os novos checks semânticos.

---

## Checklist de conclusão da Fase 3

```
[ ] template/.aios-lite/tasks/squad-analyze.md criado
[ ] template/.aios-lite/tasks/squad-extend.md criado
[ ] template/.aios-lite/tasks/squad-export.md criado
[ ] src/commands/squad-export.js criado
[ ] src/cli.js atualizado com squad:export
[ ] src/runtime-store.js com tabela squad_analyses
[ ] squad.md atualizado com rotas analyze/extend/export
[ ] Testes passando
[ ] Commit: "feat(squad): implement lifecycle phase 3 — analyze, extend, export"
```

**Após completar:** Leia `04-FASE-4-repair-genomes.md`.
