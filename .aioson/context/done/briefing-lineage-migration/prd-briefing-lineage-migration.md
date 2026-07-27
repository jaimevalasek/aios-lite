---
feature: briefing-lineage-migration
classification: MEDIUM
feature_completeness: required
product_scope: approved
prd_ready: approved
sheldon_review: approved
prototype: null
prototype_status: none
prototype_feature: null
---

# PRD — Migração de linhagem de briefings legados

## Vision

Projetos criados antes do contrato atual de linhagem devem voltar a ser
verificáveis por uma rota oficial, segura e auditável, sem reabrir decisões de
produto nem enfraquecer as garantias aplicadas a artefatos novos.

## Problem and users

O operador de um projeto AIOSON pode ter um briefing aprovado — inclusive com
PRD e plano já produzidos — cujas tabelas de fontes e promessas usam o esquema
legado. O validador atual exige o esquema novo, mas as rotas de refinamento e
desaprovação excluem corretamente briefings que já geraram PRD. O resultado é
um bloqueio sem owner operacional: a intenção continua preservada, porém o
projeto não possui uma migração suportada.

Usuários primários:

- operadores que mantêm projetos AIOSON anteriores ao contrato atual;
- agentes Product, Sheldon, Planner, Dev e QA que dependem da linhagem;
- mantenedores do CLI que precisam distinguir incompatibilidade histórica de
  mudança material de autoridade.

## Source basis

- Fonte aprovada pelo operador:
  `plans/correcao-migracao-linhagem-briefings-aprovados.md`
- SHA-256 consultado:
  `a1e3779f2abd302aa0e812425203baddea5c5bce5cd0b2d4b60b9b308ad0bf4d`
- Incidente de referência: briefing `project-squad-runtime`, com 18 promessas
  preservadas no PRD, bloqueado pelo Gate C após mudança do contrato.
- Não há briefing ou Source Promise Map canônico para esta feature; por isso não
  há `PROM-*` a mapear neste PRD. Todos os resultados materiais da fonte estão
  representados abaixo por `CAP-*` e `AC-*`.

## Confirmed regression evidence

Uma inspeção read-only do snapshot atual de
`C:\dev\playapps\aioson-cockpit` confirmou:

- o briefing `project-squad-runtime` já possui 18/18 promessas cobertas e a
  linhagem migrada manualmente, sem erro de origem no validador;
- `gate:check --gate=C` e o preflight DEV bloqueiam o projeto com oito findings
  `implementation_delta_create_path_exists`, embora o plano e Gate C estejam
  marcados como aprovados;
- não existe o checkpoint Gate C correspondente, pois esse checkpoint é
  best-effort em `src/commands/gate-approve.js`;
- para o mesmo snapshot, `artifact:validate` retorna `integrity: VALID`, porque
  não aplica a semântica pré-implementação usada por Gate C.

Isso confirma dois defeitos adicionais dentro do escopo já aprovado de Gate C:
um checkpoint best-effort pode virar pré-requisito irrecuperável depois do início
da implementação, e rotas oficiais podem contradizer umas às outras sobre a
prontidão do mesmo estado.

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-lineage-migration-command | O operador inspeciona e aplica uma migração explícita de linhagem em briefings legados, inclusive após geração do PRD, sem alterar o lifecycle | Operador executa `aioson briefing:migrate-lineage` para um slug | required | Elimina o bloqueio sem exigir edição manual de arquivos gerenciados |
| CAP-lineage-source-preservation | A migração preserva integralmente IDs, intenção e proveniência material, distinguindo source pack físico de evidência complementar | Migração interpreta inventário e mapa de promessas legados | required | Compatibilidade não pode fabricar fontes, renumerar promessas ou perder informação |
| CAP-lineage-prework-lifecycle | A exigência de presença física de `/plans` acompanha o estágio da feature sem deixar de detectar alterações em fontes ainda presentes | Validador verifica linhagem antes e depois da absorção pelo PRD | required | `/plans` é prework descartável; após absorção, a autoridade é a promessa canônica |
| CAP-lineage-decision-normalization | As grafias suportadas de `not_applicable` resultam na mesma decisão canônica | Product ou validador lê Source Coverage | required | A mensagem de erro já promete formatos que o caminho atual não aceita de forma equivalente |
| CAP-lineage-review-generation | Apenas reviews dependentes de uma autoridade alterada são invalidados, e um PASS atual continua prevalecendo sobre histórico stale | Migração altera briefing/PRD ou Gate C consulta o review Sheldon | required | Preserva imutabilidade e auditoria sem permitir rebind manual nem bloqueio por histórico irrelevante |
| CAP-lineage-gate-ownership | O Gate C aponta a ação e o owner do bloqueio real em vez de recomendar Planner indiscriminadamente | Operador executa `gate:check` com plano já aprovado | required | A recomendação atual desvia o usuário quando o plano não é a causa |

