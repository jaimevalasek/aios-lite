# Checklist Local — Implementação do Squad Modular

Objetivo: transformar o protocolo modular em backlog executável para o AIOS Lite, o dashboard local e o aioslite.com.

## 0. Decisões já fechadas

- Squad não é apenas pasta com agentes.
- Squad precisa ter manifesto textual e manifesto estruturado.
- `@squad` continua criando executores permanentes.
- `genoma` é camada cognitiva, não skill.
- Skills são capacidades reutilizáveis.
- MCPs são acessos externos.
- Subagentes são temporários e investigativos.
- Texto vai para SQLite local.
- Mídia vai para `media/`.
- Squads locais podem ser publicadas e sincronizadas via `aioslite.com`.

## 1. Artefatos obrigatórios por squad

Toda nova squad deve gerar:

- `agents/{squad-slug}/agents.md`
- `agents/{squad-slug}/squad.manifest.json`
- `agents/{squad-slug}/orquestrador.md`
- `agents/{squad-slug}/{executor}.md`
- `.aios-lite/squads/{slug}.md`
- `output/{squad-slug}/`
- `aios-logs/{squad-slug}/`
- `media/{squad-slug}/`

## 2. O que o `@squad` precisa passar a fazer

### 2.1. Hoje
- cria agentes executores
- cria orquestrador
- cria metadata `.md`
- gera outputs HTML

### 2.2. Falta implementar
- gerar `agents.md` curto da squad
- gerar `squad.manifest.json`
- declarar skills da squad
- declarar MCPs da squad
- declarar política de subagentes
- declarar regras de revisão
- declarar diretório `media/{squad-slug}/`

### 2.3. Critério de geração
Quando o `@squad` receber a tarefa:

1. definir missão da squad
2. definir escopo e limites
3. definir executores permanentes
4. derivar skills reais da squad
5. derivar MCPs necessários com justificativa
6. derivar política de subagentes
7. gerar manifesto textual
8. gerar manifesto JSON
9. gerar executores
10. registrar tudo no runtime

## 3. Estrutura do `agents.md` da squad

O arquivo `agents/{squad-slug}/agents.md` deve conter:

- nome da squad
- missão
- o que faz
- o que não faz
- executores permanentes
- skills disponíveis
- MCPs disponíveis
- quando usar subagentes
- padrão de output
- padrão de revisão
- diretórios usados:
  - output
  - logs
  - media

Esse arquivo deve ser curto.

## 4. Estrutura do `squad.manifest.json`

Campos mínimos:

- `schemaVersion`
- `slug`
- `name`
- `mission`
- `goal`
- `visibility`
- `aiosLiteCompatibility`
- `rules`
- `skills`
- `mcps`
- `subagents`
- `executors`
- `genomes`

### 4.1. `rules`
- `outputsDir`
- `logsDir`
- `mediaDir`
- `reviewPolicy`

### 4.2. `skills`
Cada item deve ter:
- `slug`
- `title`
- `description`

### 4.3. `mcps`
Cada item deve ter:
- `slug`
- `required`
- `purpose`

### 4.4. `subagents`
- `allowed`
- `when`

### 4.5. `executors`
Cada item deve ter:
- `slug`
- `title`
- `role`
- `file`
- `skills`
- `genomes`

## 5. Runtime SQLite local

## 5.1. Banco atual
O banco local já tem:
- `tasks`
- `agent_runs`
- `agent_events`
- `artifacts`

## 5.2. Falta adicionar

### tabela `squads`
- `slug`
- `name`
- `mission`
- `goal`
- `status`
- `visibility`
- `manifest_json`
- `agents_dir`
- `output_dir`
- `logs_dir`
- `media_dir`
- `latest_session_path`
- `created_at`
- `updated_at`

### tabela `squad_executors`
- `squad_slug`
- `executor_slug`
- `title`
- `role`
- `file_path`
- `skills_json`
- `genomes_json`
- `created_at`
- `updated_at`

### tabela `squad_skills`
- `squad_slug`
- `skill_slug`
- `title`
- `description`

### tabela `squad_mcps`
- `squad_slug`
- `mcp_slug`
- `required`
- `purpose`

