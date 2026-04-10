# Fase 03 — AIOS Lite / Migração e Compatibilidade do Genoma 2.0

## Objetivo
Introduzir uma camada de compatibilidade e migração progressiva para que squads, genomas e bindings antigos continuem funcionando enquanto o formato Genoma 2.0 é adotado no `aios-lite`.

## Repo alvo
`aios-lite`

## Pré-requisitos
- `01-aios-lite-genoma-core.md`
- `02-aios-lite-genoma-binding-squad.md`

## Regra desta fase
**100% aditivo. NÃO deletar nada.**

Esta fase não deve remover suporte ao formato antigo de genoma, nem exigir migração em massa para o sistema continuar funcionando.

## Escopo
Esta fase cobre:
- leitura tolerante de genomas antigos e novos;
- migração progressiva “read old, write new when requested”;
- normalização de bindings antigos em squads;
- comandos utilitários leves para validação, inspeção e repair;
- testes de retrocompatibilidade.

## Fora de escopo
- mudar a UX do dashboard;
- criar fluxos visuais de binding;
- refatorar pipeline/orquestração;
- migrar automaticamente todo o workspace sem confirmação explícita.

## Impacto arquitetural
Esta fase consolida a estratégia de rollout seguro do Genoma 2.0:
- **leitura:** o sistema aceita formatos antigos e novos;
- **escrita:** o sistema escreve formato novo quando o fluxo já estiver no caminho Genoma 2.0;
- **repair:** o sistema oferece ferramentas para detectar e corrigir inconsistências de forma explícita;
- **bindings:** squads antigas continuam legíveis mesmo sem `genomeBindings` completos.

## Invariantes que devem continuar verdadeiros
- squads sem genoma continuam válidas;
- squads com `genomes` simples continuam funcionando;
- genomas antigos em `.aios-lite/genomas/*.md` continuam legíveis;
- `@squad` e `@genoma` continuam disponíveis com seus nomes atuais;
- o CLI não passa a exigir migração antes de operar.

## Risco de regressão
Os principais riscos são:
1. normalização agressiva quebrar genomas antigos;
2. manifestos de squads antigas serem reescritos de forma incorreta;
3. comandos novos alterarem arquivos sem backup;
4. parser novo falhar com markdown parcialmente fora do padrão.

Mitigações exigidas nesta fase:
- parser defensivo;
- backup opcional em operações de repair/migrate;
- modo dry-run por padrão nos comandos destrutivos;
- testes com fixtures antigas e híbridas.

---

# Entregáveis

## 3.1 Criar utilitário central de compatibilidade de genoma
- **Arquivo:** `src/lib/genomes/compat.js`
- **Tipo:** NOVO

