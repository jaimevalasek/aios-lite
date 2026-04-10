# 64 — MCP Servers como Negócio: Deep Dive Completo

> Brainstorm estratégico — sessão 2026-03-05
> Foco: oportunidades de negócio via MCP servers para a Makopy

---

## O que é um MCP Server (em linguagem de produto)

MCP (Model Context Protocol) é o padrão aberto da Anthropic para conectar LLMs a ferramentas externas.
Na prática: você constrói um servidor que expõe capacidades, e qualquer cliente compatível
(Claude Desktop, Claude Code, Cursor, IDEs, apps customizados) pode usar essas capacidades via IA.

**Por que é um negócio:**
- Você vende acesso ao servidor (assinatura ou por chamada)
- O cliente não precisa saber programar — usa via conversa com Claude
- Você constrói UMA vez e qualquer usuário de Claude no mundo pode usar
- É como construir um plugin na App Store, mas para IA

**Analogia**: É o que a Twilio fez com SMS/voz — transformou API técnica em produto simples com billing.

---

## CATEGORIA 1 — Dados Governamentais Brasileiros

### Por que é ouro

Qualquer empresa brasileira com CNPJ tem obrigações com a Receita Federal, estados, municípios.
São centenas de APIs públicas que 99% das empresas não sabem como usar.
Um MCP server que consolida isso é imediatamente útil para contadores, advogados, RH, compras.

---

### makopy-receita — Receita Federal e CNPJ

**O que faz:**
- Consulta CNPJ completo (razão social, sócios, atividades, endereço, situação)
- Verifica Certidão Negativa de Débitos Federal (CND)
- Consulta situação fiscal do CPF
- Verifica CADIN (cadastro de inadimplentes do governo federal)
- Monitora mudanças no CNPJ (alteração de sócios, endereço, status)

**Cenários de uso real:**

*Contador:*
> "Verifica a situação fiscal de todos os 47 CNPJs dos meus clientes e me diz quais têm pendência"
→ Relatório completo gerado em segundos, com link para regularização de cada um

*Setor de Compras:*
> "Antes de fechar contrato com o fornecedor CNPJ 12.345.678/0001-99, verifica se ele está regular"
→ Due diligence automatizada em 30 segundos em vez de 2 horas

*Advogado:*
> "Quem são os sócios da empresa X e desde quando?"
→ Histórico de quadro societário consultado direto da Receita

*RH:*
> "A empresa prestadora de serviço que vamos contratar está ativa e regular?"
→ Compliance automático no processo de onboarding de fornecedores

**Quem paga:** Escritórios de contabilidade (B2B), setor de compras de médias empresas, advogados empresariais
**Modelo:** R$ 97–297/mês por CNPJ ativo monitorado, ou por volume de consultas

---

### makopy-certidoes — Certidões Negativas Consolidadas

**O que faz:**
- CND Federal (Receita + PGFN)
- CRF (FGTS — Caixa Econômica)
- CPEN (previdência)
- Certidão estadual (SINTEGRA por estado)
- Certidão municipal (ISS — acesso por prefeitura)
- CEIS, CNEP (cadastros de empresas punidas/suspensas)
- Certidão de falência e concordata (tribunais)

**Cenários de uso real:**

*Licitações públicas:*
> "Preciso participar de uma licitação na próxima semana. Verifica todas as certidões da empresa e me diz o que está vencido"
→ Checklist completo com datas de vencimento e priorização do que renovar primeiro

*Investidor / due diligence:*
> "Vou adquirir 40% dessa empresa. Gera um relatório de risco fiscal completo"
→ Consolidação de todas as certidões + alertas de risco em um documento

*Diretor Financeiro:*
> "Nossa CFO precisa assinar uma certificação até amanhã. Confirma que estamos regulares em tudo"
→ Dashboard instantâneo de compliance fiscal

**Quem paga:** Empresas que participam de licitações (ENORME mercado), M&A advisors, diretores financeiros
**Modelo:** R$ 197/mês (monitoramento contínuo) + R$ 29 por relatório avulso de due diligence

---

### makopy-dou — Diário Oficial da União em Tempo Real

