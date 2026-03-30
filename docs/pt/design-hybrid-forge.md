# `design-hybrid-forge`

Página canônica do fluxo de criação de skills híbridas de design do AIOSON.

Esse fluxo existe para transformar 2 skills de design já existentes em uma nova skill local do projeto, com suporte opcional a um preset visual temporário gerado por `design-hybrid:options`.

## O que ele faz

- cria uma nova skill em `.aioson/installed-skills/{slug}/`
- exige 2 skills primárias
- aceita 0 a 2 modificadores por padrão
- aceita 0 a 3 modificadores no modo avançado
- pode aplicar um overlay visual mais extravagante, clássico, animado ou CSS-forward
- registra autor, modelo e origem quando esses dados estiverem disponíveis
- preserva histórico da geração em `.aioson/context/history/design-variation-presets/`

## Fluxo recomendado

1. Escolha ou confirme as 2 skills primárias.
2. Se quiser uma direção visual mais marcada, rode `aioson design-hybrid:options`.
3. O comando monta um preset em `.aioson/context/design-variation-preset.md`.
4. O agente `@design-hybrid-forge` lê esse preset e conduz a síntese.
5. A skill final nasce em `.aioson/installed-skills/{slug}/`.
6. Depois da geração, o preset ativo deve sair do contexto e ficar só o histórico.

## Locale

O seletor usa `conversation_language` do `project.context.md` quando existir.

Se você quiser forçar a interface, use:

```bash
aioson design-hybrid:options . --locale=pt-BR
```

Use `--locale` como override, não como regra principal.

## Modificadores

Por padrão, o sistema trabalha com até 2 modificadores. Eles servem para lanes pequenas:

- motion
- textura
- tipografia
- navegação secundária
- detalhes de componentes

No modo avançado, `aioson design-hybrid:options --advanced` libera um 3º modificador. Mesmo assim, ele continua sem poder assumir substrato ou estrutura.

## Preset temporário

O arquivo `.aioson/context/design-variation-preset.md` não é configuração permanente do projeto.

Ele deve ser tratado como:

- input temporário para a próxima geração
- referência de execução para a skill híbrida
- artefato descartável após a geração

A cópia em `.aioson/context/history/design-variation-presets/` é a trilha de auditoria e pode ficar arquivada.

## Onde a skill nasce

O destino padrão é sempre:

```text
.aioson/installed-skills/{slug}/
```

Esse é o local que o AIOSON usa para skills instaladas ou geradas localmente no projeto. Se houver promoção para o core ou marketplace, isso é uma segunda etapa separada.

## Quando usar

Use esse fluxo quando você quiser:

- criar uma skill de design nova a partir de duas já existentes
- evitar resultado genérico ou “mais do mesmo”
- combinar estrutura de uma skill com a expressão visual de outra
- gerar uma skill local versionada no projeto

Não use esse fluxo para aplicar uma skill em um produto já existente. Nesse caso, use a skill final gerada em seu próprio `SKILL.md`.

## Exemplos

Criar preset visual:

```bash
aioson design-hybrid:options .
```

Forçar PT-BR e modo avançado:

```bash
aioson design-hybrid:options . --locale=pt-BR --advanced
```

Depois, ativar a skill híbrida gerada:

```text
@nome-da-skill
```

ou, em clientes com slash commands:

```text
/nome-da-skill
```
