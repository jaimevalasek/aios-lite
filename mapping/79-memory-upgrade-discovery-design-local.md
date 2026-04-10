## Memoria local — upgrade discovery/design/squad modular

Data: 2026-03-07

### Direcao consolidada

- O AIOS Lite deve ser tratado como arquitetura de contexto, nao como prompt gigante.
- O fluxo-alvo ficou:
  `discovery -> design doc -> prontidao -> plano -> execucao -> revisao -> aprendizado`
- O `@squad` esta migrando de "gera agentes especialistas" para "gera squads modulares governadas".

### O que foi consolidado no core

- `@squad` agora exige:
  - `agents/{slug}/agents.md`
  - `agents/{slug}/squad.manifest.json`
  - `skills`
  - `mcps`
  - politica de `subagentes`
  - `media/{slug}/`
- `cloud:import:squad` materializa manifesto textual, manifesto JSON, agentes, genomas e `media/`.
- `cloud:publish:squad` publica o manifesto modular real da squad.
- O runtime SQLite local passou a indexar squads e seus componentes estruturais.

### O que foi consolidado no dashboard

- O dashboard local ja le:
  - `squad.manifest.json`
  - tabelas de runtime da squad
  - `media/{slug}/`
- O app da squad passou a exibir:
  - agentes
  - tasks
  - blueprint
  - media
- Cada projeto local pode guardar `cloudApiToken`.

### O que foi consolidado no cloud

- O `aioslite.com` agora:
  - usa autenticacao real por usuario no painel
  - aceita publish por sessao ou `Bearer token`
  - permite registry privado por dono autenticado
  - tem gestao de tokens pessoais no dashboard cloud
- Migration aplicada no MySQL real:
  - `ApiToken`

### Distincao conceitual que precisa permanecer clara

- `skill` = capacidade operacional reutilizavel
- `genoma` = camada cognitiva / lente / forma de pensar
- `subagente` = unidade temporaria de investigacao ou paralelismo
- `agente executor` = trabalhador permanente da squad
- `agents.md` = manifesto curto da squad, nao um executor

### Estado atual frente ao guia discovery/design

- Ja existe agente oficial `@discovery-design-doc`
- Esse agente agora cobre:
  - `modo projeto`
  - `modo feature`
  - `design-doc.md`
  - `readiness.md`
  - recomendacao de `skills` e `documentos sob demanda`
  - rubrica objetiva de prontidao com score por dimensao
- O `@squad` agora ja pensa como um mini `@discovery-design-doc` antes de compor a squad:
  - problema atual
  - objetivo
  - escopo e fora de escopo
  - pacote minimo de docs/skills
  - prontidao para seguir
- Essa camada agora tambem foi levada para o fluxo real de import/publish:
  - `agents/{slug}/design-doc.md`
  - `agents/{slug}/readiness.md`
  - `context_json` no SQLite local da squad
  - snapshot cloud preservando `designDocMarkdown` e `readinessMarkdown`
- `@dev`, `@analyst` e `@architect` passaram a consumir explicitamente:
  - `design-doc.md`
  - `readiness.md`
  - skills/docs sob demanda
- `@setup` agora recomenda `@discovery-design-doc` de forma contextual:
  - quando o escopo estiver vago
  - quando a feature for grande
  - quando o risco de retrabalho estiver alto
  - sem transformar isso em etapa obrigatoria

### Prioridades naturais seguintes

1. Ensinar o dashboard/cloud a expor melhor esse pacote de contexto
2. Levar a deteccao de `skills/docs sob demanda` para mais agentes operacionais, especialmente `@dev`
3. Revisar se `@analyst` e `@architect` tambem devem consumir explicitamente a nova `readiness`
4. Validar se o gerador real de squad deve escrever esses arquivos sempre, nao so o fluxo cloud
5. Espelhar documentacao em ingles depois que o `pt-BR` estiver estabilizado
