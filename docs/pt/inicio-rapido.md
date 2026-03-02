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
npx aios-lite init
```

### Projeto existente

```bash
cd meu-projeto
npx aios-lite install
```

Isso cria a pasta `.aios-lite/` com todos os arquivos de configuração, agentes e contexto.

---

## 2. Configure o contexto do projeto

```bash
npx aios-lite setup:context
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

Isso gera `.aios-lite/context/project.context.md` — o arquivo que orienta todos os agentes.

---

## 3. Abra seu AI IDE e comece

No **Claude** (CLAUDE.md já configurado):
```
/setup
```

No **Codex** (AGENTS.md já configurado):
```
@setup
```

No **Gemini** (`.gemini/GEMINI.md` já configurado):
```
/aios-setup
```

O agente `@setup` vai ler o contexto e confirmar o plano.

---

## Qual sequência usar?

| Tamanho do projeto | Sequência de agentes |
|---|---|
| **MICRO** — 0–1 ponto | `@setup → @dev` |
| **SMALL** — 2–3 pontos | `@setup → @analyst → @architect → @ux-ui → @dev → @qa` |
| **MEDIUM** — 4–6 pontos | `@setup → @analyst → @architect → @ux-ui → @pm → @orchestrator → @dev → @qa` |

**Não sabe o tamanho?** Responda 3 perguntas:
1. Quantos tipos de usuário? (1=0pt, 2=1pt, 3+=2pt)
2. Quantas integrações externas? (0=0pt, 1-2=1pt, 3+=2pt)
3. Regras de negócio complexas? (nenhuma=0pt, algumas=1pt, muitas=2pt)

- 0–1 pontos → **MICRO**
- 2–3 pontos → **SMALL**
- 4–6 pontos → **MEDIUM**

---

## Próximos passos

- [Cenários completos com exemplos práticos](./cenarios.md)
- [Guia de agentes: quando usar cada um](./agentes.md)
- [Suporte a projetos Web3](./web3.md)
- [Orquestração paralela para projetos MEDIUM](../en/parallel.md)
