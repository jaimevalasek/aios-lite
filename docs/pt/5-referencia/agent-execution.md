# Execução de agentes, faixas de desenvolvimento e modelos

O AIOSON usa `.aioson/context/agent-execution-{feature}.json` para executar uma tarefa delimitada por um host CLI e um modelo registrados. Esse manifesto é configuração de runtime, não outra especificação.

## Padrões

Um manifesto novo habilita somente:

- `dev`;
- `qa`.

`tester`, `pentester`, `validator` e todas as faixas de desenvolvimento começam desligados. A classificação MICRO/SMALL/MEDIUM nunca os habilita.

A rota canônica continua Product → Sheldon → Planner → DEV → QA. Faixas opcionais rodam dentro do DEV; revisores opcionais só podem rodar depois do QA quando estiverem explicitamente habilitados e tiverem um gatilho concreto.

## Comandos

```bash
aioson agent:execution:init . --feature=minha-feature --host=codex
aioson agent:execution:validate . --feature=minha-feature --json
aioson agent:execution:show . --feature=minha-feature --json
aioson agent:execution:dispatch . --feature=minha-feature --agent=qa
aioson agent:execution:dispatch . --feature=minha-feature --lane=backend
aioson agent:execution:resume . --feature=minha-feature
aioson agent:execution:status . --feature=minha-feature --json
```

A inicialização é create-once. Novos init, resume e seeds do workflow preservam byte por byte o manifesto que já pertence ao desenvolvedor.

## Schema v2: orquestração e Neural Chain

Manifestos novos usam a versão 2, enquanto a versão 1 continua aceita sem alteração. Os campos aditivos são:

- `orchestration.mode`: `autopilot` por padrão, ou `inherit` / `step_by_step` quando o desenvolvedor alterar;
- `orchestration.max_checkpoints`: orçamento do runner no Autopilot efetivo (padrão 10);
- `orchestration.stop_conditions`: motivos terminais explícitos;
- `chain_work_policy`: roteamento tipo→responsável, fallback de especialista, revalidação pelo QA e gate de itens acionáveis do DEV.

Itens de teste/segurança vão para Tester/Pentester apenas quando as entradas existentes desses especialistas estão habilitadas. Caso contrário retornam ao DEV. Isso nunca habilita um especialista opcional por classificação.

## Faixas de desenvolvimento

Use faixas somente quando o usuário ou o plano aprovado pedir hosts/modelos diferentes ou escopos separados.

```json
{
  "development_lanes": {
    "strategy": "split",
    "integration_owner": "dev",
    "lanes": {
      "backend": {
        "enabled": true,
        "host": "codex",
        "mode": "external",
        "model": "gpt-5.6-sol",
        "reasoning_effort": "high",
        "writable_roots": [],
        "prompt": ".aioson/context/execution-prompts/minha-feature/backend.md",
        "write_paths": ["src/api/**", "tests/api/**"],
        "fallbacks": [],
        "report": ".aioson/context/reports/minha-feature/{run_id}/dev-backend.json"
      },
      "frontend": {
        "enabled": true,
        "host": "opencode",
        "mode": "external",
        "model": "provider/model-id",
        "writable_roots": [],
        "prompt": ".aioson/context/execution-prompts/minha-feature/frontend.md",
        "write_paths": ["src/ui/**", "tests/ui/**"],
        "fallbacks": [],
        "report": ".aioson/context/reports/minha-feature/{run_id}/dev-frontend.json"
      }
    }
  }
}
```

`host` identifica um adaptador CLI registrado; `model` é o identificador de modelo/provedor aceito por esse host. Um modelo como Grok pode ser usado por um host compatível, como OpenCode; não é necessário criar agentes canônicos `@frontend` e `@backend`.

O DEV cria o prompt curto de runtime a partir do PRD e do plano aprovados, despacha as faixas habilitadas sequencialmente no worktree compartilhado, confere o diff contra `write_paths`, integra as fronteiras compartilhadas e roda a verificação completa. O relatório vincula a identidade da faixa e seus caminhos declarados.

