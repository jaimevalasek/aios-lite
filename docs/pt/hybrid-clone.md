# `hybrid-clone`

Página canônica do agente de clonagem com transformação estética do AIOSON.

O agente `hybrid-clone` estuda a estrutura e o comportamento de um site real e reconstrói tudo usando uma hybrid design skill como camada estética. O resultado preserva como o site **funciona** e aplica como o site **parece** segundo a skill.

## O que ele faz

- recebe uma URL (referência visual) e o nome de uma hybrid skill
- captura screenshots, assets e o modelo de interação do site via browser MCP
- extrai estrutura e comportamento — ignora cores, fontes e espaçamentos originais
- mapeia cada componente extraído para os equivalentes da skill
- substitui todos os valores CSS por tokens da skill
- constrói os componentes em paralelo usando worktrees
- entrega um projeto Next.js compilando com a identidade visual da skill aplicada

## Pré-requisitos

### 1. Browser MCP

O agente precisa de automação de browser para navegar, capturar screenshots e testar interações. Configure um antes de usar:

```bash
# Chrome MCP (recomendado)
npx @modelcontextprotocol/server-chrome

# Playwright MCP (fallback)
npx @playwright/mcp server
```

Adicione o browser MCP escolhido nas configurações de MCP do seu cliente AI. O agente detecta automaticamente qual está disponível e avisa se nenhum for encontrado.

### 2. Hybrid skill

O agente precisa de uma hybrid skill já existente para usar como transformação. Use uma das skills nativas:

```text
.aioson/skills/design/aurora-command-ui/
.aioson/skills/design/cognitive-core-ui/
.aioson/skills/design/glassmorphism-ui/
.aioson/skills/design/bold-editorial-ui/
.aioson/skills/design/neo-brutalist-ui/
.aioson/skills/design/warm-craft-ui/
.aioson/skills/design/clean-saas-ui/
```

Ou use uma skill gerada pelo `@design-hybrid-forge`, que fica em:

```text
.aioson/installed-skills/{slug}/
```

## Como invocar

```text
/hybrid-clone <url> <nome-da-skill>
```

Com flags opcionais:

```text
/hybrid-clone <url> <skill> --viewport=desktop   # só desktop (padrão: todos)
/hybrid-clone <url> <skill> --no-download         # pular download de assets
/hybrid-clone <url> <skill> --output=./meu-app    # diretório customizado
/hybrid-clone <url> <skill> --verbose             # log detalhado
```

Em clientes que usam `@` para agentes:

```text
@hybrid-clone https://stripe.com aurora-command-ui
```

## Fluxo interno (5 fases)

O agente executa tudo em sequência, bloqueando em cada critério de saída antes de avançar:

| Fase | O que acontece |
|------|---------------|
| **0 — Preflight** | Verifica browser MCP, valida skill, detecta projeto Next.js (ou pergunta para criar) |
| **1 — Reconnaissance** | Screenshots 1440/768/390px, inventário de assets, sweep de interações por seção |
| **2 — Extraction** | Spec de estrutura e comportamento por seção — sem nenhum valor CSS |
| **3 — Transform** | Mapeia cada componente extraído para equivalente da skill com tokens substitutos |
| **4 — Build** | Constrói componentes em paralelo com worktrees, verifica `npm run build` |
| **5 — QA** | Compara screenshots do original vs clone, testa todas as interações, verifica fidelidade da skill |

## Onde o output nasce

```text
docs/research/<hostname>/
  reconnaissance.json         ← dados brutos da navegação
  structure-spec.md           ← topologia e layout de cada seção
  interaction-spec.md         ← modelo de interação por seção
  component-map.md            ← mapeamento componente → skill
  qa-report.md                ← resultado do QA visual

docs/research/components/
  <section>.spec.md           ← spec por seção
  <component>.spec.md         ← spec por tipo de componente

public/images/<hostname>/
  [assets baixados do original]

src/components/
  [todos os componentes implementados]

src/app/
  page.tsx                    ← página montada
  globals.css                 ← tokens da skill aplicados globalmente
```

## Fluxo completo: forge + clone

O `hybrid-clone` não tem um seletor interativo próprio — ele usa skills que já existem. O caminho mais poderoso é criar uma skill sob medida com `design-hybrid-forge` e aplicá-la como transformação.

