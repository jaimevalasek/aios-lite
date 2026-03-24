# Fase 11 — Squad Learning: Memória Adaptativa e Evolução Contínua

> **Prioridade:** P1 (depende parcialmente da Fase 10 para execution plans, mas pode começar independente)
> **Depende de:** Nada diretamente (Fase 10 enriquece, mas não bloqueia)
> **Escopo:** Dois níveis — agentes AIOSON + squads gerados
> **Filosofia:** "O segundo uso de qualquer agente deve ser melhor que o primeiro."

## O Problema

Hoje, cada session de trabalho — seja dos agentes AIOSON ou dos squads — começa do zero em termos de aprendizado comportamental.

O que se PERDE entre sessions:

1. **Preferências do usuário** — Se o usuário disse "prefiro formato longo" na session 1, na session 5 o agente pergunta de novo
2. **Padrões de rejeição** — Se o review loop rejeitou 3x porque o copywriter ignora tom formal, não existe mecanismo para o squad "aprender" isso
3. **Ajustes de executor** — Se o usuário sempre pede para o @trend-analyst focar mais em dados quantitativos, isso não persiste
4. **Estratégias que funcionaram** — Se uma certa sequência de rounds produziu resultado excelente, ninguém registra
5. **Contexto emergente** — Informações que surgem durante sessions (ex: "nosso público tem média de 35 anos") que não estavam no brief original
6. **Decisões do usuário durante criação** — O squad.md diz "Do NOT save to memory unless the user explicitly asks", mas isso significa que NADA é aprendido automaticamente

### O mesmo problema no AIOSON framework

- O /dev implementa um projeto e descobre que "neste projeto, sempre precisa rodar migrations com --seed"
- O /architect toma uma decisão que valeu pra este projeto mas o pattern serve pra futuros
- O /orchestrator paralleliza de um jeito e funciona perfeitamente — ninguém registra que deu certo
- O spec.md captura DECISÕES mas não captura APRENDIZADOS sobre o processo

## Conceito

Adicionar um sistema de **learning** em dois níveis que:

1. **Captura passivamente** — Após sessions produtivas, detecta o que vale registrar
2. **Apresenta no início** — Antes de cada nova session, mostra learnings relevantes
3. **Gradua automaticamente** — Learnings recorrentes são promovidos a rules ou preferences
4. **Não incomoda** — Funciona com baixo atrito, não pede confirmação para tudo

## Dois níveis de aplicação

### Nível 1: AIOSON Framework

Onde aprendizados de projetos e features ficam registrados para beneficiar sessions futuras.

**Artefato:** `.aioson/context/learnings.md` (project-level) e `.aioson/context/learnings-{slug}.md` (feature-level)

### Nível 2: Squads gerados

Onde cada squad acumula inteligência sobre como produzir melhor output.

**Artefato:** `.aioson/squads/{slug}/learnings/` (diretório de learning entries)

## O que é JS vs. LLM

**JS (determinístico, zero LLM):**
- Registrar learning entries no SQLite com timestamp e categoria
- Calcular frequência de um learning (quantas sessions ele aparece)
- Detectar learnings candidatos a promoção (frequência ≥ 3)
- Listar learnings por squad ou por projeto
- Fazer garbage collection de learnings stale (>90 dias sem reforço)
- Gerar relatório de learnings por período

**LLM (requer inteligência):**
- Detectar O QUE vale registrar após uma session (separar ruído de insight)
- Formular o learning de forma útil e acionável
- Decidir quando um learning deve virar uma rule permanente
- Sintetizar learnings redundantes em um único learning consolidado
- Apresentar learnings relevantes no início de uma session (sem sobrecarregar)
- Adaptar comportamento baseado em learnings carregados

## Tipos de Learning

### L1: User Preference

Captura preferências explícitas e implícitas do usuário.

```markdown
## Learning: {título curto}
- **Type:** preference
- **Source:** session {session-id} | {date}
- **Signal:** {explicit | implicit}
- **What:** {a preferência}
- **Evidence:** {o que o usuário disse ou fez que indica isso}
- **Confidence:** {high | medium | low}
- **Applies to:** {squad | executor:slug | all}
```

**Sinais explícitos** (alta confiança):
- "Prefiro formato longo"
- "Não use emojis"
- "Sempre inclua dados quantitativos"
- "Quero tom mais informal"

