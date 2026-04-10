# AIOX Squads vs AIOSON Squads — Análise Comparativa e Plano de Evolução

> **Autor:** Jaime Marcelo  
> **Data:** 2026-03-19  
> **Objetivo:** Documentar as funcionalidades do sistema de squads do AIOX (baseado no vídeo do Gabriel/Pedro Valério), comparar com o `@squad` do AIOSON, e propor melhorias para que o AIOSON iguale ou supere o AIOX.

---

## 1. Resumo Executivo

O AIOX possui um sistema maduro de squads com foco em **taxonomia rígida de executores** (worker, agente, clone, assistente, humano) e uma **árvore de decisão** clara para escolher qual tipo usar. O AIOSON já possui uma arquitetura de squads **mais rica em estrutura de arquivos** (manifests JSON, content blueprints, HTML deliverables, skills, MCPs, genomas), mas carece de alguns conceitos operacionais que o AIOX implementa bem.

**Veredicto:** O AIOSON já está à frente em arquitetura e extensibilidade. O que falta é incorporar os conceitos operacionais do AIOX que fazem a diferença na execução prática.

---

## 2. Taxonomia de Executores — AIOX

O AIOX define **5 tipos de executores** com uma árvore de decisão para seleção:

### 2.1 Worker
- **O que é:** Script determinístico (Python, bash, etc.)
- **Usa LLM:** Não
- **Custo:** ~Zero (apenas processamento local)
- **Quando usar:** Mesmo input → mesmo output, sempre
- **Exemplo:** Gerar PDF com layout fixo, transformar CSV, pipeline ETL puro
- **Analogia:** Esteira de fábrica

### 2.2 Agente
- **O que é:** IA com papel definido, comandos, workflows
- **Usa LLM:** Sim
- **Custo:** Custo de tokens LLM
- **Quando usar:** Não é determinístico, não precisa de metodologia/framework específico de pessoa real, não é domínio ultra-especializado
- **Exemplo:** Agente de geopolítica genérico, copywriter genérico
- **Analogia:** Funcionário com job description

### 2.3 Clone
- **O que é:** Réplica cognitiva de uma pessoa real (92-95% fidelidade)
- **Usa LLM:** Sim
- **Custo:** Custo de tokens LLM
- **Quando usar:** Existe uma metodologia/framework de uma pessoa específica que precisa ser replicado
- **Exemplo:** Clone do Neil Patel para análise de marketing, clone do Seth Godin para branding
- **Analogia:** Consultor digital
- **Pipeline de criação:** 3 agentes (`profiler-researcher`, `profiler-enricher`, `profiler-forge`) + teste de fidelidade

### 2.4 Assistente (adição do Gabriel, fora do AIOX core)
- **O que é:** Especialista de domínio com perfil comportamental DISC aplicado
- **Usa LLM:** Sim
- **Custo:** Custo de tokens LLM
- **Quando usar:** Domínio especializado que não precisa de clone de pessoa real, mas beneficia de perfil comportamental adequado à função
- **Exemplo:** Tributarista com perfil analítico/conforme (orientado a precisão e tarefas)
- **Diferencial:** Combina especialização técnica + perfil comportamental ideal para a função

### 2.5 Squad
- **O que é:** Time que agrupa todos os tipos de executores com uma missão compartilhada
- **Usa LLM:** Depende da composição
- **Custo:** Soma dos custos dos executores
- **Quando usar:** Conjunto de tasks com missão compartilhada
- **Execução:** Sequencial ou paralela, dependendo das dependências entre etapas

### 2.6 Humano (human-in-the-loop)
- **O que é:** Ponto de decisão onde um ser humano precisa intervir
- **Quando usar:** Decisões críticas com accountability (legal, financeiro, societário)
- **Detalhe importante:** Pode ter condicionais graduais (até X valor → agente decide; acima de X → humano aprova)

---

## 3. Árvore de Decisão — AIOX

