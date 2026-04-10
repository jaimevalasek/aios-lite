# 65 — Como Estruturar um MCP Server de Produção

> Exemplo concreto: makopy-receita (CNPJ + Certidões)
> Stack: Node.js + TypeScript + Fastify + Redis + PostgreSQL

---

## Os 4 Blocos que Todo MCP Server de Produção Precisa

```
┌─────────────────────────────────────────────────────┐
│                  Cliente (Claude)                    │
│  Claude Desktop / Claude Code / App customizado      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (SSE ou Streamable HTTP)
                       │ x-api-key: mk_live_xxx
┌──────────────────────▼──────────────────────────────┐
│              MCP Server (seu servidor)               │
│  1. Transport Layer   — recebe chamadas do Claude    │
│  2. Auth Middleware   — valida API key + plano       │
│  3. Tools             — o que Claude pode fazer      │
│  4. Service Layer     — chama APIs externas + cache  │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴─────────────┐
          │                          │
   ┌──────▼──────┐          ┌────────▼───────┐
   │   BrasilAPI  │          │  Redis + PG    │
   │ (dados CNPJ) │          │ (cache + auth) │
   └─────────────┘          └────────────────┘
```

---

## Estrutura de Pastas

```
makopy-receita/
├── src/
│   ├── server.ts              # Ponto de entrada — MCP server + HTTP
│   ├── tools/
│   │   ├── index.ts           # Registra todas as tools
│   │   ├── consultar-cnpj.ts  # Tool: consultar dados do CNPJ
│   │   ├── certidao-federal.ts# Tool: emitir/verificar CND
│   │   └── listar-socios.ts   # Tool: sócios da empresa
│   ├── services/
│   │   ├── brasilapi.ts       # Client da BrasilAPI (dados CNPJ)
│   │   ├── receita.ts         # Client da Receita Federal
│   │   └── cache.ts           # Redis cache
│   ├── middleware/
│   │   ├── auth.ts            # Valida API key no banco
│   │   └── rate-limit.ts      # Limite por plano
│   └── db/
│       ├── schema.prisma      # Usuários, API keys, uso
│       └── client.ts          # Prisma client
├── package.json
├── tsconfig.json
└── .env
```

---

## package.json

```json
{
  "name": "makopy-receita",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "fastify": "^4.26.0",
    "@fastify/cors": "^9.0.0",
    "ioredis": "^5.3.2",
    "@prisma/client": "^5.10.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "tsx": "^4.7.1",
    "typescript": "^5.3.3",
    "prisma": "^5.10.0"
  }
}
```

---

## Banco de Dados — schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Customer {
  id        String   @id @default(cuid())
  email     String   @unique
  plan      Plan     @default(FREE)
  apiKeys   ApiKey[]
  usage     Usage[]
  createdAt DateTime @default(now())
}

model ApiKey {
  id         String    @id @default(cuid())
  key        String    @unique  // "mk_live_xxxxx"
  customer   Customer  @relation(fields: [customerId], references: [id])
  customerId String
  active     Boolean   @default(true)
  createdAt  DateTime  @default(now())
  lastUsedAt DateTime?
}

model Usage {
  id         String   @id @default(cuid())
  customer   Customer @relation(fields: [customerId], references: [id])
  customerId String
  tool       String   // "consultar_cnpj", "certidao_federal"
  month      String   // "2026-03"
  calls      Int      @default(0)
  @@unique([customerId, tool, month])
}

enum Plan {
  FREE      // 50 chamadas/mês
  PRO       // 2000 chamadas/mês
  BUSINESS  // ilimitado
}
```

---

## Limites por Plano — middleware/rate-limit.ts

```typescript
export const PLAN_LIMITS = {
  FREE:     50,
  PRO:      2000,
  BUSINESS: Infinity,
} as const;

export async function checkRateLimit(
  customerId: string,
  plan: keyof typeof PLAN_LIMITS,
  tool: string,
  db: PrismaClient,
): Promise<{ allowed: boolean; remaining: number }> {
  const month = new Date().toISOString().slice(0, 7); // "2026-03"
  const limit = PLAN_LIMITS[plan];

  const usage = await db.usage.upsert({
    where: { customerId_tool_month: { customerId, tool, month } },
    update: { calls: { increment: 1 } },
    create: { customerId, tool, month, calls: 1 },
  });

  const remaining = limit === Infinity ? 999999 : limit - usage.calls;
  return { allowed: remaining >= 0, remaining };
}
```

---

## Auth Middleware — middleware/auth.ts

```typescript
import { PrismaClient } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';

