# Fase 01 — AIOS Lite / Genoma 2.0 Core

## Objetivo
Implementar a base do **Genoma 2.0** no repositório `aios-lite`, preservando compatibilidade com o Genoma 1.x atual e sem quebrar o fluxo já existente entre `@genoma`, `@squad`, manifestos de squad e bindings persistentes.

## Repo alvo
`aios-lite`

## Regra desta fase
**100% aditivo. NÃO deletar nada existente.**

- Não remover suporte ao formato atual de `.aios-lite/genomas/[slug].md`.
- Não quebrar o fluxo atual do agente `@genoma`.
- Não mudar o papel atual do `@squad`: `@squad` continua responsável por criação/manutenção de squad e `@genoma` continua responsável por gerar/aplicar genomas.
- Não transformar pipelines em runtime de genomas nesta fase.
- Não exigir migração imediata dos genomas já existentes.

## Pré-requisitos
Nenhum.

Esta fase deve funcionar sozinha e preparar as próximas fases:
- Fase 02 — binding formal de genoma em squads
- Fase 03 — migração/compatibilidade/repair
- Fases de dashboard

---

## Escopo
Esta fase implementa somente o **núcleo do Genoma 2.0**:

1. Novo formato lógico do genoma
2. Metadados explícitos do genoma
3. Leitura compatível com formato antigo e novo
4. Persistência local padronizada
5. Preparação para bindings futuros em squad
6. Testes automáticos do core

### Fora de escopo
- UI/dashboard
- arrastar e soltar
- pipeline visual
- execução orquestrada entre squads
- aplicação visual de genoma em squads existentes
- publishing cloud avançado além do que já existir

---

## Contexto do codebase

### Fatos do repositório que esta fase deve respeitar
- O CLI principal do projeto usa `src/cli.js` e o pacote expõe `aios-lite` via `bin/aios-lite.js`.
- O projeto roda em Node.js `>=18` e usa `node --test` como runner de testes.
- O arquivo `src/constants.js` já registra `@genoma` e `@squad` como agentes gerenciados, além de já listar schemas e tasks de squad nos arquivos gerenciados.
- O template atual do agente `@genoma` gera um arquivo `.aios-lite/genomas/[slug].md`, oferece opção de aplicar em squad/agente existente e persiste o binding no `squad.md`.
- O template atual do agente `@squad` já trata `@genoma` como agente separado e já descreve que um genome aplicado depois da criação deve atualizar `squad.md` e reescrever os agentes afetados.

### Arquivos relevantes desta fase

#### EDITAR
- `src/constants.js`
- `src/agents.js` *(somente se necessário para enriquecer o prompt/metadata do agente)*
- `template/.aios-lite/agents/genoma.md`
- `template/.aios-lite/locales/en/agents/genoma.md` *(se existir)*
- `template/.aios-lite/locales/pt-BR/agents/genoma.md` *(se existir)*
- `template/.aios-lite/locales/es/agents/genoma.md` *(se existir)*
- `template/.aios-lite/locales/fr/agents/genoma.md` *(se existir)*

#### NOVO
- `src/genomes.js`
- `src/genome-files.js`
- `src/genome-schema.js`
- `src/genome-format.js`
- `.aios-lite/schemas/genome.schema.json` *(no template)*
- `.aios-lite/schemas/genome-meta.schema.json` *(no template)*
- `tests/genomes-core.test.js`
- `tests/genomes-compat.test.js`
- `tests/genomes-schema.test.js`

#### NÃO TOCAR nesta fase
- `src/commands/squad-*`
- `src/commands/runtime*`
- `src/commands/dashboard*`
- `template/.aios-lite/tasks/squad-*`
- qualquer lógica de pipeline de squads

---

## Arquitetura alvo do Genoma 2.0

O Genoma 2.0 continua sendo salvo em Markdown, mas passa a ter **duas camadas formais**:

1. **Artefato principal**: `.aios-lite/genomas/[slug].md`
2. **Metadados**: `.aios-lite/genomas/[slug].meta.json`

### Papel de cada arquivo

#### `[slug].md`
Representa o conteúdo cognitivo do genoma, legível por humano e por LLM.

