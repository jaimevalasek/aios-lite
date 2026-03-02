# Guia de Agentes

> Quando usar cada agente, o que ele entrega e como ativá-lo.

---

## Visão geral

O AIOS Lite tem **8 agentes especializados**. Você não precisa usar todos — use apenas os que o tamanho do seu projeto exige.

```
@setup        ← sempre o primeiro
@analyst      ← projetos SMALL e MEDIUM
@architect    ← projetos SMALL e MEDIUM
@ux-ui        ← quando há interfaces (SMALL e MEDIUM)
@pm           ← apenas MEDIUM
@orchestrator ← apenas MEDIUM
@dev          ← sempre o último antes do QA
@qa           ← projetos SMALL e MEDIUM
```

---

## @setup

**Quando usar:** Sempre. É o primeiro agente de qualquer projeto.

**O que faz:**
- Lê `.aios-lite/context/project.context.md`
- Confirma stack, classificação e idioma
- Define o plano de execução (quais agentes serão usados)
- Orienta o desenvolvedor sobre os próximos passos

**Como ativar:**
```
/setup
```

**O que ele pergunta:**
- O que o projeto precisa fazer e quem vai usar (sem pressuposições)
- Detecta a stack automaticamente — se não reconhecer, pergunta e registra o que o usuário descrever
- Confirma framework, classificação e idioma antes de finalizar

> **Qualquer stack funciona.** @setup não força um framework da lista. Se você usa Django, Go, Rust,
> FastAPI, SvelteKit ou qualquer outra tecnologia, ele registra o que você descrever.

**Entrega:**
- Confirmação do plano de agentes
- Resumo do contexto do projeto

---

## @analyst

**Quando usar:** Projetos SMALL e MEDIUM, antes de @architect.

**O que faz:**
- Fase 1 (Discovery): Faz 6 perguntas de descoberta para entender o domínio
- Fase 2 (Modelagem): Mapeia entidades, atributos e regras de negócio
- Fase 3 (Análise): Produz tabela de entidades com campos e tipos
- Identifica integrações externas e riscos

**Como ativar:**
```
/analyst
```

**Exemplo de perguntas que ele faz:**
```
1. Quem são os usuários e quais são seus objetivos principais?
2. Qual é o fluxo principal que gera valor para o negócio?
3. Existe algum processo manual hoje que este sistema vai substituir?
4. Quais são as regras de negócio mais críticas?
5. Há integrações com sistemas externos?
6. Quais dados são mais sensíveis ou críticos?
```

**Entrega:** Arquivo `.aios-lite/context/discovery.md` com:
- Mapa de entidades e atributos
- Tabela de campos com tipo e restrições
- Integrações mapeadas
- Riscos identificados
- Referências visuais (wireframes, links)

---

## @architect

**Quando usar:** Após @analyst, em projetos SMALL e MEDIUM.

**O que faz:**
- Escolhe a estrutura de pastas proporcional ao tamanho do projeto
- Documenta decisões técnicas (banco de dados, autenticação, etc.)
- Define padrões de código para o time

**Como ativar:**
```
/architect
```

**Estruturas que ele propõe (exemplo Laravel SMALL):**
```
app/
  Actions/          ← lógica de negócio
  Http/Controllers/ ← apenas orquestração
  Models/
  Policies/
resources/views/
database/migrations/
tests/
```

**Entrega:** Arquivo `.aios-lite/context/architecture.md` com:
- Estrutura de pastas (proporcional ao tamanho)
- Stack definitiva
- Decisões técnicas documentadas
- Padrões de código

---

## @ux-ui

**Quando usar:** Quando o projeto tem interfaces (web apps, landing pages com formulários). SMALL e MEDIUM.

**O que faz:**
- Recebe constraints do @architect (componentes-chave, paleta)
- Define hierarquia visual e padrões de UI
- Especifica componentes reutilizáveis
- Cria guia de acessibilidade

