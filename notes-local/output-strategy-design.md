# Output Strategy — Design Doc

> **Autor:** Jaime Marcelo + Claude
> **Data:** 2026-03-19
> **Status:** Draft — aguardando revisão
> **Escopo:** Definir como squads configuram, roteiam e entregam seus outputs

---

## 1. Problema

Hoje o `@squad` gera outputs com um caminho único:
arquivos físicos em `output/{slug}/` (HTML sessions + content items).

Na prática, existem **4 cenários de saída** com necessidades diferentes:

| Cenário | Exemplo de squad | Saída ideal | Consumidor |
|---------|-----------------|-------------|------------|
| **Arquivo físico** | Landing page, relatório, apresentação | `output/{slug}/index.html` | Navegador, download |
| **Dados estruturados** | Copy para anúncios, posts, descrições | SQLite `content_items` → dashboard | Dashboard, API, webhook |
| **Mídia** | Imagens, thumbnails, vídeos | `media/{slug}/` + referência no DB | Dashboard, CDN |
| **Híbrido** | YouTube creator (roteiro=dados, thumbnail=mídia, sessão=HTML) | SQLite + arquivos + webhook | Dashboard + site externo |

O problema não é técnico — o AIOSON já tem as peças (SQLite, content_items, cloud publish, output dir). O problema é **decisão e configuração**: quando e como o squad define sua estratégia de output.

---

## 2. Estado Atual

### O que o AIOSON CLI já tem
- `output/{slug}/` — diretório de saída com HTML sessions e content items
- `media/{slug}/` — diretório de mídia
- `aios-logs/{slug}/` — logs operacionais
- `squad.manifest.json` — manifest com `storagePolicy`, `contentBlueprints`, `executors`
- `storagePolicy.primary: "sqlite"` — já prevê SQLite como storage
- `storagePolicy.artifacts: "sqlite-json"` — artefatos como JSON no banco
- `storagePolicy.exports: { html, markdown, json }` — formatos de export

### O que o aios-dashboard já tem
- Tabela `content_items` no SQLite com: `contentKey`, `contentType`, `layoutType`, `status`, `payloadJson`, `jsonPath`, `htmlPath`, `createdByAgent`
- Tabela `runtime_artifacts` — artefatos indexados
- Tabela `runtime_events` — eventos do runtime
- **Content Viewer** — renderiza JSON estruturado dos content items
- **Artifact Stream** (`/outputs`) — lista artefatos indexados
- **Cloud Publish** — `publishSquadContentsToCloud()` que faz POST para `aioson.com/api/publish/contents`
- **Squad Workspace** (`/squads/{slug}`) — tabs com Agentes, Tasks, Conteúdos, Skills, Logs
- **Settings** — registro de projetos, configuração LLM, cloud workspace

### O que falta
- **Nenhuma configuração de output strategy per-squad** — tudo é implícito
- **Nenhum webhook genérico** — só publish para o cloud (aioson.com)
- **Nenhum delivery worker** — workers não existiam até a Fase 1
- **Nenhum wizard de output** — o `@squad` não pergunta como o usuário quer receber os resultados
- **Nenhuma heurística de domínio** — o agente não sugere a melhor estratégia com base no tipo de squad

---

## 3. Proposta de Arquitetura

### 3.1 Output Strategy como bloco no manifest

Adicionar `outputStrategy` ao `squad.manifest.json`:

```json
{
  "outputStrategy": {
    "mode": "hybrid",
    "fileOutput": {
      "enabled": true,
      "dir": "output/{squad-slug}/",
      "formats": ["html", "md"]
    },
    "dataOutput": {
      "enabled": true,
      "storage": "sqlite",
      "table": "content_items",
      "contentItems": true
    },
    "delivery": {
      "webhooks": [
        {
          "slug": "website-feed",
          "url": "{{ENV:WEBHOOK_URL_WEBSITE_FEED}}",
          "trigger": "on-publish",
          "format": "json",
          "headers": {
            "Authorization": "Bearer {{ENV:WEBHOOK_TOKEN}}"
          },
          "worker": ".aioson/squads/{squad-slug}/workers/webhook-post.py"
        }
      ],
      "cloudPublish": true,
      "autoPublish": false
    }
  }
}
```