const db = new PrismaClient();

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey?.startsWith('mk_live_')) {
    return reply.status(401).send({ error: 'API key inválida' });
  }

  const keyRecord = await db.apiKey.findUnique({
    where: { key: apiKey, active: true },
    include: { customer: true },
  });

  if (!keyRecord) {
    return reply.status(401).send({ error: 'API key não encontrada' });
  }

  // Atualiza último uso
  await db.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  // Injeta no request para as tools usarem
  request.customer = keyRecord.customer;
}

// Extende o tipo do Fastify
declare module 'fastify' {
  interface FastifyRequest {
    customer: { id: string; plan: string; email: string };
  }
}
```

---

## Service Layer — services/brasilapi.ts

```typescript
import { createClient } from 'ioredis';

const redis = createClient({ url: process.env.REDIS_URL });
const CACHE_TTL = 60 * 60 * 24; // 24 horas — CNPJ não muda todo dia

export async function consultarCNPJ(cnpj: string) {
  const cnpjLimpo = cnpj.replace(/\D/g, ''); // remove pontos, traços, barra

  if (cnpjLimpo.length !== 14) {
    throw new Error(`CNPJ inválido: ${cnpj}`);
  }

  // Tenta cache primeiro
  const cacheKey = `cnpj:${cnpjLimpo}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Busca na BrasilAPI (grátis, sem autenticação)
  const res = await fetch(
    `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
  );

  if (res.status === 404) {
    throw new Error(`CNPJ ${cnpj} não encontrado na Receita Federal`);
  }
  if (!res.ok) {
    throw new Error(`Erro ao consultar CNPJ: ${res.statusText}`);
  }

  const data = await res.json();

  // Normaliza a resposta para algo mais amigável ao Claude
  const normalizado = {
    cnpj: data.cnpj,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia || null,
    situacao: data.descricao_situacao_cadastral,
    data_abertura: data.data_inicio_atividade,
    natureza_juridica: data.natureza_juridica,
    porte: data.porte,
    atividade_principal: data.cnae_fiscal_descricao,
    atividades_secundarias: data.cnaes_secundarios?.map(
      (c: any) => c.descricao,
    ),
    endereco: {
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep,
    },
    contato: {
      email: data.email || null,
      telefone: data.ddd_telefone_1 || null,
    },
    capital_social: data.capital_social,
    socios: data.qsa?.map((s: any) => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio,
      pais_origem: s.pais,
    })),
  };

  // Salva no cache por 24h
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(normalizado));

  return normalizado;
}
```

---

## A Tool em si — tools/consultar-cnpj.ts

```typescript
import { z } from 'zod';
import { consultarCNPJ } from '../services/brasilapi.js';
import { checkRateLimit } from '../middleware/rate-limit.js';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Schema de input — o que Claude vai passar para a tool
export const ConsultarCNPJInput = z.object({
  cnpj: z.string().describe('CNPJ da empresa, com ou sem formatação'),
});

