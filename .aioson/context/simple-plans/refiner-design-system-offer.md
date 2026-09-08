---
slug: refiner-design-system-offer
status: done
owner: dev
created_at: 2026-09-07
updated_at: 2026-09-07
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan — Oferta proativa de identidade no Refiner

## Scope
Fazer o Refiner oferecer a criação de um design system reutilizável sem exigir que o cliente peça identity.md, com ou sem referências.

## Context selected
- Contexto validado por context:validate; context:brief executado e must_load consultado.
- Feature ativa execution-roles-onboarding é independente; nenhuma transição de workflow.
- Padrões: kernel compacto, módulos progressivos, identidade única com source references/intent, manifest como registro de decisão.
- Regras: simple-plan-lane, paridade template/workspace, idiomas, disk-first e isolamento de exploração.
- Skill prompt-sharpener: transformar sugestão passiva em decisão oferecida uma vez, com evidência e limites claros.

## Implementation intelligence
- Reutilizar schema de identity.md, verify:artifact identity/visual e binding existente do manifest para Product.
- Apenas instruções do Refiner e seus dois módulos; sem CLI, schema ou dependência nova.
- Diagnóstico: audit sugere apenas imagens; rota sem imagens não oferece consolidação posterior, apesar de interface-design já permitir source: intent após aprovação visual.

## Done criteria
- Oferta explícita para superfícies visuais, com referências, criação do zero ou adiamento.
- Escolhas existentes e identidade existente evitam perguntas repetidas.
- Sem referências, persistência só após inspeção e aceitação explícita da direção; nunca fabricar fonte observada.
- Escopo briefing por padrão; marca global apenas quando escolhido. Binding atualizado e evidência visual refeita se necessário.
- Preservar parada após protótipo inicial, orçamento de refino e aprovação humana do briefing.

## Useful options considered
- Include now: oferta em linguagem simples, decisão registrada no manifest, consolidação com schema atual.
- Defer: galeria visual de componentes e comandos novos; identity.md documenta regras, não implementa uma biblioteca.
- Escalate: nenhuma decisão de arquitetura necessária.

## Out of scope
Publicação, criação de identidade deste CLI, mudança de design engine, exploração sem briefing e alterações anteriores no worktree.

## Expected files
- template/.aioson/agents/refiner.md (behavior)
- template/.aioson/docs/briefing/prototype-and-delegation.md (behavior)
- template/.aioson/docs/briefing/refinement-loop.md (behavior)
- Respectivas três cópias em .aioson/ (support)
- Este plano e .aioson/context/dev-state.md (support)

## Verification
- node --require ./tests/setup/windows-fs-retries.js --test tests/briefing-agent-kernels.test.js tests/identity-binding.test.js tests/reference-identity-extract.test.js tests/design-skill-default.test.js
- Revisão manual de cenários: sem imagens, com imagens, identidade existente, adiamento, retomada e encerramento do protótipo.
- git diff --check nos caminhos tocados; paridade exata dos três pares.

## Session state
Next step: concluído; sem etapa pendente.

## Notes
- Kernel e dois módulos atualizados, com cópias sincronizadas apenas nesses caminhos. Alterações anteriores preservadas.
- 32/32 testes existentes passaram: kernel compacto, escolha de continuidade, identidade, binding downstream, default da engine e paridade template/workspace.
- Revisão manual: referências mantêm source: references; sem imagens aguarda aceitação visual para source: intent; reuse/later/pending evitam repetição; encerramento não autoriza refino; projeto global exige escolha de escopo; evidência invalidada precisa de nova verificação autorizada.
- git diff --check limpo. rules:check retornou RULES=OK; avisos de tamanho/acoplamento pertencem a arquivos de código com alterações anteriores, fora desta entrega.
- Limite: validação de contratos/instruções; não houve sessão real de Refiner construindo um protótipo nesta alteração.