**O que faz:**
- Busca publicações por CNPJ, CPF, nome, palavra-chave
- Monitora e alerta quando empresa/pessoa aparece no DOU
- Categoriza publicações (licitação, multa, nomeação, portaria, lei)
- Histórico de publicações por entidade
- Acompanha legislação por área (trabalhista, tributária, ambiental)

**Cenários de uso real:**

*Advogado trabalhista:*
> "Quais portarias novas do Ministério do Trabalho foram publicadas esta semana sobre teletrabalho?"
→ Resumo das publicações relevantes com impacto prático explicado

*Empresa em processo de regularização:*
> "Me avisa imediatamente quando nosso CNPJ aparecer em qualquer publicação do DOU"
→ Alerta via WhatsApp assim que publicar

*Gestor de contratos públicos:*
> "Busca todos os contratos firmados com o CNPJ X nos últimos 12 meses"
→ Histórico completo de relação com governo federal

*Jornalista / analista político:*
> "Quem foram os servidores nomeados para cargos DAS-6 no último mês?"
→ Relatório de nomeações com órgão, salário, data

**Quem paga:** Escritórios jurídicos, assessorias de imprensa, compliance de grandes empresas, jornalismo investigativo
**Modelo:** R$ 147/mês monitoramento básico, R$ 497/mês com alertas em tempo real + histórico

---

### makopy-tribunais — Andamento Processual

**O que faz:**
- Consulta processos no TJSP, TJRJ, TJMG e outros TJs
- STJ, STF, TST (trabalhista), TRFs
- Alerta de movimentações (nova sentença, despacho, prazo)
- Consolidação de todos os processos de um CNPJ/CPF
- Análise de risco de passivo judicial estimado

**Cenários de uso real:**

*Escritório de advocacia:*
> "Verifica todos os 340 processos dos nossos clientes e me diz quais tiveram movimentação hoje"
→ Relatório matinal automático sem nenhum acesso manual ao sistema do tribunal

*Financeiro de empresa:*
> "Qual é o passivo judicial estimado total da empresa com base nos processos ativos?"
→ Consolidação para provisão contábil e relatório aos acionistas

*M&A / investidor:*
> "A empresa que vou adquirir tem processos trabalhistas? Qual o histórico?"
→ Due diligence judicial completa em minutos

*RH após demissão em massa:*
> "Monitora se algum dos ex-funcionários da última reestruturação entrou com ação trabalhista"
→ Alerta imediato para que o jurídico se prepare

**Quem paga:** Escritórios com muitos processos, financeiros de médias e grandes empresas, seguradoras
**Modelo:** R$ 297–997/mês dependendo do volume de processos monitorados

---

### makopy-esocial — eSocial e Obrigações Trabalhistas

**O que faz:**
- Consulta e envia eventos eSocial (admissão, demissão, folha, afastamentos)
- Verifica inconsistências antes de enviar ao governo
- Monitora prazos de obrigações (DCTF, EFD, DIRF, RAIS, CAGED)
- Calcula encargos (INSS, FGTS, IRRF, 13o, férias)
- Gera guias de pagamento

**Cenários de uso real:**

*RH de PME:*
> "Preciso registrar a admissão do João que começa segunda. Coleta os dados dele e envia ao eSocial"
→ Processo de admissão 100% via conversa — sem sistemas complexos

*Contador de escritório pequeno:*
> "Quais são os prazos de obrigações fiscais e trabalhistas dos próximos 30 dias para todos meus clientes?"
→ Calendário inteligente de obrigações com antecedência

*Diretor de RH:*
> "Calcula o custo total de uma demissão sem justa causa do funcionário X, incluindo todos os encargos"
→ Cálculo completo em segundos (FGTS, aviso prévio, férias, 13o proporcional)

**Quem paga:** Escritórios de contabilidade (altíssimo valor), RH de PMEs sem DP interno
**Modelo:** R$ 197/mês por empresa gerenciada

---

## CATEGORIA 2 — Finanças e Pagamentos Brasileiros

### makopy-pix — PIX como Serviço