**Campos-chave:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mode` | `"files" \| "sqlite" \| "hybrid"` | Estratégia principal |
| `fileOutput.enabled` | boolean | Se gera arquivos físicos |
| `fileOutput.dir` | string | Diretório de saída |
| `fileOutput.formats` | string[] | Formatos de export habilitados |
| `dataOutput.enabled` | boolean | Se grava no SQLite |
| `dataOutput.storage` | `"sqlite"` | Tipo de banco (extensível para futuro) |
| `dataOutput.contentItems` | boolean | Se usa o modelo `content_items` |
| `delivery.webhooks` | array | Webhooks configurados |
| `delivery.cloudPublish` | boolean | Se publica no aioson.com |
| `delivery.autoPublish` | boolean | Se publica automaticamente ou por ação manual |

### 3.2 Três fontes de configuração (cascata)

```
1. Dashboard settings (UI)          → grava no manifest.json
2. Manifest JSON (arquivo)          → editável manualmente
3. Squad agent wizard (on-demand)   → grava no manifest.json
```

A cascata é simples: **o manifest JSON é a fonte de verdade**.
O dashboard lê e grava nele. O agent wizard lê e grava nele.
Não há arquivo de config separado — o manifest já é o arquivo.

### 3.3 On-demand loading no `@squad`

O prompt do `@squad` já é grande. A lógica de output strategy não deve ficar inline.

**Solução:** criar um task file `.aioson/tasks/squad-output-config.md` que o `@squad` carrega on-demand:

```
@squad --config=output --squad={slug}
```

Ou durante a criação, o `@squad` detecta pelo domínio e carrega automaticamente:

```
IF domínio sugere dados recorrentes (anúncios, posts, conteúdo editorial):
  → carregar squad-output-config.md
  → sugerir mode: "sqlite" ou "hybrid"
  → perguntar se quer webhook

IF domínio sugere arquivos standalone (landing page, relatório, apresentação):
  → mode: "files" (default, não precisa carregar nada extra)

IF domínio sugere mídia (imagens, vídeos, thumbnails):
  → mode: "hybrid" com mediaDir habilitado
```

### 3.4 Heurísticas de domínio

O `@squad` deve inferir a melhor estratégia com base no domínio detectado:

| Domínio / Padrão | mode sugerido | Por quê |
|-------------------|---------------|---------|
| Landing page, site, HTML standalone | `files` | Output é o arquivo em si |
| Copy para anúncios, social media posts | `sqlite` | Dados repetitivos, dashboard visualiza, webhook publica |
| YouTube creator (roteiros + thumbnails) | `hybrid` | Roteiro=dados, thumbnail=mídia, sessão=HTML |
| Gerador de relatórios/PDFs | `files` + worker | Worker gera PDF, salva em output/ |
| Conteúdo editorial (blog, newsletter) | `hybrid` | Dados no DB para dashboard + HTML para preview |
| Pesquisa/análise | `files` | Output é documento, não dado recorrente |
| Gerador de dados (ETL, pipelines) | `sqlite` | Dados estruturados, consumidos via API/webhook |

### 3.5 Delivery Workers

Workers de delivery são scripts determinísticos que executam a entrega:

```
.aioson/squads/{squad-slug}/workers/
├── webhook-post.py         # POST JSON para webhook configurado
├── export-csv.py           # Exporta content_items para CSV
└── sync-to-api.py          # Sincroniza com API externa
```

**Template de webhook worker:**

```python
#!/usr/bin/env python3
"""
Delivery worker: POST content items to configured webhook.
Deterministic — same input, same HTTP request.
"""
import json
import sys
import os
import urllib.request

