# 69 — @genoma: O Meta-Agente + Deliverable Layer

> Síntese final do Squad Genome System
> Sessão: 2026-03-05
> Relacionado: mapping/66 (genomas), mapping/67 (mentes), mapping/68 (domínios universais)

---

## O Nome Certo: @genoma

O agente que cria squads se chama `@genoma`.

Não `@squad` — o squad é o que ele **cria**.
Não `@architect` — esse já existe com outro papel.

`@genoma` é o meta-agente: ele não trabalha em tarefas.
Ele **cria a estrutura que trabalhará nas tarefas**.

```
Usuário → @genoma → squad gerado → squad trabalha → entregável
```

O nome fecha o vocabulário original da aios-lite:

| Termo    | Quem cria       | O que é                         |
|----------|-----------------|---------------------------------|
| Genoma   | @genoma         | Pacote de conhecimento de domínio |
| Mente    | @genoma         | Perspectiva de pensamento        |
| Squad    | @genoma         | Combinação de genomas + mentes   |
| Memory   | O squad em uso  | Aprendizado acumulado do projeto |

---

## A Filosofia Lite de Geração de Expertise

**O que o aiox-core faz:** documenta tudo exaustivamente.
Resultado: agentes densos, lentos, over-engineered.

**O que @genoma faz:** cria os pontos centrais conectados.
Deixa a LLM preencher com o que ela já sabe.

```
aiox-core:  100% do conhecimento está no arquivo
@genoma:    estrutura estratégica + LLM preenche com expertise

Resultado @genoma: menor token, mesma qualidade, mais rápido
```

### O Princípio da Densidade Mínima

Um Genoma não documenta tudo que existe sobre um domínio.
Documenta **o que a LLM não sabe automaticamente** e **o que conecta os pontos**.

```markdown
# Genome: youtube-conteudo

## O que a LLM já sabe (não documenta):
- Como funciona o algoritmo do YouTube
- Estrutura de um bom roteiro
- Princípios de thumbnail

## O que @genoma documenta (conexões + especificidades):
- Como o algoritmo penaliza clickbait (correlação não óbvia)
- Qual tipo de thumbnail funciona por NICHO específico (não geral)
- O momento exato de colocar o CTA que não parece implorar
- Como o título, thumbnail e hook devem ser UM argumento único
```

A LLM já tem o conhecimento base. O Genoma entrega o **mapa das conexões**.

---

## A Deliverable Layer — O que nenhum framework tem

### O problema dos frameworks de agentes

Todos geram conteúdo em markdown dentro do chat.
O usuário lê, copia manualmente, formata, usa.

**Fricção desnecessária** para squads de criação de conteúdo.

### A solução aios-lite: Deliverable Layer

Quando o squad gera conteúdo estruturado, o aios-lite cria
uma **página organizada e pronta para copiar**.

Não substitui o processo de criação — é a camada de entrega.

```
Squad pensa → Squad cria conteúdo → @genoma formata como deliverable
```

### Tipos de Deliverable

#### 1. Deliverable HTML (estático, zero dependência)
Arquivo `.html` gerado localmente. Abre no browser.
Um botão "Copiar" por seção. Cliente clica, copia, usa.
Descarta quando terminar.

```html
<!-- Exemplo: deliverable de conteúdo YouTube -->
<div class="deliverable">
  <section class="card">
    <h2>Títulos (escolha um)</h2>
    <div class="options">
      <div class="option">
        <p>Como Aprendi Inglês Sem Pagar R$ 1 (método real, 90 dias)</p>
        <button onclick="copy(this)">Copiar</button>
      </div>
      <!-- ... mais opções ... -->
    </div>
  </section>

  <section class="card">
    <h2>Descrição YouTube</h2>
    <div class="content"><!-- descrição otimizada --></div>
    <button onclick="copy(this)">Copiar tudo</button>
  </section>

  <section class="card">
    <h2>Conceito de Thumbnail</h2>
    <p>Rosto com expressão de surpresa. Fundo azul escuro.
       Texto: "SEM PAGAR" em amarelo bold. Ícone de cadeado aberto.</p>
    <button onclick="copy(this)">Copiar brief</button>
  </section>

  <section class="card">
    <h2>Roteiro — Hook (primeiros 30s)</h2>
    <div class="script"><!-- roteiro do hook --></div>
    <button onclick="copy(this)">Copiar</button>
  </section>
</div>
```

