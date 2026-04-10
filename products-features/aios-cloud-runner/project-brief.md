# Project Brief — aios-cloud-runner

> Execução remota de tarefas do AIOS Lite com runner local, claim de jobs e suporte a executores por API ou CLI
> Status: ideia validada conceitualmente — manter para evolução futura do ecossistema

---

## O que é

Um sistema onde o `aioslite.com` funciona como plano de controle remoto e um
`runner local` instalado na máquina do usuário executa tasks publicadas online.

Fluxo desejado:

```text
Usuário publica Squad no AIOS Lite Cloud
    ↓
Usuário cria task no site e clica em Play
    ↓
Task entra em fila remota
    ↓
Runner local autenticado detecta a task
    ↓
Runner faz claim exclusivo
    ↓
Runner resolve a Squad, carrega manifest + skills
    ↓
Executor roda agentes via API ou CLI
    ↓
Runtime local grava SQLite, artifacts, events e outputs
    ↓
Dashboard local observa tudo em tempo real ou quase tempo real
    ↓
Resumo/status volta para o cloud
```

---

## Visão do produto

O objetivo não é fazer a UI do dashboard executar jobs diretamente.
O objetivo é separar claramente:

- `Cloud/site`: agenda, fila, controle remoto, histórico resumido
- `Runner local`: execução real e acesso ao ambiente do cliente
- `Dashboard`: observabilidade operacional
- `SQLite local`: estado do runtime
- `Squad package`: definição portátil do trabalho

Isso permitiria ao AIOS Lite suportar automações locais disparadas pelo site,
sem depender de abrir manualmente terminais ou manter sessões interativas.

---

## Problema que resolve

Hoje o dashboard local já observa runtime e já publica/importa Squads, mas ainda
não existe uma camada headless para:

- receber jobs remotos
- fazer claim seguro
- executar agentes localmente
- manter heartbeat e controle de concorrência
- reportar progresso de volta ao cloud

Esse gap impede cenários como:

- criar uma task no site e executá-la na máquina do usuário
- transformar Squads em automações operacionais para clientes
- ensinar um padrão profissional de `cloud orchestration + local execution`

---

## Proposta arquitetural mínima

### Componentes

```text
aioslite.com
  ├─ jobs
  ├─ job claims
  ├─ schedules / play actions
  ├─ web UI
  └─ API de controle

Runner local
  ├─ poller / websocket client
  ├─ claim worker
  ├─ executor router
  ├─ runtime writer (SQLite)
  └─ artifact/content sync

Executores
  ├─ API executors
  │   ├─ Codex API
  │   └─ Claude API
  └─ CLI executors
      ├─ codex-cli
      └─ Claude Code
```

### Regra principal

Sempre usar `claim` antes de executar.

Sem `claim`, duas máquinas podem pegar o mesmo job.
Com `claim`, o backend garante que apenas um runner assume a task.

---

## Estratégia recomendada de execução

### MVP

- fila remota no banco principal do site
- polling pelo runner a cada 30s ou 60s
- endpoint de `claim` atômico
- execução sequencial ou com concorrência limitada
- heartbeats periódicos
- escrita local em SQLite
- update de status para o cloud

### Evolução

- Redis / BullMQ para escala
- WebSocket ou SSE apenas para wake-up signal
- retries sofisticados
- prioridades por workspace
- cancelamento remoto
- múltiplos runners por organização

---

## Polling vs WebSocket

### Polling

É suficiente para começar.
Verificar jobs a cada 1 minuto é aceitável para muitos casos.

Vantagens:
- simples
- robusto
- fácil de operar
- funciona bem em Windows e Linux

### WebSocket

Pode ser adicionado depois, mas não deve substituir o `claim`.

Uso ideal:
- runner local abre conexão de saída para o cloud
- cloud sinaliza que há job novo
- runner consulta API e faz `claim`

Ou seja:
- WebSocket acelera descoberta
- API + claim continuam sendo a fonte da verdade

---

## API vs CLI como executor