**O que faz:**
- Gera QR codes PIX estático e dinâmico
- Consulta status de transações
- Gerencia cobranças e vencimentos
- Reconciliação automática (pagou ou não pagou)
- Extrato e relatório financeiro via conversa
- Devolução (chargeback) automatizada
- Integração com qualquer banco via API

**Cenários de uso real:**

*Prestador de serviço autônomo:*
> "Cria uma cobrança de R$ 3.500 para o cliente João Silva com vencimento para sexta e manda por WhatsApp"
→ PIX dinâmico gerado + mensagem no WhatsApp do cliente em segundos

*Gestor financeiro:*
> "Quais cobranças do mês de fevereiro ainda não foram pagas?"
→ Relatório de inadimplência com valor total e lista de devedores

*Loja / e-commerce:*
> "Faz a reconciliação dos pagamentos de hoje com os pedidos do sistema"
→ Identifica pagamentos sem pedido e pedidos sem pagamento automaticamente

*Condomínio:*
> "Gera as cobranças de condomínio de março para os 48 apartamentos e envia por email"
→ 48 PIX dinâmicos gerados e enviados em lote

**Quem paga:** Autônomos, pequenos negócios, prestadores de serviço, imobiliárias, condomínios
**Modelo:** 0,5% por transação ou R$ 97/mês fixo até X transações

---

### makopy-bancobrasil — Open Banking e Dados Bancários

**O que faz:**
- Consulta saldo e extrato de múltiplas contas (Open Banking)
- Categoriza transações automaticamente
- Detecta cobranças duplicadas ou suspeitas
- Compara DRE real vs projetado
- Alertas de saldo mínimo
- Taxa de câmbio e conversões (Banco Central API)

**Cenários de uso real:**

*Empreendedor com 3 contas:*
> "Qual é o saldo consolidado de todas as minhas contas hoje?"
→ Visão unificada de Itaú + Bradesco + Nubank

*CFO:*
> "Compara o fluxo de caixa real de janeiro com o que tínhamos projetado"
→ Análise de variância com categorias e explicações

*Contabilidade:*
> "Categoriza todas as despesas de cartão do mês para a DRE"
→ Classificação automática de 200 transações que levaria horas manualmente

---

### makopy-boleto — Boleto Bancário e Cobrança

**O que faz:**
- Emite boletos registrados (todos os bancos)
- Gestão de carteira de cobrança
- Protesto automático de títulos vencidos
- Negativação (Serasa/SPC) automatizada
- Renegociação e parcelamento
- Relatório de aging (em aberto por faixa de atraso)

**Cenários de uso real:**

*Financeiro de distribuidora:*
> "Quais clientes estão com boletos vencidos há mais de 60 dias? Manda uma carta de cobrança para cada um"
→ Relatório + cartas personalizadas geradas automaticamente

*Imobiliária:*
> "Gera o boleto de aluguel de março para todos os inquilinos com o reajuste pelo IGPM de 4,2%"
→ Boletos em lote com cálculo automático de reajuste

---

### makopy-credito — Score e Análise de Crédito

**O que faz:**
- Consulta Serasa Score (pessoa física e jurídica)
- SPC Brasil
- Boa Vista (SCPC)
- Birô de crédito consolidado
- Análise de risco para concessão de crédito
- Histórico de protestos e restrições

**Cenários de uso real:**

*Loja com venda a prazo:*
> "O cliente João quer fazer uma compra de R$ 8.000 parcelado em 12x. Qual o risco?"
→ Score + histórico + recomendação de aprovação ou limite

*Imobiliária:*
> "Analisa o perfil de crédito dos 3 candidatos ao apartamento 501 e me diz qual tem menor risco"
→ Análise comparativa com recomendação fundamentada

*Financeira / fintech:*
> "Classifica a carteira de clientes por risco de inadimplência"
→ Segmentação automática para provisão e estratégia de cobrança

---

## CATEGORIA 3 — E-commerce e Marketplace

### makopy-meli — Mercado Livre Completo

