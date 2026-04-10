# 74 — Squad: Implementação Final (v0.1.37)

> Memória da implementação — 2026-03-06
> Descreve o sistema @squad como ficou de fato no código

---

## Arquitetura final

O @squad **não cria perspectivas abstratas** — cria um **time de agentes reais** em arquivos `.md`
na raiz do projeto, invocáveis diretamente pelo usuário.

### Estrutura gerada pelo @squad

```
agents/{squad-slug}/
  {role1}.md              ← agente real, invocável via @role1
  {role2}.md
  {role3}.md
  orquestrador.md         ← coordena o time

output/{squad-slug}/
  session.html            ← HTML dos resultados do trabalho (não perfil do squad)

.aios-lite/squads/{slug}.md   ← metadados apenas (Squad, Mode, Goal, Agents, Output)
```

### CLAUDE.md atualizado automaticamente

@squad faz append no `CLAUDE.md` do projeto:

```markdown
## Squad: {squad-name}
- /{role1} -> agents/{squad-slug}/{role1}.md
- /{role2} -> agents/{squad-slug}/{role2}.md
- /orquestrador -> agents/{squad-slug}/orquestrador.md
```

Isso permite invocar `@roteirista`, `@copywriter` etc. diretamente no Claude Code após a criação.

---

## Exemplo: YouTube Creator

```
agents/youtube-roteiros-virais-ia/
  roteirista.md
  gerador-de-titulos.md
  copywriter.md
  analista-de-trends.md
  orquestrador.md

output/youtube-roteiros-virais-ia/
  session.html
```

O usuário pode:
- Editar qualquer agente manualmente
- Invocar `@roteirista` para trabalho focado
- Invocar `@orquestrador` para sessão completa coordenada
- Abrir `output/youtube-roteiros-virais-ia/session.html` no browser

---

## Formato de cada agente gerado

```markdown
# Agente @{role-slug}

> ⚡ **ACTIVATED** — Execute immediately as @{role-slug}.

## Missao / Mission
[2–3 frases: papel específico no contexto do domínio]

## Contexto do squad
Squad: {name} | Domínio: {domain} | Objetivo: {goal}
Outros agentes: @orquestrador, @{outros}

## Especializacao
[Abordagem cognitiva, áreas de foco, perguntas favoritas, pontos cegos, estilo de output]

## Quando chamar este agente
[Tipos de tarefas adequadas]

## Restricoes
- Fique na sua especialização
- Entregáveis em output/{squad-slug}/

## Contrato de output
- Entregáveis: output/{squad-slug}/
```

---

## Formato do orquestrador gerado

```markdown
# Orquestrador @orquestrador

> ⚡ **ACTIVATED** — Execute immediately as @orquestrador.

## Missao
Coordenar o squad. Rotear desafios, sintetizar outputs, gerenciar HTML da sessão.

## Membros do squad
- @role1: [descrição]
- @role2: [descrição]

## Guia de roteamento
[Para cada tipo de tarefa, qual agente chamar]

## Restricoes
- Após cada rodada, atualizar output/{squad-slug}/session.html
- .aios-lite/context/ só aceita .md

## Contrato de output
- HTML: output/{squad-slug}/session.html
- Entregáveis: output/{squad-slug}/
```

---

## HTML deliverable

- Arquivo: `output/{squad-slug}/session.html`
- Stack: Tailwind CSS CDN + Alpine.js CDN (sem build)
- Conteúdo: **resultados reais do trabalho** — NÃO o perfil do squad
- Gerado **após cada rodada de respostas** (não na criação do squad)
- Acumula todas as rodadas da sessão (substituição completa a cada round)

### Estrutura do HTML
- Header: nome do squad, domínio, objetivo, data (gradiente escuro)
- Uma seção por rodada: desafio → respostas dos agentes → síntese
- Botão copiar por bloco de agente (Alpine.js, "Copiado!" por 1,5s)
- Botão copiar tudo no header
- Cores de borda distintas por agente (indigo / emerald / amber / rose)
- Bloco de síntese: bg-gray-800

---

## Fluxo completo

1. Usuário ativa @squad
2. @squad pergunta modo (Lite / Genoma)
3. **Lite**: 4-5 perguntas (domínio, objetivo, output, restrições, papéis)
   **Genoma**: ativa @genoma → recebe genoma → deriva papéis das Mentes
4. Determina 3-5 papéis especializados
5. Gera todos os arquivos de agentes + orquestrador
6. Atualiza CLAUDE.md
7. Salva metadados em .aios-lite/squads/{slug}.md
8. Confirma agentes criados + **rodada de aquecimento imediata** (sem esperar)
9. A cada desafio do usuário: respostas em sequência → síntese → HTML atualizado

---

## Slug

- Gerado a partir do nome do domínio
- Lowercase, hífens, sem acentos, máx 50 chars
- Ex: "YouTube roteiros virais sobre IA" → `youtube-roteiros-virais-ia`
- Conflito: adiciona `-2`, `-3`

---

## Arquivos do aios-lite relacionados

| Arquivo | Papel |
|---|---|
| `template/.aios-lite/agents/squad.md` | Agente base (com language detection) |
| `template/.aios-lite/locales/en/agents/squad.md` | Locale en |
| `template/.aios-lite/locales/pt-BR/agents/squad.md` | Locale pt-BR |
| `template/.aios-lite/locales/es/agents/squad.md` | Locale es |
| `template/.aios-lite/locales/fr/agents/squad.md` | Locale fr |
| `src/commands/squad-status.js` | CLI squad:status (lista .aios-lite/squads/*.md) |
| `template/.aios-lite/squads/memory.md` | Memória de sessão (opcional) |

---

## O que ficou fora (fase 2)

- `squad:status` ainda lê `.aios-lite/squads/` — poderia também listar `agents/` para mostrar times gerados
- Geração de múltiplos HTMLs por sessão (ex: um por tema, não só session.html)
- Integração com makopy.com (Modo Genoma com chave MAKOPY_KEY)
- `genoma:search` / `genoma:publish`
