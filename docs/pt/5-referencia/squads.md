# Squads — visão geral e operação

> Um squad é um time de agentes que **você** define, para qualquer domínio, empacotado dentro do projeto e invocável direto pelo nome.

O AIOSON já vem com o time de desenvolvimento (`@product`, `@dev`, `@qa`…). Squads são a parte que resolve o resto: criação de conteúdo, revisão jurídica, marketing, produção musical, atendimento — qualquer domínio que você consiga descrever.

Esta página é o mapa. O detalhe de cada assunto está nas páginas linkadas.

---

## Criar um squad

O agente `@squad` conduz a criação. Você descreve domínio, objetivo e papéis; ele investiga o domínio (via `@orache` quando o assunto é desconhecido ou regulado), monta o blueprint e gera o pacote.

```
Você > @squad
> domínio: criação de conteúdo para YouTube
> objetivo: roteiro, ganchos e retenção
> papéis: roteirista, analista-de-gancho, estrategista-de-thumbnail, orchestrator
```

Cada squad vira um pacote em `.aioson/squads/{slug}/` — manifesto, executores, vínculo de genome, assets. As entregas ficam em `output/{slug}/`. Todo executor é invocável direto: `@roteirista`, `@analista-de-gancho`.

Ficha completa do agente: [`4-agentes/squad.md`](../4-agentes/squad.md).

### Squad efêmero

Para uma tarefa de uma vez só, sem o fluxo completo de design doc:

```
Você > @squad --ephemeral
> domínio: análise competitiva para este pitch
> ttl: 24h
```

O manifesto recebe `"ephemeral": true` e, opcionalmente, `"ttl": "24h"`. O pacote continua em `.aioson/squads/{slug}/` e a saída em `output/{slug}/`, mas o squad **não** é registrado em `CLAUDE.md` nem em `AGENTS.md` — ele não polui o contexto permanente do projeto. O trabalho profundo de design e readiness é pulado de propósito.

Use para pesquisa, rascunho rápido ou exploração.

### Roteamento entre squads

Quando existem vários squads no mesmo projeto, o orchestrator de cada um enxerga os irmãos: ele varre `.aioson/squads/`, lê o `squad.md` de cada vizinho e, quando um pedido pertence a outro domínio, roteia explicitamente em vez de absorver o trabalho ou inventar resposta. Quando o assunto exige colaboração, ele coordena um handoff.

```
projeto/
  .aioson/squads/
    conteudo/     @roteirista, @analista-de-gancho, @orchestrator
    dev/          @architect, @dev, @qa, @orchestrator
    juridico/     @analista-de-risco, @revisor-de-clausula, @orchestrator
```

Um squad nunca duplica a responsabilidade de outro sem pedido explícito.

---

## Pilot — o entregável que prova o squad

`squad:validate` prova estrutura. `squad:eval` prova aterramento. Nenhum dos dois prova que o squad consegue entregar o artefato flagship do domínio dele na régua de qualidade que **você** tem na cabeça.

O **pilot** prova. É um entregável representativo do domínio — uma landing cinematográfica, uma tela de pipeline de CRM — construído pelos executores do próprio squad, iterado em rascunho e congelado por você.

**Aprovação por artefato, não por prosa.**

### Onde cada peça vive

| Peça | Caminho | Por quê |
|---|---|---|
| Estado canônico (bloco `pilot`) | `.aioson/squads/{slug}/squad.manifest.json` | é o contrato que os importadores já validam — sem arquivo paralelo para dessincronizar |
| Doc de evidência | `.aioson/squads/{slug}/docs/PILOT.md` | viaja junto com o pacote |
| O entregável | `output/{slug}/pilot/` | arquivo de verdade; nada de HTML dentro de `.aioson/` |

O bloco `pilot` no manifesto carrega `status` (`not_applicable`, `pending`, `draft`, `approved`), `task`, `entrypoint`, `fingerprint`, `approved_at`, `builders` e `deferReason`.

O `PILOT.md` tem exatamente quatro seções: `## Pilot task`, `## Validations` (comandos exatos executados com o resultado observado — honesto, nunca fabricado), `## Binds` e `## Does not bind`.

### Quem precisa de pilot

- **Squads de classe entregável** (`mode: software` ou `mixed`): o pilot faz parte da prontidão. A lane `standard` e acima constrói; `quick` pode adiar com um `pilot.deferReason` concreto; `regulated` e `premium` nunca adiam.
- **Squads de conteúdo e pesquisa**: registram `pilot.status: not_applicable`. Nunca fabrique um entregável só para satisfazer o gate.

