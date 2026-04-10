# Fase 5 — Orquestração Inter-Squad e Pipeline DAG (P3)

> **Objetivo:** Conectar squads entre si para formar pipelines de produção autônomos
> **Pré-requisito:** Fases 3 e 4 completas (analyze, extend, repair funcionando)
> **Repositórios envolvidos:**
> - `aios-lite` (github.com/jaimevalasek/aios-lite) — runtime, CLI, agent tasks
> - `aios-lite-dashboard` (github.com/jaimevalasek/aios-lite-dashboard) — interface visual

> ⚠️ **IMPORTANTE:** Este plano é 100% aditivo em AMBOS os repositórios. NÃO delete nenhum arquivo existente. Leia o `00-MASTER.md` para as regras de proteção.

---

## Visão geral dos entregáveis

```
5.1  Squad ports no manifesto (aios-lite)
5.2  Tabelas SQLite para pipelines (aios-lite/runtime-store.js)
5.3  Protocolo de handoff (aios-lite)
5.4  Task squad-pipeline.md (aios-lite)
5.5  CLI squad-pipeline.js (aios-lite)
5.6  API routes para pipelines (aios-lite-dashboard)
5.7  Página /pipelines com editor visual drag-and-drop (aios-lite-dashboard)
5.8  Testes
```

---

## Contexto do dashboard (leia antes de implementar as partes 5.6 e 5.7)

### Stack do dashboard
```
Next.js 16 + React 19 + TypeScript
Tailwind v4 (via @tailwindcss/postcss)
better-sqlite3 (acesso direto ao SQLite do aios-lite)
zod (validação)
```

### Estrutura relevante do dashboard (recorte parcial — o projeto tem muito mais)
```
aios-lite-dashboard/
├── app/
│   ├── layout.tsx                              # Root layout (dark theme default, data-theme attr)
│   ├── page.tsx                                # Dashboard home — NÃO TOCAR
│   ├── workflows/page.tsx                      # JÁ EXISTE — "Pipelines e execucoes" — NÃO TOCAR
│   ├── squads/page.tsx                         # Lista de squads — NÃO TOCAR
│   ├── squads/[slug]/page.tsx                  # Workspace do squad — NÃO TOCAR
│   ├── agents/, genomes/, logs/, memories/,
│   │   outputs/, settings/, skills/, tasks/    # Todas as rotas existentes — NÃO TOCAR
│   ├── actions/                                # Server actions — NÃO TOCAR
│   ├── api/
│   │   ├── agent-logs/route.ts                 # API existente — NÃO TOCAR
│   │   ├── live/route.ts                       # API SSE live refresh — NÃO TOCAR
│   │   └── tasks/route.ts                      # API existente — NÃO TOCAR
│   └── globals.css                             # CSS variables (dark/light) — EDITAR: adicionar no final
├── components/
│   ├── shell/
│   │   ├── app-shell.tsx                       # Layout wrapper — EDITAR: adicionar item na nav
│   │   ├── activity-rail.tsx                   # NÃO TOCAR
│   │   ├── global-command-palette.tsx          # NÃO TOCAR
│   │   ├── live-refresh.tsx                    # NÃO TOCAR
│   │   ├── reveal-panel.tsx                    # NÃO TOCAR
│   │   ├── theme-toggle.tsx                    # NÃO TOCAR
│   │   └── top-search-bar.tsx                  # NÃO TOCAR
│   ├── dashboard/
│   │   ├── premium-primitives.tsx              # Design system primitives — NÃO TOCAR (usar as existentes)
│   │   ├── agent-activity-feed.tsx             # NÃO TOCAR
│   │   └── task-feed.tsx                       # NÃO TOCAR
│   ├── contents/                               # NÃO TOCAR
│   └── squads/                                 # NÃO TOCAR
├── lib/
│   ├── dashboard-data.ts                       # Data layer — lê SQLite + filesystem — EDITAR: exportar openRuntimeDb
│   ├── premium-workspace-data.ts               # NÃO TOCAR
│   ├── project-registry.ts                     # NÃO TOCAR
│   ├── cloud-account.ts                        # NÃO TOCAR
│   ├── cloud-sync.ts                           # NÃO TOCAR
│   ├── command-palette-data.ts                 # NÃO TOCAR
│   └── command-palette-shared.ts               # NÃO TOCAR
├── data/projects.json                          # NÃO TOCAR
├── prds/                                       # NÃO TOCAR
├── mapping/                                    # NÃO TOCAR
├── package.json                                # EDITAR: adicionar @xyflow/react
├── tsconfig.json                               # NÃO TOCAR
└── next.config.ts                              # NÃO TOCAR
```

