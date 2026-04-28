---
feature: feature-dossier
status: in_progress
started: 2026-04-28
classification: MEDIUM
schema_version: "1.0"
---

# Spec — Feature Dossier & Reverse Invocation

## What was built
[To be filled by @dev during implementation]

## Entities added (from requirements-feature-dossier.md § 2)

- **Dossier** — `.aioson/context/features/{slug}/dossier.md` (Markdown + frontmatter YAML + bloco `## Code Map` YAML embutido)
- **Revision** — entrada em `.aioson/context/features/{slug}/revisions.json`
- **CodeMapEntry** — entradas `files[]`, `modules[]`, `patterns[]` em `## Code Map`
- **AgentFinding** — entrada append-only em `## Agent Trail`
- **RuleLink** — entrada em `## Rules & Design-Docs aplicáveis`
- **GateRevisionRound** — campo `gate_revision_rounds` em `workflow.state.json`

Modificações em entidades existentes:
- `handoff-contract.json` ganha `dossier_uri`, `pending_revisions_count`, `blocking_revisions` (opcionais, backwards-compat).
- Diretórios `.aioson/context/features/{slug}/` (criação) e `.aioson/context/done/{slug}/dossier/` (archive target).

## Key decisions

- [2026-04-27] Path B (plano faseado externo) sobre in-place enrichment — sizing score 9 (sheldon).
- [2026-04-27] `code_map` é YAML embutido em `dossier.md`, não arquivo separado — atomicidade + menor file count.
- [2026-04-27] `revisions.json` é fonte de verdade (file-first, `disk-first-artifacts.md`); SQLite é mirror para dashboard.
- [2026-04-27] Modo SUGERIDO para invocação reversa (não automático) — LLMs fracos podem gerar falso-positivo.
- [2026-04-27] Anti-loop: 3 ciclos por gate; `--force-revision` exige confirmação humana.
- [2026-04-27] Gates aprovados permanecem aprovados durante revisão reversa; re-execução append `revision_round` (não rewind).
- [2026-04-27] Dossier é fonte VIVA por-feature; `context-pack` faz SNAPSHOT no início da sessão (resolve dual-source vs. active retrieval).
- [2026-04-27] Bootstrap retroativo INCLUÍDO (Fase 3) — `dossier:init --from-existing` para adoção incremental.
- [2026-04-27] Auto-compaction a 15KB; seções de gates encerrados migram para `dossier-history.md`.
- [2026-04-28] Permission model: qualquer agente da cadeia pode abrir revision contra qualquer outro (default aprovado pelo user).
- [2026-04-28] `--slug` default infere de `workflow.state.json#featureSlug` (default aprovado).
- [2026-04-28] `feature:close --verdict=PASS` bloqueia se houver `pending_user_approval` (default aprovado).
- [2026-04-28] `dossier:add-finding` com hash duplicado é no-op silencioso (default aprovado).

## Edge cases handled

Ver requirements-feature-dossier.md § 7 (16 edge cases mapeados, EC-1 a EC-16).

## Dependencies

**Reads:**
- `.aioson/context/prd-{slug}.md` — extração de Why/What no `dossier:init`
- `.aioson/context/spec-{slug}.md` — referência por path no dossier
- `.aioson/context/requirements-{slug}.md` — referência por path no dossier
- `.aioson/context/handoff-protocol.json` — leitura de estado atual
- `.aioson/context/workflow.state.json` — slug ativo + gate_revision_rounds
- `.aioson/rules/*.md` + `.aioson/design-docs/*.md` — validação de paths em `dossier:link-rule`
- `.aioson/context/done/{slug}/` — fonte do `dossier:init --from-existing`

**Writes:**
- `.aioson/context/features/{slug}/dossier.md`
- `.aioson/context/features/{slug}/revisions.json`
- `.aioson/context/features/{slug}/dossier-history.md` (sob demanda, Fase 3)
- `.aioson/context/features/{slug}/.dossier.lock` (transitório)
- `.aioson/context/done/{slug}/dossier/` (archive target)
- `.aioson/context/handoff-protocol.json` (extensão de campos)
- `.aioson/context/workflow.state.json` (campo `gate_revision_rounds`)
- `.aioson/runtime/aios.sqlite` (mirror via `runtime:emit`, não fonte de verdade)
- `.aioson/docs/dossier/schema.md` + `agent-templates.md` (uma vez na instalação)

**Modifies:**
- Prompts de agentes em `.aioson/agents/*.md` (Fase 1: 3 agentes; Fases 2-3: 8 agentes da cadeia MEDIUM)
- `src/lib/handoff-contract.js` (extensão backwards-compat)
- `src/commands/workflow.js` (consulta de blocking_revisions)
- `src/commands/feature.js` (extensão archive)
- `src/lib/active-retrieval.js` (commit 5cc7074 — inclusão de dossier ativo no ranking)

**Novos módulos previstos:**
- `src/lib/dossier-store.js` — io layer
- `src/lib/revision-store.js` — CRUD de revisions.json + atualização do dossier
- `src/lib/codemap-store.js` — CRUD do code_map embutido
- `src/lib/dossier-bootstrap.js` — síntese a partir de artefatos existentes
- `src/lib/dossier-compact.js` — algoritmo de compaction
- `src/commands/dossier.js` — sub-commands init, show, add-finding, add-codemap, link-rule, compact
- `src/commands/revision.js` — sub-commands open, list, resolve

## Notes

- `@architect` precisa atacar pendências de § 11 do requirements (drift detection, interação revision↔gate-approve, env var de revision-context, algoritmo de compaction concreto, migration path v1.0→v1.1).
- Conformance machine-readable em `.aioson/context/conformance-feature-dossier.yaml` — fonte autoritativa para `@dev` e `@qa` durante implementação e verificação.
- Handoffs históricos em `.aioson/context/done/*/` são imutáveis e nunca migrados — testar backwards-compat com 6 contracts existentes (sdlc-process-upgrade, pentester-agent, harness-driven-aioson, cypher-agent, design-governance, context-archive-done).
- Workflow state atual desalinhado: `workflow.state.json` aponta `sdlc-process-upgrade` em `@qa`. Não bloqueia esta análise mas precisa ser resolvido antes de `workflow:next` para feature-dossier.
