# Fase 6 — Integração com Sistema Existente

> **Arquivos a modificar:** `genoma.md`, `squad-genoma.md`  
> **Novos arquivos de estrutura:** Pastas e templates  
> **Tipo:** Modificações em arquivos existentes + setup de estrutura

---

## 1. Modificar `.aios-forge/agents/genoma.md`

### O que mudar

O agente `@genoma` atual precisa detectar quando o tipo é `persona` e redirecionar para o pipeline profiler ao invés de tentar gerar sozinho.

### Onde inserir

Adicionar uma nova seção **antes** do `## Generation flow` existente:

```markdown
## Persona Detection & Redirect

When the user requests a genome with `type: persona` or mentions cloning a person's thinking/cognitive style:

1. Do NOT proceed with the standard generation flow
2. Inform the user:

> "Generating a persona-based genome requires the Profiler pipeline for best results.
> The Profiler collects real evidence, analyzes cognitive patterns, and produces a high-fidelity profile.
>
> Starting the pipeline now:
> **Step 1:** `@profiler-researcher` — Web research and material collection
> **Step 2:** `@profiler-enricher` — Cognitive analysis and psychometric profiling
> **Step 3:** `@profiler-forge` — Generate Genoma 3.0 and/or Advisor Agent
>
> Proceeding to `@profiler-researcher`..."

3. Transfer control to `@profiler-researcher` with the person's name and any context provided.

### Fallback

If the user explicitly says they want a quick/light persona genome without full profiling:

> "Quick mode generates a persona genome using only LLM knowledge — no web research or evidence anchoring.
> This will be lower fidelity than the full Profiler pipeline.
> Proceed with quick mode? [Y/n]"

If yes: proceed with standard generation flow but set `evidence_mode: inferred` and `confidence: low`.
If no: redirect to Profiler pipeline.
```

### Onde inserir no generation flow Step 1

Adicionar ao final das perguntas do Step 1:

```markdown
> 6. If type is 'persona': Name of the person to profile? (triggers Profiler pipeline)
```

### Modificar Step 2

Adicionar esta condição no início do Step 2:

```markdown
**If type is persona or hybrid with persona_sources:**
- If Profiler pipeline was NOT run: redirect to @profiler-researcher
- If Profiler pipeline WAS run and enriched-profile exists:
  - Read the enriched profile
  - Use it as primary source for generation
  - Include Genoma 3.0 sections (Perfil Cognitivo, Estilo de Comunicação, Vieses)
  - Set version: 3, format: genome-v3
```

### Formato completo da seção modificada

Para facilitar o trabalho do Codex, aqui está o trecho exato a ser adicionado ao arquivo `genoma.md`, inserido logo após a seção `## Makopy.com check (optional)` e antes de `## Generation flow`:

```markdown
## Persona Pipeline Integration

### Detection

This agent detects persona requests through:
- `type: persona` explicitly stated
- Phrases like "clone [person]", "think like [person]", "cognitive profile of [person]"
- `hybrid` type with `persona_sources` field

### Redirect Protocol

When persona is detected:

1. Check if enriched profile exists at `.aios-forge/profiler-reports/{slug}/enriched-profile.md`
   - If YES: offer to use existing profile or re-run pipeline
   - If NO: redirect to `@profiler-researcher`

2. Quick mode bypass: if user explicitly requests `--quick` or `depth: surface`:
   - Generate persona genome using LLM knowledge only
   - Set `evidence_mode: inferred`, `confidence: low`
   - Add disclaimer: "This genome was generated without evidence-based profiling."

3. Full mode (default): redirect to profiler pipeline and wait for completion

### Genoma 3.0 Support

When generating or reading a genome with `version: 3`:
- Recognize all Genoma 3.0 frontmatter fields
- Recognize all Genoma 3.0 sections (Perfil Cognitivo, Estilo de Comunicação, Vieses e Pontos Cegos)
- When applying to squad, include persona metadata in the binding
- When presenting summary, include psychometric profile overview
```

