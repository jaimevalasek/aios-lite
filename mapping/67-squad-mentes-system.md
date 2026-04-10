# 67 — Squad: Sistema de Mentes

> Extensão do Squad Genome System (mapping/66)
> Terminologia 100% original aios-lite — nenhum conceito copiado de outros frameworks
> Sessão: 2026-03-05

---

## Identidade da aios-lite (manifesto)

A aios-lite não é uma cópia de nada. É uma filosofia distinta:

> **Lite não significa menos qualidade. Significa menos fricção, menos tokens,
> menos infraestrutura, mais resultado. Velocidade com substância.**

Outros frameworks impressionam com complexidade.
A aios-lite impressiona com o que entrega — rápido, sem cerimônia.

O Squad Genome System segue essa filosofia:
- Genomas: conhecimento de domínio destilado (mapping/66)
- **Mentes: perspectivas de pensamento destiladas (este documento)**

---

## O que é uma Mente

Uma **Mente** é um agente com perspectiva definida — não um clone de pessoa,
não um bot genérico. É uma **assinatura cognitiva**: um padrão específico de
como perceber problemas, decidir, comunicar e discordar.

**A distinção fundamental:**

```
Genoma  →  O QUE saber        (domínio, padrões, regras técnicas)
Mente   →  COMO pensar        (filosofia, heurísticas, visão de mundo)
Memory  →  O QUE foi aprendido (histórico deste projeto)

Squad = Genomas + Mentes + Memory
```

Você pode ter o genoma Laravel (sabe Eloquent, Policies, FormRequests)
combinado com a Mente Cético (questiona tudo, busca o que vai quebrar).
O resultado é um agente que conhece Laravel E faz as perguntas certas sobre ele.

Isso não existe em nenhum outro framework de agentes.

---

## Tipos de Mente

### Tipo 1 — Arquétipos Universais
Personas de pensamento não atreladas a uma pessoa real.
Funcionam em qualquer domínio.

| Mente | Assinatura | Pergunta favorita |
|---|---|---|
| **O Cético** | Busca o que vai falhar | "Mas o que acontece quando isso quebrar?" |
| **O Pragmático** | Simplifica ao máximo | "Qual a menor coisa que resolve isso?" |
| **O Visionário** | Pensa 3 versões à frente | "E quando tivermos 100x mais usuários?" |
| **O Guardião** | Protege qualidade e padrões | "Isso é consistente com o que já decidimos?" |
| **O Usuário** | Representa quem usa o produto | "Como alguém que nunca viu isso vai entender?" |
| **O Auditor** | Compliance e risco | "Isso passa em uma auditoria?" |

### Tipo 2 — Destilações de Especialistas Reais
Criadas a partir de obra, escritos e raciocínio público de pessoas reais.
Não clona a pessoa — destila a perspectiva.

Exemplos possíveis para squads de dev:
- Martin Fowler (refactoring, patterns, evolutionary design)
- Kent Beck (TDD, simplicidade, baby steps)
- Joel Spolsky (pragmatismo, experiência do usuário, custo real de software)
- Sandi Metz (OOP, mensagens, regras de objetos bem definidos)

Exemplos para squads de produto:
- Ryan Singer (Shape Up, escopo, betting table)
- Marty Cagan (empowered teams, discovery contínuo)
- Jason Fried (menos features, mais foco, No é a resposta padrão)

### Tipo 3 — Mentes de Domínio Customizadas
Criadas pelo usuário para capturar a perspectiva de alguém específico
da empresa — o CTO que sempre faz as perguntas certas, o senior dev
que conhece todos os débitos técnicos históricos.

---

## A Estrutura de uma Mente (5 Camadas)

Cada arquivo de Mente tem exatamente 5 camadas. Lite, não 9.

### Camada 1 — Axiomas
Os princípios que essa perspectiva trata como verdade absoluta.
Não são regras — são crenças que moldam tudo o mais.

```markdown
## Axiomas
- Complexidade é o maior inimigo. Toda adição tem custo permanente.
- O código que não existe não tem bugs.
- Otimização prematura é onde boa intenção vira problema real.
```

