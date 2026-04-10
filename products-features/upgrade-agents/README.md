# Upgrade Agents

> Pasta dedicada a benchmarks entre agentes do AIOX e agentes do AIOSON, com foco em ideias de enriquecimento para o AIOSON sem alterar o core imediatamente.

---

## Objetivo

Esta pasta centraliza análises comparativas agente por agente.

Cada análise deve responder:

- como o agente do AIOX funciona
- como o agente equivalente do AIOSON funciona hoje
- o que o AIOX já tem e o AIOSON ainda não tem
- o que o AIOSON já tem e o AIOX não mostra nessa fonte
- o que valeria enriquecer no AIOSON sem copiar cegamente o outro framework

---

## Índice atual

| Pasta | Comparação | Status |
|---|---|---|
| `orchestrator-master/` | `AIOX aiox-master` vs orquestração atual do `AIOSON` | concluído |
| `analyst/` | `AIOX analyst` vs `AIOSON analyst` | concluído |
| `architect/` | `AIOX architect` vs `AIOSON architect` | concluído |
| `pm/` | `AIOX pm` vs `AIOSON pm` | concluído |
| `dev/` | `AIOX dev` vs `AIOSON dev` | concluído |
| `devops/` | `AIOX devops` transformado em `@devops` nativo do AIOSON | concluído |
| `qa/` | `AIOX qa` vs `AIOSON qa` | concluído |
| `sm/` | `AIOX sm` vs proposta de `@sm` nativo do AIOSON | concluído |
| `ux-ui/` | `AIOX ux-design-expert` vs `AIOSON ux-ui` | concluído |

---

## Padrão recomendado para próximos agentes

Para cada agente, criar uma subpasta com:

- `analysis.md` — comparação técnica e estratégica
- `notes.md` — observações curtas, backlog e hipóteses de evolução opcional

Sugestão de ordem para próximas análises:

1. `setup`
