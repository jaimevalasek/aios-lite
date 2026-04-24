# Governança de Design Docs

> Sistema modular de governança de código introduzido na v1.7.3+. Substitui a abordagem monolítica de um único `design-doc.md` por um diretório de regras duras que os agentes aplicam automaticamente.

## O que mudou?

Antes da v1.7.3, a governança de código dependia de um único arquivo `design-doc.md` gerado pelo `@discovery-design-doc`. Se esse arquivo não existisse, os agentes não tinham regras estruturais para seguir.

Agora, o AIOSON distribui **5 arquivos de best-practice** em `.aioson/design-docs/` durante o `install`/`init`:

| Arquivo | O que governa |
|---|---|
| `folder-structure.md` | Estrutura de pastas canônica por tipo de projeto |
| `componentization.md` | Quando e como quebrar em componentes/módulos |
| `code-reuse.md` | Regras de DRY, abstração e quando não abstrair |
| `naming.md` | Convenções de nomenclatura (arquivos, funções, classes, variáveis) |
| `file-size.md` | Limites de tamanho de arquivo e quando dividir |

## Como funciona

1. **Instalação automática**: ao rodar `aioson install` ou `aioson init`, os 5 arquivos são copiados para `.aioson/design-docs/`.
2. **Carregamento incondicional**: `@dev` e `@deyvin` carregam **todos** os `.aioson/design-docs/*.md` em toda sessão, independentemente da classificação do projeto ou de ter rodado `@discovery-design-doc`.
3. **Hard constraints**: esses arquivos são tratados como restrições duras — o agente deve segui-las, não sugerir ignorá-las.
4. **Extensível**: você pode adicionar novos arquivos `.md` em `.aioson/design-docs/` e os agentes os carregarão automaticamente.

## Diferença entre governança, design-doc e PRD

| Artefato | Propósito | Quem cria | Quando muda |
|---|---|---|---|
| **PRD** (`prd.md`) | Visão, escopo, usuários, métricas | `@product` | Quando o produto evolui |
| **design-doc** (`design-doc.md`) | Decisões de escopo, módulos, riscos, readiness | `@discovery-design-doc` | Por feature ou refactoring grande |
| **Governança** (`.aioson/design-docs/*.md`) | Regras estruturais duras que aplicam-se a todo código | Distribuído pelo framework | Quando o time decide mudar convenções |

> **Regra de ouro**: O PRD diz *o quê* construir. O design-doc diz *como* organizar a entrega. A governança diz *como* o código deve ser estruturado para ser mantido.

## Customizando as regras

Edite qualquer arquivo em `.aioson/design-docs/` para adaptar às convenções do seu time:

```bash
# Exemplo: ajustar limite de tamanho de arquivo
aioson sandbox:exec . -- cat .aioson/design-docs/file-size.md

# Editar
code .aioson/design-docs/naming.md
```

Depois de editar, os agentes passam a usar suas convenções em vez das defaults.

## Para projetos existentes

Se você instalou o AIOSON antes da v1.7.3, rode:

```bash
aioson doctor . --fix
```

O doctor detectará se `.aioson/design-docs/` está faltando e copiará os arquivos padrão.
