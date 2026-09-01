# A precisão do roteamento só era provada onde o slug da feature não podia vazar

**Escopo:** `context:select` / `context:brief` (lookup de keywords, termos semânticos, fallback de frase), `context:guard` (árvores de governança), `context:evals` (honestidade do próprio motor), `telemetry-redaction`, `context:usage`.

## O que aconteceu

Três revisões adversariais (independentes, só leitura) sobre os seis commits da onda
evals/telemetria acharam a mesma classe de escape em camadas diferentes:

- **O lookup de keywords era `task + paths + feature ativa`.** Um pulse com
  `active_feature: customer-onboarding-board` colocava as rules de formulário e kanban em
  `must_load` (lei) em TODA task daquela feature — "corrigir typo no README" incluído.
  Precisão 0,74 no corpus de negativos com pulse; 0,84 ao vivo neste repositório. O corpus
  shipped provava 1,0 porque a fixture de teste não tinha pulse: a prova valia só no estado
  em que nenhum consumidor está no meio de uma feature.
- **O mesmo slug alimentava os termos semânticos** (`board`, `customer` → o doc de efeitos
  visuais aparecia numa task de webhook de pagamentos).
- **O achatamento de hífen/barra** (que fez `visual-direction` casar com "visual direction")
  também transformou `--paths=.github/workflows/pipeline.yml` nas palavras `workflow` e
  `pipeline` (rule de status-flow em `must_load` numa task "fix the flaky job").
- **O fallback multi-token** deixava uma frase cujos tokens colapsam numa única palavra longa
  valer por essa palavra: `prd-edit` era "edit", `editing prd` era "editing" —
  `prd-section-ownership` disparava em "edit the footer copy".
- **O motor de evals mentia a seu favor**: `absent` com alvo inexistente passava como
  negativo verdadeiro (uma rule renomeada "passaria" para sempre e ainda contava no piso);
  `mode: review` virava planning em silêncio enquanto o relatório imprimia `[qa/review]`;
  `--strict --filter=typo` saía 0 com "nenhum cenário"; a sugestão de frontmatter propunha
  `esse`, `service`, `linhas`.
- **A redação de segredos parava na aspa**: `TOKEN="ghp_…"` passava inteiro; chaves com
  prefixo de env (`AWS_SECRET_ACCESS_KEY=`), `senha=` e credencial em URL nunca casavam; o
  passe sobre o JSON serializado quebrava o payload (`JSON.parse` falha, linha permanente)
  E deixava o segredo; `agent_runs.summary` e três emissores com INSERT próprio não passavam
  pelo funil.
- **`context:usage` contava linhas, não sessões**: `agent:done --verdict` grava `finished`
  E `agent_done` (QA/DEV fechavam duas vezes); `--feature` zerava os fins de sessão;
  `related` do brief não era registrado (doc de recall carregado virava "lacuna de
  roteamento"); `--since` sem valor era janela de 1 dia.

## Por que todo gate ficou verde

Classe **fixture sem o estado real**: os testes provavam o motor numa árvore sintética sem
pulse, sem paths de CI, sem valores entre aspas. Cada número ("precisão 1", "segredo nunca
chega") era verdadeiro na fixture e falso no consumidor.

## O que previne agora

- Lookup de keywords lê só a task; feature binding é exato; paths alimentam `paths:` e hits
  diretos; termos semânticos = task + paths. Frase com um único token longo exige a frase
  inteira. `tests/routing-precision.test.js` replaya cada forma contra as rules shipped.
- `tests/context-evals-shipped.test.js` semeia um pulse com feature ativa de nome
  "carregado" — o corpus é provado no estado mid-feature. Ao vivo neste repo: 215 cenários,
  precisão 1, recall 1.
- Evals: `absent` sem alvo = skip visível fora da matriz (`totals.skipped`); `mode` inválido
  = erro; `--strict` com zero cenários = exit 1; stopwords/verbos fora da sugestão.
- Redação: valor entre aspas é unidade; prefixo de env e `senha`; senha em URL; JSON
  redigido nos valores decodificados e re-serializado; run/task rows e os três emissores no
  mesmo funil. `tests/telemetry-redaction-shapes.test.js`.
- `context:usage`: fins de sessão por `run_key`, `failed` conta, `--feature` mantém fins de
  sessão (caveat), `related` no `brief_built`, `--since` só aceita número.
- Predicado de governança do guard cobre `my-agents`, `squads`, `advisors`, `genomes`,
  `templates`, `tasks`, `schemas`, `mcp`, `config.md`, `constitution.md`, `git-guard.json`.

## Receita

Antes de pinar um número de precisão/segurança, pergunte "em que estado do consumidor isso
foi medido?" e coloque esse estado na fixture: pulse com feature ativa, `--paths` de CI,
valores com aspas, JSON com aspas escapadas. Uma revisão adversarial por commit grande
(leitura + replay) custa menos que a regressão silenciosa em todo projeto.
