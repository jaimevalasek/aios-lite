# 00-MASTER.md — Programa de implementação do Genoma 2.0 + Dashboard

## Objetivo do programa
Implementar o **Genoma 2.0** no `aios-lite` e integrar essa capacidade ao `aios-lite-dashboard`, mantendo compatibilidade com o upgrade recente de squads, sem regressões no fluxo atual de criação de squads, Artisan e Pipelines.

## Repositórios envolvidos
- **Core / CLI**: `https://github.com/jaimevalasek/aios-lite`
- **Dashboard**: `https://github.com/jaimevalasek/aios-lite-dashboard`

## Regra de proteção
**100% aditivo. NÃO deletar nada.**

Regras obrigatórias:
1. Não remover fluxos existentes de squad, artisan, pipelines ou genomes.
2. Não mudar contratos atuais de forma breaking sem camada de compatibilidade.
3. Toda nova leitura deve ser tolerante com formatos antigos.
4. Toda escrita nova deve ser versionada ou claramente identificável.
5. Toda fase deve ser implementável sozinha, sem depender da leitura de outros arquivos de fase.

---

## Arquitetura alvo resumida

### Conceitos centrais
- **Genoma** = camada cognitiva de domínio/função/persona/híbrido.
- **Squad** = unidade executora com manifesto, executores, portas e outputs.
- **Pipeline** = orquestração de squads.
- **Artisan** = incubadora de ideias para squad e genoma.
- **Dashboard** = camada visual para incubar, gerenciar, vincular e inspecionar.

### Regras arquiteturais que não devem ser quebradas
- Pipeline orquestra **somente squads**.
- Genoma é aplicado **no squad** ou **em executores do squad**.
- Genoma **não** é nó executável do pipeline no v1.
- `/artisan` deve incubar **squad** e **genoma** sem duplicar a UX principal.
- `/pipelines` deve mostrar squads no canvas e genomas como **badges/bindings/contexto**.

---

## Fases do programa

| Arquivo | Objetivo | Repo alvo | Pré-requisito |
|---|---|---|---|
| `00-MASTER.md` | Índice mestre, mapa do codebase, convenções e invariantes | ambos | nenhum |
| `01-aios-lite-genoma-core.md` | Implementar o núcleo do Genoma 2.0 com compatibilidade | aios-lite | 00 |
| `02-aios-lite-genoma-binding-squad.md` | Ligar genomas em squads novas e existentes | aios-lite | 00, 01 |
| `03-aios-lite-migration-compat.md` | Garantir migração, tolerância e repair sem regressão | aios-lite | 00, 01, 02 |
| `04-dashboard-artisan-genoma.md` | Expandir `/artisan` para incubação de genoma | dashboard | 00, 01 |
| `05-dashboard-genomes-catalog.md` | Evoluir `/genomes` para catálogo Genoma 2.0 | dashboard | 00, 01, 04 |
| `06-dashboard-squad-genome-binding.md` | Criar UI/API para adicionar genomas ao squad | dashboard | 00, 01, 02, 05 |
| `07-dashboard-pipelines-orchestration-only.md` | Manter pipelines só com squads e mostrar genomas como bindings | dashboard | 00, 02, 05, 06 |
| `08-integration-tests-e2e.md` | Validar fluxo ponta a ponta entre core e dashboard | ambos | 00–07 |
| `09-rollout-checklist.md` | Consolidar rollout, smoke tests e ordem de merge | ambos | 00–08 |

---

## Mapa do codebase — `aios-lite`

### Diretórios relevantes
- `src/` → implementação do CLI/runtime.
- `template/.aios-lite/agents/` → agentes padrão distribuídos pelo projeto.
- `template/.aios-lite/tasks/` → tasks padrão.
- `template/.aios-lite/schemas/` → schemas do sistema.
- `tests/` → suíte de testes.
- `docs/` → documentação do projeto.

### Classificação por risco

