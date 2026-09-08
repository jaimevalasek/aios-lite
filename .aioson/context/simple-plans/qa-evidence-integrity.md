---
slug: qa-evidence-integrity
status: done
owner: dev
created_at: 2026-09-07
---

# Simple Plan — Evidência confiável do QA

## Scope
Corrigir a integridade da evidência operacional de QA: falhas explícitas, ACs vinculados à feature e paridade do HTML regenerado.

## Context selected
Contexto validado; context:brief de Dev consultado e must_load carregado. Pesquisa `researchs/qa-deterministic-automation/summary.md`. Workflow execution-roles-onboarding alheio, preservado. Regras de idioma, disk-first e Simple Plan aplicáveis; regras visuais selecionadas não adicionam interfaces a esta correção.

## Implementation intelligence
Reutilizar recordProbe/summarizeProbes, leitor canônico de critérios e readBrowserEvidence. Node.js AsyncLocalStorage registra falhas recuperadas dentro de cada probe sem exportar mensagens potencialmente sensíveis. Manter fallback operacional e achados parciais. Nada muda nas permissões, payloads ou taxonomias dos scanners. HTML continua derivado do JSON; nenhum runner paralelo ao Gate D.

## Done criteria
- Falha de navegação, HTTP inválido ou leitura/avaliação não produz execução completa em qa:run, mesmo com catch interno.
- Probes/personas posteriores continuam e achados parciais permanecem visíveis.
- Critérios com IDs semânticos e mais de 20 linhas aparecem; nenhuma evidência de outra feature satisfaz um AC.
- Sem feature explícita/configurada, o PRD legado continua legível, sem importar walkthroughs de outras features.
- HTML imediato/regenerado preserva limitações de execução; formatos históricos continuam legíveis.
- Ideias de automação futura registradas em plans.

## Useful options considered
- Include now: três correções e regressões focadas, usando comandos existentes.
- Defer: agregador operacional de QA, revisão geral de agentes e benchmark de tokens (ideia em plans).
- Sem novas dependências, integrações, decisões de segurança ou ativação de especialistas.

## Expected files
- Behavior: src/commands/qa-run.js; src/commands/qa-report.js; src/lib/qa-probe-results.js; src/lib/qa-ac-evidence.js.
- Support: tests/qa-scanner-integrity.test.js; este plano; plans/aioson-deterministic-automation.md; .aioson/context/dev-state.md (checkpoint CLI).
- 4 behavior, 8 paths; comandos QA e helpers de evidência existentes.

## Verification
Testes node:test em qa-scanner-integrity, qa-report, qa-init, browser-walkthrough, browser-session e playwright-loader; check:syntax; rules:check nos JS alterados; diff --check. Smoke pelo CLI real com relatório em diretório temporário.

## Session state
Concluído. Sem commit/publicação ou alteração do workflow de features.

## Resultados
- 71 testes passaram, sem falhas ou skips, incluindo 15 regressões novas. Red→green observado para falhas silenciosas, perda de INCOMPLETE na regeneração e cobertura cruzada entre features.
- Smoke pelo processo real `node bin/aioson.js qa:report <tmp> --html`: relatório incompleto continua incompleto. Probes testados nos comandos reais com browser fake e callbacks serializados em realm separado; não foi uma auditoria de aplicação externa.
- `npm run check:syntax`: 581 arquivos JavaScript válidos.
- `node bin/aioson.js rules:check . '--paths=src/commands/qa-run.js,src/commands/qa-report.js,src/lib/qa-probe-results.js,src/lib/qa-ac-evidence.js,tests/qa-scanner-integrity.test.js'`: RULES=OK, dois avisos de tamanho em qa-run (603 linhas lógicas no arquivo; 93 na entrada). No PowerShell, citar o argumento CSV inteiro; sem aspas o escopo pode chegar vazio e provocar fallback para auditoria completa.
- `git diff --check` nos arquivos alterados: sem erro de whitespace.
- Ideia futura persistida em `plans/aioson-deterministic-automation.md`.

## Limites
- A data do walkthrough é comparada à modificação do PRD; origem e alvo também são verificados. Não há comprovação de fingerprint de todo o código implantado nesse leitor. Gate D e o QA independente continuam necessários.
- Ausência de achados e execution_complete não equivalem a aceitação dos critérios. PRDs legados permanecem inventário, com limitações explícitas; IDs ou tabelas inválidas nunca dão crédito a walkthroughs.
- Não medimos economia percentual de tokens nesta entrega. Agregador operacional e mudança do kernel QA ficam para o piloto descrito em plans.