### Implementação
```js
import { parseGenomeMarkdown, serializeGenomeMarkdown } from './format.js';
import {
  normalizeGenomeDocument,
  normalizeGenomeBinding,
  normalizeGenomeBindings,
} from './normalize.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function legacyToGenomeV2(parsed, filePath = null) {
  const frontmatter = isObject(parsed.frontmatter) ? parsed.frontmatter : {};
  const sections = isObject(parsed.sections) ? parsed.sections : {};

  return normalizeGenomeDocument(
    {
      schemaVersion: '2.0',
      slug: frontmatter.slug || frontmatter.genome || parsed.slug || '',
      title: frontmatter.title || frontmatter.genome || parsed.slug || 'Untitled Genome',
      type: frontmatter.type || 'domain',
      language: frontmatter.language || 'pt-BR',
      depth: frontmatter.depth || 'standard',
      evidenceMode: frontmatter.evidence_mode || frontmatter.evidenceMode || 'inferred',
      generatedAt: frontmatter.generated || frontmatter.generatedAt || null,
      updatedAt: frontmatter.updated || frontmatter.updatedAt || null,
      source: {
        mode: 'legacy',
        filePath,
        migratedFrom: '1.x',
      },
      knowledge: {
        whatToKnow: sections['O que saber'] || sections['Conhecimentos centrais'] || [],
        philosophies: sections['Filosofias'] || [],
        mentalModels: sections['Modelos mentais'] || [],
        heuristics: sections['Heurísticas'] || [],
        frameworks: sections['Frameworks'] || [],
        methodologies: sections['Metodologias'] || [],
      },
      minds: sections['Mentes'] || [],
      skills: sections['Skills'] || [],
      evidence: sections['Evidence'] || sections['Evidências'] || [],
      applicationNotes:
        sections['Application notes'] || sections['Notas de aplicação'] || [],
      blindSpots: sections['Blind spots'] || sections['Blindspots'] || [],
      tags: frontmatter.tags || [],
      legacy: {
        frontmatter,
        rawSections: sections,
      },
    },
    { source: filePath ? `legacy:${filePath}` : 'legacy:unknown' },
  );
}

export function detectGenomeFormat(input) {
  if (!input) return 'unknown';

  if (typeof input === 'string') {
    const parsed = parseGenomeMarkdown(input);
    const frontmatter = parsed.frontmatter || {};
    if (frontmatter.schemaVersion === '2.0') return 'v2-markdown';
    if (frontmatter.genome || frontmatter.slug || Object.keys(parsed.sections || {}).length) {
      return 'legacy-markdown';
    }
    return 'unknown';
  }

  if (isObject(input)) {
    if (input.schemaVersion === '2.0') return 'v2-object';
    if (input.genome || input.slug || input.minds || input.skills) return 'legacy-object';
  }

  return 'unknown';
}

export function loadCompatibleGenome(input, options = {}) {
  const format = detectGenomeFormat(input);

  if (format === 'v2-markdown') {
    const parsed = parseGenomeMarkdown(input);
    return {
      format,
      document: normalizeGenomeDocument(parsed.document || {}, options),
      migrated: false,
    };
  }

  if (format === 'legacy-markdown') {
    const parsed = parseGenomeMarkdown(input);
    return {
      format,
      document: legacyToGenomeV2(parsed, options.filePath || null),
      migrated: true,
    };
  }

  if (format === 'v2-object') {
    return {
      format,
      document: normalizeGenomeDocument(input, options),
      migrated: false,
    };
  }

  if (format === 'legacy-object') {
    return {
      format,
      document: legacyToGenomeV2({ frontmatter: input, sections: input.sections || {} }, options.filePath || null),
      migrated: true,
    };
  }

  throw new Error('Unsupported genome format.');
}

export function serializeCompatibleGenome(document, options = {}) {
  const normalized = normalizeGenomeDocument(document, options);
  return serializeGenomeMarkdown(normalized, options);
}

export function normalizeCompatibleBindings(bindings = [], options = {}) {
  return normalizeGenomeBindings(bindings, options);
}

export function normalizeLegacySquadGenomes(manifest = {}) {
  const squadLevel = Array.isArray(manifest.genomes) ? manifest.genomes : [];
  const bindings = Array.isArray(manifest.genomeBindings) ? manifest.genomeBindings : [];

  const migratedSquadBindings = squadLevel.map((slug) =>
    normalizeGenomeBinding({
      genomeSlug: slug,
      scope: 'squad',
      targetType: 'squad',
      targetId: manifest.slug || 'unknown-squad',
      mode: 'persistent',
      source: 'legacy-manifest.genomes',
    }),
  );

  const normalizedBindings = normalizeGenomeBindings([
    ...bindings,
    ...migratedSquadBindings,
  ]);

  return {
    ...manifest,
    genomeBindings: normalizedBindings,
  };
}
```

### Observações
- Este arquivo deve ser o ponto central de leitura tolerante.
- Não remover os campos antigos do manifesto nesta fase.

---

## 3.2 Adicionar migrador explícito de genomas de arquivo
- **Arquivo:** `src/lib/genomes/migrate.js`
- **Tipo:** NOVO

