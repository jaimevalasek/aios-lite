# Fase 2 — Robustez e Templates (P1)

> **Objetivo:** Validação semântica profunda, readiness operacional, templates oficiais
> **Pré-requisito:** Fase 1 completa (schemas, tasks design/create/validate existem)

---

## Visão geral dos entregáveis

```
2.1  Readiness como objeto operacional (readiness.schema.json)
2.2  Content blueprint schema (content-blueprint.schema.json)
2.3  Validação semântica profunda no squad-validate.js
2.4  Template: content-basic
2.5  Template: research-analysis
2.6  Template: software-delivery
2.7  Template: media-channel
2.8  Integrar squad-doctor.js com validação formal
2.9  Atualizar locales (pt-BR) do squad.md
2.10 Testes
```

---

## 2.1 — Readiness Schema

**Arquivo:** `template/.aios-lite/schemas/readiness.schema.json`

Readiness é um objeto com 6 dimensões independentes. Cada dimensão tem status, reason, blocker, suggestedAction, owner e updatedAt.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AIOS Lite Readiness",
  "type": "object",
  "properties": {
    "contextReady": { "$ref": "#/$defs/dimension" },
    "blueprintReady": { "$ref": "#/$defs/dimension" },
    "generationReady": { "$ref": "#/$defs/dimension" },
    "validationReady": { "$ref": "#/$defs/dimension" },
    "integrationReady": { "$ref": "#/$defs/dimension" },
    "releaseReady": { "$ref": "#/$defs/dimension" }
  },
  "$defs": {
    "dimension": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["ready", "partial", "blocked"] },
        "reason": { "type": "string" },
        "blocker": { "type": "string" },
        "suggestedAction": { "type": "string" },
        "owner": { "type": "string" },
        "updatedAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

Adicione ao `src/constants.js`.

---

## 2.2 — Content Blueprint Schema

**Arquivo:** `template/.aios-lite/schemas/content-blueprint.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AIOS Lite Content Blueprint",
  "type": "object",
  "required": ["slug", "contentType", "layoutType"],
  "properties": {
    "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "contentType": { "type": "string" },
    "layoutType": { "type": "string", "enum": ["document", "tabs", "accordion", "stack", "mixed"] },
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
            "items": {
              "type": "string",
              "enum": ["hero", "section", "rich-text", "bullet-list", "numbered-list", "tags", "tabs", "accordion", "callout", "copy-block"]
            }
          }
        }
      }
    }
  }
}
```

---

## 2.3 — Validação semântica profunda

**Arquivo:** `src/commands/squad-validate.js` (editar o existente da Fase 1)

Adicione uma nova função `validateSemanticDeep` que faz os checks avançados:

```javascript
async function validateSemanticDeep(projectDir, slug, manifest) {
  const errors = [];
  const warnings = [];
  const squadDir = path.join(projectDir, '.aios-lite', 'squads', slug);

  // 1. Slug do manifesto bate com diretório
  if (manifest.slug !== slug) {
    errors.push(`Slug mismatch: manifest says "${manifest.slug}" but directory is "${slug}"`);
  }

  // 2. Skills referenciadas existem como arquivo ou estão declaradas
  const declaredSkills = Array.isArray(manifest.skills) ? manifest.skills.map(s => s.slug) : [];
  const executors = Array.isArray(manifest.executors) ? manifest.executors : [];
  for (const exec of executors) {
    const execSkills = Array.isArray(exec.skills) ? exec.skills : [];
    for (const skillSlug of execSkills) {
      if (!declaredSkills.includes(skillSlug)) {
        warnings.push(`Executor "${exec.slug}" references skill "${skillSlug}" not declared in manifest.skills`);
      }
    }
  }

  // 3. Content blueprints têm sections válidas
  const blueprints = Array.isArray(manifest.contentBlueprints) ? manifest.contentBlueprints : [];
  for (const bp of blueprints) {
    if (!bp.sections || bp.sections.length === 0) {
      warnings.push(`Content blueprint "${bp.slug}" has no sections defined`);
    }
  }

  // 4. CLAUDE.md e AGENTS.md mencionam o squad
  const claudeMd = path.join(projectDir, 'CLAUDE.md');
  const agentsMd = path.join(projectDir, 'AGENTS.md');
  try {
    const claudeContent = await fs.readFile(claudeMd, 'utf8');
    if (!claudeContent.includes(slug)) {
      warnings.push(`CLAUDE.md does not reference squad "${slug}"`);
    }
  } catch { warnings.push('CLAUDE.md not found'); }

  try {
    const agentsContent = await fs.readFile(agentsMd, 'utf8');
    if (!agentsContent.includes(slug)) {
      warnings.push(`AGENTS.md does not reference squad "${slug}"`);
    }
  } catch { warnings.push('AGENTS.md not found'); }

  // 5. Readiness não contradiz blockers
  if (manifest.readiness) {
    for (const [dim, val] of Object.entries(manifest.readiness)) {
      if (val && val.status === 'ready' && val.blocker) {
        warnings.push(`Readiness "${dim}" is "ready" but has blocker: "${val.blocker}"`);
      }
    }
  }

  return { errors, warnings };
}
```

