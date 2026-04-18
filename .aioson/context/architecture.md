---
feature: pentester-agent
classification: MEDIUM
created_at: 2026-04-17
gate_design: approved
---

# Architecture — Pentester Agent

## 1. Architecture overview

`@pentester` entra no AIOSON como um agente de revisao adversarial guiado por contrato, e nao como uma persona de "hacker livre". A Fase 1 deve adicionar um artefato canonico de findings e uma superficie minima de agente/manifest, reaproveitando o workflow kernel, handoff contracts e autonomy policy existentes em vez de criar um motor paralelo de seguranca.

O desenho precisa permanecer compativel com o perfil atual do projeto: CLI Node.js, sem banco de aplicacao e com telemetria/runtime ja centralizados no motor atual.

## 2. Folder/module structure

```text
.aioson/
  agents/
    pentester.md
    pentester.manifest.json
  context/
    architecture.md
    spec-pentester-agent.md
    security-findings-{slug}.json
  plans/
    pentester-agent/
      manifest.md
      plan-*.md

src/
  agent-loader.js
  autonomy-policy.js
  context-writer.js
  handoff-contract.js
  handoff-validator.js
  session-handoff.js
  runtime-store.js
  commands/
    preflight-context.js
    context-pack.js
    implementation-plan.js
    spec-checkpoint.js
    workflow-next.js
    runtime.js
    qa-*.js
```

Decisoes estruturais:
- A Fase 1 nao cria um novo subsistema em `src/` so para o `@pentester`.
- O contrato do agente vive em `.aioson/agents/` porque esta e a fronteira canonica dos prompts/manifests no AIOSON.
- O artefato canonico vive em `.aioson/context/` porque precisa ser consumivel por `@dev`, `@qa` e pelo workflow sem depender de runtime SQLite.
- Comandos `pentest:*` ficam deferidos para a Fase 3 e so entram se os comandos existentes nao cobrirem o fluxo com confiabilidade suficiente.

## 3. Migration order

Nao ha migracoes de banco nesta feature. A ordem de entrega e de artefatos/modulos:

1. Criar `@pentester` em `.aioson/agents/pentester.md`.
2. Criar `pentester.manifest.json` com autonomia conservadora.
3. Introduzir o envelope canonico `.aioson/context/security-findings-{slug}.json`.
4. Adicionar serializacao/validacao leve para esse artefato com reaproveitamento de `src/context-writer.js` e utilitarios de contexto, sem um novo framework.
5. Atualizar `@dev` e `@qa` para consumirem o artefato e ownership dos findings.
6. Integrar workflow/handoff/gates apenas na Fase 3.
7. Adicionar avaliacoes e benchmarks apenas na Fase 4.

## 4. Models and relationships

As entidades do `@analyst` permanecem como fonte de verdade:

- `pentester-review-contract`
- `threat-surface-entry`
- `security-finding`

Relacionamentos:
- Um `pentester-review-contract` pertence a uma feature e referencia o mesmo `feature_slug` do spec.
- Um `pentester-review-contract` agrega varias `threat-surface-entry`.
- Cada `threat-surface-entry` pode gerar zero ou varios `security-finding`.
- Cada `security-finding` referencia superficies e artefatos reais do workspace via `affected_artifacts[]`.

Empacotamento canonico:

```json
{
  "version": 1,
  "feature_slug": "pentester-agent",
  "review_contract": {},
  "threat_surfaces": [],
  "findings": []
}
```

Esse envelope unico preserva o path autoritativo definido em Gate A, evita espalhar estado por varios arquivos e continua respeitando as entidades do `@analyst` sem redesenha-las.

## 5. Integration architecture

### Agent loading
- `src/agent-loader.js` continua sendo a entrada para prompt + manifest do novo agente.
- `pentester.manifest.json` deve declarar capabilities explicitas de revisao adversarial e `autonomy_modes` conservadores.
- Decisao de Gate B: o manifest inicial deve limitar `@pentester` a `["guarded"]`.

### Autonomy and trust boundaries
- `src/autonomy-policy.js` e `.aioson/config/autonomy-protocol.json` continuam sendo a fronteira de permissao efetiva.
- O prompt do `@pentester` nao substitui policy do runtime: alvos remotos, terceiros, producao e acoes destrutivas seguem proibidos mesmo se o usuario tentar pedir.

### Handoff and workflow
- `src/commands/workflow-next.js` permanece como kernel unico de workflow.
- `src/handoff-contract.js`, `src/handoff-validator.js` e `src/session-handoff.js` devem tratar o artefato de findings como artefato explicito quando a Fase 3 integrar seguranca ao handoff.
- Nao criar um segundo fluxo de seguranca fora do workflow oficial.

### QA and development consumption
- `.aioson/agents/dev.md` deve consumir findings com `recommended_owner = dev` sem reinterpretar severidade.
- `.aioson/agents/qa.md` deve consumir `recommended_gate_status` para consolidar risco e eventual bloqueio.
- `src/commands/qa-*.js` sao os pontos naturais para ingestao automatizada futura.

