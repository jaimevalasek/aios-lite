# Fase 1 — Fundamentos (P0)

> **Objetivo:** Implementar o eixo design → blueprint → create → validate
> **Estimativa:** Este é o bloco mais importante. Todo o restante depende dele.
> **Pré-requisito:** Nenhum (esta é a primeira fase)

> ⚠️ **IMPORTANTE:** Este plano é 100% aditivo. NÃO delete, mova ou renomeie nenhum arquivo existente. Crie apenas os arquivos novos indicados e edite os existentes ADICIONANDO conteúdo onde indicado. Leia o `00-MASTER.md` primeiro para a lista completa de regras de proteção.

---

## Visão geral dos entregáveis

```
1.1  Criar squad-manifest.schema.json
1.2  Criar squad-blueprint.schema.json
1.3  Criar task squad-design.md
1.4  Criar task squad-create.md
1.5  Criar task squad-validate.md
1.6  Criar comando CLI squad-validate.js
1.7  Refatorar squad.md como orquestrador do lifecycle
1.8  Registrar squad-validate no cli.js
1.9  Testes
```

---

## 1.1 — Criar `squad-manifest.schema.json`

**Arquivo:** `template/.aios-lite/schemas/squad-manifest.schema.json`

Este schema valida o `squad.manifest.json` que cada squad já gera. Baseado no formato que o `squad.md` atual já produz e que o `upsertSquadManifest` em `runtime-store.js` já consome.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aios-lite.dev/schemas/squad-manifest.schema.json",
  "title": "AIOS Lite Squad Manifest",
  "description": "Schema para squad.manifest.json",
  "type": "object",
  "required": ["schemaVersion", "slug", "name", "mode", "mission", "goal"],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Versão do schema (semver)"
    },
    "packageVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "slug": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]*[a-z0-9]$",
      "minLength": 2,
      "maxLength": 50,
      "description": "Identificador kebab-case do squad"
    },
    "name": {
      "type": "string",
      "maxLength": 100
    },
    "mode": {
      "type": "string",
      "enum": ["content", "software", "research", "mixed"],
      "description": "Tipo principal do squad"
    },
    "mission": { "type": "string", "maxLength": 500 },
    "goal": { "type": "string", "maxLength": 500 },
    "visibility": {
      "type": "string",
      "enum": ["private", "public"],
      "default": "private"
    },
    "aiosLiteCompatibility": { "type": "string" },
    "storagePolicy": {
      "type": "object",
      "properties": {
        "primary": { "type": "string", "enum": ["sqlite", "file"] },
        "artifacts": { "type": "string" },
        "exports": {
          "type": "object",
          "properties": {
            "html": { "type": "boolean" },
            "markdown": { "type": "boolean" },
            "json": { "type": "boolean" }
          }
        }
      }
    },
    "package": {
      "type": "object",
      "properties": {
        "rootDir": { "type": "string" },
        "agentsDir": { "type": "string" },
        "skillsDir": { "type": "string" },
        "templatesDir": { "type": "string" },
        "docsDir": { "type": "string" }
      }
    },
    "rules": {
      "type": "object",
      "properties": {
        "outputsDir": { "type": "string" },
        "logsDir": { "type": "string" },
        "mediaDir": { "type": "string" },
        "reviewPolicy": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "executors": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["slug", "role", "file"],
        "properties": {
          "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "title": { "type": "string" },
          "role": { "type": "string" },
          "file": { "type": "string" },
          "skills": { "type": "array", "items": { "type": "string" } },
          "genomes": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["slug"],
        "properties": {
          "slug": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "mcps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["slug"],
        "properties": {
          "slug": { "type": "string" },
          "required": { "type": "boolean" },
          "purpose": { "type": "string" }
        }
      }
    },
    "subagents": {
      "type": "object",
      "properties": {
        "allowed": { "type": "boolean" },
        "when": { "type": "array", "items": { "type": "string" } }
      }
    },
    "genomes": { "type": "array", "items": { "type": "object" } },
    "contentBlueprints": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["slug", "contentType", "layoutType"],
        "properties": {
          "slug": { "type": "string" },
          "contentType": { "type": "string" },
          "layoutType": {
            "type": "string",
            "enum": ["document", "tabs", "accordion", "stack", "mixed"]
          },
          "description": { "type": "string" },
          "sections": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["key", "label"],
              "properties": {
                "key": { "type": "string" },
                "label": { "type": "string" },
                "blockTypes": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  },
  "additionalProperties": true
}
```

**Ação:** Crie o diretório `template/.aios-lite/schemas/` e salve este arquivo.

Adicione o path `'.aios-lite/schemas/squad-manifest.schema.json'` ao array em `src/constants.js` para que o installer copie o schema.

---

## 1.2 — Criar `squad-blueprint.schema.json`

**Arquivo:** `template/.aios-lite/schemas/squad-blueprint.schema.json`

Este schema valida os blueprints intermediários gerados pela fase de design.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aios-lite.dev/schemas/squad-blueprint.schema.json",
  "title": "AIOS Lite Squad Blueprint",
  "description": "Schema para blueprints intermediários de design de squad",
  "type": "object",
  "required": ["id", "slug", "name", "problem", "goal", "mode"],
  "properties": {
    "id": { "type": "string", "description": "UUID do blueprint" },
    "slug": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]*[a-z0-9]$",
      "minLength": 2,
      "maxLength": 50
    },
    "name": { "type": "string", "maxLength": 100 },
    "problem": { "type": "string", "description": "Problema principal" },
    "goal": { "type": "string", "description": "Objetivo prático" },
    "scope": {
      "type": "array",
      "items": { "type": "string" },
      "description": "O que está dentro do escopo"
    },
    "outOfScope": {
      "type": "array",
      "items": { "type": "string" },
      "description": "O que está explicitamente fora"
    },
    "mode": {
      "type": "string",
      "enum": ["content", "software", "research", "mixed"]
    },
    "domain": { "type": "string" },
    "executors": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["slug", "role"],
        "properties": {
          "slug": { "type": "string" },
          "title": { "type": "string" },
          "role": { "type": "string" },
          "focus": { "type": "array", "items": { "type": "string" } },
          "skills": { "type": "array", "items": { "type": "string" } },
          "genomes": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "slug": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "source": { "type": "string", "enum": ["local", "inherited", "catalog"] }
        }
      }
    },
    "mcps": { "type": "array", "items": { "type": "object" } },
    "genomes": { "type": "array", "items": { "type": "object" } },
    "contentBlueprints": { "type": "array", "items": { "type": "object" } },
    "assumptions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Suposições feitas durante o design"
    },
    "risks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "probability": { "type": "string", "enum": ["low", "medium", "high"] },
          "impact": { "type": "string", "enum": ["low", "medium", "high"] },
          "mitigation": { "type": "string" }
        }
      }
    },
    "readiness": {
      "type": "object",
      "description": "Estado de prontidão (detalhado na Fase 2)"
    },
    "sourceDocs": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Score de confiança geral"
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "userAdjustments": { "type": "integer", "minimum": 0 }
  },
  "additionalProperties": true
}
```

**Ação:** Salve em `template/.aios-lite/schemas/squad-blueprint.schema.json`

Adicione ao array em `src/constants.js`.

---

## 1.3 — Criar task `squad-design.md`

**Arquivo:** `template/.aios-lite/tasks/squad-design.md`

Este arquivo é uma **task para o agente LLM** (não um script JS). Quando o `@squad` detecta que precisa rodar a fase de design, ele lê este arquivo e executa as instruções.

Crie o diretório `template/.aios-lite/tasks/` e o arquivo:

```markdown
# Task: Squad Design

> Fase de design do lifecycle do squad. Produz um blueprint intermediário.

## Quando usar
- `@squad design <nome>` — invocação direta
- `@squad` sem subcomando quando não existe blueprint para o slug

## Entrada
- Contexto do usuário: domínio, objetivo, constraints, roles desejados
- Opcional: documentação fonte (arquivos `.md`, texto colado, screenshots)
- Opcional: domínio hint para guiar a análise

## Processo

### Passo 1 — Coletar contexto mínimo
Pergunte em um bloco só (não faça múltiplas rodadas):
1. Domínio ou tópico do squad
2. Problema principal ou objetivo
3. Tipo de output esperado (artigos, scripts, código, análise, etc.)
4. Constraints (audiência, tom, nível técnico, idioma)
5. (opcional) Roles específicos desejados

Se o usuário já forneceu contexto suficiente (texto, docs, imagens), infira as respostas e siga em frente. Pergunte somente se há lacunas materiais.

### Passo 2 — Derivar design-doc mental
Antes de definir executores, consolide:
- Problema que está sendo resolvido
- Objetivo prático do squad
- Scope e out-of-scope
- Risks e assumptions
- Skills e docs que precisam entrar no contexto
- Mode do squad (content | software | research | mixed)

### Passo 3 — Definir executores
Determine 3-5 roles especializados. Para cada executor, defina:
- slug (kebab-case)
- title
- role (uma frase)
- focus (3-5 bullets)
- skills que vai usar
- genomes que herda

Inclua sempre um `orquestrador`.

### Passo 4 — Definir content blueprints
Se o squad é content-oriented, defina pelo menos 1 content blueprint com:
- slug, contentType, layoutType
- sections com key, label, blockTypes

### Passo 5 — Calcular readiness
Avalie cada dimensão:
- contextReady: há contexto suficiente?
- blueprintReady: o blueprint está completo?
- generationReady: dá para gerar os executores?

### Passo 6 — Gerar blueprint JSON
Salve o blueprint em `.aios-lite/squads/.designs/<slug>.blueprint.json`

O JSON deve seguir o schema `squad-blueprint.schema.json`.

Gere um UUID para o campo `id`. Use `new Date().toISOString()` para `createdAt`.

### Passo 7 — Apresentar resumo
Mostre ao usuário:
- Executores propostos com roles
- Content blueprints definidos
- Assumptions feitas
- Risks identificados
- Readiness status
- Confidence score

Pergunte se quer ajustar algo antes de criar.

## Saída
- Arquivo: `.aios-lite/squads/.designs/<slug>.blueprint.json`
- Resumo no chat para review do usuário

## Próximo passo
- Se aprovado: `@squad create <slug>` (que lê o blueprint e gera o pacote)
- Se precisa ajuste: o usuário indica e o design é atualizado

## Regras
- NÃO crie o pacote do squad aqui — isso é responsabilidade da task create
- NÃO pule o blueprint — ele é obrigatório
- MANTENHA o blueprint leve — o LLM preenche lacunas na fase create
```

---

## 1.4 — Criar task `squad-create.md`

**Arquivo:** `template/.aios-lite/tasks/squad-create.md`

```markdown
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
```

---

## 1.5 — Criar task `squad-validate.md`

**Arquivo:** `template/.aios-lite/tasks/squad-validate.md`

```markdown
# Task: Squad Validate

> Fase de validação do lifecycle. Verifica consistência do pacote.

## Quando usar
- `@squad validate <slug>` — invocação direta
- Automaticamente após `@squad create`
- Quando o CLI `aios-lite squad:validate <slug>` é executado

## Entrada
- slug do squad (deve existir em `.aios-lite/squads/<slug>/`)

## Processo

### Camada 1 — Validação de schema
1. Leia `.aios-lite/squads/<slug>/squad.manifest.json`
2. Valide contra `.aios-lite/schemas/squad-manifest.schema.json`
3. Campos obrigatórios: schemaVersion, slug, name, mode, mission, goal
4. Se falhar: ERRO com campo faltante e sugestão

### Camada 2 — Validação estrutural
Verifique que existem:
- `.aios-lite/squads/<slug>/squad.manifest.json` (obrigatório)
- `.aios-lite/squads/<slug>/agents/agents.md` (obrigatório)
- `.aios-lite/squads/<slug>/agents/orquestrador.md` (obrigatório)
- Para cada executor em manifest.executors: o arquivo referenciado existe
- Diretórios: `output/<slug>/`, `aios-logs/<slug>/`

### Camada 3 — Validação semântica (básica nesta fase, aprofundada na Fase 2)
- Slug do manifesto bate com o nome do diretório
- Executores no manifesto têm arquivo correspondente
- Não há executores duplicados

### Relatório
Classifique cada check como:
- ✅ PASS
- ⚠️ WARNING (não bloqueia, mas recomenda correção)
- ❌ ERROR (bloqueia — squad inválido)

Formato de output:
```
═══ Squad Validation: <slug> ═══

Schema:     ✅ PASS
Structure:  ✅ PASS (7/7 files found)
Semantics:  ⚠️ 1 warning
  - executor "analyst" has no skills declared

Result: VALID (1 warning)
```

## Saída
- Relatório de validação (console)
- Status: VALID | VALID_WITH_WARNINGS | INVALID

## Regras
- NÃO corrija problemas automaticamente — apenas reporte
- SUGIRA o comando de correção quando possível (ex: "run @squad extend to add skills")
```

---

## 1.6 — Criar comando CLI `squad-validate.js`

**Arquivo:** `src/commands/squad-validate.js`

Este é um comando CLI que executa validação programática. Segue os padrões do `squad-doctor.js` existente.

```javascript
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

async function pathExists(targetPath) {
  try { await fs.access(targetPath); return true; } catch { return false; }
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

function validateManifestFields(manifest) {
  const errors = [];
  const warnings = [];
  const required = ['schemaVersion', 'slug', 'name', 'mode', 'mission', 'goal'];

  for (const field of required) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (manifest.slug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(manifest.slug)) {
    errors.push(`Invalid slug format: "${manifest.slug}" (must be kebab-case)`);
  }

  if (manifest.mode && !['content', 'software', 'research', 'mixed'].includes(manifest.mode)) {
    warnings.push(`Unknown mode: "${manifest.mode}"`);
  }

  return { errors, warnings };
}

async function validateStructure(projectDir, slug, manifest) {
  const errors = [];
  const warnings = [];
  const squadDir = path.join(projectDir, '.aios-lite', 'squads', slug);

  const requiredFiles = [
    { rel: 'squad.manifest.json', label: 'Manifest' },
    { rel: 'agents/agents.md', label: 'Agents manifesto' },
    { rel: 'agents/orquestrador.md', label: 'Orchestrator agent' },
  ];

  for (const { rel, label } of requiredFiles) {
    if (!(await pathExists(path.join(squadDir, rel)))) {
      errors.push(`Missing required file: ${rel} (${label})`);
    }
  }

  // Check executor files
  const executors = Array.isArray(manifest.executors) ? manifest.executors : [];
  for (const exec of executors) {
    if (exec.file) {
      const absPath = path.join(projectDir, exec.file);
      if (!(await pathExists(absPath))) {
        errors.push(`Executor "${exec.slug}" file not found: ${exec.file}`);
      }
    }
  }

  // Check output dir (warning only)
  const outputDir = path.join(projectDir, 'output', slug);
  if (!(await pathExists(outputDir))) {
    warnings.push(`Output directory not found: output/${slug}/`);
  }

  return { errors, warnings };
}

async function validateSemantics(manifest) {
  const errors = [];
  const warnings = [];
  const executors = Array.isArray(manifest.executors) ? manifest.executors : [];

  // Check for duplicate slugs
  const slugs = executors.map(e => e.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length > 0) {
    errors.push(`Duplicate executor slugs: ${[...new Set(dupes)].join(', ')}`);
  }

  // Check executors without skills
  for (const exec of executors) {
    const skills = Array.isArray(exec.skills) ? exec.skills : [];
    if (skills.length === 0) {
      warnings.push(`Executor "${exec.slug}" has no skills declared`);
    }
  }

  return { errors, warnings };
}

async function runSquadValidate(projectDir, args, options = {}) {
  const logger = options.logger || console;
  const slug = args[0];

  if (!slug) {
    logger.error('Usage: aios-lite squad:validate <slug>');
    return { valid: false, errors: ['No slug provided'], warnings: [] };
  }

  const manifestPath = path.join(projectDir, '.aios-lite', 'squads', slug, 'squad.manifest.json');
  const manifest = await readJsonIfExists(manifestPath);

  if (!manifest) {
    logger.error(`Squad "${slug}" not found or invalid manifest at ${manifestPath}`);
    return { valid: false, errors: ['Manifest not found or invalid JSON'], warnings: [] };
  }

  const allErrors = [];
  const allWarnings = [];

  // Layer 1: Schema
  const schema = validateManifestFields(manifest);
  allErrors.push(...schema.errors);
  allWarnings.push(...schema.warnings);

  // Layer 2: Structure
  const structure = await validateStructure(projectDir, slug, manifest);
  allErrors.push(...structure.errors);
  allWarnings.push(...structure.warnings);

  // Layer 3: Semantics
  const semantics = await validateSemantics(manifest);
  allErrors.push(...semantics.errors);
  allWarnings.push(...semantics.warnings);

  // Report
  const valid = allErrors.length === 0;
  const status = valid
    ? (allWarnings.length > 0 ? 'VALID (with warnings)' : 'VALID')
    : 'INVALID';

  logger.log('');
  logger.log(`══ Squad Validation: ${slug} ══`);
  logger.log('');
  logger.log(`  Schema:     ${schema.errors.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
  logger.log(`  Structure:  ${structure.errors.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
  logger.log(`  Semantics:  ${semantics.errors.length === 0 ? (semantics.warnings.length > 0 ? '⚠️  WARNINGS' : '✅ PASS') : '❌ FAIL'}`);

  if (allErrors.length > 0) {
    logger.log('');
    logger.log('  Errors:');
    for (const err of allErrors) logger.log(`    ❌ ${err}`);
  }

  if (allWarnings.length > 0) {
    logger.log('');
    logger.log('  Warnings:');
    for (const warn of allWarnings) logger.log(`    ⚠️  ${warn}`);
  }

  logger.log('');
  logger.log(`  Result: ${status}`);
  logger.log('');

  return { valid, errors: allErrors, warnings: allWarnings, status };
}

module.exports = { runSquadValidate };
```

---

## 1.7 — Refatorar `squad.md` como orquestrador do lifecycle

**Arquivo:** `template/.aios-lite/agents/squad.md` (edição do existente)

O squad.md atual tem 760 linhas com tudo misturado. A refatoração transforma ele em um **orquestrador leve** que delega para as tasks.

> ⚠️ **CUIDADO:** Esta é uma EDIÇÃO do arquivo existente, NÃO uma reescrita. Mantenha todo o conteúdo atual e apenas ADICIONE a seção de routing. NÃO delete seções existentes — as tasks duplicam a lógica propositalmente para serem auto-contidas.

**Mudanças necessárias:**

1. **Manter intacto (NÃO ALTERAR):** Language detection, Mission, Parallel squads rule, Entry, Autonomy rule, Discovery and design-doc, Agent generation, Squad content items, Installed squad skills, Dashboard, HTML deliverable, Session facilitation, Hard constraints, Output contract — TUDO permanece como está.

2. **Apenas ADICIONAR:** Uma nova seção "Subcommand routing" logo após "## Entry" que permite ao usuário chamar operações individuais. O fluxo sem subcomando (comportamento atual) NÃO muda.

3. **Adicionar roteamento de subcomandos:**

Adicione uma nova seção após "## Entry":

```markdown
## Subcommand routing

If the user includes a subcommand, route to the corresponding task:

- `@squad design <slug>` → read and execute `.aios-lite/tasks/squad-design.md`
- `@squad create <slug>` → read and execute `.aios-lite/tasks/squad-create.md`
- `@squad validate <slug>` → read and execute `.aios-lite/tasks/squad-validate.md`
- `@squad analyze <slug>` → read and execute `.aios-lite/tasks/squad-analyze.md` (Fase 3)
- `@squad extend <slug>` → read and execute `.aios-lite/tasks/squad-extend.md` (Fase 3)
- `@squad repair <slug>` → read and execute `.aios-lite/tasks/squad-repair.md` (Fase 4)
- `@squad export <slug>` → read and execute `.aios-lite/tasks/squad-export.md` (Fase 3)

If no subcommand is given (just `@squad` or `@squad` with freeform text):
→ Run the full flow: design → create → validate in sequence.
→ This is the "fast path" — same behavior as today but now with a blueprint intermediary.
```

4. **Não quebrar o fluxo atual:** O `@squad` sem subcomando continua funcionando exatamente como hoje, mas agora gera um blueprint antes de criar o pacote.

---

## 1.8 — Registrar squad-validate no CLI

**Arquivo:** `src/cli.js` (edição)

Adicione seguindo o padrão existente de `squad:doctor` e `squad:status`:

1. No topo, adicione: `const { runSquadValidate } = require('./commands/squad-validate');`
2. Na lista de comandos conhecidos, adicione: `'squad:validate'`, `'squad-validate'`
3. Na função de help, adicione a linha de help
4. No switch/if de routing, adicione:
```javascript
} else if (command === 'squad:validate' || command === 'squad-validate') {
  await runSquadValidate(targetDir, positionalArgs, { logger, t, json: jsonOutput });
}
```

---

## 1.9 — Testes

**Arquivo:** `tests/squad-validate.test.js`

Crie testes seguindo o padrão de `tests/squad-doctor.test.js`:

```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runSquadValidate } = require('../src/commands/squad-validate');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-squad-validate-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

async function createValidSquad(dir, slug) {
  const squadDir = path.join(dir, '.aios-lite', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', slug), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0',
    packageVersion: '1.0.0',
    slug,
    name: 'Test Squad',
    mode: 'content',
    mission: 'Test mission',
    goal: 'Test goal',
    executors: [
      { slug: 'orquestrador', role: 'Coordinates', file: `.aios-lite/squads/${slug}/agents/orquestrador.md` },
      { slug: 'writer', role: 'Writes content', file: `.aios-lite/squads/${slug}/agents/writer.md`, skills: ['copywriting'] }
    ]
  };

  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad Test\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Agent @orquestrador\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'writer.md'), '# Agent @writer\n');
  return manifest;
}

test('validates a correct squad', async () => {
  const dir = await makeTempDir();
  await createValidSquad(dir, 'test-squad');
  const logger = createCollectLogger();
  const result = await runSquadValidate(dir, ['test-squad'], { logger });
  assert.ok(result.valid);
  assert.equal(result.errors.length, 0);
});

test('fails on missing manifest', async () => {
  const dir = await makeTempDir();
  const logger = createCollectLogger();
  const result = await runSquadValidate(dir, ['nonexistent'], { logger });
  assert.ok(!result.valid);
});

test('fails on missing required fields', async () => {
  const dir = await makeTempDir();
  const squadDir = path.join(dir, '.aios-lite', 'squads', 'bad');
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify({ slug: 'bad' }));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  const logger = createCollectLogger();
  const result = await runSquadValidate(dir, ['bad'], { logger });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('Missing required field')));
});

test('warns on executor without skills', async () => {
  const dir = await makeTempDir();
  await createValidSquad(dir, 'warn-squad');
  // orquestrador has no skills — should warn
  const logger = createCollectLogger();
  const result = await runSquadValidate(dir, ['warn-squad'], { logger });
  assert.ok(result.valid); // still valid
  assert.ok(result.warnings.length > 0);
});

test('fails on missing executor file', async () => {
  const dir = await makeTempDir();
  const squadDir = path.join(dir, '.aios-lite', 'squads', 'missing-exec');
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', 'missing-exec'), { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0', slug: 'missing-exec', name: 'Test',
    mode: 'content', mission: 'Test', goal: 'Test',
    executors: [
      { slug: 'orquestrador', role: 'Coord', file: `.aios-lite/squads/missing-exec/agents/orquestrador.md` },
      { slug: 'ghost', role: 'Missing', file: `.aios-lite/squads/missing-exec/agents/ghost.md` }
    ]
  };

  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Squad\n');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orch\n');
  // ghost.md NOT created
  const logger = createCollectLogger();
  const result = await runSquadValidate(dir, ['missing-exec'], { logger });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('ghost')));
});
```

Rode com `node --test tests/squad-validate.test.js`.

---

## Checklist de conclusão da Fase 1

```
[ ] template/.aios-lite/schemas/squad-manifest.schema.json criado
[ ] template/.aios-lite/schemas/squad-blueprint.schema.json criado
[ ] template/.aios-lite/tasks/squad-design.md criado
[ ] template/.aios-lite/tasks/squad-create.md criado
[ ] template/.aios-lite/tasks/squad-validate.md criado
[ ] src/commands/squad-validate.js criado
[ ] src/cli.js atualizado com squad:validate
[ ] src/constants.js atualizado com novos paths
[ ] template/.aios-lite/agents/squad.md refatorado com subcommand routing
[ ] tests/squad-validate.test.js criado e passando
[ ] Commit: "feat(squad): implement lifecycle phase 1 — schemas, tasks, validate"
```

**Após completar:** Leia `02-FASE-2-robustez.md` para a próxima fase.