#### `[slug].meta.json`
Representa os metadados operacionais:
- versão do formato
- tipo do genoma
- origem
- modo de evidência
- contagens derivadas
- bindings futuros
- compat flags

### Princípio de compatibilidade
- Genoma antigo sem `.meta.json` continua válido.
- Ao ler um genoma antigo, o sistema deve sintetizar metadados default em memória.
- A escrita nova deve sempre produzir `.md` + `.meta.json`.
- A leitura deve aceitar:
  - Genoma 1.x (Markdown antigo)
  - Genoma 2.0 (Markdown novo + meta)

---

## Formato alvo do Genoma 2.0

### Frontmatter proposto para `.md`

```md
---
genome: growth-marketing
domain: Growth Marketing
type: domain
language: pt-BR
depth: standard
version: 2
format: genome-v2
evidence_mode: inferred
generated: 2026-03-10
sources_count: 0
mentes: 4
skills: 3
---
```

### Seções obrigatórias no corpo

1. `# Genome: [Domain Name]`
2. `## O que saber`
3. `## Filosofias`
4. `## Modelos mentais`
5. `## Heurísticas`
6. `## Frameworks`
7. `## Metodologias`
8. `## Mentes`
9. `## Skills`
10. `## Evidence`
11. `## Application notes`

### Compatibilidade com o formato atual
O formato atual do agente `@genoma` exige apenas:
- `## O que saber`
- `## Mentes`
- `## Skills`

Nesta fase:
- essas 3 seções continuam obrigatórias
- as novas seções passam a ser obrigatórias apenas para **genomas novos gravados em v2**
- ao ler genoma antigo, o parser deve preencher as seções faltantes com arrays vazios/defaults em memória

---

## Modelo de metadata proposto

Arquivo: `.aios-lite/genomas/[slug].meta.json`

```json
{
  "schemaVersion": 2,
  "format": "genome-v2",
  "slug": "growth-marketing",
  "domain": "Growth Marketing",
  "type": "domain",
  "language": "pt-BR",
  "depth": "standard",
  "evidenceMode": "inferred",
  "sourceCount": 0,
  "counts": {
    "knowledgeNodes": 6,
    "philosophies": 4,
    "mentalModels": 5,
    "heuristics": 6,
    "frameworks": 4,
    "methodologies": 3,
    "mentes": 4,
    "skills": 3
  },
  "origin": {
    "mode": "llm",
    "sourceFiles": [],
    "sourceUrls": []
  },
  "compat": {
    "legacyMarkdownCompatible": true,
    "synthesizedFromLegacy": false
  },
  "bindings": {
    "squads": [],
    "agents": []
  },
  "createdAt": "2026-03-10T00:00:00.000Z",
  "updatedAt": "2026-03-10T00:00:00.000Z"
}
```

---

## Estratégia de implementação

### Regra central
Implementar primeiro um **núcleo de parsing e persistência de genoma**, independente do agente markdown.

O agente `template/.aios-lite/agents/genoma.md` será atualizado no final da fase apenas para emitir o novo formato. A lógica de leitura/escrita deve ficar no `src/`, não só no prompt do agente.

### Motivo
Isso evita que o Genoma 2.0 vire apenas uma convenção de texto sem capacidade de:
- validar
- migrar
- reutilizar
- testar
- integrar com squad/dashboard depois

---

# Entregáveis

## 1.1 — Criar o módulo de modelo normalizado de genoma

### Arquivo
`src/genomes.js`

### Tipo
NOVO

### Objetivo
Centralizar o modelo normalizado do genoma em memória.

### Implementação
Criar funções puras para:
- `createEmptyGenome()`
- `normalizeGenome(input)`
- `normalizeGenomeMeta(input)`
- `isGenomeV2(genome)`
- `synthesizeMetaFromLegacy(genome)`
- `countGenomeSections(genome)`

### Contrato sugerido

