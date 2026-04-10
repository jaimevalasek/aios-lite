# Future Ideas — Brainstorm

> Ideias em estágio inicial — sem compromisso de implementação
> Referência completa: mapping/63, mapping/64

---

## n8n Conversacional

Sistema onde você descreve um workflow em linguagem natural e ele é criado,
modificado e depurado via conversa. Diferente do n8n original (visual/drag-and-drop).

**Insight-chave:** não substituir o n8n — ser a camada de conversa em cima dele.
O n8n tem 400+ integrações prontas. Você entrega a interface, não a engine.

**Stack sugerida:** Claude + n8n API + chat interface
**Referência:** mapping/63

---

## aios-cloud (aios-lite sem fricção)

Plataforma web onde qualquer pessoa usa os agentes da aios-lite sem terminal,
sem CLI, sem setup técnico. Conecta o repositório, escolhe o agente, conversa.

**Diferencial:** contexto compartilhado por time, histórico versionado, multi-projeto.
**Monetização:** Free (1 projeto) → Team R$ 297/mês → Agency R$ 997/mês

---

## MCP Servers — Outros (além do makopy-receita)

Ver lista completa em `mapping/64`. Candidatos de maior impacto:

| Produto | Por que agora |
|---|---|
| makopy-whatsapp | Brasil tem 170M usuários — maior canal de comunicação |
| makopy-meli | Mercado Livre tem 500k+ sellers ativos, dispostos a pagar por automação |
| makopy-esocial | Toda empresa com CLT tem essa dor — mercado cativo |
| makopy-tribunais | Escritórios monitoram centenas de processos — dor diária |
| makopy-agro | Agro é 27% do PIB — poucos produtos digitais, alto ticket |

---

## Verticais com Alto Potencial (produtos completos)

**Clínicas e saúde:** agendamento + TISS + prontuário por conversa
**Jurídico:** monitoramento de processos + análise de contratos + DOU
**Agro:** commodities + clima + NF-e produtor + CAR
**Imobiliário:** gestão de carteira + reajustes + cobranças em lote
**Construção civil:** medições + curva ABC + cronograma físico-financeiro

---

## Referências

- mapping/62: AI task queue
- mapping/63: universo completo de produtos Makopy
- mapping/64: MCP servers business deep dive
- mapping/65: estrutura técnica MCP server
