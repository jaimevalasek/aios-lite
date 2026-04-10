# Notes — qa

## Fontes usadas

### Externa
- AIOX qa: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/qa.md

### Internas do AIOSON
- `template/.aioson/agents/qa.md`
- `template/.aioson/locales/pt-BR/agents/qa.md`
- `src/commands/qa-doctor.js`
- `src/commands/qa-init.js`
- `src/commands/qa-run.js`
- `src/commands/qa-scan.js`
- `src/commands/qa-report.js`
- `src/commands/workflow-next.js`

## Observações

- O `AIOX qa` é mais `quality advisor / gate architect`; o `AIOSON @qa` é mais `risk reviewer + test writer + feature closer`.
- O AIOSON tem um ativo forte que o AIOX QA não mostra nessa fonte: um sistema próprio de browser QA via CLI (`qa:run`, `qa:scan`, `qa:report`).
- O `@qa` do AIOSON escreve testes para achados Criticos/Altos, enquanto o AIOX QA é mais advisory e story-governance oriented.
- O workflow do AIOSON não infere conclusão de `qa` por artefato explícito no mesmo nível de `product`, `analyst`, `architect`, `ux-ui` e `orchestrator`.
- As conclusões sobre self-healing, auto-fix e partes mais amplas do ecossistema de review do AIOX foram tratadas como inferência quando dependem de tasks/integrations citadas pelo arquivo principal.

## Hipóteses de backlog futuro

- `@qa gate`
- `@qa risk-profile`
- `@qa nfr`
- `@qa trace`
- `@qa fix-request`
- `@qa merge-browser-report`
- `.aioson/context/qa-gate.md`
- `.aioson/context/qa-risk-profile.md`
- `.aioson/context/qa-traceability.md`
- backlog opcional de dívida técnica de QA