**Sinais implícitos** (média confiança):
- Usuário sempre edita o output para adicionar mais detalhes → provavelmente prefere formato longo
- Usuário nunca usa o output de certo executor → executor pode ser irrelevante
- Usuário sempre pede revisão do mesmo tipo → quality gate faltando

### L2: Process Pattern

Captura padrões de processo que funcionaram ou falharam.

```markdown
## Learning: {título curto}
- **Type:** process
- **Source:** session {session-id} | {date}
- **What worked / What failed:** {descrição}
- **Impact:** {como isso mudou o resultado}
- **Recommendation:** {o que fazer diferente}
- **Applies to:** {squad | executor:slug | workflow:slug}
```

Exemplos:
- "Rodar o trend-analyst ANTES do copywriter produz conteúdo mais relevante"
- "Review loop rejeita menos quando o brief inclui tom de voz explícito"
- "Parallelizar os executors de research funciona melhor que sequencial"

### L3: Domain Insight

Captura conhecimento de domínio descoberto durante sessions.

```markdown
## Learning: {título curto}
- **Type:** domain
- **Source:** session {session-id} | {date}
- **Discovery:** {o insight de domínio}
- **Relevance:** {como afeta o squad ou o projeto}
- **Verified:** {true | false — se foi confirmado com dados/search}
- **Applies to:** {squad | domain:name}
```

Exemplos:
- "O público deste canal tem média de 35 anos e prefere vídeos de 15-20 min"
- "No setor jurídico brasileiro, citações precisam seguir formato ABNT"
- "A API deste projeto tem rate limit de 100req/min"

### L4: Quality Signal

Captura padrões de qualidade — o que gera bons ou maus resultados.

```markdown
## Learning: {título curto}
- **Type:** quality
- **Source:** session {session-id} | review-loop rejection | user feedback
- **Pattern:** {o que leva a resultado bom/ruim}
- **Frequency:** {quantas vezes observado}
- **Severity:** {high | medium | low}
- **Recommendation:** {ajuste concreto}
- **Candidate for rule:** {true | false}
- **Applies to:** {executor:slug | squad | checklist:slug}
```

Exemplos:
- "O copywriter consistentemente ignora o tom formal → rejeição frequente" (candidate for rule)
- "Scripts com hook de 3 segundos têm feedback muito mais positivo"
- "Output sem next-step concreto sempre gera follow-up do usuário"

## Mecânica de captura

### Quando capturar

**Após cada session produtiva**, o agente (orquestrador do squad ou /dev do AIOSON) executa uma mini-análise:

```
Session ended.

Quick learning scan:
1. Did the user correct or adjust any output? → L1 (preference)
2. Did a review loop reject anything? → L4 (quality signal)
3. Did the execution order cause issues or work well? → L2 (process)
4. Did new domain information emerge? → L3 (domain insight)
5. Did the user express satisfaction or frustration? → L1 or L4
```

### Como capturar

A captura acontece em dois momentos:

**1. Inline detection (durante a session)**
O agente ativo detecta sinais durante o trabalho. Não interrompe o fluxo — anota internamente.

Sinais a detectar:
- Usuário diz "não" + dá direção diferente → preference learning
- Review loop rejeita → quality learning
- Usuário expressa satisfação com output → process ou preference learning
- Nova informação factual sobre domínio/público → domain learning

**2. End-of-session summary (ao final)**
Antes de fechar a session, o agente:

1. Lista os learnings capturados (max 3-5 por session)
2. Apresenta ao usuário de forma não-intrusiva:

```
📝 Session learnings detected:
1. You prefer long-form content with data → saved as preference
2. Starting with research before writing improved output → saved as process pattern
3. Target audience prefers 15-20min videos → saved as domain insight

These will inform future sessions. Want to adjust any?
```

3. Salva os learnings aprovados (ou salva automaticamente se o usuário não se manifesta)

### Onde salvar

**AIOSON Framework (Nível 1):**
```
.aioson/context/learnings.md            ← project-level learnings (consolidated)
.aioson/context/learnings-{slug}.md     ← feature-level learnings
```

**Squads (Nível 2):**
```
.aioson/squads/{slug}/learnings/
├── index.md                            ← índice de learnings ativos
├── pref-{date}-{short-title}.md        ← preference learning
├── proc-{date}-{short-title}.md        ← process learning
├── domain-{date}-{short-title}.md      ← domain learning
└── quality-{date}-{short-title}.md     ← quality learning
```

Um arquivo individual de learning segue o formato da seção "Tipos de Learning" acima.

O `index.md` é um índice conciso:

```markdown
# Squad Learnings: {squad-name}

> Active learnings loaded at session start. Updated automatically.

## Preferences (load always)
- [pref-20260323-long-format.md](pref-20260323-long-format.md) — user prefers long-form content
- [pref-20260325-no-emojis.md](pref-20260325-no-emojis.md) — no emojis in output

## Process (load when planning rounds)
- [proc-20260323-research-first.md](proc-20260323-research-first.md) — research before writing improves quality

## Domain (load always)
- [domain-20260323-audience-age.md](domain-20260323-audience-age.md) — target audience 35+, prefers 15-20min videos

## Quality (load when reviewing)
- [quality-20260324-tone-formal.md](quality-20260324-tone-formal.md) — copywriter must maintain formal tone (3x rejection)

## Promoted to rules
- quality-20260324-tone-formal → `.aioson/rules/squad/tone-formal.md` (promoted 2026-03-26)
```

## Mecânica de apresentação

### No início de cada session

**Para squads:**
O @orquestrador, ANTES de processar o primeiro desafio, lê `learnings/index.md` e carrega:
- TODAS as preferences (são compactas e sempre relevantes)
- TODOS os domain insights (informam o contexto)
- Process patterns relevantes para o tipo de session
- Quality signals com frequency ≥ 2

Apresentação ao usuário (concisa, não-intrusiva):

```
Loading squad context...
- 3 preferences active (long-form, no emojis, data-heavy)
- 2 domain insights loaded (audience: 35+, video length: 15-20min)
- 1 quality pattern enforced (formal tone for @copywriter)
Ready.
```

**Para AIOSON framework:**
O /dev ou /orchestrator, ao ler os artefatos, também lê `learnings.md`:
- Preferências do usuário para este projeto
- Padrões de processo que funcionaram
- Avisos de qualidade de sessions anteriores

### Como learnings afetam comportamento

Os learnings NÃO são apenas "notas passivas". Eles devem **modificar o comportamento** dos agentes:

**Preferences → Mudam o output style:**
- "prefere formato longo" → agente gera outputs mais densos por padrão
- "não usa emojis" → agente suprime emojis automaticamente
- "prefere dados quantitativos" → agente prioriza métricas e números

**Process patterns → Mudam a orquestração:**
- "research before writing" → @orquestrador muda a sequência de rounds
- "parallel research works better" → @orquestrador paraleliza executors de research

**Domain insights → Mudam o contexto:**
- "público de 35+" → ajusta vocabulário e referências culturais
- "API tem rate limit de 100/min" → /dev adiciona throttling sem precisar re-descobrir

**Quality signals → Mudam os review criteria:**
- "copywriter ignora tom formal" → review loop ganha critério adicional
- "output sem next-step causa follow-up" → checklist ganha item

## Mecânica de graduação (promoção a rules)

### Quando promover

Um learning se torna candidato a promoção quando:

1. **Frequência:** Aparece em ≥ 3 sessions distintas
2. **Consistência:** Nunca foi contradito pelo usuário
3. **Impacto:** É do tipo `quality` ou `process` (preferences raramente viram rules)
4. **Estabilidade:** Tem pelo menos 7 dias de idade

### Como promover

Quando um learning atinge os critérios, o agente oferece:

```
📊 Learning promotion candidate:
"Copywriter must maintain formal tone" — appeared in 3 sessions,
rejected 5 times when violated, never contradicted.

This could become a permanent rule at `.aioson/rules/squad/{rule-name}.md`
so it's enforced automatically in future squads and sessions.

Promote to rule? (yes / no / not yet)
```

Se promovido:
1. Criar a rule file em `.aioson/rules/squad/` (squad level) ou `.aioson/rules/` (framework level)
2. Atualizar `learnings/index.md` com "Promoted to rule: {path}"
3. O learning original permanece como registro histórico

Se o usuário diz "not yet":
- Resetar o timer — perguntar de novo após mais 3 sessions

### Promoção para skills (domain insights)

Domain learnings acumulados podem ser promovidos a domain skills:

```
📊 Domain knowledge accumulation:
You've gathered 7 domain insights about "YouTube content creation"
across 5 sessions. This is enough to create a reusable domain skill
at `.aioson/skills/squad/domains/youtube-content.md`.

Future squads in this domain will start with this knowledge.

Create domain skill? (yes / no)
```

## Mecânica de consolidação

### Learnings redundantes

Se dois learnings dizem essencialmente a mesma coisa, o agente consolida:

```
Consolidating learnings:
- "prefers detailed output" (session 1) + "wants more depth in analysis" (session 3)
→ Consolidated as: "User prefers detailed, in-depth output with thorough analysis"
```

O learning consolidado mantém referência aos originais.

### Learnings contraditórios

Se um learning novo contradiz um existente:

```
⚠ Contradictory learning detected:
- Existing: "prefers formal tone" (3 sessions)
- New: "asked for casual, conversational tone" (this session)

Options:
1. Replace (the preference changed)
2. Context-specific (formal for reports, casual for social media)
3. Keep existing (this session was an exception)
```

### Garbage collection

Learnings que não são reforçados perdem relevância:
- Após 90 dias sem reforço → mark as `stale`
- Stale learnings são movidos para `learnings/archive/`
- Não são carregados em sessions, mas podem ser consultados

## Implementação no AIOSON Framework (Nível 1)

### Edições no `spec.md.template`

Adicionar seção:

```markdown
## Session Learnings

> Atualizado automaticamente ao final de cada session produtiva.
> Lido no início de cada session para informar comportamento.

### Preferences
- (none yet)

### Process Patterns
- (none yet)

### Domain Insights
- (none yet)

### Quality Signals
- (none yet)
```

### Edições no `dev.md`

Adicionar após "## Semantic commit format":

```markdown
## Session learnings

At the end of each productive session, scan for learnings before writing the session summary.

### Detection
Look for:
1. User corrections to your output → preference learning
2. Repeated patterns in what worked → process learning
3. New factual information about the project → domain learning
4. Errors or quality issues you or the user caught → quality learning

### Capture
For each learning detected (max 3-5 per session):
1. Write it as a bullet in `spec.md` under "Session Learnings" in the appropriate category
2. Keep it concise and actionable (1-2 lines max)
3. Include the date

### Loading
At session start, after reading `spec.md`, note the learnings section.
Let them inform your approach without explicitly citing them unless relevant.

### Promotion
If a learning appears in 3+ sessions:
- Suggest to the user: "This pattern keeps appearing. Want me to add it as a project rule in `.aioson/rules/`?"
```

### Edições no `orchestrator.md`

Adicionar mesma seção adaptada para contexto de orquestração:

```markdown
## Session learnings

At the end of each orchestration session:
1. Scan for learnings across all subagent outputs
2. Record in `spec.md` under "Session Learnings"
3. Pay special attention to process patterns (execution order, parallelization results)
4. If a subagent consistently produced subpar output, record as quality signal
```

## Implementação nos Squads (Nível 2)

### Edições no `squad.md` — Template do orchestrator

Adicionar no template do orchestrator (Step 3):

```markdown
## Squad learnings

The squad accumulates intelligence from sessions. This makes each session better than the last.

### At session start
1. Read `learnings/index.md` in the squad package
2. Load all preferences and domain insights into active context
3. Load quality signals relevant to this session's topic
4. Load process patterns if planning multi-round orchestration
5. Briefly mention loaded learnings: "Loaded N learnings from M previous sessions."

### During session
When detecting a learning signal (user correction, rejection, new info, quality issue):
- Note it internally
- Do NOT interrupt the session to discuss it

### At session end
1. List detected learnings (max 3-5)
2. Present to user non-intrusively
3. Save approved learnings to `learnings/` directory
4. Update `learnings/index.md`

### Promotion checks
After saving new learnings:
- Check if any quality learning has frequency ≥ 3 → offer rule promotion
- Check if domain learnings for this domain total ≥ 7 → offer domain skill creation
- Check if any preference has been stable for ≥ 5 sessions → mark as established

### NEVER do
- Save learnings without at least showing them to the user
- Interrupt a productive session to discuss learning capture
- Keep more than 20 active learnings per squad (consolidate or archive)
- Treat stale learnings (90+ days) as current truth
```

### Edições no `squad.md` — Hard constraints update

Remover ou soften:
```
- Do NOT save to memory unless the user explicitly asks.
```

Substituir por:
```
- Do NOT save to auto-memory (Claude's memory system) unless the user explicitly asks.
- DO save squad learnings to the squad's `learnings/` directory — this is squad-scoped persistence, not Claude memory.
- Present learnings to the user at session end before saving.
```

### Nova task: `template/.aioson/tasks/squad-learning-review.md`