## Current System Fit

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-lineage-migration-command | `src/commands/briefing.js` expõe approve, unapprove, review e apply-feedback; `src/cli.js` não registra uma migração de linhagem e `resolveRefinableSlug()` exclui `approved + prd_generated` | new | Acrescentar uma rota explícita, não destrutiva por padrão, que aceite os três estágios legados e produza resultado humano e JSON auditável |
| CAP-lineage-source-preservation | `src/lib/feature-source-lineage.js` exige diretamente as quatro colunas canônicas, `SRC-*`, SHA-256 e caminhos sob `plans/`; fontes conversacionais ou de pesquisa só são toleradas no mapa de promessas; `src/verification/path-policy.js` confina lexicalmente, sem provar o destino real de symlink/reparse point | extend | Reconhecer deterministicamente os esquemas legados, promover somente arquivos reais e confinados do source pack ao inventário canônico, e preservar outras evidências fora dele sem seguir escape indireto |
| CAP-lineage-prework-lifecycle | `src/lib/feature-source-lineage.js` lê e recalcula todo arquivo inventariado em qualquer execução; `src/lib/feature-completeness.js` aplica essa validação sem receber o lifecycle do registry, enquanto artifact validate, preflight, handoff, Gate C e feature close chamam o mesmo analisador com modos diferentes | replace | Resolver o estágio por registry + artefatos canônicos coerentes, manter verificação física antes da absorção e usar evidência histórica pós-PRD de modo idêntico em todas as rotas oficiais |
| CAP-lineage-decision-normalization | `src/lib/feature-completeness-format.js` já conhece aliases para `not_applicable`, mas a leitura de Source Coverage em `src/lib/feature-source-lineage.js` usa `normalizeLabel()` e converte underscore de forma incompatível | extend | Fazer underscore, hífen e espaço convergirem para `not_applicable` e alinhar diagnóstico e valor aceito |
| CAP-lineage-review-generation | `src/review-intelligence/engine.js` já vincula packets ao hash do artefato e das autoridades e mantém relatórios imutáveis; `src/lib/sheldon-review.js` bloqueia quando o status global contém qualquer review stale, mesmo havendo PASS Sheldon atual | extend | Invalidar somente gerações causalmente dependentes da mudança e validar Gate C pelo PASS Sheldon corrente, preservando histórico stale como auditoria |
| CAP-lineage-gate-ownership | `src/commands/gate-check.js` agrega findings de completude, mas toda falha de Gate C usa a recomendação fixa de ativar `@planner`; `src/lib/gate-checkpoint.js` trata checkpoint ausente como baseline pré-implementação, embora `src/commands/gate-approve.js` grave esse checkpoint em best effort; `src/commands/artifact-validate.js` não aplica a mesma semântica | extend | Derivar owner/recuperação da causa, impedir deadlock por checkpoint ausente e fazer Gate C, artifact validate, preflight e workflow concordarem sobre o mesmo snapshot |

## MVP scope

- Comando `aioson briefing:migrate-lineage [path] --slug=<slug>` com saída de
  planejamento por padrão, `--dry-run`, aplicação explícita por `--write` e
  saída `--json`.
- `path` deve resolver para um projeto existente; `slug` deve ter 1–128
  caracteres lowercase alfanuméricos/hífen, começar por alfanumérico e
  corresponder exatamente a uma entrada do registry.
- Suporte a briefings `draft`, `approved` e `approved` com `prd_generated`.
- Migração determinística das tabelas legadas de inventário e promessas.
- Preservação de evidências complementares não canônicas.
- Alteração restrita às seções de linhagem do briefing; registry, PRD, plano,
  protótipo e relatórios históricos permanecem byte a byte.