```
TAREFA
  ├── É determinística? (mesmo input → mesmo output)
  │   ├── SIM → WORKER
  │   │   ├── Precisa de API externa? → Worker com API
  │   │   └── Não → Script local
  │   └── NÃO ↓
  ├── Precisa de julgamento humano crítico?
  │   ├── SIM → HUMANO
  │   └── NÃO ↓
  ├── Existe metodologia/framework de pessoa real?
  │   ├── SIM → CLONE
  │   └── NÃO ↓
  ├── É domínio especializado?
  │   ├── SIM → ASSISTENTE
  │   └── NÃO → AGENTE
  │
  └── É conjunto de tasks com missão compartilhada? → SQUAD
```

---

## 4. Anatomia de um Squad — AIOX

### Estrutura de pastas do AIOX:
```
.cloud/squads/{squad-name}/
├── squad.yml          # Manifesto (obrigatório) — nome, versão, componentes
├── README.md          # Documentação
├── agents/            # Personas de IA (agentes, clones, assistentes)
│   ├── agent-1.md
│   ├── agent-2.md
│   └── clone-1.md     # Pode referenciar clone externo
├── tasks/             # Fluxos executáveis (receitas, procedimentos)
│   ├── task-1.md
│   └── task-2.md
├── workflows/         # Pipelines completos com fases, agentes, durações
│   └── main-workflow.md
├── checklists/        # Validação de qualidade pós-execução
├── templates/         # Documentos base (contratos, briefings)
├── tools/             # Workers/scripts determinísticos (Python, etc.)
└── config/            # Stacks, padrões, configurações
```

### Manifesto YAML (squad.yml):
```yaml
name: content-studio
description: Squad para produção de vídeo no YouTube
version: 1.0.0
components:
  agents:
    - scriptwriter
    - title-generator
    - copywriter
  tasks:
    - create-script
    - analyze-channel
  workflows:
    - full-production-pipeline
  tools:
    - youtube-api-fetcher
```

---

## 5. Comparação Detalhada — AIOX vs AIOSON

### 5.1 O que o AIOSON já tem e o AIOX não tem

| Feature | AIOSON | AIOX |
|---------|--------|------|
| **Content Blueprints** | Sim — schema declarativo para deliverables com layoutType, blockTypes | Não — output é livre |
| **Squad Manifest JSON** | Sim — schema versionado com storagePolicy, skills, MCPs | Apenas YAML básico |
| **Genome System** | Sim — binding de genomas a squads/agentes com audit trail e hash | Não — clones são manuais |
| **Skills como pacotes** | Sim — skills instaláveis por squad em `skills/` | Não — tools são scripts soltos |
| **HTML Deliverables** | Sim — HTML obrigatório com Tailwind+Alpine.js após cada round | Não |
| **Subagent Policy** | Sim — regras explícitas de quando usar subagentes temporários | Não formalizado |
| **MCP declarations** | Sim — MCPs declarados no manifest com justificativa | Não |
| **Design Doc por squad** | Sim — mini design-doc e readiness antes de criar | Não |
| **Content Items model** | Sim — content_key com content.json + index.html | Não |
| **Dashboard integration** | Sim — app separado para visualizar execuções | Não mencionado |
| **Artisan integration** | Sim — criação de squad a partir de PRD do Artisan | Não |
| **Project rules injection** | Sim — regras globais injetadas em cada agente | Não formalizado |
| **Parallel squads** | Sim — suporte explícito a múltiplos squads no mesmo projeto | Não mencionado |
| **Warm-up round** | Sim — obrigatório após criação | Não mencionado |

### 5.2 O que o AIOX tem e o AIOSON ainda não tem

