# Task: Squad Profiler Integration

> Orquestra profiling dentro do flow de criação do squad.

## Quando usar
- Automaticamente pelo @squad quando detecta persona-based squad
- `@squad design --profile` — dispara profiling antes do design

## Detecção de persona

Heurísticas para oferecer profiling:
- Usuário menciona uma pessoa específica por nome
- O goal inclui "no estilo de", "como {pessoa}", "baseado na abordagem de {pessoa}"
- O domínio é personal branding, criação de conteúdo para um criador específico

## Processo

### Passo 1 — Verificar perfil existente
Checar se `.aioson/profiler-reports/{person-slug}/` já existe.
Se existir: ler o perfil enriquecido e pular para aplicação do genome.

### Passo 2 — Executar pipeline de profiling
Se não existir perfil:
1. @profiler-researcher → coleta de evidências
2. @profiler-enricher → análise de padrões cognitivos
3. @profiler-forge → geração do genome

### Passo 3 — Aplicar genome aos executores
O genome resultante é aplicado apenas aos executores relevantes:
- Executores criativos (copywriter, scriptwriter) → SIM
- Executores de pesquisa e orquestração → NÃO (não precisam da voz da persona)

### Passo 4 — Registrar no blueprint
```json
"profiling": {
  "person": "{name}",
  "genomePath": "{path}",
  "genomeSlug": "{slug}",
  "evidenceMode": "verified | inferred | mixed",
  "profiledAt": "{ISO-8601}"
}
```

## Regras
- NÃO execute profiling sem o consentimento do usuário
- NÃO aplique genome a todos os executores — apenas os que precisam da voz
- O profiling é uma SUGESTÃO, não uma obrigação
- Registre a associação profiling → squad no blueprint
