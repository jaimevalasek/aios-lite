# Outputs de squads e delivery

O contrato atual é file-first: todo conteúdo produzido por um squad possui uma cópia canônica em arquivos. O
SQLite em `.aioson/runtime/aios.sqlite` existe somente para o clone local de cada desenvolvedor e pode indexar esses
arquivos para dashboard, busca, métricas e delivery. Ele nunca é a única cópia do conteúdo.

## Limite de responsabilidade

| Superfície | Papel | Compartilhamento |
|---|---|---|
| `.aioson/squads/{slug}/` | definição, agentes, workflows, templates e contrato do squad | versionável |
| `output/{slug}/` | conteúdo canônico gerado | versionável quando for entrega útil |
| `media/{slug}/` | mídia referenciada pelos outputs | conforme política do projeto |
| `.aioson/runtime/aios.sqlite` | índice, telemetria e coordenação operacional | local e ignorado pelo Git |
| `aioson-logs/{slug}/` | logs verbosos de execução | local e ignorado pelo Git |

Cada clone possui seu próprio banco. Um `git pull` traz o squad e os outputs commitados, mas não traz o histórico
operacional de outra pessoa. O desenvolvedor recria seu runtime local normalmente e pode reindexar os arquivos.

## Manifesto atual

```json
{
  "storagePolicy": {
    "primary": "file",
    "artifacts": "output/youtube-creator/",
    "exports": {
      "html": true,
      "markdown": true,
      "json": true
    }
  },
  "rules": {
    "outputsDir": "output/youtube-creator",
    "logsDir": "aioson-logs/youtube-creator",
    "mediaDir": "media/youtube-creator"
  },
  "outputStrategy": {
    "mode": "files",
    "fileOutput": {
      "enabled": true,
      "dir": "output/youtube-creator/",
      "formats": ["html", "md", "json"]
    },
    "delivery": {
      "webhooks": [],
      "cloudPublish": false,
      "autoPublish": false
    }
  }
}
```

`outputStrategy` configura formatos e delivery. Ele não escolhe o armazenamento do runtime. Não escreva
`dataOutput` em manifests novos.

## Estrutura recomendada

Para um pacote estruturado:

```text
output/{squad-slug}/{content-key}/
├── content.json
└── index.html
```

Para documentos simples, Markdown ou HTML direto também é válido. O requisito é que o arquivo contenha informação
suficiente para sobreviver à remoção e reconstrução do SQLite.

## Índice local

O runtime pode registrar uma projeção em `content_items` quando executa `runtime:ingest` ou finaliza uma execução
com output associado. Essa tabela serve para:

- listar conteúdos no dashboard;
- localizar itens por squad e sessão;
- guardar resumos e metadados operacionais;
- fornecer o payload para delivery local;
- acelerar buscas.

Ela não substitui `output/`. Índices file-backed antigos podem ser removidos pela manutenção e recriados:

```bash
aioson runtime:ingest . --squad=youtube-creator
aioson runtime:storage . --json
aioson runtime:prune . --dry-run --json
aioson runtime:prune . --compact --json
```

O prune é explícito e preserva conteúdo legado que ainda não possui um arquivo de origem registrado. Exporte esse
conteúdo antes de migrar o manifesto.

## Delivery

Webhooks continuam em `outputStrategy.delivery`. O payload deve vir do arquivo gerado ou de sua projeção local.
Segredos ficam em variáveis de ambiente:

```json
{
  "delivery": {
    "webhooks": [
      {
        "slug": "cms",
        "url": "{{ENV:WEBHOOK_URL}}",
        "trigger": "on-publish",
        "format": "json",
        "headers": {
          "Authorization": "Bearer {{ENV:WEBHOOK_TOKEN}}"
        }
      }
    ],
    "cloudPublish": false,
    "autoPublish": false
  }
}
```

Nunca coloque tokens ou URLs privadas diretamente no manifesto versionado.

## Migração de manifests antigos

Os valores `outputStrategy.mode: "sqlite"`, `outputStrategy.mode: "hybrid"`, `dataOutput` e
`storagePolicy.primary: "sqlite"` são legados. O validador ainda os reconhece para permitir migração segura, mas
emite aviso.

Migre nesta ordem:

1. Exporte ou recrie cada payload como arquivo sob `rules.outputsDir`.
2. Verifique que o arquivo é completo sem consultar o banco.
3. Troque `storagePolicy.primary` por `"file"` e aponte `artifacts` para o diretório real.
4. Troque `outputStrategy.mode` por `"files"` e mantenha `fileOutput.enabled: true`.
5. Remova `dataOutput`; mantenha `delivery` e webhooks.
6. Rode `aioson squad:validate . --squad={slug}` e reindexe os arquivos.

Os comandos de transferência também normalizam estratégias antigas ao contrato file-first:

```bash
aioson output-strategy:export . --squad=origem
aioson output-strategy:import . --squad=destino --from=origem
```

## Política de Git para equipes

- Commite sempre `.aioson/squads/{slug}/`.
- Nunca commite `.aioson/runtime/`, `*.sqlite`, WAL/SHM ou `aioson-logs/`.
- Commite `output/{slug}/` quando ele representar uma entrega, evidência ou histórico que a equipe precisa receber.
- Ignore outputs descartáveis no `.gitignore` específico do projeto.
- Se duas pessoas gerarem o mesmo arquivo, o conflito aparece como um conflito de Git legível; não como merge binário
  de banco de dados.

Essa separação permite que vários desenvolvedores usem o mesmo squad normalmente, cada um com seu runtime local,
sem tentar compartilhar ou mesclar SQLite.
