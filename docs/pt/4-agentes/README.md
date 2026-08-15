# Guia de Agentes AIOSON

> Índice dos agentes públicos, com situação de uso e saída esperada.
> Cada agente tem sua ficha — clique no nome para detalhes.
> `@pair` é alias de `@deyvin` e não possui ficha separada.

> **As colunas "Quando invocar" descrevem capacidades, não a ordem obrigatória.**

---

## A esteira principal

```text
@briefing → @briefing-refiner → @product → @sheldon → @planner → @dev → @qa → @tester → @pentester
```

Esta é a cadeia que constrói feature, em ciclo. MICRO, SMALL e MEDIUM percorrem a mesma ordem — a classificação muda profundidade, orçamento e cobertura de risco, não a sequência.

| # | Agente | Para que serve | Saída principal |
|---|---|---|---|
| 1 | [@briefing](./briefing.md) | Transforma fontes cruas em briefing pré-PRD, com fontes preservadas e promessas `PROM-*` numeradas | `briefing.md` |
| 2 | [@briefing-refiner](./briefing-refiner.md) | Audita as lacunas em achados estruturados e monta o protótipo navegável que você aprova. O CLI renderiza a revisão (`briefing:review`) e aplica o feedback confirmado (`briefing:apply-feedback`) | `prototype.html`, `refinement-findings.json`, `review.html`, `refinement-report.md` |
| 3 | [@product](./product.md) | Define capacidades `CAP-*`, critérios observáveis e o que fica explicitamente fora | `prd-{slug}.md` |
| 4 | [@sheldon](./sheldon.md) | Confronta o PRD com fonte, protótipo e repositório; corrige no próprio arquivo e sela | o mesmo `prd-{slug}.md` + PASS vinculado ao hash |
| 5 | [@planner](./planner.md) | Transforma o PRD selado em etapas verticais com arquivos exatos e check por etapa | `implementation-plan-{slug}.md` |
| 6 | [@dev](./dev.md) | Implementa etapa por etapa pela rota real de produção | código + `dev-state.md` |
| 7 | [@qa](./qa.md) | Veredito independente contra o PRD, com evidência — **este é o Gate D** | `qa-report-{slug}.md` |
| 8 | [@tester](./tester.md) | Cobertura que protege o comportamento já aprovado: regressão, borda, defeito reproduzido | `test-report-{slug}.md` |
| 9 | [@pentester](./pentester.md) | Sonda a superfície como adversário autorizado, corrige e re-sonda | `security-findings-*.json` |

**Onde o automático para.** O encadeamento automático (Autopilot) vai de `@product` até `@qa`. Briefing e Refiner são a entrada de fonte crua — opcionais quando a direção já está clara, mas se iniciados precisam ser concluídos e aprovados; escopo visual exige o protótipo aprovado antes do Product. `@tester` e `@pentester` são o endurecimento pós-veredito, habilitados por feature, e **não concedem o Gate D**. `feature:close` e publicação são sempre seus. Veja [Autopilot Handoff](../5-referencia/autopilot-handoff.md).

**A rota curta.** Para uma mudança bounded, o Simple Plan vai direto ao [@deyvin](./deyvin.md) — escopo, plano curto, implementação, verificação — sem passar pela esteira, e escala para ela se o escopo crescer.

---

## Consultorias opt-in

Estes agentes **não são etapas da esteira**. Você os chama para uma dúvida nomeada e concreta; o parecer volta para o PRD ou para o plano. Nenhum deles cria documento obrigatório ou gate extra.

