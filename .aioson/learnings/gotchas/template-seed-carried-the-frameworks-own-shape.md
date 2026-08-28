---
title: "Um arquivo semeado pelo template carregava a forma do próprio framework — e nenhum gate lia o conteúdo, só a presença"
scope: template/.aioson/context/, template/.aioson/skills/, src/installer.js, src/install-profile.js, src/lib/design-doc-seed.js, src/lib/design-presets.js, src/context-selector.js, src/preflight-engine.js, src/doctor.js
src: "AIOSON supervised session: auditoria do design-doc.md instalado em todo projeto — 28 de 32 consumidores carregavam a cópia literal do layout de CLI Node.js do framework; um projeto desktop Rust teve que reescrevê-lo como 'governança JavaScript herdada, incompatível'"
---

# Um arquivo semeado pelo template carregava a forma do próprio framework

`template/.aioson/context/design-doc.md` nasceu em 12/04 como "governança de
organização de código" e foi **substituído no dia seguinte** pelo sistema
modular `.aioson/design-docs/` (o commit 6360c696 diz "Replace single
monolithic design-doc.md"). O monólito nunca foi retirado. Ficou por 4 meses:

- com o corpo do PRÓPRIO aioson (`src/commands/`, `src/lib/{domain}/`,
  `squad/`, `runner/`, `i18n/messages/`, `src/utils.js`, tabelas SQLite) —
  copiado ao pé da letra para landing pages, apps Next.js, um desktop Rust;
- com um cabeçalho que prometia um contrato morto ("`@dev` deve carregar antes
  de qualquer implementação", "gerado por `@discovery-design-doc` no gate
  pré-dev") — o kernel do dev diz "do not require design-doc" e o discovery
  "never create design-doc-*";
- **project-local** no installer: `aioson update` nunca o tocou, então a
  correção do template não alcançaria consumidor nenhum.

Por que todo gate ficou verde:

- os testes só pinavam **presença** (copiado no install, preservado no update),
  nunca o conteúdo — um seed com a forma errada passa por "arquivo existe";
- o seletor o escolhia por recall semântico (`nomes`, `pastas`, `split`) em
  cima dos 5 `design-docs/` já em `must_load` — duplicação pura, ~1.4k tokens;
- o engine aceitava `design-doc.md` sem slug como fallback do design-doc DE
  FEATURE (`preflight.scanArtifacts`, validação do estágio
  `discovery-design-doc`, `state:save --context=design-doc`,
  `workflow:status`) — a semente do installer satisfazia um artefato de
  feature só por existir.

## Regra

1. Todo arquivo que o template semeia em `.aioson/context/` é **conteúdo
   do consumidor**: precisa ser stack-agnóstico e consistente com os kernels
   que o citam. Se descreve a forma deste repositório, é dívida em cada
   projeto instalado.
2. Retirar um seed project-local exige duas pernas: parar de embarcar
   (template + installer) **e** ensinar o CLI a reconhecer a cópia antiga no
   consumidor — porque `update` não a reescreve. Aqui:
   `src/lib/design-doc-seed.js` classifica por sha256 normalizado
   (`verbatim`, das duas versões embarcadas) ou por título/heading/linhas de
   contrato aposentadas (`derived`); o seletor e o catálogo pulam `verbatim`,
   todo fallback do engine recusa a semente, `doctor` avisa por tipo e
   `--fix` apaga só a cópia literal, `update` repete o aviso.
3. Um fallback "arquivo sem slug" para artefato de feature precisa olhar o
   conteúdo, não só a existência — senão qualquer seed do installer vira
   falso-verde de estágio.
4. Prova = live-fire read-only no consumidor: `context:select` sem o arquivo,
   `doctor --json` com `context:retired_design_doc_seed` e o tipo certo
   (literal → `verbatim`, editado → `derived`, registro real → silêncio).

## Mesma classe, segunda ocorrência (2026-08-28): os presets de design

Ao reduzir `skills/design/` à engine `interface-design`, apareceram três
árvores irmãs do seed: `skills/design-system/` (uma SEGUNDA engine de design,
"use sempre que pedirem QUALQUER UI web" — um preset disfarçado), `skills/
references/premium-command-center-ui/` (referências órfãs de um preset já
apagado) e `skills/premium-visual-design/` (specs de componentes do dashboard
do PRÓPRIO framework — agent-badge, team-switcher, review-action-bar —
copiadas para todo consumidor). Nenhum agente, doc ou seletor as roteava;
só o installer as copiava. Por que ficou verde: o manifesto e os testes só
pinavam contagem/presença, e o wizard/`install-profile` carregavam a lista de
presets à mão — `aioson setup --design=<preset apagado>` instalava só a
engine sem dizer nada.

Regra adicional: **uma lista de ids que o template embarca nunca vive à mão
no `src/`** — ela é derivada do template ou pinada por um teste que abre o
diretório (`tests/design-preset-retirement.test.js` faz os dois: só a engine
em `skills/design/`, `MANAGED_FILES` ≡ arquivos embarcados, varredura do
template inteiro por id aposentado). E toda retirada tem as duas pernas de
sempre: `src/lib/design-presets.js` guarda os ids aposentados para o perfil
salvo ser normalizado e para `doctor`/`update` nomearem `design_skill`
apontando para preset (com ou sem cópia local), sem apagar nada do consumidor.
