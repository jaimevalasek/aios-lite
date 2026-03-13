# Comandos do CLI

> Referência em português para os comandos públicos do `aios-forge`.

## Antes de começar

- Você pode usar `aios-forge` ou o alias curto `aios`.
- Quando o comando aceita `[path]`, omitir esse argumento significa usar o diretório atual.
- Muitos comandos aceitam `--json` para integração com scripts e CI.
- Os comandos `parallel:*` também aceitam os aliases `orchestrator:*`.
- Nesta página usei a forma canônica com `:` para evitar duplicação.
- O dashboard do AIOS Forge não é mais instalado por este CLI. Para usar o painel, abra o app do dashboard já instalado no computador e selecione a pasta do projeto que contém `.aios-forge/`.

---

## Mapa completo dos comandos

### Base do projeto

| Comando | O que faz | Quando usar |
|---|---|---|
| `init` | Cria um projeto novo e instala o template do AIOS Forge | Quando você vai começar do zero |
| `install` | Instala o AIOS Forge em um projeto já existente | Quando o repositório já existe |
| `update` | Atualiza apenas os arquivos gerenciados pelo framework | Quando você quer puxar melhorias da versão atual |
| `info` | Mostra versão, diretório-alvo, status da instalação e framework detectado | Quando quer inspecionar rapidamente um projeto |
| `version` / `--version` / `-v` | Mostra a versão atual do CLI | Quando quer validar a versão instalada |
| `doctor` | Verifica a saúde da instalação e pode restaurar arquivos faltantes | Quando algo parece quebrado ou incompleto |
| `config` | Lê e grava configurações globais do CLI | Quando quer persistir defaults e preferências do ambiente |

### Contexto e idioma

| Comando | O que faz | Quando usar |
|---|---|---|
| `setup:context` | Cria ou atualiza `.aios-forge/context/project.context.md` | Logo após instalar o framework |
| `context:validate` | Valida o `project.context.md` | Depois de editar o contexto manualmente |
| `locale:apply` | Reaplica um pack de idioma nos agentes gerenciados pelo AIOS Forge | Quando quer trocar o idioma em que os agentes do framework operam no projeto |
| `locale:diff` | Compara um agente com o pack de idioma esperado | Quando quer detectar drift de tradução |
| `i18n:add` | Gera o scaffold de um novo locale do próprio AIOS Forge | Quando vai adicionar outro idioma oficial ao CLI do framework |

### Agentes, fluxo e testes

| Comando | O que faz | Quando usar |
|---|---|---|
| `agents` | Lista agentes registrados, paths, dependências e outputs | Quando quer entender o arsenal ativo |
| `agent:prompt` | Gera o prompt pronto para ativar um agente em outro cliente de IA | Quando o cliente não suporta slash command |
| `workflow:plan` | Sugere o fluxo de agentes adequado ao porte do projeto | Quando quer decidir a ordem de execução |
| `test:agents` | Valida contratos e arquivos críticos dos agentes | Quando mexeu no sistema de agentes |
| `test:smoke` | Roda um smoke test em workspace temporário | Quando quer validar o pacote de forma ampla |
| `test:package` | Testa o pacote instalado a partir de uma origem local | Quando vai validar release ou empacotamento |
| `scan:project` | Faz varredura brownfield e gera contexto inicial | Quando o projeto já existe e falta documentação |

### Orquestração paralela

| Comando | O que faz | Quando usar |
|---|---|---|
| `parallel:init` | Cria a estrutura de lanes paralelas para projetos MEDIUM | Antes de acionar o `@orchestrator` |
| `parallel:doctor` | Verifica e repara arquivos de paralelismo | Quando faltam lanes ou arquivos de coordenação |
| `parallel:assign` | Distribui escopo entre as lanes | Quando quer dividir trabalho entre agentes |
| `parallel:status` | Consolida o estado de todas as lanes | Quando quer visão central do andamento |

### MCP

| Comando | O que faz | Quando usar |
|---|---|---|
| `mcp:init` | Gera configuração inicial de MCP para a ferramenta escolhida | Quando vai conectar ferramentas externas por MCP |
| `mcp:doctor` | Valida a configuração MCP do projeto | Quando o MCP não está sendo reconhecido |

### QA de navegador

| Comando | O que faz | Quando usar |
|---|---|---|
| `qa:doctor` | Verifica pré-requisitos de Browser QA | Antes da primeira execução de QA |
| `qa:init` | Gera `aios-qa.config.json` a partir do contexto e PRD | Quando vai inicializar o fluxo de QA |
| `qa:run` | Executa testes browser guiados por personas | Quando quer validar fluxos reais da aplicação |
| `qa:scan` | Faz crawl automático do app e procura riscos | Quando quer inspeção ampla de rotas |
| `qa:report` | Reexibe ou exporta o último relatório | Quando quer consultar ou regenerar o relatório |

