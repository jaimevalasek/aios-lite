# Fase 02 — AIOS Lite / Binding de Genoma em Squad

## Objetivo
Implementar a ligação formal entre **genomas** e **squads** no `aios-lite`, cobrindo tanto a aplicação durante a criação da squad quanto a aplicação posterior em squads já existentes, de forma **100% aditiva** e compatível com o upgrade recente do sistema de squads.

## Repo alvo
`aios-lite`

## Pré-requisitos
- `00-MASTER.md`
- `01-aios-lite-genoma-core.md`

## Regra desta fase
**100% aditivo. NÃO deletar nada.**

Esta fase deve:
- preservar a criação atual de squads;
- preservar squads que não usam genoma;
- preservar genomas antigos já salvos;
- reaproveitar a base do upgrade já feito no `@squad`;
- evitar qualquer obrigatoriedade nova para usuários que só querem criar squads simples.

## Escopo
Esta fase implementa:
1. binding persistente de genomas em squads novas;
2. binding persistente de genomas em squads já existentes;
3. escopo de binding por **squad** e por **executor**;
4. leitura e escrita tolerantes de bindings no manifesto e no blueprint;
5. utilitários de merge/normalização dos bindings;
6. testes automáticos cobrindo criação, aplicação posterior e compatibilidade.

## Fora de escopo
Esta fase **não** implementa:
- dashboard;
- UI visual;
- pipelines;
- execução orquestrada entre squads;
- migração automática em massa de todos os projetos;
- edição visual de bindings.

## Impacto arquitetural
Depois desta fase:
- o **genoma** continua sendo uma camada cognitiva;
- a **squad** continua sendo a unidade de execução;
- o manifesto da squad passa a aceitar bindings de genoma em formato normalizado;
- o blueprint passa a poder descrever bindings pretendidos antes da materialização final;
- o sistema passa a ter uma forma oficial de aplicar genoma em squad existente sem depender de reescrita manual de markdown.

## Invariantes que devem permanecer verdadeiros
- Squads sem genoma continuam válidas.
- O `@squad` continua podendo criar squad sem exigir `@genoma`.
- O `@genoma` continua podendo existir sem ser aplicado a nenhuma squad.
- A ausência de bindings **nunca** deve causar erro fatal.
- O manifesto precisa continuar legível por versões anteriores do fluxo sempre que possível.

## Risco de regressão
Os principais riscos desta fase são:
1. sobrescrever `genomes` já declarados no blueprint dos executors;
2. gerar divergência entre `blueprint`, `manifest` e `docs/readiness.md`;
3. quebrar squads antigas que não possuem estrutura nova de bindings;
4. criar comportamento ambíguo quando o mesmo genoma é aplicado em nível de squad e executor.

Mitigação obrigatória:
- leitura tolerante;
- merge determinístico;
- escrita nova apenas em campos aditivos;
- testes de compatibilidade e deduplicação.

---

# Arquitetura-alvo desta fase

## Modelo conceitual
O binding de genoma deve existir em **dois níveis**:

### 1. Binding em nível de squad
Aplica o genoma como contexto cognitivo padrão da squad inteira.

Uso típico:
- squad de conteúdo usa `copywriting` e `growth-marketing`;
- squad de produto usa `positioning`.

### 2. Binding em nível de executor
Aplica o genoma apenas a um executor específico da squad.

Uso típico:
- executor `youtube-script` usa `storytelling`;
- executor `carousel` usa `social-content`.

## Regra de precedência
Quando houver bindings em múltiplos níveis:
1. bindings do **executor** têm precedência local;
2. bindings da **squad** funcionam como base padrão;
3. o merge final deve deduplicar por `slug`;
4. a ordem final deve ser estável e previsível.

---

# Estrutura de dados recomendada

## No blueprint da squad
Se já existir um blueprint JSON/YAML estruturado, adicionar suporte aos campos abaixo sem remover os atuais:

```json
{
  "genomeBindings": {
    "squad": [
      {
        "slug": "copywriting",
        "mode": "persistent",
        "source": "manual",
        "priority": 100
      }
    ],
    "executors": {
      "youtube-script": [
        {
          "slug": "storytelling",
          "mode": "persistent",
          "source": "manual",
          "priority": 120
        }
      ]
    }
  }
}
```