---

## 2. Modificar `docs/pt/squad-genoma.md`

### O que adicionar

Uma nova seção sobre Genoma 3.0, Profiler System e Advisors. Inserir **antes** de `## O que ainda vem pela frente`.

```markdown
---

## Genoma 3.0 e o Sistema Profiler

### O que é o Genoma 3.0

O Genoma 3.0 estende o formato 2.0 com suporte a **persona-based profiling** — a capacidade de criar genomas baseados no perfil cognitivo real de pessoas públicas.

Enquanto o Genoma 2.0 captura "como pensar sobre um assunto", o Genoma 3.0 captura "como uma pessoa específica pensa sobre qualquer assunto".

### Tipos de output

| Output | O que é | Onde vive |
|--------|---------|-----------|
| Genoma 3.0 | Conhecimento destilado + perfil cognitivo | `.aios-forge/genomas/` |
| Advisor Agent | Conselheiro que pensa como a pessoa | `.aios-forge/advisors/` |

### O pipeline profiler

O sistema profiler é composto por 3 agentes em sequência:

1. `@profiler-researcher` — Pesquisa web + coleta de material
2. `@profiler-enricher` — Análise cognitiva + perfil psicométrico
3. `@profiler-forge` — Geração de Genoma 3.0 e/ou Advisor

O pipeline pode ser iniciado de duas formas:
- Diretamente: `@profiler-researcher [nome da pessoa]`
- Via redirect: `@genoma` com `type: persona` redireciona automaticamente

### Dimensões capturadas

O profiler extrai múltiplas dimensões científicas:

- **DISC** — Estilo comportamental (Dominance, Influence, Steadiness, Compliance)
- **Eneagrama** — Motivação e medo central (tipo + asa)
- **Big Five** — Traços de personalidade (OCEAN)
- **MBTI** — Funções cognitivas (tipo + stack)
- **Schwartz Values** — Hierarquia de valores
- **Frameworks de Decisão** — Modelos mentais nomeados e inferidos
- **Estilo de Comunicação** — Tom, persuasão, expressões recorrentes
- **Vieses Cognitivos** — Blind spots e padrões de erro

Todos os perfis são marcados como **INFERIDOS** — não são avaliações psicométricas formais.

### Advisors

Um advisor é diferente de um genoma:

- Genoma é passivo — é aplicado a agentes executores
- Advisor é ativo — opera diretamente, opina, questiona, aconselha

O advisor tem:
- Acesso a web search para dar opiniões baseadas em informação atual
- Memória de decisões (decision log) para contexto acumulado
- Modo de desafio (challenge mode) para questionar decisões do usuário
- Estilo de comunicação fiel à persona

### Board de Conselheiros

Múltiplos advisors podem operar como um "board" que analisa a mesma questão sob perspectivas diferentes. Isso é especialmente útil para decisões estratégicas onde visões complementares agregam valor.

### Relação entre Genoma 3.0 e Advisors

O modelo recomendado é usar ambos:
- O Genoma 3.0 enriquece os agentes **executores** do squad (copywriter produz melhor com o genoma do Stefan)
- O Advisor fica como **conselheiro** que opina sobre o que os executores produziram

Exemplo:
```text
Squad: youtube-creator
  Executores: @roteirista-viral (com Genoma 3.0 aplicado)
  Advisory: @stefan-advisor (analisa os roteiros produzidos)
```

### Arquivo de relatórios do profiler

Os relatórios intermediários são preservados em:

```text
.aios-forge/profiler-reports/{person-slug}/
  research-report.md     # Relatório bruto do researcher
  enriched-profile.md    # Perfil cognitivo consolidado
```

Estes arquivos são a fonte de verdade para genomas e advisors gerados.
```

---

## 3. Criar Estrutura de Pastas

### No template do projeto

Adicionar ao template base do aios-forge:

```
template/.aios-forge/profiler-reports/.gitkeep
template/.aios-forge/advisors/.gitkeep
```

