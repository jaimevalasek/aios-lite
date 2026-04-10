# 66 — Squad Genome System: Visão Completa

> Brainstorm estratégico — 2026-03-05
> Inspirado por aiox-core/squad.md — mas fundamentalmente diferente e mais lite

---

## O que está errado com o aiox-core

Antes de criar algo novo, entender o problema do que existe:

| aiox-core | Problema |
|---|---|
| Pesquisa experts antes de criar squad | Lento, inconsistente, depende de WebSearch |
| Clona pessoas reais (Gary Halbert, etc.) | Frágil — a pessoa pode ter mudado de ideia |
| YAML workflows de 1300 linhas | Over-engineering — contradiz "lite" |
| Scripts Python para hooks | Quebra stack (Node.js) |
| Squad criado do zero a cada vez | Não aprende com projetos anteriores |
| Agentes sequenciais | Não aproveita paralelismo |
| Estado em .state.json manual | Frágil, não integrado |

**O insight central que falta no aiox-core:**
> Eles começam do abstrato (expert → squad) em vez do concreto (codebase → squad).
> O melhor squad para um projeto não vem de pesquisa — vem do próprio projeto.

---

## A Virada: Codebase-First Squad

```
aiox-core:  pesquisa experts → clona → cria agentes → aplica no projeto
aios-lite:  lê o projeto → detecta domínio → carrega genoma → squad emerge
```

O squad não é criado. Ele **emerge** do que o projeto já é.

---

## Conceito Central: Squad Genome System

### O que é um Genoma

Um genoma é um **pacote de expertise de domínio** — não uma pessoa clonada, mas um
conjunto vivo de padrões, anti-padrões, checklists e heurísticas extraídos de
projetos reais bem-sucedidos naquele domínio.

```markdown
# Genome: Laravel

## Padrões que funcionam
- Service layer stateless, injetado via DI
- FormRequest para validação — nunca no Controller
- Policy para autorização — nunca if/else espalhado
- Repository só quando há múltiplas fontes de dados

## Anti-padrões fatais
- Lógica de negócio no Controller
- Eloquent no template/view
- `DB::statement` em vez de migration
- `User::all()` sem paginação

## Checklist de feature
- [ ] FormRequest criado
- [ ] Policy registrada
- [ ] Migration com rollback testado
- [ ] N+1 verificado no Telescope/Debugbar
- [ ] Soft delete onde faz sentido

## Heurísticas de decisão
Q: Cache ou query otimizada?
A: Query primeiro. Cache só se query < 50ms ainda não for suficiente.

Q: Job ou sync?
A: Se o usuário não precisa do resultado imediatamente → Job.
```

Genomas são **markdown puro**. Zero infraestrutura nova.

---

## Genome Blending — o diferencial criativo

Assim como CSS usa especificidade, genomas se combinam:

```bash
aios-lite squad:create --genome=laravel,fintech,saas
```

O sistema faz merge inteligente:
- Padrões do Laravel (técnico)
- Restrições do fintech (regulatório: PCI-DSS, LGPD, auditoria)
- Convenções de SaaS (multi-tenant, planos, billing)

Resultado: um squad que sabe que **toda query financeira precisa de log de auditoria**
E que **o FormRequest do Laravel é o lugar certo para validar isso**
E que **o tenant_id deve ser isolado em toda query** (SaaS)

**Nenhum desses 3 genomas sozinho saberia tudo isso. Combinados, sim.**

```
Genome Priority (como CSS cascade):
Project-level memory  > Domain genome > Base genome > Generic defaults
```

---

## Squad Memory — O Squad que Aprende

A parte mais poderosa. Após cada feature aprovada pelo @qa, o squad aprende:

```markdown
# Squad Memory — makopy-receita — v0.1

## O que aprendemos com esta codebase

### Padrões confirmados ✅
- `ApiResponse<T>` wrapper em todos os endpoints (confirmado em 4 features)
- Redis com prefixo `{service}:{entity}:{id}` (padrão emergiu no sprint 2)
- Rate limiting via middleware, não inline (decidido na feature auth)

### Anti-padrões que já apareceram ⚠️
- Lógica de rate limit duplicada (features 2 e 3 — centralizado no sprint 3)
- Cache sem TTL explícito (corrigido na feature cnpj)

### Decisões arquiteturais registradas 📐
- BullMQ > RabbitMQ (Railway tem Redis nativo — decisão: 2026-03-05)
- Fastify > Express (SSE precisa de controle fino de response — decisão: setup)
- Prisma para schema simples; se crescer para analytics, avaliar Drizzle

### Especialistas ativados 🧬
- genome:node-typescript: ativo (detecção automática)
- genome:api-saas: ativo (multi-tenant, API keys)
- genome:pci-dss: pendente (feature payment ainda não iniciada)

### Próxima vez que @dev abrir um arquivo de middleware:
"Este projeto usa o padrão X para Y. Antes de criar outro middleware, verifique
se auth.ts ou rate-limit.ts já resolve o que você precisa."
```

