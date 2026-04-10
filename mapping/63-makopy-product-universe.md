# 63 — Universo de Produtos e Serviços Makopy sobre aios-lite

> Brainstorm estratégico — sessão 2026-03-05
> Base: aios-lite (grátis, open source) + Makopy (empresa/marca) + MCP como vetor de receita

---

## A Arquitetura de Camadas (o mapa mental)

```
Camada 4 — Serviços gerenciados (recorrente, alto valor)
Camada 3 — Produtos verticais (SaaS, nicho específico)
Camada 2 — Plataforma (n8n conversacional, MCP servers, dashboard)
Camada 1 — aios-lite (grátis, open source, gerador de adoção)
```

Cada camada alimenta a de cima. aios-lite gera confiança e developer love.
A Makopy monetiza nas camadas 2, 3 e 4.

---

## PRODUTO A — n8n Conversacional (o maior)

### O que existe hoje
n8n, Zapier, Make (Integromat), Activepieces — todos visuais, drag-and-drop.
Zapier Copilot e n8n AI nodes: começando a adicionar IA, mas ainda não são conversacionais de verdade.

### O que não existe
Um sistema onde você **fala** o que quer e o workflow é criado, modificado e depurado em conversa.

### Como funcionaria
```
Usuário: "quando um pedido acima de R$1000 entrar no Shopify,
          verifica estoque no ERP, se tiver manda nota no WhatsApp
          para o vendedor, se não tiver abre ticket no Jira"

Sistema: [gera workflow visual]
         "Montei isso — quer revisar antes de ativar?
          Também detectei que você não mapeou o que fazer
          se o Jira estiver fora do ar."

Usuário: "bom ponto, se o Jira falhar manda email para o gerente"

Sistema: [atualiza workflow] "Atualizado. Ativando?"
```

### Stack possível
- **Engine**: n8n self-hosted ou Activepieces como backend de execução
- **IA**: Claude como interface conversacional + gerador de workflow JSON
- **MCP**: servidor Makopy expõe a engine para qualquer cliente Claude
- **Frontend**: chat primeiro, preview visual como secundário

### Receita
| Tier | O que inclui | Preço sugerido |
|---|---|---|
| Free | 100 execuções/mês, 5 workflows | R$ 0 |
| Pro | 10k execuções, integrações ilimitadas | R$ 197/mês |
| Business | Volume + SLA + suporte | R$ 997/mês |
| Enterprise | On-premise + custom | Negociado |

---

## PRODUTO B — MCP Servers como Serviço (infraestrutura de receita)

### O que é MCP
Model Context Protocol (Anthropic) — padrão para conectar LLMs a ferramentas externas.
Qualquer empresa com um MCP server vira um "plugin nativo" para Claude e outros modelos.

### MCP Servers que a Makopy poderia construir e vender acesso

#### Brasil-first (vantagem competitiva clara)
| MCP Server | O que faz | Quem paga |
|---|---|---|
| **makopy-nfe** | Emite, consulta e cancela NF-e via SEFAZ | Contadores, e-commerces, SaaS |
| **makopy-cnpj** | Consulta CNPJ, situação fiscal, sócios, certidões | Jurídico, RH, financeiro |
| **makopy-pix** | Gera cobranças PIX, consulta status, reconciliação | Qualquer negócio |
| **makopy-dou** | Busca no Diário Oficial da União em tempo real | Jurídico, compliance, gov |
| **makopy-sintegra** | Consulta situação fiscal estadual | Contadores, distribuidores |
| **makopy-whatsapp** | API WhatsApp Business (envio, recebimento, templates) | Varejo, serviços, clínicas |

#### Developer tools
| MCP Server | O que faz | Quem paga |
|---|---|---|
| **makopy-deploy** | Controla deploys (Vercel, Railway, Render, VPS) via chat | Times de dev |
| **makopy-infra** | Cria/destrói recursos AWS/GCP via linguagem natural | DevOps, startups |
| **makopy-db** | Query + migração + backup em banco via conversa | DBAs, devs |
| **makopy-logs** | Analisa logs de produção, detecta anomalias | Times de produto |