**O que faz:**
- Gerencia catálogo (criar, editar, pausar anúncios)
- Responde mensagens de compradores
- Processa e acompanha pedidos
- Calcula frete e prazo para qualquer CEP
- Análise de performance dos anúncios (visitas, conversão, vendas)
- Ajuste de preços baseado em concorrência
- Gestão de reclamações e mediações
- Relatório financeiro e repasses

**Cenários de uso real:**

*Seller médio:*
> "Quais os meus 10 anúncios com menor taxa de conversão este mês?"
→ Ranking com sugestões de melhoria para cada um

*Gestor de e-commerce:*
> "Um comprador reclamou do produto. Lê a reclamação e me sugere uma resposta"
→ Resposta empática e dentro das políticas do ML gerada automaticamente

*Analista de precificação:*
> "Verifica se meus produtos de eletrônicos estão competitivos em relação aos 3 principais concorrentes"
→ Análise de mercado com sugestão de repreçamento

*Operação:*
> "Quais pedidos de hoje ainda não têm código de rastreamento?"
→ Lista de pendências de despacho com prazo de entrega comprometido

---

### makopy-vtex — VTEX (E-commerce Enterprise)

**O que faz:**
- Gerencia catálogo e inventário
- Processa pedidos e status
- Gerencia promoções e cupons
- Relatórios de vendas por SKU, categoria, canal
- Integração com ERPs via API VTEX
- Gestão de sellers (para marketplaces VTEX)

**Cenários de uso real:**

*Gerente de e-commerce de grande varejo:*
> "Quais produtos ficaram sem estoque nos últimos 7 dias e por quanto tempo?"
→ Relatório de ruptura com impacto estimado em vendas perdidas

*Marketing:*
> "Cria uma promoção de 15% de desconto para toda a categoria 'eletrodomésticos' válida no fim de semana"
→ Promoção configurada e ativada sem precisar abrir o painel VTEX

---

### makopy-logistica — Frete e Rastreamento

**O que faz:**
- Cálcula frete em múltiplas transportadoras (Correios, Jadlog, Total Express, Loggi, etc.)
- Compara preço x prazo para cada pedido
- Emite etiquetas de envio
- Rastreia encomendas em tempo real
- Alerta de atrasos e exceções
- Gestão de devoluções (reversa)

**Cenários de uso real:**

*Operador de fulfillment:*
> "Para o pedido 45.231 com destino a Manaus, qual a transportadora mais barata que entrega em até 7 dias?"
→ Comparativo com preço, prazo e taxa de entrega de cada opção

*SAC:*
> "O cliente pediu rastreamento do pedido feito há 5 dias e ainda não recebeu"
→ Status completo + estimativa atualizada + script de resposta ao cliente

---

## CATEGORIA 4 — Comunicação Brasileira

### makopy-whatsapp — WhatsApp Business API

**O que faz:**
- Envia mensagens individuais e em lote (templates aprovados)
- Recebe e classifica mensagens de clientes
- Gerencia conversas ativas
- Envia documentos, imagens, botões interativos
- Fluxos automatizados (onboarding, cobrança, confirmação)
- Integração com CRM via webhook

**Cenários de uso real:**

*Clínica médica:*
> "Manda uma mensagem de confirmação de consulta para todos os pacientes de amanhã"
→ 47 mensagens enviadas com nome do paciente, horário e médico

*Cobrança:*
> "Quais clientes com boleto vencido há 3 dias ainda não pagaram? Manda uma mensagem amigável lembrando"
→ Mensagens personalizadas com link de segunda via enviadas automaticamente

*Loja:*
> "O cliente do pedido 1.234 acabou de pagar. Manda uma confirmação com prazo de entrega"
→ Notificação automática pós-pagamento

*Imobiliária:*
> "Manda para os 15 interessados no apartamento 303 um link para o tour virtual"
→ Disparo em lote com link personalizado por destinatário

**Quem paga:** Qualquer empresa com volume de comunicação — clínicas, imobiliárias, e-commerces, financeiras
**Modelo:** Por mensagem enviada (como Twilio) + R$ 197/mês de plataforma

---

### makopy-sms — SMS em Massa