### Implementação
```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadCompatibleGenome, serializeCompatibleGenome } from './compat.js';

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function migrateGenomeFile(filePath, options = {}) {
  const {
    dryRun = true,
    write = false,
    backup = true,
    backupDir = null,
  } = options;

  const raw = await fs.readFile(filePath, 'utf8');
  const loaded = loadCompatibleGenome(raw, { filePath });

  const result = {
    filePath,
    detectedFormat: loaded.format,
    migrated: loaded.migrated,
    changed: loaded.migrated,
    output: serializeCompatibleGenome(loaded.document, { filePath }),
    backupPath: null,
  };

  if (!write || dryRun || !result.changed) {
    return result;
  }

  if (backup) {
    const targetBackupDir = backupDir || path.join(path.dirname(filePath), '.backup');
    await ensureDir(targetBackupDir);
    const backupPath = path.join(targetBackupDir, `${path.basename(filePath)}.bak`);
    await fs.writeFile(backupPath, raw, 'utf8');
    result.backupPath = backupPath;
  }

  await fs.writeFile(filePath, result.output, 'utf8');
  return result;
}

export async function migrateGenomeDirectory(dirPath, options = {}) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;

    const filePath = path.join(dirPath, entry.name);
    const result = await migrateGenomeFile(filePath, options);
    results.push(result);
  }

  return {
    directory: dirPath,
    total: results.length,
    changed: results.filter((item) => item.changed).length,
    results,
  };
}

export async function migrateIfLegacyGenome(filePath, options = {}) {
  if (!(await fileExists(filePath))) {
    throw new Error(`Genome file not found: ${filePath}`);
  }
  return migrateGenomeFile(filePath, options);
}
```

### Observações
- `dryRun` deve ser o padrão.
- Backups são obrigatórios quando houver escrita.

---

## 3.3 Adicionar repair utilitário para bindings de squads
- **Arquivo:** `src/lib/squads/genome-repair.js`
- **Tipo:** NOVO

### Implementação
```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeLegacySquadGenomes } from '../genomes/compat.js';

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function repairSquadManifestGenomeBindings(manifestPath, options = {}) {
  const { dryRun = true, write = false, backup = true } = options;
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  const repaired = normalizeLegacySquadGenomes(manifest);
  const changed = JSON.stringify(manifest) !== JSON.stringify(repaired);

  const result = {
    manifestPath,
    changed,
    before: manifest,
    after: repaired,
    backupPath: null,
  };

  if (!changed || dryRun || !write) {
    return result;
  }

  if (backup) {
    const backupDir = path.join(path.dirname(manifestPath), '.backup');
    await ensureDir(backupDir);
    const backupPath = path.join(backupDir, `${path.basename(manifestPath)}.bak`);
    await fs.writeFile(backupPath, raw, 'utf8');
    result.backupPath = backupPath;
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(repaired, null, 2)}\n`, 'utf8');
  return result;
}
```

### Observações
- Este utilitário é focado em squads já existentes.
- Não deve remover `manifest.genomes` antigos nesta fase.

---

## 3.4 Expor comandos leves de diagnose/migrate/repair no CLI
- **Arquivo:** `src/cli.js`
- **Tipo:** EDITAR

### Implementação
Adicionar os imports necessários no topo do arquivo, seguindo o padrão existente do CLI:

```js
import { migrateGenomeDirectory, migrateGenomeFile } from './lib/genomes/migrate.js';
import { repairSquadManifestGenomeBindings } from './lib/squads/genome-repair.js';
import { loadCompatibleGenome } from './lib/genomes/compat.js';
import fs from 'node:fs/promises';
```

Adicionar helpers novos próximos aos demais utilitários do CLI:

```js
function readFlag(args, flagName) {
  return args.includes(flagName);
}

