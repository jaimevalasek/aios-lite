# UI Language — AIOSON Visual Standards

> Carregue quando um agente precisa apresentar opções, status ou checkpoints ao usuário.

## Status symbols
✓ completo / aprovado
✗ falhou / bloqueado
◆ em progresso
○ pendente
⚠ atenção necessária
⚡ auto-aprovado

## Stage banner
Usar ao iniciar fase principal:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AIOSON ► @{AGENT} — {FASE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Checkpoint verify (confirmação visual)
Usar: após implementação que o usuário precisa ver
```
┌─────────────────────────────────────────────┐
│  ✓ VERIFICAR: {título}                      │
│  {instrução específica}                      │
│  Confirmar? [s/n]                           │
└─────────────────────────────────────────────┘
```

## Checkpoint decision (AskUserQuestion — radio)
Usar: quando há bifurcação com outcomes diferentes
→ AskUserQuestion com multiSelect: false, 2-4 opções

```
┌─────────────────────────────────────────────┐
│  ◆ DECISÃO NECESSÁRIA                      │
│                                             │
│  {contexto da decisão}                      │
│                                             │
│  1. {opção A} — {consequências}            │
│  2. {opção B} — {consequências}            │
│                                             │
│  Escolha [1/2]:                            │
└─────────────────────────────────────────────┘
```

## Checkpoint action (passo manual)
Usar: apenas para passos que o agente literalmente não pode executar
```
┌─────────────────────────────────────────────┐
│  ⚠ AÇÃO MANUAL NECESSÁRIA                  │
│                                             │
│  {instrução específica}                      │
│  {onde executar}                             │
│                                             │
│  Avise quando estiver pronto.              │
└─────────────────────────────────────────────┘
```

## Checkpoint multi-select (AskUserQuestion — checkbox)
Usar: seleção múltipla (skills, requirements, itens de sprint)
→ AskUserQuestion com multiSelect: true

## Progress bar
Usar para fases longas com steps definidos:
```
Progresso: ████████░░ 80% (4/5 steps)
```

## Regras
- Header máximo 12 caracteres
- Máximo 4 opções em radio; máximo 8 em checkbox
- Incluir opção "Nenhuma/Pular" em checkbox quando pertinente
- Não usar checkbox para decisões que mudam arquitetura (use radio)
