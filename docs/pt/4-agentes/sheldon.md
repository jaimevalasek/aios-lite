# @sheldon — Revisão independente obrigatória do PRD

> **Para quem é:** quem já tem um PRD e quer uma revisão crítica antes do plano de implementação.

## Para que serve

`@sheldon` procura lacunas, premissas implícitas, edge cases, inconsistências e riscos que poderiam tornar o plano frágil. Ele verifica de forma independente o `Current System Fit` do PRD contra evidência real do repositório.

Ele trabalha **no mesmo** `.aioson/context/prd-{slug}.md` criado por Product. Não abre uma segunda autoridade de requisitos, arquitetura, readiness ou planejamento.

## Quando invocar

- O domínio tem decisões difíceis ou premissas ainda frágeis.
- Billing, tenancy, autorização, integrações ou migração precisam de edge cases explícitos.
- O usuário quer uma revisão adversarial do PRD antes de aprová-lo para planejamento.
- Uma pesquisa externa pode melhorar materialmente os ACs ou exclusões.

Não invoque por classificação. MICRO, SMALL e MEDIUM podem usar Sheldon ou seguir diretamente para Planner.

## O que muda no PRD

Sheldon pode acrescentar:

- perguntas bloqueantes e decisões confirmadas;
- cenários de falha e limites;
- ACs ausentes ou ambíguos;
- evidência e decisão de encaixe ausentes, inventadas ou desatualizadas;
- referências e evidência relevante;
- riscos que o Planner deve refletir nas fases.

O enriquecimento termina quando `product_scope` e `prd_ready` podem permanecer aprovados com o conteúdo revisado. Se uma decisão de produto ainda depende do usuário, Sheldon pausa.

Sheldon também bloqueia a aprovação quando um estado material que o protótipo aprovado renderiza — carregando, vazio, erro, permissão negada, responsivo — não tem nem um critério de aceitação nem um adiamento registrado. Um estado que existe no protótipo e não aparece em lugar nenhum do PRD é uma perda silenciosa, não uma simplificação. Sheldon preserva ou repara o vínculo de identidade (`identity`/`identity_status`) da mesma forma: corrige em vigor um registro objetivamente descartado, emprestado de outra feature, órfão ou com `scope: exploration`, sem nunca inventar um registro que nunca foi extraído.

## Qualidade de especificação (anti-slop)

Antes da passada de cobertura numa feature com superfície visível, Sheldon consulta a mesma lente `spec-quality` que Product usa (`aioson brain:query . --agent=sheldon --tags=spec-quality`) — três nós, sem os nós de layout.

Ele aplica o teste de substituibilidade ao texto do PRD e repara em vigor visão genérica, capacidades nomeadas por tela e critérios de aceitação não observáveis. Superfície visível sem protótipo resolvido e sem registro de identidade é lacuna em aberto: repara o vínculo ou registra a rota explícita que Product escolheu. E restrição visual, de asset, de movimento, de performance ou de acessibilidade que sobreviveu só como prosa não tem evidência de aceitação — vira linha `AC-*` ou ganha um adiamento concreto.

## Relação com especialistas

Analyst, Architect, PM, UX/UI e Discovery Design Doc podem ser chamados explicitamente para uma dúvida delimitada. O parecer volta ao PRD ou ao plano pertinente e não cria um gate adicional.

## Saída principal

| Artefato | Tratamento |
|---|---|
| `.aioson/context/prd-{slug}.md` | enriquecido in-place, preservando Product como dono |
| pesquisa/dossiê | memória auxiliar não bloqueante, quando necessário |

## Handoff típico

- **Vem de:** `@product`.
- **Vai para:** `@planner`.

Sob autopilot, correções objetivas recomendadas são aplicadas no próprio PRD e o handoff é automático. Só uma decisão material de produto permanece como gate humano.

Isso inclui corrigir um protótipo legado ligado por engano: Sheldon valida status, slug, paths e dono do manifesto. Se o artefato pertence a outra feature, registra `prototype: null`, `prototype_status: none`, mantém o caminho apenas como exclusão histórica e informa o usuário no chat.

## Veja também

- [Ficha do @product](./product.md)
- [Ficha do @planner](./planner.md)
- [Feature completa com revisão obrigatória do Sheldon](../3-receitas/feature-completa-com-sheldon.md)