**Como ativar:**
```
/ux-ui
```

**Entrega:** Arquivo `.aios-lite/context/ui-spec.md` com:
- Sistema de design (tokens, cores, tipografia)
- Componentes principais e estados
- Fluxos de navegação
- Checklist de acessibilidade

---

## @pm

**Quando usar:** Apenas projetos MEDIUM. Ative após @architect e @ux-ui.

**O que faz:**
- Transforma o discovery e arquitetura em histórias de usuário
- Cria backlog priorizado (máximo 2 páginas)
- Define critérios de aceite

**Como ativar:**
```
/pm
```

**Regra de ouro do @pm:** O documento deve ter no máximo 2 páginas. Se passar disso, corte funcionalidades do MVP.

**Entrega:** Arquivo `.aios-lite/context/prd.md` com:
- Histórias de usuário priorizadas
- Critérios de aceite por história
- Dependências entre histórias
- Escopo do MVP

---

## @orchestrator

**Quando usar:** Apenas projetos MEDIUM, após @pm. Necessário quando há múltiplos módulos que podem ser desenvolvidos em paralelo.

**O que faz:**
- Lê o `prd.md` e `architecture.md`
- Cria grafo de dependências entre módulos
- Divide o trabalho em lanes paralelas para múltiplos agentes @dev
- Gerencia o progresso via arquivos de status

**Como ativar:**
```
/orchestrator
```

**Ou via CLI para preparar os arquivos:**
```bash
npx aios-lite parallel:init
npx aios-lite parallel:assign --source=prd --workers=3
npx aios-lite parallel:status
```

**Entrega:**
- `.aios-lite/context/parallel/shared-decisions.md`
- `.aios-lite/context/parallel/agent-1.status.md` (e 2, 3...)
- Cada lane tem seu escopo definido

---

## @dev

**Quando usar:** Sempre — é o agente que escreve o código.

**O que faz:**
- Lê o contexto, discovery, arquitetura e (se existir) ui-spec
- Implementa os módulos na ordem correta
- Segue as convenções definidas pelo @architect
- Registra decisões em `shared-decisions.md` (MEDIUM)

**Como ativar:**
```
/dev
```

**Princípios que ele aplica em qualquer stack:**
- Isolar lógica de negócio dos handlers de requisição
- Validar input na fronteira do sistema (nunca depois)
- Seguir as convenções nativas do framework do projeto
- Verificar skills disponíveis em `.aios-lite/skills/static/` antes de implementar

**Em projetos com Laravel especificamente:**
- Form Requests para validação (nunca inline no controller)
- Actions para lógica de negócio
- Policies para autorização
- N+1 prevenido com eager loading
- Events + Listeners para side effects

**Entrega:** Código implementado seguindo os padrões definidos pelo @architect, para qualquer stack.

---

## @qa

**Quando usar:** Projetos SMALL e MEDIUM, após @dev.

**O que faz:**
- Revisa o código implementado
- Escreve testes unitários e de integração
- Identifica casos de borda não cobertos
- Valida se os critérios de aceite foram atendidos

**Como ativar:**
```
/qa
```

**Entrega:**
- Suite de testes
- Lista de problemas encontrados
- Relatório de cobertura

---

## Resumo: fluxo por tamanho

### MICRO
```
@setup → @dev
```
Duração típica: minutos a horas. Sem análise, sem arquitetura formal.

### SMALL
```
@setup → @analyst → @architect → @ux-ui → @dev → @qa
```
Duração típica: horas a dias. Análise leve, estrutura clara.

### MEDIUM
```
@setup → @analyst → @architect → @ux-ui → @pm → @orchestrator → @dev → @qa
```
Duração típica: dias a semanas. Análise completa, parallelismo, backlog formal.

---

## Veja também

- [Cenários completos com exemplos práticos](./cenarios.md)
- [Início rápido](./inicio-rapido.md)