#### Integrações de mercado
| MCP Server | O que faz | Quem paga |
|---|---|---|
| **makopy-meli** | Mercado Livre: produtos, pedidos, mensagens | Sellers ML |
| **makopy-vtex** | VTEX: catálogo, promoções, pedidos | E-commerces enterprise |
| **makopy-totvs** | Integra com ERP TOTVS (dominante no Brasil) | PMEs com TOTVS |
| **makopy-omie** | Omie ERP: financeiro, estoque, NF | Pequenas empresas |

### Modelo de Receita MCP
```
Free:       acesso básico, rate limit baixo
Pro:        R$ 97/mês por servidor, rate limit alto
Enterprise: bundle completo, SLA, suporte
```
O MCP server vira um SaaS de API — você cobra por chamada ou por assinatura mensal.

---

## PRODUTO C — aios-cloud (aios-lite sem fricção)

### O problema
aios-lite precisa de Node, de Claude no terminal, de setup técnico.
90% das empresas que se beneficiariam disso não têm um dev disponível para instalar.

### A solução
Uma plataforma web onde o usuário:
1. Conecta o repositório (GitHub, GitLab, Bitbucket)
2. Escolhe o agente (@product, @dev, @qa, etc.)
3. Conversa via interface web — sem terminal, sem CLI
4. Os agentes rodam no cloud da Makopy

### Diferencial
- O contexto do projeto fica salvo na Makopy (sem precisar reconfigurar)
- Time inteiro acessa o mesmo contexto compartilhado
- Histórico de conversas, PRDs, specs — tudo versionado

### Receita
| Tier | O que inclui | Preço |
|---|---|---|
| Free | 1 projeto, 50 mensagens/mês | R$ 0 |
| Team | 5 projetos, 3 usuários, ilimitado | R$ 297/mês |
| Agency | Projetos ilimitados, 10 usuários, white-label | R$ 997/mês |

---

## MERCADOS QUE A MAIORIA NÃO ENXERGA

### 1. AI para Agro (Brasil é potência mundial)
O agronegócio responde por ~27% do PIB brasileiro.
Agricultores médios e grandes têm problemas complexos de gestão mas poucos desenvolvedores.
- Gestão de safra por conversa ("qual o custo por hectare desta safra?")
- Análise de contratos de venda de soja via IA
- Alertas de clima integrados com planejamento de plantio
- **Makopy poderia construir**: aios-agro como vertical especializado

### 2. AI para Clínicas e Consultórios
Brasil tem ~500k médicos, ~350k dentistas, milhares de clínicas.
A maioria usa sistemas caros e ruins (Tasy, MV, PEP).
- Agendamento conversacional por WhatsApp
- Prontuário eletrônico por voz/texto
- Faturamento TISS (convênios) automatizado
- **Regulação**: LGPD + CFM — quem resolver isso primeiro domina

### 3. Modernização de Sistemas Legados (enterprise)
Bancos, utilities, governo: COBOL, AS/400, sistemas dos anos 80-90.
Custo de modernização: bilhões. Escassez de devs que entendem o legado.
- IA que lê, documenta e explica código legado
- Gera especificação para reescrita moderna
- **aios-lite já faz discovery — é um embrião disso**

### 4. BPO AI-first (outsourcing aumentado por IA)
O mercado de BPO (terceirização de processos) no Brasil é de ~R$ 15bi/ano.
Call centers, entrada de dados, processamento de documentos.
Um operador humano + IA faz o trabalho de 5 operadores tradicionais.
- **Makopy poderia oferecer**: operações de backoffice aumentadas por IA para PMEs

### 5. Jurídico e Cartório (papel virou dado)
- Análise de contratos ("este contrato tem cláusula abusiva?")
- Automação de petições repetitivas
- Monitoramento de processos (TJ, STJ, STF) com alertas
- Certidões negativas automáticas via MCP
- Mercado enorme, digitalização lenta = janela de oportunidade

