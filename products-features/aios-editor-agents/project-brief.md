# Project Brief — aios-editor-agents

> Agentes AIOSON acessíveis diretamente de qualquer editor de código via Agent Client Protocol (ACP), servidos pelo aioson.com
> Status: ideia validada — documentada para implementação futura

---

## O que é

Uma camada de exposição pública que transforma os agentes AIOSON em servidores ACP, permitindo que qualquer editor compatível (Zed, VS Code, Cursor, JetBrains, Neovim e outros) se conecte a eles diretamente via aioson.com — sem instalar o CLI, sem abrir terminal, sem configuração manual.

O usuário abre o editor, escolhe um agente AIOSON no registry e começa a trabalhar.

---

## O problema que resolve

Hoje, usar AIOSON requer:
1. Instalar o CLI localmente
2. Rodar comandos no terminal
3. Entender o workflow de agentes manualmente

Isso limita o alcance do produto a desenvolvedores que já adotaram o CLI. Toda a inteligência dos squads — @analyst, @architect, @dev, @qa, @deyvin — fica invisible para o ecossistema de editores onde os desenvolvedores vivem.

Com ACP como protocolo de exposição:
- Squads viram agentes selecionáveis dentro do editor
- O workflow AIOSON acontece dentro do ambiente de trabalho do dev
- aioson.com funciona como registry + gateway + autenticação

---

## O que é ACP (contexto)

Agent Client Protocol é o "LSP dos agentes AI" — um protocolo aberto (Apache 2.0, criado pelo time Zed) que padroniza a comunicação entre editors/IDEs e agentes AI. Resolve o mesmo problema que o LSP resolveu para language servers: desacopla o agente do editor.

- Transporte: JSON-RPC 2.0 sobre stdio (obrigatório) ou HTTP Streamable (draft)
- Suporte a streaming (text chunks, tool calls, planos, diffs em tempo real)
- Capacidades negociadas na inicialização (filesystem, terminal, MCP servers)
- Sessões concorrentes por conexão, com suporte a load/fork de sessão
- Ecossistema: 30+ agentes já compatíveis (GitHub Copilot, Gemini CLI, Cursor, Cline, OpenHands...)

SDKs disponíveis: Rust, Python, TypeScript/Node.js, Java, Kotlin.

---

## Visão do produto

```text
Editor ACP-compatible (Zed, VS Code, Cursor...)
    ↓  JSON-RPC 2.0 (stdio ou HTTP)
aioson.com — ACP Gateway
    ├─ Registry de agentes publicados
    ├─ Autenticação (API key / license)
    ├─ Roteamento para agente correto
    └─ Sessão gerenciada
         ↓
Executor AIOSON
    ├─ Agente ativado (@dev, @analyst, @qa...)
    ├─ Contexto injetado (genome, squad config, rules)
    ├─ Chamadas Claude API / outros LLMs
    └─ Runtime events → SQLite cloud
```

O editor vê apenas um agente ACP. A complexidade do workflow AIOSON fica invisível.

---

## Modos de execução possíveis

### Modo 1 — Cloud-hosted (MVP recomendado)
- aioson.com hospeda e executa os agentes diretamente
- Usuário autentica com API key
- Nenhum requisito local além do editor ACP-compatible
- Custo: compute por sessão no servidor

### Modo 2 — Runner local + gateway remoto
- aioson.com serve como gateway e registry
- Execução acontece no runner local da máquina do usuário
- Complementar ao `aios-cloud-runner` (já documentado)
- Menor custo de infra, maior controle e privacidade para o usuário

### Modo 3 — Self-hosted (enterprise)
- Empresa hospeda seu próprio gateway ACP com squads privados
- aioson.com valida licença apenas
- Squads como produto interno da empresa

---

## Agentes candidatos para exposição inicial

| Agente | Função | Valor no editor |
|---|---|---|
| `@dev` / `@deyvin` | Implementação de features | Feature complete em contexto real do projeto |
| `@qa` | Geração de testes, risk review | QA inline na abertura de arquivo |
| `@analyst` | Domain discovery, entity mapping | Análise de codebase sem sair do editor |
| `@architect` | Decisões técnicas, estrutura | Pairing arquitetural contextualizado |
| `@sheldon` | Revisão de código opinionada | Code review com personalidade definida |

Cada agente exposto recebe o contexto do projeto via `session/new` (cwd + MCP servers opcionais).

---

## Como ACP mapeia para os conceitos AIOSON

| Conceito ACP | Equivalente AIOSON |
|---|---|
| `session/new` com `cwd` | Contexto do projeto carregado |
| `configOptions` (model, mode) | Squad config / genome options |
| `session/update plan` | Milestones do workflow do agente |
| `tool_call` (read/edit/execute) | Ações do agente no filesystem |
| `session/request_permission` | Gate de confirmação antes de mudanças críticas |
| `session/fork` (RFD draft) | Squad paralela em worktree isolado |
| Proxy/Conductor (RFD draft) | @orache / @orchestrator como proxy chain |
| `_meta.traceparent` (OTel) | Runtime telemetry → SQLite |

