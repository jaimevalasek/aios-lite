# Proposta: Ambient Intelligence Layer — AIOSON Health System

**Data:** 2026-03-30
**Origem:** Discussão sobre automatizar learning:evolve e tool:*
**Insight do usuário:** Se depende do usuário lembrar de rodar, não é automação — é documentação.

---

## O problema central

Qualquer comando que depende de iniciativa humana para disparar tem uma taxa de adoção próxima de zero.
O `learning:evolve`, o `tool:*`, e qualquer futura melhoria do sistema sofre do mesmo problema.

A solução não é melhorar os comandos — é remover a necessidade de o usuário saber que eles existem.

---

## Visão: AIOSON com agência sobre si mesmo

O framework deve:
1. Observar silenciosamente o que acontece nas sessões
2. Acumular padrões no SQLite (já faz isso)
3. Decidir sozinho quando algo é sólido o suficiente para agir
4. Avisar o usuário apenas quando precisa de uma decisão humana
5. Executar o resto de forma invisível

---

## Arquitetura: 3 camadas de automação

### Camada 1 — Hooks de sessão (mais simples, implementar primeiro)

Disparar automaticamente ao `live:close`:

```javascript
// src/commands/live.js — no handler close
if (pendingLearnings >= 3) {
  await runLearningEvolve({ autoApply: true, quiet: true });
}
```

Custo: mínimo. Já existe o ponto de integração.

### Camada 2 — Alerta de abertura de sessão

No início de qualquer sessão (`live:start`, `workflow:next`), verificar estado do sistema e emitir digest se houver itens pendentes:

```
AIOSON — 3 itens aguardam atenção:
  ● 12 learnings prontos para evoluir
  ○ Squad "frontend" inativo há 14 dias
  ○ 1 tool com handler quebrado

→ Processar agora? [Y/n]
```

Custo: médio. Precisa de um `health-check.js` que agrega estado de múltiplas tabelas.

### Camada 3 — Daemon de monitoramento contínuo (squad-daemon.js expandido)

`aioson daemon:start .` — processo em background que:
- Monitora SQLite a cada N minutos
- Age autonomamente em condições seguras (auto-apply de learnings validados)
- Notifica via terminal/webhook em condições que precisam de decisão humana
- Gera digest diário (ou na abertura do terminal via hook de shell)

O `squad-daemon.js` já existe — é o ponto de extensão natural.

---

## Condições e ações

| Condição | Ação automática | Notifica o usuário |
|----------|----------------|-------------------|
| Learnings freq≥2 acumulados (≥5) | `learning:evolve --auto-apply` | Apenas o resultado |
| Context file > 300 linhas | Consolida via LLM | Mostra o que foi comprimido |
| Squad inativo > 30 dias | — | "Squad X pode ter contexto desatualizado" |
| Tool sem uso > 60 dias | — | "3 tools sem uso — remover?" |
| Learning promovido, arquivo alvo ausente | — | "Erro de evolução detectado" |
| Evolution log com rollback | Para auto-apply | "Evolução revertida — revisar manualmente" |

---

## Formato do digest diário

Exibido na abertura do terminal (via ~/.bashrc hook ou `aioson status`) ou ao iniciar qualquer sessão:

```
AIOSON health — meu-projeto (2026-03-30)
  ● 8 learnings prontos para evoluir → aioson learning:evolve .
  ○ Squad "frontend" sem atividade (14d)
  ○ Tool "check_health" com handler quebrado

Processar automaticamente? [y/N]  Ignorar por 24h? [s]
```

---

## Por que isso transforma o AIOSON

Sem isso: AIOSON é um CLI que você usa quando lembra.
Com isso: AIOSON é um framework que evolui com o projeto e pede atenção quando necessário.

A diferença de experiência:
- Sem: usuário precisa saber que `learning:evolve` existe, lembrar de rodar, entender quando faz sentido
- Com: usuário simplesmente trabalha com os agentes; o framework cuida do resto silenciosamente

---

## Implementação sugerida (ordem)

1. **Hook no live:close** — auto-apply de learnings (1 sessão de /dev)
2. **Health check no live:start / workflow:next** — digest de abertura (1 sessão de /dev)
3. **`aioson health`** — comando explícito que mostra estado completo do sistema (1 sessão de /dev)
4. **Daemon expandido** — monitoramento contínuo via squad-daemon.js (1-2 sessões de /dev)

---

## Conexão com Feature 1 e Feature 2

- Feature 1 (Evolution Pipeline) só tem valor real com a Camada 1 (hook no live:close)
- Feature 2 (Dynamic Tools) se beneficia do health check: daemon detecta tools quebradas
- Juntos os três formam o "Ambient Intelligence Layer" do AIOSON