### Camada 2 — Heurísticas
Regras de bolso. Como essa perspectiva decide rápido sem análise profunda.
São os atalhos mentais que funcionam 80% do tempo.

```markdown
## Heurísticas
- Se precisar de um comentário para explicar o código, o código está errado.
- Se levou mais de 30 minutos para nomear algo, o design está errado.
- Antes de adicionar, remova. Antes de remover, entenda.
- Se dois times discutem uma fronteira, a fronteira está errada.
```

### Camada 3 — Modelos
Como essa perspectiva estrutura e analisa problemas.
Inclui analogias favoritas, metáforas, frameworks de análise.

```markdown
## Modelos
- Débito técnico como juros compostos: pequeno hoje, caro amanhã
- Software como jardim: precisa de manutenção constante, não construção única
- Analogia favorita: "Se você acha que programar é difícil, tente fazê-lo
  enquanto alguém muda os requisitos enquanto você programa"
```

### Camada 4 — Dilemas
As tensões não resolvidas que essa perspectiva carrega.
É onde ela luta — e portanto onde o pensamento fica mais rico.

```markdown
## Dilemas
- Velocidade vs qualidade: sabe que os dois são possíveis mas raramente
  nas condições reais de um projeto com prazo
- Consistência vs evolução: quer que tudo seja consistente mas sabe que
  padrões precisam mudar quando o contexto muda
- Autonomia vs alinhamento: times autônomos decidem melhor localmente mas
  criam fragmentação globalmente
```

### Camada 5 — Voz
Como essa perspectiva se comunica. Tom, ritmo, estilo.
É o que faz o agente soar distinto, não genérico.

```markdown
## Voz
- Tom: direto, sem rodeios, sem validação emocional antes da substância
- Não começa respostas com elogios
- Prefere exemplos concretos a princípios abstratos
- Quando discorda: pergunta antes de afirmar ("O que te faz pensar que X?")
- Comprimento: curto quando a resposta é clara, longo apenas quando necessário
- Linguagem: técnica mas acessível, sem jargão para impressionar
```

---

## O Processo de Destilação

Como você cria uma Mente a partir de alguém real.
Não é clonagem — é **arqueologia de perspectiva**.

### Fase 1 — Coleta de Evidências

O objetivo é reunir obra, não biografia.

**Fontes primárias (o que a pessoa fez/disse diretamente):**
- Livros e artigos publicados
- Palestras e entrevistas (transcrições, não resumos)
- Código público (o que ela construiu revela o que acredita)
- Decisões documentadas (posts de blog, RFCs, ADRs públicos)
- Contradições públicas (quando mudou de ideia e por quê)

**Fontes secundárias (o que outros observaram):**
- Como colegas descrevem seu raciocínio
- Críticas que recebeu (o que as pessoas acharam errado nela)
- Influências que ela cita

**O que NÃO coletar:**
- Opiniões sobre a vida pessoal
- Posições em debates não relacionados à área
- Contexto histórico que não afeta o raciocínio atual

### Fase 2 — Arqueologia

Ler o que foi coletado com uma lente específica:

```
Para cada axioma candidato:
  - Ele aparece em múltiplas fontes independentes?
  - Ele explica decisões que pareciam inconsistentes antes?
  - Ele sobrevive às críticas mais fortes?
  → Se sim nos três: é um axioma real

Para cada heurística candidata:
  - Ela aparece como regra explícita ou pode ser inferida de exemplos?
  - Ela tem exceções que a própria pessoa reconhece?
  → Se tem exceções: documente as exceções na heurística

Para os dilemas:
  - Onde a pessoa explicitamente admitiu incerteza?
  - Onde tomou posições diferentes em momentos diferentes?
  - O que ela diz que é difícil?
  → Esses são os dilemas mais ricos
```

### Fase 3 — Destilação

Escrever o arquivo da Mente com as 5 camadas.

Regras de destilação:
- Cada axioma em uma linha. Sem explicação longa — se precisar de parágrafo, não é axioma.
- Cada heurística deve ser testável: você consegue aplicá-la a um caso concreto?
- Cada modelo deve ter uma analogia. Modelo sem analogia é abstração vazia.
- Cada dilema deve ter os dois lados — não é dilema se só tem um lado certo.
- A voz deve ser calibrada com exemplos: "responderia assim: [exemplo]"

