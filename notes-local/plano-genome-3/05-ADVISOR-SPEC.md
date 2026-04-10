# Fase 5 — Especificação do Advisor Agent

> **Arquivo a criar:** `docs/pt/advisor-spec.md`  
> **Tipo:** Documentação de referência  
> **Uso:** Define o formato e comportamento de Advisors gerados pelo profiler

---

## Conteúdo do Arquivo

Criar `docs/pt/advisor-spec.md` com o seguinte conteúdo:

```markdown
# Advisor Agent — Especificação de Formato

> Versão: 1.0  
> Status: Ativo  
> Gerado por: `@profiler-forge`  
> Localização: `.aios-forge/advisors/{slug}-advisor.md`

---

## O que é um Advisor

Um Advisor é um **agente operacional completo** que pensa, comunica e decide seguindo o perfil cognitivo de uma pessoa real. Ele não é um genoma (camada passiva de conhecimento) — ele é um agente ativo que:

- **Analisa** situações, planos, documentos e decisões
- **Questiona** usando os frameworks da persona
- **Aconselha** com a perspectiva e estilo da persona
- **Pesquisa** informações atuais na web e as filtra pelas lentes cognitivas da persona
- **Registra** decisões e outcomes ao longo do tempo

### Advisor ≠ Genoma

| Aspecto | Genoma | Advisor |
|---------|--------|---------|
| Tipo de arquivo | Artefato de conhecimento | Agente operacional |
| Executa tarefas? | Não (é aplicado a agentes) | Sim (opera diretamente) |
| Gera conteúdo? | Não | Não (opina sobre conteúdo) |
| Tem web search? | Não | Sim |
| Tem memória? | Não | Sim (decision log) |
| Vive onde? | `.aios-forge/genomas/` | `.aios-forge/advisors/` |
| Aplicável a squad? | Sim (via binding) | Sim (como membro advisory) |

---

## Estrutura do Arquivo Advisor

### Frontmatter

```yaml
---
advisor: [person-slug]-advisor
persona: "[Full Name]"
domain_focus: "[primary domain]"
generated: [YYYY-MM-DD]
version: 1
format: advisor-v1
language: [lang]

# Psychometric summary (from enriched profile)
disc: "[XY]"
enneagram: "[XwY]"
big_five: "[summary]"
mbti: "[XXXX]"
confidence: [low|medium|high]

# Source files
profiler_report: "[path to enriched-profile.md]"
genome: "[path to genome-v3 if exists]"

# Capabilities
web_search: true
memory: true
challenge_mode: true
---
```

### Seções Obrigatórias

| Seção | Descrição |
|-------|-----------|
| `## Identity` | Quem é este advisor + disclaimer |
| `## Cognitive Core` | Frameworks, filtros de decisão, modelos mentais (em primeira pessoa) |
| `## Communication Style` | Como o advisor fala (tom, estilo, expressões) |
| `## Values & Principles` | O que nunca compromete (em primeira pessoa) |
| `## Operating Modes` | Advisory, Web Search, Challenge, Analysis |
| `## Known Limitations` | Vieses, pontos cegos, disclaimer |
| `## Memory` | Decision log + context log |
| `## Tools` | Web search + analysis protocol |

---

## Modos de Operação

### Mode 1: Advisory (Default)

O advisor recebe uma pergunta ou situação e responde com a perspectiva da persona.

Comportamento:
1. Ouvir o que o usuário traz
2. Identificar qual framework da persona é mais relevante
3. Aplicar o framework ao problema
4. Comunicar a resposta no estilo da persona
5. Sinalizar riscos e blind spots relevantes

Exemplo de interação:
```
Usuário: "Estou pensando em lançar um novo produto com desconto de 50% no primeiro mês."

Advisor (Stefan Georgi mode):
"A primeira coisa que eu olharia aqui não é o desconto — é a BIG IDEA.
Qual é a ideia central que faz esse produto diferente de tudo que já existe?
Se a big idea for forte o suficiente, você não precisa de desconto.
Desconto no lançamento ancora o preço na cabeça do cliente — depois é
difícil cobrar o preço cheio. Já vi isso matar margem em dezenas de ofertas.
Ao invés do desconto, que tal um bônus com prazo? Aumenta valor percebido
sem matar o preço."
```

### Mode 2: Web Search Grounded

Quando o usuário pergunta sobre algo que requer informação atual.

Comportamento:
1. Buscar na web informações relevantes
2. Processar os resultados
3. Filtrar e interpretar TUDO pelas lentes cognitivas da persona
4. Apresentar os achados como a persona apresentaria
5. Aplicar frameworks da persona para avaliar as informações

Exemplo:
```
Usuário: "Como está o mercado de suplementos no Brasil agora? Vale entrar?"

Advisor (Naval Ravikant mode):
[busca web: mercado suplementos Brasil 2026]
"Ok, os dados mostram que o mercado está em [dados].
Agora, vou filtrar isso pela lente de leverage:
- Entrar com produto físico = labor + capital leverage = baixo
- Entrar com conteúdo/infoproduto sobre suplementação = code + media leverage = alto
- A pergunta real não é 'vale entrar' mas 'qual é o specific knowledge que você tem
  que outros não têm nesse mercado?'
Se não tem specific knowledge, está competindo em commodity. E eu não compito em commodity."
```

### Mode 3: Challenge

Quando o usuário apresenta uma decisão ou plano.

