# Fase 10 — Dashboard / Documentação do Genoma 2.0

## Objetivo
Adicionar uma página de documentação do Genoma 2.0 no dashboard, com exemplos práticos de uso no terminal, em agentes, em squads e no fluxo de binding, sem quebrar a navegação e os recursos atuais.

## Repo alvo
aios-lite-dashboard

## Pré-requisitos
- `00-MASTER.md`
- `01-aios-lite-genoma-core.md`
- `02-aios-lite-genoma-binding-squad.md`
- `04-dashboard-artisan-genoma.md`
- `05-dashboard-genomes-catalog.md`
- `06-dashboard-squad-genome-binding.md`

## Regra desta fase
Implementação 100% aditiva. Não remover páginas existentes, não alterar o fluxo atual de `/genomes`, `/artisan`, `/squads` ou `/pipelines` além do necessário para adicionar acesso à documentação.

## Escopo
Esta fase cria:
1. Uma página dedicada de documentação do Genoma 2.0 no dashboard.
2. Seções com conceitos, diferenças entre genoma e squad, e exemplos reais de uso.
3. Links contextuais a partir de `/genomes` e, opcionalmente, da navegação principal.
4. Conteúdo estático inicial suficiente para orientar usuários sem depender de backend novo.

## Fora de escopo
- Editor WYSIWYG de documentação.
- Sistema de docs versionadas por banco.
- Busca full-text nas docs.
- Tutoriais interativos ou playground executável.
- Execução real de comandos do terminal a partir da interface.

## Impacto arquitetural
- Adiciona uma camada de documentação e onboarding para o Genoma 2.0.
- Não muda o modelo de dados principal de genomas.
- Reforça o modelo mental correto do sistema:
  - genoma = camada cognitiva reutilizável
  - squad = unidade executora
  - pipeline = orquestração entre squads

## Risco de regressão
Baixo. O maior risco é apenas criar inconsistência visual ou textos desalinhados com o comportamento real do sistema. Para mitigar:
- manter a página inicialmente estática;
- usar exemplos compatíveis com o plano do Genoma 2.0;
- não prometer funcionalidades ainda não implementadas sem marcar claramente como “planejado”.

## Convenções desta fase
- Reaproveitar componentes visuais já usados no dashboard.
- Preferir server components para páginas estáticas.
- Manter exemplos em blocos de código simples.
- Deixar claro no texto quando algo é comportamento atual versus roadmap.

---

## Entregáveis

### 10.1 Criar a página de documentação do Genoma 2.0
- **Arquivo:** `app/genomes/docs/page.tsx`
- **Tipo:** NOVO
- **Implementação:**