```js
'use strict';

function createEmptyGenome() {
  return {
    slug: '',
    domain: '',
    type: 'domain',
    language: 'en',
    depth: 'standard',
    version: 2,
    format: 'genome-v2',
    evidenceMode: 'inferred',
    generated: '',
    sections: {
      knowledge: [],
      philosophies: [],
      mentalModels: [],
      heuristics: [],
      frameworks: [],
      methodologies: [],
      mentes: [],
      skills: [],
      evidence: [],
      applicationNotes: []
    }
  };
}

function normalizeGenome(input = {}) {
  const genome = createEmptyGenome();
  const merged = {
    ...genome,
    ...input,
    sections: {
      ...genome.sections,
      ...(input.sections || {})
    }
  };

  merged.slug = String(merged.slug || '').trim();
  merged.domain = String(merged.domain || '').trim();
  merged.type = normalizeGenomeType(merged.type);
  merged.language = String(merged.language || 'en').trim();
  merged.depth = normalizeDepth(merged.depth);
  merged.version = 2;
  merged.format = 'genome-v2';
  merged.evidenceMode = normalizeEvidenceMode(merged.evidenceMode);

  return merged;
}
```

### Observações
- Não acoplar filesystem aqui.
- Não acoplar SQLite aqui.
- Não acoplar squad binding aqui.

---

## 1.2 — Criar o módulo de parser/serializer de markdown do genoma

### Arquivo
`src/genome-format.js`

### Tipo
NOVO

### Objetivo
Ler e escrever o arquivo `.md` do genoma.

### Implementação
Criar funções:
- `parseGenomeMarkdown(markdown)`
- `serializeGenomeMarkdown(genome)`
- `extractFrontmatter(markdown)`
- `parseGenomeSections(markdown)`
- `supportsLegacyGenomeMarkdown(markdown)`

### Regras de parsing
- Aceitar genoma antigo sem `version`/`format`
- Detectar as seções antigas (`O que saber`, `Mentes`, `Skills`)
- Detectar as seções novas, quando existirem
- Retornar estrutura normalizada do módulo `src/genomes.js`

### Regras de serialização
- Sempre escrever frontmatter do v2
- Sempre ordenar seções no layout oficial
- Não apagar conteúdo livre dos blocos; preservar listas e subtítulos quando possível

### Observação importante
Nesta fase, não implementar parser excessivamente “inteligente”. O objetivo é previsibilidade, não reconstrução perfeita de qualquer markdown arbitrário.

---

## 1.3 — Criar o módulo de metadados e persistência de arquivos

### Arquivo
`src/genome-files.js`

### Tipo
NOVO

### Objetivo
Padronizar leitura e escrita de `.md` + `.meta.json`.

### Implementação
Criar funções:
- `getGenomeDir(projectRoot)`
- `getGenomeMarkdownPath(projectRoot, slug)`
- `getGenomeMetaPath(projectRoot, slug)`
- `readGenome(projectRoot, slug)`
- `writeGenome(projectRoot, genome, meta)`
- `listGenomes(projectRoot)`
- `genomeExists(projectRoot, slug)`

### Contrato sugerido

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeGenome, synthesizeMetaFromLegacy } = require('./genomes');
const { parseGenomeMarkdown, serializeGenomeMarkdown } = require('./genome-format');

function getGenomeDir(projectRoot) {
  return path.join(projectRoot, '.aios-lite', 'genomas');
}

function getGenomeMarkdownPath(projectRoot, slug) {
  return path.join(getGenomeDir(projectRoot), `${slug}.md`);
}

