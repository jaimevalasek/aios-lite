---
name: agent-language-policy
description: Agent files default to English for universal reuse. Locale-specific squads may declare a locale_scope to write agent files in their native language.
priority: 9
version: 1.1.0
agents: [squad, genome, orache, design-hybrid-forge, site-forge]
---

# Agent Language Policy

## Princípio

Agent files são código de instrução — não são conteúdo para o usuário final.
O padrão é inglês: maximiza a qualidade de raciocínio do LLM e torna squads
universalmente reutilizáveis independente do idioma do projeto.

Mas squads com escopo de locale declarado (`locale_scope`) são uma exceção legítima:
quando o domínio, a legislação e os usuários finais pertencem a um único país/idioma,
forçar inglês seria artificial e prejudicaria a qualidade.

## Decisão de idioma — árvore de classificação

```
Squad novo ou existente
  ├── ephemeral: true → qualquer idioma (não é reutilizado)
  └── ephemeral: false ↓
      ├── locale_scope: "universal" (ou ausente) → agent files em INGLÊS
      └── locale_scope: "{locale}" declarado → agent files no idioma do locale
          Exemplos: "pt-BR", "es-MX", "fr-FR"
```

## Como declarar locale_scope

No `squad.manifest.json`, adicionar o campo `locale_scope`:

```json
{
  "slug": "atendimento-farmacia",
  "locale_scope": "pt-BR",
  "locale_rationale": "Domínio regulado pela ANVISA — legislação, receituário e interações são exclusivamente brasileiros."
}
```

Valores válidos:
- `"universal"` (padrão — inglês obrigatório)
- Qualquer código de locale BCP-47: `"pt-BR"`, `"en-US"`, `"es-MX"`, `"fr-FR"`, etc.

## Quando locale_scope é legítimo

Um squad merece `locale_scope` quando **todos** os critérios abaixo são verdadeiros:

| Critério | Pergunta |
|---|---|
| **Regulação local** | A legislação que governa o domínio é de um país específico? (ANVISA, OAB, CVM, NHS, FDA...) |
| **Usuário final local** | Os usuários que interagem com o squad falam exclusivamente esse idioma? |
| **Sem portabilidade** | O squad nunca seria reutilizado em outro país sem reescrita completa? |
| **Domínio na língua nativa** | O raciocínio técnico do domínio é mais rico na língua local? (ex: termos jurídicos em português) |

Exemplos que **justificam** `locale_scope: "pt-BR"`:
- Squad de farmácia regulada pela ANVISA → usuários brasileiros, legislação brasileira
- Squad de tributário brasileiro (eSocial, SPED, IRPF)
- Squad de atendimento jurídico para direito brasileiro
- Squad de suporte ao cliente de empresa 100% nacional

Exemplos que **NÃO justificam** locale_scope (usar inglês):
- Squad de marketing digital → técnicas são universais
- Squad de desenvolvimento de software → stack e padrões são universais
- Squad de YouTube creator → plataforma é global
- Squad de psicologia/coaching → metodologias são internacionais

## Regra por camada

### Squad universal (locale_scope ausente ou "universal")

| Camada | Idioma |
|---|---|
| Slug / nome do agente | Inglês (`pharmacist-advisor`, `order-manager`) |
| Arquivo do agente (missão, foco, restrições) | Inglês |
| Código fonte (variáveis, funções, classes) | Inglês |
| Output do agente para o usuário | `conversation_language` do projeto |
| Documentos de conteúdo (PRD, specs, plans) | Idioma do projeto |

### Squad com locale_scope declarado

| Camada | Idioma |
|---|---|
| Slug / nome do agente | Idioma do locale (`atendente-tecnico`, `analista-receita`) |
| Arquivo do agente (missão, foco, restrições) | Idioma do locale |
| Código fonte (variáveis, funções, classes) | **Inglês — sem exceção** |
| Output do agente para o usuário | Idioma do locale |
| Documentos de conteúdo | Idioma do locale |

> O código fonte (variáveis, funções, métodos) permanece em inglês mesmo em squads locale-specific — isso é uma convenção de programação, não uma regra de idioma de squad.

## Pergunta obrigatória durante criação do squad

Após classificar o domínio (Tier 1/2/3), antes de gerar qualquer arquivo, o `@squad` deve perguntar:

```
Este squad é para uso em um país/idioma específico ou deve ser universal?

1. Universal (inglês) — reutilizável em qualquer projeto, publicável no aiosforge.com
2. Locale específico — ex: só para o Brasil, só em português
   (agent files serão gerados no idioma do locale)
```

Se o usuário escolher (2), solicitar o locale: `"pt-BR"`, `"es-MX"`, etc.
Se o usuário não souber: inferir pelo domínio e confirmar.

**Inferência automática por domínio:**
- Domínio com legislação de país específico mencionada → sugerir locale desse país
- Domínio em português com público claramente brasileiro → sugerir `pt-BR`
- Domínio genérico sem referência geográfica → sugerir universal

## Por que isso importa

**Universal (inglês):**
- Qualidade de raciocínio geral do LLM é maior em inglês
- Squads reutilizáveis em qualquer projeto sem modificação
- Publicáveis no aiosforge.com para a comunidade

**Locale-specific (idioma nativo):**
- Qualidade de raciocínio sobre legislação e termos técnicos locais é maior na língua nativa
- LLMs têm mais dados de treinamento sobre ANVISA em português do que em inglês
- Interações com usuários finais são mais naturais sem tradução mental

## Ação ao criar agent files

**Se universal:** escrever em inglês sem perguntar.
**Se locale declarado:** escrever no idioma do locale sem perguntar.
**Se ambíguo:** fazer a pergunta obrigatória acima antes de gerar qualquer arquivo.
