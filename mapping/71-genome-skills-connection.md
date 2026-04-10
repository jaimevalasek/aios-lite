# 71 — @genoma + Skills: A Conexão

> Como o skill-creator da Anthropic se conecta ao @genoma
> Referência: https://github.com/anthropics/skills/tree/main/skills/skill-creator
> Sessão: 2026-03-05

---

## O que o skill-creator da Anthropic é

Um sistema para criar, testar e iterar **skills** no formato SKILL.md.

Cada skill tem:
```
metadata (~100 palavras) — nome, descrição, quando triggar
SKILL.md body (<500 linhas) — instruções, padrões, output esperado
recursos opcionais — scripts, referências, assets
```

O skill-creator tem infraestrutura pesada de avaliação (Python, grader, benchmark, viewer).
Isso não é lite. Mas o **formato e a filosofia** são excelentes.

---

## A Conexão com @genoma

O @genoma já cria genomas (perfil de domínio) e mentes (perspectivas de pensamento).

**O que faltava:** skills específicas para as tarefas do squad.

```
Genoma  =  O QUE saber          (conhecimento de domínio amplo)
Mente   =  COMO pensar          (perspectiva de raciocínio)
Skill   =  COMO executar        (passo a passo de uma tarefa específica)

Squad = Genoma + Mentes + Skills + Memory
```

Quando @genoma monta um squad de YouTube, por exemplo:
- Cria o genoma YouTube (visão geral do domínio)
- Seleciona as mentes (Espectador, Algoritmo, Crítico, Estrategista)
- **Gera skills específicas** para as tarefas que o squad vai executar

---

## O que @genoma gera como Skills

Para o squad de YouTube, @genoma geraria:

```
.aios-lite/squads/active/skills/
├── skill-hook.md           ← como escrever os primeiros 30 segundos
├── skill-thumbnail-brief.md ← como criar o brief de thumbnail
├── skill-titulo-options.md  ← como gerar 3 opções de título com ângulos
└── skill-descricao-seo.md   ← como escrever descrição otimizada
```

Cada skill segue o formato simplificado (lite) do SKILL.md da Anthropic:

```markdown
---
name: youtube-hook
description: Ativado quando o squad precisa criar o hook dos primeiros 30 segundos de um vídeo
---

## O que este skill faz
Cria o script dos primeiros 30 segundos do vídeo — a parte que decide
se o espectador fica ou abandona.

## Quando usar
Quando o usuário pede o roteiro e ainda não tem o hook definido.

## Output esperado
- Versão A: abertura com pergunta (curiosidade)
- Versão B: abertura em mídia res (ação imediata)
- Versão C: abertura contrarian (quebra expectativa)
- Para cada: 3-5 linhas de script + instrução de ritmo/pausa

## Padrões que funcionam
- Os primeiros 3 segundos: promessa ou pergunta, nunca apresentação
- Nunca começar com "Olá, bem-vindos ao canal..."
- Pattern interrupt nos primeiros 15s (corte de cena, mudança de tom)
- Conectar o hook com o CTA do final (loop aberto)

## Anti-padrões
- Hook genérico ("Hoje vou falar sobre...")
- Contexto antes da promessa
- Duração > 45s sem conflito/tensão estabelecido
```

---

## Por que Skills são melhores que só Genoma para tarefas

O genoma é amplo — fala sobre o domínio inteiro.
A skill é específica — fala sobre UMA tarefa com detalhe acionável.

```
Genoma YouTube:
"Hooks são críticos. Os primeiros 30 segundos determinam a retenção..."

Skill youtube-hook:
"Para criar o hook: escreva 3 versões (curiosidade / mídia res / contrarian).
 Comece pela promessa. Nunca pela apresentação. 3 segundos para ganhar atenção."
```

O agente que usa a skill sabe EXATAMENTE o que fazer.
O agente que usa só o genoma tem contexto, mas precisa raciocinar mais.

Skill = instrução precisa para resultado previsível.
Genoma = contexto para raciocínio livre.

Os dois juntos = qualidade consistente com flexibilidade.

---

## O que o @genoma faz diferente do skill-creator da Anthropic

O skill-creator da Anthropic é um **framework de desenvolvimento** de skills:
- Tem avaliação quantitativa (grader, benchmark, Python scripts)
- Tem viewer interativo para comparar com baseline
- Tem loop de iteração com métricas
- É uma ferramenta para quem desenvolve skills profissionalmente