```markdown
# Task: Squad Learning Review

> Revisão periódica dos learnings acumulados do squad.

## Quando usar
- `@squad learning review <slug>` — revisão manual
- Automaticamente quando learnings > 15 (consolidation needed)
- Periodicamente sugerida pelo @orquestrador após 10+ sessions

## Processo

### Passo 1 — Inventário
Listar todos os learnings ativos em `learnings/index.md`.

### Passo 2 — Consolidação
Identificar learnings redundantes e consolidar.

### Passo 3 — Promoção
Identificar candidatos a promoção (rules ou skills).

### Passo 4 — Arquivo
Mover learnings stale para `learnings/archive/`.

### Passo 5 — Relatório
Apresentar resumo:
- Learnings ativos: N
- Consolidados: M
- Promovidos: P
- Arquivados: A
```

## CLI: `squad-learning.js` (novo)

**Responsabilidades (JS, zero LLM):**

```javascript
// Subcomandos:
// aioson squad:learning list <slug>          — lista learnings ativos
// aioson squad:learning stats <slug>         — estatísticas (por tipo, frequência)
// aioson squad:learning archive <slug>       — move stale learnings para archive
// aioson squad:learning promote <slug> <id>  — promove learning a rule
// aioson squad:learning export <slug>        — exporta learnings como JSON

// Nova tabela SQLite:
// squad_learnings (
//   learning_id TEXT PRIMARY KEY,
//   squad_slug TEXT NOT NULL,
//   type TEXT NOT NULL,             -- preference | process | domain | quality
//   title TEXT NOT NULL,
//   signal TEXT DEFAULT 'explicit', -- explicit | implicit
//   confidence TEXT DEFAULT 'medium',
//   frequency INTEGER DEFAULT 1,
//   last_reinforced TEXT,
//   applies_to TEXT,               -- squad | executor:slug | all
//   file_path TEXT,                -- path to .md file
//   promoted_to TEXT,              -- path to rule/skill if promoted, NULL otherwise
//   status TEXT DEFAULT 'active',  -- active | stale | archived | promoted
//   created_at TEXT DEFAULT (datetime('now')),
//   updated_at TEXT DEFAULT (datetime('now'))
// )
```

## CLI: `learning.js` (novo, framework level)

**Responsabilidades (JS, zero LLM):**

```javascript
// Subcomandos:
// aioson learning list                    — lista learnings do projeto
// aioson learning stats                   — estatísticas
// aioson learning promote <id>            — promove a rule

// Nova tabela SQLite:
// project_learnings (
//   learning_id TEXT PRIMARY KEY,
//   project_name TEXT,
//   feature_slug TEXT,             -- NULL se project-level
//   type TEXT NOT NULL,
//   title TEXT NOT NULL,
//   confidence TEXT DEFAULT 'medium',
//   frequency INTEGER DEFAULT 1,
//   last_reinforced TEXT,
//   applies_to TEXT,               -- project | feature:slug | agent:slug
//   promoted_to TEXT,
//   status TEXT DEFAULT 'active',
//   created_at TEXT DEFAULT (datetime('now')),
//   updated_at TEXT DEFAULT (datetime('now'))
// )
```

## Interação com Fase 10 (Implementation Plan)

Os learnings enriquecem a geração de implementation plans:

**Na geração do plan (Fase 10):**
- Se existem learnings de processo → incorporar na sequência de fases
- Se existem learnings de qualidade → adicionar como checkpoints
- Se existem preferences → informar o context package

**No execution plan do squad:**
- Process learnings informam a ordem dos rounds
- Quality learnings viram quality gates adicionais
- Domain learnings são incluídos no context que cada executor recebe

## Interação com Fases existentes

### Fase 1 (@orache)
- Domain learnings de sessions podem enriquecer futuras investigações
- @orache pode verificar se learnings de domínio já cobrem dimensões de investigação

### Fase 2 (Review Loops)
- Quality learnings alimentam os `criteria` dos review loops
- Learnings de rejeição frequente viram `vetoConditions`

### Fase 5 (Format Templates)
- Preferences sobre formato alimentam a seleção de templates
- "Usuário prefere tabs sobre accordion" → afeta `layoutType` default

### Fase 7 (Quality Scoring)
- Quality learnings contribuem para o scoring
- Squads com mais learnings positivos → higher quality signal

## Segurança e privacidade

### O que NUNCA salvar como learning
- Dados pessoais do usuário (nome, email, empresa — a menos que diretamente relevante)
- Conteúdo sensível de output (ex: estratégias de negócio)
- Credenciais, tokens, senhas que apareçam no contexto
- Julgamentos sobre a qualidade do trabalho do usuário

