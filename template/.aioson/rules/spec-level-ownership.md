---
name: spec-level-ownership
description: spec.md é de projeto, spec-{slug}.md é de feature — os dois níveis nunca se misturam
priority: 9
version: 1.0.0
agents: [dev, qa, pm, sheldon]
---

# Ownership por Nível: spec.md vs spec-{slug}.md

O sistema de specs tem dois níveis distintos. Misturá-los causa corrupção de contexto entre features.

## Os dois níveis

| Arquivo | Nível | Dono | Conteúdo |
|---|---|---|---|
| `spec.md` | **Projeto** | `@dev` (projeto inteiro) | Decisões técnicas que afetam todo o projeto (stack, padrões globais, infraestrutura) |
| `spec-{slug}.md` | **Feature** | `@dev` (feature específica) | Decisões, entidades, dependências e ACs de UMA feature específica |

## Regras absolutas

**1. `spec.md` nunca recebe conteúdo de feature específica.**
- Errado: adicionar "endpoints do módulo de agendamento" em `spec.md`
- Certo: criar `spec-agendamento.md` para isso

**2. `spec-{slug}.md` nunca recebe decisões de projeto.**
- Errado: definir "usar PostgreSQL" em `spec-pagamento.md`
- Certo: decisões de stack ficam em `spec.md` ou `architecture.md`

**3. `spec-{slug}.md` é criado pelo `@dev` ao iniciar a implementação de cada feature.**
- Um arquivo por feature slug
- Slug deve coincidir com o slug do `prd-{slug}.md` e `implementation-plan-{slug}.md`

**4. Não existe `spec-{slug}.md` sem um `prd-{slug}.md` correspondente.**
- Se não há feature registrada em `features.md`, não há spec de feature

## Estrutura obrigatória de spec-{slug}.md

```markdown
---
feature: {slug}
status: in_progress | done
phase_gates:
  requirements: approved | pending | skipped
  design: approved | pending | skipped
  plan: approved | pending | skipped
---

# Spec — {nome da feature}

## Entidades implementadas
...

## Decisões técnicas
...

## Dependências
...

## Aprovação QA
(preenchida por @qa ao fechar a feature)
```

## Estrutura obrigatória de spec.md (nível projeto)

```markdown
# Spec — {nome do projeto}

## Stack e infraestrutura
...

## Padrões globais de código
...

## Integrações externas
...

## Decisões de arquitetura cross-feature
...
```

## Ação obrigatória ao detectar violação

Ao perceber que está prestes a adicionar conteúdo de feature em `spec.md` ou conteúdo de projeto em `spec-{slug}.md`:

1. **Não escrever no arquivo errado**
2. Identificar o nível correto
3. Escrever no arquivo correto (criando-o se necessário)
4. Se o arquivo correto não existir ainda, criá-lo seguindo a estrutura obrigatória acima

## Por que isso importa

`spec.md` é lido por todos os agentes como referência de projeto. Poluí-lo com detalhes de features específicas torna impossível identificar as decisões globais. `spec-{slug}.md` é o contrato de implementação de uma feature — misturar features nele impede que o `@qa` rastreie ACs por feature.
