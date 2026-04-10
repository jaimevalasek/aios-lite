# GSD Analysis — Padrões Transplantáveis para o AIOSON

> Data: 2026-03-29
> Prioridade: HIGH — base para criação dos plans

## Comparativo GSD vs AIOSON

| Dimensão | GSD | AIOSON |
|----------|-----|--------|
| State model | File-based (.planning/), frontmatter machine-parseable | Context files + memory |
| Agent spawning | Task() com fresh 200k context por subagente | Skill-based agent activation |
| Verificação | 4 níveis goal-backward | QA agent |
| Planning format | XML PLAN.md com wave assignments + read_first + acceptance_criteria | Process skills |
| Gap closure | Loop automático verify→plan→execute (máx 3 retries) | Re-run manual |
| UI patterns | TUI completo (banners, checkpoints, symbols, progress bars) | Markdown-based |
| SDK | TypeScript headless via Agent SDK | CLI-focado |
| Cross-AI review | Multi-CLI adversarial feedback | Single model |
| User profiling | 8 dimensões comportamentais | Ausente |
| Seeds system | Ideias futuras com trigger conditions | Ausente |
| Forensics | Post-mortem read-only com 6 detectores | Ausente |
| Continuation block | Bloco padrão "Next Up" ao final de toda saída | Ausente |

---

## Padrões imediatamente transplantáveis (alta prioridade)

### 1. STATE.md com velocity metrics
Estrutura de memória de sessão mais rica que o atual context do AIOSON:
- Posição atual
- Decisões tomadas
- Blockers ativos
- Velocity (tarefas/sessão)
- Continuidade explícita

**Aplicar em:** `spec-{slug}.md` e `last_checkpoint`

### 2. must_haves verification contract (truths/artifacts/key_links)
```yaml
must_haves:
  truths: ["User can POST /auth/login"]
  artifacts: ["src/routes/auth.ts (>50 lines)"]
  key_links: ["auth router registered in app.ts"]
```
Muito mais forte que verificação pass/fail. Cada entrega tem 3 tipos de evidência.

**Aplicar em:** `@dev`, `@tester`, planos de implementação

### 3. Continuation format block
Todo agente termina com bloco padronizado "Next Up" incluindo instrução `/clear`.
Resolve context drift sem precisar de mecanismo técnico.

**Aplicar em:** todos os agentes AIOSON

### 4. 4-tier verification levels
1. **Exists** — o arquivo/função existe
2. **Substantive** — não é stub/mock
3. **Wired** — está importado/usado
4. **Functional** — dados fluem corretamente

Anti-patterns ativos: TODOs, returns vazios, componentes desconectados.

**Aplicar em:** `@tester`, `@dev`, gate de verificação

### 5. Gray area extraction (discuss-phase)
Ao invés de perguntas abertas, identificar "gray areas" concretas — decisões que poderiam ir em múltiplas direções e mudariam o outcome. Código existente é anotado inline.
Decisões anteriores carregam automaticamente (sem re-perguntar).

**Aplicar em:** `@sheldon`, `@analyst`

### 6. Seeds system
`/gsd:plant-seed` captura ideia futura com:
- Trigger condition ("surfaçar quando iniciar v2")
- Breadcrumbs do codebase
- Estimativa de escopo
Seeds surgem automaticamente em `/gsd:new-milestone`.

**Aplicar em:** novo comando `aioson seed` ou backlog do `@pm`

### 7. Checkpoint taxonomy (3 tipos)
- `human-verify` — confirmação visual
- `decision` — escolha arquitetural
- `human-action` — só para passos verdadeiramente manuais

**Aplicar em:** agentes de execução

### 8. Forensics workflow
Post-mortem read-only, evidência-based, com 6 detectores de anomalia:
- Stuck loops
- Artifacts faltando
- Scope drift
- etc.

**Aplicar em:** novo agente ou modo `@qa --forensics`

### 9. User profiling (8 dimensões)
Profiling comportamental: communication style, decision style, tech philosophy, etc.
Agentes downstream usam o perfil para adaptar opções e tabelas de comparação.

**Aplicar em:** `aioson setup` + todos os agentes

### 10. Workstreams (namespacing paralelo)
Milestones paralelos sem interferência no ROADMAP.
Mapeia para o conceito multi-squad do AIOSON.

---

## Padrões de médio prazo

### 11. Manager dashboard
Terminal dashboard com status D/P/E por fase, background agent dispatch, auto-refresh 60s.

### 12. Cross-AI review
Detectar CLIs instalados (Gemini, Codex, etc.), enviar prompts idênticos, sintetizar consenso.

### 13. Context Engine pattern
Manifests de arquivo por fase — execute recebe mínimo, plan recebe abrangente.
Impede context bloat.

### 14. Nyquist test coverage audit
Análise de gap de cobertura via `gsd-nyquist-auditor`.
Verifica se teste existe para cada requirement explicitamente.

---

## O que NÃO copiar

- Estrutura `.planning/` como substituto do `.aioson/` — são filosofias diferentes
- XML nos PLAN.md — AIOSON usa markdown, mais legível por humanos
- SDK TypeScript — AIOSON tem CLI real, SDK seria overengineering agora
- 89 comandos — AIOSON tem proporcionalidade por tamanho (MICRO/SMALL/MEDIUM)
