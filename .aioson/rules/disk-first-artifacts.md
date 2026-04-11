---
name: disk-first-artifacts
description: Todo artefato gerado por um agente deve ser gravado em disco antes do fim da sessão — nunca apenas exibido no chat
priority: 10
version: 1.0.0
---

# Regra Disk-First: Artefatos Sempre em Disco

Todo artefato produzido por um agente AIOSON deve ser gravado em disco antes do fim da sessão. Exibir o conteúdo apenas no chat não conta como entrega.

## Regra absoluta

**Se um agente produziu um artefato, ele DEVE estar em `.aioson/context/` (ou no caminho correto) ao fim da sessão.**

Artefatos que ficam só no chat são perdidos na próxima sessão e quebram o pipeline — o próximo agente não encontra o artefato e não sabe o que foi decidido.

## Tabela de artefatos obrigatórios por agente

| Agente | Artefato obrigatório | Caminho |
|---|---|---|
| `@product` | PRD | `.aioson/context/prd.md` ou `prd-{slug}.md` |
| `@product` | features.md | `.aioson/context/features.md` |
| `@analyst` | Discovery | `.aioson/context/discovery.md` |
| `@analyst` | Requirements | `.aioson/context/requirements-{slug}.md` |
| `@architect` | Architecture | `.aioson/context/architecture.md` |
| `@ux-ui` | UI Spec | `.aioson/context/ui-spec-{slug}.md` |
| `@sheldon` | Manifest | `.aioson/plans/{slug}/manifest.md` |
| `@pm` | Implementation Plan | `.aioson/context/implementation-plan-{slug}.md` |
| `@dev` | Spec de feature | `.aioson/context/spec-{slug}.md` |
| `@qa` | Relatório QA | `.aioson/context/qa-report-{slug}.md` ou corrections |
| `@squad` | Squad manifest | `.aioson/squads/{slug}/squad.manifest.json` |
| `@squad` | Agent prompts | `.aioson/squads/{slug}/agents/{agent}.md` |

## O que NÃO é disk-first

- Mostrar o conteúdo do artefato no chat e perguntar "Posso salvar?"
  → Salve diretamente. Informe ao usuário onde foi salvo.
- Criar o artefato como bloco de código no chat sem usar Write tool
  → Use a ferramenta de escrita. Código no chat não é disco.
- Dizer "aqui está o implementation-plan" e não escrever o arquivo
  → Escreva o arquivo primeiro, depois informe o caminho.

## Padrão correto de entrega

```
✅ Correto:
1. Agente escreve o artefato em disco
2. Informa: "Gravei `implementation-plan-agendamento.md` em `.aioson/context/`."

❌ Errado:
1. Agente exibe o artefato no chat
2. Pergunta: "Deseja que eu salve este arquivo?"
```

## Exceções permitidas

- **Rascunhos intermediários**: durante a elaboração, o agente pode mostrar partes no chat para validação antes de salvar a versão final
- **Artefatos descartados**: se o usuário explicitamente cancelar um artefato, ele não precisa ser salvo
- **project-pulse.md**: deve ser atualizado ao final de toda sessão, não apenas quando o agente produz um artefato primário

## Ação obrigatória ao detectar violação

Se ao fim de uma sessão um artefato primário não foi gravado em disco:

1. **Gravar antes de encerrar** — nunca deixar para a próxima sessão
2. Se o conteúdo já foi exibido no chat, usar esse conteúdo para gravar o arquivo
3. Atualizar `project-pulse.md` com o estado atual

## Por que isso importa

O pipeline AIOSON é assíncrono por natureza — cada agente roda em uma sessão diferente. O disco é o único canal de comunicação entre sessões. Artefatos que existem apenas no chat são efetivamente perdidos: o próximo agente inicia sem contexto e o usuário precisa repetir o trabalho.
