# Documentação AIOSON (Português)

Bem-vindo à documentação em português do AIOSON — um framework leve de agentes de IA para projetos de software.

## Guias

| Documento | Descrição |
|---|---|
| [Início Rápido](./inicio-rapido.md) | Instale, configure e comece em menos de 10 minutos |
| [Comandos CLI](./comandos-cli.md) | Referência em português dos comandos do `aioson`, com descrição, exemplos e usos práticos |
| [Memória e Contexto](./memoria-contexto.md) | Guia prático dos arquivos de memória, descoberta, índices e pacotes mínimos de contexto |
| [Deyvin](./deyvin.md) | Guia do agente de continuidade e pair programming do AIOSON |
| [Cenários de Uso](./cenarios.md) | Exemplos completos e práticos para projetos MICRO, SMALL e MEDIUM |
| [Guia de Agentes](./agentes.md) | Quando usar cada agente e o que ele entrega |
| [Squad e Genome](./squad-genome.md) | Como criar squads modulares, diferenciar skill de genome, aplicar genomes e publicar entregáveis HTML |
| [Agentes Customizados](./agentes-customizados.md) | Criar agentes personalizados com `squad:agent-create` — tipos, Voice DNA, infra operacional, maturity scoring |
| [Skills](./skills.md) | Sistema de skills: tipos, instalação, mapeamento por framework e compatibilidade cross-tool |
| [Automação de Squads](./automacao-squads.md) | Transformar processos de squad em scripts executáveis (Python/Node.js) que rodam sem LLM |
| [Output Strategy e Delivery](./output-strategy-delivery.md) | Configurar webhooks, automatizar entrega de conteúdo, monitorar delivery e troubleshoot |
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
- em projeto existente sem documentação, rode `scan:project --folder=src` ou `scan:project --folder=app` para gerar `scan-index.md`, `scan-folders.md`, `scan-<pasta>.md`, `scan-aioson.md`, `memory-index.md` e `module-<pasta>.md`
- se existir `spec.md`, o scan local também deriva `spec-current.md` e `spec-history.md`
- depois rode novamente com `--with-llm` para gerar ou atualizar `discovery.md` e `skeleton-system.md`
- quando quiser mandar só o contexto mínimo para uma tarefa, use `context:pack`
- quando quiser entender como o `@deyvin` trabalha, leia [Deyvin](./deyvin.md)
- quando quiser continuar uma sessao, corrigir um recorte pequeno ou trabalhar em modo companheiro tecnico, use `@deyvin`
- `@discovery-design-doc` quando o escopo ainda estiver vago ou a feature for grande
- `@analyst` / `@architect` / `@dev` conforme a clareza e o tipo do trabalho

Esse passo de `discovery-design-doc` e recomendado, nao obrigatorio.

## Brownfield sem duvida

Se voce instalou o AIOSON num projeto que ja existe, este e o fluxo inicial mais seguro:

```bash
# 1. Instale/atualize o AIOSON no repositorio
npx @jaimevalasek/aioson install

# 2. Gere o contexto principal
npx @jaimevalasek/aioson setup:context --defaults

# 3. Gere os mapas locais do codigo
npx @jaimevalasek/aioson scan:project . --folder=src,app

# 4. Gere ou atualize a memoria brownfield consolidada com LLM
npx @jaimevalasek/aioson scan:project . --folder=src,app --with-llm --provider=openai

# 5. Monte um pacote minimo de contexto para a tarefa atual
npx @jaimevalasek/aioson context:pack . --agent=dev --goal="ajustar captions do editor" --module=src
```

O que cada etapa entrega:

- `scan:project` sem `--with-llm`: gera `scan-index.md`, `scan-folders.md`, `scan-<pasta>.md`, `scan-aioson.md`, `memory-index.md`, `module-<pasta>.md` e, quando houver `spec.md`, também `spec-current.md` + `spec-history.md`
- `scan:project` com `--with-llm`: gera ou atualiza `discovery.md` e `skeleton-system.md`
- `scan:project` nunca gera `architecture.md`; esse arquivo vem depois com `@architect`
- `context:pack`: gera `.aioson/context/context-pack.md` com o pacote mínimo recomendado para a tarefa atual

Sem API LLM no `aioson`, ainda existe um caminho valido:

- rode `scan:project . --folder=...` para gerar os mapas locais
- rode `context:pack` se quiser entregar menos contexto e gastar menos tokens
- abra Codex, Claude Code, Gemini CLI ou outro cliente de IA
- ative `@analyst`
- o `@analyst` pode usar `scan-index.md`, `scan-folders.md`, `scan-<pasta>.md` e `scan-aioson.md` para escrever `discovery.md`
- se o cliente permitir escolher modelo, prefira um modelo rapido/barato nessa etapa

Fluxo recomendado depois do scanner em projeto SMALL brownfield:

- `@analyst` para consolidar ou revisar a descoberta do sistema e do escopo atual
- `@architect` para transformar essa descoberta em `architecture.md`
- `@dev` somente depois da memoria estar pronta

Regra importante sobre atualizacao:

- `scan:project --with-llm` usa `merge` por padrao quando `discovery.md` ou `skeleton-system.md` ja existem
- antes de sobrescrever, ele cria backup automatico em `.aioson/backups/`
- se voce quiser regenerar do zero, use `--context-mode=rewrite`