| Feature | AIOX | AIOSON Atual | Gap |
|---------|------|-------------|-----|
| **Taxonomia de executores** | 5 tipos formais (worker, agente, clone, assistente, humano) | Apenas "executors" genéricos no manifest | **CRÍTICO** |
| **Árvore de decisão** | Framework formal para escolher tipo de executor | Não existe — o `@squad` trata tudo como "agente" | **ALTO** |
| **Workers (determinísticos)** | Scripts Python/bash sem LLM, custo zero | Não diferenciado — tudo passa por LLM | **ALTO** |
| **Human-in-the-loop** | Gates de aprovação com condicionais graduais | Não formalizado como tipo de executor | **MÉDIO** |
| **Tasks separadas de prompts** | Tasks em `/tasks/` referenciadas pelo agente | Tasks existem mas não há separação clara task vs prompt | **MÉDIO** |
| **Workflows com fases** | Workflow detalhado (gatilho, duração, fases, agentes por fase) | Não tem modelo de workflow com fases | **ALTO** |
| **Checklists de qualidade** | Checklist pós-execução como componente do squad | Não formalizado | **MÉDIO** |
| **Execução sequencial/paralela** | Explícito no workflow (handoff entre fases) | Não modelado | **ALTO** |
| **Meta-orquestrador (Nexus)** | Hub central que conhece todos os agentes e roteia automaticamente | Não — cada squad é independente | **MÉDIO** |
| **Squads temporários** | Criação ad-hoc via Nexus para tarefas pontuais | Não suportado | **BAIXO** |
| **Perfil comportamental DISC** | Aplicado a assistentes para match função↔perfil | Não existe | **BAIXO** |
| **Análise/Validate/Extend** | Comandos pós-criação para melhorar o squad | Existem (`analyze`, `validate`, `extend`, `repair`) | **OK** |

---

## 6. Plano de Evolução — O que Incorporar no AIOSON

### 6.1 PRIORIDADE 1 — Taxonomia de Executores

**Objetivo:** Diferenciar formalmente os tipos de executores no AIOSON.

**Proposta de mudança no `squad.manifest.json`:**

```json
{
  "executors": [
    {
      "slug": "pdf-generator",
      "title": "PDF Report Generator",
      "type": "worker",
      "runtime": "python",
      "entrypoint": ".aioson/squads/{slug}/tools/generate-pdf.py",
      "deterministic": true,
      "usesLLM": false,
      "cost": "zero",
      "input": { "type": "json", "schema": "report-data.schema.json" },
      "output": { "type": "file", "format": "pdf" }
    },
    {
      "slug": "copywriter",
      "title": "Copywriter",
      "type": "agent",
      "role": "Cria copies persuasivas para landing pages",
      "file": ".aioson/squads/{slug}/agents/copywriter.md",
      "deterministic": false,
      "usesLLM": true,
      "skills": ["persuasion-frameworks"],
      "genomes": []
    },
    {
      "slug": "neil-patel",
      "title": "Neil Patel Clone",
      "type": "clone",
      "role": "Análise de marketing digital e SEO",
      "file": ".aioson/squads/{slug}/agents/neil-patel.md",
      "genomeSource": ".aioson/genomes/neil-patel/genome.md",
      "fidelityScore": 0.93,
      "deterministic": false,
      "usesLLM": true,
      "personReal": true
    },
    {
      "slug": "tax-specialist",
      "title": "Tributarista",
      "type": "assistant",
      "role": "Especialista em tributação brasileira",
      "file": ".aioson/squads/{slug}/agents/tax-specialist.md",
      "domain": "tributário-fiscal-brasileiro",
      "behavioralProfile": "analytical-compliant",
      "deterministic": false,
      "usesLLM": true
    },
    {
      "slug": "budget-approval",
      "title": "Aprovação de Orçamento",
      "type": "human-gate",
      "trigger": "budget_increase > 500",
      "escalation": {
        "below": 500,
        "action": "auto-approve"
      },
      "above": {
        "threshold": 500,
        "action": "require-human-approval",
        "notifyVia": "slack"
      }
    }
  ]
}
```

**Mudança no `agents.md`:**

```markdown
## Permanent executors
### Workers (determinísticos, sem LLM)
- pdf-generator — Gera relatórios PDF com layout fixo

### Agents (IA com papel definido)
- @copywriter — Cria copies persuasivas

### Clones (réplica cognitiva)
- @neil-patel — Análise de marketing (fidelidade: 93%)

### Assistants (especialista de domínio)
- @tax-specialist — Tributação brasileira (perfil: analítico)

### Human Gates (aprovação humana)
- budget-approval — Orçamento acima de R$500 requer aprovação
```

### 6.2 PRIORIDADE 2 — Árvore de Decisão no @squad

**Objetivo:** Quando o usuário descreve uma necessidade, o `@squad` deve classificar automaticamente cada executor usando a árvore de decisão.

