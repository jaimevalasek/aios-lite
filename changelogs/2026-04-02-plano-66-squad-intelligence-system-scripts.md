# Changelog — Plano 66 + Squad Intelligence + System Scripts

**Data:** 2026-04-02  
**Origem:** PLAN-66 (claw-code architectural insights) + Squad Intelligence + System Scripts  
**Commits:** `3a5e7ee` → `394e154` (9 commits)

---

## Visão geral

Esta sessão implementou três frentes independentes em sequência:

1. **Sprint 1–3 do PLAN-66** — melhorias arquiteturais derivadas da análise do repositório claw-code (reimplementação em Rust/Python do Claude Code): working memory com task list, hook contract, compactação de contexto, self-directed planning, CronTools e config tiers.
2. **Squad Intelligence** — três módulos para comunicação entre executores, reflection autônoma e execução de squads a partir de um goal de alto nível.
3. **System Scripts** — três comandos CLI para auditoria de tokens, geração de briefs autocontidos e verificação de entregas sem viés de contexto.

---

## Sprint 1 — Working memory, hook contract, file size guidelines, CLAUDE.local.md

**Commit:** `3a5e7ee`

### `template/CLAUDE.md`

Adicionada seção **"Local overrides"** documentando o padrão `CLAUDE.local.md`:

- arquivo de sobrescrita local nunca commitado no git
- permite ajustes por ambiente/desenvolvedor sem poluir o template
- mencionado no `.gitignore` do template

### `template/.gitignore` (novo arquivo)

Criado com as entradas:
```
CLAUDE.local.md
AGENTS.local.md
.aioson/config.local.md
```

### `template/.aioson/config.md`

Quatro novas seções:

**Hook contract** — tabela de exit codes para hooks:

| Exit code | Significado |
|-----------|-------------|
| `0` | Allow — continua normalmente |
| `2` | Deny — bloqueia a ação com mensagem de erro |
| qualquer outro | Warn — registra aviso mas continua |

Variáveis de ambiente injetadas nos hooks (`AIOSON_TOOL`, `AIOSON_AGENT`, `AIOSON_PROJECT_DIR`) e exemplo em bash.

**Agent file size guidelines** — limites de orçamento por tipo:

| Tipo | Alvo | Hard limit |
|------|------|------------|
| Auto-loaded (`CLAUDE.md`, `AGENTS.md`) | 3.500 chars | 4.000 chars |
| Orquestrador | 12.000 chars | 20.000 chars |
| Generalista | 15.000 chars | 40.000 chars |
| Focado | 8.000 chars | 16.000 chars |

**Context compaction template** — schema JSON para `last-handoff.json`:

```json
{
  "session_id": "...",
  "agent": "orache",
  "compacted_at": "ISO timestamp",
  "goal": "objetivo atual da sessão",
  "last_completed_step": "descrição do último passo",
  "next_step": "o que fazer imediatamente ao retomar",
  "open_questions": ["..."],
  "artifacts_written": ["path/to/file"],
  "key_decisions": ["decisão tomada e por quê"]
}
```

**Config tiers** — tabela de precedência user → project → local e nota sobre suporte no roadmap do CLI.

### Agentes atualizados (Sprint 1)

**`template/.aioson/agents/dev.md`** — bloco "Working memory (task list)":
```
PLANNING MODE: TaskCreate → TaskUpdate(in_progress) → trabalhar → TaskUpdate(completed)
Use TaskList para retomar contexto após compactação.
```

**`template/.aioson/agents/orchestrator.md`** — mesmo bloco de working memory.

**Todos os 4 locales** (`en`, `pt-BR`, `es`, `fr`) atualizados para `dev.md` e `orchestrator.md`.

---

## Sprint 2 — Context compaction protocol + Self-directed planning

**Commit:** `180605f`

### Agentes atualizados

**`template/.aioson/agents/dev.md`** — bloco "Self-directed planning":
```
Antes de codificar: declare PLANNING MODE
Liste os passos em TaskCreate antes de executar qualquer um
Ao executar: declare EXECUTION MODE
```

