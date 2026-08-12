# Documentação AIOSON — Português

> **AIOSON** dá a cada sessão de IA um **papel**, um **protocolo** e um **ciclo de vida**.
> Em vez de um prompt gigante tentando fazer tudo, agentes especializados se revezam: cada um cuida de uma fatia (entender, planejar, implementar, revisar) e passa o bastão para o próximo de forma limpa.

Esta é a porta de entrada. Siga a ordem abaixo se você é novo, ou pule direto para a seção que interessa.

**Entender → Começar → Receitas → Agentes → Referência**

---

## Em três comandos

```bash
# 1. Criar o projeto (ou use `install` num projeto que já existe)
npx @jaimevalasek/aioson init meu-projeto

# 2. Entrar na pasta
cd meu-projeto

# 3. Abrir seu cliente AI (Claude Code, Codex ou OpenCode) e digitar:
@setup
```

A partir daí os agentes guiam você. Passo a passo completo em [Primeiro projeto](./2-comecar/primeiro-projeto.md).

---

## 1. Entender — o que é isso

Comece por aqui se você nunca usou. São 15 minutos.

| Página | O que responde |
|---|---|
| [O que é AIOSON](./1-entender/o-que-e-aioson.md) | A analogia simples, o que ele faz por você, e quando *não* usar |
| [Por que existe](./1-entender/por-que-existe.md) | O problema do prompt-monolito |
| [Mapa do ecossistema](./1-entender/mapa-do-ecossistema.md) | O time inteiro num diagrama |
| [Glossário](./1-entender/glossario.md) | Agente, squad, genome, skill, dossier, classificação |

---

## 2. Começar — colocar para rodar

| Página | Quando ler |
|---|---|
| [Instalar e atualizar](./2-comecar/instalar-e-atualizar.md) | Requisitos, todas as flags de `init`/`install`/`update`, hooks e como subir de versão |
| [Primeiro projeto](./2-comecar/primeiro-projeto.md) | Projeto novo, do zero, com diálogos reais de cada agente |
| [Projeto existente](./2-comecar/projeto-existente.md) | Você já tem código e quer trazer o AIOSON |
| [Decisões iniciais](./2-comecar/decisoes-iniciais.md) | MICRO, SMALL ou MEDIUM? Qual cliente AI? |

---

## 3. Receitas — casos prontos para copiar

Índice completo em [`3-receitas/`](./3-receitas/README.md).

**As trilhas canônicas — como uma feature chega ao código:**

1. [Feature completa com revisão do `@sheldon`](./3-receitas/feature-completa-com-sheldon.md) — a rota única `@product → @sheldon → @planner → @dev → @qa`
2. [Da ideia ao PRD via `@briefing`](./3-receitas/da-ideia-ao-prd-via-briefing.md) — quando a ideia ainda é vaga
3. [Plans externos para `@product`](./3-receitas/plans-externos-para-product.md) — quando você planejou em outra ferramenta e quer trazer

**Por cenário:**

| Receita | Cenário |
|---|---|
| [Landing page](./3-receitas/landing-page.md) | Página de conversão, com `@copywriter` opcional |
| [App SaaS do zero](./3-receitas/app-saas-do-zero.md) | Workflow MEDIUM completo: auth, billing, admin |
| [Integração em codebase grande](./3-receitas/integracao-em-codebase-grande.md) | `install` + `@discover` + `@analyst` em legado |
| [Refatoração grande](./3-receitas/refatoracao-grande.md) | `@sheldon` antes do `@dev` |
| [Auditoria de segurança](./3-receitas/auditoria-seguranca.md) | `@pentester` de ponta a ponta |
| [Continuidade entre sessões](./3-receitas/continuidade-entre-sessoes.md) | Dossier, dev-resume, detecção de drift |
| [Clonar design de site](./3-receitas/clonar-design-de-site.md) | `@site-forge` + `@design-hybrid-forge` |
| [Exploração visual e arena entre modelos](./3-receitas/arena-de-exploracao-visual.md) | Comparar direções de design antes de escolher |
| [Publicar no AIOSON Store](./3-receitas/publicar-no-aioson-com.md) | `system:package` + `system:publish` |