O @genoma usa a **filosofia** do skill-creator, não a infraestrutura:
- Mesmo formato SKILL.md (metadata + instruções + output esperado)
- Mesma ideia de "instrução precisa para resultado previsível"
- Sem Python, sem scripts, sem viewer — é gerado na hora via LLM

```
skill-creator Anthropic:  desenvolver + testar + medir + iterar skills
@genoma aios-lite:        gerar skills específicas para o squad na hora
```

A skill gerada pelo @genoma é boa o suficiente para começar.
Se o usuário quiser refinar com o skill-creator da Anthropic, pode.
Mas não é requisito.

---

## Como @genoma Usa o Skill-Creator Para Melhorar

A parte mais interessante da sua pergunta:

> "Daria para usar o skill-creator para que o genoma melhore o seu trabalho?"

Sim — de duas formas:

### Forma 1: @genoma usa o padrão para gerar skills melhores

Ao gerar cada skill, @genoma aplica a filosofia do skill-creator:
- **Captura intenção:** qual tarefa exatamente esta skill resolve?
- **Define output:** o que exatamente o agente entrega após usar a skill?
- **Inclui anti-padrões:** o que a skill explicitamente proíbe?
- **Adiciona exemplos:** Input → Output concreto

Isso já está embutido no prompt do @genoma.

### Forma 2: @genoma pode RODAR o skill-creator para refinar suas próprias skills

Fluxo avançado (opcional):

```
@genoma gera skill-hook.md → salva em squads/active/skills/
         ↓
Usuário usa a skill, não gosta do output
         ↓
Usuário: "@genoma, esta skill de hook não está boa, melhora"
         ↓
@genoma usa o skill-creator (skill-creator da Anthropic instalado)
para testar e refinar skill-hook.md com casos reais
         ↓
Skill melhorada → salva de volta → squad usa versão atualizada
```

Isso transforma o @genoma em um **agente que aprende com feedback**,
não só um agente que gera na hora.

---

## Fluxo Completo Atualizado

```
Usuário aciona @squad

@squad pergunta: Modo Lite ou Modo Genoma?

─── MODO GENOMA ─────────────────────────────────────────────

@squad aciona @genoma

@genoma pergunta: "Qual domínio?"
Usuário: "YouTube content"

@genoma busca makopy.com via MCP:
  → Tem genoma + skills para YouTube? Carrega.
  → Não tem? Cria na hora:

  @genoma gera:
    1. Genoma YouTube (domínio amplo)
    2. Mentes selecionadas (Espectador, Algoritmo, Crítico, Estrategista)
    3. Skills específicas (hook, thumbnail-brief, titulo-options, descricao-seo)

@squad monta:
  squad.md com genoma + mentes + referência às skills

─── SQUAD EM USO ────────────────────────────────────────────

Usuário: "Cria conteúdo sobre produtividade com IA"

Agente carrega skill-titulo-options → gera 3 títulos com ângulos
Agente carrega skill-hook → gera 3 versões do hook
Agente carrega skill-thumbnail-brief → cria brief visual
Agente carrega skill-descricao-seo → escreve descrição otimizada

Output: deliverable HTML com tudo organizado e botões de copiar

─── FEEDBACK + MELHORIA (opcional) ─────────────────────────

Usuário: "O hook não ficou bom"
@genoma refina skill-hook.md
(skill-creator da Anthropic pode ser usado aqui se instalado)

Memory.md registra: "skill-hook ajustada para [contexto do projeto]"
```

---

## Por que isso é o diferencial real

**aiox-core** cria agentes com "DNA" de pessoas reais. Estático após criação.

**aios-lite com @genoma + skills:**
- Genoma: conhecimento de domínio gerado na hora
- Skills: instruções específicas geradas na hora
- Memory: aprendizado que cresce com uso
- Skill-creator Anthropic: ferramenta opcional para refinar se necessário

O squad não é criado uma vez. **Ele melhora enquanto é usado.**

---

> Status: conexão skill-creator → @genoma documentada
> Skills são a terceira camada do squad (além de genoma + mentes)
> Relacionado: mapping/66-70
> Próximo: implementar @genoma + @squad como agentes reais
