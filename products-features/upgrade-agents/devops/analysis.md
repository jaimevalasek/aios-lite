# Analysis — AIOX devops transformed into an AIOSON-native DevOps agent

> Data: 2026-03-21
> Escopo: analisar o agente `devops` do AIOX e propor como ele deveria ser redesenhado para funcionar como se tivesse sido concebido nativamente para o AIOSON

---

## 1. Resumo executivo

O `AIOX devops` e um agente forte, mas ele nasce com uma identidade muito especifica:

- GitHub-first
- PR-first
- quality-gate-before-push
- CodeRabbit-centric
- story/status-driven
- CI/CD de repositório tradicional

Se copiar isso para o AIOSON quase sem mexer, o resultado ficaria deslocado.

O AIOSON tem outra natureza:

- local-first
- workflow por artefatos de contexto
- runtime SQLite
- squads e genomes como pacotes operacionais
- cloud publish/import nativos
- delivery runner e webhooks
- dashboard e sync de runtime
- possibilidade futura de runner remoto/local

### Leitura mais importante

O `AIOX devops` não deveria virar no AIOSON apenas um “agente que dá push no GitHub”.

No AIOSON, o papel certo seria algo mais amplo e mais alinhado ao ecossistema:

- **release manager** do projeto
- **runtime/cloud operator**
- **package publisher** para squads e genomes
- **delivery operator** para webhooks e output strategy
- **deployment profile keeper** com base em `project.context.md`
- **bridge** entre `@dev`, `@qa`, runtime, dashboard, cloud e publicação operacional

Em outras palavras:

- no AIOX, `devops` = repository guardian + GitHub operations
- no AIOSON nativo, `@devops` deveria ser = **delivery / release / runtime / cloud operator**

---

## 2. Como o AIOX devops funciona

Fonte principal usada:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/devops.md

Quando alguma conclusão abaixo depende de tasks, utils e workflows citados pelo arquivo principal, isso deve ser lido como **inferencia baseada na fonte**.

### 2.1. O centro do agente e o repositorio remoto

O AIOX devops se define como:

- GitHub Repository Manager
- Release Manager
- guardian da integridade do repositorio
- unico agente autorizado a `git push`

Isso deixa claro que seu centro operacional e o remote repository.

### 2.2. O escopo principal e GitHub + CI/CD + releases

O arquivo cobre explicitamente:

- push para remote
- create PR
- semantic versioning
- release management
- changelog
- branch cleanup
- CI/CD com GitHub Actions
- quality gates pre-push
- triage de issues
- setup de GitHub e branch protection

Esse escopo e legitimo, mas muito preso ao modelo de repositório tradicional.

### 2.3. O agente tem command UX forte

Entre os comandos expostos:

- `*version-check`
- `*pre-push`
- `*push`
- `*create-pr`
- `*configure-ci`
- `*release`
- `*cleanup`
- `*triage-issues`
- `*resolve-issue`
- `*setup-github`
- `*health-check`
- `*sync-registry`
- `*create-worktree`
- `*merge-worktree`
- `*search-mcp`
- `*add-mcp`

Isso da ao agente uma superficie muito operacional.

### 2.4. O AIOX devops e quality-gate heavy

O arquivo define gates como:

- CodeRabbit sem issues criticas
- lint
- tests
- typecheck
- build
- story status correto
- sem mudancas pendentes
- sem merge conflict

Isso reforca o papel de guardiao de release.

### 2.5. Ele e repo-governance first, nao runtime-first

Mesmo quando cobre health, registry, worktrees e MCP, a logica central ainda orbita:

- repositorio
- PR
- release
- CI/CD
- push

Isso e diferente da natureza do AIOSON.

---

## 3. Por que ele nao encaixa diretamente no AIOSON

## 3.1. O AIOSON nao e GitHub-first

O AIOSON hoje nao tem um agente oficial equivalente focado em:

- PR
- push remoto exclusivo
- branch protection
- GitHub issues
- GitHub Actions como centro da operacao

O framework e mais local-first e tool-agnostic.

## 3.2. O AIOSON tem ativos operacionais que o AIOX devops nao enxerga

No AIOSON ja existem capacidades nativas como:

- `cloud:publish:squad`
- `cloud:publish:genome`
- `cloud:import:squad`
- `cloud:import:genome`
- `runtime:*`
- `deliver`
- output strategies com webhooks e cloud publish
- runtime backup/restore
- dashboard observando runs e entregas
- possibilidade conceitual de cloud runner

Se o agente for apenas “GitHub manager”, ele ignora uma parte enorme do valor do AIOSON.

## 3.3. O AIOSON trabalha mais com estado do projeto do que com story status

O AIOX devops depende muito de status de story e do fluxo de backlog/story.
No AIOSON, o estado forte esta em:

- `project.context.md`
- `prd.md`
- `discovery.md`
- `architecture.md`
- `spec.md`
- `workflow.state.json`
- runtime local
- manifests de squad/genome

O agente nativo precisa ler esse ecossistema, nao tentar impor um centro baseado em story file.