Os hosts vêm de um registro único (`src/lib/tool-capabilities.js`, exposto por `aioson tool:capabilities --json`): Claude Code, Codex, OpenCode, Kimi Code e Qwen Code são despacháveis; Grok é conhecido só pela superfície interativa até ter um adaptador não-interativo. Um host novo precisa de adaptador para manter resolução de executável, capabilities, argumentos, redação e telemetria em modo fail-closed.

## Assinaturas de host

Uma assinatura é a prova, no nível da máquina, de que uma combinação `(host, modelo, effort)` realmente funciona aqui — CLI instalado, login válido, ID de modelo aceito, effort suportado — registrada antes de qualquer despacho, em vez de descoberta como `executable_not_found` / `auth` / `invalid_model` no meio de uma execução.

```bash
aioson host:signature . --host=kimi --model=kimi-k3
aioson host:signature . --host=codex --model=gpt-5.6 --effort=high --ttl=24
aioson host:signature . --host=kimi --model=kimi-k3 --status --json
aioson host:signature . --list --json
aioson agent:execution:validate . --feature=minha-feature --strict --json
```

A sonda monta exatamente o argv que o adaptador de execução usaria (mesmos flags não-interativos, modo read-only do provedor), roda num diretório temporário vazio com um prompt de uma palavra e classifica a saída pela normalização de erros do próprio adaptador. Nunca lê contexto de projeto e nunca escreve dentro de um projeto. O resultado fica em `~/.aioson/hosts/signatures.json` (override: `AIOSON_HOST_SIGNATURES`), chaveado por host, modelo e effort, com TTL (padrão 24h).

- Recusas são determinísticas a partir do registro: `unknown_host`, `unsupported_host_execution` (host só interativo), `effort_unsupported_by_host`, `invalid_reasoning_effort`.
- Resultados da sonda: `valid`, ou `invalid` com `executable_not_found` (trazendo o comando de instalação), `auth`, `invalid_model`, `capacity`, `timeout`, `crash`.
- `--status` e `--list` são somente leitura e sempre saem com 0; a resposta está no campo `state` (`valid | expired | invalid | missing`).
- `agent:execution:validate --strict` exige assinatura válida e não expirada para todo agente e faixa **habilitados** (entradas desligadas são ignoradas) e reporta fallbacks declarados sem assinatura como aviso. Sem `--strict`, o manifesto mantém o contrato `validated_at_dispatch` inalterado.

## Execução orquestrada (papéis, offer, compile)

O caminho orquestrado roda as faixas do planner como processos externos paralelos, cada um com o host/modelo de um **papel**. Ele é destravado por um único arquivo de projeto que o cliente desktop supervisor escreve depois de validar as assinaturas — o framework nunca o escreve e nunca o distribui em `template/`. Ausente, desligado ou inválido, a opção não existe e a rota de DEV único fica byte a byte como é hoje.

```json
// .aioson/config/execution-roles.json
{
  "version": 1,
  "source": "aioson-play",
  "enabled": true,
  "roles": {
    "backend_dev":  { "host": "codex", "model": "gpt-5.6",         "reasoning_effort": "high" },
    "frontend_dev": { "host": "kimi",  "model": "kimi-k3",         "reasoning_effort": null },
    "qa":           { "host": "claude", "model": "claude-sonnet-5", "reasoning_effort": null }
  },
  "parallel": { "max_concurrent_lanes": 2 },
  "on_unavailable": "ask",
  "execution": { "spawner": { "command": "cockpitctl", "args": ["unit", "spawn"] }, "unit_timeout_ms": 1800000 }
}
```

Papéis são snake_case: `{lane}_dev` (obrigatório por faixa), `qa` (o revisor de faixa, obrigatório), `{lane}_qa` (override opcional que herda de `qa`) e `integration_dev` (modelo opcional para a passada de integração). Hosts vêm do registro (`tool:capabilities`), effort só é aceito onde o host declara suporte, segredos são recusados.

