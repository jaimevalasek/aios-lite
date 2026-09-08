# O gate media a superfície e deixava o próprio resíduo — 53 MB de evidência que ninguém lia de volta

**Escopo:** `browser:run` (artefatos por passo), `verify:artifact --kind=visual --screenshots` (capturas de runtime), slot `visual-evidence.json`, política de `.gitignore` do instalador, `feature:archive`, `hygiene:scan`, `evidence:prune`, módulo `runtime-storage.md` do Neo.

## O que aconteceu

O operador acompanhou uma rodada de protótipo por fora e viu "lixo" aparecer em duas pastas da feature: 34 PNGs (30,5 MB) em `visual-screenshots/` e 76 arquivos (22,8 MB) em `briefings/{slug}/browser/{script}/`. A pergunta era dupla: isso gasta token? e pode apagar?

Medido na transcrição da sessão e nos arquivos:

- **Os arquivos em disco custaram zero token.** A evidência persistida tinha zero referência aos PNGs; a densidade de dobra é medida de um PNG em memória. O que custou foi o modelo *abrir* imagens: 22 PNG + 7 JPG lidos (≈40k tokens) que ficaram no contexto de todos os turnos seguintes de uma sessão que chegou a 595k tokens por turno (mediana 424k). O multiplicador real era o tamanho do contexto × 314 turnos, não a pasta.
- **A pasta do walkthrough era acúmulo, não uma rodada.** O runner grava `{script}-step-NN-failed.{png,aria.txt}` a cada passo que falha e nunca removia os pares dos passos que passaram depois: 11 iterações deixaram 37 pares órfãos debaixo de um relatório `PASS 102/102` que não referenciava nenhum deles.
- **As capturas eram página inteira e sem leitor.** `--screenshots` (prescrito no doc do protótipo) gravava 34 capturas full-page (1280×5072 = 3,2 MB) que o modelo, ao abrir, recebe reduzidas a 1568 px de altura — ilegíveis e mais caras em disco que uma dobra (1280×800 ≈ 470 KB, legível). Nada as registrava na evidência.
- **A prova do runtime foi apagada um minuto depois.** O `agent:done` do refiner auto-dispara o `kind=visual` estático em modo slug e sobrescreveu o `visual-evidence.json` (17 rotas medidas → relatório sem seção `runtime`, `0 warning(s)`); o manifesto seguia dizendo `runtime: measured` e o `briefing:approve` recusaria com "runtime was not measured".
- **Tudo isso ia para o git.** A política de `.gitignore` do instalador (`!.aioson/**`) re-inclui a árvore inteira; `git check-ignore` confirmou que os PNGs entrariam no repositório.

## Por que todo gate ficou verde

Classe **resíduo sem dono**: cada produtor escrevia arquivos que nenhum consumidor lia de volta, nenhum contava, nenhum limpava, e o slot de evidência era "a última rodada vence" sem olhar o que estava perdendo. O custo de token, que era a preocupação, vinha de outro lugar (imagens abertas e contexto longo), e nada nomeava a captura certa para o modelo abrir só uma.

## O que previne agora

- `browser:run` limpa a pasta do próprio script antes do primeiro passo e reporta `superseded_artifacts` (JSON, Markdown e uma linha de saída): a pasta espelha só o último relatório.
- `--screenshots` captura a primeira dobra por rota e largura (`--screenshots=full` para página inteira), substitui a pasta padrão (`screenshots_cleared`; `--screenshot-dir` nunca é limpa), grava `runtime.screenshot_capture` e caminhos relativos na evidência, e todo achado de dobra nomeia a captura (`capture: entry-desktop.png`).
- Rodada estática sobre os mesmos bytes (fingerprint igual) carrega a seção `runtime` adiante com `carried_from` e re-aplica `runtime.findings`; bytes diferentes → `runtime evidence dropped`.
- `.gitignore` do instalador: `.aioson/context/**/visual-screenshots/`, `.aioson/context/**/browser/*/`, `.aioson/briefings/**/browser/*/`, `aios-qa-screenshots/` (relatórios continuam rastreados; `update` mescla as linhas).
- `feature:archive` descarta os binários (`diagnostics_dropped`; `--keep-diagnostics` para levar); `hygiene:scan` lista `heavy_evidence_artifacts`; `aioson evidence:prune [--dry-run] [--slug] [--all]` remove órfãos (padrão) ou tudo, nunca um relatório; o Neo cobre o pedido pelo `runtime-storage.md`.
- Doutrina (walkthrough + protótipo): aria primeiro, no máximo a captura nomeada, nunca a pasta — cada imagem lida fica no contexto até o fim da sessão.

## Receita

Todo produtor de binário no `.aioson/` responde três perguntas antes de embarcar: quem lê isso de volta (o relatório referencia?), quem limpa (a própria rodada seguinte), e o git vê (política do instalador)? Se a resposta a qualquer uma é "ninguém", o arquivo é resíduo. Para medir custo de token de uma rodada, leia a transcrição (`usage` por turno + `Read` de imagens), não o `du` da pasta.
