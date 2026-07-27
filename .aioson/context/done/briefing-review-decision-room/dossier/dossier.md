---
feature_slug: briefing-review-decision-room
schema_version: "1.2"
created_by: dossier-init
created_at: 2026-07-27T02:06:47.775Z
status: active
classification: MEDIUM
last_updated_by: dossier-init
last_updated_at: 2026-07-27T02:06:47.775Z
bootstrap_hash: 8bd0ffc108ea
---
## Why

Desenvolvimento assistido por LLM sem governança produz bases de código caóticas: arquivos monolíticos com milhares de linhas, pastas planas sem hierarquia semântica, código duplicado e nenhuma fase de design antes da implementação. O agente sabe *o que* fazer mas não tem contrato claro de *como organizar* — o resultado é um sistema que funciona mas não escala e não é mantível. O `@dev` e o `@deyvin` hoje implementam sem ler qualquer regra de estrutura de código, e o `@discovery-design-doc` existe mas está órfão — nunca é chamado em nenhum workflow.

## What

### Obrigatório 🔴
- **CLI AIOSON**: orquestração de agentes especializados via comandos `aioson workflow:next`, `aioson agent:done`, `aioson live:*`, `aioson runtime:emit`, etc.
- **SDD workflow com gates obrigatórios**: pipeline Spec-Driven com classificação MICRO/SMALL/MEDIUM determinando quais agentes são obrigatórios
- **Design-doc base permanente por projeto**: arquivo `.aioson/context/design-doc.md` fixo que define as regras de organização de código para o projeto — estrutura de pastas e subpastas, nomeclatura semântica (singular/plural, kebab-case), padrões de componentização, política de reuso, guideline de tamanho de arquivo (300–500 linhas recomendado; acima de 500 → agente deve emitir alerta explícito e propor alternativas concretas de split ou extração sem quebrar o sistema)
- **`@discovery-design-doc` como gate obrigatório em SMALL e MEDIUM**: integrado antes de `@dev` — lê o design-doc base + PRD + artefatos do `@architect` e gera um plano técnico concreto por feature (quais arquivos criar, onde exatamente, quais componentes existentes reusar, quais novos componentes pequenos criar)
- **`@dev` e `@deyvin` carregam design-doc como contexto obrigatório**: ambos os agentes de implementação leem o design-doc base antes de qualquer escrita de código — sem leitura do design-doc, não implementam
- **Runtime telemetry**: SQLite via better-sqlite3 para observabilidade de sessões no dashboard externo
- **Template AIOSON instalável**: estrutura distribuída via `aioson setup .` contendo agentes, skills, rules e locales

### Desejável 🟡
- **Task breakdown com paths exatos**: `@pm` inclui o path exato do arquivo em cada task gerada (ex: `src/components/auth/LoginForm.tsx`) em vez de descrições genéricas como "criar tela de login"
- **`@architect` gera scaffold inicial de pastas**: estrutura de diretórios sugerida como artefato explícito do `@architect` para projetos novos, alinhada com o design-doc base

## Code Map

```yaml
files: []
modules: []
patterns: []
```

## Rules & Design-Docs aplicáveis

_(populado via dossier:link-rule)_

## Agent Trail

- **2026-07-27T02:06:47.775Z** | @product | _prdGlobal_

<!-- sha256:ebf755a788317aa84c97dae6f59b4390885b57b04399d61406c858202032f06e -->
**2026-07-27T02:12:28.264Z** | @product | _What_

PRD created with five required capabilities; only confirmed applied review decisions and their cited sources become downstream authority; external design runtimes and live collaboration remain excluded.

<!-- sha256:a469f35beb40343a75426dddf73cbe1d173527064463f2404003dba9256ab88c -->
**2026-07-27T02:18:24.265Z** | @sheldon | _What_

PRD approved in place after adding the schema 1.2 cardinality, legacy recommendation, evidence trust and hash/archive authority rules. External design runtimes remain excluded; remaining delivery risk is browser-state compatibility.

<!-- sha256:30277595e71feaa8a80dc1572132dbfdbd3420f69273bcc57197ade7999ee53c -->
**2026-07-27T02:23:59.795Z** | @planner | _Code Map_

Plan: .aioson/context/implementation-plan-briefing-review-decision-room.md; production entry: src/commands/briefing.js; three vertical phases cover guided decisions/report authority, document/fallback UX, and Product-to-QA prompt propagation.

<!-- sha256:7fce67dc9b321d3b7dda620ce56337d363a844d0c5dcd24cab114ef128c4c52d -->
**2026-07-27T02:59:17.383Z** | @dev | _Agent Trail_

Implemented CAP-BRDR-01..05 and AC-BRDR-01..10 through the briefing:review/apply-feedback production path; schema 1.2 guided decisions, safe Markdown, exact archive/hash authority and Product-to-QA prompt trace. Verification: 58/58 focused, 63/63 affected plus syntax 477 files; browser smoke desktop and emulated 390px without page overflow. Full suite exposed one selector-metadata regression, fixed and rerun green in affected suite. Deviations: none.

<!-- sha256:f033d29d875268c6a0e28c560f1a3f98d45a72592c254db1ab773cacd422e442 -->
**2026-07-27T03:02:00.743Z** | @qa | _Agent Trail_

QA verdict: FAIL (attempt 1); strict AC audit covered 4/10 and found missing exact assertion-bearing bindings for AC-BRDR-02, 04, 07, 08, 09 and 10. Production smoke intentionally stopped at the first deterministic Gate D blocker. Owner: DEV bounded trace correction.

<!-- sha256:4183ee1515bd8b73b213ba8773432ecbcad6b578023e9ef9cb5b79f893e4115f -->
**2026-07-27T03:04:03.784Z** | @dev | _Agent Trail_

Bounded QA correction: exact assertion-bearing AC bindings added for AC-BRDR-02, 04, 07, 08, 09 and 10; strengthened native multiple-choice, document edit/read, fallback, focus/responsive and five-agent authority assertions. Focused tests 49/49; strict AC audit 10/10.

<!-- sha256:6c816b09d35f4997d04dfcd9c0015f5311da799901de9eae73b07e1aec23e0d7 -->
**2026-07-27T03:16:59.192Z** | @qa | _Agent Trail_

Final QA verdict: PASS. CAP/AC evidence 10/10, executed capabilities 5/5, focused suite 63/63, syntax 477 files, real briefing:review→390px Edge→apply-feedback smoke passed, delivery-assurance review PASS, Gate D technical npm run ci PASS in 284669ms. Blockers: none.

## Revision Requests

_(vazio)_