### tabela `squad_genomes`
- `squad_slug`
- `genome_slug`
- `scope_type`
- `agent_slug`

## 5.3. Regra de persistência
- `squad.manifest.json` continua sendo a fonte local exportável
- SQLite indexa e acelera dashboard/runtime
- não depender apenas do banco para reconstrução da squad

## 6. Artifacts e mídia

### Texto
Guardar no runtime SQLite e nos arquivos do projeto:
- HTML
- markdown
- json
- logs textuais
- snapshots de import/export

### Mídia
Guardar em:
- `media/{squad-slug}/`

No banco guardar apenas:
- `kind`
- `file_path`
- `size`
- `task_key`
- `agent_slug`
- `squad_slug`

## 7. Dashboard local

O dashboard deve parar de inferir squad apenas por metadata simples.

### 7.1. Passar a ler
- `squad.manifest.json`
- tabela `squads`
- tabela `squad_executors`
- tabela `squad_skills`
- tabela `squad_mcps`
- tabela `squad_genomes`

### 7.2. Nova UI do app da squad

Abas:
- `Resumo`
- `Agentes`
- `Skills`
- `MCPs`
- `Genomas`
- `Tasks`
- `Outputs`
- `Logs`
- `Media`

### 7.3. Cards de agentes
Cada card deve mostrar:
- nome
- papel
- status
- última task
- último output
- skills ligadas
- genomas ativos

## 8. Cloud (`aioslite.com`)

### 8.1. Schema cloud
Hoje já existe `manifestJson` em `SquadVersion`.
Isso deve virar a base oficial do snapshot publicável.

### 8.2. Falta melhorar
- garantir que `manifestJson` siga o mesmo schema do `squad.manifest.json`
- publicar `skills`, `mcps`, `subagents` e `executors` no snapshot
- suportar `mediaDir` como parte do manifesto local
- manter texto sincronizável sem depender de mídia

### 8.3. Import/export
O fluxo cloud deve:
- importar manifesto JSON
- recriar `agents.md`
- recriar executores
- recriar metadata `.md`
- reindexar no SQLite local

## 9. Ordem de implementação recomendada

### Fase 1 — Core do `@squad`
- alterar template do `@squad`
- gerar `agents.md`
- gerar `squad.manifest.json`
- gerar `media/{slug}/`

### Fase 2 — Runtime local
- adicionar tabelas de squad no SQLite
- indexar manifesto e executores
- registrar squads no runtime ao criar/importar

### Fase 3 — Dashboard local
- ler manifesto e tabelas novas
- mostrar `Skills`, `MCPs`, `Genomas`, `Media`
- enriquecer cards dos agentes

### Fase 4 — Cloud
- alinhar schema do snapshot
- alinhar publish/import com manifesto completo
- validar compatibilidade por `schemaVersion`

### Fase 5 — Subagentes
- formalizar no orquestrador e no dashboard
- registrar execuções temporárias quando houver investigação/paralelismo

## 10. Testes necessários

### `aios-lite`
- contrato do `@squad` exige `agents.md`
- contrato do `@squad` exige `squad.manifest.json`
- import cloud materializa manifesto
- criação de squad indexa runtime SQLite
- criação de squad cria `media/{slug}/`

### `dashboard`
- renderiza squad a partir do manifesto
- mostra skills/mcps/genomas
- mostra executores com dados do runtime

### `aioslite.com`
- snapshot inclui manifesto completo
- publish preserva `skills/mcps/subagents/executors`
- import em outro projeto reconstrói estrutura esperada

## 11. Critério de pronto

Uma squad só pode ser considerada pronta quando:

- manifesto textual existe
- manifesto JSON existe
- executores existem
- metadata existe
- diretórios `output`, `logs` e `media` existem
- runtime SQLite indexou a squad
- dashboard mostra a squad com `Agentes`, `Skills`, `MCPs`, `Genomas` e `Tasks`
- publish/import cloud preserva a estrutura

## 12. Decisão importante

Usar skills, arquivos especializados e MCPs sob demanda não é detalhe.
É parte estrutural da arquitetura.

Se a squad continuar nascendo como um conjunto de prompts carregados com tudo:
- ela viola o protocolo
- gasta mais contexto
- escala pior
- fica mais difícil de sincronizar e manter
