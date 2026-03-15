# Documentação AIOSON (Português)

Bem-vindo à documentação em português do AIOSON — um framework leve de agentes de IA para projetos de software.

## Guias

| Documento | Descrição |
|---|---|
| [Início Rápido](./inicio-rapido.md) | Instale, configure e comece em menos de 10 minutos |
| [Comandos CLI](./comandos-cli.md) | Referência em português dos comandos do `aioson`, com descrição, exemplos e usos práticos |
| [Cenários de Uso](./cenarios.md) | Exemplos completos e práticos para projetos MICRO, SMALL e MEDIUM |
| [Guia de Agentes](./agentes.md) | Quando usar cada agente e o que ele entrega |
| [Squad e Genoma](./squad-genoma.md) | Como criar squads modulares, diferenciar skill de genoma, aplicar genomas e publicar entregáveis HTML |
| [Suporte Web3](./web3.md) | Guia para projetos dApp (Ethereum, Solana, Cardano) |

## Documentação em inglês

Para referências técnicas completas, consulte `docs/en/`:
- [i18n](../en/i18n.md) — Localização e packs de idioma
- [Orquestração paralela](../en/parallel.md) — Para projetos MEDIUM com múltiplas lanes
- [Integração MCP](../en/mcp.md) — Model Context Protocol
- [Schemas JSON](../en/json-schemas.md) — Contratos de saída machine-readable
- [Web3 (EN)](../en/web3.md) — Referência técnica de suporte Web3

## Início rápido em 3 comandos

```bash
# 1. Instalar em um projeto existente
npx @jaimevalasek/aioson install

# 2. Configurar contexto do projeto
npx @jaimevalasek/aioson setup:context

# 3. Verificar saúde
npx @jaimevalasek/aioson doctor
```

Depois, abra seu AI IDE e digite `/setup` para começar.

Fluxo recomendado:
- `@setup` primeiro
- em projeto existente sem documentação, rode `scan:project --folder=src` ou `scan:project --folder=app` para gerar `scan-index.md`, `scan-folders.md`, `scan-<pasta>.md` e `scan-aioson.md`; adicione `--with-llm` se quiser `discovery.md` e `skeleton-system.md`
- `@discovery-design-doc` quando o escopo ainda estiver vago ou a feature for grande
- `@analyst` / `@architect` / `@dev` conforme a clareza e o tipo do trabalho

Esse passo de `discovery-design-doc` e recomendado, nao obrigatorio.
