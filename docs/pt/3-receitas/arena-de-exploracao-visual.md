# Receita: exploração visual e arena entre modelos

> **Use quando:** você quer testar uma nova pele para o front-end atual, reconstruir uma direção a partir de prints ou comparar modelos antes de criar o Briefing.
> **Resultado:** variantes clicáveis, comparação cega ou identificada, relatório completo com prompts reutilizáveis e uma promoção rastreável para `plans/{slug}/`.

## O que muda no fluxo

Com Briefing refinável, o `@refiner` continua criando o protótipo canônico em `.aioson/briefings/{slug}/`.

Sem Briefing, uma exploração fica isolada em `.aioson/explorations/{slug}/`. Ela pode ser selecionada, mas só vira fonte de produto depois de `exploration:promote` e da criação normal do Briefing. Seleção visual não é aprovação de escopo.

## 1. Escolha a configuração

- Alvo: redesign do sistema atual, referência externa ou ambos.
- Estratégia: `single`, `sequential` ou `arena`.
- Contexto: `isolated` para benchmark justo; `cumulative` para melhorar a versão anterior.
- Exibição: `blind` esconde os modelos durante a comparação; `labeled` mostra a origem.
- Varredura: `targeted` é a recomendação para um produto existente; `full` amplia o inventário; `none` trabalha apenas com o material fornecido.

```bash
aioson exploration:init . \
  --slug=novo-visual-dashboard \
  --title="Novo visual do dashboard" \
  --goal="Modernizar sem perder a navegação e as tarefas atuais" \
  --strategy=arena \
  --context-policy=isolated \
  --display-mode=blind \
  --target=current-system-redesign \
  --scan=targeted \
  --json
```

## 2. Importe prints e complemente com o código

```bash
aioson exploration:references . \
  --slug=novo-visual-dashboard \
  --files="referencias/home.png,referencias/detalhe.png" \
  --json

aioson exploration:scan . \
  --slug=novo-visual-dashboard \
  --scope=targeted \
  --paths="src/app,src/components,src/styles" \
  --json
```

Os prints comprovam o visual observado. A varredura identifica candidatos como rotas, entradas, componentes, estilos/tokens, testes e manifests. O agente ainda deve inspecionar os arquivos relevantes para separar fatos do código, inferências e novas propostas.

Antes de gerar, confirme `intake.json` por `exploration:intake`. Se os prints não cobrem shell, superfície principal, detalhe crítico ou estados importantes, o Refiner oferece três saídas: pedir mais imagens, varrer o repositório ou prosseguir com suposições nomeadas.

## 3. Gere uma ou várias variantes

Uma arena usa a mesma entrada congelada e exige modelos explícitos:

```bash
aioson exploration:run . \
  --slug=novo-visual-dashboard \
  --models="codex:gpt-5.6,claude:opus-5,kimi:kimi-k3,qwen:qwen3-coder" \
  --parallel=4 \
  --explicit-model-request \
  --json
```

Cada modelo recebe uma pasta exclusiva `runs/variant-*`. Os workers são somente leitura; o processo pai valida e grava `prototype.html` e `report.md`. Os relatórios herdam `interaction_language` configurado pelo Setup em `project.context.md`; agentes, skills, genomes, marcadores e identificadores técnicos continuam canônicos em inglês. A entrada `inputs/user-prompts.md` preserva automaticamente os prompts materiais do usuário e é congelada por variante — não é necessário pedir isso no chat. Na raiz, `RELATORIO.md` é atualizado automaticamente com esses prompts e links diretos para cada protótipo e relatório detalhado. Uma falha não apaga as variantes concluídas nem troca o modelo silenciosamente.

Para testar outro modelo depois, use estratégia `sequential`. Com política `isolated`, ele recebe apenas a entrada original; com `cumulative`, informe `--parent=variant-a` para usar os aprendizados da rodada anterior.

## 4. Compare e comente

```bash
aioson exploration:review . --slug=novo-visual-dashboard --json
```

Abra `comparison.html` em um navegador real. Você pode alternar variantes, marcar regiões, escrever observações e exportar `exploration-feedback.json`.

```bash
aioson exploration:select . \
  --slug=novo-visual-dashboard \
  --feedback=.aioson/explorations/novo-visual-dashboard/exploration-feedback.json \
  --json
```

Cada `report.md` preserva proveniência, decisões, correções, limitações, o prompt exato, um prompt único reutilizável e uma sequência incremental. Até relatórios de variantes rejeitadas permanecem úteis para aprendizado ou benchmark externo.

## 5. Promova a direção escolhida

```bash
aioson exploration:promote . \
  --slug=novo-visual-dashboard \
  --briefing-slug=modernizacao-dashboard \
  --json
```

Isso cria `plans/modernizacao-dashboard/visual-exploration.md` com caminhos e SHA-256 dos artefatos escolhidos. Depois:

`@briefing → @refiner → aprovação do usuário → @product`

O Briefing separa o que é direção visual do que seria nova interação ou novo escopo. O Refiner consolida um protótipo canônico e exclusivo da feature; ele nunca simplesmente renomeia a exploração como aprovada.

## Estrutura criada

```text
.aioson/explorations/novo-visual-dashboard/
├── exploration-manifest.json
├── exploration-manifest.md
├── RELATORIO.md
├── intake.json
├── inputs/
│   ├── task.md
│   ├── source-map.md
│   ├── user-prompts.md
│   └── references/
├── runs/
│   ├── variant-a/{run-manifest.json,prototype.html,report.md}
│   └── variant-b/{run-manifest.json,prototype.html,report.md}
├── comparison.html
└── exploration-feedback.json
```
