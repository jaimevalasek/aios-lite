---
name: prd-section-ownership
description: Define qual agente é dono de cada seção do PRD — outros agentes não podem modificar seções que não são suas
priority: 9
version: 1.0.0
agents: [product, pm, analyst, architect, ux-ui, sheldon]
---

# Ownership de Seções do PRD

O `prd.md` (e `prd-{slug}.md`) é um documento compartilhado entre múltiplos agentes. Para evitar conflitos e sobrescrita, cada seção tem um único dono.

## Tabela de ownership

| Seção do PRD | Agente dono | Outros agentes podem |
|---|---|---|
| `## Objetivo` | `@product` | Apenas ler |
| `## Problema` | `@product` | Apenas ler |
| `## Usuários e Personas` | `@product` | Apenas ler |
| `## Funcionalidades` | `@product` | Apenas ler |
| `## Critérios de Aceite` | `@product` (estrutura) / `@pm` (enriquecimento) | `@analyst`, `@architect` adicionam sub-itens técnicos |
| `## Fases de Entrega` | `@pm` | Apenas ler |
| `## Restrições Técnicas` | `@architect` | Apenas ler |
| `## Considerações de UX` | `@ux-ui` | Apenas ler |
| `## Riscos` | `@pm` | `@analyst`, `@architect` adicionam novos riscos apenas |
| `## Decisões Registradas` | `@sheldon` (proj.) / `@pm` (feature) | Apenas ler |

## Regra de modificação

**Um agente SÓ pode modificar seções que ele próprio possui.**

Ao enriquecer o PRD, um agente não-dono pode:
- **Adicionar** uma nova sub-seção ao final da seção existente (ex: `@analyst` adiciona `### Regras de negócio` dentro de `## Critérios de Aceite`)
- **Nunca substituir** ou reescrever o conteúdo que o agente dono escreveu

## Padrão de adição segura

```markdown
## Critérios de Aceite
<!-- @product: dono desta seção -->

- CA-01: O usuário pode agendar uma consulta
- CA-02: O sistema envia confirmação por email

### Critérios técnicos (adicionado por @analyst)
- CA-T01: Agendamento valida disponibilidade via query ao banco antes de confirmar
- CA-T02: Fila de email usa BullMQ com retry de 3x
```

## Ação obrigatória ao detectar violação

Se um agente perceber que está prestes a sobrescrever uma seção que não é sua:

1. **Não sobrescrever**
2. Criar uma sub-seção com atribuição explícita (`<!-- adicionado por @{agente} -->`)
3. Ou criar um artefato separado (`requirements-{slug}.md`, `architecture.md`, etc.) em vez de poluir o PRD

## Por que isso importa

O PRD é o contrato de produto. Se múltiplos agentes sobrescrevem seções arbitrariamente, o documento perde rastreabilidade — não é possível saber quem decidiu o quê, e reversões se tornam impossíveis.