#### EDITAR
- `src/cli.js`
- `src/constants.js`
- `template/.aios-lite/agents/genoma.md`
- `template/.aios-lite/agents/squad.md`
- arquivos de manifesto / parsing / utils de genome e squad que já existirem no `src/`
- `tests/` relacionados a genoma e squad

#### NOVO
- módulos utilitários de Genoma 2.0 no `src/`
- schemas novos em `template/.aios-lite/schemas/`
- testes novos em `tests/`
- docs novas em `docs/`

#### NÃO TOCAR sem necessidade explícita
- partes do runtime não relacionadas a squad/genoma
- comandos CLI não relacionados ao upgrade
- fluxos estáveis que não participam de genome/squad binding

---

## Mapa do codebase — `aios-lite-dashboard`

### Diretórios relevantes
- `app/artisan/` → incubação de ideias.
- `app/genomes/` → catálogo/listagem de genomas.
- `app/squads/` → catálogo e páginas de squads.
- `app/pipelines/` → canvas/gestão de pipelines.
- `app/api/` → rotas de API.
- `components/` → UI compartilhada.
- `lib/` → acesso a banco, helpers e clients.

### Classificação por risco

#### EDITAR
- `app/artisan/page.tsx`
- `app/artisan/[id]/page.tsx`
- `app/genomes/page.tsx`
- `app/squads/page.tsx`
- `app/pipelines/page.tsx`
- `app/pipelines/[slug]/page.tsx`
- rotas em `app/api/...`
- módulos DB/helpers usados por artisan/genomes/squads/pipelines

#### NOVO
- rotas novas de genome brief, genome bindings e catálogos enriquecidos
- componentes de binding de genoma
- componentes de badges/inspector para genomas no pipeline
- migrations SQLite para bindings, briefs e auditoria
- testes de API/UI se já existir estrutura para isso

#### NÃO TOCAR sem necessidade explícita
- telas não relacionadas a artisan/genomes/squads/pipelines
- navegação global fora do necessário
- integrações que não participam do fluxo de genoma

---

## Convenções do projeto

### `aios-lite`
- Linguagem principal: JavaScript/Node.js.
- Ambiente alvo: Node 18+.
- Testes: `node --test`.
- O projeto distribui artefatos padrão via `template/.aios-lite/...`.
- Agentes e tasks devem ser tratados como contratos do sistema.
- Mudanças em agentes devem preservar comandos e linguagem atual, expandindo de forma aditiva.

### `aios-lite-dashboard`
- Framework: Next.js App Router.
- Linguagem: TypeScript/TSX.
- Persistência local: SQLite.
- UI atual já possui fluxos para `Artisan`, `Squads`, `Genomes` e `Pipelines`.
- React Flow é a base natural para evolução do canvas de pipelines.

---

## Invariantes de compatibilidade
- Squads sem genoma devem continuar funcionando.
- Genomas antigos devem continuar sendo lidos.
- O upgrade do `@squad` já feito na `main` não pode ser desfeito.
- O dashboard não pode perder o fluxo atual de PRD do Artisan.
- Pipelines atuais devem continuar abrindo e salvando normalmente.

---

## Estratégia de implementação
1. Primeiro consolidar **core do Genoma 2.0**.
2. Depois fazer **binding formal em squads**.
3. Em seguida construir **compatibilidade/migração**.
4. Só então subir o **dashboard** em cima do contrato novo.
5. Validar ponta a ponta antes de merge final.

---

## Estratégia de commits sugerida
- Um commit por fase concluída.
- Sempre incluir testes no mesmo commit da fase.
- Se a fase for grande, quebrar em subcommits mantendo a mensagem sugerida da própria fase.

---

## Definição de pronto do programa
O programa estará pronto quando:
- for possível incubar um genoma no `/artisan`;
- gerar um `Genome Brief` e criar o genoma no core;
- aplicar o genoma a uma squad nova ou existente;
- visualizar os bindings do genoma no dashboard;
- usar pipelines apenas para orquestrar squads, com genomas visíveis como contexto/badges;
- tudo funcionar com compatibilidade para dados antigos.