```tsx
import Link from 'next/link';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-300">{children}</div>
    </section>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-black/40 p-4 text-xs text-zinc-200">
      <code>{code}</code>
    </pre>
  );
}

export default function GenomeDocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8">
        <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-400">
          Documentation
        </span>
        <h1 className="text-3xl font-semibold text-white">Genoma 2.0</h1>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">
          O Genoma 2.0 é uma camada cognitiva reutilizável do AIOS Lite. Ele pode ser criado de forma independente,
          aplicado a agentes, executores e squads, e reutilizado em diferentes fluxos sem se confundir com pipelines.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/genomes"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white transition hover:border-zinc-500"
          >
            Voltar para Genomes
          </Link>
          <Link
            href="/artisan"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white transition hover:border-zinc-500"
          >
            Abrir Artisan
          </Link>
        </div>
      </div>

      <Section title="O que é o Genoma 2.0">
        <p>
          Genoma é um módulo de inteligência reutilizável. Ele concentra conhecimento, filosofias, modelos mentais,
          heurísticas, frameworks, metodologias, mentes, skills e blind spots de um domínio, função ou persona.
        </p>
        <p>
          A ideia principal é separar <strong>inteligência reutilizável</strong> de <strong>execução operacional</strong>.
        </p>
      </Section>

      <Section title="Genoma vs Squad vs Pipeline">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Genoma</strong>: camada cognitiva reutilizável.</li>
          <li><strong>Squad</strong>: unidade executora que recebe inputs, produz outputs e expõe portas.</li>
          <li><strong>Pipeline</strong>: fluxo de orquestração entre squads.</li>
        </ul>
        <p>
          Um pipeline não orquestra genomas diretamente. O pipeline orquestra squads. Os genomas aparecem no contexto
          das squads como bindings ativos.
        </p>
      </Section>

      <Section title="Como usar um genoma individualmente">
        <p>O Genoma 2.0 pode ser usado sozinho no terminal para aplicar uma lente cognitiva a um pedido direto.</p>
        <CodeBlock
          code={`aios-lite genoma use youtube-storytelling --prompt "crie uma história sobre superação para um vídeo de 8 minutos"`}
        />
        <CodeBlock
          code={`aios-lite ask --genome copywriting-performance "gere 10 headlines para esse produto"`}
        />
        <p>
          Esses exemplos representam o uso do genoma como módulo de raciocínio, sem exigir uma squad inteira.
        </p>
      </Section>

      <Section title="Como usar um genoma com agentes">
        <p>Um agente pode ser invocado com um genoma para trabalhar dentro de uma especialização específica.</p>
        <CodeBlock
          code={`aios-lite run @writer --genome youtube-storytelling "crie um roteiro emocional para YouTube"`}
        />
        <CodeBlock
          code={`aios-lite run @copy --genome direct-response-copy "gere uma VSL curta para esse produto"`}
        />
        <p>
          Nesse caso, o agente continua sendo o executor, mas o genoma ajusta a forma como ele pensa e decide.
        </p>
      </Section>

      <Section title="Como usar um genoma com squads">
        <p>Squads podem receber um ou mais genomas como bindings persistentes ou contextuais.</p>
        <CodeBlock
          code={`aios-lite squad create youtube-script-studio --genome youtube-storytelling --genome copywriting-performance`}
        />
        <CodeBlock
          code={`aios-lite squad bind-genome youtube-script-studio youtube-storytelling`}
        />
        <CodeBlock
          code={`aios-lite squad bind-genome youtube-script-studio copywriting-performance --executor script-writer`}
        />
        <p>
          O genoma pode ser aplicado no escopo da squad inteira ou apenas em executores específicos.
        </p>
      </Section>

      <Section title="Por que pode existir squad e genoma com nomes parecidos">
        <p>
          É válido existir um <code>genoma youtube-storytelling</code> e uma <code>squad youtube-storytelling</code>.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>O <strong>genoma</strong> representa a inteligência reutilizável.</li>
          <li>A <strong>squad</strong> representa a execução operacional.</li>
        </ul>
        <p>
          Para evitar ambiguidade visual, a recomendação é adotar convenções de nome:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Genomas: <code>youtube-storytelling</code>, <code>growth-marketing</code>.</li>
          <li>Squads: <code>youtube-storytelling-studio</code>, <code>growth-content-squad</code>.</li>
        </ul>
      </Section>

      <Section title="Exemplo de composição prática">
        <p>Um ecossistema de conteúdo pode funcionar assim:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><code>product-positioning</code> aplicado à squad de produto</li>
          <li><code>copywriting-performance</code> aplicado à squad de copy</li>
          <li><code>youtube-storytelling</code> aplicado à squad de roteiro</li>
          <li><code>visual-concepting</code> aplicado à squad de thumb</li>
        </ul>
        <p>
          O pipeline conecta as squads. Os genomas enriquecem a inteligência delas.
        </p>
      </Section>

      <Section title="Fluxo recomendado de uso">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Incubar a ideia de genoma no Artisan.</li>
          <li>Gerar o Genome Brief.</li>
          <li>Criar o genoma e salvar no catálogo.</li>
          <li>Aplicar o genoma a uma ou mais squads.</li>
          <li>Orquestrar squads em pipelines.</li>
        </ol>
      </Section>

      <Section title="Observações de roadmap">
        <p>
          Alguns exemplos desta página representam a UX e os comandos esperados para o Genoma 2.0. Caso algum comando
          ainda não exista no estado atual do projeto, ele deve ser entendido como interface alvo do roadmap.
        </p>
      </Section>
    </main>
  );
}
```