- Escrita recuperável, atômica e idempotente com hashes antes/depois e relatório
  das linhas transformadas.
- Proteção contra mudança concorrente do briefing entre análise e commit.
- Lifecycle de fontes dependente do estágio de absorção no PRD.
- Normalização única de `not_applicable`.
- Seleção e revalidação causal de reviews.
- Recomendação de Gate C orientada ao owner real, recuperação segura de
  checkpoint legado ausente e diagnóstico consistente nas rotas oficiais.
- Mensagens do comando nos quatro locales existentes e documentação de uso.

## Out of scope

- migrar silenciosamente todos os projetos durante `setup`, `update` ou
  `gate:check`;
- relaxar o contrato canônico para novos briefings;
- reabrir decisões de produto ou alterar IDs/estados de promessas aprovadas;
- fabricar fingerprint para fonte ausente, não consultada ou fora do projeto;
- abrir ou seguir URLs preservadas como evidência complementar;
- tornar `/plans` uma dependência permanente após absorção canônica;
- reescrever packets, hashes ou relatórios históricos;
- editar automaticamente PRD ou plano para contornar falha de cobertura;
- fabricar ou reconstruir checkpoint Gate C sem evidência suficiente do baseline
  aprovado;
- migrar protótipos ou alterar contrato visual;
- fechar feature, publicar pacote ou modificar projetos consumidores.

## User flows

### Fluxo 1 — inspeção e migração

1. O operador executa o comando para um slug legado sem `--write`.
2. O CLI valida registry, briefing, PRD existente, IDs, fontes e promessas.
3. O CLI mostra exatamente o que seria alterado, o que será preservado e quais
   reviews exigiriam nova geração; nenhum byte é modificado.
4. O operador repete com `--write`.
5. Antes do commit, o CLI confirma que o hash analisado continua atual; se outro
   processo alterou o briefing, falha sem sobrescrever a mudança.
6. O CLI cria recuperação, grava atomicamente e apresenta relatório com hashes,
   contagens e próxima ação de revalidação.
7. Registry, PRD, plano, protótipo e histórico de reviews permanecem intactos;
   sua eventual staleness é calculada pelos bindings já existentes.
8. Uma nova execução confirma estado canônico e não altera bytes nem cria nova
   geração de backup/relatório.

Estado de sucesso visível: migração concluída ou já canônica, lifecycle
inalterado, contagens preservadas e caminhos de relatório/recuperação exibidos.

Estado de falha visível: código não zero, diagnóstico do item ambíguo/inválido ou
ausente e garantia de que briefing, PRD e registry permanecem inalterados.

### Fluxo 2 — validação após absorção

1. Antes da aprovação/Product, o validador exige o arquivo bruto e seu
   fingerprint atual; referência ausente ou sem fingerprint não pode virar
   `SRC-*`.
2. Depois que registry, PRD e Source Coverage comprovam absorção coerente, a
   remoção do prework não bloqueia Planner, Dev ou QA.
3. Prework pós-PRD ausente e sem fingerprint histórico é preservado como
   evidência complementar indisponível, nunca como `SRC-*` fabricado, somente
   quando suas promessas já têm cobertura canônica não ambígua.
4. Se o arquivo bruto ainda existir e divergir do fingerprint aprovado, o
   validador continua falhando fechado.
5. Lifecycle contraditório ou cobertura incompleta falham fechado com owner e
   ação explícitos.

### Fluxo 3 — review e Gate C

1. Uma migração que altera briefing ou PRD torna stale apenas os reviews que
   dependem dessas autoridades.
2. O operador produz a nova geração exigida; histórico anterior permanece
   imutável e consultável.
3. Gate C seleciona o PASS Sheldon vinculado ao artefato e autoridades atuais.
4. Um projeto legado com Gate C aprovado, implementação iniciada e checkpoint
   best-effort ausente recebe uma rota verificável de recuperação; não precisa
   apagar código, falsificar checkpoint ou editar o plano manualmente apenas
   para recriar o baseline.
5. Se ainda houver bloqueio, a recomendação aponta migração, Sheldon, recuperação
   do Gate C, Planner ou Dev conforme a causa.