## No manifesto final da squad
Adicionar um bloco próprio, preservando o que já existir em `executors[].genomes`:

```json
{
  "genomes": {
    "squad": [
      {
        "slug": "copywriting",
        "type": "domain",
        "mode": "persistent",
        "source": "manual",
        "priority": 100
      }
    ],
    "executors": {
      "youtube-script": [
        {
          "slug": "storytelling",
          "type": "function",
          "mode": "persistent",
          "source": "manual",
          "priority": 120
        }
      ]
    }
  }
}
```

## Compatibilidade com estrutura anterior
Se o manifesto já trouxer algo como:

```json
{
  "executors": [
    {
      "slug": "youtube-script",
      "genomes": ["storytelling"]
    }
  ]
}
```

isso deve continuar sendo aceito. O sistema deve normalizar internamente para o novo formato, sem quebrar a leitura antiga.

---

# Entregáveis

## 2.1 Criar utilitário central de normalização e merge de bindings

- **Arquivo:** `src/genomes/bindings.js`
- **Tipo:** NOVO

### Implementação

```js
import { normalizeGenomeRef } from './registry.js';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeBinding(binding, fallback = {}) {
  const raw = typeof binding === 'string' ? { slug: binding } : { ...(binding || {}) };
  const slug = String(raw.slug || fallback.slug || '').trim();

  if (!slug) return null;

  const ref = normalizeGenomeRef({
    slug,
    type: raw.type || fallback.type || null,
    evidenceMode: raw.evidenceMode || fallback.evidenceMode || null,
    version: raw.version || fallback.version || null,
  });

  return {
    slug: ref.slug,
    type: ref.type || null,
    mode: raw.mode || fallback.mode || 'persistent',
    source: raw.source || fallback.source || 'manual',
    priority: Number.isFinite(raw.priority) ? raw.priority : (Number.isFinite(fallback.priority) ? fallback.priority : 100),
    version: ref.version || null,
    evidenceMode: ref.evidenceMode || null,
    notes: raw.notes || fallback.notes || null,
  };
}

function dedupeBindings(bindings = []) {
  const map = new Map();

  for (const item of bindings) {
    const normalized = normalizeBinding(item);
    if (!normalized) continue;

    const current = map.get(normalized.slug);
    if (!current) {
      map.set(normalized.slug, normalized);
      continue;
    }

    const winner = (normalized.priority ?? 100) >= (current.priority ?? 100) ? normalized : current;
    map.set(normalized.slug, winner);
  }

  return [...map.values()].sort((a, b) => {
    const pa = a.priority ?? 100;
    const pb = b.priority ?? 100;
    if (pb !== pa) return pb - pa;
    return a.slug.localeCompare(b.slug);
  });
}

export function normalizeGenomeBindings(input = {}) {
  const squadBindings = dedupeBindings(ensureArray(input?.squad));
  const executors = {};

  const rawExecutors = input?.executors && typeof input.executors === 'object' ? input.executors : {};
  for (const [executorSlug, values] of Object.entries(rawExecutors)) {
    const normalized = dedupeBindings(ensureArray(values));
    if (normalized.length) executors[executorSlug] = normalized;
  }

  return {
    squad: squadBindings,
    executors,
  };
}

export function normalizeLegacyExecutorGenomes(executors = []) {
  const result = {};

  for (const executor of ensureArray(executors)) {
    const slug = executor?.slug || executor?.name || executor?.id;
    if (!slug) continue;

    const normalized = dedupeBindings(ensureArray(executor?.genomes));
    if (normalized.length) result[slug] = normalized;
  }

  return result;
}

export function mergeGenomeBindings({ blueprintBindings, manifestBindings, legacyExecutors }) {
  const blueprint = normalizeGenomeBindings(blueprintBindings || {});
  const manifest = normalizeGenomeBindings(manifestBindings || {});
  const legacy = normalizeGenomeBindings({ executors: normalizeLegacyExecutorGenomes(legacyExecutors || []) });

  const executorSlugs = new Set([
    ...Object.keys(blueprint.executors),
    ...Object.keys(manifest.executors),
    ...Object.keys(legacy.executors),
  ]);

  const executors = {};
  for (const slug of executorSlugs) {
    const merged = dedupeBindings([
      ...(blueprint.executors[slug] || []),
      ...(manifest.executors[slug] || []),
      ...(legacy.executors[slug] || []),
    ]);
    if (merged.length) executors[slug] = merged;
  }

  return {
    squad: dedupeBindings([
      ...(blueprint.squad || []),
      ...(manifest.squad || []),
    ]),
    executors,
  };
}

export function resolveExecutorGenomes(executorSlug, genomeBindings = {}) {
  const normalized = normalizeGenomeBindings(genomeBindings);
  return dedupeBindings([
    ...(normalized.squad || []),
    ...(normalized.executors?.[executorSlug] || []),
  ]);
}

export function attachBindingsToExecutors(executors = [], genomeBindings = {}) {
  return ensureArray(executors).map((executor) => {
    const slug = executor?.slug || executor?.name || executor?.id;
    if (!slug) return executor;

    const resolved = resolveExecutorGenomes(slug, genomeBindings);
    return {
      ...executor,
      genomes: resolved,
    };
  });
}
```

