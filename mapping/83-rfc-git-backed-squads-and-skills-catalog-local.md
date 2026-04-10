# RFC Local - Squads publicas via Git, skills catalog online, runtime privado

Status: draft local
Escopo: aios-lite, aios-lite-dashboard, aioslite-com
Data: 2026-03-08

## 1. Motivo da mudanca

A direction atual do cloud ainda trata a squad definition como algo salvo e versionado no backend.
Isso aumenta complexidade e cria um segundo source of truth para a definicao da squad.

Se o AIOS Lite agora gera a squad como pacote local completo, o modelo mais saudavel fica:

- squad publica: source of truth em Git
- aioslite.com: registry/catalogo e descoberta
- runtime e conteudo: privados e opcionais no cloud
- skills: catalogo online importavel em markdown

## 2. Nova tese de produto

### 2.1 Squad publica

Uma squad publica deixa de ser um snapshot canonicamente salvo no banco cloud.

A definicao oficial da squad passa a ser:

- pacote local do AIOS Lite
- versionado em Git
- importavel por git url / release / tag / branch

O aioslite.com passa a armazenar apenas metadados indexaveis da squad publica:

- slug
- nome
- descricao
- autor
- visibilidade publica
- git_url
- default_ref
- latest_tag
- compatibilidade
- package_manifest_preview_json
- tags/categorias

### 2.2 Skills online

O valor central do cloud passa a ser um catalogo de skills:

- skills globais
- skills privadas/publicas
- skills importaveis por squad
- markdown como formato principal

O aios-lite e o dashboard podem importar uma skill selecionada para:

- `.aios-lite/squads/{slug}/skills/...`

### 2.3 Runtime e conteudo

Runtime continua local-first:

- SQLite local
- conteudo em JSON
- logs/eventos/runs no SQLite

Cloud para runtime/conteudo:

- opcional
- privado
- por workspace

Ou seja:

- definition publica da squad -> Git + registry
- runtime privado -> banco + cloud opcional

## 3. O que muda conceitualmente

### 3.1 Sai do centro

- publish de squad definition canonicamente para MySQL
- squad version como pacote primario salvo no cloud
- import de squad publica a partir de snapshot JSON do banco
- share-link privado para definition da squad

### 3.2 Entra no centro

- import de squad publica por `git_url`
- registry de squads publicas no site
- skills catalog online com CRUD
- runtime/conteudo privado ligado a workspace

## 4. Modelo novo por tipo de ativo

### 4.1 Squad publica

Source of truth:

- Git

Cloud guarda:

- registro/index
- preview de manifesto
- metadata de compatibilidade
- tags
- link de importacao

Import local:

- baixa do Git
- valida manifesto
- instala o pacote local

### 4.2 Skill

Source of truth:

- cloud inicialmente
- opcionalmente Git depois

Formato:

- markdown
- metadata indexavel

Import local:

- salva na pasta `skills` da squad selecionada

### 4.3 Runtime e conteudos

Source of truth:

- SQLite local

Cloud:

- backup/sync opcional
- ownership por `user_id + workspace_id + squad_slug`

## 5. Impacto em cada projeto

## 5.1 aios-lite

### Deve continuar

- squad como pacote local
- runtime SQLite
- discovery/design-doc/readiness
- mode `content | builder`

### Deve mudar

- `cloud:publish:squad` deixa de ser o publish primario da definition
- entra um fluxo tipo:
  - `squad:register --git-url=...`
  - `squad:import --git-url=...`
  - `skill:import --slug=...`

### Nova responsabilidade principal

- gerar pacote local bom
- validar manifesto
- instalar pacote por Git
- importar skills do catalogo online

## 5.2 aios-lite-dashboard

### Deve continuar

- visao do runtime local
- sync de conteudos privados
- binding `projeto local -> workspace`

### Deve mudar

- remover protagonismo do publish de squad definition para cloud
- trocar por:
  - registrar squad publica no registry
  - importar squad publica por Git
  - navegar/importar skills do catalogo