```bash
aioson execution:offer . --feature=minha-feature --json      # disponível? (papéis + assinaturas; tabelas do plano; estado compilado)
aioson execution:compile . --feature=minha-feature --json    # tabelas + papéis → plano de execução, prompts, faixas do manifesto
aioson execution:compile . --feature=minha-feature --dry-run --json
aioson verify:artifact . --kind=execution-plan --slug=minha-feature
```

`execution:offer` responde `available` só quando o arquivo de papéis está presente, válido e habilitado **e** todo papel declarado tem assinatura válida e não expirada nesta máquina; caso contrário `reason` nomeia o primeiro bloqueio (`roles_file_missing | roles_disabled | roles_invalid | signature_missing | signature_expired | signature_invalid`). Sempre sai com 0 — é uma pergunta, não um gate.

A tabela `## Execution Sequence` pode trazer uma coluna opcional `Depends on`: nomes das fases de que esta fase precisa, cada um com um portão opcional — `(dev)` libera a dependente assim que o relatório do implementador daquela fase passou; sem sufixo (ou `(qa)`) quando a revisão de faixa dela terminou. Uma fase que declara dependências é escalonada por elas (pode começar enquanto o resto da onda anterior ainda roda); uma fase sem dependências mantém a barreira da onda. Dependências apontam para ondas anteriores e nunca para trabalho de integração; uma aresta entre faixas vira aviso (`dependency_cross_lane_without_contract`) quando o PRD não tem seção `## Interface Contract`. O plano compilado carrega `edges[]`, `units[].depends_on` e `scheduling: waves | dependencies`; achados: `dependency_unknown`, `dependency_self`, `dependency_wave_violation`, `dependency_on_integration`, `cycle_detected`.

`execution:compile` lê as tabelas `## Development execution lanes` e `## Execution Sequence` do plano e recusa com achados nomeados, sem escrever nada:

| Achado | Significado |
|---|---|
| `lanes_table_missing`, `lanes_table_invalid`, `no_wave_column` | as tabelas do planner estão ausentes ou não parseiam |
| `lane_write_paths_overlap`, `unsafe_path`, `lane_id_invalid`, `too_many_lanes` | faixas não são disjuntas, escapam do projeto ou excedem o limite do manifesto |
| `phase_mixed_ownership` | uma fase toca arquivos de duas faixas (ou de uma faixa mais arquivos sem dono) — divida-a, ou mova os arquivos compartilhados para uma onda solo posterior do dev |
| `wave_file_overlap` | duas fases da mesma onda compartilham um arquivo |
| `integration_before_lanes`, `no_lane_units` | trabalho de integração (arquivos fora de toda faixa) agendado antes das ondas de faixa, ou nenhuma fase cai numa faixa |
| `lane_without_role`, `qa_role_missing`, `role_signature_missing|expired|invalid` | o arquivo de papéis não tem o `{lane}_dev` da faixa, não tem revisor, ou o papel não está assinado aqui (cada um traz a dica do `host:signature`) |
| `dev_kernel_missing`, `dev_profile_sections_missing` | o `.aioson/agents/dev.md` instalado está ausente ou perdeu as seções das quais o perfil de faixa deriva |

Em sucesso escreve `.aioson/context/execution-plan-{slug}.json` — unidades (fase × faixa, ou integração do dev), ondas, capacidades/critérios de aceite/comandos de verificação por unidade, os papéis por faixa e os digests de tudo de que foi compilado — mais um prompt por unidade de faixa e por faixa em `.aioson/context/execution-prompts/{slug}/`, e atualiza **somente** `development_lanes` (estratégia `split`, as faixas compiladas com seu bloco `qa`, faixas que saíram do plano desligadas) e `orchestration.execution: orchestrated` no manifesto. Todo o resto do manifesto — agentes da sessão, política de capacidade, fallbacks declarados, caminhos de relatório customizados, um `qa.max_fix_files` do operador — é preservado.

O prompt de uma unidade é o **perfil dev-lane** (as seções `## Implementation strategy` e `## Execution invariants` extraídas do `dev.md` instalado, mais as regras de faixa: nenhum comando de posse de estágio, só os arquivos da unidade, verificação real, o relatório JSON vinculado) seguido do contrato da unidade e das linhas do PRD/plano das capacidades daquela unidade — nunca os documentos inteiros. Avisos (`lane_role_mismatch`, `self_review_same_model`, `cap_without_unit`, `unit_without_cap`, `prd_missing`, `lane_without_units`, `active_run_state`) ficam registrados no plano e nunca bloqueiam.