### API executor

Deve ser o padrão principal quando o objetivo for produto estável.

Vantagens:
- contrato mais previsível
- menos dependência de TTY/sessão
- controle melhor de timeout, retry e observabilidade
- menor fragilidade em upgrades

### CLI executor

Pode existir como adaptador opcional.

Casos possíveis:
- `codex-cli`
- `Claude Code`

Riscos:
- CLIs costumam ser orientados a uso humano
- podem exigir sessão local interativa
- saída pode mudar entre versões
- concorrência pode ficar frágil
- timeout/cancelamento tende a ser mais complexo

Direção recomendada:
- `API first`
- `CLI optional`

---

## Stack Node.js sugerida

### Runner local

- `Node.js 20+`
- `child_process.spawn` para subprocessos quando necessário
- `worker_threads` para concorrência interna controlada
- `better-sqlite3` ou driver equivalente para runtime local
- `pino` para logs estruturados
- `zod` para validar contratos

### Agendamento e fila

#### MVP
- banco do site + polling + claim

#### Escala
- `BullMQ` + Redis
- ou solução equivalente de job queue

### Operação cross-platform

- Linux: `systemd`
- Windows: Task Scheduler ou serviço Windows
- dev simples: `pm2`

---

## Entidades sugeridas no cloud

```text
RemoteJob
- id
- workspace_id
- squad_slug
- task_type
- payload_json
- status
- priority
- requested_by_user_id
- scheduled_at
- created_at
- started_at
- finished_at
- assigned_runner_id
- claimed_at
- heartbeat_at
- result_summary
- error_message

Runner
- id
- workspace_id
- machine_name
- os_family
- version
- last_seen_at
- status
- capabilities_json

JobClaim
- id
- job_id
- runner_id
- claimed_at
- released_at
- status
```

Status iniciais possíveis:
- `pending`
- `claimed`
- `running`
- `waiting_input`
- `completed`
- `failed`
- `cancelled`
- `timed_out`

---

## Integração com o AIOS Lite existente

Base já existente no ecossistema:
- Squads como pacote publicável/importável
- dashboard local como painel de observabilidade
- runtime SQLite para tasks, agent_runs, artifacts, events e content_items

O que faltaria construir:
- runner local headless
- fila remota com claim
- contrato de execução por executor
- sync de status cloud <-> runtime local
- UI no site para criar task e clicar em Play

---

## Casos de uso futuros

1. Cliente publica Squad operacional e agenda tarefas pelo site.
2. Empresa mantém runner local dentro da própria infra para automações seguras.
3. Cursos ensinam como construir operações AI-first usando `cloud control + local execution`.
4. Squads viram produtos executáveis, não apenas pacotes importáveis.
5. AIOS Lite pode servir como base para serviços customizados implementados para clientes.

---

## Riscos e cuidados

- não executar jobs direto da UI web
- não depender de abrir vários terminais manualmente
- não permitir execução sem claim
- não misturar definição da Squad com estado de runtime
- não depender exclusivamente de CLI para produção
- proteger tokens locais e segredos do usuário
- ter timeout, heartbeat e recuperação de runner offline

---

## Próximos passos quando priorizar

```text
[ ] Desenhar PRD técnico do runner local
[ ] Definir contrato de claim no backend do aioslite.com
[ ] Escolher executor inicial: API first ou CLI first para spike
[ ] Fazer prova de conceito: runner local + polling + claim + 1 executor
[ ] Persistir agent_runs / tasks / artifacts no SQLite com o mesmo contrato do dashboard
[ ] Adicionar UI no site para criar task remota e clicar em Play
```

---

## Tese principal

O caminho mais robusto para o AIOS Lite não é abrir vários terminais.
É ter um `runner local` contínuo, headless e multiplataforma, controlado pelo
cloud e observável pelo dashboard.

Essa arquitetura preserva a ideia de Squad como pacote, separa runtime da UI e
abre espaço para produto, cursos e serviços implementados para clientes.