### 10.2 Adicionar atalho para a documentação na página de genomas
- **Arquivo:** `app/genomes/page.tsx`
- **Tipo:** EDITAR
- **Implementação:** adicionar um link/ação visível no topo da página, próximo ao header principal ou aos filtros.

```tsx
import Link from 'next/link';
```

Adicionar no bloco superior da página um botão parecido com:

```tsx
<Link
  href="/genomes/docs"
  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white transition hover:border-zinc-500"
>
  Docs do Genoma 2.0
</Link>
```

### 10.3 Adicionar item opcional na navegação principal
- **Arquivo:** `components/shell/app-shell.tsx`
- **Tipo:** EDITAR
- **Implementação:** adicionar um item de navegação para a documentação apenas se isso combinar com o padrão atual do menu. Se preferir manter a navegação mais enxuta, este item pode ficar só na página `/genomes`.

Exemplo de item:

```tsx
{ href: '/genomes/docs', label: 'Genome Docs' }
```

### 10.4 Adicionar uma seção de ajuda contextual na tela de binding de genoma em squad
- **Arquivo:** `app/squads/[slug]/page.tsx` ou componente relacionado ao binding
- **Tipo:** EDITAR
- **Implementação:** incluir um bloco pequeno de ajuda com link para `/genomes/docs`, explicando rapidamente que genoma é uma camada cognitiva e não uma etapa de pipeline.

Exemplo de texto:

```tsx
<p className="text-xs leading-6 text-zinc-400">
  Genomas são camadas cognitivas reutilizáveis aplicadas à squad ou a executores específicos. Saiba mais em{' '}
  <Link href="/genomes/docs" className="text-zinc-200 underline underline-offset-4">
    Docs do Genoma 2.0
  </Link>.
</p>
```

### 10.5 Criar teste básico da rota de documentação
- **Arquivo:** `tests/app/genomes-docs-page.test.tsx`
- **Tipo:** NOVO
- **Implementação:**

```tsx
import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import GenomeDocsPage from '@/app/genomes/docs/page';

test('GenomeDocsPage renders core sections', () => {
  const html = renderToStaticMarkup(<GenomeDocsPage />);

  assert.match(html, /Genoma 2.0/);
  assert.match(html, /Genoma vs Squad vs Pipeline/);
  assert.match(html, /Como usar um genoma individualmente/);
  assert.match(html, /Como usar um genoma com squads/);
});
```

Se o projeto usar outro padrão de testes para páginas Next.js, adaptar o teste ao padrão vigente do repositório, mantendo o mesmo objetivo.

---

## Testes

### Testes automatizados
Executar a suíte do dashboard e, se necessário, o subconjunto da nova rota:

```bash
npm test
```

ou o comando equivalente do repositório.

### Validação manual
- [ ] A rota `/genomes/docs` abre corretamente.
- [ ] O conteúdo explica claramente a diferença entre genoma, squad e pipeline.
- [ ] Existem exemplos visíveis de uso no terminal.
- [ ] Existem exemplos visíveis de uso com agentes.
- [ ] Existem exemplos visíveis de uso com squads.
- [ ] O link para docs aparece em `/genomes`.
- [ ] O texto não promete como implementado algo que ainda está apenas planejado, sem marcar isso.

---

## Checklist de conclusão
- [ ] Página de documentação criada.
- [ ] Link para docs adicionado em `/genomes`.
- [ ] Ajuda contextual adicionada na experiência de binding da squad.
- [ ] Teste básico criado.
- [ ] Documentação revisada para consistência com o roadmap do Genoma 2.0.

## Commit sugerido
```bash
feat(dashboard): add Genome 2.0 documentation page and usage examples
```
