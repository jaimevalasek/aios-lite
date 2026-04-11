---
name: squad-driver-pattern
description: Territory boundaries and integration pattern for AIOSON squads — separates squad definitions (owned by @squad) from application driver code (owned by @dev)
priority: 9
version: 1.0.0
agents: [dev, sheldon, pm, qa, architect]
---

# Squad Driver Pattern

Quando o projeto usa squads AIOSON, existe uma separacao fundamental de responsabilidades que todos os agentes devem respeitar.

## Duas camadas distintas

```
Camada 1 — Definicao (owned by @squad)
  .aioson/squads/{squad-slug}/
    agents/greeting-agent.md     ← prompt e personalidade do agente
    agents/orquestrador.md       ← logica de orquestracao
    squad.manifest.json          ← configuracao da squad
    workflows/main.md            ← pipeline de execucao

Camada 2 — Driver (owned by @dev)
  src/services/squadRunner.js    ← carrega e executa as definicoes
  src/services/greetingService.js ← driver que consome greeting-agent.md
```

Estas duas camadas nunca se misturam.

## Regra de territorio — absoluta para todos os agentes

| Agente | Pode criar/modificar | Nunca pode tocar |
|---|---|---|
| `@squad` | `.aioson/squads/` | Codigo de aplicacao (`src/`, `app/`, etc.) |
| `@dev` | Codigo de aplicacao | `.aioson/squads/` |
| `@pm` | Plano de implementacao | Qualquer uma das duas |
| `@architect` | `architecture.md` | Arquivos de squad ou codigo de agente |

## Padrao de integracao correto

O servico de aplicacao e um **driver** — carrega a definicao do squad e a envia ao LLM. Nunca embute prompts no codigo.

```javascript
// CORRETO — driver que consome a definicao do @squad
class GreetingService {
  async respond(message) {
    const agentDef = fs.readFileSync(
      '.aioson/squads/squad-greeting/agents/greeting-agent.md',
      'utf-8'
    )
    return await llm.call({ system: agentDef, user: message })
  }
}

// ERRADO — prompt embutido no codigo (@dev nao faz isso)
class GreetingService {
  async respond(message) {
    const prompt = "Voce e um atendente de farmacia..." // ← territorio do @squad
    return await llm.call({ system: prompt, user: message })
  }
}
```

## Por que isso importa

**Sem a separacao:**
- Mudar o comportamento do agente = mexer no codigo = deploy
- `@squad` nao consegue evoluir o agente de forma independente
- Dois territorios colapsados num so arquivo

**Com a separacao:**
- Mudar o comportamento = editar o `.md` do squad = sem deploy
- `@squad` evolui os agentes de forma independente
- O codigo de aplicacao nao conhece o dominio — so sabe carregar e executar

## O que cada agente faz com esta regra

**`@product` e `@sheldon`:** ao descrever squads no PRD, especificar apenas comportamento e objetivo — nunca prompts literais. Prompts sao responsabilidade do `@squad`.

**`@analyst` e `@architect`:** ao mapear requisitos e arquitetura, incluir a camada de driver como componente explicito. Exemplo em `architecture.md`:
```
SquadRunner — carrega definicoes de .aioson/squads/ e executa via LLM API
  dependencias: fs (leitura de .md), llm-client (chamada ao modelo)
  nao possui logica de dominio — apenas orquestra carregamento e execucao
```

**`@pm`:** ao criar `implementation-plan`, separar fases de squad de fases de codigo:
- Fases de squad → `executor: @squad`
- Fases de driver → `executor: @dev` com task "criar SquadRunner que carrega `.aioson/squads/{slug}/`"

**`@dev`:** ao implementar o driver, nunca escrever prompts inline. Se encontrar uma task que peca para criar ou modificar arquivos em `.aioson/squads/` — parar e redirecionar para `@squad`.

**`@squad`:** ao ser ativado em projeto com pipeline existente, ler `implementation-plan` e `prd` antes de perguntar qualquer coisa — o contexto ja esta nos artifacts.

**`@qa`:** ao revisar codigo que envolve squads, verificar:
- [ ] Servicos de squad sao drivers (carregam `.md` do squad, nao embuten prompts)
- [ ] Nenhum prompt de agente esta hardcoded no codigo de aplicacao
- [ ] `.aioson/squads/` nao foi modificado pelo `@dev`