**Proposta:** Adicionar uma seção no `squad.md` do AIOSON:

```markdown
## Executor classification

Before generating executors, classify each task using this decision tree:

1. Is the task deterministic (same input → same output)?
   - YES → type: worker (script, no LLM)
   - NO → continue
2. Does it require critical human judgment (legal, financial, accountability)?
   - YES → type: human-gate
   - NO → continue
3. Does it require replicating a specific real person's methodology?
   - YES → type: clone (requires genome)
   - NO → continue
4. Is it a specialized domain requiring deep expertise?
   - YES → type: assistant
   - NO → type: agent

Apply this classification to every executor before writing the files.
Show the classification to the user for confirmation.
```

### 6.3 PRIORIDADE 3 — Workers como Componente Formal

**Objetivo:** O AIOSON já tem `tools/` no squad, mas não diferencia workers de ferramentas auxiliares.

**Proposta de estrutura expandida:**

```
.aioson/squads/{slug}/
├── agents/          # Agentes, clones, assistentes (usam LLM)
├── workers/         # Scripts determinísticos (NÃO usam LLM)
│   ├── generate-pdf.py
│   ├── compress-images.sh
│   └── fetch-youtube-metrics.py
├── tools/           # Ferramentas auxiliares que agentes podem invocar
├── tasks/           # Procedimentos executáveis
├── workflows/       # Pipelines com fases
└── ...
```

**Diferença chave:**
- `workers/` → Execução autônoma, determinística, sem LLM
- `tools/` → Invocados por agentes durante execução com LLM

### 6.4 PRIORIDADE 4 — Workflows com Fases e Handoffs

**Objetivo:** O AIOX modela workflows com fases detalhadas, agentes envolvidos, durações e dependências. O AIOSON precisa desse modelo.

**Proposta de formato para `.aioson/squads/{slug}/workflows/main.md`:**

```markdown
# Workflow: Landing Page Sprint

## Trigger
Usuário solicita criação de landing page

## Estimated Duration
30-60 min (primeira execução)

## Execution Mode
sequential (fases dependem da anterior)

## Phases

### Phase 1 — Análise da Oferta
- **Executor:** @lead-strategist (agent)
- **Input:** Briefing do cliente
- **Output:** Persona, proposta de valor, objeções, gatilhos mentais
- **Handoff:** output → Phase 2 input

### Phase 2 — Geração de Copy
- **Executor:** @lead-strategist (agent)
- **Input:** Análise da Phase 1
- **Output:** Copy completa (hero, problema, solução, prova social, oferta, FAQ, CTA)
- **Handoff:** output → Phase 3 input

### Phase 3 — Design e Implementação
- **Executor:** @pixel-designer (agent)
- **Input:** Copy da Phase 2 + referências visuais (se houver)
- **Output:** index.html completo com Tailwind CSS
- **Handoff:** output → Phase 4 input

### Phase 4 — Otimização
- **Executor:** image-compressor (worker) + lighthouse-audit (worker)
- **Input:** HTML da Phase 3
- **Output:** HTML otimizado + relatório de performance
- **Human Gate:** Se score Lighthouse < 80 → notificar humano

### Phase 5 — Review Final
- **Executor:** @orquestrador (agent)
- **Input:** Todos os outputs anteriores
- **Output:** Versão final + session HTML
- **Checklist:** SEO, mobile, performance, acessibilidade, copy review
```

**Proposta de `workflow` no manifest JSON:**

```json
{
  "workflows": [
    {
      "slug": "create-landing-page",
      "title": "Pipeline completo de Landing Page",
      "trigger": "user requests landing page creation",
      "executionMode": "sequential",
      "estimatedDuration": "30-60min",
      "phases": [
        {
          "id": "analysis",
          "title": "Análise da Oferta",
          "executor": "lead-strategist",
          "executorType": "agent",
          "dependsOn": [],
          "output": "offer-analysis.md"
        },
        {
          "id": "copy",
          "title": "Geração de Copy",
          "executor": "lead-strategist",
          "executorType": "agent",
          "dependsOn": ["analysis"],
          "output": "landing-page-copy.md"
        },
        {
          "id": "design",
          "title": "Design e Implementação",
          "executor": "pixel-designer",
          "executorType": "agent",
          "dependsOn": ["copy"],
          "output": "index.html"
        },
        {
          "id": "optimize",
          "title": "Otimização",
          "executor": ["image-compressor", "lighthouse-audit"],
          "executorType": "worker",
          "dependsOn": ["design"],
          "parallel": true,
          "humanGate": {
            "condition": "lighthouse_score < 80",
            "action": "require-approval"
          }
        },
        {
          "id": "review",
          "title": "Review Final",
          "executor": "orquestrador",
          "executorType": "agent",
          "dependsOn": ["optimize"],
          "checklist": "quality-checklist.md"
        }
      ]
    }
  ]
}
```

