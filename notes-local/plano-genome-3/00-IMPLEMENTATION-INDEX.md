# Profiler System — Genoma 3.0: DNA Mental & Advisor Engine

> **Projeto:** aios-forge  
> **Tipo:** Upgrade do sistema de Genoma  
> **Escopo:** Novo squad `profiler` com 3 agentes + extensões no genoma.md + formato advisor  
> **Prioridade:** Alta — feature central do produto  
> **Data:** 2026-03-13

---

## Resumo Executivo

Este plano implementa um sistema de **clonagem cognitiva** no aios-forge. O objetivo é permitir que o usuário gere um perfil mental completo de qualquer pessoa pública — capturando como ela pensa, decide, comunica e opera — e transforme isso em dois outputs: um **Genoma 3.0 de Domínio** (conhecimento destilado reutilizável) e um **Advisor Agent** (conselheiro que pensa e age como a pessoa, com acesso a web search).

O sistema captura múltiplas dimensões psicométricas (DISC, Eneagrama, Big Five, MBTI), frameworks de decisão, modelos mentais, estilo de comunicação, vieses cognitivos, e princípios operacionais — tudo ancorado em evidência real extraída de fontes públicas.

---

## Arquitetura Geral

```
Usuário informa pessoa-alvo
         ↓
[@profiler-researcher]  ← Fase 1: Coleta & Pesquisa Web
         ↓
Relatório bruto → Usuário revisa e valida
         ↓
[@profiler-enricher]    ← Fase 2: Enriquecimento + Material do Usuário
         ↓
Base consolidada e categorizada
         ↓
[@profiler-forge]       ← Fase 3: Geração de Outputs
         ↓
   ┌──────────────────┬──────────────────┐
   ↓                  ↓                  ↓
Genoma 3.0        Advisor Agent       Ambos + aplicar
(domínio)       (com web search)      a squad existente
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `.aios-forge/agents/profiler-researcher.md` | Agente de pesquisa e coleta web |
| 2 | `.aios-forge/agents/profiler-enricher.md` | Agente de enriquecimento e consolidação |
| 3 | `.aios-forge/agents/profiler-forge.md` | Agente de geração de outputs (Genoma 3.0 + Advisor) |
| 4 | `docs/pt/profiler-system.md` | Documentação do sistema profiler |
| 5 | `docs/pt/genome-3.0-spec.md` | Especificação do formato Genoma 3.0 |
| 6 | `docs/pt/advisor-spec.md` | Especificação do formato Advisor Agent |
| 7 | `template/.aios-forge/profiler-reports/` | Pasta para relatórios de pesquisa |
| 8 | `template/.aios-forge/advisors/` | Pasta para advisors gerados |

### Arquivos a Modificar

| # | Arquivo | Modificação |
|---|---------|-------------|
| 1 | `.aios-forge/agents/genoma.md` | Adicionar redirecionamento para profiler quando type=persona |
| 2 | `docs/pt/squad-genoma.md` | Adicionar seção sobre Genoma 3.0, Profiler e Advisors |

---

## Fases de Implementação

Cada fase tem seu próprio documento detalhado com instruções completas para o Codex:

| Fase | Documento | Conteúdo |
|------|-----------|----------|
| **Fase 1** | `01-PROFILER-RESEARCHER.md` | Agente de pesquisa web + formato do relatório bruto + categorização de material + dimensões de coleta |
| **Fase 2** | `02-PROFILER-ENRICHER.md` | Agente de enriquecimento + input do usuário + consolidação + motor de extração psicométrica |
| **Fase 3** | `03-PROFILER-FORGE.md` | Agente de geração + schema Genoma 3.0 + schema Advisor + flags de output |
| **Fase 4** | `04-GENOMA-3.0-SPEC.md` | Formato completo do Genoma 3.0 com todas as seções novas + frontmatter expandido |
| **Fase 5** | `05-ADVISOR-SPEC.md` | Formato completo do Advisor Agent + web search + memória + modos de operação |
| **Fase 6** | `06-INTEGRATION.md` | Modificações no genoma.md existente + squad-genoma.md + testes de integração |

---

## Dimensões de Captura do DNA Mental

O sistema captura as seguintes dimensões — esta é a lista completa que todos os agentes do pipeline devem conhecer:

### Bloco 1: Perfil Psicométrico (Inferido)

1. **DISC** — Dominance, Influence, Steadiness, Compliance
   - Perfil primário e secundário (ex: DC, ID, SC)
   - Intensidade de cada eixo (1-10)
   - Evidências comportamentais que sustentam a inferência

2. **Eneagrama** — Tipo base + asa
   - Tipo principal (1-9)
   - Asa dominante
   - Nível de saúde/integração observado
   - Instinto dominante (social, sexual, autopreservação)

3. **Big Five (OCEAN)** — Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
   - Score estimado por dimensão (low/medium/high)
   - Facetas mais evidentes por dimensão

4. **MBTI** — 4 dimensões + tipo completo
   - Tipo completo inferido (ex: INTJ, ENTP)
   - Função cognitiva dominante e auxiliar
   - Manifestação observável de cada preferência

### Bloco 2: Frameworks de Decisão

5. **Modelos Mentais Nomeados** — frameworks que a pessoa usa repetidamente
   - Nome do framework (próprio da pessoa ou adaptado)
   - Descrição estruturada (input → processo → output)
   - Contexto de uso (quando a pessoa aplica este framework)
   - Exemplos reais de aplicação

6. **Heurísticas de Decisão** — atalhos mentais recorrentes
   - Padrão identificado
   - Frequência observada
   - Viés associado (se houver)

7. **Processo de Resolução de Problemas**
   - Como a pessoa decompõe problemas (top-down, bottom-up, inversão, first principles)
   - Quanto tempo gasta em análise vs ação
   - Threshold de informação pra decisão (decide rápido vs paralisia de análise)

### Bloco 3: Estilo de Comunicação

8. **Tom e Voz**
   - Tom dominante (direto, diplomático, provocativo, analítico, inspiracional)
   - Registro (formal, informal, coloquial, técnico)
   - Uso de humor, ironia, palavrão
   - Extensão típica (conciso vs detalhista)

9. **Padrões Retóricos**
   - Usa metáforas ou dados?
   - Storytelling vs argumentação lógica
   - Padrões de abertura (como começa a falar sobre algo)
   - Padrões de fechamento (como encerra um argumento)
   - Palavras/expressões recorrentes

10. **Estilo de Persuasão**
    - Apela para lógica, emoção, autoridade, prova social?
    - Como lida com objeções
    - Como estrutura uma recomendação

### Bloco 4: Filosofias e Princípios

11. **Valores Não-Negociáveis**
    - O que a pessoa nunca compromete
    - Hierarquia de prioridades (liberdade > dinheiro? impacto > conforto?)

12. **Crenças Operacionais**
    - Crenças sobre negócios, liderança, criatividade, risco
    - Axiomas que aparecem repetidamente ("se não escala, não vale", "simplicidade > sofisticação")

13. **Filosofias de Vida/Trabalho**
    - Worldview geral
    - Relação com risco, fracasso, sucesso
    - Visão de longo prazo vs curto prazo

### Bloco 5: Contexto Operacional

14. **Expertise Demonstrada**
    - Domínios onde a pessoa demonstra maestria real
    - Diferenciação entre o que a pessoa sabe profundamente vs opina superficialmente

15. **Histórico de Decisões Conhecidas**
    - Decisões públicas relevantes e outcomes
    - Padrões de acerto e erro

16. **Network e Influências**
    - Quem a pessoa cita como influência
    - De quem ela discorda publicamente
    - Comunidade/escola de pensamento que pertence

### Bloco 6: Vieses e Pontos Cegos

17. **Vieses Cognitivos Observados**
    - Viés de confirmação em quais áreas
    - Tendência a over/under-estimate que tipo de coisa
    - Blind spots conhecidos (declarados pela pessoa ou inferidos)

18. **Padrões de Erro**
    - Situações onde a pessoa erra mais
    - Tipo de decisão onde o framework dela falha
    - Auto-consciência sobre os próprios erros

### Bloco 7: Métricas Técnicas Científicas Complementares

19. **Análise Linguística Computacional**
    - Complexidade léxica (type-token ratio)
    - Frequência de palavras de certeza vs dúvida
    - Proporção de linguagem concreta vs abstrata
    - Índice de assertividade linguística

20. **Análise de Valores (Schwartz Value Survey inferido)**
    - Autodireção, Estimulação, Hedonismo, Realização, Poder, Segurança, Conformidade, Tradição, Benevolência, Universalismo
    - Inferido a partir de padrões de discurso

21. **Perfil de Tomada de Risco**
    - Risk appetite observado (conservador, moderado, agressivo)
    - Domínios onde assume mais risco vs onde é mais cauteloso
    - Relação risco/recompensa implícita nas decisões

22. **Estilo de Liderança (se aplicável)**
    - Modelo dominante (transformacional, transacional, servant, autocratic)
    - Como delega, como cobra, como celebra
    - Dinâmica com times

---

## Critérios de Sucesso

1. O pipeline completo (researcher → enricher → forge) deve funcionar em sequência
2. O relatório do researcher deve trazer material categorizado e verificável
3. O enricher deve aceitar material adicional do usuário sem perder o que foi coletado
4. O forge deve gerar Genoma 3.0 e/ou Advisor conforme flag do usuário
5. O Genoma 3.0 deve seguir o formato canônico com as seções expandidas
6. O Advisor gerado deve ser um agente funcional compatível com o formato aios-forge
7. O Advisor deve incluir web search como ferramenta disponível
8. Todo perfil psicométrico deve ser marcado como INFERIDO com evidência associada
9. O sistema deve ser retrocompatível com genomas 2.0 existentes
10. A documentação deve estar atualizada em `docs/pt/`

---

## Ordem de Execução para o Codex

```
1. Ler 00-IMPLEMENTATION-INDEX.md (este arquivo)
2. Criar estrutura de pastas necessária
3. Implementar 01-PROFILER-RESEARCHER.md
4. Implementar 02-PROFILER-ENRICHER.md
5. Implementar 03-PROFILER-FORGE.md
6. Implementar 04-GENOMA-3.0-SPEC.md
7. Implementar 05-ADVISOR-SPEC.md
8. Implementar 06-INTEGRATION.md
9. Validar que todos os arquivos criados estão consistentes entre si
10. Atualizar documentação existente
```

Cada documento contém instruções completas e auto-suficientes. O Codex deve executá-los na ordem listada.