## 3.4. O AIOSON tem package distribution como primeira classe

Squads e genomes podem ser publicados e importados.
Isso faz o papel de DevOps no AIOSON ser mais proximo de:

- empacotar
- validar
- publicar
- distribuir
- sincronizar runtime
- operar delivery

E nao apenas fazer push de codigo.

## 3.5. O AIOSON tem sinais de hosting profile ja no setup

O onboarding do AIOSON ja registra notas como:

- preferencia por VPS
- perfil cloud
- monorepo
- team profile

Entao um `@devops` nativo deveria continuar essa linha, usando o contexto de hospedagem como insumo operacional.

---

## 4. Como deveria ser um `@devops` nativo do AIOSON

## 4.1. Identidade correta do agente

Em vez de:

- GitHub Repository Manager & DevOps Specialist

No AIOSON o papel deveria ser algo como:

- **Delivery, Release & Runtime Operator**
- ou **Project Delivery and Cloud Operations Manager**

A ideia central e:

- operar publicacao
- operar release
- operar runtime/cloud
- operar entrega
- manter saude operacional

## 4.2. Centro de autoridade correto

A autoridade central nao deveria ser “somente eu posso dar push no GitHub”.

Deveria ser algo como:

- somente `@devops` pode publicar squads/genomes no cloud
- somente `@devops` fecha release operacional
- somente `@devops` aprova entrega automatica para webhooks/cloud em producao
- somente `@devops` executa backup/restore/sync de runtime em fluxos formais

Ou seja: **exclusive publish/release authority**, nao necessariamente exclusive git authority.

## 4.3. Modos nativos de operacao

O agente do AIOSON deveria detectar pelo menos 4 modos:

### Modo 1 — Repo release

Para:

- validar estado do repositorio
- rodar gates de release
- gerar release notes
- opcionalmente push/tag/PR

### Modo 2 — Runtime ops

Para:

- inspecionar runtime
- backup
- restore
- prune
- sync de devlogs/runs com cloud

### Modo 3 — Package publish

Para:

- validar squad
- validar genome
- publicar squad/genome
- importar snapshot
- preparar compatibilidade de versoes

### Modo 4 — Delivery ops

Para:

- validar output strategy
- checar webhooks
- disparar `deliver`
- auditar autoPublish/cloudPublish
- diagnosticar falhas de entrega

---

## 5. O que deve ser removido ou enfraquecido do AIOX original

## 5.1. GitHub como dependencia identitaria

No AIOSON isso deve virar detalhe de implementacao, nao definicao do agente.

### Em vez de:
- GitHub Repository Manager

### Preferir:
- operador de release e delivery, podendo usar GitHub/GitLab/Forgejo quando o projeto exigir

## 5.2. Story status como gate principal

No AIOSON, o gate deveria olhar para:

- workflow real do projeto
- estado do runtime
- status de QA
- readiness de release
- validade de package ou output strategy

## 5.3. MCP Docker toolkit como parte central do papel

Isso parece muito especifico do AIOX.
No AIOSON, MCP pode existir, mas nao deveria ser parte identitaria de um `@devops` MVP.

## 5.4. Dependencia excessiva de PR workflow

PR continua util, mas no AIOSON isso seria apenas um subcaso.
O caso nativo e mais amplo: entrega operacional do projeto e dos pacotes AIOSON.

---

## 6. O que deve ser adicionado para virar AIOSON-native

## 6.1. Runtime awareness

O agente precisa entender e operar:

- `runtime:status`
- `runtime:backup`
- `runtime:restore`
- `runtime:prune`
- sync de devlogs/runs para cloud

## 6.2. Cloud/package awareness

O agente precisa dominar:

- `cloud:publish:squad`
- `cloud:publish:genome`
- `cloud:import:squad`
- `cloud:import:genome`
- compatibilidade minima/maxima
- versao de recurso
- versionamento de squad/genome

## 6.3. Delivery awareness

O agente precisa ler e operar:

- output strategy
- webhooks
- `deliver`
- `autoPublish`
- `cloudPublish`
- retry e falhas de entrega

## 6.4. Dashboard/cloud sync awareness

Como o AIOSON ja conversa com dashboard/cloud, o agente deveria saber:

- validar `cloudBaseUrl`
- validar `cloudApiToken`
- sincronizar runtime/devlogs
- diagnosticar falhas de sync

## 6.5. Hosting profile awareness

A partir de `project.context.md` e onboarding notes, o agente deveria ajustar comportamento para:

- VPS
- managed cloud
- monorepo
- team profile

## 6.6. Future runner awareness

Como o ecossistema ja tem a ideia de cloud runner, o `@devops` nativo deveria nascer pronto para evoluir depois para:

- preparar runner local
- validar heartbeat/claim config
- checar capacidade de execucao remota

Mesmo que isso nao entre no MVP.

---

## 7. Proposta concreta de `@devops` para o AIOSON

## 7.1. Missao sugerida

> Operar releases, runtime, delivery e publicacao de pacotes do AIOSON com gates de qualidade e seguranca, sem assumir GitHub como centro do sistema.

