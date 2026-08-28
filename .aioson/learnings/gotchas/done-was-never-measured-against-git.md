---
title: "Todo done-gate media o CONTEÚDO do artefato; nenhum media se a entrega chegou ao git"
scope: src/lib/delivery-parity.js, src/commands/runtime.js, src/commands/agent-epilogue.js, src/commands/delivery-parity.js, template/.aioson/agents/committer.md, template/.aioson/docs/committer/outstanding-work.md
src: "AIOSON supervised session: onda de trabalho fechada com todos os gates verdes e 199 arquivos autorais parados na árvore — o operador teve que pedir o commit mais uma vez"
---

# "Pronto" e "entregue" divergiam em silêncio

O framework tinha uma camada inteira de gates de fechamento — os `kind` do
`verify:artifact`, os critérios estáticos SG-*, o contract-integrity gate — e
**todos mediam o conteúdo do artefato produzido**. Nenhum media se aquele
trabalho saiu da árvore de trabalho.

O resultado é uma classe de falha que nenhum verde detecta: a sessão fecha com
o artefato provado completo e o change set inteiro sem commit. O @committer
sabe exatamente como commitar com segurança — mas **nada o convoca**, e o
committer gate do `workflow:next` só dispara depois que um humano já roteou
para lá. O único detector era o operador, pedindo o commit toda vez.

## O que fecha o buraco

`src/lib/delivery-parity.js` conta o `git status --porcelain` e é ligado ao
`agent:done` — a única chamada que **todo** agente já faz no fim da sessão,
ao lado do `verify_artifact`. O `agent:epilogue` o expõe como step.

Três decisões que fazem a medida sobreviver ao uso:

- **`--untracked-files=all` é carga, não enfeite.** O porcelain simples
  colapsa um diretório novo inteiro em uma única entrada `?? src/`: uma onda
  de 12 arquivos novos media como 1. Descoberto por teste, não por leitura.
- **Ruído de runtime não é trabalho autoral.** `.aioson/context/`,
  `.aioson/runtime/`, `.aioson/state/` e `.aioson/plans/` mudam como efeito
  colateral de rodar os próprios agentes. Cobrá-los faria o aviso disparar em
  toda sessão de todo projeto — a classe de falso positivo que faz um gate
  ser ignorado. São reportados, nunca cobrados.
- **Advisory em todo tier, silencioso abaixo do piso.** Uma árvore suja no
  fim de uma sessão costuma ser trabalho em andamento legítimo. Um gate que
  bloqueasse nisso estaria errado na maioria das vezes — e um gate desligado
  não mede nada.

## O agrupamento é o que torna o aviso acionável

Contar 199 não ajuda ninguém. As áreas descem por containers aninhados
(`template/` sozinho não diz nada, `template/.aioson` quase nada; as fatias
reais são `template/.aioson/skills`, `.../docs`, `.../agents`), então o aviso
já entrega a hipótese de partição. O `.aioson/docs/committer/outstanding-work.md`
transforma isso em commits por INTENÇÃO — um comando novo é seu arquivo, seu
registro no cli, sua medida, seus testes e seu doc: um commit, cinco áreas.

## Armadilha ao aplicar a partição

Fatiar uma onda pós-fato exige encenar hunks de um mesmo arquivo em commits
diferentes (`constants.js` e `cli.js` carregavam 3 ondas cada). `git add -p`
é interativo; a via segura é `git apply --cached` com um patch gerado pelo
próprio git e filtrado por hunk — mexe só no índice, nunca na árvore, e não
toca no EOL (este repo é CRLF na árvore com `*.md eol=lf`).

E o teste da própria doutrina: um commit que precisa do seguinte para passar
a própria suíte é uma fatia ruim. Quatro arquivos de teste ficaram fora do
commit de retirada; o conserto foi `git commit --fixup=<sha>` +
`git rebase --autosquash` (não interativo no git 2.55), não um commit extra.
