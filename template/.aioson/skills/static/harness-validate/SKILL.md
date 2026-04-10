# Skill: Harness-Driven Validation (pt-BR)

> **Uso:** Implementação e Verificação Contratual (Padrão Nautilus).
> **Agentes:** @dev, @validator.
> **Contexto:** Projetos MEDIUM ou com `harness-contract.json` presente.

## Missão
Garantir que o ciclo de implementação do implementador (@dev) seja fechado com uma validação imparcial do validador (@validator) antes de qualquer entrega ser considerada concluída.

## Fluxo de Trabalho do @dev (Harness-Aware)

### 1. Início de Tarefa
Antes de escrever o primeiro arquivo de uma feature, verifique se o Harness está inicializado:
```bash
aioson harness:init . --slug=<feature-slug>
```
Isso criará o contrato stube em `.aioson/plans/<slug>/harness-contract.json`.

### 2. Implementação com Feedback
Sempre que concluir um slice lógico (ex: uma migration, um service, uma rota), execute a validação:
```bash
aioson harness:validate . --slug=<feature-slug>
```
O sistema invocará o `@validator` em um processo separado. O resultado será injetado no seu `progress.json`.

### 3. Recuperação de Falhas (Circuit Breaker)
Se a validação falhar:
- Leia o campo `last_error` em `progress.json`.
- Corrija apenas o ponto indicado pelo erro.
- Re-valide imediatamente.
- **Aviso:** Se falhar repetidamente (conforme `error_streak_limit`), o sistema abrirá o circuito (`OPEN`) e você não poderá continuar sem a intervenção explícita do usuário.

## Done Gate
O `@dev` não deve tentar marcar a feature como `done` em `features.md` manualmente. O gateway bloqueará a alteração se:
1. Um `harness-contract.json` existir.
2. E o `progress.json` não tiver `ready_for_done_gate: true`.

## Melhores Práticas
- **Commits Atômicos:** Faça commit após cada `harness:validate` bem-sucedido.
- **Contratos Binários:** No contrato, prefira critérios que possam ser validados mecanicamente (arquivos, assinaturas, testes).
- **Isolamento de Contexto:** Nunca tente "explicar" seu código para o `@validator` através de comentários. O validador deve julgar apenas o arquivo final e o contrato.

---
## Referências
- [Doc] Padrão Nautilus & PBQ — `.aioson/docs/integrations/harness-engineering.md`
- [CLI] Comandos `harness:init` e `harness:validate` — `/help`