### Notas de implementação
- `normalizeGenomeRef()` deve vir da fase 01.
- Se o nome do helper criado na fase 01 for outro, adaptar o import mantendo a mesma responsabilidade.
- Este arquivo deve ser o único ponto central de merge/precedência.

---

## 2.2 Criar serviço de aplicação de genoma em squad

- **Arquivo:** `src/squads/genome-binding-service.js`
- **Tipo:** NOVO

### Implementação

```js
import fs from 'node:fs';
import path from 'node:path';
import {
  attachBindingsToExecutors,
  mergeGenomeBindings,
  normalizeGenomeBindings,
} from '../genomes/bindings.js';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function patchReadiness(content, genomeBindings) {
  const lines = [];
  lines.push('## Genome bindings');
  lines.push('');

  if (!genomeBindings.squad.length && !Object.keys(genomeBindings.executors).length) {
    lines.push('- None');
    lines.push('');
  } else {
    if (genomeBindings.squad.length) {
      lines.push('### Squad-level');
      for (const item of genomeBindings.squad) {
        lines.push(`- ${item.slug} (${item.mode})`);
      }
      lines.push('');
    }

    const executors = Object.entries(genomeBindings.executors);
    if (executors.length) {
      lines.push('### Executor-level');
      for (const [executorSlug, items] of executors) {
        lines.push(`- ${executorSlug}: ${items.map((x) => x.slug).join(', ')}`);
      }
      lines.push('');
    }
  }

  const section = lines.join('\n');
  const marker = /## Genome bindings[\s\S]*$/m;
  if (marker.test(content)) return content.replace(marker, section.trimEnd());

  const base = content.trimEnd();
  return `${base ? `${base}\n\n` : ''}${section}`.trimEnd() + '\n';
}

export function getSquadPaths(projectRoot, squadSlug) {
  const squadRoot = path.join(projectRoot, '.aios-lite', 'squads', squadSlug);
  return {
    squadRoot,
    manifestPath: path.join(squadRoot, 'squad.manifest.json'),
    blueprintPath: path.join(squadRoot, 'docs', 'blueprint.json'),
    readinessPath: path.join(squadRoot, 'docs', 'readiness.md'),
  };
}

export function applyGenomeBindingsToSquad({ projectRoot, squadSlug, genomeBindings }) {
  const paths = getSquadPaths(projectRoot, squadSlug);
  const manifest = readJsonIfExists(paths.manifestPath);

  if (!manifest) {
    throw new Error(`Squad manifest not found: ${paths.manifestPath}`);
  }

  const blueprint = readJsonIfExists(paths.blueprintPath) || {};
  const mergedBindings = mergeGenomeBindings({
    blueprintBindings: blueprint?.genomeBindings,
    manifestBindings: manifest?.genomes,
    legacyExecutors: manifest?.executors,
  });

  const incoming = normalizeGenomeBindings(genomeBindings || {});
  const finalBindings = mergeGenomeBindings({
    blueprintBindings: mergedBindings,
    manifestBindings: incoming,
    legacyExecutors: manifest?.executors,
  });

  const nextBlueprint = {
    ...blueprint,
    genomeBindings: finalBindings,
  };

  const nextManifest = {
    ...manifest,
    genomes: finalBindings,
    executors: attachBindingsToExecutors(manifest.executors || [], finalBindings),
  };

  writeJson(paths.blueprintPath, nextBlueprint);
  writeJson(paths.manifestPath, nextManifest);

  const readinessText = readTextIfExists(paths.readinessPath);
  writeJson(paths.manifestPath, nextManifest);
  fs.writeFileSync(paths.readinessPath, patchReadiness(readinessText, finalBindings), 'utf8');

  return {
    squadSlug,
    paths,
    genomeBindings: finalBindings,
  };
}
```