// Definição da tool para o MCP (o que o Claude "vê")
export const consultarCNPJDefinition = {
  name: 'consultar_cnpj',
  description: `Consulta dados completos de uma empresa brasileira pelo CNPJ diretamente
na Receita Federal. Retorna: razão social, situação cadastral, endereço, atividades,
sócios e capital social.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      cnpj: {
        type: 'string',
        description: 'CNPJ da empresa (com ou sem formatação)',
      },
    },
    required: ['cnpj'],
  },
};

// Handler — executa quando Claude chama a tool
export async function handleConsultarCNPJ(
  args: unknown,
  customerId: string,
  plan: string,
) {
  // 1. Valida os argumentos
  const { cnpj } = ConsultarCNPJInput.parse(args);

  // 2. Verifica rate limit
  const { allowed, remaining } = await checkRateLimit(
    customerId,
    plan as any,
    'consultar_cnpj',
    db,
  );

  if (!allowed) {
    return {
      content: [{
        type: 'text' as const,
        text: `Limite do plano atingido. Faça upgrade em makopy.com.br/pricing para continuar.`,
      }],
      isError: true,
    };
  }

  // 3. Executa
  try {
    const dados = await consultarCNPJ(cnpj);

    const situacaoEmoji = dados.situacao === 'ATIVA' ? '✅' : '⚠️';

    return {
      content: [{
        type: 'text' as const,
        text: [
          `${situacaoEmoji} **${dados.razao_social}**`,
          `CNPJ: ${dados.cnpj}`,
          `Situação: ${dados.situacao}`,
          `Abertura: ${dados.data_abertura}`,
          `Porte: ${dados.porte}`,
          `Atividade principal: ${dados.atividade_principal}`,
          `Endereço: ${dados.endereco.logradouro}, ${dados.endereco.numero} — ${dados.endereco.municipio}/${dados.endereco.uf}`,
          dados.socios?.length
            ? `\nSócios:\n${dados.socios.map((s) => `  • ${s.nome} (${s.qualificacao})`).join('\n')}`
            : '',
          `\n_Chamadas restantes este mês: ${remaining}_`,
        ].filter(Boolean).join('\n'),
      }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text' as const, text: `Erro: ${err.message}` }],
      isError: true,
    };
  }
}
```

---

## O Servidor MCP — server.ts (coração do sistema)

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { authMiddleware } from './middleware/auth.js';
import {
  consultarCNPJDefinition,
  handleConsultarCNPJ,
} from './tools/consultar-cnpj.js';
import {
  certidaoFederalDefinition,
  handleCertidaoFederal,
} from './tools/certidao-federal.js';

// ─── Fastify (HTTP layer) ────────────────────────────────────────────────────

const app = Fastify({ logger: true });
await app.register(cors, { origin: '*' });

// Mapa de sessões SSE ativas (um por cliente conectado)
const sessions = new Map<string, SSEServerTransport>();

// ─── Rota SSE — o cliente conecta aqui e fica "escutando" ───────────────────
app.get('/sse', {
  preHandler: authMiddleware,
  handler: async (request, reply) => {
    const sessionId = crypto.randomUUID();

    // Cria o servidor MCP para esta sessão
    const mcpServer = buildMCPServer(request.customer);

    // Conecta via SSE
    const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, reply.raw);
    sessions.set(sessionId, transport);
    await mcpServer.connect(transport);

    request.raw.on('close', () => {
      sessions.delete(sessionId);
    });

    // Mantém a conexão aberta (SSE é streaming)
    await new Promise(() => {});
  },
});

// ─── Rota de mensagens — Claude envia as chamadas de tool aqui ───────────────
app.post('/messages', {
  preHandler: authMiddleware,
  handler: async (request, reply) => {
    const sessionId = (request.query as any).sessionId;
    const transport = sessions.get(sessionId);

    if (!transport) {
      return reply.status(404).send({ error: 'Sessão não encontrada' });
    }

    await transport.handlePostMessage(request.raw, reply.raw);
  },
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', async () => ({ ok: true, service: 'makopy-receita' }));

// ─── Inicia ──────────────────────────────────────────────────────────────────
await app.listen({ port: 3000, host: '0.0.0.0' });
console.log('makopy-receita rodando em :3000');

// ─── Factory do MCP Server ───────────────────────────────────────────────────
function buildMCPServer(customer: { id: string; plan: string }) {
  const server = new Server(
    { name: 'makopy-receita', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // Lista as tools disponíveis
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      consultarCNPJDefinition,
      certidaoFederalDefinition,
      // adiciona mais tools aqui...
    ],
  }));

  // Executa a tool que o Claude chamou
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'consultar_cnpj':
        return handleConsultarCNPJ(args, customer.id, customer.plan);
      case 'certidao_federal':
        return handleCertidaoFederal(args, customer.id, customer.plan);
      default:
        return {
          content: [{ type: 'text', text: `Tool desconhecida: ${name}` }],
          isError: true,
        };
    }
  });

  return server;
}
```

---

## Como o Cliente Configura (o produto que o usuário compra)

### Claude Desktop — claude_desktop_config.json
```json
{
  "mcpServers": {
    "makopy-receita": {
      "url": "https://mcp.makopy.com.br/sse",
      "headers": {
        "x-api-key": "mk_live_a1b2c3d4e5f6..."
      }
    }
  }
}
```

### Claude Code (terminal) — settings.json
```json
{
  "mcpServers": {
    "makopy-receita": {
      "type": "sse",
      "url": "https://mcp.makopy.com.br/sse",
      "headers": {
        "x-api-key": "mk_live_a1b2c3d4e5f6..."
      }
    }
  }
}
```

### Aplicação customizada (SDK Anthropic)
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.beta.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 4096,
  mcp_servers: [{
    type: 'url',
    url: 'https://mcp.makopy.com.br/sse',
    name: 'makopy-receita',
    authorization_token: 'mk_live_a1b2c3d4e5f6...',
  }],
  messages: [{
    role: 'user',
    content: 'Consulta o CNPJ 11.222.333/0001-81 e me diz se está regular',
  }],
});
```