## 7.2. Quando usar

- apos `@qa`, quando a mudanca estiver pronta para release
- quando houver necessidade de publicar squad/genome
- quando houver necessidade de delivery operacional
- quando o runtime precisar de backup/restore/sync
- quando o projeto precisar de configuracao de CI/release/deploy

## 7.3. Inputs obrigatorios

- `.aioson/context/project.context.md`
- `.aioson/context/workflow.state.json` quando existir
- `.aioson/context/spec.md` e/ou `spec-{slug}.md` quando relevante
- relatorio de QA quando existir
- `.aioson/install.json` para cloud config
- manifests de squad/genome quando o alvo for package publish
- output strategy quando houver delivery

## 7.4. Outputs sugeridos

- `.aioson/context/release-plan.md`
- `.aioson/context/delivery-report.md`
- `.aioson/context/runtime-ops.md`
- `.aioson/context/package-release.md`

Nao precisa gerar todos sempre.
Cada um entra conforme o modo.

## 7.5. Colaboracao esperada

- `@dev` entrega implementacao
- `@qa` entrega validacao
- `@squad` entrega package structure
- `@orchestrator` entrega estado de paralelismo quando houver
- `@devops` fecha release, publish, backup, delivery e sync operacional

---

## 8. Command pack nativo recomendado

Em vez de copiar os comandos do AIOX, o AIOSON ganharia mais com algo como:

- `@devops pre-release`
- `@devops publish-squad`
- `@devops publish-genome`
- `@devops import-squad`
- `@devops import-genome`
- `@devops runtime-backup`
- `@devops runtime-restore`
- `@devops runtime-sync-cloud`
- `@devops delivery-check`
- `@devops deliver-now`
- `@devops release-notes`
- `@devops ci-check`
- `@devops deploy-profile`
- `@devops health`

Se quiser um segundo nivel depois:

- `@devops runner-prepare`
- `@devops runner-health`

---

## 9. Quality gates corretos para o AIOSON

No AIOSON, os gates deveriam ser reorganizados em camadas.

## 9.1. Release gate

- lint/test/build/typecheck quando existirem
- QA concluido ou sem bloqueios criticos
- workflow pronto para release
- sem conflito ou drift obvio no contexto

## 9.2. Package gate

- `squad:validate` ou `genome:doctor`
- manifesto consistente
- bindings validos
- compatibilidade de versao declarada

## 9.3. Delivery gate

- output strategy valida
- destino configurado
- webhook/cloud target acessivel ou dry-run aprovado
- `autoPublish` coerente com targets

## 9.4. Runtime gate

- runtime inicializado
- backup configurado quando necessario
- cloud config presente quando sync remoto for pedido
- nenhuma falha critica aberta em runs ativas relevantes

---

## 10. Posicao no workflow do AIOSON

O `@devops` nativo nao deveria ser obrigatorio em todo projeto.

Melhor desenho:

- opcional para `MICRO`
- recomendado para `SMALL` com deploy ou delivery real
- forte para `MEDIUM` com release, cloud, runtime ou package publish

Fluxos possiveis:

### Projeto comum
`@setup -> @product -> @analyst -> @architect -> @dev -> @qa -> @devops`

### Projeto com UX + PM + orquestracao
`@setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa -> @devops`

### Publicacao de squad
`@squad -> squad:validate -> @devops publish-squad`

### Publicacao de genome
`genome:doctor -> @devops publish-genome`

### Operacao runtime
`@devops runtime-backup / runtime-sync-cloud`

---

## 11. Melhor transformacao possivel do AIOX devops para o AIOSON

Se a pergunta for literalmente “como transformar esse agente para parecer nativo do AIOSON?”, a resposta e:

### 11.1. Trocar a identidade do agente

De:
- GitHub Repository Guardian

Para:
- Release / Runtime / Delivery Operator do ecossistema AIOSON

### 11.2. Trocar a autoridade exclusiva

De:
- push remoto exclusivo

Para:
- publicacao e release operacional exclusivos

### 11.3. Trocar os inputs centrais

De:
- git status, story status, PR, GitHub issue

Para:
- project context, workflow state, runtime state, QA status, manifests, output strategy, cloud config

### 11.4. Trocar os comandos centrais

De:
- push, PR, GitHub setup, issue triage

Para:
- pre-release, package publish, runtime ops, delivery ops, cloud sync

### 11.5. Trocar a semantica de qualidade

De:
- repo integrity

Para:
- release readiness + delivery safety + package validity + runtime health

---

## 12. Veredito

O `AIOX devops` tem boas ideias de:

- authority
- quality gates
- command UX
- release disciplina
- operacao sistematica

Mas, para funcionar como se tivesse sido criado especificamente para o AIOSON, ele precisa mudar de eixo.

Nao deve ser principalmente:

- GitHub manager

Deve ser principalmente:

- **AIOSON release, runtime, cloud e delivery operator**

Se eu resumir em uma frase:

> O `@devops` nativo do AIOSON deveria cuidar menos de PR e mais de release readiness, package publish, runtime ops, delivery e cloud sync.