**O que faz:**
- Disparo de SMS para listas segmentadas
- OTP (código de verificação por SMS)
- Relatório de entrega e cliques
- Integração com qualquer sistema via webhook

**Cenários de uso real:**

*Banco / fintech:*
> "Preciso enviar código de verificação por SMS para novos usuários"
→ OTP integrado em segundos via MCP

*Loja de varejo:*
> "Manda um SMS para os 2.300 clientes que compraram em fevereiro avisando da promoção de março"
→ Campanha disparada com personalização por nome

---

## CATEGORIA 5 — ERPs e Sistemas Brasileiros

### makopy-omie — Omie ERP

**O que faz:**
- Lança contas a pagar e receber
- Emite NF-e e NFS-e
- Gerencia clientes e fornecedores
- Relatório financeiro (DRE, fluxo de caixa, inadimplência)
- Conciliação bancária
- Gestão de estoque

**Cenários de uso real:**

*Empreendedor sem contador no dia a dia:*
> "Qual é o lucro líquido da empresa em fevereiro?"
→ DRE gerada a partir dos lançamentos do Omie

*Administrativo:*
> "Tenho que pagar a nota fiscal 1.234 do fornecedor ABC hoje. Registra no Omie"
→ Lançamento de contas a pagar feito por conversa

*Sócio:*
> "Compara o faturamento de janeiro, fevereiro e março deste ano vs ano passado"
→ Análise comparativa com variação percentual

---

### makopy-totvs — TOTVS (Enterprise)

**O que faz:**
- Consulta e atualiza pedidos de venda
- Gestão de estoque e inventário
- Relatórios financeiros (DRE, balanço)
- RH: folha de pagamento, benefícios, headcount
- Supply chain: compras, fornecedores, entregas

**Cenários de uso real:**

*Gerente industrial:*
> "Qual é o nível de estoque atual das matérias-primas para a produção do próximo mês?"
→ Relatório de posição de estoque vs necessidade de produção planejada

*Diretor de RH:*
> "Quantos funcionários temos por unidade e qual o custo total de folha por unidade?"
→ Headcount e custo consolidado por unidade de negócio

---

## CATEGORIA 6 — Saúde e Farmácia

### makopy-tiss — Faturamento de Convênios (TISS)

**O que faz:**
- Monta guias TISS (consulta, SADT, internação)
- Envia lotes de cobrança para operadoras
- Acompanha status de pagamento
- Gerencia glosas (negativas de cobrança)
- Protocolo e recurso de glosas
- Relatório de receita por convênio

**Cenários de uso real:**

*Clínica médica:*
> "Quantas guias do Unimed foram glosadas no mês passado e qual o motivo principal?"
→ Análise de glosas com padrão de negativas para corrigir o processo

*Faturista:*
> "Monta as guias de consulta de todos os atendimentos de ontem e envia para o convênio"
→ Faturamento automático sem trabalho manual de digitação

*Diretor financeiro de hospital:*
> "Qual a receita por operadora nos últimos 6 meses?"
→ DRE segmentada por convênio com evolução mensal

---

### makopy-anvisa — Medicamentos e Registros Sanitários

**O que faz:**
- Consulta registro de medicamentos (número, validade, fabricante)
- Verifica se produto tem registro ativo
- Busca bula eletrônica
- Consulta interdições e recalls
- Registro de dispositivos médicos

**Cenários de uso real:**

*Farmácia:*
> "Verifica se o medicamento Zolpidem lote X123 tem algum recall ou interdição"
→ Consulta imediata à base da Anvisa

*Hospital:*
> "Qual o prazo de validade do registro do equipamento de ressonância magnética marca X?"
→ Alerta de vencimento de registro para antecipação da renovação

---

## CATEGORIA 7 — Jurídico e Cartório

### makopy-juridico — Assistente Jurídico Brasileiro

**O que faz:**
- Consulta legislação (Planalto) — leis, decretos, portarias
- Jurisprudência (STJ, STF, TRTs)
- Gera minutas de contratos simples
- Analisa cláusulas de contratos enviados
- Calcula prazos processuais
- Consulta tabela OAB de honorários

**Cenários de uso real:**

