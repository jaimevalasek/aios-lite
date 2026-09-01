# A aposentadoria do catálogo deixou a pergunta viva

**Escopo:** setup, product, ux-ui, `setup:context`, `skill:list`, frontmatter de SKILL.md.

## O que aconteceu

Em 2026-08-28 os presets fixos de design foram aposentados e o template passou a embarcar
uma única design skill — o engine `interface-design`. `@refiner`, `@dev` e todo squad já
resolviam `design_skill` em branco para o engine sem perguntar. Mas três superfícies
continuaram fazendo a pergunta cujo menu tinha exatamente uma resposta:

- `@setup` (kernel + `onboarding-flow.md` §5 + `stack-and-design-reference.md`): "ofereça
  `interface-design`, persista só após confirmação, senão `""` com sistema visual pendente";
- `@product` (`conversation-playbook.md`): "pergunte se registra uma das skills instaladas;
  se adiar, grave `pending-selection`";
- `@ux-ui` (`design-gate.md`): "pergunte qual skill instalada usar; se só há uma, ainda
  assim peça confirmação em vez de auto-selecionar".

Todo projeto `site`/`web_app` novo ganhava uma decisão a mais que não decidia nada, e o
CLI gravava `design_skill: ""` — a grafia que os docs tratavam como "pendente".

## Por que todo gate ficou verde

Classe **misfire por assimetria**: a aposentadoria retirou o catálogo (medido por teste —
nenhum id aposentado no template) mas ninguém mediu *a pergunta*. A prosa que oferecia o
menu vivia em três docs roteados de agentes diferentes e nenhum teste pinava sua ausência;
o teste do kernel de setup pinava justamente `design_skill: ""`.

Um segundo escape na mesma superfície: o único SKILL.md com `description: >-` (o engine)
era lido pelo parser de frontmatter compartilhado como a string `>-`, e cada linha de
continuação com dois-pontos virava chave falsa. A descrição do engine era invisível ao
score de descrição do seletor e o `skill:list` imprimia `>-`; além disso o `[active]` do
catálogo comparava o valor COM aspas e nunca casava.

## O que previne agora

- `setup:context` grava `design_skill: "interface-design"` em todo tipo de projeto; em
  branco continua resolvendo para o engine (nada regrava contextos antigos); `--design-skill`
  segue nomeando uma skill forjada pelo projeto.
- Setup/product/ux-ui/dev declaram o default em vez de perguntar; `config.md` nomeia quem
  pode mudar o campo (`@site-forge`/`@design-hybrid-forge`, por nome — ninguém por menu).
- `tests/design-skill-default.test.js` varre todo kernel/doc/skill/task do template pelas
  formas da pergunta aposentada (`ask which design skill`, `pending-selection`,
  `still ask for confirmation`, `design-selection`, ...) — o contrato legado arquivado é
  a única exceção, e só porque carrega o banner "Superseded".
- `parseFrontmatter` entende bloco YAML (`>`, `>-`, `|`, `|-`, CRLF); `skill:list` usa o
  mesmo leitor, tira as aspas do `design_skill` e marca o engine ativo quando o campo está
  em branco.

## Receita

Ao aposentar um catálogo/opção, grep pela **pergunta** (não só pelos ids): `ask which`,
`confirm`, `pending`, `choose`, `offer` nos docs roteados de todo agente que tocava a
decisão — e pine a ausência. O eval de trigger cobre alcance; a pergunta morta cobre só
quem procurar por ela.