`verify:artifact --kind=execution-plan` é o gate de frescor: falha quando o plano, o arquivo de papéis, as faixas do manifesto, um prompt gerado ou uma assinatura de host deixaram de corresponder ao compilado (`plan_digest_stale`, `roles_changed`, `manifest_lanes_diverged`, `prompt_stale`, `signature_missing`) e avisa quando o kernel do dev mudou desde então (`dev_profile_stale`). Dispara automaticamente no `agent:done` do planner e fica em silêncio para features que nunca compilaram um plano.

### Roteamento

A cadeia canônica não muda (`@product → @sheldon → @planner → @dev → @qa`); o caminho orquestrado é servido por pinos e gates determinísticos dentro do `workflow:next`, então um projeto que nunca o destravou recebe prompts byte a byte idênticos:

- **Ativação do planner** — quando `execution:offer` responde `available` (arquivo de destravamento + todo papel assinado), o contexto de ativação pina a oferta (papéis, a escolha de uma pergunta só, o comando de compile) e, quando existe plano compilado, se está fresco ou obsoleto. Nada é pinado caso contrário.
- **Conclusão do planner** — com `orchestration.execution: orchestrated` no manifesto, `workflow:next --complete=planner` é **bloqueado** com plano compilado ausente ou obsoleto (`[Execution Plan BLOCKED]` … `aioson execution:compile`). É o gate "não roda sem modelos por papel", no motor.
- **Ativação do DEV / @orchestrator** — com o manifesto orquestrado, o contexto de ativação pina o estado do run (`compiled, not started` / decisões pendentes com suas dicas / `completed` com as unidades de integração) e aponta para o doc roteado `.aioson/docs/dev/execution-lanes.md` § Compiled orchestrated execution, que carrega o protocolo (`execution:run` → `execution:decide` → `--resume` → `execution:status` → integrar → concluir DEV como sempre). `@orchestrator` segue como desvio explícito cujo kernel roda o mesmo motor e entrega o ledger ao `@dev`.
- **Conclusão do DEV** — resumo `execution` advisory no resultado quando as faixas compiladas nunca rodaram até o fim (`run: not_started | decision_required | …`); nunca bloqueia.

### Rodando o plano (`execution:run`, `execution:decide`, `execution:status`, `execution:graph`)

```bash
aioson execution:graph . --feature=minha-feature                    # o grafo compilado (ascii); --format=mermaid|json; estado do run por cima
aioson execution:run . --feature=minha-feature --preflight --json   # só o preflight determinístico
aioson execution:run . --feature=minha-feature                      # linhas ao vivo no stdout; --json move-as para stderr
aioson execution:decide . --feature=minha-feature --unit=phase-2 --choice=fallback:qwen/qwen-3.8-max
aioson execution:run . --feature=minha-feature --resume
aioson execution:status . --feature=minha-feature --json
```