function readOption(args, optionName, fallback = null) {
  const index = args.indexOf(optionName);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

async function handleGenomeDoctor(args) {
  const target = args[0];
  if (!target) {
    throw new Error('Usage: aios-lite genome:doctor <file>');
  }

  const raw = await fs.readFile(target, 'utf8');
  const loaded = loadCompatibleGenome(raw, { filePath: target });

  console.log(JSON.stringify({
    file: target,
    detectedFormat: loaded.format,
    migrated: loaded.migrated,
    slug: loaded.document.slug,
    type: loaded.document.type,
    depth: loaded.document.depth,
    evidenceMode: loaded.document.evidenceMode,
  }, null, 2));
}

async function handleGenomeMigrate(args) {
  const target = args[0];
  if (!target) {
    throw new Error('Usage: aios-lite genome:migrate <file-or-dir> [--write] [--no-backup]');
  }

  const write = readFlag(args, '--write');
  const backup = !readFlag(args, '--no-backup');
  const stat = await fs.stat(target);

  const result = stat.isDirectory()
    ? await migrateGenomeDirectory(target, { dryRun: !write, write, backup })
    : await migrateGenomeFile(target, { dryRun: !write, write, backup });

  console.log(JSON.stringify(result, null, 2));
}

async function handleSquadGenomeRepair(args) {
  const manifestPath = args[0];
  if (!manifestPath) {
    throw new Error('Usage: aios-lite squad:repair-genomes <manifest.json> [--write] [--no-backup]');
  }

  const write = readFlag(args, '--write');
  const backup = !readFlag(args, '--no-backup');

  const result = await repairSquadManifestGenomeBindings(manifestPath, {
    dryRun: !write,
    write,
    backup,
  });

  console.log(JSON.stringify(result, null, 2));
}
```

No bloco principal de roteamento do CLI, adicionar os novos comandos sem remover os existentes:

```js
if (command === 'genome:doctor') {
  await handleGenomeDoctor(restArgs);
  process.exit(0);
}

if (command === 'genome:migrate') {
  await handleGenomeMigrate(restArgs);
  process.exit(0);
}

if (command === 'squad:repair-genomes') {
  await handleSquadGenomeRepair(restArgs);
  process.exit(0);
}
```

### Observações
- Se o CLI já usar outro padrão de parser/roteamento, adaptar sem mudar a arquitetura geral.
- O comportamento padrão deve ser sempre **dry-run**.

---

## 3.5 Atualizar o agente `@genoma` com política explícita de compatibilidade
- **Arquivo:** `template/.aios-lite/agents/genoma.md`
- **Tipo:** EDITAR

### Implementação
Adicionar uma seção nova, sem remover o conteúdo já existente:

```md
## Compatibilidade e Migração

- O sistema deve aceitar genomas legados e Genoma 2.0.
- Ao ler um genoma legado, o sistema deve normalizá-lo internamente para a estrutura Genoma 2.0 antes de usar.
- O sistema não deve exigir migração imediata do arquivo legado para operar.
- Quando o usuário pedir atualização, repair, migrate ou rewrite, o sistema pode regravar o arquivo já no formato Genoma 2.0.
- Ao regravar, deve preservar ao máximo o slug, a intenção original e as principais seções existentes.
- Quando houver bindings antigos em squads, o sistema deve convertê-los internamente para `genomeBindings` normalizados sem remover os campos antigos nesta fase.
- Sempre que uma operação de repair/migrate puder alterar arquivos, o sistema deve preferir modo de simulação primeiro e sugerir backup.
```

### Observações
- O objetivo aqui é alinhar o comportamento do agente com a estratégia do core.

---

## 3.6 Atualizar o agente `@squad` com leitura tolerante de bindings legados
- **Arquivo:** `template/.aios-lite/agents/squad.md`
- **Tipo:** EDITAR

### Implementação
Adicionar uma seção nova próxima das instruções sobre genoma, sem remover as regras atuais:

```md
## Compatibilidade de Genomas em Squads Existentes

- Ao inspecionar ou modificar uma squad existente, o sistema deve aceitar tanto `genomes` legados quanto `genomeBindings` normalizados.
- Quando encontrar apenas `genomes`, deve interpretá-los como bindings persistentes no nível da squad.
- Quando encontrar `genomeBindings`, deve priorizar essa estrutura como fonte principal.
- Nesta fase de migração, o sistema não deve apagar automaticamente `genomes` legados do manifesto.
- Se o usuário solicitar repair ou normalize, o sistema pode materializar `genomeBindings` preservando os dados anteriores.
- Ao aplicar novos genomas, o sistema deve escrever na estrutura nova, mantendo compatibilidade de leitura com a antiga.
```

---

## 3.7 Criar fixtures de compatibilidade para testes
- **Arquivo:** `tests/fixtures/genomes/legacy-copywriter.md`
- **Tipo:** NOVO

### Implementação
```md
---
genome: copywriter-direct-response
type: domain
language: pt-BR
---

# Genome: Copywriter Direct Response

## O que saber
- Oferta
- Promessa
- Mecanismo único

## Mentes
- name: O Persuasivo Analítico
  role: Encontrar objeções e converter em argumento

## Skills
- headline-generation
- objection-handling
```

- **Arquivo:** `tests/fixtures/genomes/v2-growth.md`
- **Tipo:** NOVO

### Implementação
```md
---
schemaVersion: 2.0
slug: growth-marketing
title: Growth Marketing
type: domain
language: pt-BR
depth: standard
evidenceMode: inferred
generatedAt: 2026-03-10T12:00:00.000Z
updatedAt: 2026-03-10T12:00:00.000Z
tags:
  - growth
  - marketing
---

# Genome: Growth Marketing

## O que saber
- Aquisição
- Ativação
- Retenção

## Filosofias
- Crescimento deve ser orientado por sistema e aprendizado.

## Modelos mentais
- Loops de crescimento.

## Heurísticas
- Testar rápido, descartar cedo, escalar o que prova sinal.

## Frameworks
- AARRR

## Metodologias
- Definir hipótese, experimento, métrica e cadência.

## Mentes
- name: Operador de Growth
  role: Transformar hipótese em experimento mensurável

## Skills
- experiment-design
- funnel-diagnosis

## Application notes
- Ideal para squads orientadas a aquisição e otimização.
```

- **Arquivo:** `tests/fixtures/squads/legacy-manifest-with-genomes.json`
- **Tipo:** NOVO

### Implementação
```json
{
  "slug": "content-growth-squad",
  "name": "Content Growth Squad",
  "genomes": ["growth-marketing", "copywriter-direct-response"],
  "executors": [
    {
      "slug": "lead-copy",
      "title": "Lead Copy",
      "genomes": ["copywriter-direct-response"]
    }
  ]
}
```

---

## 3.8 Criar testes de retrocompatibilidade
- **Arquivo:** `tests/genoma-compat.test.js`
- **Tipo:** NOVO

### Implementação
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCompatibleGenome, normalizeLegacySquadGenomes } from '../src/lib/genomes/compat.js';

const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');

function readFixture(...parts) {
  return fs.readFileSync(path.join(fixturesDir, ...parts), 'utf8');
}

test('loadCompatibleGenome normaliza markdown legado para Genoma 2.0', () => {
  const legacy = readFixture('genomes', 'legacy-copywriter.md');
  const result = loadCompatibleGenome(legacy, { filePath: 'legacy-copywriter.md' });

  assert.equal(result.migrated, true);
  assert.equal(result.document.schemaVersion, '2.0');
  assert.equal(result.document.slug, 'copywriter-direct-response');
  assert.equal(result.document.type, 'domain');
  assert.ok(Array.isArray(result.document.minds));
  assert.ok(Array.isArray(result.document.skills));
});

test('loadCompatibleGenome mantém Genoma 2.0 sem migração', () => {
  const current = readFixture('genomes', 'v2-growth.md');
  const result = loadCompatibleGenome(current, { filePath: 'v2-growth.md' });

  assert.equal(result.migrated, false);
  assert.equal(result.document.schemaVersion, '2.0');
  assert.equal(result.document.slug, 'growth-marketing');
  assert.equal(result.document.evidenceMode, 'inferred');
});

test('normalizeLegacySquadGenomes cria genomeBindings a partir de manifest.genomes', () => {
  const manifest = JSON.parse(readFixture('squads', 'legacy-manifest-with-genomes.json'));
  const normalized = normalizeLegacySquadGenomes(manifest);

  assert.ok(Array.isArray(normalized.genomeBindings));
  assert.equal(normalized.genomeBindings.length >= 2, true);
  assert.equal(normalized.genomes.length, 2);
  assert.equal(normalized.genomeBindings[0].targetType, 'squad');
});
```

- **Arquivo:** `tests/genoma-migrate.test.js`
- **Tipo:** NOVO

### Implementação
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { migrateGenomeFile } from '../src/lib/genomes/migrate.js';

const legacyFixture = `---
genome: legacy-style
type: domain
---

# Genome: Legacy Style

## O que saber
- Teste
`;

test('migrateGenomeFile em dry-run não altera arquivo', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-genome-'));
  const target = path.join(tempDir, 'legacy.md');
  await fs.writeFile(target, legacyFixture, 'utf8');

  const result = await migrateGenomeFile(target, { dryRun: true, write: false });
  const after = await fs.readFile(target, 'utf8');

  assert.equal(result.changed, true);
  assert.equal(after, legacyFixture);
});
```

---

## 3.9 Adicionar script de teste focado no package.json se fizer sentido no projeto
- **Arquivo:** `package.json`
- **Tipo:** EDITAR

### Implementação
Se o projeto já tiver `scripts`, adicionar algo assim sem remover scripts existentes:

```json
{
  "scripts": {
    "test:genoma": "node --test tests/genoma-compat.test.js tests/genoma-migrate.test.js"
  }
}
```

### Observações
- Se o repositório já usar outro padrão de execução de testes, adaptar ao padrão existente.

---

# Testes

## Execução automática
```bash
node --test tests/genoma-compat.test.js tests/genoma-migrate.test.js
```

Se existir suporte a script no `package.json`:

```bash
npm run test:genoma
```

## Casos que precisam passar
1. Genoma antigo é lido e normalizado internamente para 2.0.
2. Genoma 2.0 é lido sem marcação de migração.
3. Manifesto antigo com `genomes` simples ganha `genomeBindings` normalizados.
4. `genome:migrate` funciona em `dry-run` sem alterar arquivos.
5. `squad:repair-genomes` gera resultado previsível e não altera nada sem `--write`.

## Validação manual
- [ ] Rodar `aios-lite genome:doctor <arquivo-antigo.md>` e verificar formato detectado.
- [ ] Rodar `aios-lite genome:migrate <arquivo-antigo.md>` sem `--write` e confirmar saída de simulação.
- [ ] Rodar `aios-lite genome:migrate <arquivo-antigo.md> --write` em fixture local e confirmar backup.
- [ ] Rodar `aios-lite squad:repair-genomes <manifest.json>` sem `--write` e confirmar dry-run.
- [ ] Abrir uma squad antiga com `genomes` simples e verificar que o sistema continua operando.

---

# Checklist de conclusão
- [ ] `src/lib/genomes/compat.js` criado.
- [ ] `src/lib/genomes/migrate.js` criado.
- [ ] `src/lib/squads/genome-repair.js` criado.
- [ ] `src/cli.js` atualizado com comandos leves de diagnose/migrate/repair.
- [ ] `template/.aios-lite/agents/genoma.md` atualizado com política de compatibilidade.
- [ ] `template/.aios-lite/agents/squad.md` atualizado com leitura tolerante de bindings legados.
- [ ] fixtures de genoma e manifest legados criadas.
- [ ] testes de compatibilidade e migração criados.
- [ ] testes executados com sucesso.
- [ ] nenhuma funcionalidade existente removida.

---

# Commit sugerido
```bash
git add .
git commit -m "feat(genoma): add compatibility and migration layer for genome v2"
```

---

# Nota para o agente de código
Implemente esta fase de forma isolada e aditiva. Não refatore partes não mencionadas. Preserve compatibilidade com genomas antigos, squads antigas e o fluxo atual do `@squad` e `@genoma`. Em caso de dúvida, priorize leitura tolerante e `dry-run` por padrão.