### O que o pilot vincula — e o que não

**Vincula:** a assinatura visual e de interação — linguagem de layout, motion, estados, máscara e validação, contratos de confirmação e de drag-and-drop, profundidade de acabamento.

**Não vincula:** integração com dados reais, escala, a superfície completa da feature. O pilot é a menor vertical representativa, nunca o produto.

### O ciclo

```bash
# 1. Estrutura e aterramento (barato antes de caro)
aioson squad:validate . --squad=cinematic-web --strict
aioson squad:eval . --squad=cinematic-web

# 2. Os executores do próprio squad constroem o pilot.
#    O @squad orquestra e nunca escreve o entregável no lugar deles.

# 3. Lint determinístico — corrija cada problema
aioson verify:artifact . --kind=squad-pilot --slug=cinematic-web --advisory

# 4. Você inspeciona o entrypoint e congela
aioson squad:pilot-approve . --squad=cinematic-web
```

O comando recusa congelar enquanto o gate apontar problema. Passando, carimba `status: approved`, o `fingerprint` recalculado do entregável, `approved_at` e `builders`.

### Depois da aprovação

O pilot vira a régua vinculante do squad: toda sessão futura que produz entregável carrega o bloco `pilot` e o `PILOT.md` como referência de qualidade. Entrega abaixo daquela assinatura é achado, não escolha de estilo.

Editar o entregável depois da aprovação deixa o `fingerprint` obsoleto e a prontidão cai até você reaprovar — comportamento correto, não erro.

O congelamento também registra **quem** construiu: `builders` guarda a identidade (`sourceHash`, `compilationId`) dos bindings de genome compilados no momento da aprovação. Um enrich ou recompile muda os executores sem mudar `output/`, então esse desvio aparece como aviso do lint: o pilot continua sendo o artefato aprovado, mas o squad que o construiu já não existe naquela forma.

Um pilot aprovado também é evidência do que "bom" significa naquele domínio. O `@squad` pode oferecer destilar essa assinatura para `.aioson/skills/squad/domains/{domain}.md` — nunca automaticamente — para que o próximo squad do mesmo domínio já nasça sabendo o que o primeiro aprendeu.

> `squad:pilot-approve` é exclusivamente seu. Nenhum agente roda esse comando.

---

## Genome — a camada cognitiva

Skill diz ao agente **o que fazer**. Genome diz **como pensar**: modelos mentais, heurísticas de julgamento, anti-padrões, vocabulário e benchmarks de referência.

Quatro tipos: `domain`, `function`, `persona` e `hybrid`.

- Especificação técnica dos campos (incluindo `disc`, `enneagram`, `big_five`, `mbti`, `hexaco_h`, `confidence`, `hybrid_mode`): [Genome 4.0](./genome-4.0-spec.md)
- Ficha do agente: [`4-agentes/genome.md`](../4-agentes/genome.md)
- Publicar e instalar genomes: [Distribuição de genomes](./genome-distribution.md)

### Aprovação por espécime

Assim como o pilot congela a qualidade do squad, a **aprovação por espécime** congela a fidelidade de um genome. `genome:doctor` prova estrutura e o A/B held-out prova pontuação — nenhum dos dois prova que o comportamento compilado carrega a identidade da fonte.

1. Um executor do próprio squad, com o binding **compilado** ativo, produz um espécime held-out em `output/{squad}/specimen/{genome}/`.
2. Você lê o espécime e responde uma pergunta: isso soa como a fonte?
3. Se sim, congele.

```bash
aioson genome:approve . --squad=<slug> --genome=<slug> [--executor=<slug>] [--specimen=<path>]
```

O comando grava um bloco `approval` no binding dentro do `squad.manifest.json` (`specimen`, `sourceHash`, `compilationId`, `approvedAt`). Ele recusa binding que não esteja `compiled`, espécime ausente ou fora de `output/`, e binding ambíguo — nesse caso passe `--executor=<slug>`.

Enriquecer ou recompilar o genome torna a aprovação **stale** até você reaprovar. O drift aparece como aviso em `aioson verify:artifact . --kind=genome --slug=<genome>`, nomeando cada squad afetado.

