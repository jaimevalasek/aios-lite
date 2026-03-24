# Análise: O que pode ser JS (script) vs. o que precisa ser LLM

> Referência para todas as fases — consulte antes de implementar

## Filosofia

> "Se o output é sempre o mesmo para o mesmo input → JS.
> Se o output depende de julgamento, criatividade, ou contexto → LLM.
> Se é mecânico mas toca em arquivos que o LLM precisa entender → hybrid."

O espírito criativo aqui é: **não desperdiçar LLM em trabalho mecânico, e não desperdiçar JS em trabalho que precisa de alma.**

## Mapa completo

### Já é JS hoje (não tocar)

| Funcionalidade | Arquivo | Por que é JS |
|---------------|---------|-------------|
| Listar squads | `squad-status.js` | Leitura de filesystem + SQLite |
| Validar manifest | `squad-validate.js` | Regras fixas, schema checking |
| Health check | `squad-doctor.js` | Checklist determinístico |
| Export tarball | `squad-export.js` | Empacotamento mecânico |
| Pipeline DAG | `squad-pipeline.js` | Topological sort (algoritmo) |
| Genome repair | `squad-repair-genomes.js` | Migração de schema |
| Agent scaffolding | `squad-agent-create.js` | Template rendering |

### Deve virar JS (hoje é LLM desnecessariamente)

| Funcionalidade | Hoje | Proposta | Economia |
|---------------|------|----------|----------|
| Slug generation | LLM gera no squad.md | JS: transliterate + kebab-case + truncate | ~100 tokens/call |
| Directory scaffolding | LLM cria pastas no squad-create | JS: mkdir -p com template | ~200 tokens/call |
| Manifest template | LLM gera JSON do zero | JS: template + merge | ~500 tokens/call |
| Coverage/quality score | LLM conta checkboxes | JS: `squad-score.js` | ~300 tokens/call |
| Format injection | LLM lê e cola formato | JS: concatenar .md no prompt | ~200 tokens/call |
| Investigation indexing | LLM registra no SQLite | JS: parse .md headers + insert | ~200 tokens/call |
| Review retry tracking | LLM conta attempts | JS: SQLite counter | ~100 tokens/call |

**Total estimado de economia: ~1600 tokens por squad creation** — parece pouco isolado, mas em 100 squads são 160k tokens (~$2.40 em Opus).

### Deve continuar LLM (JS não consegue fazer bem)

| Funcionalidade | Por que LLM |
|---------------|-------------|
| Decidir roles do squad | Requer entendimento do domínio |
| Gerar conteúdo dos agents | Criatividade + domain knowledge |
| Investigação @orache | Interpretação de search results |
| Review de output | Julgamento de qualidade |
| Decidir task decomposition | Análise de complexidade do role |
| Gerar quality criteria | Requer domain expertise |
| Genome creation/application | Síntese de evidências cognitivas |
| Profiling pipeline | Análise de persona |
| Design doc derivation | Síntese de múltiplas fontes |
| Warm-up round | Simulação de perspectivas |

### Hybrid (JS orquestra, LLM executa)

| Funcionalidade | Parte JS | Parte LLM |
|---------------|----------|-----------|
| Squad creation flow | Scaffolding, manifest template, directory creation | Conteúdo dos agents, decisions |
| Pipeline execution | Topological sort, handoff tracking, retry counting | Decisão do próximo step, routing |
| Investigation | Indexing, completeness score, SQLite registration | Actual investigation content |
| Review loops | Retry counting, status tracking, escalation rules | Quality judgment, feedback generation |
| Quality scoring D4 | 15/25 pts mecânicos | 10/25 pts precisam de julgamento |

## Scripts JS a criar (novos)

### 1. `squad-investigate.js` (Fase 1)
```
Subcomandos: list, show, link, score
Responsabilidade: gestão de investigações, não a investigação em si
Tabela: squad_investigations
```