### Design system (CSS variables em app/globals.css)
- Backgrounds: `--background: #060818`, `--panel: #0b1230`, `--panel-elevated: #121c46`, `--panel-soft: rgba(10,16,42,0.8)`
- Text: `--foreground: #f4f7ff`, `--muted: #a5b3d9`
- Borders: `--border: rgba(104,144,238,0.34)`
- Accents: `--accent: #28a5ff`, `--success: #46d5a7`, `--warning: #f2bb59`, `--danger: #ff7d8d`, `--violet: #b18cff`
- Shadows: `--shadow: 0 20px 64px rgba(3,8,30,0.55)`
- Light theme: definido via `html[data-theme="light"]` com todas as vars overridden
- Ambos os themes devem funcionar — use CSS vars, não hardcode cores

### Padrões de componentes
- Server Components por padrão (RSC) — usar `"use client"` apenas quando precisa de interatividade
- `AppShell` wrapper em toda página: recebe `activeHref`, `eyebrow`, `heading`, `description`, `projects`, `currentProject`
- Primitivas de `premium-primitives.tsx`: `SurfacePanel`, `MetricTile`, `StatusBadge`, `SignalBar`, `SectionHeading`
- Cards: `rounded-[28px] border border-[var(--border)] bg-[var(--panel-soft)] p-6 shadow-[var(--shadow)] backdrop-blur-xl`
- Eyebrows: `text-[0.68rem] uppercase tracking-[0.28em] text-[var(--muted)]`
- Headings: `text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]`

### Navegação existente (components/shell/app-shell.tsx, linhas 12-22)
```typescript
const primaryNav = [
  { href: "/", label: "Dashboard", description: "Resumo analitico e command center" },
  { href: "/agents", label: "Agents", description: "Galeria operacional de agentes" },
  { href: "/tasks", label: "Tasks", description: "Orquestrador e intake de demandas" },
  { href: "/workflows", label: "Workflows", description: "Pipelines e execucoes" },
  { href: "/memories", label: "Memories", description: "Knowledge browser do projeto" },
  { href: "/squads", label: "Squads", description: "Apps, runtime e outputs por squad" },
  { href: "/outputs", label: "Outputs", description: "Artifacts e entregaveis" },
  { href: "/logs", label: "Logs", description: "Eventos e observabilidade" },
  { href: "/genomes", label: "Genomes", description: "Bindings e catalogo genetico" },
  { href: "/skills", label: "Skills", description: "Skills importadas e declaradas" },
  { href: "/settings", label: "Settings", description: "Projeto ativo e cloud" },
];
```

### Data layer (lib/dashboard-data.ts)
- `openRuntimeDb(projectRoot)` na linha 780 — abre o SQLite do projeto. Atualmente é `function` interna (NÃO exportada). Precisará ser exportada para uso nas API routes.
- Pattern de query: `db.prepare<[ParamTypes], ReturnType>(sql).all(params)` / `.get(params)`
- Toda query é wrapped em try/finally com `db?.close()`
- `getDashboardContext()` é a entry function principal — retorna `{ currentProject, projects, data }`
- `listSquads(projectRoot)` retorna `SquadRecord[]` com slug, name, agentCount, etc.