| Agente | Para qual dúvida nomeada | Saída principal |
|---|---|---|
| [@analyst](./analyst.md) | Quais entidades, regras e fluxos já existem no domínio | análise no PRD ou artefato consultivo |
| [@architect](./architect.md) | Qual opção de estrutura, integração ou fronteira técnica escolher | registro da decisão ou parecer |
| [@ux-ui](./ux-ui.md) | Uma decisão de interação que o protótipo aprovado não resolveu | parecer; `design-doc.md` só se você pedir o entregável |
| [@pm](./pm.md) | Prioridade, dependência ou ordem de rollout; não substitui `@planner` | parecer ou backlog consultivo |
| [@scope-check](./scope-check.md) | "O que foi entregue confere com o que foi pedido?" | `scope-check.md` |
| [@orchestrator](./orchestrator.md) | Coordenação de execução genuinamente paralela ou cross-cutting | coordenação e handoffs |
| [@validator](./validator.md) | Verificação binária extra contra o contrato de sucesso, depois do QA | veredicto do harness |
| [@discovery-design-doc](./discovery-design-doc.md) | Discovery + design doc, quando isso é o objetivo em si | `design-doc*.md` + `readiness*.md` |
| [@forge-run](./forge-run.md) | Lane B: compila e roda o workflow de verificação executável de uma feature MEDIUM com contrato `verification` | `forge-run.workflow.js` |
| **@shakedown** | Pente-fino pós-entrega, independente da spec *(ficha em construção)* | relatório de achados |

---

## Boot, roteamento e continuidade

| Agente | Para que serve | Quando invocar | Saída principal |
|---|---|---|---|
| [@setup](./setup.md) | Onboarding: detecta stack, classifica projeto | Sempre primeiro num projeto novo | `project.context.md` |
| [@neo](./neo.md) | Roteador: diz qual agente é o próximo | Quando você está perdido | Orientação verbal |
| [@deyvin](./deyvin.md) | Pair-programming, continuidade de sessão e a rota curta (Simple Plan) | Retomar feature interrompida ou fazer uma mudança pequena | continuação do trabalho |
| [@pair](./deyvin.md) | Alias de `@deyvin` | — | — |
| [@committer](./committer.md) | Gera mensagem de commit profissional | Após implementar, antes de commitar | mensagem de commit |
| [@discover](./discover.md) | Constrói cache semântico do projeto | Onboarding em codebase grande | `.aioson/context/bootstrap/` |

---

## Especializações

| Agente | Para que serve | Quando invocar | Saída principal |
|---|---|---|---|
| [@squad](./squad.md) | Cria e gerencia squads customizados de agentes | Domínio fora do padrão AIOSON | squad em `.aioson/squads/` |
| [@genome](./genome.md) | Cria DNA cognitivo de uma persona (Genome 4.0) | Antes de forjar um advisor | `genome.yaml` |
| [@profiler-researcher](./profiler-researcher.md) | Coleta material bruto sobre pessoa pública | Passo 1 do pipeline Profiler | notas de pesquisa |
| [@profiler-enricher](./profiler-enricher.md) | Analisa cognitivamente o material | Passo 2 do pipeline Profiler | análise DISC/Enneagram/MBTI |
| [@profiler-forge](./profiler-forge.md) | Gera Genome 4.0 e advisor | Passo 3 do pipeline Profiler | `genome.yaml`, advisor |
| [@site-forge](./site-forge.md) | Clona, reconstrói ou extrai design de URL | Quando quer replicar ou inspirar-se num site | arquivos clonados, design skill |
| [@design-hybrid-forge](./design-hybrid-forge.md) | Combina dois design skills num híbrido | Quer visual que não existe nos padrões | novo design skill |
| [@orache](./orache.md) | Investigação de domínio e pesquisa estratégica | Antes de entrar num mercado novo | relatório de domínio |
| [@copywriter](./copywriter.md) | Copy de conversão: landing pages, emails | Quando precisa de texto que converte | copy entregável |
| **@benchmark** | Constrói, valida e pontua um app/jogo isolado de benchmark com prompt congelado *(ficha em construção)* | Comparar modelos ou versões do framework | run de benchmark |

---

## Como escolher o agente certo

Se você não sabe qual agente invocar, use `@neo` — ele lê o estado do projeto e te orienta.

Veja também:
- [Mapa do ecossistema](../1-entender/mapa-do-ecossistema.md) — a esteira fase a fase e o time completo
- [Decisões iniciais](../2-comecar/decisoes-iniciais.md) — MICRO, SMALL ou MEDIUM?
- [Glossário](../1-entender/glossario.md) — definições de termos como Esteira, Gate D, Simple Plan, Protótipo