def main():
    # Input: content item JSON from stdin or file argument
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            payload = json.load(f)
    else:
        payload = json.load(sys.stdin)

    url = os.environ.get('WEBHOOK_URL')
    token = os.environ.get('WEBHOOK_TOKEN', '')

    if not url:
        print('ERROR: WEBHOOK_URL not set', file=sys.stderr)
        sys.exit(1)

    headers = {
        'Content-Type': 'application/json',
    }
    if token:
        headers['Authorization'] = f'Bearer {token}'

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')

    try:
        with urllib.request.urlopen(req) as resp:
            print(f'OK: {resp.status} {resp.reason}')
    except urllib.error.HTTPError as e:
        print(f'ERROR: {e.code} {e.reason}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### 3.6 Fluxo de publicação expandido

```
Agente gera conteúdo
    │
    ├── mode: files → salva em output/{slug}/
    │
    ├── mode: sqlite → grava em content_items (payloadJson)
    │   │
    │   ├── autoPublish: false → aparece no dashboard como "pending"
    │   │   │
    │   │   ├── Usuário clica "Publicar" no dashboard
    │   │   │   ├── cloudPublish: true → POST para aioson.com
    │   │   │   └── webhooks configurados → worker executa POST
    │   │   │
    │   │   └── Usuário clica "Exportar" → worker gera CSV/JSON/PDF
    │   │
    │   └── autoPublish: true → imediatamente após gravação:
    │       ├── cloudPublish → POST automático para aioson.com
    │       └── webhooks → worker executa POST automaticamente
    │
    └── mode: hybrid → salva em ambos (arquivo + DB)
        └── Mesmas opções de delivery acima
```

---

## 4. Mudanças no aios-dashboard

### 4.1 Nova aba "Saída" no workspace do squad

No `squad-workspace-tabs.tsx`, adicionar uma aba **"Saída"** (ou "Output") que mostra:

- **Output Strategy** — configuração atual (mode, fileOutput, dataOutput)
- **Webhooks** — lista de webhooks configurados com status (ativo/inativo)
- **Delivery log** — últimas execuções de webhook (sucesso/erro)
- **Botão "Configurar"** — abre dialog de configuração

### 4.2 Dialog de configuração de output

Wizard em 3 passos:

1. **Modo** — escolha: Arquivos / Banco de dados / Híbrido
2. **Delivery** — configurar webhooks (URL, token, trigger)
3. **Automação** — auto-publish sim/não, cloud publish sim/não

Grava direto no `squad.manifest.json` via API.

### 4.3 API route para output strategy

```
GET  /api/squads/[slug]/output-strategy    → lê do manifest
POST /api/squads/[slug]/output-strategy    → grava no manifest
POST /api/squads/[slug]/webhook/test       → testa um webhook (envia payload de teste)
GET  /api/squads/[slug]/delivery-log       → últimas execuções
```

### 4.4 Botão "Publicar" no content item

No content viewer, quando `dataOutput.enabled: true`:
- Botão **"Publicar"** que dispara:
  1. Cloud publish (se habilitado)
  2. Webhook POST (se configurado)
  3. Atualiza `status` para `published`

### 4.5 Migration: tabela `delivery_log`

```sql
CREATE TABLE IF NOT EXISTS delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_slug TEXT NOT NULL,
  content_key TEXT,
  webhook_slug TEXT,
  trigger_type TEXT NOT NULL, -- 'manual' | 'auto' | 'cloud'
  url TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_delivery_log_squad ON delivery_log(squad_slug);
CREATE INDEX idx_delivery_log_content ON delivery_log(content_key);
```

---

## 5. Mudanças no AIOSON CLI

### 5.1 Schema — `outputStrategy` no manifest

Adicionar ao `squad-manifest.schema.json` (já parcialmente previsto por `storagePolicy`):

```json
"outputStrategy": {
  "type": "object",
  "properties": {
    "mode": {
      "type": "string",
      "enum": ["files", "sqlite", "hybrid"],
      "default": "hybrid"
    },
    "fileOutput": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "dir": { "type": "string" },
        "formats": {
          "type": "array",
          "items": { "type": "string", "enum": ["html", "md", "json", "pdf", "csv"] }
        }
      }
    },
    "dataOutput": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "storage": { "type": "string", "enum": ["sqlite"], "default": "sqlite" },
        "table": { "type": "string", "default": "content_items" },
        "contentItems": { "type": "boolean", "default": true }
      }
    },
    "delivery": {
      "type": "object",
      "properties": {
        "webhooks": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["slug", "trigger"],
            "properties": {
              "slug": { "type": "string" },
              "url": { "type": "string", "description": "URL or {{ENV:VAR}} placeholder" },
              "trigger": {
                "type": "string",
                "enum": ["on-publish", "on-create", "manual"],
                "default": "on-publish"
              },
              "format": {
                "type": "string",
                "enum": ["json", "form-data"],
                "default": "json"
              },
              "headers": {
                "type": "object",
                "additionalProperties": { "type": "string" }
              },
              "worker": { "type": "string", "description": "Path to delivery worker script" }
            }
          }
        },
        "cloudPublish": { "type": "boolean", "default": false },
        "autoPublish": { "type": "boolean", "default": false }
      }
    }
  }
}
```

### 5.2 Task file — `squad-output-config.md`

Arquivo carregado on-demand pelo `@squad` quando:
- `@squad --config=output`
- ou o domínio detectado sugere que a escolha importa

Contém:
- Heurísticas de domínio (tabela)
- Wizard de perguntas (3-4 perguntas)
- Templates de `outputStrategy` por cenário
- Template de delivery worker

### 5.3 Relação com `storagePolicy` existente

O `storagePolicy` atual é um campo mais primitivo:

```json
"storagePolicy": {
  "primary": "sqlite",
  "artifacts": "sqlite-json",
  "exports": { "html": true, "markdown": true, "json": true }
}
```

**Decisão: coexistência ou migração?**

Recomendação: **coexistência com fallback**.
- Se `outputStrategy` existe → use-o
- Se só `storagePolicy` existe → derive `outputStrategy` dele:
  - `primary: "sqlite"` → `mode: "sqlite"` ou `"hybrid"`
  - `exports.html: true` → `fileOutput.formats: ["html"]`
- Na próxima major version, depreciar `storagePolicy`

---

## 6. Experiência do usuário — Cenários

### Cenário A: Squad de landing page (simples)
1. Usuário cria squad de landing page
2. Agent detecta: "output é HTML standalone"
3. `outputStrategy.mode: "files"` (default, zero config)
4. Output vai para `output/{slug}/index.html`
5. Sem webhook, sem DB — arquivo é o entregável

### Cenário B: Squad de conteúdo editorial (dados + dashboard)
1. Usuário cria squad para gerar posts de blog
2. Agent detecta: "conteúdo recorrente, dados estruturados"
3. Pergunta: "Esse conteúdo vai alimentar um site via API/webhook?"
4. Se sim → configura webhook + `mode: "hybrid"`
5. Content items aparecem no dashboard com botão "Publicar"
6. Clique publica via cloud + webhook POST

### Cenário C: Squad com auto-publish (automação total)
1. Usuário configura no dashboard: `autoPublish: true`
2. Squad gera conteúdo
3. Automaticamente: grava no DB → executa webhook worker → POST para site
4. Delivery log registra sucesso/erro
5. Site recebe conteúdo sem intervenção humana

### Cenário D: Configuração manual sem dashboard
1. Usuário abre `squad.manifest.json`
2. Edita `outputStrategy` direto no JSON
3. Define webhook URL via variável de ambiente: `{{ENV:WEBHOOK_URL}}`
4. Executa `@squad --config=output --squad={slug}` para validar
5. Funciona sem dashboard

---

## 7. Relação com Fase 1-3 já implementada

| Feature da Fase 1-3 | Como se conecta ao output strategy |
|---------------------|-----------------------------------|
| **Workers** | Delivery workers (webhook POST, export CSV) são workers com `type: "worker"` |
| **Workflows** | Uma fase de workflow pode ter `output` que referencia o outputStrategy |
| **Human gates** | `autoPublish: false` é essencialmente um human gate no fluxo de delivery |
| **Checklists** | Checklist pode validar se o delivery foi executado com sucesso |
| **Coverage score** | Pode incluir "Delivery configurado" como 6ª dimensão do score |

---

## 8. Mapa de implementação

### Fase A — Schema e agente (AIOSON CLI)
1. Adicionar `outputStrategy` ao `squad-manifest.schema.json`
2. Criar `.aioson/tasks/squad-output-config.md` (wizard on-demand)
3. Adicionar referência no `@squad` para carregar o task file quando relevante
4. Adicionar heurísticas de domínio na seção de classificação
5. Criar template de delivery worker (`webhook-post.py`)

### Fase B — Dashboard (aios-dashboard)
6. Criar aba "Saída" no squad workspace
7. Criar dialog de configuração de output
8. Criar API routes para output strategy
9. Criar migration `delivery_log`
10. Botão "Publicar" no content viewer com suporte a webhook

### Fase C — Automação
11. Worker runner: executar delivery workers automaticamente quando `autoPublish: true`
12. Delivery log viewer no dashboard
13. Webhook test endpoint
14. Retry logic para falhas de webhook

### Fase D — Migração e polish
15. Fallback `storagePolicy` → `outputStrategy`
16. Validação no `squad-validate` e `squad-doctor`
17. Export/import de output strategy entre squads

---

## 9. Perguntas abertas

1. **`storagePolicy` depreciar agora ou manter?**
   Recomendação: manter com fallback. Depreciar na próxima major.

2. **Delivery workers: executar via CLI (`aioson deliver`) ou via dashboard action?**
   Recomendação: ambos. CLI para automação, dashboard para manual.

3. **Webhook URL: hardcoded no manifest ou sempre via ENV?**
   Recomendação: aceitar ambos. `{{ENV:VAR}}` é interpolado no runtime. URL direta para squads pessoais.

4. **Auto-publish: controle por content type ou por squad?**
   Recomendação: por squad (no manifest). Granularidade por content type é over-engineering agora.

5. **Coverage score: adicionar "Delivery configurado" como dimensão?**
   Recomendação: sim, mas opcional (não penalizar squads simples que não precisam de delivery).

---

## 10. Decisões de design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Onde fica o config | `outputStrategy` no manifest JSON | Já é a fonte de verdade, dashboard e CLI leem/escrevem nele |
| Arquivo separado de config | Não | Manifest JSON já é o arquivo — não fragmentar |
| Config no prompt do squad | On-demand via task file | Não inflar o prompt principal |
| Dashboard obrigatório | Não | JSON editável manualmente, ENV vars para webhooks |
| Webhook worker language | Python (default) | Universal, sem build step, funciona em qualquer máquina |
| Trigger de webhook | `on-publish` (default) | Controle explícito — auto-publish é opt-in |
