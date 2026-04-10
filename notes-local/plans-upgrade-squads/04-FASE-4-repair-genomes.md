# Fase 4 — Repair, Migrate e Genomes Auditáveis (P2-P3)

> **Objetivo:** Reconciliação manifesto vs realidade, migração de squads antigos, rastreabilidade de genomes
> **Pré-requisito:** Fase 3 completa (analyze e extend funcionando)

---

## Visão geral dos entregáveis

```
4.1  Task squad-repair.md
4.2  Lógica de migração para squads antigos (sem manifest formal)
4.3  Genomes auditáveis: versão, hash, diff semântico
4.4  Dry-run para aplicação de genomes
4.5  Revalidação automática após genome
4.6  Testes
```

---

## 4.1 — Task `squad-repair.md`

**Arquivo:** `template/.aios-lite/tasks/squad-repair.md`

```markdown
# Task: Squad Repair

> Reconcilia o manifesto com a estrutura real do filesystem. Corrige inconsistências.

## Quando usar
- `@squad repair <slug>` — invocação direta
- Quando validate reporta erros de estrutura
- Quando o usuário editou arquivos manualmente e quebrou a consistência

## Processo

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
- Regenerar arquivos de executor usando o role/skills do manifesto como input
- Atualizar manifesto com novos arquivos encontrados
- Corrigir paths e slugs
- Atualizar CLAUDE.md e AGENTS.md

### Passo 4 — Revalidar
Rodar validate após todas as correções para confirmar.

## Regras
- NUNCA aplicar correções sem aprovação do usuário
- SEMPRE mostrar diff antes
- Para executores regenerados: gerar com as instruções de squad-create.md (Step 2)
- Se o squad não tem manifest formal (squad antigo): redirecionar para migração
```

---

## 4.2 — Migração de squads antigos

Squads criados antes do upgrade não têm `squad.manifest.json` formal. A migração cria o manifesto a partir dos arquivos existentes.

**Adicionar ao `squad-repair.md`:**

```markdown
### Detecção de squad legado
Se o slug existe como diretório em `.aios-lite/squads/<slug>/` mas NÃO tem `squad.manifest.json`:

1. Ler `squad.md` (metadata textual) se existir
2. Ler `agents/agents.md` se existir
3. Listar arquivos em `agents/` para descobrir executores
4. Inferir mode, mission, goal do texto encontrado
5. Gerar `squad.manifest.json` a partir do que foi descoberto
6. Apresentar o manifesto gerado para aprovação
7. Se aprovado, salvar e rodar validate

Usar campos inferidos com confidence baixa — marcar readiness como partial.
```

---

## 4.3 — Genomes auditáveis

**Editar:** `template/.aios-lite/agents/squad.md` (seção "Genome binding to the squad")

Adicione rastreabilidade:

```markdown
## Genome audit trail

Quando um genome é aplicado a um squad ou executor:

1. Registrar no squad.manifest.json:
   ```json
   "genomes": [
     {
       "slug": "genome-slug",
       "scope": "squad",
       "appliedAt": "2026-03-10T15:30:00Z",
       "version": "1.0.0",
       "hash": "<sha256 dos primeiros 500 chars do genome>",
       "affectedExecutors": ["writer", "editor"]
     }
   ]
   ```

2. Registrar no squad.md (metadata textual):
   ```
   Genomes:
   - genome-slug (v1.0.0) — applied 2026-03-10 — affects: writer, editor
   ```

3. Ao aplicar um genome que já foi aplicado antes:
   - Comparar hash — se diferente, é uma atualização
   - Mostrar diff semântico: "genome-slug changed: added section X, removed constraint Y"
   - Pedir confirmação antes de reescrever os executores
```

---

## 4.4 — Dry-run para genomes

**Editar:** `template/.aios-lite/agents/genoma.md` (ou instrução cross-reference)

Adicione suporte a dry-run:

```markdown
## Dry-run mode

Quando o usuário pede `@genoma apply <genome> --dry-run` ou `@genoma apply <genome> to <squad> --preview`:

1. NÃO alterar nenhum arquivo
2. Mostrar quais executores seriam afetados
3. Para cada executor afetado, mostrar um diff resumido:
   - Seções que seriam adicionadas ao .md
   - Constraints que seriam alterados
   - Skills que seriam adicionadas
4. Mostrar o estado do manifesto após a aplicação
5. Perguntar: "Aplicar estas mudanças? [Y/n]"
```

---

## 4.5 — Revalidação pós-genome

**Editar:** `template/.aios-lite/agents/genoma.md`

Após qualquer aplicação de genome:

```markdown
## Post-genome validation

Após aplicar um genome a um squad:
1. Ler `.aios-lite/tasks/squad-validate.md` e executar mentalmente
2. Se validation falhar: mostrar os problemas e sugerir correções
3. Se validation passar: confirmar "Squad <slug> validated after genome application"
```

---

## 4.6 — Testes

**Arquivo:** `tests/squad-repair.test.js` (se houver lógica CLI)

Se a lógica de repair for só via agente (não CLI), os testes ficam nos testes de contrato do agente. Mas adicione pelo menos:

```javascript
// Em tests/squad-validate.test.js — adicione cenários de squads legados:
test('validate handles squad without manifest gracefully', async () => {
  // Cria squad sem manifest, verifica que validate reporta adequadamente
});
```

---

## Checklist de conclusão da Fase 4

```
[ ] template/.aios-lite/tasks/squad-repair.md criado
[ ] Lógica de migração documentada no squad-repair.md
[ ] squad.md atualizado com genome audit trail
[ ] Genome dry-run documentado
[ ] Post-genome validation documentada
[ ] squad.md com rota para @squad repair
[ ] Testes passando
[ ] Commit: "feat(squad): implement lifecycle phase 4 — repair, migrate, auditable genomes"
```

**Após completar:** Leia `05-FASE-5-inter-squad.md`.
