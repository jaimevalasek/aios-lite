# Project Brief — aios-tasks

> AI-native async workflow engine com human-in-the-loop
> Status: visão definida — implementar após makopy-receita validar o modelo de negócio

---

## O que é

Uma fila de tarefas onde os workers são agentes LLM em vez de código fixo.
Uma mensagem chega ("faça X"), vira uma tarefa persistida no banco, um agente LLM
executa, e quando precisa de confirmação humana cria um sub-job — que notifica o
usuário (WhatsApp / email / Slack) e aguarda resposta antes de continuar.

**Proposta de valor:**
> "Você descreve o que precisa fazer. O agente executa. Quando precisar de você,
> te pergunta. Quando terminar, te avisa."

---

## Por que é diferente de tudo que existe

| Solução | Limitação |
|---|---|
| Temporal.io / Inngest | Workers são código, não raciocínio |
| LangGraph / CrewAI | Síncronos, sem persistência real |
| Zapier / Make | Sem reasoning, apenas triggers fixos |
| Horizon / Sidekiq | Filas robustas mas zero inteligência |

**O gap:** fila assíncrona + agente LLM como worker + confirmação humana como
sub-job + continuação automática.

---

## Conceitos-chave

### Trust Level ("sudo para IA")
```
criar arquivo         → autônomo (executa sem perguntar)
deletar arquivo       → confirmar (pausa e pergunta)
rodar migração        → confirmar + notificar tech lead
fazer deploy          → confirmar + aguardar janela definida
```
O usuário configura o nível de autonomia. Isso é o que fecha contrato com CTO.

### LLM Cascade (custo controlado)
```
LLM cara  (Claude Opus / GPT-4)  → raciocina, planeja, executa
LLM barata (Claude Haiku / mini) → classifica resposta, roteia job
Sem LLM                          → update de status, envio de notificação
```

### Sub-job de confirmação
```
Task principal rodando
    ↓ precisa de permissão
Cria sub-job { taskId, pergunta, timeout: "4h" }
    ↓
Sub-job notifica usuário (WhatsApp/email)
    ↓
Usuário responde "sim" ou "não"
    ↓
LLM barata classifica resposta → cria próximo job
    ↓
Task principal continua
```

---

## Entidades do banco

```
Task         — id, intent, status, createdBy, createdAt, completedAt, logs[]
Job          — id, taskId, type, status, payload, result, createdAt
Confirmation — id, jobId, question, sentAt, answeredAt, answer, channel
Notification — id, taskId, channel, message, sentAt
```

**Status da Task:** `pending → running → waiting_confirmation → done / failed / cancelled`

---

## Stack sugerida (a definir em @architect)

```
Runtime:    Node.js 20+ ou Bun
Fila:       BullMQ (Redis-based, madura, excelente DX)
Banco:      PostgreSQL + Prisma
LLM:        Anthropic SDK (Claude Opus para razão, Haiku para routing)
Notif.:     makopy-whatsapp MCP + Resend (email)
API:        Fastify
Deploy:     Railway
```

---

## Casos de uso que validam o produto

1. **DevOps:** "Faz deploy da feature X em staging e me avisa se der erro"
2. **Dados:** "Processa os 5.000 cadastros do CSV e normaliza os CEPs"
3. **Conteúdo:** "Gera os posts de redes sociais do mês baseado no calendário"
4. **Financeiro:** "Reconcilia os pagamentos de março com as notas fiscais"
5. **Suporte:** "Classifica e responde os tickets de baixa prioridade de hoje"

---

## Modelo de negócio

```
Free:       5 tasks/mês, sem confirmações por WhatsApp
Pro:        500 tasks/mês — R$ 197/mês
Business:   ilimitado + SLA + suporte — R$ 997/mês
Enterprise: on-premise + integração customizada — negociado
```

Alternativa: cobrar por task executada (R$ 0,50–2,00/task dependendo do LLM usado).

---

## Próximos passos (quando chegar a hora)

```
[ ] Validar demanda: conversar com 5 devs/CTOs sobre o trust level concept
[ ] Spike técnico: BullMQ + job básico com LLM worker
[ ] Definir o canal de confirmação prioritário (WhatsApp ou email primeiro?)
[ ] Criar makopy-receita primeiro — valida modelo de negócio e infra base
```

---

## Referências

- Visão original: `mapping/62-future-product-vision-ai-task-queue.md`
- BullMQ docs: https://docs.bullmq.io
- Temporal.io (referência de arquitetura): https://temporal.io