### Genomas e squads

| Comando | O que faz | Quando usar |
|---|---|---|
| `genome:doctor` | Valida um arquivo de genoma | Quando quer checar integridade de um genoma |
| `genome:migrate` | Migra genomas para o formato novo | Quando está atualizando genomas legados |
| `squad:status` | Mostra visão geral das squads instaladas | Quando quer saber o estado atual das squads |
| `squad:doctor` | Diagnostica saúde operacional das squads | Quando suspeita de drift, staleness ou artefatos faltando |
| `squad:repair-genomes` | Corrige referências de genomas em manifesto de squad | Quando um manifesto aponta bindings quebrados |
| `squad:validate` | Valida a estrutura e o manifesto de uma squad específica | Antes de exportar ou publicar |
| `squad:export` | Exporta uma squad local para snapshot/entrega | Quando quer empacotar a squad |
| `squad:pipeline` | Lista, inspeciona ou acompanha pipelines declarados na squad | Quando a squad define pipelines reutilizáveis |

### Runtime

| Comando | O que faz | Quando usar |
|---|---|---|
| `runtime:init` | Inicializa o banco SQLite de runtime | Antes de rastrear runs e entregas |
| `runtime:ingest` | Indexa artefatos de `output/` no runtime | Quando quer levar entregas para o viewer/status |
| `runtime:task:start` | Abre uma task no runtime | Quando uma sessão ou objetivo começa |
| `runtime:start` | Inicia uma execução de agente | Quando um agente começa a trabalhar |
| `runtime:update` | Registra progresso em uma execução | Durante a execução do agente |
| `runtime:task:finish` | Marca task como concluída | Quando a task acabou com sucesso |
| `runtime:finish` | Finaliza uma execução com sucesso | Quando a run terminou |
| `runtime:task:fail` | Marca task como falha | Quando a task falhou |
| `runtime:fail` | Finaliza uma execução com falha | Quando a run falhou |
| `runtime:status` | Mostra snapshot do runtime | Quando quer uma visão atual das runs |
| `runtime:log` | Logger stateful de uma linha para agentes oficiais | Quando quer registrar eventos sem orquestrar vários comandos |

### Cloud

| Comando | O que faz | Quando usar |
|---|---|---|
| `cloud:import:squad` | Importa snapshot remoto de squad para o projeto | Quando vai instalar ou sincronizar uma squad publicada |
| `cloud:import:genome` | Importa snapshot remoto de genoma | Quando quer trazer um genoma publicado |
| `cloud:publish:squad` | Publica snapshot de uma squad local | Quando quer distribuir uma squad para outro projeto ou catálogo |
| `cloud:publish:genome` | Publica snapshot de um genoma local | Quando quer versionar e compartilhar um genoma |

---

## Exemplos e usos práticos

### 1. Começar um projeto novo

```bash
aios-forge init meu-saas --lang=pt-BR --tool=codex
cd meu-saas
aios-forge setup:context
aios-forge doctor
```

Use esse fluxo quando o projeto ainda não existe e você quer sair com template, contexto e checagem básica já prontos.

### 2. Instalar em um projeto existente

```bash
cd meu-legado
aios-forge install . --lang=pt-BR
aios-forge info .
aios-forge workflow:plan .
```

Use esse fluxo quando o código já existe e você quer colocar o AIOS Forge sem recriar o projeto.

### 3. Atualizar sem perder contexto

```bash
aios-forge update .
aios-forge doctor . --fix
```

Use depois de atualizar a versão do pacote. O `update` mexe só nos arquivos gerenciados e o `doctor --fix` recoloca o que estiver faltando.

### 4. Ver e ajustar configurações globais

```bash
aios-forge config show
aios-forge config get preferred_scan_provider
aios-forge config set preferred_scan_provider=openai
```

Use quando você quer persistir defaults e preferências globais do CLI.

### 5. Validar versão e diagnóstico rápido

```bash
aios-forge --version
aios-forge info .
aios-forge doctor . --json
```

Use para troubleshooting rápido, CI e automações.

### 6. Criar ou corrigir o contexto do projeto

```bash
aios-forge setup:context --defaults --framework="Laravel" --backend="PHP" --database="MySQL" --lang=pt-BR
aios-forge context:validate .
```