**`template/.aioson/agents/architect.md`** — mesmo bloco de self-directed planning.

**`template/.aioson/agents/orache.md`** — bloco "Context compaction":
```
Ao detectar compactação iminente:
1. Escrever last-handoff.json com o schema de config.md
2. Na retomada: ler last-handoff.json antes de qualquer ação
3. Usar research:cache para preservar URLs e findings já processados
```

**Todos os 4 locales** atualizados para `dev.md`, `architect.md`, `orache.md`.

---

## Sprint 3 — CronTools + Config tiers documentation

**Commit:** `e57d6d5`

### Agentes atualizados

**`template/.aioson/agents/orchestrator.md`** — bloco "Recurring tasks":
```
Para tarefas que se repetem a cada N minutos:
CronCreate("tarefa", intervaloMs, () => { ... })

Para cancelar:
CronDelete("tarefa")

Para listar crons ativos:
CronList()
```

**`template/.aioson/agents/squad.md`** — mesmo bloco de Recurring tasks.

**Todos os 4 locales** atualizados para `orchestrator.md` e `squad.md`.

---

## Squad Intelligence — Intra-bus, Reflection e Task Decomposer

### `src/squad/intra-bus.js` (novo)

**Commit:** `a6875e5`

Canal de comunicação JSONL append-only entre executores de uma mesma sessão de squad.

**Localização dos arquivos:** `.aioson/squads/{slug}/sessions/{id}/bus.jsonl`

**API pública:**

```javascript
// Postar mensagem no bus
await bus.post(projectDir, squadSlug, sessionId, {
  from: 'roteirista',
  to: '*',            // ou executor específico
  type: 'finding',    // status | finding | feedback | question | result | block
  content: '...',
  metadata: { task_id: 'task-1' }
});

// Ler mensagens com filtros
await bus.read(projectDir, squadSlug, sessionId, {
  type: 'block',
  from: 'roteirista',
  since: 'ISO timestamp',
  last: 10
});

// Watch em tempo real (retorna função stop())
const stop = bus.watch(projectDir, squadSlug, sessionId, (msg) => {
  console.log(msg);
}, { interval: 500 });

// Poll desde um timestamp
await bus.poll(projectDir, squadSlug, sessionId, sinceTimestamp, filters);

// Resumo da sessão
await bus.summary(projectDir, squadSlug, sessionId);
// → { total, by_type: {}, blocks: [], participants: [] }

// Limpar bus
await bus.clear(projectDir, squadSlug, sessionId);

// Listar sessões da squad
await bus.listSessions(projectDir, squadSlug);
```

### `src/commands/squad-bus.js` (novo)

**Commit:** `a6875e5`

Comando CLI `aioson squad:bus` com subcomandos: `post`, `read`, `watch`, `summary`, `clear`, `list`.

### `src/squad/reflection.js` (novo)

**Commit:** `d5a7afb`

Módulo de self-critique antes de marcar tarefa como DONE.

**Checklist em cascata (prioridade):**
1. `squad.json → executors[slug].reflection.checklist`
2. `.aioson/squads/{slug}/quality.md`
3. Built-in genérico (5 critérios: `non_empty`, `on_topic`, `no_truncation`, `no_filler`, `actionable`)

**Vereditos:**

| Veredito | Condição |
|----------|----------|
| `DONE` | Todos os critérios críticos passaram |
| `DONE_WITH_CONCERNS` | Passou nos críticos, falhou nos não-críticos |
| `NEEDS_ITERATION` | Falhou em crítico e `iteration < max_iterations` |
| `ESCALATE` | Esgotou iterações — coordenador deve decidir |

**API pública:**

```javascript
// Reflection simples
const result = await reflect(output, {
  projectDir, squadSlug, executorSlug, taskTitle, iteration
});
// → { verdict, passed, score, iteration, max_iterations, issues, critical_failures, needs_llm_review, summary, checklist }

// Loop automático de reflection + retry
const { output, reflection, iterations } = await reflectLoop(
  async (iteration, lastReflection) => { return executeFn(); },
  context,
  { checklist, onIteration }
);

// Formatar como relatório markdown
const report = formatReport(result, executorSlug);
```

