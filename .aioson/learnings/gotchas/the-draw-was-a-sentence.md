# O sorteio era uma frase — e todo lugar onde o motor confiava numa frase deixou a mesmice passar

**Escopo:** `design:seed`, `verify:artifact --kind=visual` (proveniência da paleta, precisão operate, zona de assets), registro `~/.aioson/design-fingerprints.json`, referências da skill `interface-design`, `brain:query --format=index`, `briefing:feedback`.

## O que aconteceu

Pedido de análise: "o motor de design premium está melhorando, detectou vício e recriou, mas gastou mais". Medido nos protótipos reais dos projetos consumidores:

- **O sorteio só rodava numa porta.** Os 6 sites que consumiram o `design:seed` espalharam o acento em 6 faixas da roda (4°, 29°, 127°, 206°, 249°, 342°). Os 4 produtos construídos pelo dev em repositório novo — a rota que nunca sorteava — caíram numa faixa de 75° (verde sobre escuro, o visual padrão de ferramenta), com todo gate verde. Nada persistia o sorteio, então nem dava para provar se ele rodou.
- **O registro de fingerprints estava poluído e curto.** 6 fixtures `mkdtemp` (`aioson-craft-weight-*`) gravadas antes do guard de teste eram "o projeto rival mais próximo" (Δ0°) de uma landing real; e a chave projeto+slug com teto 24 guardava só 7 projetos distintos — duas landings de agência a 22° no mesmo polo já tinham sido esquecidas.
- **A doutrina prescrevia o próprio tell.** `tokens-and-depth.md` mandava "section eyebrow 0.68rem uppercase mono" acima de todo título de card: um protótipo operate entregou 16 `.overline` que a telemetria contou como 13 kickers. O mesmo arquivo usava Geist e IBM Plex Sans (conjunto saturado) como exemplo e fixava o admin de um produto como matemática universal; `design-directions.md` imprimia `accent=blue-600/orange-500/blue-700` e hexes fixos — os 3 projetos de acento azul do registro estavam exatamente nessas âncoras.
- **Superfície operate não tinha barra.** "O eixo premium é precisão, não peso" era uma frase: o peso não é pontuado em operate e nada mais pontuava. Um protótipo com 17 avisos (fonte nunca entregue, tokens 39%, 95 valores fora do grid, 13 kickers, 0/7 CSS moderno) lia `pass` e era aprovável.
- **O custo não era a doutrina.** Cold start ≈ 30k tokens, fixo. O multiplicador era o artefato relido a cada passada: protótipo de 1,8 MB com 98% base64 (139 KB de WOFF2 dentro de um `<style>` de 155 KB), `refinement-feedback.json` de 143 KB por rodada (o briefing copiado duas vezes), brain compact de 14,4 KB por toque visual.

## Por que todo gate ficou verde

Classe **decisão sem read-back**: cada escape era uma instrução que o modelo podia ou não honrar, sem nenhuma camada que lesse de volta o que aconteceu. A telemetria media a superfície; ninguém media a origem da paleta, a barra do operate, nem os bytes que o próximo passo teria de reler.

## O que previne agora

- `design:seed` grava o sorteio em `.aioson/context/features/{slug}/design-seed.json` (`--no-persist` para sondas); `kind=visual` reporta `palette.origin` (`seed` / `identity` / `prior`; o rótulo do seed no manifesto conta, via as janelas de matiz de cada esquema) e avisa `origination without a draw` (protótipo, ou primeira superfície medida do projeto) e `draw ignored`; conformance nunca cobra; o fingerprint carrega `origin`.
- Registro: projeto sob o temp root nunca grava no registro padrão (`isEphemeralProjectDir`); no máximo 2 superfícies por projeto, teto 32.
- Referências sem âncora: `accent=the drawn or identity accent`, superfícies como degraus tonais do chão sorteado, eyebrow invertido no contra-movimento, sem face saturada, sem hex, sem literal utilitário; `tests/design-doctrine-anchors.test.js` varre toda superfície de doutrina.
- `craft.precision` (typeface, tokens, rhythm, states, chrome, tells, dialect; barra 60) em operate/read e `briefing:approve` recusa por ele (`--accept-craft` registra).
- Custo: zona de assets (`<style data-aioson-assets>` / `<script type=application/json data-aioson-assets>`) medida por `embedded_assets` e cobrada acima de 32 KB numa zona autoral; `brain:query --format=index` para dev/deyvin (14,4 KB → 5,8 KB); `briefing:feedback` como leitura da rodada (143 KB → 5,5 KB).

## Receita

Antes de confiar numa instrução de skill ou doc para conter a mesmice, pergunte "o que lê isso de volta?". Se a resposta é "ninguém", grave a decisão num arquivo ao lado da feature e faça o gate compará-la com o que foi medido. Sondas em consumidores: sempre `--no-persist` (o `design:seed` agora persiste por padrão). A skill `interface-design/SKILL.md` está a 11 chars do teto (8960): próxima frase vai para uma referência.