Use quando o projeto já está claro e você quer gerar o contexto sem passar pelo wizard interativo.

### 7. Trocar idioma do projeto

```bash
aios-forge locale:apply . --lang=pt-BR
aios-forge locale:diff ux-ui --lang=pt-BR
```

- `locale:apply` muda o idioma dos agentes do AIOS Forge
- ou seja: muda o idioma em que o framework espera que os agentes conversem e trabalhem no projeto

Pense assim:

- `--locale=pt-BR` = idioma do **menu/comando do AIOS Forge**
- `locale:apply --lang=pt-BR` = idioma do **agente do AIOS Forge**
- i18n do app do cliente = idioma do **produto final do usuário**

Exemplo:

- se você usar `--locale=pt-BR`, o CLI mostra mensagens em português
- se você usar `locale:apply --lang=pt-BR`, os agentes do AIOS Forge passam a operar em português
- isso **não** traduz o site, sistema ou app do cliente

Em uma frase:

> `locale:apply` troca o idioma do **AIOS Forge dentro do projeto**, não o idioma do **produto do cliente**.

Use `locale:diff` para checar se algum agente ficou diferente do pack de idioma esperado.

### 8. Adicionar um novo locale ao próprio AIOS Forge

```bash
aios-forge i18n:add fr --dry-run
aios-forge i18n:add fr
```

- `i18n:add` **não** adiciona idiomas ao app do cliente
- `i18n:add` adiciona um idioma novo ao **próprio AIOS Forge**

Pense assim:

- o AIOS Forge é a “ferramenta”
- o projeto do cliente é a “coisa que você está construindo”
- esse comando mexe na **ferramenta**
- esse comando não mexe na **coisa construída**

Hoje esse comando cria a base de um arquivo de idioma do CLI em:

```text
src/i18n/messages/<locale>.js
```

Então ele serve para coisas como:

- traduzir mensagens do CLI do AIOS Forge
- ajudar o framework a falar outro idioma
- expandir o próprio AIOS Forge

Ele não serve para:
- adicionar i18n ao app do usuário
- criar feature multilíngue no projeto do cliente
- traduzir automaticamente telas, textos ou rotas do produto final

Resumo sem dúvida:

- quer mudar o idioma do **CLI**? use `--locale`
- quer mudar o idioma dos **agentes do AIOS Forge**? use `locale:apply`
- quer adicionar um idioma novo ao **próprio AIOS Forge**? use `i18n:add`
- quer deixar o **app do cliente** multilíngue? isso é trabalho do projeto, não do `i18n:add`

### 9. Inspecionar agentes e gerar prompt pronto

```bash
aios-forge agents . --lang=pt-BR
aios-forge agent:prompt architect . --tool=codex
```

Use `agents` para ver quem existe e `agent:prompt` quando o cliente de IA não entende `/setup`, `@dev` ou slash commands.

### 10. Validar agentes e pacote antes de release

```bash
aios-forge test:agents
aios-forge test:smoke /tmp --lang=pt-BR --profile=standard
aios-forge test:package . --dry-run
```

Use quando você alterou templates, agentes, contratos ou empacotamento e quer uma validação mais segura antes de publicar.

### 11. Fazer scanner brownfield

```bash
aios-forge scan:project . --provider=openai
aios-forge scan:project . --dry-run
```

Use em sistemas legados ou repositórios que ainda não têm `discovery.md` e `skeleton-system.md`.

### 12. Preparar orquestração paralela

```bash
aios-forge parallel:init . --workers=3
aios-forge parallel:assign . --source=architecture --workers=3
aios-forge parallel:status .
aios-forge parallel:doctor . --fix
```

Use em projetos `MEDIUM` quando o `@orchestrator` vai dividir trabalho em lanes.  
Alias equivalentes:
- `orchestrator:init`
- `orchestrator:assign`
- `orchestrator:status`
- `orchestrator:doctor`

### 13. Inicializar e diagnosticar MCP

```bash
aios-forge mcp:init . --tool=codex
aios-forge mcp:doctor . --strict-env
```

Use quando você quer preparar integrações MCP e confirmar se as variáveis e arquivos estão corretos.

### 14. Rodar Browser QA

```bash
aios-forge qa:init . --url=http://localhost:8000
aios-forge qa:doctor .
aios-forge qa:run . --persona=power --html
aios-forge qa:scan . --depth=2 --max-pages=20 --html
aios-forge qa:report . --html
```

Use:
- `qa:init` para gerar a configuração
- `qa:doctor` para validar ambiente
- `qa:run` para um teste guiado por personas
- `qa:scan` para cobertura mais ampla de rotas
- `qa:report` para rever o último relatório sem rodar tudo de novo