### 6.5 PRIORIDADE 5 — Human-in-the-Loop com Condicionais

**Objetivo:** Formalizar gates de aprovação humana com regras graduais.

**Proposta de seção no `squad.md` do AIOSON:**

```markdown
## Human gates

When a task involves critical decisions, use graduated human gates:

### Gate types
- **auto**: Agent decides autonomously (low risk)
- **consult**: Agent consults another specialist agent before deciding (medium risk)  
- **approve**: Human must approve before proceeding (high risk)
- **block**: Task cannot proceed without explicit human authorization (critical)

### Gate configuration in workflow
```yaml
humanGates:
  - id: budget-gate
    trigger: "budget_change"
    rules:
      - condition: "amount <= 500"
        action: auto
      - condition: "amount > 500 AND amount <= 2000"
        action: consult
        consultAgent: "@financial-analyst"
      - condition: "amount > 2000"
        action: approve
        notifyVia: ["slack", "email"]
  - id: legal-gate
    trigger: "contract_modification"
    action: block
    reason: "Alterações contratuais requerem aprovação jurídica"
```
```

### 6.6 PRIORIDADE 6 — Checklists como Componente

**Objetivo:** Adicionar checklists formais de qualidade pós-execução.

**Proposta de `.aioson/squads/{slug}/checklists/quality.md`:**

```markdown
# Checklist: Quality Review

## SEO
- [ ] Title tag presente e otimizado (< 60 chars)
- [ ] Meta description presente (< 160 chars)
- [ ] H1 único na página
- [ ] Alt text em todas as imagens
- [ ] URLs amigáveis

## Mobile
- [ ] Responsivo em 320px, 768px, 1024px
- [ ] Touch targets >= 44px
- [ ] Fonte legível sem zoom (>= 16px)

## Performance
- [ ] Imagens comprimidas (< 200KB cada)
- [ ] CSS inline ou CDN (sem build step)
- [ ] Lighthouse score >= 80

## Acessibilidade
- [ ] Contraste adequado (WCAG AA)
- [ ] Navegação por teclado funcional
- [ ] Labels em formulários

## Copy
- [ ] CTA claro e visível
- [ ] Proposta de valor no primeiro viewport
- [ ] Prova social presente
- [ ] Objeções endereçadas
```

---

## 7. Mapa de Implementação

### Fase 1 — Fundação (implementar primeiro)
1. **Atualizar schema do `squad.manifest.json`** — adicionar campo `type` nos executors com valores: `worker`, `agent`, `clone`, `assistant`, `human-gate`
2. **Adicionar árvore de decisão** no prompt do `@squad` para classificação automática
3. **Criar pasta `workers/`** na estrutura do squad como diretório formal

### Fase 2 — Workflows (implementar segundo)
4. **Criar modelo de workflow com fases** — arquivo `.md` + seção no manifest JSON
5. **Modelar execução sequencial vs paralela** com `dependsOn` e `parallel`
6. **Adicionar human gates** como tipo de executor com regras condicionais

### Fase 3 — Qualidade (implementar terceiro)
7. **Formalizar checklists** como componente do squad
8. **Adicionar warm-up verificação** — após criar o squad, validar classificação de executores
9. **Scoring de cobertura** — como o AIOX faz (% de tasks, workflows, checklists existentes)

### Fase 4 — Avançado (futuro)
10. **Squads temporários** — criação ad-hoc sem persistência
11. **Meta-orquestrador** — agente central que conhece todos os squads e roteia
12. **Perfil comportamental** — DISC ou similar para assistentes

