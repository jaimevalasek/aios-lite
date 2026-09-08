---
slug: refiner-prototype-checkpoint
status: done
owner: dev
created_at: 2026-09-05
updated_at: 2026-09-05
classification: MICRO
risk: low
source: direct-user-request
---

# Escolha de continuidade após o protótipo inicial

## Scope
Fazer o Refiner perguntar se o usuário quer encerrar com o protótipo criado ou autorizar uma rodada limitada de refinamento antes das verificações extensas.

## Context selected
- Contexto validado; context:brief com caminhos concretos e must_load consultados.
- Regras: simple-plan-lane, agent-structural-contract, disk-first-artifacts, source-code-language-convention; visual-exploration-contract preservado.
- Skill prompt-sharpener e diagnóstico já lidos nesta conversa: explicitar parada, autoridade e custo sem enfraquecer a aprovação.
- Padrão: kernel compacto roteia para prototype-and-delegation; testes de contrato existentes verificam conteúdo e paridade template/workspace.
- Learning evidence-artifacts-had-no-lifecycle: releituras e imagens multiplicam o custo das rodadas.

## Implementation intelligence
- Mudança nas instruções, sem novo comando, dependência ou schema de aprovação.
- Preservar protótipo com dono, design engine, feedback textual pelo CLI e gate de aprovação existente.
- Aplicar o checkpoint somente à rota canônica do Refiner; visual-exploration mantém seu contrato.
- Registrar a decisão no manifesto existente, antes da medição vinculada ao conteúdo.

## Useful options considered
- Include now: pergunta após a criação, parada sem resposta, reaproveitamento de autorização explícita, uma rodada finita, distinção entre entrega draft e aprovação.
- Defer: orçamento numérico de tokens e novos modos de CLI; os prompts não medem tokens consumidos.
- Escalate: nenhuma decisão adicional necessária.

## Expected files
- behavior: template/.aioson/agents/refiner.md
- behavior: template/.aioson/docs/briefing/prototype-and-delegation.md
- support: .aioson/agents/refiner.md
- support: .aioson/docs/briefing/prototype-and-delegation.md
- support: tests/briefing-agent-kernels.test.js
- support: .aioson/context/simple-plans/refiner-prototype-checkpoint.md
- support: .aioson/context/dev-state.md

## Done criteria
- O checkpoint precede polish, matriz runtime, screenshots e walkthrough completo.
- Encerrar ou não responder não autoriza refino nem aprovação.
- Autorização explícita existente vale para o mesmo escopo; autopilot e o adjetivo premium não substituem a escolha.
- Uma rodada inclui inspeção, correção e verificação final; findings residuais não reiniciam a rodada.
- Paridade do template e contratos de aprovação permanecem válidos.

## Verification
- node --test tests/briefing-agent-kernels.test.js tests/prototype-forge-kernel.test.js tests/refiner.test.js tests/prototype-manifest-quality.test.js tests/briefing-cli.test.js
- Revisão manual de cenários: pedido simples, encerrar, sem resposta, refinar, autorização anterior, limite esgotado e pedido posterior de aprovação.

## Session state
Next step: concluído; sem etapa pendente.

## Validation results
- 44/44 testes aprovados: briefing-agent-kernels, prototype-forge-kernel, refiner, prototype-manifest-quality e briefing-cli.
- Paridade byte a byte de template/workspace verificada; kernel continua abaixo de 12.000 caracteres.
- Diff dos caminhos alterados sem erros de whitespace; rules:check retorna RULES=OK (avisos de manutenção preexistentes em outros módulos).
- Revisão manual: pedido simples termina na escolha; encerrar e ausência de resposta não autorizam trabalho adicional; refinar autoriza uma rodada; pedido explícito anterior dispensa repetição da pergunta; orçamento consumido não reinicia na retomada; pedido posterior de aprovação exige evidência completa.
- Limitação: validação dos contratos e das instruções, sem executar uma sessão de prototipação com outro modelo nem medir economia real de tokens.