---

## 5.1 — Squad Ports no manifesto

**Repo:** aios-lite

Adicione ao `squad-manifest.schema.json` (criado na Fase 1) a seção `ports` dentro de `properties`:

```json
"ports": {
  "type": "object",
  "description": "Declaração de inputs e outputs para conexão inter-squad",
  "properties": {
    "inputs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["key"],
        "properties": {
          "key": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "dataType": { "type": "string", "enum": ["text", "json", "file", "file-list", "any"], "default": "any" },
          "description": { "type": "string" },
          "required": { "type": "boolean", "default": false }
        }
      }
    },
    "outputs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["key"],
        "properties": {
          "key": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "dataType": { "type": "string", "enum": ["text", "json", "file", "file-list", "any"], "default": "any" },
          "description": { "type": "string" },
          "contentBlueprintSlug": { "type": "string" }
        }
      }
    }
  }
}
```

Atualize `squad-design.md` e `squad-extend.md` para suportar ports.

---

## 5.2 — Tabelas SQLite para pipelines

**Repo:** aios-lite
**Arquivo:** `src/runtime-store.js` (EDITAR — adicionar tabelas e funções, NÃO deletar nada existente)

Adicione estas tabelas no bloco de criação de tabelas:

```javascript
db.exec(`CREATE TABLE IF NOT EXISTS squad_ports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_slug TEXT NOT NULL,
  port_type TEXT NOT NULL CHECK(port_type IN ('input', 'output')),
  port_key TEXT NOT NULL,
  data_type TEXT DEFAULT 'any',
  description TEXT,
  required INTEGER DEFAULT 0,
  content_blueprint_slug TEXT,
  FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug),
  UNIQUE(squad_slug, port_type, port_key)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS squad_pipelines (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'archived')),
  trigger_mode TEXT DEFAULT 'manual' CHECK(trigger_mode IN ('manual', 'on_output', 'scheduled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS pipeline_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_slug TEXT NOT NULL,
  squad_slug TEXT NOT NULL,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  config_json TEXT,
  FOREIGN KEY (pipeline_slug) REFERENCES squad_pipelines(slug),
  FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug),
  UNIQUE(pipeline_slug, squad_slug)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS pipeline_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_slug TEXT NOT NULL,
  source_squad TEXT NOT NULL,
  source_port TEXT NOT NULL,
  target_squad TEXT NOT NULL,
  target_port TEXT NOT NULL,
  transform_json TEXT,
  FOREIGN KEY (pipeline_slug) REFERENCES squad_pipelines(slug)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS squad_handoffs (
  id TEXT PRIMARY KEY,
  pipeline_slug TEXT,
  from_squad TEXT NOT NULL,
  from_port TEXT NOT NULL,
  to_squad TEXT NOT NULL,
  to_port TEXT NOT NULL,
  payload_json TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'consumed', 'failed', 'expired')),
  created_at TEXT NOT NULL,
  consumed_at TEXT,
  FOREIGN KEY (from_squad) REFERENCES squads(squad_slug),
  FOREIGN KEY (to_squad) REFERENCES squads(squad_slug)
)`);
```

Adicione e exporte funções CRUD: `upsertPipeline`, `addPipelineNode`, `updateNodePosition`, `addPipelineEdge`, `removePipelineEdge`, `getPipelineDAG`, `listPipelines`, `upsertSquadPorts`, `getTopologicalOrder`.

O `getTopologicalOrder` implementa o algoritmo de Kahn para ordenação topológica e retorna `null` se detectar ciclo.

---

## 5.3 — Protocolo de handoff

**Repo:** aios-lite

Quando um squad completa um output, cria handoff no SQLite (tabela `squad_handoffs`) com payload JSON. O squad downstream, ao ser ativado, lê os handoffs `pending` com `to_squad = seu slug`.

---