**Detecção de filler patterns:** detecta `"of course"`, `"certainly"`, `"as an AI"`, `"great question"`, `"happy to help"` e similares como critério `no_filler`.

### `src/squad/task-decomposer.js` (novo)

**Commit:** `635c428`

Decompõe um goal de alto nível em plano de execução com grupos paralelos.

**Modos:**
- `heuristic` — regex de verbos de ação + matching de executores por keyword
- `structured` — gera prompt para LLM preencher o plano

**Schema do plano salvo em** `.aioson/squads/{slug}/sessions/{id}/plan.json`:

```json
{
  "id": "uuid",
  "session_id": "uuid",
  "squad_slug": "content-team",
  "goal": "Criar 3 episódios de podcast",
  "created_at": "ISO",
  "decomposition_mode": "heuristic",
  "tasks": [
    {
      "id": "task-1",
      "title": "Criar briefing do episódio 1",
      "description": "...",
      "executor": "roteirista",
      "acceptance_criteria": ["..."],
      "dependencies": [],
      "status": "pending"
    }
  ],
  "execution_order": ["task-1", "task-2"],
  "parallel_groups": {
    "1": ["task-1", "task-2"],
    "2": ["task-3"]
  }
}
```

**API pública:**

```javascript
await decompose(projectDir, squadSlug, goal, { sessionId, mode, save });
getReadyTasks(plan);          // tarefas sem dependências pendentes
isPlanComplete(plan);          // true se todas concluídas ou falhas
await updateTaskStatus(projectDir, squadSlug, sessionId, taskId, status, result);
await loadPlan(projectDir, squadSlug, sessionId);
formatPlan(plan);              // saída texto para console
```

### `src/commands/squad-autorun.js` (novo)

**Commit:** `635c428`

Execução autônoma: decompõe goal → executa grupos paralelos → reflection → bus → summary.

**Flags:**

| Flag | Padrão | Descrição |
|------|--------|-----------|
| `--goal` | — | Objetivo de alto nível |
| `--plan` | — | Session ID para retomar |
| `--reflect` | false | Reflection após cada tarefa |
| `--bus` | true | Intra-bus ativo |
| `--mode` | heuristic | `heuristic` ou `structured` |
| `--dry-run` | false | Mostrar plano sem executar |
| `--sequential` | false | Forçar execução sequencial |
| `--timeout` | 120s | Timeout por tarefa |

**Output do summary:**

```
── Autorun complete ─────────────────────────────────────────
Session:   abc-123-def-456
Elapsed:   14s
Tasks:     5/6 completed  | 1 escalated
Bus:       12 messages | ⚠ 1 block(s)
```

---

## System Scripts — agent:audit, brief:gen, verify:gate

### `src/commands/agent-audit.js` (novo)

**Commit:** `ba3c585`

Auditoria de tokens e tamanho para todos os arquivos de agente.

**O que escaneia:**
- `template/.aioson/agents/*.md`
- `.aioson/agents/*.md` (quando usado em projeto)
- `template/CLAUDE.md` e `template/AGENTS.md`
- Com `--locales`: `template/.aioson/locales/*/agents/*.md`

**Classificação automática por slug:**
- `CLAUDE`, `AGENTS` → auto-loaded (3.500 / 4.000 chars)
- `orchestrator`, `squad` → orchestrator (12.000 / 20.000 chars)
- `dev`, `architect`, `deyvin`, `sheldon`, `setup`, `product`, `ux-ui`, `site-forge` → generalist (15.000 / 40.000 chars)
- demais → focused (8.000 / 16.000 chars)

**On-demand keywords** (seções detectadas como raramente necessárias no início da sessão):
`conventions`, `folder structure`, `stack`, `laravel`, `next.js`, `node`, `web3`, `dapp`, `brownfield`, `debugging`, `git worktree`, `motion`, `animation`, `output contract`, `exemplos`, `examples`, `reference`, `template`, `esquema`

**Flags:**

