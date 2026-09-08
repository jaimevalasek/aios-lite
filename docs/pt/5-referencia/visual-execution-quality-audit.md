# Auditoria de qualidade visual e execução — 05/09/2026

O trabalho recente melhorou a diversidade visual, a verificabilidade do acabamento e a operação das execuções orquestradas. A implementação tinha, porém, três lacunas entre o que era medido e o que os consumidores dessa evidência aceitavam. As três foram reproduzidas em testes e corrigidas nesta revisão.

## Escopo e evidência

Revisão dos caminhos relacionados nos commits de 28/08 a 03/09/2026, acompanhada de leitura do código atual e testes pelo verificador e pelo motor reais. Os hosts nos testes são adaptadores controlados; esta auditoria não executou uma feature completa com provedores externos nem julgou visualmente um site consumidor. Alterações locais que já existiam, incluindo o ciclo de vida de screenshots e a preservação de evidência runtime, foram mantidas.

| Frente | Commits examinados | Avaliação |
|---|---|---|
| Diversidade visual | `924a915c`, `0ce07ffa`, `a8fc2e8a` | Retirar presets, registrar a origem da paleta e eliminar exemplos que induziam repetição são avanços coerentes. Há testes para doutrina sem âncoras, sorteio, identidade e registro sem fixtures. |
| Acabamento premium | `7ca16d0b`, `2c8fd719` | Distinguir peso visual de marca da precisão de sistemas evita exigir ornamentação em toda interface. A nova nota ainda não era comparada na implementação. |
| Divisão de trabalho | `f9414455`, `3009b099` | Escala, posse de arquivos, dependências e limites de unidades tornaram a escolha de execução mais verificável. O término das unidades deixa integração e findings para o DEV responsável. |
| Recuperação e independência | `eb144771`, `e108f824` | Retomada, lease e orçamento melhoraram. A independência era verificada na configuração inicial e na decisão manual, mas não em cada fallback automático resolvido. |
| Observabilidade | `d2019d7d` | Heartbeat, atividade por unidade e acompanhamento por outro terminal tornam execuções longas investigáveis; os testes cobrem leitura transitória e processo sem heartbeat. |

## Falhas corrigidas

### 1. O acabamento podia regredir sem aparecer na comparação

`compareToPrototype` comparava presença de recursos, materiais, tipografia e outros sinais, mas ignorava `craft.weight.score` e `craft.precision.score`. Uma implementação podia conservar todos os eixos antigos e perder qualidade na nota usada para aprovar o protótipo.

Correção em `src/commands/verify-artifact.js`: os eixos graduados passam a acompanhar a comparação e o relatório persistido. Uma queda gera, por exemplo, `precision 100/100 → 71/100`. Se o protótipo tinha uma nota e a implementação não permite medir aquele eixo, a comparação é parcial e nomeia a ausência. Relatórios antigos sem nota não recebem um piso inventado; troca de modo não compara peso com precisão.

Teste: `tests/implementation-visual-autofire.test.js`, com brand, operate e read; notas isoladas em evidência de teste para provar a queda sem alterar os eixos antigos; casos de nota indisponível, mudança de modo e evidência sem score. A comparação continua advisory conforme o contrato existente.

### 2. O QA podia exceder seu orçamento e continuar aprovado

O motor já media `corrections_cap_exceeded`, mas derivava o status apenas do relatório do modelo. Um QA com `max_fix_files: 0` podia editar a tela, declarar PASS e aparecer como `qa_passed`.

Correção em `src/agent-execution/execution-run.js`: o excesso medido transforma o status efetivo em `failed`, preservando o verdict original para auditoria. Resumo, eventos, ledger e o mecanismo existente de rework consomem o status efetivo. `completed` continua significando que os pipelines terminaram, não que a feature recebeu aprovação final.

Teste: `tests/execution-run.test.js` demonstra o PASS contradito pela medição, o status failed e sua projeção no acompanhamento. As suítes existentes de rework e de correções dentro do limite continuam passando.

### 3. Um fallback automático podia fazer o implementador revisar a si mesmo

Com `require_independent_qa: true`, o revisor principal podia ser diferente do implementador, mas o fallback por capacidade trocar para o mesmo host/model do DEV. A checagem anterior ao dispatch não enxergava essa troca interna.

Correção em `src/agent-execution/dispatcher.js` e `execution-run.js`: a execução orquestrada fornece uma checagem aplicada à identidade resolvida de cada tentativa. Uma tentativa de autorrevisão é recusada antes de chamar o adaptador, registrada no histórico como `self_review_blocked` e encaminhada como decisão pendente. A opção de independência permanece opt-in.

Teste: `tests/execution-run.test.js` reproduziu o lançamento indevido; depois da correção, demonstra zero chamadas ao implementador como revisor quando a opção está ligada e preserva o comportamento permitido quando está desligada.

## Validação

- Primeiro ciclo focado: 32/32 testes aprovados após as correções visual e de orçamento QA.
- Ampliação visual/design/compilação/roteamento: 240/241 passaram na execução paralela. O único erro foi `execution-unattended.test.js`, que usa 300 ms para um subprocesso: a sonda inicial retornou timeout antes da sonda de escrita. A suíte completa desse arquivo passou isoladamente, 13/13, sem alterações. Isso indica sensibilidade ao tempo sob carga; não foi tratado como regressão corrigida.
- Após a correção de fallback: 53/53 testes de execução, rework, dispatcher, capacidade e retomada passaram.
- `npm run check:syntax`: 577 arquivos JavaScript verificados.
- `rules:check`: regras obrigatórias aprovadas; permanecem avisos de tamanho e acoplamento em módulos grandes. `git diff --check` global também aponta whitespace em alterações preexistentes de `src/cli.js`; esta revisão não as alterou.
- A suíte integral do repositório não foi executada. Os checks escolhidos cobrem os caminhos alterados e seus consumidores próximos.

## Melhorias seguintes que valem investimento

1. Avaliar entregas reais por domínio, com screenshots de desktop/mobile e tarefas completas. Usar comparação visual sem mostrar a nota ao avaliador ajuda a descobrir quando o score está premiando um resultado ainda genérico. As métricas comprovam sinais específicos, não beleza ou originalidade por si sós.
2. Calibrar o motor com exemplos aceitos e rejeitados pelo dono, reservando exemplos fora da calibração. Comparar composição, hierarquia, imagens, adequação ao domínio e usabilidade; diversidade de paleta sozinha não resolve repetição de layout.
3. Medir execuções reais até a integração e a aceitação final: regressões encontradas, retrabalho, decisões pendentes, tempo e custo. Independência por host/model é uma garantia operacional limitada, não prova de independência de julgamento.
4. Reduzir gradualmente a concentração de responsabilidades em `verify-artifact.js`, `execution-run.js` e `dispatcher.js`, preservando os contratos agora cobertos. Os avisos de tamanho/acoplamento justificam essa manutenção, mas uma reestruturação ampla não era necessária para corrigir as falhas demonstradas.
