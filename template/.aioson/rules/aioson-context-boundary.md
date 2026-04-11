---
name: aioson-context-boundary
description: .aioson/context/ accepts only .md files — no JSON, YAML, JS, or other formats
priority: 10
version: 1.0.0
agents: [product, analyst, architect, ux-ui, pm, dev, qa, sheldon]
---

# Regra de Fronteira: .aioson/context/

O diretório `.aioson/context/` é de uso exclusivo para artefatos em Markdown (`.md`).

## Regra absoluta

**Nenhum agente pode criar arquivos não-Markdown dentro de `.aioson/context/`.**

Formatos proibidos dentro de `.aioson/context/`:
- `.json` — use `.aioson/config.md` ou a raiz do projeto
- `.yaml` / `.yml` — use `.aioson/skills/` ou a raiz do projeto
- `.js`, `.ts`, `.py` — nunca pertencem a `.aioson/context/`
- Qualquer outro formato não-Markdown

## Localização correta por tipo de artefato

| Tipo de artefato | Localização correta |
|---|---|
| Configuração de projeto | `.aioson/config.md` |
| Conformance schema | `.aioson/context/conformance-{slug}.yaml` → **EXCEÇÃO: `.yaml` permitido apenas para conformance** |
| Definições de squad | `.aioson/squads/{slug}/` |
| Manifests de skill | `.aioson/skills/{categoria}/{slug}/SKILL.md` |
| Artefatos de feature | `.aioson/context/{artefato}-{slug}.md` |
| Artefatos de projeto | `.aioson/context/{artefato}.md` |

## Artefatos válidos em .aioson/context/

```
project.context.md          ← setup
discovery.md                ← analyst
requirements-{slug}.md      ← analyst
architecture.md             ← architect
ui-spec-{slug}.md           ← ux-ui
prd.md / prd-{slug}.md      ← product
spec-{slug}.md              ← dev
implementation-plan-{slug}.md ← pm
features.md                 ← product / pm
project-pulse.md            ← todos (atualizam ao final)
conformance-{slug}.yaml     ← ÚNICA exceção ao .md
```

## Por que isso importa

`.aioson/context/` é lido por múltiplos agentes como fonte de verdade. Arquivos em formatos não-Markdown quebram o pipeline de leitura sequencial dos agentes, que assumem que todo artefato de contexto é Markdown legível.

## Ação obrigatória ao detectar violação

Se um agente receber uma task que envolva criar um arquivo não-Markdown dentro de `.aioson/context/`:

1. **Não criar o arquivo**
2. Identificar o formato correto e localização alternativa
3. Informar o usuário:
   > "`.aioson/context/` aceita apenas arquivos `.md` (exceção: `conformance-{slug}.yaml`). Criarei `{artefato}` em `{localização-correta}` em vez disso."
