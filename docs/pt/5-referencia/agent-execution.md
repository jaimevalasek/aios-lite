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