## 5.4 — Task `squad-pipeline.md`

**Repo:** aios-lite
**Arquivo:** `template/.aios-lite/tasks/squad-pipeline.md` (NOVO)

Task para o agente LLM criar e gerenciar pipelines. Subcomandos: `@squad pipeline create`, `@squad pipeline connect`, `@squad pipeline show`, `@squad pipeline run`.

---

## 5.5 — CLI `squad-pipeline.js`

**Repo:** aios-lite
**Arquivo:** `src/commands/squad-pipeline.js` (NOVO)

Comandos CLI: `aios-lite squad:pipeline list`, `squad:pipeline show <slug>`, `squad:pipeline status <slug>`.

Registrar no `cli.js` como `squad:pipeline` / `squad-pipeline`.

---

## 5.6 — API routes no dashboard

**Repo:** aios-lite-dashboard

**Pré-requisito:** Exportar `openRuntimeDb` de `lib/dashboard-data.ts`. Atualmente é uma function interna (linha 780). Adicione `export` na frente ou crie um utilitário em `lib/db.ts`.

### Criar API routes:

| Rota | Método | O que faz |
|------|--------|-----------|
| `app/api/pipelines/route.ts` | GET | Lista todos os pipelines |
| `app/api/pipelines/route.ts` | POST | Cria um pipeline |
| `app/api/pipelines/[slug]/route.ts` | GET | Retorna DAG completo (nodes + edges + info dos squads) |
| `app/api/pipelines/[slug]/route.ts` | PUT | Atualiza pipeline (nome, status) |
| `app/api/pipelines/[slug]/route.ts` | DELETE | Remove pipeline |
| `app/api/pipelines/[slug]/nodes/route.ts` | POST | Adiciona squad ao pipeline |
| `app/api/pipelines/[slug]/nodes/route.ts` | PUT | Atualiza posição do nó (drag-and-drop) |
| `app/api/pipelines/[slug]/edges/route.ts` | POST | Cria conexão entre squads |
| `app/api/pipelines/[slug]/edges/route.ts` | DELETE | Remove conexão |

Todas as routes seguem o padrão das APIs existentes: `NextResponse.json(data)`, error handling com status codes.

---

## 5.7 — Página /pipelines com editor visual

**Repo:** aios-lite-dashboard

### 5.7.1 — Dependência nova

Adicione ao `package.json` na seção `dependencies`:
```json
"@xyflow/react": "^12"
```

Rode `npm install`.

> `@xyflow/react` (v12+) é o novo nome do React Flow — biblioteca MIT para canvas com nós arrastáveis e conectores. Compatível com React 19.

### 5.7.2 — Adicionar à navegação

**Arquivo:** `components/shell/app-shell.tsx` (EDITAR)

Na lista `primaryNav`, ADICIONE após o item `workflows`:
```typescript
{ href: "/pipelines", label: "Pipelines", description: "Conecte squads em fluxos visuais" },
```

### 5.7.3 — Página de listagem: `app/pipelines/page.tsx` (NOVO)

Server component. Usa `AppShell`, `SurfacePanel`. Lista pipeline cards com slug, name, status, contagem de nós e edges. Botão "Criar Pipeline" linka para `/pipelines/new`.

### 5.7.4 — Página do editor: `app/pipelines/[slug]/page.tsx` (NOVO)

**Client component** (`"use client"`) — necessário pela interatividade do canvas.

Layout: sidebar esquerda (`SquadPicker`) + canvas central (`ReactFlow`) + sidebar direita (detalhes da conexão selecionada).

Imports do `@xyflow/react`:
```typescript
import { ReactFlow, addEdge, useNodesState, useEdgesState, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
```

Registrar node customizado: `nodeTypes={{ squad: SquadNode }}`

Eventos:
- `onConnect`: POST para `/api/pipelines/[slug]/edges` criando a conexão
- `onNodeDragStop`: PUT para `/api/pipelines/[slug]/nodes` salvando posição
- Sidebar click "Adicionar squad": POST para `/api/pipelines/[slug]/nodes`