#### 2. Deliverable React (quando o projeto já tem React)
Componente `.tsx` gerado. Importa no projeto, renderiza, usa.
Descarta ou salva como template.

#### 3. Deliverable Markdown organizado
Fallback quando não há contexto de interface.
Seções claramente separadas, pronto para colar onde precisar.

---

## Exemplos por Domínio

### YouTube Content Squad

**Input:** "Quero criar um vídeo sobre aprender inglês sem pagar"

**O squad pensa:**
- O Espectador: título genérico, precisa de ângulo único
- O Algoritmo: nicho CPC alto, competição brutal, contrarian funciona
- O Crítico: "3 meses" vago, prometer método > prazo
- O Estrategista: topo de funil, próximo vídeo já planejado

**Output — deliverable.html gerado:**
```
┌─────────────────────────────────────────────┐
│  📺 Deliverable: Vídeo "Inglês sem pagar"   │
├─────────────────────────────────────────────┤
│  TÍTULOS (3 opções)                    [↗]  │
│  ○ Como Aprendi Inglês Sem Gastar...   [📋] │
│  ○ Aprendi Inglês em 90 Dias SEM...    [📋] │
│  ○ O Método Gratuito que Ninguém...    [📋] │
├─────────────────────────────────────────────┤
│  THUMBNAIL BRIEF                       [📋] │
│  Rosto + surpresa, fundo azul, texto...     │
├─────────────────────────────────────────────┤
│  DESCRIÇÃO YOUTUBE (otimizada)         [📋] │
│  [primeiras 2 linhas aparecem antes...]     │
├─────────────────────────────────────────────┤
│  ROTEIRO — HOOK (0:00 → 0:30)          [📋] │
│  [texto do hook com instruções de ritmo]    │
├─────────────────────────────────────────────┤
│  SÉRIE SUGERIDA (próximos 2 vídeos)    [📋] │
│  Vídeo 2: "5 apps que uso todo dia..."      │
└─────────────────────────────────────────────┘
```

---

### Cardápio de Restaurante Squad

**Input:** "Quero criar o cardápio do meu restaurante italiano"

**O squad pensa:**
- O Cliente: entenderia a descrição? Pagaria?
- O Chef: é executável com a equipe atual?
- O Financeiro: qual o food cost? Margem?

**Output — deliverable.html:**
```
┌─────────────────────────────────────────────┐
│  🍝 Deliverable: Cardápio Italiano          │
├─────────────────────────────────────────────┤
│  ENTRADAS (3 opções com preço e descrição)  │
│  Bruschetta Clássica — R$ 28               │
│  [descrição sensorial]              [📋]    │
├─────────────────────────────────────────────┤
│  MASSAS (seção âncora de preço)             │
│  [análise de ancoragem: item "Premium"      │
│   torna o "médio" parecer razoável]  [📋]  │
├─────────────────────────────────────────────┤
│  FOOD COST ESTIMADO                    [📋] │
│  Média da seção: 28% (dentro do ideal)      │
└─────────────────────────────────────────────┘
```

---

### Plataforma Web — Dev Squad

**Input:** `aios-lite squad:create --genome=laravel,saas`

**O squad pensa:**
- Genoma Laravel: FormRequest, Policy, migration, N+1
- Genoma SaaS: multi-tenant, planos, billing, isolamento
- Mente Pragmático: menor implementação que funciona
- Mente Cético: o que quebra em produção?

**Output — memory.md + context injection (sem HTML)**
Para dev, o deliverable é código + padrões injetados no contexto.
Não tem página HTML — o deliverable é o @dev com contexto completo.

> **Regra:** HTML/React deliverable para criação de conteúdo.
> Para dev, o deliverable é contexto rico + código gerado pelo @dev.

---

## Como @genoma Decide o Tipo de Deliverable

```
@genoma analisa o domínio do squad:

Se domínio = criação de conteúdo (YouTube, marketing, cardápio, música):
  → Deliverable HTML com copy buttons
  → Estrutura visual organizada por seções
  → Zero dependência (abre no browser)

Se domínio = desenvolvimento de software:
  → Context injection em project.context.md
  → Squad memory como arquivo .md
  → @dev usa o contexto, gera código diretamente

Se domínio = análise/consultoria (jurídico, financeiro, arquitetura):
  → Deliverable markdown organizado
  → Seções por tema com conclusões acionáveis
  → (futuro: HTML também)
```

---

## Comandos @genoma

