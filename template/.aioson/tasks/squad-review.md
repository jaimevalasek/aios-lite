# Task: Squad Review Loop

> Protocolo de review loop dentro de uma workflow phase.

## Quando usar
- Automaticamente pelo @orquestrador quando uma phase tem `review` declarado
- O orquestrador NÃO precisa ser instruído — ele lê o manifest e segue

## Processo

### Passo 1 — Fase produz output
O executor da phase gera seu output normalmente.

### Passo 2 — Checar veto conditions
Antes do review, verificar se alguma veto condition é violada:
- Se `action: block` → parar pipeline, notificar usuário
- Se `action: reject` → auto-rejeitar sem review (economiza uma rodada)
- Se `action: warn` → continuar mas marcar warning

### Passo 3 — Invocar reviewer
O executor definido em `review.reviewer` avalia o output com base nos `criteria`.

O reviewer deve produzir:
```
## Review: {phase-title}

**Verdict:** accepted | rejected
**Score:** {0-10}

### Criteria evaluation
- ✓ {criteria 1}: {assessment}
- ✗ {criteria 2}: {assessment with specific feedback}
- ✓ {criteria 3}: {assessment}

### Feedback (if rejected)
{Specific, actionable feedback for the creator. Not vague — exact issues and suggestions.}

### Veto check
- {veto condition 1}: passed | triggered
```

### Passo 4 — Se aceito
Marcar phase como completed. Seguir para a próxima.

### Passo 5 — Se rejeitado
1. Incrementar retry counter
2. Se retry counter > maxRetries → escalate:
   - `human`: pausar e pedir decisão humana
   - `skip`: pular a fase com warning
   - `fail`: falhar o pipeline
3. Se ainda tem retries:
   - `feedback` strategy: enviar feedback do reviewer ao executor original
   - `fresh` strategy: re-executar sem contexto do attempt anterior
   - `alternative` strategy: pedir a um executor diferente (se disponível)
4. Voltar ao onReject phase ID

## Regras
- NUNCA permitir mais de maxRetries iterações (hard limit)
- SEMPRE incluir o feedback do reviewer no retry
- O reviewer NUNCA deve ser o mesmo executor que criou o output
- Registrar cada retry no log: attempt number, reason, feedback