*Advogado:*
> "Pesquisa jurisprudência do STJ sobre responsabilidade civil de plataformas digitais nos últimos 2 anos"
→ Seleção dos precedentes mais relevantes com ementa e data

*Empresa sem jurídico interno:*
> "Analisa este contrato de prestação de serviço que recebi e me diz se tem alguma cláusula problemática"
→ Análise de risco com destaque das cláusulas abusivas

*RH:*
> "Qual é o prazo máximo para pagar as verbas rescisórias de um funcionário que pediu demissão hoje?"
→ Cálculo do prazo com base na CLT

---

### makopy-cartorio — Registros e Certidões

**O que faz:**
- Consulta matrículas de imóveis (onde disponível digitalmente)
- Certidão de nascimento, casamento, óbito
- Protesto de títulos (consulta e pedido de cancelamento)
- Autenticação de documentos
- Reconhecimento de firma digital

**Cenários de uso real:**

*Imobiliária:*
> "Verifica se o imóvel da Rua X número Y tem alguma penhora ou ônus na matrícula"
→ Due diligence imobiliária automatizada

*Financeiro:*
> "O fornecedor ABC tem títulos protestados?"
→ Consulta de protesto antes de fechar contrato

---

## CATEGORIA 8 — Agronegócio (Oportunidade Estratégica)

### makopy-agro — Dados e Automação Rural

**O que faz:**
- Preço de commodities em tempo real (CEPEA, B3)
- Clima e previsão por microrregião (INMET)
- Consulta SICAR (cadastro rural)
- CAR (Cadastro Ambiental Rural) — situação e pendências
- Nota fiscal de produtor rural (NF-e produtor)
- Integração com sistemas de rastreabilidade

**Cenários de uso real:**

*Produtor rural:*
> "Qual o preço da soja em Mato Grosso hoje e como está a tendência para os próximos 30 dias?"
→ Preço CEPEA + análise de tendência de mercado

*Gestor de fazenda:*
> "Emite nota fiscal de produtor para a venda de 1.000 sacas de milho para a cooperativa X"
→ NF-e emitida sem precisar de sistema específico

*Contador rural:*
> "Verifica se todas as fazendas do cliente têm o CAR regularizado"
→ Status consolidado do Cadastro Ambiental Rural

---

## CATEGORIA 9 — Imóveis e Construção

### makopy-imoveis — Gestão Imobiliária

**O que faz:**
- Anúncios em ZAP Imóveis e Viva Real via API
- Gestão de leads e agendamentos de visita
- Contratos de locação e venda (modelos)
- Índices de reajuste (IGPM, IPCA, INPC)
- Cálculo de aluguel reajustado
- Boleto de aluguel (integrado com makopy-boleto)

**Cenários de uso real:**

*Imobiliária pequena:*
> "Publica o apartamento da Rua das Flores no ZAP e no Viva Real com as fotos que te mandei"
→ Anúncio publicado nos dois portais simultaneamente

*Proprietário:*
> "Qual seria o reajuste do aluguel de R$ 2.300 pelo IGPM dos últimos 12 meses?"
→ Cálculo em segundos com o índice correto

*Administradora de condomínio:*
> "Gera as cobranças de condomínio de todos os 72 apartamentos para abril com o reajuste de 8,3%"
→ Boletos em lote com reajuste aplicado

---

### makopy-construcao — ERPs de Construção Civil

**O que faz:**
- Integra com Sienge, Uau!, Volare (sistemas de construção civil)
- Medições de obra
- Curva ABC de insumos
- Controle de cronograma físico-financeiro
- Gestão de fornecedores e contratos de obra

**Cenários de uso real:**

*Engenheiro de obra:*
> "Qual o percentual de conclusão física da torre A vs o cronograma previsto?"
→ Status atualizado com desvio e previsão de conclusão

*Compras:*
> "Quais insumos representam 80% do custo de materiais desta obra?"
→ Curva ABC automática para focar negociação de preço

---

## CATEGORIA 10 — Developer Tools (Global, alta conversão)

### makopy-github — GitHub como Interface Natural

