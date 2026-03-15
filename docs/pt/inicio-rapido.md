# Início Rápido

> Instale, configure e use os agentes de IA em menos de 10 minutos.

## Pré-requisitos

- Node.js 18+
- Um projeto de software (existente ou novo)
- Claude, Codex, Gemini ou OpenCode configurado no seu editor

---

## 1. Instalação

### Novo projeto (recomendado)

```bash
mkdir meu-projeto && cd meu-projeto
npx aioson init
```

### Projeto existente

```bash
cd meu-projeto
npx aioson install
```

Isso cria a pasta `.aioson/` com todos os arquivos de configuração, agentes e contexto.

Se o projeto já for brownfield e você quiser gerar um panorama inicial da base, rode depois:

```bash
npx aioson scan:project . --folder=src
```

O scanner cria estes arquivos localmente:

- `.aioson/context/scan-index.md`
- `.aioson/context/scan-folders.md`
- `.aioson/context/scan-<pasta>.md`
- `.aioson/context/scan-aioson.md`

Se você também quiser gerar `discovery.md` e `skeleton-system.md`, ative a etapa opcional com LLM:

```bash
npx aioson scan:project . --folder=src --with-llm --provider=openai
```

---

## 2. Configure o contexto do projeto

```bash
npx aioson setup:context
```

O CLI vai fazer perguntas sobre seu projeto:

```
? Nome do projeto: minha-loja
? Tipo de projeto: web_app
? Framework principal: Laravel
? Framework instalado? Sim
? Classificação: SMALL
? Idioma de conversa: pt-BR
```

Isso gera `.aioson/context/project.context.md` — o arquivo que orienta todos os agentes.

---

## 3. Abra seu AI IDE e comece

No **Claude Code** (CLAUDE.md já configurado):
```
/aioson/setup
```

No **Codex** (AGENTS.md já configurado — sem slash commands):
```
use the @setup agent to onboard this project
```

No **Gemini CLI** (`.gemini/commands/` já configurado):
```
/aios-setup
```

O agente `@setup` detecta o framework, faz as perguntas e gera o `project.context.md`.

> Cada CLI tem uma forma diferente de invocar agentes. Consulte o [Guia de CLIs de IA](./clientes-ai.md) para exemplos detalhados de Claude Code, Codex e Gemini.

---

## Qual sequência usar?

| Tamanho do projeto | Sequência de agentes |
|---|---|
| **MICRO** — 0–1 ponto | `@setup → @dev` |
| **SMALL** — 2–3 pontos | `@setup → @product → @analyst → @architect → @ux-ui → @dev → @qa` |
| **MEDIUM** — 4–6 pontos | `@setup → @product → @analyst → @architect → @ux-ui → @pm → @orchestrator → @dev → @qa` |

### Atalho recomendado quando o escopo ainda está nebuloso

Se a demanda ainda estiver vaga, se a feature for grande ou se houver risco alto de retrabalho, use:

```text
@setup -> @discovery-design-doc -> proximo agente recomendado
```

Exemplos:
- projeto novo ainda mal definido
- feature grande em sistema existente
- integrações sensíveis como billing, webhooks, Stripe ou permissões

Esse passo de `@discovery-design-doc` é **recomendado quando agrega clareza**, não obrigatório.
Se o pedido já estiver claro e pequeno, siga o fluxo normal.

**Não sabe o tamanho?** Responda 3 perguntas:
1. Quantos tipos de usuário? (1=0pt, 2=1pt, 3+=2pt)
2. Quantas integrações externas? (0=0pt, 1-2=1pt, 3+=2pt)
3. Regras de negócio complexas? (nenhuma=0pt, algumas=1pt, muitas=2pt)

- 0–1 pontos → **MICRO**
- 2–3 pontos → **SMALL**
- 4–6 pontos → **MEDIUM**

---

## Próximos passos

- [Referência completa dos comandos do CLI](./comandos-cli.md)
- [Como usar com Claude Code, Codex e Gemini](./clientes-ai.md)
- [Cenários completos com exemplos práticos](./cenarios.md)
- [Guia de agentes: quando usar cada um](./agentes.md)
- [Suporte a projetos Web3](./web3.md)
- [Orquestração paralela para projetos MEDIUM](../en/parallel.md)
