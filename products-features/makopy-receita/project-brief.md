# Project Brief — makopy-receita

> MCP Server como SaaS: dados fiscais e empresariais brasileiros via IA
> Status: pronto para iniciar — stack definida, arquitetura documentada

---

## O que é

Um servidor MCP (Model Context Protocol) que expõe dados da Receita Federal, certidões
negativas e dados empresariais brasileiros para qualquer cliente Claude (Claude Desktop,
Claude Code, apps customizados). O cliente paga uma assinatura mensal e recebe uma
API key para configurar no seu ambiente.

**Proposta de valor em uma frase:**
> "Consulte qualquer CNPJ, certidão ou dado fiscal brasileiro direto do Claude,
> sem abrir nenhum sistema."

---

## Para quem (público-alvo prioritário)

1. **Escritórios de contabilidade** — gerenciam 30–200 CNPJs de clientes, precisam
   verificar situação fiscal com frequência. Pagam R$ 100–300/mês por ferramenta similar.

2. **Setor de compras / suprimentos** — fazem due diligence de fornecedores antes de
   fechar contrato. Processo manual hoje: 1–2 horas por empresa.

3. **Advogados empresariais** — precisam de dados de sócios, histórico societário,
   certidões para contratos e M&A.

4. **Diretores financeiros de PMEs** — precisam confirmar regularidade da própria empresa
   para licitações, contratos e certificações.

---

## Stack definida

```
Runtime:    Node.js 20+
Linguagem:  TypeScript (strict)
HTTP:       Fastify
MCP SDK:    @modelcontextprotocol/sdk (oficial Anthropic)
Validação:  Zod
ORM:        Prisma
Banco:      PostgreSQL
Cache:      Redis (ioredis) — TTL 24h para CNPJ, 1h para certidões
Pacotes:    pnpm
Deploy:     Railway (PostgreSQL + Redis como addons)
Testes:     Vitest
```

---

## Entidades do banco

```prisma
Customer    — id, email, plan (FREE/PRO/BUSINESS), createdAt
ApiKey      — id, key ("mk_live_xxx"), customerId, active, lastUsedAt
Usage       — customerId, tool, month ("2026-03"), calls
```

---

## Planos e limites

| Plano | Chamadas/mês | Preço |
|---|---|---|
| FREE | 50 | R$ 0 |
| PRO | 2.000 | R$ 197/mês |
| BUSINESS | Ilimitado | R$ 597/mês |

---

## Tools a implementar (em ordem de prioridade)

### MVP (Fase 1)

**consultar_cnpj**
- Input: `cnpj` (string, com ou sem formatação)
- API: BrasilAPI — `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (grátis)
- Cache: Redis 24h
- Retorna: razão social, situação, endereço, sócios, atividade, capital social

**consultar_cep**
- Input: `cep`
- API: ViaCEP — `https://viacep.com.br/ws/{cep}/json/` (grátis)
- Cache: Redis 7 dias
- Retorna: logradouro, bairro, cidade, UF

**listar_socios**
- Input: `cnpj`
- Reutiliza dados do consultar_cnpj (mesmo endpoint BrasilAPI)
- Retorna: lista de sócios com nome, qualificação, data de entrada

### Fase 2

**certidao_federal**
- Verifica CND (Certidão Negativa de Débitos Federal)
- API: scraping da Receita Federal ou parceiro (ReceitaWS)
- Cache: 1h (certidão pode ser emitida/vencer)

**consultar_situacao_fiscal**
- Consolida: situação Receita Federal + SINTEGRA estadual
- Retorna: resumo de regularidade com pendências

**monitorar_cnpj**
- Salva CNPJ para monitoramento
- Job que roda diariamente e detecta mudanças (sócio novo, endereço, status)
- Notifica via webhook ou email

### Fase 3

**certidao_fgts**
- Verifica CRF (Certificado de Regularidade do FGTS) via Caixa Econômica
- Essencial para licitações

**consultar_tribunais**
- Andamento processual TJSP, TJRJ (acesso via API ou scraping)
- Retorna: processos ativos por CNPJ/CPF

---

## Estrutura de pastas do projeto

```
makopy-receita/
├── src/
│   ├── server.ts
│   ├── tools/
│   │   ├── index.ts
│   │   ├── consultar-cnpj.ts
│   │   ├── consultar-cep.ts
│   │   └── listar-socios.ts
│   ├── services/
│   │   ├── brasilapi.ts
│   │   └── cache.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── rate-limit.ts
│   └── db/
│       ├── schema.prisma
│       └── client.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Fluxo de autenticação

```
1. Cliente assina no site → recebe API key "mk_live_xxxx" por email
2. Configura no Claude Desktop / Claude Code:
   { "x-api-key": "mk_live_xxxx" }
3. A cada chamada:
   → authMiddleware valida key no banco
   → checkRateLimit verifica limite do plano
   → tool executa → cache → retorna ao Claude
```

---

## Como configurar no Claude (o que o cliente recebe)

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "makopy-receita": {
      "url": "https://mcp.makopy.com.br/sse",
      "headers": { "x-api-key": "mk_live_SUA_CHAVE" }
    }
  }
}
```

**Claude Code** (`settings.json`):
```json
{
  "mcpServers": {
    "makopy-receita": {
      "type": "sse",
      "url": "https://mcp.makopy.com.br/sse",
      "headers": { "x-api-key": "mk_live_SUA_CHAVE" }
    }
  }
}
```

---

## Receita estimada (conservadora)

| Clientes PRO | MRR |
|---|---|
| 10 | R$ 1.970 |
| 50 | R$ 9.850 |
| 100 | R$ 19.700 |
| 200 | R$ 39.400 |

Custo operacional estimado (Railway + APIs): R$ 200–500/mês independente do volume inicial.

---

## Próximos passos para amanhã

```
[ ] 1. Criar repositório GitHub: makopy-receita
[ ] 2. cd makopy-receita && aios-lite install
[ ] 3. Rodar @setup — colar este brief como contexto
[ ] 4. Rodar @product — PRD do produto (acelerado pelo brief)
[ ] 5. Rodar @analyst — gerar requirements.md + spec.md
[ ] 6. Rodar @architect — validar stack e apontar riscos
[ ] 7. Rodar @dev — Feature 1: servidor MCP base + health check
[ ] 8. Rodar @dev — Feature 2: auth + API keys
[ ] 9. Rodar @dev — Feature 3: tool consultar_cnpj + cache
[ ] 10. Deploy inicial no Railway
```

---

## Referências técnicas

- Spec técnica completa: `mapping/65-mcp-server-technical-structure.md` (neste repo)
- Visão de negócio: `mapping/64-mcp-servers-business-deep-dive.md`
- Universo Makopy: `mapping/63-makopy-product-universe.md`
- MCP SDK oficial: https://github.com/modelcontextprotocol/typescript-sdk
- BrasilAPI docs: https://brasilapi.com.br/docs#tag/CNPJ
- ViaCEP: https://viacep.com.br
