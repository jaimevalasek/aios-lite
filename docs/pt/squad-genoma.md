# Squad e Genoma

> Guia prático para usar `@squad` e `@genoma` no AIOS Lite.

---

## Visão rápida

`@squad` e `@genoma` resolvem problemas diferentes:

- `@squad` cria um **time operacional de agentes reais** em `agents/{squad-slug}/`
- `@genoma` cria uma **base estruturada de conhecimento e lentes cognitivas** em `.aios-lite/genomas/{slug}.md`

Em termos simples:

- `@genoma` define **o que saber** e **como pensar**
- `@squad` transforma isso em **agentes executáveis**
- o `@orquestrador` gerado para cada squad consolida o trabalho em HTML

---

## O que é um squad

Um squad é um conjunto de agentes criados para um objetivo específico.

Exemplo:

```text
agents/youtube-creator/
  roteirista-viral.md
  estrategista-de-titulos.md
  analista-de-retencao.md
  copywriter-de-thumbnail.md
  orquestrador.md
```

Esses agentes não são os agentes oficiais da aios-lite. Eles são agentes do seu projeto.

---

## O que é um genoma

Um genoma é um artefato de domínio. Ele descreve:

- `O que saber`: conceitos, tensões, heurísticas e linguagem do domínio
- `Mentes`: perspectivas cognitivas úteis para pensar naquele domínio
- `Skills`: fragmentos curtos de capacidade reutilizável

Exemplo de genoma:

```text
.aios-lite/genomas/storytelling-retencao-youtube.md
```

Esse genoma não faz trabalho sozinho. Ele enriquece o trabalho dos agentes.

---

## Relação entre squad e genoma

O modelo recomendado é:

1. criar o squad
2. criar ou importar genomas
3. aplicar genomas ao squad inteiro ou a agentes específicos
4. chamar os agentes normalmente

Depois que o genoma é aplicado, o usuário não deveria precisar repetir isso em toda sessão.
O vínculo precisa ficar salvo no metadata do squad.

Exemplo:

```text
.aios-lite/squads/youtube-creator.md
```

```md
Squad: YouTube Creator
Mode: Squad
Goal: Criar conteúdos virais com retenção forte
Agents: agents/youtube-creator/
Output: output/youtube-creator/
Logs: aios-logs/youtube-creator/
LatestSession: output/youtube-creator/latest.html

Genomes:
- .aios-lite/genomas/storytelling-retencao-youtube.md

AgentGenomes:
- roteirista-viral: .aios-lite/genomas/redacao-emocional-youtube.md
- copywriter-thumbnail: .aios-lite/genomas/copy-ctr-youtube.md
```

---

## Separação de responsabilidades

O fluxo recomendado agora é mais direto:

- `@squad` cria e mantém squads
- `@genoma` cria e aplica genomas

Na prática:

- `@squad` não deve abrir perguntando entre Lite e Genoma
- `@squad` entra direto nas perguntas para criação dos agentes
- `@genoma` é chamado separadamente quando o usuário quiser enriquecer o squad

---

## Fluxo recomendado de uso

### Cenário 1: criar um squad

Exemplo de conversa:

```text
@squad
Quero montar um squad para YouTube.

Domínio: YouTube Creator focado em vídeos longos
Objetivo: criar roteiros mais fortes e títulos com CTR alto
Output: roteiros, títulos, ideias de thumbnail
Restrições: público brasileiro, tom direto, sem clickbait vazio
Papéis: pode escolher
```

Resultado esperado:

- criação de agentes em `agents/youtube-creator/`
- criação de metadata em `.aios-lite/squads/youtube-creator.md`
- geração de `output/youtube-creator/latest.html`

### Cenário 2: criar um genoma depois

Depois do squad já existir:

```text
@genoma
Quero um genoma para storytelling com retenção alta em vídeos longos do YouTube Brasil.
```

Depois de gerar e salvar:

```text
Aplicar este genoma ao squad youtube-creator.
Aplicar especialmente ao agente @roteirista-viral.
```

Resultado esperado:

- genoma salvo em `.aios-lite/genomas/...`
- vínculo salvo no metadata do squad
- agente `roteirista-viral.md` reescrito com `## Genomas ativos`

### Cenário 3: usar o agente depois disso

```text
@roteirista-viral
Crie um roteiro para um vídeo sobre como aprender inglês sem pagar curso.
```

O agente já deve operar com os genomas vinculados, sem o usuário repetir tudo.

---

## Arquivos gerados

### Squad

```text
agents/{squad-slug}/
output/{squad-slug}/
.aios-lite/squads/{squad-slug}.md
aios-logs/{squad-slug}/
```

### Registro nos gateways

Quando o squad é criado, o comportamento esperado é registrar os agentes dinâmicos nos gateways do projeto:

- `CLAUDE.md` para uso via `/agente` no Claude Code
- `AGENTS.md` para uso via `@agente` no Codex

Exemplo:

```md
## Squad: YouTube Creator
- /roteirista-viral -> agents/youtube-creator/roteirista-viral.md
- /estrategista-de-titulos -> agents/youtube-creator/estrategista-de-titulos.md
- /orquestrador -> agents/youtube-creator/orquestrador.md
```

```md
## Squad: YouTube Creator
- @roteirista-viral -> `agents/youtube-creator/roteirista-viral.md`
- @estrategista-de-titulos -> `agents/youtube-creator/estrategista-de-titulos.md`
- @orquestrador -> `agents/youtube-creator/orquestrador.md`
```

Regras:

- não sobrescrever os agentes oficiais já existentes
- fazer append ou atualizar apenas a seção do squad correspondente
- tratar esses registros como atalhos para os arquivos reais em `agents/`
- quando um agente dinâmico for ativado via `@`, o comportamento esperado é executar o papel imediatamente, não abrir e exibir o arquivo ao usuário