---

## O que NÃO mudar

- A comunicação interna entre squads continua via artefatos + `last-handoff.json` + SQLite. ACP é apenas a camada de exposição externa, não o protocolo interno.
- O workflow enforcement (artefatos validados, handoff com estado) não é substituído — continua como está.
- Squads continuam sendo a unidade de trabalho. ACP é o "envelope" que as torna acessíveis ao editor.

---

## Integração com o ecossistema existente

O que já existe e serve de base:
- Squads como pacote publicável (squad-export, squad-deploy)
- Genomes como definição portátil de agente
- Runtime SQLite com tasks, agent_runs, events, artifacts
- aioson.com como backend cloud (PRDs 001-004)
- squad-worker.js como executor de agente

O que precisaria ser construído:
- Servidor ACP (TypeScript/Node.js SDK: `@agentclientprotocol/sdk`) em cima do squad-worker
- Gateway HTTP no aioson.com que aceita conexões ACP e roteia para o executor
- Registry de agentes publicados no aioson.com (genome → ACP agent descriptor)
- Sistema de autenticação por sessão ACP (API key → license verify)
- Streaming de `session/update` mapeado para os eventos do runtime AIOSON
- UI no aioson.com para publicar um agente/squad e obter endpoint ACP

---

## Stack sugerida

```text
aioson.com
  ├─ ACP Gateway (Node.js + @agentclientprotocol/sdk)
  │   ├─ initialize / session/new → carregar genome + squad config
  │   ├─ session/prompt → invocar executor do agente
  │   ├─ session/update → stream de milestones, tool calls, planos
  │   └─ fs/* / terminal/* → repassar para runner local ou executor cloud
  ├─ Registry de agents (genome slugs publicados)
  └─ Auth middleware (API key → workspace → license)

Executor cloud
  ├─ squad-worker.js adaptado para ACP sessions
  ├─ Claude API (ou outro LLM) para o agente ativo
  └─ Runtime events → SQLite cloud
```

---

## Proposta de valor

Para o desenvolvedor:
> "Escolho @deyvin no Zed, descrevo o que preciso, e ele implementa diretamente no meu projeto — com todo o contexto do codebase, com plan visível, com diff inline, sem sair do editor."

Para o ecossistema AIOSON:
> Squads deixam de ser uma ferramenta de CLI e viram agentes de mercado, acessíveis de qualquer editor que suporte ACP — que em 2026 já inclui Zed, VS Code, Cursor, JetBrains, Neovim e 30+ outros.

---

## Riscos e cuidados

- Não expor squads que dependem de artefatos locais sem estratégia de contexto remoto
- Não tentar replicar o workflow inteiro do CLI via ACP — expor agentes individuais primeiro
- Autenticação obrigatória antes de qualquer sessão (API key válida + license ativa)
- Custo de compute por sessão precisa estar mapeado no modelo de pricing do aioson.com
- ACP stdio é o transporte obrigatório para editores locais; HTTP Streamable ainda é draft — começar por stdio ou HTTP bem definido
- Não vazar contexto de workspace de um usuário para outro (isolamento por sessão)

---

## Referências

- Repositório ACP: https://github.com/agentclientprotocol/agent-client-protocol
- SDK TypeScript: `@agentclientprotocol/sdk` (npm)
- Registry de agentes/clientes: agentclientprotocol.com/registry
- Produtos relacionados: `aios-cloud-runner/project-brief.md` (runner local + fila remota)
- PRDs do ecossistema cloud: `prds/` (001-004)

---

## Próximos passos quando priorizar

```text
[ ] Validar modelo de pricing por sessão ACP no aioson.com
[ ] Escolher agente piloto para primeira exposição (@dev ou @deyvin)
[ ] Spike: servidor ACP mínimo com @agentclientprotocol/sdk em Node.js
[ ]   → session/new carrega genome do agente
[ ]   → session/prompt invoca squad-worker
[ ]   → session/update streama milestones + tool calls
[ ] Integrar spike com gateway do aioson.com
[ ] Publicar primeiro agente no ACP registry público
[ ] UI no aioson.com: "Publicar Squad como agente ACP"
[ ] Testar end-to-end: Zed → aioson.com → @dev → diff no editor
```

---

## Tese principal

ACP é o protocolo que torna os agentes AIOSON cidadãos de primeira classe no ecossistema de editores. Não é uma mudança na arquitetura interna — é uma camada de exposição. Squads continuam sendo o produto; ACP é o canal de distribuição.

O resultado: qualquer dev com Zed, VS Code ou Cursor pode usar @deyvin, @analyst ou @qa como se fossem agentes nativos do editor — com a inteligência, contexto e workflow enforcement que só o AIOSON tem.