Detalhes e exemplos: [Comandos do CLI](./comandos-cli.md#aprovação-de-genome-por-espécime-genomeapprove).

### Pipeline de persona (Profiler)

Quando o squad gira em torno da metodologia de uma pessoa específica, o AIOSON perfila essa pessoa e injeta a impressão digital cognitiva dela no time:

```
@genome --type=persona
   │
   ▼ @profiler-researcher     pesquisa: livros, entrevistas, frameworks
   │
   ▼ @profiler-enricher       análise cognitiva e psicométrica
   │
   ▼ @profiler-forge          gera o genome
   │
   ▼ aplicado a um executor do squad
```

Fichas: [`profiler-researcher`](../4-agentes/profiler-researcher.md) · [`profiler-enricher`](../4-agentes/profiler-enricher.md) · [`profiler-forge`](../4-agentes/profiler-forge.md).

### Perfil comportamental do executor

`squad:agent-create` aceita `--disc=<perfil>` para dar ao executor um perfil comportamental — estilo de comunicação, velocidade de decisão e forma de lidar com conflito passam a combinar com a dinâmica do time.

```bash
aioson squad:agent-create . --name=revisor --scope=squad --squad=juridico \
  --type=agent --tier=1 --disc=compliant-analytical \
  --mission="Revisar cláusulas contra o checklist regulatório"
```

---

## Operação do dia a dia

| Quero | Onde está |
|---|---|
| Provar que o squad entrega no meu padrão de qualidade | [Pilot](#pilot--o-entregável-que-prova-o-squad) |
| Congelar a fidelidade de um genome a partir de um espécime | [Aprovação por espécime](#aprovação-por-espécime) |
| Monitorar squads em tempo real num painel web | [Squad Dashboard](./squad-dashboard.md) |
| Transformar processos do squad em scripts sem LLM | [Automação de squads](./automacao-squads.md) |
| Entregar conteúdo automaticamente (webhook de saída, delivery) | [Output strategy e delivery](./output-strategy-delivery.md) |
| Publicar ou instalar um squad | [AIOSON Store](./aioson-com-store.md) · [receita de publicação](../3-receitas/publicar-no-aioson-com.md) |
| Lista completa de comandos `squad:*` | [Comandos do CLI](./comandos-cli.md) |

---

## Servidor de webhook — acionar squads de fora

O AIOSON traz um servidor HTTP embutido (`node:http`, sem dependência extra). Sistemas externos — WhatsApp, Telegram, Slack, ERPs — acionam um squad e recebem a resposta de forma assíncrona por callback.

```bash
# Porta padrão 3210; pode vir de AIOSON_WEBHOOK_PORT
aioson squad:webhook . --sub=start --port=3210

# Gerar o trecho de configuração do OpenClaw para um canal
aioson squad:webhook . --sub=config --channel=whatsapp --squad=atendimento
```

O servidor descobre sozinho os squads em `.aioson/squads/` e executa o primeiro worker elegível do squad pedido.

### Endpoints

| Método | Caminho | O que faz |
|---|---|---|
| `GET` | `/health` | Health check. Único endpoint sem autenticação. |
| `POST` | `/trigger` | Execução assíncrona. Corpo: `squad`, `input`, `session_id`, `callback_url`, `metadata`. Devolve um `run_id`; a resposta chega depois no `callback_url`, com retry. |
| `GET` | `/status/:run_id` | Consulta o estado de uma execução. |
| `POST` | `/query` | Execução síncrona, com `max_results`. |

### Autenticação e limites

- **Bearer token** em `AIOSON_WEBHOOK_TOKEN` (ou `--token`). Sem token, o servidor sobe **sem autenticação** e avisa no stderr — não faça isso em rede exposta.
- **Rate limit** de 60 requisições por minuto por IP. Acima disso, `429`.
- **Sessão conversacional**: `session_id` mantém o histórico entre chamadas. O TTL padrão é 24 h, ajustável pela variável `AIOSON_SESSION_TTL_HOURS`; sessões expiradas são limpas ao subir o servidor.

Encerre com `Ctrl+C` — o servidor trata `SIGINT`/`SIGTERM` e fecha limpo.

---

## Ver também

- [Ficha do agente `@squad`](../4-agentes/squad.md)
- [Squad Dashboard](./squad-dashboard.md)
- [Automação de squads](./automacao-squads.md)
- [Genome 4.0](./genome-4.0-spec.md)
- [Comandos do CLI](./comandos-cli.md)
