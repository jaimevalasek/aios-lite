# 70 — @squad + @genoma: Fluxo Correto

> Correção de rota do mapping/69
> O genoma não é arquivo pré-pronto — é gerado na hora
> Sessão: 2026-03-05

---

## O que eu tinha errado no mapping/69

Eu propus genomas como arquivos `.md` pré-construídos e shippados com o CLI:
`laravel.md`, `youtube-conteudo.md`, `cardapio-restaurante.md` etc.

**Isso está errado.** Isso seria igual ao aiox-core — um repositório de arquivos prontos.

**A visão correta:**
> O @genoma não tem nada pré-pronto. Ele **cria o genoma na hora**,
> baseado no que o usuário precisa. A LLM é o conhecimento — não o arquivo.

---

## O Fluxo Correto

### Quem faz o quê

```
@squad   = o agente que o usuário aciona diretamente
           oferece dois caminhos para criar um squad

@genoma  = agente especializado em CRIAR genomas
           não tem arquivos pré-prontos
           gera o perfil na hora via LLM
           pode buscar na biblioteca makopy.com via MCP

makopy.com = site/plataforma (futuro)
             biblioteca de genomas criados pela comunidade
             acessível via MCP
             se não tem lá → @genoma cria na hora
```

### O Fluxo Completo

```
Usuário aciona @squad

@squad pergunta:
  "Como você quer montar seu squad?"
  1. Modo Lite (conversação — similar ao aiox-core)
  2. Modo Genoma (via biblioteca ou criação na hora)

─────────────────────────────────────────────

CAMINHO 1 — Modo Lite:
  @squad faz perguntas diretas
  Monta o squad a partir das respostas
  Sem @genoma. Sem makopy.com.
  Rápido, direto, zero dependência externa.

─────────────────────────────────────────────

CAMINHO 2 — Modo Genoma:
  @squad aciona @genoma

  @genoma pergunta: "Qual domínio você quer?"
  Usuário: "Squad para criar vídeos no YouTube"

  @genoma verifica makopy.com via MCP:
    → Tem um genoma para YouTube? Carrega.
    → Não tem? @genoma CRIA NA HORA.

  Como @genoma cria na hora:
    - Usa o conhecimento da LLM sobre o domínio
    - Estrutura em: O que saber + Como pensar + O que entregar
    - Não lê arquivo. Não busca arquivo. Gera.

  @squad recebe o genoma gerado
  @squad monta a squad com base nele

  (Opcional) Usuário pode salvar o genoma no projeto
  para reutilizar depois sem gerar de novo.
```

---

## Por que isso é melhor

### Sem arquivos pré-prontos no CLI

O CLI não precisa shipar `laravel.md`, `youtube.md`, `cardapio.md`.
O usuário não fica limitado aos domínios que o framework previu.

```
Hoje: @genoma cria genoma para "squad de culinária vegana para TikTok"
Sem esse domínio existir em lugar nenhum como arquivo.
A LLM sabe. O @genoma estrutura. O squad funciona.
```

### makopy.com como camada de valor (não de dependência)

O site não é necessário para o sistema funcionar.
É uma camada a mais — se existir e tiver o genoma, usa.
Se não existir ou não tiver, @genoma cria igual.

```
makopy.com = opcional, mas valioso
Sem ele: sistema funciona 100%
Com ele: genomas validados pela comunidade, mais rápido
```

### Genoma salvo localmente = reaproveitamento

Se o usuário pediu um genoma YouTube hoje e gostou,
pode salvar em `.aios-lite/genomas/youtube-local.md`.

Na próxima vez, @genoma pergunta: "Você tem um genoma salvo aqui, usar?"
Se sim: carrega. Se não: cria de novo.

Mas isso é escolha do usuário — não obrigação do sistema.

---

## Como @genoma Gera um Genoma na Hora

Quando não encontra no makopy.com e precisa criar:

```
@genoma recebe: "YouTube content creation"

Estrutura internamente (não lê arquivo — raciocina):

  DOMÍNIO: criação de conteúdo para YouTube

  O QUE ESTE SQUAD PRECISA SABER (Genoma):
  - Como funciona o algoritmo de distribuição
  - O que determina CTR (thumbnail + título)
  - Estrutura de retenção (hook, corpo, CTA)
  - SEO específico da plataforma
  - Formatos: Shorts vs Long-form, quando cada um
  - [ponteia os centrais — não exaustivo]

  COMO ESTE SQUAD PRECISA PENSAR (Mentes):
  - O Espectador: "Eu clicaria nisso? Assistiria até o fim?"
  - O Algoritmo: "O YouTube vai distribuir isso?"
  - O Crítico: "O que está errado antes de produzir?"
  - O Estrategista: "Como este vídeo serve ao canal em 6 meses?"

  O QUE ESTE SQUAD ENTREGA:
  - Opções de título
  - Brief de thumbnail
  - Roteiro estruturado
  - Descrição otimizada
  - Série sugerida

→ Passa para @squad
→ @squad ativa os agentes com esse contexto
→ Squad está pronto para trabalhar
```

**Isso não é um arquivo. É o @genoma raciocinando e estruturando na hora.**

---

## O Papel do makopy.com

makopy.com (site futuro) teria uma biblioteca de genomas:

```
Usuário vai ao site → navega genomas → vê exemplos de squads
Usuário no CLI → @genoma busca via MCP → encontra → usa

Exemplo de API MCP que makopy.com exporia:
GET /api/genomas?query=youtube-content
→ { nome, dominio, estrutura, mentes_sugeridas, criado_por, rating }
```

Isso cria o **efeito de rede**:
- Usuário cria genoma para "copywriting para advogados brasileiros"
- Exporta para makopy.com
- Outro advogado usa via `@genoma` sem saber que foi criado por outro usuário
- Rating sobe, genoma melhora, comunidade cresce

Mas tudo isso é **Sprint N** — o core funciona sem makopy.com.

---

## Fluxo Resumido em Uma Imagem

```
Usuário
  ↓
@squad
  ↓
┌───────────────────┬────────────────────────────────────────┐
│   CAMINHO 1       │   CAMINHO 2                            │
│   Modo Lite       │   Modo Genoma                          │
│                   │                                        │
│  @squad pergunta  │  @squad aciona @genoma                 │
│  diretamente →    │       ↓                                │
│  monta squad      │  @genoma busca makopy.com via MCP      │
│                   │       ↓                                │
│                   │  Tem? → carrega                        │
│                   │  Não? → @genoma cria na hora (LLM)     │
│                   │       ↓                                │
│                   │  @squad recebe genoma                  │
│                   │       ↓                                │
│                   │  Squad montado e ativo                 │
└───────────────────┴────────────────────────────────────────┘
                              ↓
                    (Opcional) Salvar genoma localmente
                    (Opcional) Exportar para makopy.com
```

---

## O que é salvo no projeto (quando o usuário quiser)

```
.aios-lite/
├── genomas/             ← OPCIONAL — só existe se usuário salvar
│   └── youtube-meu-canal.md    ← genoma gerado + salvo
├── squads/
│   └── active/
│       ├── squad.md     ← squad ativo (montado pelo @squad)
│       └── memory.md    ← aprendizado do projeto
```

**Sem a pasta genomas/: tudo funciona.**
Com ela: @genoma oferece reutilizar da próxima vez.

---

## Vocabulário Revisado

| Termo      | O que é                                       | Onde vive           |
|------------|-----------------------------------------------|---------------------|
| @squad     | Agente que o usuário aciona para criar squads | agent prompt        |
| @genoma    | Agente que gera genomas na hora               | agent prompt        |
| Genoma     | Perfil de domínio gerado pelo @genoma         | na memória / opcional em .md |
| makopy.com | Biblioteca comunitária de genomas             | web + MCP server    |
| Squad      | Time de perspectivas ativo no projeto         | squads/active/      |
| Memory     | Aprendizado acumulado do projeto              | squads/active/memory.md |

---

> Status: visão corrigida — sem arquivos pré-prontos, genoma gerado na hora
> @genoma = criador dinâmico, não biblioteca estática
> makopy.com = valor adicional, não dependência
> Relacionado: mapping/66, 67, 68, 69 (mapping/69 parcialmente incorreto — este corrige)
