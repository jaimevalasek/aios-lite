# Task: Squad Investigate

> Fase de investigação do lifecycle. Enriquece o design com conhecimento real do domínio.

## Quando usar
- `@squad investigate <domain>` — investigação standalone
- `@squad` flow quando o usuário aceita investigação
- `@squad design --investigate` — dispara investigação antes do design

## Entrada
- Domínio ou tópico
- Goal do squad
- Output type esperado
- Opcional: dimensions específicas para focar

## Processo

### Passo 1 — Ativar @orache
Leia `.aioson/agents/orache.md` e execute como @orache.
Passe o contexto do domínio coletado pelo @squad.

### Passo 2 — Aguardar investigação
@orache executa o processo de investigação (Steps 1-6 do agent).

### Passo 3 — Receber relatório
@orache salva o relatório em `squad-searches/`.

### Passo 3.5 — Extrair payload de integração
Do relatório, extraia explicitamente:
- regulações / obrigações
- vocabulário de domínio
- anti-patterns
- benchmarks de qualidade
- padrões estruturais / de workflow

### Passo 4 — Validar completude
Verifique que o relatório cobre pelo menos 4 das 7 dimensões.
Se não cobrir, pergunte ao usuário se quer aprofundar.

### Passo 5 — Integrar com design
Se esta task foi invocada do flow do @squad:
- Retorne o path do relatório para o @squad
- Registre no blueprint o objeto `investigation`
- Use regulações para hard constraints, human gates e review criteria
- Use anti-patterns para checklist e `vetoConditions`
- Use benchmarks para qualidade, warm-up e score de cobertura
- Use vocabulário e padrões estruturais para executores, workflow e content blueprints

## Saída
- Relatório de investigação salvo em `squad-searches/`
- Path do relatório disponível para o @squad design
- Payload de integração disponível para blueprint/checklist/workflow

## Regras
- NÃO gere o squad aqui — isso é responsabilidade da task create
- NÃO fabrique descobertas — se não encontrou, diga
- SEMPRE salve o relatório em arquivo — nunca apenas no chat
