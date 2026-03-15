# Task: Squad Repair

> Reconcilia o manifesto com a estrutura real do filesystem. Corrige inconsistências.

## Quando usar
- `@squad repair <slug>` — invocação direta
- Quando validate reporta erros de estrutura
- Quando o usuário editou arquivos manualmente e quebrou a consistência

## Processo

### Passo 0 — Detecção de squad legado

Se o slug existe como diretório em `.aioson/squads/<slug>/` mas NÃO tem `squad.manifest.json`:

1. Ler `squad.md` (metadata textual) se existir
2. Ler `agents/agents.md` se existir
3. Listar arquivos em `agents/` para descobrir executores
4. Inferir mode, mission, goal do texto encontrado
5. Gerar `squad.manifest.json` a partir do que foi descoberto (schemaVersion: "1.0.0")
6. Apresentar o manifesto gerado para aprovação:
   ```
   Squad legado detectado: "<slug>"
   Manifesto inferido:
     mode: content (inferido)
     mission: "..." (inferido de squad.md)
     executors: writer, editor (encontrados em agents/)
     confidence: LOW — revisar antes de confirmar

   Criar squad.manifest.json com estes dados? [Y/n]
   ```
7. Se aprovado, salvar e rodar validate
8. Marcar readiness contextReady e blueprintReady como "partial"

### Passo 1 — Detectar inconsistências

Compare manifest vs filesystem:

**Cenário A — Arquivo no manifesto mas não no filesystem:**
- Executor referenciado mas arquivo não existe
- Skill declarada mas diretório/arquivo faltando
- Ação: oferecer REGENERAR o arquivo ou REMOVER do manifesto

**Cenário B — Arquivo no filesystem mas não no manifesto:**
- Novo executor .md em agents/ não declarado no manifesto
- Skill instalada em skills/ não declarada
- Ação: oferecer REGISTRAR no manifesto ou INFORMAR que é órfão

**Cenário C — Dados inconsistentes:**
- Slug do manifesto != nome do diretório
- Executor com file path errado
- CLAUDE.md/AGENTS.md desatualizado
- Ação: oferecer CORRIGIR

### Passo 2 — Mostrar diff completo

Antes de qualquer correção, mostre exatamente o que será feito:
```
Repair plan for "<slug>":

  FIX: Executor "analyst" — file missing → regenerate agents/analyst.md
  FIX: Executor "ghost" — in manifest but no file → remove from manifest
  ADD: File "agents/reviewer.md" found → register in manifest
  FIX: CLAUDE.md — squad section outdated → update
  SKIP: readiness.md — missing but not critical

Apply repairs? [Y/n/select specific]
```

### Passo 3 — Aplicar correções selecionadas

- Regenerar arquivos de executor usando o role/skills do manifesto como input (seguir Step 2 de squad-create.md)
- Atualizar manifesto com novos arquivos encontrados
- Corrigir paths e slugs
- Atualizar CLAUDE.md e AGENTS.md

### Passo 4 — Revalidar

Ler e executar mentalmente `.aioson/tasks/squad-validate.md` após todas as correções para confirmar que o pacote está consistente.

## Regras
- NUNCA aplicar correções sem aprovação do usuário
- SEMPRE mostrar diff antes
- Para executores regenerados: gerar com as instruções de squad-create.md (Step 2 — Passo 5)
- Se o squad não tem manifest formal (squad antigo): executar Passo 0 primeiro