### 2. `squad-score.js` (Fase 7)
```
Subcomandos: (nenhum — é um único comando)
Responsabilidade: calcular quality score 100% deterministico
Tabelas: squad_scores
Output: score breakdown + grade + quick wins
```

### 3. Utilities para o squad creation (embeddable, não CLI)
```javascript
// Em src/utils/squad-helpers.js (NOVO)

// Slug generation (tira do LLM)
function generateSquadSlug(name) { ... }

// Directory scaffolding (tira do LLM)
function scaffoldSquadDirs(rootDir, slug) { ... }

// Manifest template (tira do LLM)
function generateManifestTemplate(blueprint) { ... }

// Investigation completeness
function scoreInvestigation(reportPath) { ... }

// Format catalog lookup
function lookupFormats(catalogPath, category) { ... }
```

## Ideias criativas além do convencional

### 1. "Adversarial warm-up" (Fase 2 enhancement)
Em vez do warm-up genérico onde cada executor dá sua opinião, fazer um **warm-up adversarial**: cada executor critica o plano do anterior. Isso expõe tensões reais antes de começar a trabalhar.

```
@pesquisador: "O goal do squad é X. Minha leitura é Y."
@copywriter: "Concordo com o pesquisador em A, mas discordo em B porque..."
@editor: "Nenhum dos dois considerou C, que é o fator mais crítico."
@orquestrador: "As tensões são: A vs B vs C. Resolução proposta: ..."
```

### 2. "Investigation confidence decay" (Fase 1 enhancement)
Investigações perdem valor com o tempo. Um investigation report de 6 meses atrás sobre YouTube pode estar desatualizado. O `squad-investigate.js` pode calcular:

```javascript
function investigationFreshness(createdAt) {
  const daysSince = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
  if (daysSince < 30) return { freshness: 'fresh', decay: 0 };
  if (daysSince < 90) return { freshness: 'aging', decay: 0.2 };
  if (daysSince < 180) return { freshness: 'stale', decay: 0.5 };
  return { freshness: 'expired', decay: 0.8 };
}
```

### 3. "Executor DNA fingerprint" (Fase 4 enhancement)
Cada executor gerado recebe um "DNA fingerprint" — um hash de suas características que permite comparar com executores de outros squads. Se dois executores em squads diferentes têm DNA similar (>80%), sugerir consolidação ou extração como template.

### 4. "Quality momentum" (Fase 7 enhancement)
Rastrear o quality score ao longo do tempo. Se o score sobe consistentemente (squad está sendo melhorado), mostrar momentum positivo. Se cai, alertar.

```
Squad quality momentum: ↑ (+12 pts in last 3 updates)
Trajectory: C → B → A (on track for S in next update)
```

### 5. "Investigation as competitive advantage" (Fase 1 + 5)
Quando @orache investiga um domínio, as descobertas podem ser exportadas como um "domain pack" — um pacote reutilizável que qualquer squad naquele domínio pode importar. Isso transforma investigação em asset, não em custo descartável.

### 6. "Executor maturity lifecycle" (Fase 4 enhancement)
Cada executor começa como "nascent" (recém-criado, genérico). Conforme é usado e refinado:
- nascent → developing (após 3 sessions com feedback)
- developing → mature (após tasks decompostas + quality criteria)
- mature → expert (após investigation + genome + review loops)

O maturity level aparece no squad status e doctor.

### 7. "Silent veto" (Fase 2 enhancement)
Veto conditions que checam automaticamente sem gastar uma rodada de review:
- Contagem de palavras (mínimo/máximo) → JS pode verificar
- Presença de placeholder text → JS regex
- Formato do output (JSON válido, markdown válido) → JS parse
- Links quebrados → JS fetch + check status

Esses "silent vetos" rodam ANTES do review LLM, economizando tokens em outputs claramente ruins.

## Regra final

> Para cada feature nova, pergunte: "Isso faria um squad genérico se transformar em um squad excepcional?" Se a resposta é "faria o squad ser bom", reconsidere. Só implemente se a resposta é "faria o squad ser **melhor do que um humano especialista faria sozinho**".
