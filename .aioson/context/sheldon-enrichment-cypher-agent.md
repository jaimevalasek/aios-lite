---
prd: prd-cypher-agent.md
last_enriched: "2026-04-10"
enrichment_rounds: 1
plan_path: .aioson/plans/cypher-agent/manifest.md
sizing_score: 8
sizing_decision: phased_external
readiness: ready_for_downstream
readiness_notes: ""
gray_areas_extracted: true
gray_areas_decided: 4
---

# Sheldon Enrichment Log — @cypher Agent

## Rodada 1 — 2026-04-10

### MERs utilizados
Nenhum MER disponível.

### Fontes usadas
- [Regra] `.aioson/rules/data-format-convention.md` — universal, sem campo `agents:`
- [CLI] `src/commands/brief-gen.js` — descoberta de sistema existente, evitou conflito de naming
- [Skill] `.aioson/skills/static/web-research-cache.md` — protocolo de pesquisa para @cypher
- [Skill] `.aioson/skills/process/aioson-spec-driven/references/hardening-lane.md` — skill de gaps para @cypher
- [Skill] `.aioson/skills/process/aioson-spec-driven/references/sheldon.md` — padrão de enriquecimento

### Melhorias aplicadas
- Formato `config.md` → YAML frontmatter + tabela narrativa (conflito com data-format-convention resolvido)
- `briefings.md` internal structure → 8 seções obrigatórias definidas
- @analyst adicionado como consumidor de briefings (nova camada de validação de coerência)
- @dev explicitamente excluído do acesso a briefings (out of scope)
- Modo conversacional → @cypher oferece construir briefing via conversa quando plans/ está vazia
- `briefing:unapprove` → novo comando CLI com checkbox list
- Nota de distinção → `brief:gen` vs `briefings` @cypher documentada
- Plano de 3 fases criado em `.aioson/plans/cypher-agent/`

### Melhorias descartadas pelo usuário
Nenhuma.

### Decisão de sizing
Score: 8 → phased_external
Justificativa: 7 fluxos (+4), 3 fases (+4), sem integrações externas novas, ACs ~27 total.

## Decisões tomadas

> Downstream agents devem respeitar estas decisões sem re-perguntar.

| # | Gray Area | Decisão | Razão |
|---|-----------|---------|-------|
| 1 | Formato config.md | YAML frontmatter + tabela Markdown narrativa | Regra data-format-convention: agentes leem YAML, humanos leem tabela |
| 2 | @product check scope | Só quando `.aioson/briefings/` existe | Zero overhead para projetos sem @cypher |
| 3 | Múltiplos briefings aprovados em @product | Lista todos os approved não implementados | Usuário pode ter N briefings para escolher |
| 4 | briefing:approve UX | Interativo (biblioteca a definir por @analyst) | Usuário descreveu checkboxes, implica interatividade |
| 5 | @dev acessa briefings? | Não — out of scope explícito | Evitar confusão com arquivos irrelevantes para implementação |
| 6 | @analyst acessa briefings? | Sim — camada de validação de coerência | PRD ↔ briefing original deve ser consistente |
| 7 | Modo conversacional | Ativado quando plans/ vazia ou sem arquivos relevantes | @cypher não deve bloquear por falta de arquivos |
| 8 | `briefing:unapprove` | Comando CLI com checkbox dos approved não implementados | Usuário precisa reverter aprovação para continuar refinando |