### 15. Abrir o dashboard do AIOS Forge

O dashboard agora é instalado separadamente do CLI.

Use este fluxo:
- abra o app do dashboard já instalado no computador
- clique em criar projeto ou adicionar projeto
- selecione a pasta do projeto que já contém `.aios-forge/`

Use isso quando quiser um painel local para acompanhar squads, runtime e entregas do projeto.

### 16. Validar e migrar genomas

```bash
aios-forge genome:doctor .aios-forge/genomas/fintech.md
aios-forge genome:migrate .aios-forge/genomas --write
```

Use `genome:doctor` para validar um arquivo individual e `genome:migrate` para atualizar um conjunto legado para o formato novo.

### 17. Operar squads locais

```bash
aios-forge squad:status .
aios-forge squad:doctor . --squad=marketing
aios-forge squad:validate . --squad=marketing
aios-forge squad:export . --squad=marketing
aios-forge squad:pipeline . --sub=list
aios-forge squad:pipeline . --sub=show --pipeline=conteudo-semanal
aios-forge squad:pipeline . --sub=status --pipeline=conteudo-semanal
```

Use:
- `squad:status` para visão geral
- `squad:doctor` para detectar problemas operacionais
- `squad:validate` antes de exportar ou publicar
- `squad:export` para empacotar a squad
- `squad:pipeline` para inspecionar pipelines definidos dentro da squad

### 18. Reparar bindings de genoma em squads

```bash
aios-forge squad:repair-genomes .aios-forge/squads/marketing/squad.manifest.json --write
```

Use quando o manifesto da squad perdeu referências corretas para genomas ou ficou incompatível com a estrutura atual.

### 19. Inicializar o runtime e indexar entregas

```bash
aios-forge runtime:init .
aios-forge runtime:ingest . --squad=marketing
aios-forge runtime:status .
```

Use para preparar o SQLite de runtime e puxar arquivos de `output/` para o índice consultável.

### 20. Rastrear uma task e uma execução completas

```bash
aios-forge runtime:task:start . --task=task-001 --title="Landing page do produto" --squad=marketing --by=orchestrator
aios-forge runtime:start . --run=run-001 --task=task-001 --agent=ux-ui --title="Criacao da UI"
aios-forge runtime:update . --run=run-001 --message="Hero e secoes principais definidos"
aios-forge runtime:finish . --run=run-001 --summary="UI pronta para handoff" --output=output/marketing/landing/index.html
aios-forge runtime:task:finish . --task=task-001 --goal="Landing entregue"
```

Use esse fluxo quando você quer rastreamento explícito de task, run, progresso e artefatos finais.

### 21. Registrar eventos rápidos com `runtime:log`

```bash
aios-forge runtime:log . --agent=ux-ui --message="Comecei a revisar a landing"
aios-forge runtime:log . --agent=ux-ui --message="Entreguei a UI final" --finish --status=completed --summary="Tela pronta"
```

Use quando quer um logger stateful de uma linha, sem precisar chamar manualmente `task:start`, `start`, `update` e `finish`.

### 22. Fechar falhas de task ou run

```bash
aios-forge runtime:task:fail . --task=task-001 --goal="Bloqueio em requisitos"
aios-forge runtime:fail . --run=run-001 --message="Dependencia externa indisponivel" --summary="Execucao interrompida"
```

Use quando a task ou a run precisa ser encerrada como falha, mantendo histórico no runtime.

### 23. Publicar squads e genomas

```bash
aios-forge cloud:publish:squad . --slug=marketing --resource-version=1.0.0 --base-url=https://aiosforge.com
aios-forge cloud:publish:genome . --slug=fintech --resource-version=1.0.0 --base-url=https://aiosforge.com
```

Use quando você quer transformar artefatos locais em snapshots publicáveis e versionados.

### 24. Importar squads e genomas publicados

```bash
aios-forge cloud:import:squad . --url=https://aiosforge.com/snapshots/squads/marketing/1.0.0.json
aios-forge cloud:import:genome . --url=https://aiosforge.com/snapshots/genomes/fintech/1.0.0.json
```

Use quando vai instalar, atualizar ou sincronizar recursos publicados em outro projeto.

---

## Atalhos úteis

```bash
aios-forge --help --locale=pt-BR
aios-forge agents --json
aios-forge runtime:status --json
aios-forge qa:report --json
```

Esses atalhos ajudam quando você quer explorar o CLI, integrar com scripts ou depurar estado sem depender de saída humana.