Integre chamando `validateSemanticDeep` no fluxo principal de `runSquadValidate`. Adicione um layer "Semantic (deep)" no relatório.

---

## 2.4 a 2.7 — Templates oficiais

**Diretório:** `template/.aios-lite/templates/squads/`

Cada template é um diretório com um `template.json` e os arquivos base.

### Estrutura de cada template:
```
template/.aios-lite/templates/squads/<template-slug>/
├── template.json         # Metadata do template
├── blueprint.json        # Blueprint pré-preenchido
└── README.md             # Descrição do template
```

### 2.4 — Template `content-basic`

**Arquivo:** `template/.aios-lite/templates/squads/content-basic/template.json`
```json
{
  "slug": "content-basic",
  "name": "Content Basic",
  "description": "Squad genérico de conteúdo: artigos, scripts, copy, estratégia",
  "mode": "content",
  "suggestedExecutors": [
    { "slug": "writer", "role": "Creates written content, articles, scripts" },
    { "slug": "strategist", "role": "Defines content strategy, angles, positioning" },
    { "slug": "editor", "role": "Reviews, improves clarity, fact-checks" }
  ],
  "defaultContentBlueprint": {
    "slug": "content-piece",
    "contentType": "article",
    "layoutType": "document",
    "sections": [
      { "key": "main-content", "label": "Content", "blockTypes": ["rich-text"] },
      { "key": "summary", "label": "Summary", "blockTypes": ["rich-text"] },
      { "key": "tags", "label": "Tags", "blockTypes": ["tags"] }
    ]
  }
}
```

### 2.5 — Template `research-analysis`

**Arquivo:** `template/.aios-lite/templates/squads/research-analysis/template.json`
```json
{
  "slug": "research-analysis",
  "name": "Research & Analysis",
  "description": "Squad de pesquisa, benchmarks, relatórios e comparações",
  "mode": "research",
  "suggestedExecutors": [
    { "slug": "researcher", "role": "Gathers data, finds sources, maps landscape" },
    { "slug": "analyst", "role": "Interprets data, finds patterns, draws conclusions" },
    { "slug": "reviewer", "role": "Validates methodology, challenges assumptions" }
  ],
  "defaultContentBlueprint": {
    "slug": "research-report",
    "contentType": "report",
    "layoutType": "accordion",
    "sections": [
      { "key": "findings", "label": "Key Findings", "blockTypes": ["rich-text", "bullet-list"] },
      { "key": "methodology", "label": "Methodology", "blockTypes": ["rich-text"] },
      { "key": "data", "label": "Data & Sources", "blockTypes": ["bullet-list", "tags"] },
      { "key": "recommendations", "label": "Recommendations", "blockTypes": ["numbered-list"] }
    ]
  }
}
```

### 2.6 — Template `software-delivery`

```json
{
  "slug": "software-delivery",
  "name": "Software Delivery",
  "description": "Squad de desenvolvimento: features, arquitetura, QA",
  "mode": "software",
  "suggestedExecutors": [
    { "slug": "developer", "role": "Implements features, writes code" },
    { "slug": "architect", "role": "Designs system structure, makes technical decisions" },
    { "slug": "qa-engineer", "role": "Tests, validates, finds edge cases" }
  ],
  "defaultContentBlueprint": {
    "slug": "feature-delivery",
    "contentType": "feature",
    "layoutType": "tabs",
    "sections": [
      { "key": "spec", "label": "Specification", "blockTypes": ["rich-text"] },
      { "key": "implementation", "label": "Implementation", "blockTypes": ["rich-text", "copy-block"] },
      { "key": "tests", "label": "Test Plan", "blockTypes": ["bullet-list"] }
    ]
  }
}
```