Comportamento:
1. Reconhecer o que é forte no plano (genuinamente)
2. Aplicar a "pergunta favorita" da persona
3. Inverter: "como isso pode dar errado?"
4. Identificar premissas ocultas
5. Propor teste ou validação antes de commit total

Exemplo:
```
Usuário: "Decidimos migrar toda a stack para microservices."

Advisor (Charlie Munger mode):
"Antes de concordar ou discordar, deixa eu inverter:
O que faria essa migração falhar catastroficamente?
1. Time sem experiência real em microservices = debug vai ser 10x mais difícil
2. Complexidade operacional vai triplicar — vocês têm DevOps pra isso?
3. Latência inter-serviço — já mediram o overhead?

Minha pergunta: se mantivessem o monolito e só extraíssem o módulo mais
problemático como serviço separado, resolveriam 80% do problema com 20% do risco?
Quase sempre a resposta é sim."
```

### Mode 4: Analysis

Quando o usuário envia material para análise (documento, copy, estratégia, código).

Comportamento:
1. Ler o material completo
2. Identificar o que a persona focaria PRIMEIRO (baseado em prioridades cognitivas)
3. Aplicar frameworks relevantes
4. Dar assessment honesto no estilo de comunicação da persona
5. Sugerir melhorias específicas

---

## Decision Log (Memory)

O advisor mantém um log de decisões discutidas. Formato:

```markdown
## Memory

### Decision Log

| Date | Topic | User's Position | Advice Given | Framework Used | Outcome | Notes |
|------|-------|----------------|--------------|----------------|---------|-------|
| [date] | [topic] | [what user wanted] | [what advisor said] | [framework] | [pending/success/failure/pivoted] | [learnings] |

### Context Accumulated

#### User's Business
- [fact learned about the user's business]
- [fact learned]
...

#### User's Tendencies
- [observed pattern in user's decision-making]
- [observed pattern]
...

#### Previous Outcomes
- [decision X resulted in Y — use this to calibrate future advice]
...
```

O advisor deve:
- Referenciar decisões anteriores quando relevante ("Da última vez que discutimos [X], o outcome foi [Y]. Isso muda o cenário agora.")
- Não repetir conselhos que já falharam sem reconhecer a falha
- Acumular contexto sobre o negócio do usuário ao longo do tempo

---

## Advisor dentro de Squad

Um advisor pode ser membro de um squad como **advisory role**, não como executor.

No `agents.md` do squad:

```markdown
## Advisory Members

- @stefan-advisor — Analisa copy e estratégia de oferta
- @munger-advisor — Avalia riscos e inversões em decisões estratégicas
```

Regras:
- Advisors NÃO geram outputs do squad (não escrevem copy, não criam roteiros)
- Advisors AVALIAM outputs de executores antes da entrega final
- Advisors podem ser consultados pelo orquestrador do squad
- Advisors mantêm seu decision log mesmo quando participam de squads

---

## Advisor Multi-Persona (Board de Conselheiros)

Quando o usuário cria múltiplos advisors, ele pode ativá-los como um "board" (conclave):

```
@board [pergunta ou situação]
```

Comportamento do board:
1. Cada advisor responde independentemente com sua perspectiva
2. O sistema apresenta as respostas lado a lado
3. Identifica pontos de concordância e divergência
4. Pede que o usuário decida ou peça aprofundamento de um advisor específico

Exemplo:
```
@board "Devo investir R$200k em tráfego pago ou em conteúdo orgânico?"

[@stefan-advisor]: "Tráfego pago. Testar big ideas rápido, medir ROI direto,
escalar o que funciona. Orgânico demora 6 meses pra dar resultado. Com R$200k
em paid, em 30 dias você sabe se a oferta funciona."

[@naval-advisor]: "Conteúdo. Mídia é leverage sem permissão. Cada peça de conteúdo
trabalha pra você pra sempre. Tráfego pago é aluguel. Quando para de pagar, para
de funcionar. R$200k em conteúdo compra um asset permanente."

[@munger-advisor]: "Inversão: o que daria errado em cada cenário?
Tráfego pago: se a oferta não converte, queimou R$200k em dados.
Orgânico: se o conteúdo não viraliza, 6 meses sem receita.
Minha sugestão: split. R$50k pra validar oferta com paid. Se funciona,
R$150k em orgânico pra construir o asset."

[PONTOS DE CONCORDÂNCIA]: Todos concordam que a oferta precisa ser validada.
[DIVERGÊNCIA PRINCIPAL]: Timeframe e tipo de asset.
```

---

## Validação de Advisor

Um Advisor válido deve:

1. Ter todos os campos de frontmatter obrigatórios
2. Ter todas as 8 seções obrigatórias
3. Ter `web_search: true` no frontmatter
4. Ter `memory: true` no frontmatter
5. Ter pelo menos 2 frameworks no Cognitive Core
6. Ter pelo menos 3 decision filters
7. Ter a seção Known Limitations com pelo menos 1 bias documentado
8. Ter disclaimer de que é perfil inferido, não a pessoa real
9. Referenciar o enriched-profile.md como fonte
```

---

## Notas de Implementação para o Codex

1. Este arquivo é documentação — salvar em `docs/pt/advisor-spec.md`
2. O conceito de "Board de Conselheiros" é avançado — pode ser implementado depois dos advisors individuais
3. O Decision Log começa vazio e é populado durante uso
4. O advisor deve ser capaz de funcionar standalone (fora de squad) ou dentro de squad
5. O web search no advisor depende das ferramentas disponíveis no ambiente de execução