| Flag | Descrição |
|------|-----------|
| `--verbose` | Breakdown das 5 maiores seções por arquivo |
| `--locales` | Inclui variantes de locale |
| `--fix` | Salva relatório completo em `.aioson/docs/agent-audit.md` |
| `--json` | Saída JSON estruturada |

**Saída do `--fix`:** markdown com tabela geral, lista de arquivos over hard limit, candidatos on-demand por arquivo, economia estimada por sessão.

### `src/commands/brief-gen.js` (novo)

**Commit:** `ba3c585`

Gera brief 100% autocontido para workers de squad a partir do plano de implementação.

**Descoberta automática de arquivos:**
1. `implementation-plan.md` → `.aioson/context/`, `.aioson/squads/{slug}/`, `plans/`, raiz
2. `architecture.md` → mesmo cascade
3. `spec.md` → mesmo cascade
4. `project.context.md` → `.aioson/context/`

**Parser de fases:** detecta headings `## Phase N`, `## Sprint N`, `## Step N`, `## Fase N`, `## Etapa N` (case-insensitive).

**Extração de architecture.md:** puxa seções com keywords `tech stack`, `architecture`, `folder structure`, `conventions`, `database`, `api`, `services`, `modules`, `layers` — máximo 3.000 chars.

**Estrutura do brief gerado:**
```
---
generated_at / plan_file / phase / squad / executor
---

# Worker Brief — {título da fase}

> Este brief é 100% autocontido. [...]

## Phase goal and tasks
## Architecture reference (excerpts)
## Spec reference (excerpts)
## Project context
## Done criteria          ← placeholder — orquestrador preenche
## Hard constraints       ← placeholder — orquestrador preenche
## Out of scope           ← placeholder — orquestrador preenche
```

**Saída padrão:** `.aioson/context/briefs/phase-{N}.md` ou `.aioson/squads/{slug}/briefs/phase-{N}-{executor}.md`

**Flags:**

| Flag | Descrição |
|------|-----------|
| `--phase=N` | Número da fase alvo (padrão: fase 1) |
| `--plan=path` | Arquivo de plano explícito |
| `--squad=slug` | Direciona para diretório de squad |
| `--executor=slug` | Adiciona executor ao nome do arquivo |
| `--out=path` | Caminho de saída customizado |
| `--json` | Saída JSON |

### `src/commands/verify-gate.js` (novo)

**Commit:** `ba3c585`

Verificação de "olhos frescos" — compara spec vs artefato sem histórico de conversa.

**Vereditos:**

| Veredito | Condição |
|----------|----------|
| `PASS` | Todos os checks passaram |
| `PASS_WITH_NOTES` | Passou mas tem notas (arquivos vazios, placeholders) |
| `FAIL_WITH_ISSUES` | Um ou mais issues — entrega não aceita |
| `BLOCKED` | Spec não encontrado, artefato ilegível, sem permissão |

**Checagens realizadas (todas determinísticas, sem LLM):**

| Check | Como funciona |
|-------|---------------|
| Arquivos obrigatórios | Extrai paths de "Files to write", "Output files", "Done criteria" |
| Critérios de aceite | Lê checkboxes `- [ ]` e `- [x]` — reporta não marcados |
| Padrões obrigatórios | Busca strings de "Must contain" / "Required patterns" nos arquivos |
| Padrões proibidos | Busca strings de "Hard constraints" — falha se encontrar |
| Arquivos vazios | Reporta files de 0 bytes como nota (issue em `--strict`) |

**Parser do spec:** mapeia seções por keyword para tipos de requisito:

```
"done criteria" / "acceptance criteria"  → acceptance_criteria
"files to write" / "output files"        → required_files
"must contain" / "required patterns"     → required_patterns
"hard constraints" / "must not"          → forbidden_patterns
```

**Saída padrão:** `.aioson/context/verify-gate-{slug-do-spec}.md`

**Flags:**

| Flag | Descrição |
|------|-----------|
| `--spec=path` | Spec ou brief a verificar (obrigatório ou auto-discover) |
| `--artifact=path` | Arquivo ou diretório a verificar |
| `--out=path` | Caminho de saída do relatório |
| `--strict` | Notas viram issues |
| `--json` | Saída JSON com `ok`, `verdict`, `issues`, `notes`, `passes` |

