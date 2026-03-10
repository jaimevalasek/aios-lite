# Task: Squad Design

> Fase de design do lifecycle do squad. Produz um blueprint intermediário.

## Quando usar
- `@squad design <nome>` — invocação direta
- `@squad` sem subcomando quando não existe blueprint para o slug

## Entrada
- Contexto do usuário: domínio, objetivo, constraints, roles desejados
- Opcional: documentação fonte (arquivos `.md`, texto colado, screenshots)
- Opcional: domínio hint para guiar a análise

## Processo

### Passo 0 — Verificar templates disponíveis
Verifique se existe `.aios-lite/templates/squads/`. Se existir, liste os templates disponíveis e pergunte:
"Quer partir de um template? Opções: content-basic, research-analysis, software-delivery, media-channel — ou começar do zero."
Se o usuário escolher um template, leia o `template.json` e use como base para o blueprint (executores, content blueprints, mode).

### Passo 1 — Coletar contexto mínimo
Pergunte em um bloco só (não faça múltiplas rodadas):
1. Domínio ou tópico do squad
2. Problema principal ou objetivo
3. Tipo de output esperado (artigos, scripts, código, análise, etc.)
4. Constraints (audiência, tom, nível técnico, idioma)
5. (opcional) Roles específicos desejados

Se o usuário já forneceu contexto suficiente (texto, docs, imagens), infira as respostas e siga em frente. Pergunte somente se há lacunas materiais.

### Passo 2 — Derivar design-doc mental
Antes de definir executores, consolide:
- Problema que está sendo resolvido
- Objetivo prático do squad
- Scope e out-of-scope
- Risks e assumptions
- Skills e docs que precisam entrar no contexto
- Mode do squad (content | software | research | mixed)

### Passo 3 — Definir executores
Determine 3-5 roles especializados. Para cada executor, defina:
- slug (kebab-case)
- title
- role (uma frase)
- focus (3-5 bullets)
- skills que vai usar
- genomes que herda

Inclua sempre um `orquestrador`.

### Passo 4 — Definir content blueprints
Se o squad é content-oriented, defina pelo menos 1 content blueprint com:
- slug, contentType, layoutType
- sections com key, label, blockTypes

### Passo 5 — Calcular readiness
Avalie cada dimensão:
- contextReady: há contexto suficiente?
- blueprintReady: o blueprint está completo?
- generationReady: dá para gerar os executores?

### Passo 6 — Gerar blueprint JSON
Salve o blueprint em `.aios-lite/squads/.designs/<slug>.blueprint.json`

O JSON deve seguir o schema `squad-blueprint.schema.json`.

Gere um UUID para o campo `id`. Use `new Date().toISOString()` para `createdAt`.

### Passo 7 — Apresentar resumo
Mostre ao usuário:
- Executores propostos com roles
- Content blueprints definidos
- Assumptions feitas
- Risks identificados
- Readiness status
- Confidence score

Pergunte se quer ajustar algo antes de criar.

## Saída
- Arquivo: `.aios-lite/squads/.designs/<slug>.blueprint.json`
- Resumo no chat para review do usuário

## Próximo passo
- Se aprovado: `@squad create <slug>` (que lê o blueprint e gera o pacote)
- Se precisa ajuste: o usuário indica e o design é atualizado

## Regras
- NÃO crie o pacote do squad aqui — isso é responsabilidade da task create
- NÃO pule o blueprint — ele é obrigatório
- MANTENHA o blueprint leve — o LLM preenche lacunas na fase create
