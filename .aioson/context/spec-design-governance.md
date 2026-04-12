---
feature: design-governance
status: in_progress
started: 2026-04-12
spec_version: 1
phase_gates:
  requirements: approved
  design: skipped
  plan: approved
last_checkpoint: null
pending_review: []
---

# Spec — Design Governance

## O que foi construído
- `template/.aioson/context/design-doc.md` — template base com 5 seções obrigatórias criado e sincronizado para `.aioson/context/design-doc.md`
- `@discovery-design-doc` — redefinido como gate pré-dev SMALL/MEDIUM: lê design-doc base, cria-o se ausente, produz plano técnico com paths exatos
- `@dev` — Design-doc pre-flight (SMALL/MEDIUM) + Protocolo de alerta de tamanho de arquivo (>500 linhas, não-bloqueante)
- `@deyvin` — mesmas adições com variação pair mode (alerta informativo, sem aguardar confirmação)
- Sync via `npm run sync:agents` propagou todas as mudanças para `.aioson/agents/`

## Entidades adicionadas

**Novos artefatos:**
- `template/.aioson/context/design-doc.md` — template base de governança de design (distribuído via `aioson setup .`)

**Agentes modificados:**
- `.aioson/agents/discovery-design-doc.md` — redefinido como gate pré-dev que gera plano técnico por feature
- `.aioson/agents/dev.md` — pré-voo obrigatório de leitura do design-doc + protocolo de alerta de 500 linhas
- `.aioson/agents/deyvin.md` — idem, com variação para pair mode

**Template sincronizado:**
- `template/.aioson/agents/discovery-design-doc.md`
- `template/.aioson/agents/dev.md`
- `template/.aioson/agents/deyvin.md`

## Decisões tomadas
- 2026-04-12 Classificação da feature como SMALL — sem novas entidades de DB, sem integrações externas; mudanças são nos prompts dos agentes e em um template. @architect pode ser pulado.
- 2026-04-12 Alerta de 500 linhas é não-bloqueante — guideline, não hard constraint. Em pair mode (@deyvin) é puramente informativo.
- 2026-04-12 `@discovery-design-doc` não substitui `@architect` — complementa, gerando o plano técnico da feature após a arquitetura estar definida.

## Casos extremos tratados
- design-doc.md ausente em SMALL/MEDIUM → aviso, não bloqueio
- Arquivo legado com 600+ linhas → alerta não é retroativo
- MICRO invocando @discovery-design-doc → comportamento mais leve, gate opcional
- @deyvin pair mode sem resposta ao alerta → alternativa mais conservadora após 1 turno

## Dependências
- Lê: `.aioson/context/design-doc.md`, `prd-{slug}.md`, `requirements-{slug}.md`
- Escreve: `template/.aioson/context/design-doc.md`, agentes modificados em `template/` e `.aioson/agents/`

## QA — Resultado da certificação

**Data:** 2026-04-12  
**Agente:** @qa  
**Verdict:** APROVADO COM RESSALVAS

| AC | Status |
|----|--------|
| AC-01 | ✅ PASS |
| AC-02 | ✅ PASS |
| AC-03 | ✅ PASS |
| AC-04 | ✅ PASS |
| AC-05 | ✅ PASS |
| AC-06 | ❌ FAIL |

**Finding MEDIUM — AC-06:** RESOLVIDO. Fix aplicado em `src/installer.js` (commit `8c10874`): exceção em `shouldSkipTemplatePath` + `design-doc.md` adicionado ao `PROJECT_LOCAL_FILES`. Testes adicionados em `tests/installer.test.js` (commit `bf2b49b`). Probe adversarial confirmou comportamento correto.

**Finding LOW — @deyvin edge case:** FECHADO como comportamento intencional. Implementação (continuar com arquivo único após 1 turno) está correta para pair mode — silêncio = aprovação implícita. Extração automática sem confirmação violaria a filosofia "nunca bloquear" do pair mode. Requirements atualizados para refletir a decisão (commit `2d7d9f9`).

## Aprovação QA (re-verificação pós-fix)

- **Data:** 2026-04-12
- **Agente:** @qa
- **Cobertura de CA:** 6/6 totalmente cobertos
- **Verdict:** PASS ✅
- **Riscos residuais:** nenhum

---

## Notas
- **Inception mode**: após editar agentes em `.aioson/agents/`, copiar para `template/.aioson/agents/` também (ou rodar `npm run sync:agents` na direção inversa se o script suportar).
- A pergunta em aberto do PRD "quem cria o design-doc base: @setup ou @architect?" foi resolvida na discovery: **@discovery-design-doc cria se ausente**, como parte de sua responsabilidade de gate pré-dev.
- O design-doc base é **mutável** — agentes podem enriquecê-lo com padrões descobertos durante a implementação, mas nunca podem remover seções obrigatórias.
