---
slug: design-seed-coherence
status: done
owner: dev
created_at: 2026-09-07
updated_at: 2026-09-07
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan — Sorteios visuais coerentes e distintos

## Scope
Corrigir a seleção de candidatos de design:seed para fornecer alternativas coerentes com o registro e sem repetições evitáveis.

## Context selected
- context:validate válido; context:brief must_load consultado; feature execution-roles-onboarding independente.
- Reutilizar color-math, bancos de composição/fontes, fingerprints medidos e registro de sorteios existentes.
- Regras: implementação em inglês, limites de módulo existentes, Simple Plan e persistência isolada.
- Evidência: sonda pura (sem escrita) de 16 slugs × 6 registros, três candidatos por sorteio: 18/96 sorteios com composição repetida; 21/96 com acentos separados por menos de 28 graus. Registro técnico só dispõe de centered-object e aceita todos os seis materiais globais.

## Implementation intelligence
- Escolher por restrições antes de desempatar com o PRNG; garantir diversidade enquanto o banco permite.
- Comparar o acento final, não a cor base, entre alternativas e contra fingerprints.
- Busca de paleta limitada; quando não existe espaço livre, selecionar o melhor candidato medido e reportar saturação.
- Materiais por registro e composições técnicas distintas reutilizam o vocabulário atual, sem presets por negócio.
- Manter identidade/polo escolhido, contraste, determinismo com mesmos inputs/histórico, no-persist e guarda de fixtures.

## Done criteria
- Três alternativas distintas em fonte e composição para cada registro quando há opções disponíveis.
- Separação dos acentos verificada no resultado; histórico saturado não leva a laço infinito nem a sucesso silencioso.
- Acabamento compatível com registro; estilo técnico não sorteia vidro nem movimento ambiente.
- Diagnósticos de diversidade chegam ao JSON, texto do CLI e registro persistido.
- Testes de regressão pelo gerador e comando reais, sem poluir o histórico do operador.

## Useful options considered
- Include now: seleção e diagnóstico no caminho normal de design:seed.
- Defer: detecção de semelhança visual por imagem, novo catálogo e benchmark estético com geração de sites.
- Escalate: nenhuma decisão de produto/arquitetura nova.

## Expected files
- src/lib/design-seed.js (behavior)
- src/lib/design-seed-banks.js (behavior; bancos extraídos para manter o gerador abaixo do limite de tamanho)
- src/commands/design-seed.js (behavior)
- tests/design-seed.test.js (support)
- tests/design-seed-provenance.test.js (support, se necessário)
- Este plano e .aioson/context/dev-state.md (support)

Estimativa atual: 7 caminhos, 3 de comportamento, mesmo módulo de sorteio/comando. A separação dos bancos responde ao aviso de tamanho medido durante a revisão; não altera a API pública.

## Verification
- Testes focados design-seed, provenance, color/visual telemetry e doctrine anchors.
- Repetir exatamente a sonda 96 sorteios após correção; testar seis alternativas e histórico saturado.
- Smoke CLI real com --no-persist; git diff --check e sintaxe.

## Session state
Next step: concluído; sem etapa pendente.

## Evidence
- Cinco regressões falharam antes da implementação: alternativas repetidas, fonte livre ignorada, esgotamento de banco, saturação silenciosa e materiais incompatíveis.
- Gerador interno passa de 1.2.0 para 1.3.0; escolhas usam restrições antes do desempate pelo PRNG. Buscas de paleta limitadas a 36 avaliações, com diagnóstico dos conflitos remanescentes.
- Mesma sonda de 96 sorteios, sem persistência: composições repetidas 18 → 0; pares de acento com distância menor que 28 graus 21 → 0; fontes repetidas 0 → 0. A sonda virou teste de regressão.
- Técnico recebe três composições de trabalho/dados, acabamento por regras/tons/status e espaçamento compacto; identidade/polo explícito continuam prevalecendo.
- 95/95 testes passaram, incluindo JSON/texto/registro persistido, seis alternativas, histórico saturado, contraste, identidade, telemetry e proteção do histórico do operador.
- Smoke do CLI real via node bin/aioson.js design:seed . --register=technical --count=3 --no-persist --json: ok, três alternativas distintas, recorded null.
- Sintaxe válida e git diff --check limpo. rules:check: RULES=OK; extração dos bancos eliminou o novo aviso de tamanho do gerador. Avisos de funções legadas permanecem advisory.
- Limite: métricas de diversidade/coerência do sorteio; não é avaliação estética de sites renderizados nem garantia de ausência de genericidade no resultado de um modelo.
