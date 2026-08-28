---
title: "Design Governance — Code Organization Rules"
scope: "project"
agents: []
updated: "2026-04-12"
---

# Design Doc — Code Organization

> Este arquivo define as regras de organização de código para este projeto.
> É carregado obrigatoriamente por `@dev` e `@deyvin` antes de qualquer implementação.
> É gerado/atualizado por `@discovery-design-doc` durante o gate pré-dev.
> Agentes podem enriquecer este arquivo com padrões descobertos durante implementação — nunca remover seções.

---

## Organização de pastas

**Princípio:** estrutura hierárquica semântica — cada pasta representa uma responsabilidade, não uma coleção aleatória de arquivos.

**Regras:**
- Máximo 3 níveis de profundidade antes de reavaliar a estrutura. Se precisar de mais, a responsabilidade provavelmente deve ser um módulo separado.
- Singular para entidade única ou responsabilidade específica: `command/`, `service/`, `handler/`, `util/`
- Plural para coleções de itens do mesmo tipo: `commands/`, `services/`, `handlers/`, `utils/`
- Kebab-case para todos os nomes de pasta: `squad-dashboard/`, `context-cache/`, `runner/`
- Nunca misturar estilos dentro de um mesmo nível de diretório

**Padrão de agrupamento:**
```
src/
  commands/       ← todos os handlers de CLI (um arquivo por comando)
  lib/            ← lógica reutilizável sem dependência de CLI
    {domínio}/    ← agrupado por domínio (genomes/, squads/, store/)
  squad/          ← lógica específica do sistema de squads
  runner/         ← lógica de execução de planos
  i18n/           ← internacionalização
    messages/     ← arquivos de tradução por locale
```

**Evitar:**
- Pastas genéricas como `misc/`, `stuff/`, `temp/`, `old/`
- Arquivos soltos na raiz de `src/` que pertencem a um domínio específico
- Uma pasta com um único arquivo (exceto `index.js` de módulo público)

---

## Componentização

**Quando extrair um componente ou módulo separado:**
- A lógica aparece em 2+ lugares diferentes → extrair para `lib/` ou utilitário compartilhado
- O arquivo está se aproximando de 300 linhas de lógica pura (excluindo comentários e linhas em branco)
- A responsabilidade pode ser descrita em uma frase curta e distinta
- O código pode ser testado de forma independente

**Quando manter inline:**
- Lógica usada em único lugar e com menos de ~50 linhas
- Abstração prematura sem segundo uso confirmado
- Extração criaria um arquivo de uma única função trivial

**Responsabilidade única:**
- Um arquivo = uma responsabilidade principal
- Funções auxiliares de suporte à responsabilidade principal podem coexistir no mesmo arquivo
- Funções auxiliares usadas em 2+ arquivos → mover para `utils.js` ou módulo dedicado

---

## Reuso

**Antes de criar qualquer arquivo novo:**
1. Verificar se `src/utils.js` já resolve o problema
2. Verificar se existe módulo em `src/lib/` com responsabilidade próxima
3. Verificar se o padrão existe em algum `src/commands/*.js` similar

**Hierarquia de reuso:**
1. Função utilitária existente em `src/utils.js`
2. Módulo de lib em `src/lib/{domínio}/`
3. Helper local no próprio arquivo (se uso único)
4. Novo arquivo somente se nenhuma das opções acima servir

**Composição sobre duplicação:**
- Nunca copiar-colar blocos de código entre arquivos — extrair para função nomeada
- Se dois comandos CLI têm lógica similar, o ponto comum vai para `src/lib/`
- Se dois arquivos importam a mesma sequência de dependências, criar uma factory ou inicializador

---

## Tamanho de arquivo

**Guideline:**
- **< 300 linhas** — ideal. Arquivo focado e coeso.
- **300–500 linhas** — aceitável. Monitorar crescimento.
- **> 500 linhas** — ⚠ alerta. `@dev` e `@deyvin` devem propor split antes de continuar.

**Protocolo de alerta (implementado por @dev e @deyvin):**
Ao estimar que um arquivo resultante terá mais de 500 linhas:
1. Emitir alerta com estimativa
2. Listar 2–3 alternativas concretas de extração ou componentização
3. Aguardar confirmação antes de continuar (`@dev`) ou prosseguir após 1 turno sem resposta (`@deyvin` pair mode)

**O alerta nunca é bloqueante** — é uma pausa para pensar, não um impedimento.

**Estratégias de split comuns:**
- Extrair funções de validação para `validate-{domínio}.js`
- Extrair helpers de formatação para `format-{domínio}.js`
- Separar lógica de leitura/escrita de arquivo em módulo de I/O
- Quebrar comando CLI grande em command handler + business logic em `lib/`

**Exceções documentadas:** arquivos de mensagens i18n, fixtures de teste e arquivos gerados automaticamente não contam para o guideline.

---

## Nomeclatura

**Arquivos:**
- kebab-case para todos os arquivos: `squad-dashboard.js`, `context-writer.js`
- Prefixo de domínio quando dentro de pasta flat: `squad-plan.js`, `squad-status.js` (dentro de `commands/`)
- Sem sufixos genéricos como `helper`, `manager`, `handler` quando o nome do domínio já é claro

**Por camada:**
| Camada | Convenção | Exemplo |
|--------|-----------|---------|
| CLI commands | `{namespace}-{action}.js` | `squad-deploy.js`, `workflow-next.js` |
| Lib / domain logic | `{responsabilidade}.js` | `context-compactor.js`, `learning-extractor.js` |
| Utils compartilhados | `{tipo}-{domínio}.js` ou `utils.js` | `genome-format.js`, `utils.js` |
| Entry points de módulo | `index.js` | `src/i18n/index.js` |
| Configuração | `{nome}.config.js` ou `constants.js` | `constants.js` |

**Variáveis e funções (JavaScript):**
- camelCase: `contextPackage`, `featureSlug`, `runtimeStore`
- Constantes globais: SCREAMING_SNAKE_CASE — `MAX_RETRIES`, `DEFAULT_TIMEOUT`
- Funções: verbo + substantivo — `loadContext()`, `parseManifest()`, `emitEvent()`
- Booleanos: prefixo `is`, `has`, `should` — `isReady`, `hasErrors`, `shouldRetry`

**Banco de dados (SQLite):**
- snake_case para tabelas e colunas: `agent_runs`, `session_key`, `started_at`
- Tabelas no plural: `agent_runs`, `runtime_logs`