### Genoma

```text
.aios-lite/genomas/{genoma-slug}.md
```

### Drafts e HTML final

O fluxo recomendado é:

1. cada agente especialista gera conteúdo intermediário em Markdown
2. o `@orquestrador` do squad consolida esse material
3. o `@orquestrador` publica o HTML final da sessão

Exemplo:

```text
output/youtube-creator/
  2026-03-06-153000-roteiro-roteirista-viral.md
  2026-03-06-153000-copy-copywriter-thumbnail.md
  2026-03-06-153000-video-ingles.html
  latest.html
```

---

## Regras importantes

### 1. O orquestrador responsável pelo HTML é o do squad

Não é o `@orchestrator` oficial da aios-lite.

É o `@orquestrador` gerado dentro de `agents/{squad-slug}/`.

Ele é quem:

- coleta drafts dos especialistas
- sintetiza a rodada
- publica o HTML final

### 2. Genoma não deve alterar agentes oficiais da aios-lite

Não aplique genomas customizados do usuário em:

```text
.aios-lite/agents/
```

Esses agentes são infraestrutura do framework.

Os genomas devem ser aplicados aos agentes criados em:

```text
agents/{squad-slug}/
```

### 3. O usuário pode mandar contexto grande

Tanto no `@squad` quanto no `@genoma`, o usuário pode enviar:

- textos longos
- PDFs ou arquivos
- prints
- imagens
- anotações brutas
- exemplos de referência

Esse material deve ser tratado como contexto de entrada válido.

### 4. Um genoma pode ser do squad inteiro ou de um agente

Use no squad inteiro quando o contexto vale para todos.

Exemplo:

- estratégia editorial do canal
- tom de voz global
- posicionamento do nicho

Use por agente quando o contexto for específico.

Exemplo:

- só o roteirista precisa de um genoma de storytelling
- só o copywriter precisa de um genoma de CTR

### 5. HTML final não substitui o chat

O agente ainda responde na sessão.

O HTML é o entregável persistido e organizado para consulta e cópia.

### 6. Estrutura de pastas deve ser leve

Prefira:

- `agents/{squad-slug}/`
- `output/{squad-slug}/`
- `aios-logs/{squad-slug}/`

Evite criar subpastas demais sem necessidade.

---

## Exemplos práticos

### Exemplo A: YouTube Creator

Squad:

- `@roteirista-viral`
- `@estrategista-de-titulos`
- `@copywriter-thumbnail`
- `@analista-de-retencao`
- `@orquestrador`

Genomas possíveis:

- `storytelling-retencao-youtube`
- `copy-ctr-thumbnail`
- `estrategia-editorial-canal`

Aplicação sugerida:

- `storytelling-retencao-youtube` → `@roteirista-viral`
- `copy-ctr-thumbnail` → `@copywriter-thumbnail`
- `estrategia-editorial-canal` → squad inteiro

### Exemplo B: Squad jurídico

Squad:

- `@analista-de-casos`
- `@advogado-do-diabo`
- `@redator-claro`
- `@caçador-de-precedentes`
- `@orquestrador`

Genomas possíveis:

- `direito-trabalhista-brasil`
- `argumentacao-juridica-clara`
- `jurisprudencia-operacional`

### Exemplo C: Squad para landing pages

Squad:

- `@estrategista-de-oferta`
- `@copywriter-de-landing`
- `@analista-de-objeções`
- `@designer-de-conversao`
- `@orquestrador`

Genomas possíveis:

- `copy-de-conversao`
- `estrutura-de-oferta`
- `psicologia-de-objecoes`

---

## Boas práticas

- comece com Lite quando ainda estiver descobrindo o problema
- crie genomas depois para enriquecer o squad existente
- aplique genomas ao menor escopo possível
- deixe o orquestrador do squad cuidar do HTML final
- use drafts `.md` para manter rastreabilidade entre agentes e entregável final
- evite tratar genoma como “clone de pessoa”

Melhor:

- genoma de domínio
- genoma de abordagem
- genoma de heurísticas

Pior:

- “copiar exatamente o cérebro de fulano”

---

## Perguntas frequentes

### Posso criar vários genomas para o mesmo squad?

Sim. O importante é controlar bem o escopo:

- alguns no nível do squad
- outros no nível de agentes específicos

### Posso chamar `@genoma` sem passar por `@squad`?

Sim. Esse é um fluxo válido.

### Posso criar o squad primeiro e aplicar genomas depois?

Sim. Esse é um dos melhores fluxos.

### Os agentes dinâmicos aparecem no Claude Code e no Codex?

Esse é o comportamento desejado do fluxo:

- Claude Code: via registro em `CLAUDE.md` com `/agente`
- Codex: via registro em `AGENTS.md` com `@agente`

Na prática, os agentes continuam sendo arquivos reais em `agents/`. Os gateways servem como atalhos explícitos para esses arquivos.

### O agente final precisa sempre gerar HTML?

Não. O ideal é:

- especialista gera Markdown em `output/{squad-slug}/`
- orquestrador do squad gera HTML em `output/{squad-slug}/`

### O HTML fica gigante?

Não precisa. O modelo atual é um HTML por sessão, reescrito por rodada, com `latest.html` como atalho.

---

## Resumo operacional

Use `@squad` para montar a equipe.

Use `@genoma` para criar conhecimento reaproveitável.

Aplique genomas ao squad ou a agentes específicos.

Deixe os especialistas gerar drafts `.md`.

Deixe o `@orquestrador` do squad publicar o HTML final.