6. Artifact validate, preflight, Gate C e workflow reportam a mesma classificação
   de prontidão para o mesmo snapshot.

## Success metrics

- O caso real `project-squad-runtime` migra em cópia temporária preservando
  18/18 `PROM-*`, os mesmos IDs, intenção e estado.
- Zero alteração em `status`, `approved_at` e `prd_generated`.
- Dry-run altera zero bytes; a segunda aplicação altera zero bytes.
- Projetos pós-PRD sem `/plans` passam pela verificação de linhagem quando toda
  promessa material já está absorvida.
- Fonte ainda presente com fingerprint divergente continua bloqueando.
- Um PASS Sheldon atual não é invalidado por geração stale não corrente.
- Todo bloqueio de Gate C do cenário de regressão aponta o owner correto.
- Nenhum Gate C aprovado entra em deadlock apenas porque seu checkpoint
  best-effort está ausente.
- Artifact validate, preflight, Gate C e workflow não emitem veredictos
  contraditórios para o mesmo snapshot.
- Testes focados e `npm test` passam integralmente.

## Prototype contract

- status: none
- feature: briefing-lineage-migration
- prototype: none
- manifest: none
- excluded historical references: none
- baseline: comportamento atual do CLI, validadores e testes inspecionados no
  repositório

## Visual identity

Não aplicável. A feature não possui superfície visual; novas mensagens devem
seguir os padrões existentes de saída CLI e os locales `en`, `pt-BR`, `es` e
`fr`.

## Open questions