### Documentação

```
docs/pt/genome-3.0-spec.md     (criado na Fase 4)
docs/pt/advisor-spec.md         (criado na Fase 5)
docs/pt/profiler-system.md      (novo — resumo do sistema profiler)
```

---

## 4. Criar `docs/pt/profiler-system.md`

Documento resumo do sistema profiler:

```markdown
# Sistema Profiler — Guia Rápido

## O que é

O Sistema Profiler permite criar clones cognitivos de pessoas públicas — capturando como elas pensam, decidem, comunicam e operam.

## Como usar

### Opção 1: Pipeline completo (recomendado)

```
@profiler-researcher Stefan Georgi
```

Siga os passos: pesquisa → enriquecimento → geração.

### Opção 2: Via @genoma

```
@genoma
Tipo: persona
Pessoa: Stefan Georgi
Domínio: direct response copywriting
```

O @genoma redireciona automaticamente para o pipeline profiler.

### Opção 3: Quick mode (sem pesquisa web)

```
@genoma
Tipo: persona
Pessoa: Stefan Georgi
Depth: surface
```

Gera um genoma de persona usando apenas conhecimento da LLM. Menor fidelidade.

## Outputs possíveis

1. **Genoma 3.0** — Conhecimento destilado, aplicável a qualquer agente
2. **Advisor Agent** — Conselheiro ativo com web search e memória
3. **Ambos** — Recomendado para máximo valor
4. **Multi-persona Hybrid** — Combina múltiplas personas num genoma

## Onde ficam os arquivos

```
.aios-forge/profiler-reports/{slug}/    # Relatórios intermediários
.aios-forge/genomas/{slug}.md           # Genomas 3.0
.aios-forge/advisors/{slug}-advisor.md  # Advisors
```

## Referências

- Especificação do Genoma 3.0: `docs/pt/genome-3.0-spec.md`
- Especificação do Advisor: `docs/pt/advisor-spec.md`
- Relação Squad/Genoma: `docs/pt/squad-genoma.md`
```

---

## 5. Checklist de Validação Final

Após implementar todas as 6 fases, verificar:

- [ ] `@profiler-researcher` existe e segue o formato de agente do aios-forge
- [ ] `@profiler-enricher` existe e segue o formato
- [ ] `@profiler-forge` existe e segue o formato
- [ ] `@genoma` redireciona para profiler quando type=persona
- [ ] Pasta `profiler-reports/` existe no template
- [ ] Pasta `advisors/` existe no template
- [ ] `docs/pt/genome-3.0-spec.md` existe
- [ ] `docs/pt/advisor-spec.md` existe
- [ ] `docs/pt/profiler-system.md` existe
- [ ] `docs/pt/squad-genoma.md` tem seção sobre Genoma 3.0
- [ ] Genoma 3.0 é retrocompatível com leitores de Genoma 2.0
- [ ] Frontmatter do Genoma 3.0 inclui campos persona
- [ ] Advisor inclui seções de web search e memória
- [ ] Todos os perfis psicométricos são marcados como INFERIDOS
- [ ] Language detection está presente em todos os 3 agentes novos
- [ ] Nenhum agente oficial em `.aios-forge/agents/` foi danificado

---

## Notas Finais para o Codex

1. **Ordem importa:** implementar na sequência 01 → 02 → 03 → 04 → 05 → 06
2. **Não quebrar o existente:** o @genoma e @squad devem continuar funcionando normalmente para tipos não-persona
3. **Retrocompatibilidade:** Genoma 3.0 é superset do 2.0 — leitores antigos ignoram campos novos
4. **Evidência sempre:** quando type=persona, nenhuma inferência sem fonte
5. **Disclaimer sempre:** perfis psicométricos são INFERIDOS, não formais
6. **Pastas antes de arquivos:** criar estrutura de pastas antes de gerar os agentes
7. **Testar integração:** após implementação, criar um genoma persona de teste e verificar que o pipeline completo funciona