### Notas de implementação
- Se o blueprint estiver em outro formato/caminho no seu código atual, adaptar os paths e manter a mesma interface pública.
- O manifesto **não** deve perder campos existentes.
- `executors[].genomes` deve continuar existindo por compatibilidade e conveniência runtime.

---

## 2.3 Adicionar suporte formal no fluxo de criação de squad

- **Arquivo:** ponto central do fluxo de create da squad no repositório atual
- **Tipo:** EDITAR

> Observação: como o upgrade de squad foi recém-commitado, este entregável deve ser aplicado **no arquivo real que hoje materializa o blueprint em manifesto**. Se esse fluxo estiver concentrado em utilitário próprio, editar ali. Se estiver espalhado, criar um helper novo e chamar desse ponto.

### Requisito funcional
Durante a criação da squad:
1. ler `blueprint.genomeBindings`, quando existir;
2. ler `executors[].genomes`, quando vierem em formato legado;
3. gerar `manifest.genomes` no formato novo;
4. materializar `executors[].genomes` já resolvidos.

### Implementação sugerida
No ponto onde o manifesto é montado, aplicar a lógica abaixo:

```js
import {
  attachBindingsToExecutors,
  mergeGenomeBindings,
} from '../genomes/bindings.js';

const resolvedGenomeBindings = mergeGenomeBindings({
  blueprintBindings: blueprint?.genomeBindings,
  manifestBindings: draftManifest?.genomes,
  legacyExecutors: draftManifest?.executors || blueprint?.executors || [],
});

const finalManifest = {
  ...draftManifest,
  genomes: resolvedGenomeBindings,
  executors: attachBindingsToExecutors(draftManifest.executors || [], resolvedGenomeBindings),
};
```

### Critérios obrigatórios
- se não houver genomas, nada deve quebrar;
- se houver apenas legado por executor, isso deve virar formato novo também;
- se houver bindings no blueprint, eles devem sobreviver até o manifesto final;
- manifestos já existentes no formato novo não devem ser degradados.

---

## 2.4 Adicionar comando/programmatic API para aplicar genoma em squad já pronta

- **Arquivo:** `src/squads/apply-genome.js`
- **Tipo:** NOVO

### Implementação

```js
import { applyGenomeBindingsToSquad } from './genome-binding-service.js';
import { normalizeGenomeBindings } from '../genomes/bindings.js';

export function applyGenomeToExistingSquad({ projectRoot, squadSlug, squad = [], executors = {} }) {
  const genomeBindings = normalizeGenomeBindings({
    squad,
    executors,
  });

  return applyGenomeBindingsToSquad({
    projectRoot,
    squadSlug,
    genomeBindings,
  });
}
```

### Uso esperado
Este módulo deve ser fácil de reutilizar por:
- CLI futura;
- dashboard futuramente;
- tasks/agentes internos;
- testes.

---

## 2.5 Expor o binding para o ecossistema de agentes/template

- **Arquivo:** `template/.aios-lite/agents/squad.md`
- **Tipo:** EDITAR