### O que SEMPRE é safe para salvar
- Preferências de formato e estilo
- Padrões de processo (orquestração, sequência)
- Informações de domínio públicas ou compartilhadas pelo usuário
- Padrões de qualidade observados

## Nova tabela SQLite (runtime-store.js)

```sql
CREATE TABLE IF NOT EXISTS squad_learnings (
  learning_id TEXT PRIMARY KEY,
  squad_slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('preference', 'process', 'domain', 'quality')),
  title TEXT NOT NULL,
  signal TEXT DEFAULT 'explicit' CHECK (signal IN ('explicit', 'implicit')),
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  frequency INTEGER DEFAULT 1,
  last_reinforced TEXT,
  applies_to TEXT DEFAULT 'squad',
  file_path TEXT,
  promoted_to TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'stale', 'archived', 'promoted')),
  source_session TEXT,
  evidence TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_learnings (
  learning_id TEXT PRIMARY KEY,
  project_name TEXT,
  feature_slug TEXT,
  type TEXT NOT NULL CHECK (type IN ('preference', 'process', 'domain', 'quality')),
  title TEXT NOT NULL,
  confidence TEXT DEFAULT 'medium',
  frequency INTEGER DEFAULT 1,
  last_reinforced TEXT,
  applies_to TEXT DEFAULT 'project',
  promoted_to TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'stale', 'archived', 'promoted')),
  source_session TEXT,
  evidence TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_squad_learnings_squad ON squad_learnings(squad_slug);
CREATE INDEX IF NOT EXISTS idx_squad_learnings_type ON squad_learnings(type);
CREATE INDEX IF NOT EXISTS idx_squad_learnings_status ON squad_learnings(status);
CREATE INDEX IF NOT EXISTS idx_project_learnings_type ON project_learnings(type);
CREATE INDEX IF NOT EXISTS idx_project_learnings_status ON project_learnings(status);
```

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `template/.aioson/tasks/squad-learning-review.md` | CRIAR | Task de revisão de learnings |
| `src/commands/squad-learning.js` | CRIAR | CLI para gestão de squad learnings |
| `src/commands/learning.js` | CRIAR | CLI para gestão de project learnings |
| `tests/squad-learning.test.js` | CRIAR | Testes CLI |
| `tests/learning.test.js` | CRIAR | Testes CLI |
| `template/.aioson/agents/squad.md` | EDITAR | Template do orchestrator (learnings) + hard constraints update |
| `template/.aioson/agents/dev.md` | EDITAR | Seção "Session learnings" |
| `template/.aioson/agents/orchestrator.md` | EDITAR | Seção "Session learnings" |
| `template/.aioson/context/spec.md.template` | EDITAR | Seção "Session Learnings" |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
| `template/.aioson/locales/*/agents/dev.md` | EDITAR | Espelhar mudanças |
| `template/.aioson/locales/*/agents/orchestrator.md` | EDITAR | Espelhar mudanças |
| `src/runtime-store.js` | EDITAR | 2 novas tabelas + índices |
| `src/cli.js` | EDITAR | Registrar novos comandos |
| `src/i18n/messages/*.js` | EDITAR | Mensagens dos novos comandos |

## Prioridade de implementação

```
1. Definir formato dos learning files + index.md                ← fundação
2. Editar squad.md (orchestrator template + hard constraints)    ← squad behavior
3. Editar dev.md e orchestrator.md (session learnings)           ← framework behavior
4. Editar spec.md.template (seção learnings)                     ← framework persistence
5. template/.aioson/tasks/squad-learning-review.md               ← squad review task
6. src/runtime-store.js (tabelas)                                ← persistence
7. src/commands/squad-learning.js                                ← CLI
8. src/commands/learning.js                                      ← CLI
9. Testes                                                        ← validação
10. Locales                                                      ← i18n
```

## Métricas de sucesso

Como saber que o squad learning está funcionando:

1. **Rejeições decrescentes** — Sessions posteriores têm menos review loop rejections
2. **Menos perguntas repetidas** — O agente para de perguntar coisas que já aprendeu
3. **Promoções acontecendo** — Learnings estão sendo promovidos a rules (sinal de maturidade)
4. **Satisfação do usuário** — Feedback implícito melhor (menos correções manuais)
5. **Consolidação natural** — Learnings redundantes estão sendo consolidados (sinal de uso saudável)
