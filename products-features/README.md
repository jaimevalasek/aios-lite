# Products & Features — Makopy

Planejamento de produtos e serviços a serem construídos sobre a aios-lite.
Esta pasta é local (.gitignore) — não vai para o repositório público.

---

## Produtos mapeados

| Pasta | Produto | Status | Prioridade |
|---|---|---|---|
| `makopy-receita/` | MCP Server: CNPJ + Certidões | Pronto para iniciar | ★★★★★ |
| `aios-tasks/` | AI Job Queue assíncrono | Visão definida | ★★★★☆ |
| `aios-cloud-runner/` | Runner local para execução remota de Squads | Ideia validada | ★★★★☆ |
| `aios-artisan/` | Interface visual para orquestrar AIOS Forge e Squads | Visão definida | ★★★★☆ |
| `aios-editor-agents/` | Agentes AIOSON acessíveis em editores via ACP + aioson.com | Ideia validada | ★★★★☆ |
| `future-ideas/` | Brainstorm de outros produtos | Rascunho | ★★★☆☆ |
| `upgrade-agents/` | Benchmark contínuo AIOX vs AIOSON por agente | Em andamento | ★★★★★ |

---

## Como usar com aios-lite

Cada subpasta tem um `project-brief.md` com tudo que o @product e @analyst precisam.
Para iniciar um produto:

```bash
# 1. Cria o repositório do produto
mkdir makopy-receita && cd makopy-receita

# 2. Instala o aios-lite
aios-lite install

# 3. Roda o @setup colando o conteúdo do project-brief.md como contexto inicial
# 4. Usa @product para formalizar o PRD (já acelerado pelo brief)
# 5. @analyst → @architect → @dev → @qa
```
