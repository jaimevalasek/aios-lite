# Fase 4 — Especificação do Genoma 3.0

> **Arquivo a criar:** `docs/pt/genome-3.0-spec.md`  
> **Tipo:** Documentação de referência  
> **Uso:** Qualquer agente que lê ou gera genomas deve conhecer este formato

---

## Conteúdo do Arquivo

Criar `docs/pt/genome-3.0-spec.md` com o seguinte conteúdo:

```markdown
# Genoma 3.0 — Especificação de Formato

> Versão: 3.0  
> Status: Ativo  
> Compatibilidade: retrocompatível com Genoma 2.0  
> Data: 2026-03-13

---

## Visão Geral

O Genoma 3.0 estende o formato Genoma 2.0 com suporte a **persona-based profiling** — a capacidade de criar genomas baseados no perfil cognitivo de pessoas reais.

### Tipos de Genoma

| Tipo | Versão Mínima | Descrição |
|------|--------------|-----------|
| `domain` | 2.0 | Conhecimento de domínio puro |
| `function` | 2.0 | Capacidade funcional específica |
| `persona` | 3.0 | Perfil cognitivo de pessoa real |
| `hybrid` | 2.0+ | Combinação de tipos |

### Modos Hybrid

| Mode | Versão | Descrição |
|------|--------|-----------|
| `domain-function` | 2.0 | Combina domínio + função |
| `single-persona` | 3.0 | Persona + domínio de aplicação |
| `multi-persona` | 3.0 | Múltiplas personas com domínios atribuídos |

---

## Frontmatter

### Campos Genoma 2.0 (obrigatórios)

```yaml
---
genome: [slug]
domain: [human-readable]
type: [domain|function|persona|hybrid]
language: [en|pt-BR|es|fr|other]
depth: [surface|standard|deep]
version: [2|3]
format: [genome-v2|genome-v3]
evidence_mode: [inferred|evidenced|hybrid]
generated: [YYYY-MM-DD]
sources_count: [int]
mentes: [int]
skills: [int]
---
```

### Campos Genoma 3.0 (adicionais, obrigatórios quando type=persona)

```yaml
# Persona identification
persona_source: "[Full Name]"
persona_sources: ["Name 1", "Name 2"]  # only for multi-persona hybrid

# Psychometric profile (inferred)
disc: "[XY]"
enneagram: "[XwY]"
big_five: "O:[H] C:[M] E:[L] A:[L] N:[M]"
mbti: "[XXXX]"

# Quality
confidence: [low|medium|high]
profiler_report: "[path to enriched-profile.md]"

# Hybrid mode (only for type: hybrid)
hybrid_mode: [domain-function|single-persona|multi-persona]
```

---

## Seções Canônicas

### Seções Genoma 2.0 (presentes em todos os genomas)

| Seção | Obrigatória | Descrição |
|-------|-------------|-----------|
| `## O que saber` | Sim | Nós de conhecimento do domínio |
| `## Filosofias` | Sim | Crenças que guiam operação |
| `## Modelos mentais` | Sim | Lentes de pensamento |
| `## Heurísticas` | Sim | Atalhos de decisão |
| `## Frameworks` | Sim | Processos estruturados |
| `## Metodologias` | Sim | Abordagens amplas |
| `## Mentes` | Sim | Perspectivas cognitivas |
| `## Skills` | Sim | Capacidades operacionais |
| `## Evidence` | Sim | Fontes e referências |
| `## Application notes` | Sim | Notas de uso |

### Seções Genoma 3.0 (presentes apenas quando type=persona ou hybrid com persona)

| Seção | Obrigatória (persona) | Descrição |
|-------|----------------------|-----------|
| `## Perfil Cognitivo` | Sim | Perfis psicométricos completos com evidência |
| `## Estilo de Comunicação` | Sim | Análise de voz, tom, persuasão, expressões |
| `## Vieses e Pontos Cegos` | Sim | Biases, error patterns, compensações |
| `## Conflict Resolution` | Só multi-persona | Regras de hierarquia entre personas |

---

## Formato das Seções 3.0

### `## Perfil Cognitivo`

```markdown
## Perfil Cognitivo

> ⚠️ INFERRED PROFILE — Este perfil é inferido a partir de comportamento público observado.
> Não é uma avaliação psicométrica formal.

### Psychometric Summary

| Framework | Profile | Confidence | Key Evidence |
|-----------|---------|------------|--------------|
| DISC | [XY] — D:[1-10] I:[1-10] S:[1-10] C:[1-10] | [level] | [brief] |
| Enneagram | [XwY] — Instinct: [sp/so/sx] | [level] | [brief] |
| Big Five | O:[H/M/L] C:[H/M/L] E:[H/M/L] A:[H/M/L] N:[H/M/L] | [level] | [brief] |
| MBTI | [XXXX] — Dom: [func] Aux: [func] Inf: [func] | [level] | [brief] |

### Cognitive Tendencies

- Problem decomposition: [style]
- Information threshold: [style]
- Abstraction preference: [level]
- Time orientation: [orientation]
- Risk profile: [level + asymmetry]

### Values Hierarchy (Behavioral, not Stated)

1. [Value] — Evidence: [what decision showed this]
2. [Value] — Evidence: [...]
...

### Schwartz Values (Inferred)

[Table with all 10 values scored 1-10 with evidence]
```