### Passo 1 — Gerar o preset visual

```bash
aioson design-hybrid:options . --locale=pt-BR
```

O seletor interativo vai apresentar 7 grupos de perguntas no terminal. Navegue com `↑/↓`, marque com `espaço`, confirme cada grupo com `enter`.

Exemplo de seleções para um produto de infra/DevOps dark:

```
Style modes:     cinematic-immersive, luxury-modern
Layout moves:    hero-signature, dense-mosaic
Motion system:   restrained-microinteractions, scroll-driven-scenes
Materials:       glass-layers
Typography:      mono-rails, bold-display
Advanced CSS:    backdrop-filter, scroll-driven-animations
Anti-sameness:   avoid-generic-hero, signature-surface, motion-with-purpose
```

O comando salva o preset em `.aioson/context/design-variation-preset.md` e exibe o bloco YAML no terminal.

### Passo 2 — Forjar a skill híbrida

```text
/design-hybrid-forge
→ skills primárias: aurora-command-ui + cognitive-core-ui
→ nome: aurora-cognitive-command
```

O agente lê o preset gerado e sintetiza a skill em `.aioson/installed-skills/aurora-cognitive-command/`.

### Passo 3 — Aplicar no clone

```text
/hybrid-clone https://datadog.com aurora-cognitive-command
```

Resultado: estrutura e interações do Datadog, visual da `aurora-cognitive-command`.

---

Veja a documentação completa do seletor interativo com todos os grupos e opções em: [`design-hybrid-forge.md`](design-hybrid-forge.md)

---

## Exemplos práticos

### Clone básico com aurora-command-ui

```text
/hybrid-clone https://stripe.com aurora-command-ui
```

Resultado: página com o fluxo e layout do Stripe, mas com glassmorphism, gradiente aurora e tokens de cor/tipografia da `aurora-command-ui`.

---

### Clone com skill gerada pelo design-hybrid-forge

Primeiro gere a skill híbrida:

```text
/design-hybrid-forge
→ aurora-command-ui + bold-editorial-ui → aurora-editorial-ui
```

Depois aplique como transformação:

```text
/hybrid-clone https://linear.app aurora-editorial-ui
```

---

### Clone de landing page com neo-brutalist-ui

```text
/hybrid-clone https://vercel.com neo-brutalist-ui
```

Resultado: estrutura de landing page da Vercel (hero, features, pricing, footer) com tipografia bold, bordas pretas e a expressão visual do neo-brutalism.

---

### Clone com download desativado (só estrutura)

Quando você quer só o código — sem baixar imagens do site original:

```text
/hybrid-clone https://loom.com cognitive-core-ui --no-download
```

---

### Clone em projeto existente

Se você já tem um projeto Next.js, rode de dentro do diretório:

```text
cd meu-projeto-nextjs
/hybrid-clone https://notion.so glassmorphism-ui
```

O agente detecta o `package.json` com `next` e usa o projeto existente. Vai avisar se houver alterações não commitadas.

## Diferença em relação a clonar manualmente

| Aspecto | Clone manual | hybrid-clone |
|---------|-------------|--------------|
| Extração | Visual subjetivo | Spec estrutural explícito por seção |
| Estética | Replica o original | Aplica tokens da skill |
| Interações | Esquecidas facilmente | Mapeadas antes de construir |
| Build | Erros descobertos no final | Verificado após cada worktree |
| QA | Manual e informal | Screenshot diff + checklist formal |

## Nota sobre conteúdo e assets

Os textos e imagens extraídos do site de referência são apenas para estruturar o clone durante o desenvolvimento. **Substitua todo o conteúdo antes de publicar.** O agente avisa sobre isso ao final da Fase 1.

## Quando usar

Use o `hybrid-clone` quando:

- você tem um site de referência que funciona bem e quer o mesmo comportamento
- o cliente mostrou um site concorrente como referência visual de fluxo
- você quer prototipar rapidamente uma landing page com estrutura testada
- quer aplicar uma hybrid skill em uma estrutura complexa sem partir do zero

Não use quando:

- você quer replicar a estética do original — use um cloner direto
- o site de referência tem proteção pesada (SPA autenticada, bot protection agressivo)
- você quer criar a estrutura do zero com total liberdade — use `/deyvin` ou `/dev`