**Como o memory cresce:**
- @qa sign-off → extrai padrões da feature → append em memory.md
- @dev detecta anti-padrão → registra como aviso → memory.md
- @architect toma decisão → registra razão → memory.md

Memory não é log — é **destilação de aprendizado**.

---

## Arquitetura Lite (zero infra nova)

```
.aios-lite/
├── agents/              (existente)
├── context/             (existente)
├── squads/              (NOVO)
│   ├── genomes/         ← biblioteca de domínios (shipped com aios-lite)
│   │   ├── laravel.md
│   │   ├── node-typescript.md
│   │   ├── react.md
│   │   ├── nextjs.md
│   │   ├── django.md
│   │   ├── rails.md
│   │   ├── solidity.md
│   │   ├── fintech.md
│   │   ├── saas.md
│   │   ├── ecommerce.md
│   │   ├── web3.md
│   │   └── healthcare.md
│   ├── active/          ← squad gerado para este projeto
│   │   ├── squad.md     ← o squad ativo (gerado por squad:create)
│   │   └── memory.md    ← aprendizado acumulado (cresce com features)
│   └── library/         ← squads importados da comunidade
│       └── README.md
└── agents/
    └── squad.md         ← agente @squad
```

**Tudo markdown. Nenhuma dependência nova.**

---

## Comandos CLI

```bash
# Cria squad para o projeto atual (lê o codebase + detecta domínio)
aios-lite squad:create

# Especifica genomas manualmente
aios-lite squad:create --genome=laravel,saas,fintech

# Squad aprende com as últimas features aprovadas
aios-lite squad:evolve

# Importa squad da comunidade
aios-lite squad:import github:username/squad-name
aios-lite squad:import ./local-squad.md

# Exporta squad atual para compartilhar
aios-lite squad:export
aios-lite squad:export --output=./my-squad.md

# Status do squad ativo
aios-lite squad:status

# Combina dois genomas em um novo
aios-lite squad:blend fintech laravel --name=fintech-laravel

# Lista genomas disponíveis
aios-lite squad:genomes
```

---

## O Agente @squad

Diferente dos outros agentes, @squad tem dois modos:

### Modo Criação (squad:create)
Ativado automaticamente pelo CLI. Lê o projeto, detecta domínio, gera squad.md.
Não conversa — executa e entrega.

### Modo Consultor (invocado pelo usuário)
```
Usuário: @squad, estamos pensando em adicionar WebSockets ao projeto

@squad: Consultando squad memory e genoma node-typescript...

Com base neste projeto:
- Você usa Fastify — há o plugin @fastify/websocket (compatível com sua versão)
- Seu Redis já está configurado — Socket.IO com Redis adapter seria
  overkill para o caso de uso descrito; WebSocket nativo resolve
- Anti-padrão detectado antes: lógica duplicada em middlewares —
  certifique-se de reutilizar o authMiddleware existente no WS handler

Sugestão: 1 arquivo ws-handler.ts + reuso do auth.ts. Não cria novo middleware.
```

@squad fala com **contexto do projeto real**, não com conhecimento genérico.

---

## A Inovação do Context Injector

Aqui está o diferencial que o aiox-core não tem:

**Quando @dev abre qualquer arquivo, o squad injeta contexto silenciosamente.**

Em vez de o dev precisar invocar @squad explicitamente, o squad.md fica no
`project.context.md` como uma seção especial que todos os agentes leem:

```yaml
# project.context.md
---
squad_active: true
squad_genome: [laravel, saas]
squad_memory_path: .aios-lite/squads/active/memory.md
---
```

Todos os agentes que leem o context (todos) automaticamente sabem:
- "Existe um squad ativo"
- "Ele tem memoria em memory.md"
- "Leia antes de sugerir qualquer padrão"

**Zero configuração extra. Zero invocação manual.**

---

## Paralelismo Real — construído em cima do parallel:init existente

A aios-lite já tem `parallel:init` e `parallel:assign`.
O squad pode usar isso para execução paralela genuína:

```bash
aios-lite squad:create --parallel
```

Dispara 3 agentes simultaneamente:
```
Thread A: @analyst lê requirements e mapeia entidades
Thread B: @security-scout analisa riscos e compliance do domínio
Thread C: @pattern-scout busca padrões relevantes na codebase existente
```

Os 3 terminam → orchestrator sintetiza → @dev recebe contexto hiper-completo.

Isso é o que o aiox-core não consegue fazer de forma lite:
eles têm subagentes sequenciais. Nós temos paralelismo nativo.

---

## Squad Community Library — o Network Effect

O diferencial de longo prazo:

```bash
# Comunidade cria squads especializados
aios-lite squad:import github:makopy/squad-fintech-br
aios-lite squad:import github:jakiestfu/squad-stripe-saas
aios-lite squad:import github:laravelio/squad-laravel-best

# Lista squads da comunidade (futuro: registry)
aios-lite squad:search fintech
```

Um squad de fintech brasileiro criado por alguém com 10 anos de BACEN/PIX/LGPD
é infinitamente mais valioso que um squad gerado por pesquisa genérica.

**O valor aumenta com a comunidade** — como npm, mas para expertise de domínio.

---

## Genoma vs Squad vs Memory — o que é cada coisa

```
Genoma    = DNA universal de um domínio (Laravel, fintech, SaaS)
            → estático, shipped com aios-lite, atualizado via releases
            → Analogia: espécie biológica

Squad     = instância do genoma adaptada para um projeto específico
            → gerado por squad:create, vive em squads/active/
            → Analogia: indivíduo da espécie

Memory    = o que este indivíduo aprendeu com sua vida
            → cresce com cada feature, nunca decresce
            → Analogia: experiência acumulada
```

---

## Como isso supera o aiox-core ponto a ponto

| Dimensão | aiox-core | aios-lite Squad Genome |
|---|---|---|
| Origem do conhecimento | Pesquisa de experts humanos | Codebase real + genomas destilados |
| Adaptação ao projeto | Zero — squad genérico | Squad emerge DO projeto |
| Aprendizado | Estático após criação | Cresce com cada feature (memory) |
| Complexidade | 1300 linhas YAML + Python | Markdown puro |
| Paralelismo | Sequencial | Nativo via parallel:init |
| Comunidade | Fechado | Import/export de squads |
| Genome blending | Não tem | Sim — como CSS cascade |
| Stack | Node + Python | 100% Node |
| Context injection | Manual | Automático via project.context.md |
| Curva de aprendizado | Alta | Zero — mesmo modelo dos outros agentes |

---

## Roadmap de Implementação

### Sprint 1 — Fundação (menor esforço, maior impacto)
```
[ ] Estrutura de pastas: template/.aios-lite/squads/
[ ] 5 genomas iniciais: node-typescript, laravel, react, saas, fintech
[ ] Agente @squad (base + 4 locales)
[ ] Comando: squad:create (lê discovery.md + detecta genoma)
[ ] Comando: squad:status
```

### Sprint 2 — Memory System
```
[ ] squad:evolve (lê features done no features.md, extrai padrões)
[ ] Memory.md como output do @qa sign-off
[ ] Context injection em project.context.md
[ ] Integração: todos os agentes leem squad_memory_path se presente
```

### Sprint 3 — Paralelismo + Comunidade
```
[ ] squad:create --parallel (usa parallel:init)
[ ] squad:import / squad:export
[ ] squad:blend (merge de genomas)
[ ] 10+ genomas: rails, nextjs, django, web3, healthcare, ecommerce...
[ ] Docs: como criar e compartilhar um genoma
```

---

## O Squad em Ação — Exemplo Real

```
Projeto: makopy-receita (MCP server Node.js + Fastify + Prisma)

$ aios-lite squad:create

→ Lendo discovery.md...
→ Detectado: Node.js + TypeScript + Fastify + Prisma + Redis
→ Domínio inferido: api-saas (MCP server com billing)
→ Carregando genomas: node-typescript + api-saas
→ Gerando squad...

Squad criado: .aios-lite/squads/active/squad.md
Genomas ativos: node-typescript, api-saas
Memory inicializada: .aios-lite/squads/active/memory.md

---

[Após 3 features desenvolvidas]

$ aios-lite squad:evolve

→ Lendo features concluídas: auth, consultar-cnpj, rate-limit
→ Extraindo padrões...

Padrões aprendidos:
  ✅ ApiKey.lastUsedAt atualizado a cada chamada (padrão confirmado)
  ✅ Redis TTL sempre explícito (padrão confirmado)
  ⚠️ Rate limit duplicado em 2 arquivos → centralizado (anti-padrão resolvido)

Memory atualizada com 3 novos padrões.

---

[Semanas depois, desenvolvendo feature payment]

@dev abre payment-tool.ts

O squad injeta silenciosamente:
"Este projeto: usa ApiResponse<T>, tem rate limit centralizado em rate-limit.ts,
Redis com TTL explícito. Para payment: genome fintech recomenda log de auditoria
em toda transação financeira. Certifique-se de registrar em AuditLog antes do retorno."

@dev não precisou perguntar. O squad já sabia.
```

---

> Status: visão estratégica completa — pronto para Sprint 1
> Relacionado: mapping/62, 63, 64, 65
> Diferencial vs aiox-core: codebase-first, genome blending, living memory,
> context injection automático, paralelismo nativo, 100% markdown/Node.js
