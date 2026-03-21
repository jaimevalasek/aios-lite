# Genome 3.0 — Especificação de Formato

> Versão: 3.0  
> Status: Ativo  
> Compatibilidade: retrocompatível com Genome 2.0  
> Data: 2026-03-13

---

## Visão geral

O Genome 3.0 estende o Genome 2.0 com suporte a profiling de persona baseado em evidências. O objetivo é representar não só o que um domínio exige, mas como uma pessoa específica pensa sobre esse domínio.

O formato mantém as 10 seções canônicas do Genome 2.0 e adiciona seções específicas para:

- perfil cognitivo
- estilo de comunicação
- vieses e blind spots
- resolução de conflito entre personas, quando houver multi-persona

---

## Tipos de genome

| Tipo | Versão mínima | Descrição |
|------|---------------|-----------|
| `domain` | 2.0 | Conhecimento de domínio puro |
| `function` | 2.0 | Capacidade funcional específica |
| `persona` | 3.0 | Perfil cognitivo de pessoa real |
| `hybrid` | 2.0+ | Combinação de tipos |

### Modos de `hybrid`

| Modo | Versão | Descrição |
|------|--------|-----------|
| `domain-function` | 2.0 | Domínio + função |
| `single-persona` | 3.0 | Persona + domínio |
| `multi-persona` | 3.0 | Múltiplas personas com papéis atribuídos |

---

## Frontmatter

### Campos base

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

### Campos adicionais de persona

Obrigatórios quando `type: persona` e recomendados em `hybrid` com persona:

```yaml
persona_source: "[Full Name]"
persona_sources: ["Name 1", "Name 2"]
disc: "[XY]"
enneagram: "[XwY]"
big_five: "O:[H] C:[M] E:[L] A:[L] N:[M]"
mbti: "[XXXX]"
confidence: [low|medium|high]
profiler_report: ".aioson/profiler-reports/[slug]/enriched-profile.md"
hybrid_mode: [domain-function|single-persona|multi-persona]
```

### Exemplo de frontmatter persona

```yaml
---
genome: stefan-georgi-copywriting
domain: "Stefan Georgi — Direct Response Copywriting"
type: persona
language: pt-BR
depth: deep
version: 3
format: genome-v3
evidence_mode: evidenced
generated: 2026-03-13
sources_count: 27
mentes: 4
skills: 8
persona_source: "Stefan Georgi"
disc: "DI"
enneagram: "3w4"
big_five: "O:H C:H E:H A:M N:L"
mbti: "ENTJ"
confidence: medium
profiler_report: ".aioson/profiler-reports/stefan-georgi/enriched-profile.md"
---
```

---

## Seções canônicas

### Obrigatórias em todo genome

| Seção | Descrição |
|-------|-----------|
| `## O que saber` | Nós de conhecimento do domínio |
| `## Filosofias` | Crenças e axiomas operacionais |
| `## Modelos mentais` | Lentes cognitivas reutilizáveis |
| `## Heurísticas` | Atalhos de decisão |
| `## Frameworks` | Processos estruturados |
| `## Metodologias` | Abordagens amplas |
| `## Mentes` | Perspectivas cognitivas acionáveis |
| `## Skills` | Capacidades operacionais |
| `## Evidence` | Fontes e rastreabilidade |
| `## Application notes` | Notas de uso e combinação |

### Obrigatórias em persona

| Seção | Obrigatória | Descrição |
|-------|-------------|-----------|
| `## Perfil Cognitivo` | Sim | Resumo psicométrico inferido com evidência |
| `## Estilo de Comunicação` | Sim | Voz, persuasão e padrões retóricos |
| `## Vieses e Pontos Cegos` | Sim | Biases, erros recorrentes e compensações |
| `## Conflict Resolution` | Só multi-persona | Hierarquia e desempate entre personas |

---

## Estrutura recomendada das novas seções

### `## Perfil Cognitivo`

Use esta ordem:

1. aviso explícito de que o perfil é inferido
2. tabela de resumo psicométrico
3. tendências cognitivas
4. hierarquia de valores
5. Schwartz Values inferidos

Exemplo:

```markdown
## Perfil Cognitivo

> PERFIL INFERIDO. Não é avaliação psicométrica formal.

### Psychometric Summary

| Framework | Profile | Confidence | Key Evidence |
|-----------|---------|------------|--------------|
| DISC | DC — D:8 I:5 S:3 C:8 | medium | alta assertividade + frameworks |
| Enneagram | 3w4 | medium | foco em performance e diferenciação |
| Big Five | O:H C:H E:M A:L N:L | medium | discurso ambicioso e baixo hedge |
| MBTI | ENTJ | low | visão estratégica + decisão direta |
```

### `## Estilo de Comunicação`

Cobrir:

- tom
- registro
- assertividade
- humor
- palavrão
- padrão de frase
- metáforas
- uso de dados
- uso de histórias
- padrão de persuasão
- expressões recorrentes
- comportamento sob pressão

Exemplo:

```markdown
## Estilo de Comunicação

### Voice Profile

| Dimension | Value | Evidence |
|-----------|-------|----------|
| Tone | direto | calls e entrevistas |
| Register | técnico-acessível | breakdowns públicos |
| Assertiveness | high | pouca linguagem hedging |
```

### `## Vieses e Pontos Cegos`

Cobrir:

- vieses cognitivos observados
- padrões típicos de erro
- áreas de excesso de confiança
- áreas de subconfiança
- guidance compensatório para agentes que aplicarem o genome

### `## Conflict Resolution`

Obrigatória quando `hybrid_mode: multi-persona`.

Cobrir:

- domínio que cada persona lidera
- regra de desempate
- como resolver conflito de framework
- como resolver conflito de estilo
- princípio geral de tiebreaker

---

## Regras de compatibilidade

### Leitura por sistema 2.0

Um leitor de Genome 2.0 deve conseguir:

- ignorar campos extras no frontmatter
- ignorar seções extras
- continuar lendo normalmente as 10 seções canônicas

Isso torna o Genome 3.0 retrocompatível por adição.

### Migração de 2.0 para 3.0

Quando um genome 2.0 recebe camada de persona:

1. preservar o slug base quando fizer sentido
2. elevar `version` para `3`
3. trocar `format` para `genome-v3`
4. adicionar os campos de persona no frontmatter
5. manter as 10 seções canônicas
6. acrescentar as novas seções sem remover conteúdo anterior útil

### Quick mode

Quando um genome persona for gerado sem profiler completo:

- `evidence_mode: inferred`
- `confidence: low`
- incluir disclaimer explícito em `## Application notes`

---

## Meta file recomendado

Além do markdown, recomenda-se um `.meta.json` correspondente com:

```json
{
  "genome": "stefan-georgi-copywriting",
  "domain": "Stefan Georgi — Direct Response Copywriting",
  "type": "persona",
  "version": 3,
  "format": "genome-v3",
  "language": "pt-BR",
  "depth": "deep",
  "evidence_mode": "evidenced",
  "persona_source": "Stefan Georgi",
  "disc": "DI",
  "enneagram": "3w4",
  "big_five": "O:H C:H E:H A:M N:L",
  "mbti": "ENTJ",
  "confidence": "medium",
  "profiler_report": ".aioson/profiler-reports/stefan-georgi/enriched-profile.md"
}
```

---

## Regras de qualidade

- separar expertise real de opinião superficial
- ancorar claims principais em evidência
- deixar explícito o que é inferência
- não tratar psicometria como verdade clínica
- expor limitações e contextos onde a persona falha

---

## Ordem recomendada de geração

1. consolidar `enriched-profile.md`
2. transformar expertise em `## O que saber`
3. transformar crenças em `## Filosofias`
4. transformar frameworks e heurísticas em blocos aplicáveis
5. gerar `## Mentes` como modos cognitivos acionáveis
6. preencher as seções novas de persona
7. fechar com `## Evidence` e `## Application notes`