---

## Registro em `src/cli.js`

**Commit:** `ba3c585`

Adicionados ao `JSON_SUPPORTED_COMMANDS`:
- `squad:bus`, `squad-bus`
- `squad:autorun`, `squad-autorun`
- `agent:audit`, `agent-audit`
- `brief:gen`, `brief-gen`
- `verify:gate`, `verify-gate`

Adicionados imports e branches de routing para os 5 comandos.

---

## Documentação

**Commit:** `394e154`

`docs/pt/comandos-cli.md` atualizado com:

- `squad:bus` e `squad:autorun` adicionados à tabela "Genomes e squads"
- Nova seção de tabela "Auditoria, briefs e verificação" com `agent:audit`, `brief:gen`, `verify:gate`
- **Seção 37** — `squad:bus`: subcomandos completos, tabela de tipos de mensagem, fluxo coordenador→executor
- **Seção 38** — `squad:autorun`: básico, com reflect+bus, dry-run com saída real, modo structured, retomada de sessão, tabela de flags
- **Seção 39** — `agent:audit`: saída real do comando, verbose por seção, tabela de limites de orçamento, conceito on-demand
- **Seção 40** — `brief:gen`: todos os casos de uso, estrutura completa do arquivo gerado, explicação dos placeholders intencionais
- **Seção 41** — `verify:gate`: saída real com issues/notas, modo strict, saída JSON para CI, tabela de checks, fluxo completo `brief:gen → verify:gate → agent:done`

---

## Arquivos modificados/criados

```
src/
  squad/
    intra-bus.js                (novo)
    reflection.js               (novo)
    task-decomposer.js          (novo)
  commands/
    squad-bus.js                (novo)
    squad-autorun.js            (novo)
    agent-audit.js              (novo)
    brief-gen.js                (novo)
    verify-gate.js              (novo)
  cli.js                        (modificado — 5 novos comandos registrados)

template/
  .gitignore                    (novo)
  CLAUDE.md                     (modificado — Local overrides)
  .aioson/
    config.md                   (modificado — hook contract, size guidelines, compaction template, config tiers)
    agents/
      dev.md                    (modificado — working memory, self-directed planning)
      orchestrator.md           (modificado — working memory, recurring tasks)
      architect.md              (modificado — self-directed planning)
      orache.md                 (modificado — context compaction)
      squad.md                  (modificado — recurring tasks)
      ux-ui.md                  (modificado)
    locales/
      en/agents/dev.md          (modificado)
      en/agents/orchestrator.md (modificado)
      en/agents/architect.md    (modificado)
      en/agents/orache.md       (modificado)
      en/agents/squad.md        (modificado)
      en/agents/product.md      (modificado)
      en/agents/sheldon.md      (modificado)
      pt-BR/agents/*            (modificado — mesmos 7)
      es/agents/*               (modificado — mesmos 7)
      fr/agents/*               (modificado — mesmos 7)

docs/pt/
  comandos-cli.md               (modificado — seções 37–41 + tabelas)

template/
  AGENTS.md                     (modificado)
```

---

## Fluxo completo recomendado pós-implementação

```bash
# Auditar custo de tokens dos agentes
aioson agent:audit . --verbose

# Antes de cada fase: gerar brief autocontido
aioson brief:gen . --phase=2 --squad=minha-squad --executor=dev

# [Orquestrador preenche: Done criteria, Hard constraints, Out of scope]

# Executar squad com autonomia
aioson squad:autorun . --squad=minha-squad --goal="..." --reflect --bus

# Monitorar comunicação entre executores
aioson squad:bus . watch --squad=minha-squad --session=SESSION_ID

# Após entrega: verificar sem viés de contexto
aioson verify:gate . \
  --spec=.aioson/squads/minha-squad/briefs/phase-2-dev.md \
  --artifact=src/

# Se PASS: fechar sessão
aioson agent:done . --agent=dev --summary="Fase 2 ok" --plan-step=FASE-2
```