- Nenhuma questão bloqueante.
- O formato físico e o local do backup/relatório são decisão de implementação,
  desde que atendam recuperação, confinamento, atomicidade e auditabilidade.

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-lineage-001 | CAP-lineage-migration-command | Sem `--write`, o comando aceita fixtures legacy `draft`, `approved` e `approved + prd_generated`, retorna o plano de migração e mantém todos os arquivos byte a byte | Teste CLI por lifecycle + comparação de hashes antes/depois |
| AC-lineage-002 | CAP-lineage-migration-command | `--dry-run` é explicitamente não mutante; `--write` aplica a migração; opções de escrita conflitantes falham sem alteração | Teste de parser/CLI e filesystem temporário |
| AC-lineage-003 | CAP-lineage-migration-command | Uma aplicação bem-sucedida altera somente as seções de linhagem de `briefings.md`, preserva `status`, `approved_at`, `prd_generated`, registry, PRD, plano, protótipo e reviews, e informa hashes, linhas migradas, backup e próxima revalidação | Teste de integração com hashes de todos os artefatos antes/depois + saída humana e JSON |
| AC-lineage-004 | CAP-lineage-migration-command | A gravação usa o hash analisado como precondição, não sobrescreve edição concorrente e é recuperável em qualquer falha; antes do commit o original permanece íntegro, e falha após o commit restaura ou completa deterministicamente relatório/estado; segunda aplicação não altera bytes nem cria novos artefatos | Teste de concorrência, falhas injetadas em cada boundary, restauração e idempotência |
| AC-lineage-005 | CAP-lineage-source-preservation | Aliases conhecidos do inventário legado são aceitos, e somente arquivos existentes, pertencentes ao source pack e confinados por caminho real recebem `SRC-*` e `sha256:`; symlink, junction ou reparse point que escape do projeto é rejeitado | Fixtures legadas + testes de confinamento lexical/real e fingerprint |
| AC-lineage-006 | CAP-lineage-source-preservation | Pesquisa, código, URL e conversa permanecem em evidência complementar explicitamente não canônica e nunca são convertidos em `SRC-*` falso | Teste de migração mista + inspeção do briefing resultante |
| AC-lineage-007 | CAP-lineage-source-preservation | Cada `PROM-*` mantém ID, intenção e estado; sua origem vem de referência explícita existente ou referência conversacional explícita, sem fusão ou renumeração | Teste de igualdade semântica antes/depois, incluindo 18/18 promessas do caso real |
| AC-lineage-008 | CAP-lineage-source-preservation | Erro estrutural fora da incompatibilidade que está sendo migrada, ID duplicado, promessa ambígua, perda de informação, ou fonte ausente antes da absorção encerram com código não zero e zero mutações; os erros de esquema legado alvo não podem bloquear a própria rota de migração | Matriz de falhas fechadas e teste que distingue incompatibilidade migrável de corrupção real |
| AC-lineage-009 | CAP-lineage-prework-lifecycle | Antes da absorção coerente no PRD, fonte ausente, sem fingerprint ou divergente bloqueia a validação | Teste de completude em estágio pré-Product |
| AC-lineage-010 | CAP-lineage-prework-lifecycle | Após registry e PRD confirmarem cobertura canônica completa, prework ausente não bloqueia gates; ausência sem fingerprint vira evidência complementar indisponível, enquanto fonte ainda presente e divergente continua bloqueando | Teste de completude/Gate C e Gate D para arquivo presente, removido, sem fingerprint e lifecycle contraditório |
| AC-lineage-011 | CAP-lineage-decision-normalization | `not_applicable`, `not-applicable` e `not applicable` são aceitos e retornam a decisão interna `not_applicable`; o diagnóstico enumera somente valores realmente aceitos | Teste unitário do normalizador + regressão de Source Coverage |
| AC-lineage-012 | CAP-lineage-review-generation | Alterar briefing ou PRD exige nova geração apenas dos reviews cujo packet referencia a autoridade alterada; nenhum packet/report histórico é reescrito | Teste de review com hashes antes/depois e inspeção do histórico |
| AC-lineage-013 | CAP-lineage-review-generation | Com PASS Sheldon atual vinculado ao PRD e autoridades atuais, histórico stale de qualquer agente permanece auditável sem bloquear Gate C, artifact validate, preflight ou workflow; tentativa de rebind manual falha | Teste integrado dos consumidores de review e histórico misto |
| AC-lineage-014 | CAP-lineage-gate-ownership | Com plano aprovado, falha exclusiva de linhagem recomenda a migração, falha exclusiva de review recomenda Sheldon e checkpoint legado ausente recomenda a recuperação própria; Planner só é recomendado quando o plano está ausente, stale ou semanticamente inválido | Teste de recomendações por causa isolada |
| AC-lineage-015 | CAP-lineage-migration-command | O comando está disponível pelo binário normal `aioson`, possui saída `--json`, mensagens equivalentes nos quatro locales e documentação de uso | Teste de dispatch/i18n + smoke do binário + verificação documental |
| AC-lineage-016 | CAP-lineage-migration-command; CAP-lineage-source-preservation; CAP-lineage-prework-lifecycle; CAP-lineage-decision-normalization; CAP-lineage-review-generation; CAP-lineage-gate-ownership | Testes direcionados e `npm test` concluem com exit code 0 após validar a cópia temporária do incidente real | Execução registrada dos testes focados, smoke da cópia e suíte completa |
| AC-lineage-017 | CAP-lineage-prework-lifecycle; CAP-lineage-gate-ownership | Para um mesmo snapshot, artifact validate, preflight, Gate C, handoff/workflow e feature close usam a mesma resolução de lifecycle/linhagem e não divergem entre VALID, READY e BLOCKED | Matriz integrada dos consumidores de `analyzeFeatureCompleteness` |
| AC-lineage-018 | CAP-lineage-gate-ownership | Gate C já aprovado não entra em deadlock quando o checkpoint best-effort está ausente e arquivos planejados como `create` já existem; a recuperação valida o estado sem apagar implementação nem fabricar evidência | Fixture post-Plan/post-DEV sem checkpoint + Gate C/preflight/workflow |
| AC-lineage-019 | CAP-lineage-migration-command; CAP-lineage-prework-lifecycle; CAP-lineage-review-generation; CAP-lineage-gate-ownership | Na cópia temporária de `project-squad-runtime`, 18/18 promessas e lifecycle permanecem intactos, a linhagem passa e todas as rotas oficiais convergem para a mesma próxima ação | Smoke reproduzível sobre o snapshot do incidente com hashes antes/depois |
| AC-lineage-020 | CAP-lineage-migration-command | Projeto inexistente, slug vazio, acima de 128 caracteres, fora do formato seguro, traversal, separador ou slug ausente do registry falham antes de qualquer leitura/escrita fora da raiz e sem stack trace bruto; URLs complementares são preservadas como texto e nunca acessadas | Testes negativos de limites/tipo/path traversal + filesystem sentinela fora da raiz |