O run segura o lease de dispatcher da feature durante toda a vida (um `agent:execution:dispatch` direto não se intercala) e escalona as unidades de faixa por **prontidão**: uma unidade começa quando toda regra de passagem que chega nela está satisfeita — suas arestas explícitas `Depends on` (`after_dev`: o implementador da dependência passou; `after_qa`: a revisão de faixa dela terminou, ou a unidade foi pulada por decisão) ou, para uma unidade sem arestas, a barreira da onda (toda unidade de faixa de toda onda anterior terminou). Sem arestas explícitas é exatamente o run onda a onda; com elas, uma unidade deixa de esperar a unidade mais lenta da onda anterior da qual não depende. `execution:graph` desenha os nós, as arestas explícitas e as arestas implícitas da barreira, com o estado do run por cima. Cada unidade de faixa é um pipeline `dev → qa`: o papel dev da faixa roda a unidade como processo externo efêmero com `sandbox_mode: workspace-write` (os flags não assistidos do registro — `codex exec --sandbox workspace-write`, nunca o bypass de aprovações), escreve o relatório JSON vinculado e morre; o papel qa da faixa então revisa e testa com o **perfil qa-lane** (o `## Risk-first checklist` extraído do `qa.md` instalado mais as regras de revisão), pode corrigir no máximo `qa.max_fix_files` arquivos entre os arquivos da própria unidade e relata o resto como achados. Correções são **medidas**, não confiadas: a árvore é fotografada antes e depois da revisão (git; sem git a revisão roda mesmo assim e a medição é reportada como ausente) — arquivo da unidade alterado que o revisor não listou é `undeclared_correction`, mais arquivos da unidade alterados que o teto é `corrections_cap_exceeded`; por janela de unidade (do início ao fim do seu pipeline), arquivo alterado dentro dos write paths de uma faixa mas fora de toda unidade ativa naquela janela é `lane_scope_drift`, e fora de toda faixa é `unowned_change` (cada um reportado uma vez por run). Até `parallel.max_concurrent_lanes` pipelines rodam ao mesmo tempo. Unidades de integração (arquivos fora de toda faixa) nunca são spawnadas: o run termina `completed` com elas listadas para o DEV da sessão.

Nada decide em silêncio. Uma unidade cujo papel dev não consegue iniciar (`executable_not_found`, `auth`, `capacity`, `invalid_model` …), estoura o tempo, quebra, não escreve o relatório vinculado ou reporta `FAIL`/`BLOCKED` — ou cujo revisor não consegue rodar — deixa um `decision_required` em `.aioson/context/execution-state-{slug}.json` e um evento `decision_required` na telemetria de execução daquela unidade (`agent_execution_events`, a tabela que um cliente supervisor já consulta); as outras unidades da onda terminam e o run pausa com `status: decision_required`. `execution:decide` responde por unidade — `retry`, `fallback:<host>/<modelo>[/<effort>]` (o fallback precisa de assinatura de host válida), `skip` (estágio dev: o dono da integração implementa, registrado como `unit_skipped`), `skip-qa` (estágio qa: registrado como `qa_skipped`), `abort` — e registra a decisão (`decision_applied`); `execution:run --resume` continua de forma idempotente: unidades aprovadas nunca rodam de novo, e um plano ou manifesto alterado desde o início do run recusa com `run_state_stale` (`--fresh` recomeça). Uma revisão reprovada (veredito `FAIL`) é achado para a integração, não bloqueio.

Vida é medida, não declarada: cada processo de unidade envia sua saída para a telemetria, e uma unidade sem saída **e** sem mudança de arquivo sob os write paths da faixa por `stallMs` (padrão 5 min) é marcada `stalled` (evento, linha ao vivo, flag no estado) — nunca silêncio. O canal ao vivo é o fluxo do motor de uma linha por evento (`[execution] wave 1 · phase-2 · dev started kimi/kimi-k3`), independente de o CLI do host transmitir algo.

`execution:status` é o ledger consolidado: resumo do run, ondas, status dev/qa por unidade com hosts, vereditos, caminhos de relatório, correções e achados (dev, qa e nível de run), decisões pendentes com suas dicas, unidades de integração, `resume_command`.

### A costura do cliente — `execution.spawner` (a unidade como terminal do cliente)

Por padrão o motor spawna ele mesmo a CLI do host de cada unidade, e o processo fica invisível para quem supervisiona a sessão. Um cliente que possui terminais — uma IDE desktop, um cockpit de missões — pode assumir o **spawn** sem assumir o motor: declara um spawner (`execution.spawner` no arquivo de papéis, ou `AIOSON_EXECUTION_SPAWNER` no ambiente da sessão — o ambiente vence, é a dica do cliente que possui o PTY da sessão) e, para cada unidade, o motor entrega a esse comando um envelope JSON no stdin em vez de spawnar o host:

```json
{ "version": 1, "action": "spawn", "feature": "my-feature", "run_id": "…", "attempt_id": "…",
  "unit": "phase-1", "lane": "backend", "wave": 1, "role": "dev",
  "host": "codex", "model": "gpt-5.6", "reasoning_effort": "high",
  "cwd": "/project", "prompt_path": ".aioson/context/reports/my-feature/<run_id>/phase-1.prompt.md",
  "report_path": ".aioson/context/reports/my-feature/<run_id>/phase-1.json",
  "write_paths": ["src/api/**"], "writable_roots": [], "timeout_ms": 1800000,
  "command": "codex", "args": ["exec", "--sandbox", "workspace-write", "…"], "prompt_stdin": true, "sandbox_mode": "workspace-write" }
```

O cliente abre o processo onde quiser (um terminal no grid, uma aba), alimenta-o com o arquivo de prompt (ou roda o `command`/`args` de referência de forma não interativa) e responde uma linha JSON — `{"ok": true, "session_id": "…", "pid": 123}` — e retorna. O motor mantém todo o resto: espera o **relatório vinculado** em `report_path` (o único "pronto" em que confia), mede stall por mudança de arquivos sob os write paths da faixa, registra o `session_id` na unidade (estado, `execution:status`) e, em abort ou quando o orçamento da unidade expira, pede ao cliente que feche a sessão (`{"action": "close", "session_id": "…", "reason": "timeout"}`, best effort). Spawner fora da PATH falha o preflight (`spawner_not_found`); spawner que recusa, quebra ou responde sem `ok: true` deixa o `decision_required` da unidade (`spawner_failed`), exatamente como um host que não consegue rodar. `unit_timeout_ms` (1 min – 4 h) vale 30 minutos por padrão quando há spawner — humanos assistem terminais — e 10 minutos caso contrário. `execution:offer` reporta `execution.spawner_supported` e o spawner em vigor, para o cliente detectar a costura. Nada do cliente vaza para o motor — um comando, um envelope entrando, uma linha saindo — e o envelope não carrega segredos.

## Fallback somente explícito

CLI ausente, capability incompatível ou modelo indisponível pausa a execução. O modelo do chat atual nunca pode imitar silenciosamente o modelo solicitado.

Um fallback só roda quando a entrada e a política global o autorizam:

```json
{
  "fallbacks": [
    {
      "host": "codex",
      "model": "configured-default",
      "on": ["unavailable", "capacity"]
    }
  ],
  "capacity_policy": {
    "strategy": "fallback",
    "max_attempts": 2,
    "backoff_ms": 0,
    "allow_cross_host": true
  }
}
```

Sem essa declaração, o estado fica `paused` e traz um comando de retomada.

## Resolução e vínculo do relatório

Nomes de modelos Codex são resolvidos de forma conservadora pelo catálogo local: slug exato, nome normalizado, alias único e correção curta limitada. Versões numéricas nunca mudam. Outros hosts aceitam IDs literais seguros quando não possuem catálogo.

Estado, relatório e telemetria preservam:

- modelo solicitado e resolvido;
- estratégia de resolução;
- reasoning effort quando suportado;
- host e histórico de fallback;
- feature, run, tentativa, agente/faixa, raízes graváveis e caminhos declarados.

Relatórios que não correspondem à tentativa registrada são recusados.

## Política de revisão

`aioson verification:plan . --feature=minha-feature --trigger=per-phase` não roda revisor por padrão. Em `end-of-feature`, somente QA é padrão. Tester, Pentester e Validator só rodam automaticamente quando sua entrada no manifesto estiver habilitada e o gatilho correspondente existir. Uma chamada direta do usuário ativa apenas aquele passe do especialista e não altera o manifesto nem habilita execuções futuras.

Antes de Tester/Pentester editar produção, seu relatório precisa declarar `allowed_fix_paths`. O `review-cycle:advance` aceita no máximo 3 paths de comportamento/5 totais e captura o baseline Git. Se o especialista estiver desligado e o passe foi pedido diretamente pelo usuário, o comando exige `--manual`. O `review-cycle:resolve` só devolve ao QA quando o diff líquido respeita os paths persistidos; caso contrário retorna `stop_scope_violation` e transfere o pacote completo ao DEV.