### Requisitos de conteúdo
Atualizar o agente `@squad` para declarar explicitamente:
1. que pode receber genomas durante o design/criação;
2. que pode aplicar genoma em squad já pronta;
3. que bindings podem ser em nível de squad e executor;
4. que deve preferir o formato novo `genomeBindings`/`genomes`, mantendo compatibilidade com legado;
5. que não deve inventar bindings desnecessários quando o usuário não pediu.

### Patch de instrução sugerido
Adicionar uma seção no markdown do agente semelhante a esta:

```md
## Genome bindings

When creating or updating a squad, you may attach genomes as cognitive layers.

Rules:
1. Genome bindings are optional.
2. A genome can be applied at squad level or executor level.
3. Prefer writing normalized bindings in the structured squad blueprint/manifest.
4. Preserve backwards compatibility when executor genomes already exist in legacy array format.
5. Do not force a genome when the user did not request one or when the squad does not benefit from it.

Binding model:
- squad-level genomes: default cognitive context for the whole squad
- executor-level genomes: specific cognitive context for a single executor

When applying a genome to an existing squad:
- update the squad manifest
- update the squad blueprint if present
- refresh executor genome projections
- record the binding in readiness or operational docs when applicable
```

### Observação
Se o agente estiver localizado em outro path por causa do upgrade recente, editar o path real mantendo o mesmo conteúdo.

---

## 2.6 Atualizar o agente `@genoma` para falar a linguagem de binding

- **Arquivo:** `template/.aios-lite/agents/genoma.md`
- **Tipo:** EDITAR

### Requisitos de conteúdo
Adicionar instruções para que o agente `@genoma`:
- saiba gerar bindings consumíveis por squad;
- saiba sugerir `squad-level` e `executor-level`;
- saiba aplicar genoma em squad já pronta usando os nomes reais dos executors quando o contexto existir;
- não reescreva manualmente arquivos inteiros quando existir mecanismo formal de binding.

### Patch de instrução sugerido

```md
## Applying a genome to squads

A generated genome can be:
- saved only,
- attached to a new squad during squad creation,
- attached to an existing squad.

Binding guidance:
1. Prefer structured genome bindings over freeform prose.
2. If applying to a whole squad, use squad-level binding.
3. If applying to a specific executor, use executor-level binding.
4. Reuse existing executor slugs exactly as they exist in the squad manifest when available.
5. Avoid duplicating the same genome in squad-level and executor-level unless the behavior is intentional.
```

---

## 2.7 Criar testes unitários para bindings

- **Arquivo:** `tests/genome-bindings.test.js`
- **Tipo:** NOVO

### Implementação

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeGenomeBindings,
  mergeGenomeBindings,
  resolveExecutorGenomes,
} from '../src/genomes/bindings.js';

test('normalizeGenomeBindings aceita strings e objetos', () => {
  const result = normalizeGenomeBindings({
    squad: ['copywriting', { slug: 'growth', priority: 120 }],
    executors: {
      script: ['storytelling'],
    },
  });

  assert.equal(result.squad.length, 2);
  assert.equal(result.executors.script.length, 1);
  assert.equal(result.executors.script[0].slug, 'storytelling');
});

test('mergeGenomeBindings preserva bindings de blueprint, manifest e legado', () => {
  const result = mergeGenomeBindings({
    blueprintBindings: { squad: ['copywriting'] },
    manifestBindings: { squad: [{ slug: 'growth', priority: 120 }] },
    legacyExecutors: [{ slug: 'script', genomes: ['storytelling'] }],
  });

  assert.deepEqual(result.squad.map((x) => x.slug), ['growth', 'copywriting']);
  assert.deepEqual(result.executors.script.map((x) => x.slug), ['storytelling']);
});