---

## 8. Exemplo Prático — Landing Page Sprint (AIOSON Enhanced)

### Como ficaria o squad com as melhorias aplicadas:

```
.aioson/squads/landing-page-sprint/
├── squad.md                    # Metadata
├── squad.manifest.json         # Manifest completo
├── docs/
│   ├── design-doc.md           # Mini design-doc
│   └── readiness.md            # Readiness check
├── agents/
│   ├── agents.md               # Manifesto do time
│   ├── orquestrador.md         # Coordenador
│   ├── lead-strategist.md      # Agente de estratégia + copy
│   └── pixel-designer.md       # Agente de design + implementação
├── workers/
│   ├── image-compressor.py     # Worker: comprimir imagens (determinístico)
│   ├── lighthouse-audit.sh     # Worker: auditoria automatizada
│   └── screenshot-capture.py   # Worker: capturar screenshots
├── tasks/
│   ├── analyze-offer.md        # Task: análise de oferta
│   ├── generate-copy.md        # Task: gerar copy completa
│   ├── build-page.md           # Task: implementar HTML
│   ├── optimize.md             # Task: otimizar performance
│   └── final-review.md         # Task: review consolidado
├── workflows/
│   └── create-landing-page.md  # Pipeline completo com fases
├── checklists/
│   └── quality.md              # Checklist de qualidade
├── templates/
│   ├── client-briefing.md      # Template de briefing
│   └── reference-html/         # HTMLs de referência visual
├── skills/
│   └── persuasion/
│       └── copywriting-frameworks.md
└── tools/
    └── youtube-api.py          # Ferramenta que agentes podem invocar
```

---

## 9. Mudanças Necessárias no `@squad` (squad.md do AIOSON)

### Seções a adicionar no prompt do `@squad`:

1. **Executor classification** — árvore de decisão (ver seção 6.2)
2. **Worker generation** — quando tipo=worker, gerar script Python/bash em vez de .md
3. **Workflow phases** — ao criar squad, perguntar se há pipeline com fases
4. **Human gates** — ao detectar decisões críticas, sugerir gates
5. **Checklists** — ao final da criação, gerar checklist baseado no domínio
6. **Execution mode** — ao gerar workflow, classificar se é sequencial ou paralelo

### Mudanças no Step 1 (Generate squad manifesto):

Adicionar no `agents.md`:
```markdown
## Executor types
- Workers: [count] (determinísticos, sem LLM)
- Agents: [count] (IA com papel definido)
- Clones: [count] (réplica cognitiva)
- Assistants: [count] (especialista de domínio)
- Human Gates: [count] (aprovação humana)
```

### Mudanças no Step 2 (Generate specialists):

Antes de gerar o arquivo do executor, classificar:
- Se `type: worker` → gerar script em `workers/` (Python ou bash)
- Se `type: agent` → gerar .md em `agents/` (fluxo atual)
- Se `type: clone` → gerar .md em `agents/` + referenciar genome
- Se `type: assistant` → gerar .md em `agents/` + incluir domínio e perfil
- Se `type: human-gate` → registrar no manifest + no workflow

---

## 10. Conclusão

O AIOSON já tem uma **base arquitetural superior** ao AIOX em vários aspectos (content blueprints, genomas, manifest JSON, skills, MCPs, dashboard). O que falta é justamente o que o AIOX faz bem na **camada operacional**:

1. **Diferenciar tipos de executores** — nem tudo precisa de LLM
2. **Árvore de decisão formal** — guiar a classificação automaticamente
3. **Workers como cidadãos de primeira classe** — scripts determinísticos com custo zero
4. **Workflows com fases e handoffs** — modelar dependências e execução
5. **Human gates com condicionais** — escalar para humano só quando necessário
6. **Checklists de qualidade** — validação pós-execução

Implementando essas 6 melhorias, o AIOSON não só iguala o AIOX como o **supera significativamente**, porque combina a estrutura operacional do AIOX com toda a extensibilidade que o AIOSON já possui (genomas, content blueprints, skills, MCPs, dashboard, artisan integration).