### Fase 4 — Calibração

Testar a Mente com cenários reais antes de usar no projeto:

```
Cenário: "Devemos adicionar uma camada de cache para melhorar performance?"

Mente Kent Beck responderia:
"Você mediu que performance é o problema? Cache adiciona complexidade
de invalidação que vai te custar mais do que ganhou. Antes: profile o
código real. Cache é quase sempre a solução errada para o problema errado."

Isso soa como Kent Beck? Se sim: destilação calibrada.
Se não: volte para a Fase 2.
```

---

## Como Mentes e Genomas se Combinam

### Squad de uma palavra: "perspectiva + domínio"

```
Genoma: laravel          O QUE saber sobre Laravel
Mente: pragmatico        COMO abordar com pragmatismo

Resultado: "Para este endpoint de upload, o FormRequest com validation
rules é suficiente. Não precisa de um Service separado — você tem
um Controller de 30 linhas. Se crescer para 60, extrai."

(não genérico: usa FormRequest — conhecimento de domínio do genoma)
(não ingênuo: avalia se a abstração é necessária agora — pensamento pragmático)
```

### Blending de Mentes

Você pode ativar múltiplas Mentes no mesmo squad:

```yaml
# squad.md
genomes: [laravel, saas]
mentes: [pragmatico, guardiao, cetico]
```

O Guardião verifica consistência com decisões anteriores.
O Cético questiona se vai funcionar em produção.
O Pragmático garante que não está over-engineered.

Os três falam. O @dev sintetiza.

### Tensão entre Mentes é desejável

Se Pragmático e Guardião concordam sempre, um deles é redundante.
A riqueza está no conflito:

```
Feature: adicionar abstraction layer para suportar múltiplos providers de email

Pragmático: "Você tem um provider. Abstração prematura. Façamos direto."
Guardião: "Mas já decidimos no sprint 3 que serviços externos ficam atrás de interface."
Cético: "Quando o segundo provider aparecer, vai ser um trabalho de refactor de qualquer jeito."

Síntese emergente: Interface simples agora (1 hora), implementação direta,
sem abstrações complexas. Quando vier o segundo provider, o contrato já existe.
```

Isso é mais valioso que um único agente concordando com tudo.

---

## Estrutura de Arquivos

```
.aios-lite/squads/
├── genomes/                    ← domínio técnico (mapping/66)
│   ├── laravel.md
│   └── ...
├── mentes/                     ← perspectivas de pensamento (este doc)
│   ├── arquetipos/             ← universais, shipped com aios-lite
│   │   ├── pragmatico.md
│   │   ├── cetico.md
│   │   ├── visionario.md
│   │   ├── guardiao.md
│   │   ├── usuario.md
│   │   └── auditor.md
│   ├── especialistas/          ← destilações de pessoas reais
│   │   ├── martin-fowler.md
│   │   ├── kent-beck.md
│   │   └── ryan-singer.md
│   └── custom/                 ← criadas pelo usuário para o projeto
│       └── [nome].md
├── active/
│   ├── squad.md                ← genomas + mentes ativos
│   └── memory.md
└── library/
    └── README.md
```

---

## Comandos CLI

```bash
# Cria uma Mente a partir de um especialista real (destilação assistida)
aios-lite squad:mente:create martin-fowler

# Cria um arquétipo customizado
aios-lite squad:mente:create --arquetipo "o-perfeccionista-pragmatico"

# Lista Mentes disponíveis
aios-lite squad:mente:list
aios-lite squad:mente:list --tipo=arquetipo
aios-lite squad:mente:list --tipo=especialista

# Adiciona uma Mente ao squad ativo
aios-lite squad:mente:add pragmatico
aios-lite squad:mente:add martin-fowler

# Invoca uma Mente específica na conversa
# (via agente @squad no Claude)
# @squad:pragmatico, o que você acha desta estrutura?
# @squad:cetico, quais são os riscos?

# Testa uma Mente com um cenário
aios-lite squad:mente:calibrar martin-fowler --cenario="adicionar cache?"

# Exporta Mente para compartilhar
aios-lite squad:mente:export martin-fowler
```