### UX nova

- pagina de squad continua mostrando runtime, discovery, docs e conteudos
- configuracao do cloud continua para runtime e conteudo
- nova aba ou fluxo para `Skills Catalog`

## 5.3 aioslite-com

### Deve continuar

- usuarios
- workspaces/projects
- runtime/conteudos privados
- tokens
- auth

### Deve mudar

- `Squad` e `SquadVersion` deixam de ser registry canonico da definition publica
- o site passa a ter:
  - `registry_squads` ou reuso simplificado de `Squad` como indice de Git
  - `skills`
  - `skill_versions` opcional
  - `skill_tags`

### Fluxo novo

- usuario registra uma squad publica apontando para Git
- site valida e indexa manifesto
- outros usuarios importam a squad via link Git

## 6. Estruturas recomendadas

## 6.1 Registry de squads publicas

Sugestao minima:

- `registry_squads`
  - id
  - owner_user_id
  - slug
  - name
  - description
  - visibility
  - git_url
  - default_ref
  - latest_tag
  - compatibility_min
  - compatibility_max
  - package_manifest_preview_json
  - tags_json
  - created_at
  - updated_at

Opcional depois:

- `registry_squad_versions`
  - se quiser indexar tags/releases sem virar source of truth

## 6.2 Skills catalog

Sugestao minima:

- `skills`
  - id
  - owner_user_id
  - slug
  - title
  - summary
  - visibility
  - domain
  - content_markdown
  - meta_json
  - created_at
  - updated_at

Opcional depois:

- `skill_versions`
- `skill_tags`
- `skill_installs`

## 6.3 Runtime privado

Mantem a ideia atual:

- workspaces
- artifacts
- task/task_runs/task_events
- content sync

## 7. Fluxos recomendados

### 7.1 Publicar squad publica

1. usuario cria a squad no AIOS Lite local
2. versiona em Git
3. no aioslite.com registra:
   - git_url
   - ref/tag
   - metadata
4. o site indexa o manifesto
5. registry exibe essa squad como publica

### 7.2 Importar squad publica

1. usuario seleciona squad no site ou dashboard
2. sistema usa git_url/ref
3. baixa pacote
4. valida `squad.manifest.json`
5. instala localmente

### 7.3 Publicar skill

1. usuario escreve markdown da skill
2. salva no aioslite.com
3. define visibilidade
4. skill aparece no catalogo

### 7.4 Importar skill para squad

1. dashboard abre catalogo
2. usuario seleciona skill
3. importa para `.aios-lite/squads/{slug}/skills/...`
4. manifesto da squad pode ser atualizado para referenciar a skill

## 8. Decisoes importantes

- private/public para **definition publica da squad** perde importancia se o source of truth for Git publico
- private continua muito importante para:
  - runtime
  - conteudos
  - backups
  - skills privadas

- `latest.html` deixa de ser central para definition
- pacote da squad continua local-first
- aioslite.com deixa de ser o lugar onde a squad nasce

## 9. Ordem recomendada de refactor

### Fase 1

- congelar o push de novas features na definition cloud da squad
- reposicionar UX do cloud para registry Git-backed
- manter runtime/conteudo privado como esta

### Fase 2

- criar catalogo CRUD de skills online
- criar import de skill para squad no dashboard
- criar endpoint de busca/listagem de skills

### Fase 3

- trocar import de squad publica para Git-backed
- descontinuar publish/import de definition publica por snapshot JSON do banco

### Fase 4

- limpar schema cloud antigo de squad versioning, se ainda fizer sentido
- manter compatibilidade temporaria para squads antigas

## 10. Decisao pratica para a proxima etapa

Antes de implementar:

1. parar de expandir o fluxo de squad definition no cloud
2. manter o cloud focado em:
   - registry de squads publicas
   - skills catalog
   - runtime/conteudo privado
3. migrar a UX do dashboard para:
   - importar squad publica
   - importar skill
   - sincronizar conteudo