---

## 4. Agentes — quem faz o quê

- **[Fichas por agente](./4-agentes/README.md)** — uma ficha para cada agente, com diálogo típico, saídas em disco e para quem passa o bastão
- [Guia tabular alternativo](./agentes.md) — visão de uma página só

---

## 5. Referência — o detalhe técnico

Índice completo em [`5-referencia/`](./5-referencia/README.md). Os mais procurados:

**CLI e instalação**

- [Comandos do CLI](./5-referencia/comandos-cli.md) — todos os comandos do `aioson`
- [Instalar e atualizar](./2-comecar/instalar-e-atualizar.md) — flags, requisitos, upgrade
- [Clientes AI](./5-referencia/clientes-ai.md) — Claude Code, Codex, OpenCode

**Regras, contexto e memória**

- [Regras de interação e gate visual](./5-referencia/regras-de-interacao-e-gate-visual.md) — máscaras, confirmação, drag-and-drop, widgets, e o que o gate visual mede
- [Hooks e Session Guard](./5-referencia/hooks-session-guard.md) — `context:guard` antes de cada escrita, telemetria de runtime
- [Memória e contexto](./5-referencia/memoria-e-contexto.md) — busca, cache, monitor, carregamento seletivo
- [Agent sharding](./5-referencia/agent-sharding.md) — carregar só a parte relevante de um agente
- [Memória do operador](./5-referencia/operator-memory.md) — decisões por identidade
- [Memória Viva](./living-memory/README.md) · [Active Learning Loop](./active-learning-loop/README.md)

**Fluxo de trabalho**

- [Fluxo de artefatos](./5-referencia/fluxo-artefatos.md) — PRD único → plano único → implementação → veredito
- [Autopilot e handoffs](./5-referencia/autopilot-handoff.md)
- [Execução de agentes](./5-referencia/agent-execution.md) — faixas por host/modelo, fallback explícito, telemetria
- [Feature dossier](./5-referencia/feature-dossier.md) · [Live sessions](./5-referencia/live-sessions.md)
- [Deyvin Sub-Task Scout](./deyvin-subtask-scout/README.md)

**Squads e design**

- [Squads](./5-referencia/squads.md) — criação, squad efêmero, roteamento entre squads, webhook
- [Squad Dashboard](./5-referencia/squad-dashboard.md) · [Automação de squads](./5-referencia/automacao-squads.md)
- [Genome 4.0](./5-referencia/genome-4.0-spec.md) · [Skills](./5-referencia/skills.md)

**Outros**

- [Secure by default](./5-referencia/secure-by-default.md) · [Sandbox](./5-referencia/sandbox.md)
- [SDD framework](./5-referencia/sdd-framework.md) · [Motor hardening](./5-referencia/motor-hardening.md)
- [AIOSON Store](./5-referencia/aioson-com-store.md) · [Web3](./5-referencia/web3.md)

---

## Glossário rápido

Versão expandida em [`1-entender/glossario.md`](./1-entender/glossario.md).

| Termo | O que é |
|---|---|
| **Agente** | Um especialista (`@product`, `@dev`, `@qa`…) com prompt e regras próprias |
| **Squad** | Um time de agentes que você cria para um domínio específico |
| **Genome** | O "DNA cognitivo" de um domínio ou de uma pessoa — como o agente pensa |
| **Skill** | Um pacote plugável de instrução (design system, processo, conhecimento) |
| **Regra** | Um contrato em `.aioson/rules/` que todo agente relevante carrega |
| **Dossier** | A pasta de uma feature: spec, plano, decisões, status |
| **Classificação** | MICRO / SMALL / MEDIUM — quanto de processo o trabalho precisa |
| **Constitution** | Os princípios que nenhum agente sobrescreve |

---

## Arquivo histórico

[`_arquivo/`](./_arquivo/) guarda versões anteriores das docs, cada uma com nota apontando para o equivalente atual. Nada foi perdido, mas nada ali é fonte de verdade.

---

## Outras línguas

A documentação em português é a mais completa e a mais atualizada. Existe também [`docs/en/`](../en/README.md), em inglês.
