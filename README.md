<div align="center">

# AIOSON

**AI operating framework for hyper-personalized software.**

*Structure your AI sessions. Orchestrate specialized agents. Ship with confidence.*

*Works in any IDE with a terminal — VS Code, Google Antigravity, Cursor, Windsurf, JetBrains IDEs, Zed, and more.*

[![npm version](https://img.shields.io/npm/v/@jaimevalasek/aioson?color=6c47ff&style=flat-square)](https://www.npmjs.com/package/@jaimevalasek/aioson)
[![npm downloads](https://img.shields.io/npm/dm/@jaimevalasek/aioson?style=flat-square&color=6c47ff)](https://www.npmjs.com/package/@jaimevalasek/aioson)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![Node.js ≥20](https://img.shields.io/badge/node-%E2%89%A520.0.0-brightgreen?style=flat-square)](https://nodejs.org)

[![Claude Code](https://img.shields.io/badge/Claude_Code-supported-6c47ff?style=flat-square)](https://claude.ai/code)
[![Codex CLI](https://img.shields.io/badge/Codex_CLI-supported-black?style=flat-square)](https://github.com/openai/codex)
[![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-supported-4285F4?style=flat-square)](https://github.com/google-gemini/gemini-cli)
[![OpenCode](https://img.shields.io/badge/OpenCode-supported-orange?style=flat-square)](https://opencode.ai)

</div>

---

## What AIOSON is

You already talk to an AI to help you build software. AIOSON turns that one general-purpose assistant into a **small team of specialists that take turns**.

An "agent" here is just the AI wearing a specific hat, with its own instructions and its own job. One agent works out *what* you are building and writes it down. Another turns that into an ordered plan. Another writes the code. Another reviews the result. You call each one by typing its name (`@product`, `@dev`, `@qa`) inside the AI tool you already use.

AIOSON installs those agents into your project as plain files, so the whole team travels with the repo.

---

## The problem it solves

A long AI conversation forgets. It runs out of room, loses the decision it made an hour ago, and quietly rebuilds something you already settled. Then you open a new session tomorrow and start explaining from scratch.

AIOSON fixes that by writing decisions to disk instead of leaving them in chat history. Each agent leaves a real file behind — what it decided, why, and what the next agent should do. The next session reads those files and picks up where the last one stopped. Three months later, you or anyone else can open the project and understand it without the chat log.

It also keeps the process proportional. A one-line fix does not get a committee. A whole product does not get a single prompt.

---

## Quick start

You need **Node.js 20 or newer** and an AI CLI you already use (Claude Code, Codex CLI, or OpenCode).

```bash
# New project
npx @jaimevalasek/aioson init my-project

# Existing project — additive, it does not touch your code
cd my-project
npx @jaimevalasek/aioson install
```

Either command opens a short **wizard** with four questions: which AI clients to set up, whether you want squads as well as development, an optional design system, and the language your agents speak (English, Português, Español, Français). Only the files you picked get copied, and nothing is added to your dependencies.

Then open your AI client in the project and type:

```
@setup
```

`@setup` interviews you about the project and writes the answers to a context file every other agent reads. From there it tells you which agent comes next.

Upgrading later? Update the CLI first, then the project files. The order matters, and doing it backwards is the most common reason an update appears to do nothing. Full guide: [Instalar e atualizar (PT)](docs/pt/2-comecar/instalar-e-atualizar.md).

---

## Documentation

### 📘 Documentação em Português

The Portuguese docs are the most complete and the most up to date. Start here.

**[→ docs/pt/README.md](docs/pt/README.md)** — the full portal

| Trilha | Comece por |
|---|---|
| Entender o que é | [O que é AIOSON](docs/pt/1-entender/o-que-e-aioson.md) · [Por que existe](docs/pt/1-entender/por-que-existe.md) · [Mapa do ecossistema](docs/pt/1-entender/mapa-do-ecossistema.md) |
| Colocar para rodar | [Instalar e atualizar](docs/pt/2-comecar/instalar-e-atualizar.md) · [Primeiro projeto](docs/pt/2-comecar/primeiro-projeto.md) · [Projeto existente](docs/pt/2-comecar/projeto-existente.md) |
| Copiar uma receita | [Índice de receitas](docs/pt/3-receitas/README.md) |
| Saber quem faz o quê | [Fichas dos agentes](docs/pt/4-agentes/README.md) |
| Referência técnica | [Comandos do CLI](docs/pt/5-referencia/comandos-cli.md) · [Índice da referência](docs/pt/5-referencia/README.md) |

### 📗 English documentation

**[→ docs/en/README.md](docs/en/README.md)**

- [CLI reference](docs/en/5-reference/cli-reference.md) — every command
- [JSON schemas](docs/en/5-reference/json-schemas.md) — `--json` output contracts
- [Agent execution](docs/en/5-reference/agent-execution.md) · [Autopilot handoff](docs/en/5-reference/autopilot-handoff.md) · [Parallel orchestration](docs/en/5-reference/parallel.md)
- [MCP guide](docs/en/5-reference/mcp.md) · [Browser QA guide](docs/en/5-reference/qa-browser.md) · [Web3 guide](docs/en/5-reference/web3.md) · [i18n guide](docs/en/5-reference/i18n.md)

---

## Research Inspirations

AIOSON may study external agent-workflow patterns as product research. These links are inspiration references only: they are not runtime dependencies, endorsements, or citations inside generated AIOSON artifacts.

- Interview-style clarification and lightweight decision records
  - https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me
  - https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs
  - https://github.com/mattpocock/skills/tree/main/README.md

---

## License

[AGPL-3.0-only](LICENSE) — GNU Affero General Public License v3.0
