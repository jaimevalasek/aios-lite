# Fase 09 — Rollout checklist e ordem de implementação

## Objetivo
Consolidar a ordem segura de implementação, validação, merge e ativação do pacote Genoma 2.0 + Dashboard, minimizando risco de regressão e preservando o fluxo atual.

## Repo alvo
`aios-lite` e `aios-lite-dashboard`

## Pré-requisitos
- `00` até `08`

## Regra desta fase
**100% aditivo.** Rollout gradual, com validação local antes de qualquer merge em sequência.

## Escopo
- ordem recomendada de implementação;
- ordem de merge;
- smoke tests obrigatórios;
- checklists de aceitação;
- estratégia de fallback.

## Fora de escopo
- deploy automatizado em produção;
- observabilidade avançada.

## Impacto arquitetural
Nenhum impacto de runtime; esta fase governa como o pacote deve entrar no projeto sem perder o fio da arquitetura.

---

## Ordem recomendada de implementação

### Bloco A — Core do `aios-lite`
1. Implementar `01-aios-lite-genoma-core.md`.
2. Rodar testes do core.
3. Implementar `02-aios-lite-genoma-binding-squad.md`.
4. Rodar testes de binding.
5. Implementar `03-aios-lite-migration-compat.md`.
6. Rodar smoke tests de compatibilidade.

**Gate A**: só seguir para dashboard quando:
- genoma 2.0 estiver persistindo corretamente;
- binding em squad estiver estável;
- leitura antiga e nova estiver funcionando.

### Bloco B — Dashboard / incubação e catálogo
7. Implementar `04-dashboard-artisan-genoma.md`.
8. Validar criação de `Genome Brief`.
9. Implementar `05-dashboard-genomes-catalog.md`.
10. Validar catálogo enriquecido.

**Gate B**: só seguir para bindings em squad quando:
- `/artisan` suportar genoma;
- `/genomes` estiver lendo Genoma 2.0 corretamente.

### Bloco C — Dashboard / bindings e pipeline
11. Implementar `06-dashboard-squad-genome-binding.md`.
12. Validar aplicação e remoção de bindings.
13. Implementar `07-dashboard-pipelines-orchestration-only.md`.
14. Validar badges/inspector no pipeline.

### Bloco D — Consolidação
15. Implementar `08-integration-tests-e2e.md`.
16. Rodar matriz de testes.
17. Fechar checklist manual.

---

## Ordem recomendada de merge

### `aios-lite`
1. Merge da Fase 01
2. Merge da Fase 02
3. Merge da Fase 03

### `aios-lite-dashboard`
4. Merge da Fase 04
5. Merge da Fase 05
6. Merge da Fase 06
7. Merge da Fase 07

### Final
8. Merge da Fase 08
9. Fechar documentação final com esta fase 09

---

## Smoke tests obrigatórios por bloco

### Após Bloco A
- [ ] Genoma antigo é lido.
- [ ] Genoma 2.0 é salvo.
- [ ] Squad nova recebe binding.
- [ ] Squad antiga recebe binding.
- [ ] Repair/migrate funciona em dry-run.

### Após Bloco B
- [ ] `/artisan` cria ideia de genoma.
- [ ] `Genome Brief` é persistido.
- [ ] `/genomes` lista genomas antigos e novos.
- [ ] Cards mostram tipo/depth/evidence mode.

### Após Bloco C
- [ ] `/squads` permite gerenciar genomas.
- [ ] Binding de squad funciona.
- [ ] Binding de executor funciona.
- [ ] `/pipelines` mostra badges corretamente.
- [ ] Nenhum pipeline antigo quebra.

### Após Bloco D
- [ ] Testes automatizados passam.
- [ ] Checklist manual foi executado.
- [ ] Dados legados continuam acessíveis.

---

## Estratégia de fallback
Se qualquer fase quebrar compatibilidade:
1. Não deletar o código novo.
2. Desativar a nova escrita quando possível.
3. Manter leitura tolerante ativa.
4. Registrar o gap.
5. Corrigir e reexecutar os smoke tests.

Se o dashboard não conseguir interpretar o Genoma 2.0:
- manter endpoint retornando fallback mínimo;
- esconder badges avançados;
- não bloquear listagem de genomas.

---

## Critérios finais de aceite

O pacote só deve ser considerado pronto quando:
- [ ] é possível criar genoma 2.0;
- [ ] é possível aplicar em squad nova;
- [ ] é possível aplicar em squad existente;
- [ ] `/artisan` suporta incubação de genoma;
- [ ] `/genomes` mostra catálogo enriquecido;
- [ ] `/squads` gerencia bindings;
- [ ] `/pipelines` mostra genomas como contexto sem virar nó executável;
- [ ] testes automáticos e manuais foram concluídos.

---

## Mensagens de commit sugeridas por bloco

```bash
feat(core): implement genome 2.0 foundation
feat(core): add genome bindings to squads
feat(core): add migration and compatibility layer for genome 2.0
feat(dashboard): add genome incubation flow to artisan
feat(dashboard): enrich genomes catalog for genome 2.0
feat(dashboard): add genome bindings management to squads
feat(dashboard): show genome bindings in squad pipelines without changing pipeline model
test(integration): add end-to-end coverage for genome 2.0 and dashboard bindings
docs(plan): add rollout checklist for genome 2.0 program
```

---

## Checklist final do pacote
- [ ] `00-MASTER.md` revisado
- [ ] fases 01–09 presentes
- [ ] ordem de implementação definida
- [ ] riscos de regressão documentados
- [ ] estratégia de fallback definida
- [ ] critérios de aceite fechados