function getGenomeMetaPath(projectRoot, slug) {
  return path.join(getGenomeDir(projectRoot), `${slug}.meta.json`);
}
```

### Regras de leitura
- Se existir `.md` e não existir `.meta.json`, ler o markdown e gerar meta sintetizada em memória
- Se ambos existirem, preferir o conteúdo real do `.md` e usar `.meta.json` como metadata operacional
- Se `.meta.json` estiver inválido, não falhar silenciosamente; retornar erro claro

### Regras de escrita
- Criar diretório `.aios-lite/genomas/` se não existir
- Escrever ambos os arquivos
- Garantir final newline no markdown
- Escrever JSON com indentação de 2 espaços

---

## 1.4 — Criar validação leve de schema de genoma

### Arquivos
- `src/genome-schema.js`
- `template/.aios-lite/schemas/genome.schema.json`
- `template/.aios-lite/schemas/genome-meta.schema.json`

### Tipo
NOVO

### Objetivo
Definir schema mínimo do Genoma 2.0 para consumo futuro por CLI, dashboard e repair tools.

### Implementação
Em `src/genome-schema.js`, criar funções:
- `validateGenomeObject(genome)`
- `validateGenomeMeta(meta)`
- `assertValidGenome(genome)`
- `assertValidGenomeMeta(meta)`

### Estratégia
Nesta fase, usar um validador leve próprio em JS puro, sem adicionar dependência nova.

### Regras mínimas
Validar:
- `slug` obrigatório
- `domain` obrigatório
- `type` em `domain | function | persona | hybrid`
- `depth` em `surface | standard | deep`
- `evidenceMode` em `inferred | evidenced | hybrid`
- presença de `sections.knowledge`, `sections.mentes`, `sections.skills`
- meta com `schemaVersion = 2`

### Importante
Não adicionar AJV ou libs extras nesta fase. O projeto hoje tem dependência mínima e já usa somente `better-sqlite3`; preservar essa leveza.

---

## 1.5 — Registrar os novos schemas como arquivos gerenciados

### Arquivo
`src/constants.js`

### Tipo
EDITAR

### Objetivo
Incluir os novos arquivos de schema do genoma na lista de arquivos gerenciados do template.

### Alteração esperada
Adicionar em `MANAGED_FILES`:
- `.aios-lite/schemas/genome.schema.json`
- `.aios-lite/schemas/genome-meta.schema.json`

### Observação
Não mexer na definição atual de `AGENT_DEFINITIONS` além do estritamente necessário.

---

## 1.6 — Atualizar o template do agente `@genoma` para emitir Genoma 2.0

### Arquivo
`template/.aios-lite/agents/genoma.md`

### Tipo
EDITAR

### Objetivo
Atualizar o contrato de saída do agente para o formato v2, sem quebrar a lógica atual de uso.

### Mudanças obrigatórias
1. Manter a missão atual do agente
2. Acrescentar tipos de genoma:
   - `domain`
   - `function`
   - `persona`
   - `hybrid`
3. Acrescentar `evidence_mode`:
   - `inferred`
   - `evidenced`
   - `hybrid`
4. Trocar o formato de saída do genome para incluir:
   - Filosofias
   - Modelos mentais
   - Heurísticas
   - Frameworks
   - Metodologias
   - Evidence
   - Application notes
5. Atualizar o bloco “Genome file format” para o novo frontmatter e novas seções
6. Atualizar o “Output contract” para incluir `.meta.json`

### Texto mínimo a acrescentar
No bloco de geração, pedir ao agente que produza:
- `type`
- `evidence_mode`
- `sources_count`
- seções novas do Genoma 2.0

### Regras de compatibilidade no prompt
Acrescentar instrução do tipo:
- se o usuário pedir algo simples, o agente pode preencher as seções novas de forma compacta
- o Genoma 2.0 não deve ficar verborrágico por padrão
- profundidade controla densidade, não só tamanho

---

## 1.7 — Atualizar os templates localizados do `@genoma`

### Arquivos
- `template/.aios-lite/locales/en/agents/genoma.md`
- `template/.aios-lite/locales/pt-BR/agents/genoma.md`
- `template/.aios-lite/locales/es/agents/genoma.md`
- `template/.aios-lite/locales/fr/agents/genoma.md`

### Tipo
EDITAR *(somente se os arquivos existirem na main atual)*

### Objetivo
Manter o comportamento consistente entre idiomas.

### Regra
Se algum locale ainda não existir, **não criar nesta fase só por criar**. Atualizar apenas os locais realmente presentes no repo.

---

## 1.8 — Criar testes de unidade para parsing, compatibilidade e escrita

### Arquivos
- `tests/genomes-core.test.js`
- `tests/genomes-compat.test.js`
- `tests/genomes-schema.test.js`

### Tipo
NOVO

### Objetivo
Garantir que o Genoma 2.0 não introduza regressão silenciosa.

### Casos obrigatórios

#### `tests/genomes-core.test.js`
Cobrir:
- normalização de genoma v2
- geração de metadata padrão
- contagem de seções
- serialização markdown v2

#### `tests/genomes-compat.test.js`
Cobrir:
- leitura de genoma antigo com apenas `O que saber`, `Mentes`, `Skills`
- geração de metadata sintetizada quando `.meta.json` não existe
- preservação de compatibilidade de leitura

#### `tests/genomes-schema.test.js`
Cobrir:
- rejeição de `type` inválido
- rejeição de `depth` inválido
- rejeição de `evidenceMode` inválido
- aceitação de objeto válido mínimo

### Exemplo de teste

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseGenomeMarkdown } = require('../src/genome-format');

test('parseGenomeMarkdown supports legacy genome markdown', () => {
  const markdown = `---