### Tool-first support
- A Fase 2 deve reutilizar `preflight-context`, `context-pack`, `implementation-plan`, `spec-checkpoint` e `workflow:next --status` antes de criar comandos novos.
- O objetivo e mover calculo deterministico para o CLI e deixar o modelo lidar apenas com julgamento tecnico residual.

### Runtime evidence
- `src/commands/runtime.js` e `src/runtime-store.js` podem registrar referencias e milestones.
- Evidencia de finding confirmado nao deve ficar soterrada apenas em log/runtime; o artefato JSON continua sendo a fonte de verdade.

## 6. Cross-cutting concerns

### Security and scope control
- Escopo operacional: apenas workspace local, fixtures, mocks e artefatos controlados.
- Sem probing externo, sem varredura em producao, sem targets de terceiros.
- Manifest, handoff, protocol contract, secrets e runtime permissions sao superficies de seguranca de primeira classe.

### Validation
- Findings `high` e `critical` exigem `preconditions`, `reproduction_steps`, `evidence`, `impact` e `safe_to_reproduce=true`.
- Quando isso faltar, o finding permanece em `needs_validation`.
- `affected_artifacts[]` deve apontar para paths reais; descricao abstrata sozinha nao basta.

### Logging and observability
- Runtime/devlog servem para rastreabilidade de sessao.
- O artefato canonico serve para consumo de produto/engenharia.
- Nao duplicar classificacao de risco em varios lugares sem necessidade.

### Error handling
- JSON invalido, ownership ausente ou superficies obrigatorias faltando devem falhar validacao do artefato.
- Em Fase 1, a falha bloqueia a conclusao do proprio slice.
- Em Fase 3, a falha passa a bloquear handoff/gate.

### Compatibility
- O fluxo precisa continuar funcionando em direct mode, sem depender de aioson runtime ativo.
- Nenhuma parte do V1 deve exigir UI, dashboard ou browser.

## 7. Phase-by-phase architecture map

### Phase 1 — contract-and-threat-model

Aplicacao arquitetural desta fase:
- Criar `pentester.md` e `pentester.manifest.json`.
- Fixar o envelope `.aioson/context/security-findings-{slug}.json`.
- Representar `review_contract`, `threat_surfaces` e `findings` no mesmo path autoritativo.
- Tratar `src/autonomy-policy.js`, `src/handoff-contract.js`, `src/session-handoff.js`, `src/commands/workflow-next.js` e arquivos em `.aioson/agents/` como superficies auditaveis.

### Phase 2 — tool-first-agent-upgrades

Aplicacao arquitetural desta fase:
- Atualizar prompts de `@analyst`, `@architect` e `@dev` para usarem comandos existentes antes de expandir raciocinio em prompt.
- Reaproveitar `src/commands/preflight-context.js`, `src/commands/context-pack.js`, `src/commands/implementation-plan.js`, `src/commands/spec-checkpoint.js` e `workflow-next --status`.
- Criar comando novo apenas onde houver lacuna real, nao por preferencia arquitetural.

### Phase 3 — runtime-security-and-gates

Aplicacao arquitetural desta fase:
- Inserir ponto claro de entrada do `@pentester` no workflow oficial.
- Levar `security-findings-{slug}.json` para handoff/gate de forma machine-readable.
- Integrar `src/handoff-contract.js`, `src/handoff-validator.js`, `src/session-handoff.js`, `src/commands/workflow-next.js` e `src/commands/qa-*.js`.
- So criar `src/commands/pentest-*.js` se o fluxo nao puder ser composto de forma confiavel com os comandos atuais.

### Phase 4 — evals-and-feedback-loops

Aplicacao arquitetural desta fase:
- Adicionar suites de abuso reproduzivel e comparativos prompt-only vs command-assisted.
- Medir falso-positivo, reprodutibilidade e ganho de contexto/tokens.
- Reaproveitar runtime/relatorios e enriquecer os documentos de analysis em `researchs/`.

## 8. Implementation sequence for `@dev`

1. Implementar `.aioson/agents/pentester.md` com escopo local/controlado e playbooks por superficie.
2. Implementar `.aioson/agents/pentester.manifest.json` com `autonomy_modes: ["guarded"]`.
3. Implementar o envelope `.aioson/context/security-findings-{slug}.json` e sua validacao minima.
4. Produzir fixture/exemplo de um review contract com threat surfaces e findings vazios ou de teste seguro.
5. Atualizar `@dev` e `@qa` para consumirem o artefato e ownership.
6. Deixar workflow insertion, auto-trigger e comandos `pentest:*` fora deste slice.

## 9. Explicit non-goals / deferred items

- Internet publica, dominios de terceiros e qualquer alvo fora do workspace local.
- Acao destrutiva, exploit ativo ou scanning ofensivo real.
- Novo banco, novas tabelas ou armazenamento paralelo ao contexto do projeto.
- Segundo motor de workflow para seguranca.
- Gate D bloqueante por findings na Fase 1.
- Familia de comandos `pentest:*` antes da Fase 3.
- Handoff para `@ux-ui`: nao se aplica aqui porque `project_type=script` e a feature nao introduz superficie visual.

> **Gate B:** Architecture approved — @dev can proceed.