### `## Estilo de Comunicação`

```markdown
## Estilo de Comunicação

### Voice Profile

| Dimension | Value | Evidence |
|-----------|-------|----------|
| Tone | [dominant tone] | [example] |
| Register | [formal/informal/mixed] | [example] |
| Assertiveness | [low/medium/high] | [frequency of definitive language] |
| Humor | [none/dry/frequent/signature] | [example] |
| Profanity | [never/rare/casual/frequent] | [example] |
| Sentence pattern | [short/medium/complex] | [sample] |
| Metaphor domain | [type] | [example] |
| Data usage | [rare/supporting/leading] | [example] |
| Story usage | [rare/illustrative/primary] | [example] |

### Persuasion Pattern

- Primary: [logos/pathos/ethos] — Evidence: [how they typically persuade]
- Secondary: [logos/pathos/ethos]
- Objection handling: [preemptive/reactive/reframe/dismiss]
- CTA style: [soft/direct/challenge/question]

### Signature Expressions

| Expression | Frequency | Context |
|------------|-----------|---------|
| "[phrase]" | [high/medium/low] | [when they use this] |
...

### Communication Under Pressure

- How tone changes under stress: [description]
- Defensive patterns: [description]
- Recovery pattern: [how they return to baseline]
```

### `## Vieses e Pontos Cegos`

```markdown
## Vieses e Pontos Cegos

### Cognitive Biases Observed

| Bias | Description | Self-Aware? | Evidence |
|------|-------------|-------------|----------|
| [bias] | [how it manifests] | [yes/no/partial] | [source] |
...

### Error Patterns

- Typical failure mode: [description + evidence]
- Over-confidence domains: [list]
- Under-confidence domains: [list]

### Compensatory Guidance

> Para agentes que usam este genoma: estas são instruções para compensar vieses conhecidos.

- When [trigger], note that this persona tends to [bias]. Consider [alternative perspective].
- When [trigger], this persona often misses [blind spot]. Actively check for [thing].
...
```

### `## Conflict Resolution` (Multi-Persona Only)

```markdown
## Conflict Resolution (Multi-Persona)

### Domain Assignments

| Domain | Primary Persona | Reasoning |
|--------|----------------|-----------|
| [domain] | [Person Name] | [why this persona leads here] |
...

### Conflict Rules

| Situation | Rule |
|-----------|------|
| Framework overlap | [resolution principle] |
| Style conflict | [resolution principle] |
| Value conflict | [resolution principle] |
| General tiebreaker | [resolution principle] |
```

---

## Compatibilidade

### Leitura de Genoma 3.0 por sistema 2.0

Um leitor de Genoma 2.0 vai ignorar:
- Campos extras no frontmatter (persona_source, disc, etc.)
- Seções extras (Perfil Cognitivo, Estilo de Comunicação, etc.)
- Vai ler normalmente as 10 seções canônicas

Isso significa que **todo Genoma 3.0 é automaticamente um Genoma 2.0 válido** — com informação extra que sistemas mais novos aproveitam.

### Migração de Genoma 2.0 para 3.0

Se um genoma 2.0 do tipo `domain` ou `function` existir e o usuário quiser adicionar persona:
1. Rodar o pipeline profiler para a persona
2. O forge gera as seções 3.0 e as adiciona ao genoma existente
3. Atualizar frontmatter: `version: 3`, `format: genome-v3`
4. Manter todas as seções 2.0 intactas

---

## Validação

Um Genoma 3.0 válido deve:

1. Ter todos os campos de frontmatter obrigatórios
2. Ter todas as 10 seções canônicas do Genoma 2.0
3. Se `type: persona` → ter as 3 seções 3.0 obrigatórias
4. Se `hybrid_mode: multi-persona` → ter `## Conflict Resolution`
5. Ter `evidence_mode: evidenced` ou `hybrid` quando `type: persona`
6. Ter `profiler_report` apontando para um arquivo existente
7. Ter pelo menos 1 mente definida em `## Mentes`
8. Ter pelo menos 1 framework definido em `## Frameworks`
```

---

## Notas de Implementação para o Codex

1. Este arquivo é documentação — não é um agente executável
2. Deve ser salvo em `docs/pt/genome-3.0-spec.md`
3. É referenciado por todos os 3 agentes do profiler
4. A seção de compatibilidade é crítica — não quebre Genoma 2.0