genome: copywriting
domain: Copywriting
language: pt-BR
depth: standard
generated: 2026-03-10
mentes: 3
skills: 2
---
# Genome: Copywriting
## O que saber
Texto base.
## Mentes
### O Estrategista
- Cognitive signature: pensa em posicionamento
- Favourite question: "qual é a promessa?"
- Blind spot: detalhes visuais
## Skills
- SKILL: hooks — ganchos fortes`;

  const genome = parseGenomeMarkdown(markdown);

  assert.equal(genome.slug, 'copywriting');
  assert.equal(genome.sections.knowledge.length >= 0, true);
  assert.equal(Array.isArray(genome.sections.mentes), true);
  assert.equal(Array.isArray(genome.sections.skills), true);
});
```

---

## 1.9 — Garantir que a fase seja invisível para quem não usa genoma ainda

### Arquivos
- todos os anteriores

### Tipo
REGRA DE ACEITAÇÃO

### Objetivo
Nenhum fluxo existente de squad, runtime, dashboard ou agentes gerais deve quebrar só porque o core de genoma foi enriquecido.

### Regras
- Nenhum comando atual deve passar a exigir `.meta.json`
- Nenhum teste já existente pode falhar
- `npm test` deve continuar rodando com `node --test`
- `npm run lint` deve continuar válido para os novos arquivos JS

---

# Testes da fase

## Testes automáticos obrigatórios
Executar:

```bash
npm test
npm run lint
```

## Testes manuais obrigatórios

### Cenário 1 — leitura de genoma antigo
1. Criar `.aios-lite/genomas/teste.md` em formato antigo
2. Ler via helper novo
3. Confirmar que não falha
4. Confirmar que há metadata sintetizada em memória

### Cenário 2 — escrita de genoma novo
1. Criar objeto normalizado v2
2. Escrever com `writeGenome`
3. Confirmar geração de:
   - `.aios-lite/genomas/teste.md`
   - `.aios-lite/genomas/teste.meta.json`

### Cenário 3 — schema inválido
1. Tentar validar genoma com `type = nonsense`
2. Confirmar erro claro e previsível

---

# Checklist de conclusão

- [ ] `src/genomes.js` criado
- [ ] `src/genome-format.js` criado
- [ ] `src/genome-files.js` criado
- [ ] `src/genome-schema.js` criado
- [ ] `template/.aios-lite/schemas/genome.schema.json` criado
- [ ] `template/.aios-lite/schemas/genome-meta.schema.json` criado
- [ ] `src/constants.js` atualizado para registrar os novos schemas
- [ ] `template/.aios-lite/agents/genoma.md` atualizado para Genoma 2.0
- [ ] locais do `@genoma` atualizados onde existirem
- [ ] testes `tests/genomes-core.test.js` criados
- [ ] testes `tests/genomes-compat.test.js` criados
- [ ] testes `tests/genomes-schema.test.js` criados
- [ ] `npm test` passando
- [ ] `npm run lint` passando
- [ ] nenhum teste legado quebrado

---

# Critérios de aceite

A fase está pronta quando:

1. O repositório consegue **ler genoma antigo e novo**
2. O repositório consegue **gravar genoma novo em v2**
3. O agente `@genoma` passa a ter contrato explícito do **Genoma 2.0**
4. A base fica pronta para a próxima fase de **binding formal em squads**
5. Tudo continua **100% aditivo**

---

# Mensagem de commit sugerida

```text
feat(genoma): add genome v2 core model, parser, metadata and schemas
```

---

# Nota para o agente de código

Implemente esta fase inteira sem presumir dashboard e sem antecipar a Fase 02.

Nesta fase, o objetivo é apenas deixar o Genoma 2.0 sólido no core do `aios-lite`.

Não invente integração visual. Não mexa em pipelines. Não mexa em runtime de squads.
