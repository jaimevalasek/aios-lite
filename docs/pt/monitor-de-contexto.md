# Monitor de Contexto

> Visualiza em tempo real o uso de janela de contexto por agente, com alertas automáticos de warning e critical.

O `context:monitor` lê o arquivo `context-monitor.json` de uma squad e exibe barras de progresso ASCII com o percentual de contexto utilizado por cada agente. Útil para acompanhar sessões longas e antecipar quando um agente está próximo de compactar.

---

## Comando

### `context:monitor`

```bash
aioson context:monitor [path] [opções]
```

**Opções:**

| Opção | Descrição |
|---|---|
| `--squad=<slug>` | Squad a monitorar (obrigatório) |
| `--agent=<id>` | Filtrar por agente específico (opcional) |
| `--json` | Retorna dados estruturados em JSON |

**Exemplos:**

```bash
# Monitorar todos os agentes de uma squad
aioson context:monitor . --squad=meu-squad

# Monitorar apenas um agente
aioson context:monitor . --squad=meu-squad --agent=dev

# Output JSON para dashboards ou scripts
aioson context:monitor . --squad=meu-squad --json
```

---

## Saída

```
  Context Monitor — meu-squad

   ✓ dev              [████████░░░░░░░░░░░░] 42%  42000/100000
   ⚠ qa               [█████████████████░░░] 85%  85000/100000
   ! analyst          [████████████████████] 97%  97000/100000

  Thresholds: warning=85%  critical=95%
  Updated: 2026-03-30T14:23:00.000Z
```

---

## Níveis de alerta

| Ícone | Nível | Limiar | Situação |
|---|---|---|---|
| ✓ | normal | < 85% | Contexto confortável |
| ⚠ | warning | 85–94% | Prepare recovery, evite carregar novos arquivos grandes |
| ! | critical | 95–99% | Recovery deve ser gerado agora |
| X | overflow | ≥ 100% | Compactação iminente ou já ocorreu |

---

## Quando usar

- Antes de iniciar uma tarefa longa em um agente que já está com contexto parcialmente cheio
- Para saber qual agente da squad está mais próximo de compactar
- Para integrar alertas em scripts de monitoramento via `--json`

---

## JSON output

Com `--json`, retorna objeto com os agentes e seus níveis:

```json
{
  "ok": true,
  "squadSlug": "meu-squad",
  "agents": {
    "dev": {
      "totalUsed": 42000,
      "windowSize": 100000,
      "warningLevel": "normal"
    },
    "qa": {
      "totalUsed": 85000,
      "windowSize": 100000,
      "warningLevel": "warning"
    }
  },
  "updatedAt": "2026-03-30T14:23:00.000Z"
}
```

---

## Relação com recovery automático

Em squads, o monitor detecta automaticamente quando o uso de contexto de um agente cai mais de 30% entre duas medições (sinal de compactação) e injeta um arquivo de recovery. Esse comportamento é coordenado por `checkAndInjectRecovery()` dentro do Squad Dashboard.

Para sessões diretas (sem squad), use [`recovery:generate`](./recuperacao-de-sessao.md).