### 6. Educação Técnica Personalizada
- AI tutor que acompanha o aluno no próprio ritmo
- Geração de exercícios personalizados por nível
- Feedback imediato em código, redação, matemática
- Brasil tem 50M+ estudantes no ensino básico/técnico/superior

### 7. Compliance e LGPD como Serviço
Desde 2020 a LGPD é obrigatória. A maioria das PMEs não está adequada.
- Mapeamento automatizado de dados sensíveis
- Geração de políticas de privacidade
- Gestão de consentimento
- Relatório de incidentes
- **Quem não faz isso paga multa — dor real, pagamento garantido**

---

## INSIGHTS VISIONÁRIOS (10 anos à frente)

### 1. O fim do software customizado tradicional
Hoje: empresa paga R$ 500k para uma software house desenvolver um sistema.
Amanhã: empresa descreve o sistema em linguagem natural, IA gera e mantém.
**aios-lite é a proto-versão disso para times de dev.**
A Makopy pode ser a software house que sobrevive porque incorporou IA antes das outras.

### 2. Agentes como funcionários assíncronos
Não é "IA que ajuda humano". É "agente que executa tarefa, humano aprova pontos críticos."
(Exatamente o que o job queue da conversa anterior descreveu)
O modelo de precificação futuro não será por assinatura — será **por resultado entregue**.

### 3. WhatsApp como sistema operacional de negócios no Brasil
Para a maioria das PMEs brasileiras, WhatsApp já É o CRM, o suporte, o canal de vendas.
Qualquer produto que trate WhatsApp como interface primária (não como notificação) tem vantagem enorme.
**makopy-whatsapp MCP + aios-tasks = produto completo para SMB brasileiro.**

### 4. O mercado de "AI para quem não sabe usar AI"
Prompt engineering vai desaparecer. O futuro é o produto que não exige que o usuário saiba pedir.
O produto entende o contexto, faz as perguntas certas (como o @product), e entrega.
**aios-lite já tem essa filosofia — é uma vantagem competitiva real.**

### 5. Dados proprietários como moat
Qualquer empresa que acumular dados de como times de dev trabalham (quais agentes usam, quais decisões tomam, quais patterns de código emergem) terá um ativo imenso para treinar modelos especializados.
**Cada projeto que roda no aios-cloud é dado de treinamento futuro.**

---

## MATRIZ DE OPORTUNIDADE

| Produto/Serviço | Esforço | Receita Potencial | Urgência |
|---|---|---|---|
| MCP Servers Brasil-first | Médio | Alto | AGORA |
| aios-cloud (hosted) | Alto | Muito alto | 6 meses |
| n8n Conversacional | Muito alto | Enorme | 12 meses |
| aios-tasks (job queue) | Alto | Alto | 6-12 meses |
| Vertical Agro | Médio | Alto | 12 meses |
| Vertical Jurídico | Médio | Alto | 12 meses |
| LGPD como Serviço | Baixo | Médio | AGORA |
| BPO AI-first | Alto | Muito alto | 18 meses |

---

## ONDE COMEÇAR (opinião)

**Passo 1 — Menor esforço, validação rápida:**
Construir 2-3 MCP servers Brasil-first (NF-e, CNPJ, PIX).
Cobrar acesso via assinatura mensal.
Valida se empresas pagam por isso sem precisar construir produto completo.

**Passo 2 — Produto com mais tração:**
aios-cloud para agências de software.
Agências já entendem o valor de aios-lite, já têm times que usariam.
Monetização fácil de justificar: "sua equipe já usa, agora com contexto compartilhado."

**Passo 3 — A aposta grande:**
n8n conversacional ou aios-tasks, dependendo do que validou nos passos 1 e 2.

---

> Status: visão estratégica — brainstorm sem compromisso de implementação.
> Relacionado: mapping/62 (AI task queue), aios-lite como camada base.