### 5.7.5 — Componente `SquadNode`: `components/pipelines/squad-node.tsx` (NOVO)

Client component. Cada nó do canvas mostra: nome do squad, mode, contagem de agentes, e handles (ports) no lado esquerdo (inputs) e direito (outputs).

Usar CSS vars do design system para estilização. Handles com `background: var(--accent)` para inputs e `var(--success)` para outputs.

### 5.7.6 — Componente `SquadPicker`: `components/pipelines/squad-picker.tsx` (NOVO)

Client component. Lista squads disponíveis com botão para adicionar ao canvas. Usa o visual de cards do design system.

### 5.7.7 — Estilos do React Flow

**Arquivo:** `app/globals.css` (EDITAR — adicionar no FINAL do arquivo, após tudo que já existe)

```css
/* ──── React Flow overrides (pipeline editor) ──── */
.react-flow__background { background-color: var(--background) !important; }
.react-flow__minimap { background-color: var(--panel) !important; border: 1px solid var(--border) !important; border-radius: 16px !important; }
.react-flow__controls { border: 1px solid var(--border) !important; border-radius: 16px !important; overflow: hidden; }
.react-flow__controls-button { background-color: var(--panel-elevated) !important; border-bottom: 1px solid var(--border) !important; fill: var(--muted) !important; }
.react-flow__controls-button:hover { background-color: var(--panel-contrast-hover) !important; }
.react-flow__edge-path { stroke: var(--accent) !important; stroke-width: 2 !important; }
.react-flow__connection-line { stroke: var(--accent) !important; stroke-dasharray: 5 5 !important; }
```

---

## 5.8 — Testes

**Repo: aios-lite** — `tests/squad-pipeline.test.js`
- Topological sort (ordem correta, detecção de ciclos)
- Pipeline CRUD (create, addNode, addEdge, getPipelineDAG)
- Handoff lifecycle (pending → consumed)
- Squad ports upsert

**Repo: aios-lite-dashboard** — testes manuais/visuais (o dashboard não tem framework de testes automatizados).

---

## Checklist de conclusão da Fase 5

### aios-lite
```
[ ] squad-manifest.schema.json atualizado com seção ports
[ ] runtime-store.js com 5 novas tabelas e funções CRUD
[ ] template/.aios-lite/tasks/squad-pipeline.md criado
[ ] src/commands/squad-pipeline.js criado
[ ] src/cli.js atualizado com squad:pipeline
[ ] squad.md atualizado com rota @squad pipeline
[ ] tests/squad-pipeline.test.js passando
[ ] Commit: "feat(squad): implement inter-squad pipelines — ports, DAG, handoffs"
```

### aios-lite-dashboard
```
[ ] package.json com @xyflow/react
[ ] lib/dashboard-data.ts — openRuntimeDb exportada
[ ] app/api/pipelines/ com todas as routes
[ ] app/pipelines/page.tsx (listagem)
[ ] app/pipelines/[slug]/page.tsx (editor visual)
[ ] components/pipelines/squad-node.tsx
[ ] components/pipelines/squad-picker.tsx
[ ] components/shell/app-shell.tsx — nav com /pipelines
[ ] app/globals.css — React Flow overrides no final
[ ] Commit: "feat(dashboard): pipeline visual builder — drag-and-drop squad connections"
```

---

## Nota sobre /workflows vs /pipelines

O dashboard já tem `/workflows` que mostra "Pipelines e execucoes" — atualmente é uma view read-only por squad. A nova `/pipelines` é o **editor visual** de conexões **entre** squads. São features diferentes: workflows = execução dentro de um squad; pipelines = fluxo entre squads.

Recomendação: rota separada `/pipelines` na v1. Pode-se integrar como tab de `/workflows` no futuro.