---

## Invocação no Claude Code

```
# No meio de uma sessão com @dev:

@squad:cetico: esse endpoint de DELETE não tem verificação de ownership.
               Qualquer usuário autenticado pode deletar qualquer recurso.

@squad:pragmatico: a solução mais simples é um Policy no Laravel.
                   authorize('delete', $resource) antes da lógica. 3 linhas.

@squad:guardiao: já temos esse padrão em AppointmentController linha 45.
                 Consistência: usar a mesma estrutura.

@dev: implementa conforme o padrão existente.
```

O @dev recebe perspectivas diferentes, sintetiza, implementa.
Nenhuma pergunta extra. Nenhum token desperdiçado em debate.

---

## Por que Mentes + Genomas supera qualquer abordagem de "clonagem"

| Abordagem de clonagem | Problema |
|---|---|
| Clona uma pessoa inteira | Pega opiniões irrelevantes junto com as úteis |
| 9 camadas de extração | Over-engineering para uso em desenvolvimento de software |
| Pesquisa antes de cada squad | Lento, inconsistente entre sessões |
| Clone = substituto da pessoa | Pode criar expectativas falsas |

| Abordagem aios-lite (Mentes) | Vantagem |
|---|---|
| Destila apenas a perspectiva relevante | Cada camada tem propósito claro no desenvolvimento |
| 5 camadas | Lite, completo, sem redundância |
| Arquétipos pré-destilados | Zero tempo de setup para casos comuns |
| Mente = lente, não substituto | Honesto sobre o que é — uma perspectiva, não uma pessoa |
| Tensão entre Mentes é o produto | A síntese de perspectivas conflitantes gera insights |
| Combinável com Genomas | Perspectiva + Domínio = agente especializado e bem posicionado |

---

## Vocabulário Oficial aios-lite (guardar para docs)

| Termo | Significado | NÃO usar |
|---|---|---|
| **Mente** | Agente com perspectiva destilada | "Clone", "DNA", "Persona genérica" |
| **Destilação** | Processo de criar uma Mente | "Clonagem", "Extração de DNA" |
| **Assinatura Cognitiva** | O conjunto das 5 camadas de uma Mente | "DNA Mental", "Voice DNA" |
| **Camadas** | As 5 dimensões de uma Mente | "Layers de DNA" |
| **Arquétipo** | Mente universal não baseada em pessoa real | "Bot genérico" |
| **Calibração** | Testar a Mente com cenários antes de usar | "Validação de fidelidade" |
| **Blending** | Combinar Genomas e/ou Mentes | "Mix" |
| **Tensão** | Conflito entre Mentes (desejável) | "Erro", "Inconsistência" |
| **Genoma** | Conhecimento de domínio técnico | "Stack específico" (genoma é mais amplo) |

---

## O Squad Completo em uma Imagem

```
Squad de desenvolvimento de feature "Payment" em projeto fintech Laravel:

GENOMAS (o que saber):
├── laravel.md           → FormRequest, Policy, Job, Observer
├── fintech.md           → PCI-DSS, idempotência, auditoria, reversibilidade
└── saas.md              → multi-tenant, isolamento por tenant_id

MENTES (como pensar):
├── pragmatico.md        → "menor implementação que funciona"
├── cetico.md            → "o que vai quebrar nisto em produção?"
└── auditor.md           → "isso vai passar em uma auditoria bancária?"

MEMORY (o que aprendemos):
└── memory.md            → padrões confirmados neste projeto específico

RESULTADO:
@dev implementa com:
- Conhecimento técnico correto (genomas)
- Perspectivas que se tensionam e sintetizam (mentes)
- Contexto real do projeto (memory)

Sem pesquisa. Sem setup. Sem YAML de 1300 linhas.
```

---

> Status: visão completa — pronto para Sprint 1 junto com mapping/66
> Vocabulário próprio, filosofia própria, abordagem própria
> Relacionado: mapping/66 (Squad Genome System)