### 2.7 — Template `media-channel`

```json
{
  "slug": "media-channel",
  "name": "Media Channel",
  "description": "Squad para canal de mídia: YouTube, podcast, newsletter, social",
  "mode": "content",
  "suggestedExecutors": [
    { "slug": "scriptwriter", "role": "Writes scripts, outlines, narratives" },
    { "slug": "title-generator", "role": "Creates titles, hooks, angles" },
    { "slug": "copywriter", "role": "Writes descriptions, CTAs, social copy" },
    { "slug": "trend-analyst", "role": "Researches trends, competitors, opportunities" }
  ],
  "defaultContentBlueprint": {
    "slug": "media-package",
    "contentType": "media-package",
    "layoutType": "tabs",
    "sections": [
      { "key": "script", "label": "Script/Outline", "blockTypes": ["rich-text"] },
      { "key": "titles", "label": "Title Options", "blockTypes": ["bullet-list"] },
      { "key": "description", "label": "Description", "blockTypes": ["rich-text"] },
      { "key": "tags", "label": "Tags & Keywords", "blockTypes": ["tags"] },
      { "key": "thumbnail", "label": "Thumbnail Brief", "blockTypes": ["rich-text"] }
    ]
  }
}
```

**Atualize a task `squad-design.md`** para oferecer templates como ponto de partida:
```markdown
### Passo 0 — Verificar templates disponíveis
Verifique se existe `.aios-lite/templates/squads/`. Se existir, liste os templates disponíveis e pergunte:
"Quer partir de um template? Opções: content-basic, research-analysis, software-delivery, media-channel — ou começar do zero."
Se o usuário escolher um template, leia o `template.json` e use como base para o blueprint.
```

---

## 2.8 — Integrar squad-doctor com validação formal

**Arquivo:** `src/commands/squad-doctor.js` (editar)

Ao final do diagnóstico existente, adicione uma chamada ao `runSquadValidate` para cada squad encontrado:

```javascript
const { runSquadValidate } = require('./squad-validate');

// No loop de squads do doctor:
// Após os checks existentes, adicione:
const validateResult = await runSquadValidate(projectDir, [slug], { logger: silentLogger });
if (!validateResult.valid) {
  // Adicione ao relatório do doctor
  findings.push({ slug, type: 'validation', errors: validateResult.errors, warnings: validateResult.warnings });
}
```

---

## 2.9 — Atualizar locales pt-BR

**Arquivo:** `template/.aios-lite/locales/pt-BR/agents/squad.md`

Aplique as mesmas mudanças do squad.md (seção de subcommand routing, referências às tasks). Mantenha o texto em português.

---

## 2.10 — Testes

Adicione ao `tests/squad-validate.test.js`:

```javascript
test('semantic deep - slug mismatch', async () => { /* ... */ });
test('semantic deep - unreferenced skill in executor', async () => { /* ... */ });
test('semantic deep - empty content blueprint sections', async () => { /* ... */ });
test('semantic deep - readiness contradiction', async () => { /* ... */ });
```

Crie `tests/squad-templates.test.js`:
```javascript
test('all template.json files are valid JSON', async () => { /* list templates dir, parse each */ });
test('all templates have required fields', async () => { /* check slug, name, mode, suggestedExecutors */ });
```

---

## Checklist de conclusão da Fase 2

```
[ ] template/.aios-lite/schemas/readiness.schema.json criado
[ ] template/.aios-lite/schemas/content-blueprint.schema.json criado
[ ] src/commands/squad-validate.js ampliado com validação semântica profunda
[ ] template/.aios-lite/templates/squads/content-basic/ criado
[ ] template/.aios-lite/templates/squads/research-analysis/ criado
[ ] template/.aios-lite/templates/squads/software-delivery/ criado
[ ] template/.aios-lite/templates/squads/media-channel/ criado
[ ] template/.aios-lite/tasks/squad-design.md atualizado com suporte a templates
[ ] src/commands/squad-doctor.js integrado com squad-validate
[ ] Locales pt-BR atualizados
[ ] Testes passando
[ ] Commit: "feat(squad): implement lifecycle phase 2 — readiness, templates, semantic validation"
```

**Após completar:** Leia `03-FASE-3-analyze-extend.md`.