**O que faz:**
- Cria issues com descrição completa
- Abre, revisa e fecha PRs
- Verifica status de Actions (CI/CD)
- Gerencia Projects (kanban)
- Analisa diff de PRs e sugere melhorias
- Gera release notes automaticamente

**Cenários de uso real:**

*Dev:*
> "Abre um PR no repositório aios-lite com as mudanças do branch feature/product-wizard para a main, título: 'feat: add product wizard', adiciona o @jaime como reviewer"
→ PR criado sem sair da conversa

*Gerente de produto:*
> "Quais issues estão abertas com label 'bug' há mais de 30 dias sem nenhuma atualização?"
→ Relatório de bugs negligenciados para priorização

---

### makopy-deploy — Deploy e Infraestrutura via Conversa

**O que faz:**
- Deploy em Vercel, Railway, Render, Fly.io, Heroku
- Rollback de versão
- Variáveis de ambiente
- Logs de produção em tempo real
- Monitoramento de erros (Sentry)
- Alertas de performance

**Cenários de uso real:**

*Dev solo:*
> "Faz deploy da branch main para produção no Railway e me avisa se der erro"
→ Deploy acionado, logs monitorados, alerta se falhar

*DevOps:*
> "A última release aumentou o tempo de resposta da API. Faz rollback para a versão anterior"
→ Rollback executado em segundos

---

## MODELOS DE RECEITA COMPARADOS

| Modelo | Como funciona | Melhor para |
|---|---|---|
| **Assinatura mensal** | Acesso ao servidor por tier | Volume previsível, recorrente |
| **Pay-per-call** | Cobra por chamada de API | Alta variabilidade de uso |
| **Por entidade** | R$ X por CNPJ monitorado | CNPJ, processo, imóvel |
| **Por resultado** | % do valor da transação | PIX, boleto, cobrança |
| **Bundle** | Pack de servidores correlatos | Venda cruzada, maior ticket |
| **White-label** | Devs revendem seu MCP | B2B2C, agências |

---

## MATRIZ DE PRIORIDADE DE BUILD

| MCP Server | Dificuldade | Mercado | Urgência | Score |
|---|---|---|---|---|
| makopy-receita (CNPJ) | Baixa | Grande | Alta | ★★★★★ |
| makopy-certidoes | Baixa | Grande | Alta | ★★★★★ |
| makopy-pix | Média | Enorme | Alta | ★★★★★ |
| makopy-whatsapp | Média | Enorme | Alta | ★★★★★ |
| makopy-meli | Média | Grande | Alta | ★★★★☆ |
| makopy-tribunais | Alta | Grande | Média | ★★★★☆ |
| makopy-tiss | Alta | Médio | Média | ★★★☆☆ |
| makopy-totvs | Muito alta | Grande | Baixa | ★★★☆☆ |
| makopy-agro | Média | Grande | Média | ★★★★☆ |
| makopy-dou | Baixa | Médio | Média | ★★★☆☆ |

---

## ESTRATÉGIA DE GO-TO-MARKET

### Fase 1 — Validação (0-3 meses)
Lançar makopy-receita (CNPJ + certidões) como produto standalone.
- Landing page simples
- Trial de 14 dias
- Target: escritórios de contabilidade (1.000+ no Brasil, pagam por ferramenta)
- Meta: 10 clientes pagantes a R$ 197/mês = R$ 1.970/mês para validar demanda

### Fase 2 — Expansão (3-9 meses)
- Adicionar makopy-pix + makopy-whatsapp
- Bundle "Makopy Finance": R$ 397/mês (CNPJ + PIX + WhatsApp)
- Parceria com 2-3 escritórios de contabilidade para white-label

### Fase 3 — Verticais (9-18 meses)
- makopy-meli para sellers de ML (comunidade enorme, dispostos a pagar)
- makopy-tiss para clínicas (alto LTV, baixa sensibilidade de preço)
- makopy-agro para cooperativas (ticket alto, poucos concorrentes)

---

> Status: visão estratégica — brainstorm sem compromisso de implementação.
> Relacionado: mapping/62 (AI task queue), mapping/63 (universo Makopy)