---

## Deployment

### Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### docker-compose.yml (desenvolvimento local)
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/makopy_receita
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: makopy_receita
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Onde fazer deploy (Railway é o mais simples)
```bash
# Railway CLI
railway login
railway init
railway add postgresql redis
railway up

# Fly.io (mais controle)
fly launch
fly postgres create
fly redis create
fly deploy
```

---

## Fluxo Completo de uma Chamada

```
1. Cliente conecta em GET /sse
   → authMiddleware valida x-api-key
   → Cria instância MCP Server com customer injetado
   → Conexão SSE fica aberta

2. Claude recebe a tool list (ListTools)
   → Vê: consultar_cnpj, certidao_federal, ...

3. Usuário pede: "Consulta o CNPJ da Makopy"
   → Claude chama: POST /messages { tool: "consultar_cnpj", args: { cnpj: "..." } }

4. Server executa handleConsultarCNPJ:
   a. Zod valida o input
   b. checkRateLimit — conta +1 no banco, verifica limite do plano
   c. Consulta Redis — cache hit? retorna direto
   d. Cache miss → chama BrasilAPI → normaliza → salva cache 24h
   e. Retorna texto formatado para o Claude

5. Claude responde ao usuário com os dados formatados
```

---

## Adicionar uma Nova Tool (exemplo: CEP)

```typescript
// tools/consultar-cep.ts

export const consultarCEPDefinition = {
  name: 'consultar_cep',
  description: 'Consulta endereço completo a partir de um CEP brasileiro',
  inputSchema: {
    type: 'object' as const,
    properties: {
      cep: { type: 'string', description: 'CEP com ou sem traço' },
    },
    required: ['cep'],
  },
};

export async function handleConsultarCEP(args: unknown, ...) {
  const { cep } = z.object({ cep: z.string() }).parse(args);
  const cepLimpo = cep.replace(/\D/g, '');

  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  const data = await res.json();

  if (data.erro) throw new Error(`CEP ${cep} não encontrado`);

  return {
    content: [{
      type: 'text' as const,
      text: `${data.logradouro}, ${data.bairro} — ${data.localidade}/${data.uf} (${data.cep})`,
    }],
  };
}
```

```typescript
// server.ts — apenas adiciona nas duas listas:
tools: [..., consultarCEPDefinition],

case 'consultar_cep':
  return handleConsultarCEP(args, customer.id, customer.plan);
```

**Isso é tudo.** Cada nova tool é um arquivo novo + 2 linhas no server.ts.

---

## Gestão de API Keys (portal do cliente)

```typescript
// Gerar API key para novo cliente
function gerarApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `mk_live_${hex}`;
}

// Rota de criação (chamada pelo seu painel de billing)
app.post('/internal/customers', async (request) => {
  const { email, plan } = request.body as any;
  const key = gerarApiKey();

  await db.customer.create({
    data: {
      email,
      plan,
      apiKeys: { create: { key } },
    },
  });

  return { apiKey: key }; // enviado por email para o cliente
});
```

---

## Evolução Natural do Produto

```
Fase 1 — MVP (2-4 semanas)
├── 3 tools: consultar_cnpj, listar_socios, consultar_cep
├── Auth com API key
├── Rate limiting por plano
└── Deploy no Railway

Fase 2 — Produto (1-2 meses)
├── Dashboard web (ver uso, gerar API key, billing)
├── Mais tools: certidao_federal, consultar_tribunais
├── Webhooks (alerta quando CNPJ muda de situação)
└── Stripe para billing automático

Fase 3 — Escala (3-6 meses)
├── Mais servidores: makopy-pix, makopy-whatsapp
├── Bundle de servidores (1 API key acessa tudo)
├── SDK client (npm install @makopy/sdk)
└── White-label para agências
```

---

## Referências Técnicas

- MCP SDK oficial: https://github.com/modelcontextprotocol/typescript-sdk
- Especificação MCP: https://modelcontextprotocol.io/docs
- BrasilAPI (CNPJ grátis): https://brasilapi.com.br/docs#tag/CNPJ
- ViaCEP (CEP grátis): https://viacep.com.br
- ReceitaWS (alternativa): https://www.receitaws.com.br

> Mapeado em: 2026-03-05
> Relacionado: mapping/63, mapping/64