```bash
# Cria squad para o projeto atual (detecta domínio automaticamente)
aios-lite genoma:create

# Especifica domínio e mentes manualmente
aios-lite genoma:create --domain=youtube-conteudo --mentes=espectador,algoritmo,critico

# Cria squad para domínio não-dev com deliverable HTML
aios-lite genoma:create --domain=cardapio-restaurante --output=html

# Lista genomas disponíveis
aios-lite genoma:list

# Importa genoma da comunidade
aios-lite genoma:import github:usuario/genome-copywriting-br

# Exporta genoma do projeto para compartilhar
aios-lite genoma:export

# Evolui o squad com aprendizados das últimas sessões
aios-lite genoma:evolve

# Status do squad ativo
aios-lite genoma:status
```

---

## Estrutura de Arquivos

```
.aios-lite/
├── agents/
│   └── genoma.md          ← o meta-agente @genoma
├── squads/
│   ├── genomes/           ← biblioteca de domínios
│   │   ├── dev/
│   │   │   ├── laravel.md
│   │   │   ├── node-typescript.md
│   │   │   ├── react.md
│   │   │   ├── nextjs.md
│   │   │   └── web3-ethereum.md
│   │   ├── conteudo/
│   │   │   ├── youtube-conteudo.md
│   │   │   ├── copywriting.md
│   │   │   └── marketing-digital.md
│   │   ├── negocios/
│   │   │   ├── cardapio-restaurante.md
│   │   │   ├── juridico-br.md
│   │   │   └── ecommerce.md
│   │   └── criativo/
│   │       ├── musica-producao.md
│   │       └── arquitetura-design.md
│   ├── mentes/
│   │   ├── arquetipos/    ← shipped com aios-lite
│   │   │   ├── cetico.md
│   │   │   ├── pragmatico.md
│   │   │   ├── visionario.md
│   │   │   ├── guardiao.md
│   │   │   ├── usuario.md
│   │   │   └── auditor.md
│   │   ├── especialistas/ ← destilações de pessoas reais
│   │   └── custom/        ← criadas pelo usuário
│   ├── active/
│   │   ├── squad.md       ← squad ativo do projeto
│   │   └── memory.md      ← aprendizado acumulado
│   └── deliverables/      ← outputs HTML/MD gerados
│       └── [timestamp]-[dominio]-deliverable.html
```

---

## O @genoma em Ação — Exemplo Completo

```
$ aios-lite genoma:create --domain=youtube-conteudo

→ Detectando domínio: criação de conteúdo / YouTube
→ Carregando genoma: youtube-conteudo.md
→ Selecionando mentes: espectador, algoritmo, critico, estrategista
→ Tipo de deliverable: HTML (domínio de conteúdo)
→ Gerando squad...

Squad criado: .aios-lite/squads/active/squad.md
Genoma ativo: youtube-conteudo
Mentes ativas: espectador, algoritmo, critico, estrategista
Deliverable template: HTML com copy buttons

---

Usuário: "Quero criar um vídeo sobre produtividade usando IA"

[Squad processa internamente]

→ Gerando deliverable...
→ Arquivo criado: .aios-lite/squads/deliverables/2026-03-05-youtube-deliverable.html

Abra no browser: file:///path/to/.aios-lite/squads/deliverables/...
```

Usuário abre. Vê página organizada com títulos, thumbnail brief,
descrição, hook do roteiro, série sugerida.
Clica em copiar o que precisa. Fecha. Continua trabalhando.

**Zero fricção. Zero formatação manual. Zero markdown para formatar.**

---

## Por que isso é Lite e não Over-Engineering

**Lite:** o HTML gerado é autocontido (sem React, sem build, sem dependências).
Um arquivo `deliverable.html` com CSS inline + JS vanilla mínimo.

**Lite:** o Genoma é markdown puro com os pontos centrais.
A LLM preenche com o conhecimento que já tem.

**Lite:** @genoma não precisa de backend, banco, API.
Lê os arquivos `.md` de genoma + mentes, gera o squad, gera o deliverable.

**Não lite seria:** React app com build step, servidor para hospedar,
banco para salvar deliverables, dashboard para gerenciar. Isso é aios-cloud.

Hoje: file HTML local. Amanhã, se o usuário quiser: aios-cloud hospeda.
O mesmo conteúdo, com mais conveniência. Mas o lite já funciona.

---

> Status: visão completa — @genoma como meta-agente universal + deliverable layer
> Sprint 1: implementar @genoma agent + 5 genomas iniciais + deliverable HTML básico
> Relacionado: mapping/66, 67, 68