test('resolveExecutorGenomes mistura squad-level com executor-level e deduplica', () => {
  const result = resolveExecutorGenomes('script', {
    squad: ['copywriting'],
    executors: {
      script: ['copywriting', { slug: 'storytelling', priority: 150 }],
    },
  });

  assert.deepEqual(result.map((x) => x.slug), ['storytelling', 'copywriting']);
});
```

---

## 2.8 Criar teste de integração para aplicação em squad existente

- **Arquivo:** `tests/apply-genome-to-squad.test.js`
- **Tipo:** NOVO

### Implementação

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyGenomeToExistingSquad } from '../src/squads/apply-genome.js';

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

test('applyGenomeToExistingSquad aplica genoma em squad e executors sem quebrar manifesto', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aios-lite-genome-bind-'));
  const squadRoot = path.join(root, '.aios-lite', 'squads', 'content-studio');

  writeJson(path.join(squadRoot, 'squad.manifest.json'), {
    slug: 'content-studio',
    executors: [
      { slug: 'youtube-script' },
      { slug: 'carousel' },
    ],
  });

  writeJson(path.join(squadRoot, 'docs', 'blueprint.json'), {
    slug: 'content-studio',
  });

  fs.writeFileSync(path.join(squadRoot, 'docs', 'readiness.md'), '# Readiness\n', 'utf8');

  const result = applyGenomeToExistingSquad({
    projectRoot: root,
    squadSlug: 'content-studio',
    squad: ['copywriting'],
    executors: {
      'youtube-script': ['storytelling'],
    },
  });

  assert.equal(result.squadSlug, 'content-studio');

  const manifest = JSON.parse(fs.readFileSync(path.join(squadRoot, 'squad.manifest.json'), 'utf8'));
  assert.deepEqual(manifest.genomes.squad.map((x) => x.slug), ['copywriting']);
  assert.deepEqual(
    manifest.executors.find((x) => x.slug === 'youtube-script').genomes.map((x) => x.slug),
    ['storytelling', 'copywriting']
  );

  const readiness = fs.readFileSync(path.join(squadRoot, 'docs', 'readiness.md'), 'utf8');
  assert.match(readiness, /Genome bindings/);
  assert.match(readiness, /copywriting/);
  assert.match(readiness, /youtube-script/);
});
```

---

# Validação manual

Executar ao final:

```bash
node --test tests/genome-bindings.test.js tests/apply-genome-to-squad.test.js
```

Se o projeto já possuir suíte agregada:

```bash
npm test
```

### Checklist manual
- [ ] Criar uma squad nova sem genoma continua funcionando.
- [ ] Criar uma squad nova com bindings de genoma grava manifesto e blueprint corretamente.
- [ ] Aplicar genoma em squad existente atualiza manifesto, blueprint e readiness.
- [ ] Executors mantêm `genomes` resolvidos no manifesto final.
- [ ] Estruturas legadas com `executors[].genomes = ["slug"]` continuam sendo lidas.

---

# Checklist de conclusão
- [ ] Existe utilitário central de bindings em `src/genomes/bindings.js`.
- [ ] Existe serviço de aplicação em `src/squads/genome-binding-service.js`.
- [ ] Existe API programática em `src/squads/apply-genome.js`.
- [ ] O fluxo de criação da squad materializa bindings corretamente.
- [ ] `template/.aios-lite/agents/squad.md` foi atualizado para o novo modelo.
- [ ] `template/.aios-lite/agents/genoma.md` foi atualizado para o novo modelo.
- [ ] Testes unitários e de integração foram adicionados.
- [ ] Squads sem genoma continuam válidas.
- [ ] Não houve remoção de comportamento existente.

---

# Commit sugerido

```bash
git add src/genomes/bindings.js src/squads/genome-binding-service.js src/squads/apply-genome.js template/.aios-lite/agents/squad.md template/.aios-lite/agents/genoma.md tests/genome-bindings.test.js tests/apply-genome-to-squad.test.js
git commit -m "feat(genome): add structured squad genome bindings"
```

---

# Observações finais para o agente de código

1. Esta fase deve ser implementada sem assumir dashboard.
2. Esta fase deve ser implementada sem alterar o modelo mental do pipeline.
3. Se algum path do upgrade recente de squad mudou, adaptar os caminhos **sem mudar o objetivo funcional desta fase**.
4. Se o blueprint não estiver em JSON no estado atual do repo, criar helper equivalente e persistir o binding no artefato estrutural que já existe hoje.
5. Priorizar compatibilidade: **primeiro ler tudo, depois escrever o novo formato**.
